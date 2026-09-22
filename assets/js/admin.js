(function(){
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const deep=x=>JSON.parse(JSON.stringify(x));
  const number=x=>Math.max(0,Number(x)||0);
  const fmt=x=>Math.round(Number(x)||0).toLocaleString('en-US');
  const defaultBlinds=[
    {type:'level',name:'Level 1',minutes:20,sb:100,bb:200,ante:200},
    {type:'level',name:'Level 2',minutes:20,sb:100,bb:300,ante:300},
    {type:'level',name:'Level 3',minutes:20,sb:200,bb:400,ante:400},
    {type:'level',name:'Level 4',minutes:20,sb:300,bb:600,ante:600},
    {type:'break',name:'Break 1',minutes:10,sb:0,bb:0,ante:0},
    {type:'level',name:'Level 5',minutes:20,sb:400,bb:800,ante:800},
    {type:'level',name:'Level 6',minutes:20,sb:500,bb:1000,ante:1000},
    {type:'level',name:'Level 7',minutes:20,sb:600,bb:1200,ante:1200},
    {type:'level',name:'Level 8',minutes:20,sb:1000,bb:1500,ante:1500},
    {type:'break',name:'Break 2',minutes:10,sb:0,bb:0,ante:0},
    {type:'level',name:'Level 9',minutes:20,sb:1000,bb:2000,ante:2000},
    {type:'level',name:'Level 10',minutes:20,sb:1500,bb:3000,ante:3000},
    {type:'level',name:'Level 11',minutes:20,sb:2000,bb:4000,ante:4000},
    {type:'level',name:'Level 12',minutes:20,sb:3000,bb:6000,ante:6000}
  ];
  const defaultPayouts=Array.from({length:10},(_,i)=>({place:i+1,prize:''}));
  const defaults={
    version:3,
    tournament:{name:'MAIN EVENT',subtitle:'',currency:'₱',guarantee:0,lateRegCloseIndex:null,buy:{chips:20000,prize:1000,fee:0},re:{same:true,chips:20000,prize:1000,fee:0},add:{disabled:false,chips:20000,prize:0,fee:0}},
    timer:{index:0,running:false,remaining:1200,endAt:null,countdownPlayed:false},
    counts:{buyins:0,reentries:0,addons:0,remaining:0},
    blinds:defaultBlinds,
    itm:{percent:10,customPercent:10,round:'up',customPaid:0},
    payouts:defaultPayouts,
    display:{title:'',subtitle:'EVEREST POKER ROOM',footer:'Everest Poker Room · Midori Casino 2F',announcement:'',showPlayers:true,showPrize:true,showPayout:true,showLateReg:true},
    settings:{countdown:true,bell:true,locked:false},history:[]
  };
  let state=deep(defaults), advancing=false, toastTimer=null, lastCountdownTick=null;

  function ordinal(n){const v=n%100;if(v>=11&&v<=13)return n+'TH';return n+({1:'ST',2:'ND',3:'RD'}[n%10]||'TH');}
  function merge(a,b){if(!b||typeof b!=='object')return a;for(const k of Object.keys(b)){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))merge(a[k],b[k]);else a[k]=b[k];}return a;}
  function sanitize(){
    state=merge(deep(defaults),state||{});state.version=3;
    if(!Array.isArray(state.blinds)||!state.blinds.length)state.blinds=deep(defaultBlinds);
    if(!Array.isArray(state.payouts))state.payouts=deep(defaultPayouts);
    state.payouts=state.payouts.map((p,i)=>{
      if(p&&Object.prototype.hasOwnProperty.call(p,'prize'))return {place:Math.max(1,Math.floor(number(p.place)||i+1)),prize:String(p.prize??'')};
      const place=Math.max(1,Math.floor(number(p?.place)||i+1));
      const label=String(p?.label??'').trim();const amount=number(p?.amount);const defaultLabel=ordinal(place);
      let prize='';
      if(label&&label.toUpperCase()!==defaultLabel.toUpperCase())prize=label;
      if(amount)prize=prize?`${prize} · ${money(amount)}`:money(amount);
      return {place,prize};
    });
    while(state.payouts.length<10)state.payouts.push({place:state.payouts.length+1,prize:''});
    state.timer.index=Math.max(0,Math.min(state.blinds.length-1,Number(state.timer.index)||0));
    state.timer.remaining=number(state.timer.remaining);
    state.timer.countdownPlayed=!!state.timer.countdownPlayed;
    for(const k of ['buyins','reentries','addons','remaining'])state.counts[k]=Math.max(0,Math.floor(Number(state.counts[k])||0));
    state.counts.remaining=Math.min(state.counts.remaining,state.counts.buyins+state.counts.reentries);
    if(state.tournament.lateRegCloseIndex!==null&&state.tournament.lateRegCloseIndex!==''){
      const i=Number(state.tournament.lateRegCloseIndex);state.tournament.lateRegCloseIndex=Number.isFinite(i)&&i>=0&&i<state.blinds.length?i:null;
    }else state.tournament.lateRegCloseIndex=null;
    if(!state.itm)state.itm=deep(defaults.itm);
    if(!state.display)state.display=deep(defaults.display);
    if(!state.settings)state.settings=deep(defaults.settings);
    if(!Array.isArray(state.history))state.history=[];
  }
  function current(){return state.blinds[state.timer.index]||state.blinds[0];}
  function secondsNow(){return state.timer.running&&state.timer.endAt?Math.max(0,Math.ceil((state.timer.endAt-Date.now())/1000)):number(state.timer.remaining);}
  function timeShort(s){s=Math.max(0,Math.floor(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  function timeLong(s){s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
  function money(n){return `${state.tournament.currency||'₱'}${fmt(n)}`;}
  function rePackage(){return state.tournament.re.same?state.tournament.buy:state.tournament.re;}
  function totals(){
    const c=state.counts,t=state.tournament,r=rePackage(),a=t.add;
    const entries=c.buyins+c.reentries;
    const chips=c.buyins*number(t.buy.chips)+c.reentries*number(r.chips)+c.addons*number(a.chips);
    const contribution=c.buyins*number(t.buy.prize)+c.reentries*number(r.prize)+c.addons*number(a.prize);
    const fees=c.buyins*number(t.buy.fee)+c.reentries*number(r.fee)+c.addons*number(a.fee);
    const guarantee=number(t.guarantee);const prize=Math.max(contribution,guarantee);
    return {entries,chips,contribution,fees,prize,avg:c.remaining?Math.round(chips/c.remaining):0,mode:guarantee>contribution?'GUARANTEED':'NORMAL'};
  }
  function paidPlaces(){
    const entries=totals().entries, rule=state.itm||defaults.itm;if(!entries)return 0;
    if(rule.round==='custom')return Math.max(0,Math.min(entries,Math.floor(number(rule.customPaid))));
    const pct=rule.percent==='custom'?number(rule.customPercent):number(rule.percent);
    const raw=entries*pct/100;
    if(rule.round==='down')return Math.max(0,Math.floor(raw));
    if(rule.round==='nearest')return Math.max(0,Math.round(raw));
    return Math.max(0,Math.ceil(raw));
  }
  function lateRegInfo(){
    const close=state.tournament.lateRegCloseIndex;
    if(close===null)return {open:true,text:'OPEN',detail:'No automatic close',seconds:null};
    if(state.timer.index>close)return {open:false,text:'CLOSE',detail:'Registration closed',seconds:0};
    let seconds=secondsNow();
    for(let i=state.timer.index+1;i<=close;i++)seconds+=number(state.blinds[i]?.minutes)*60;
    return {open:true,text:timeLong(seconds),detail:`Closes after ${state.blinds[close]?.name||'selected stage'}`,seconds};
  }
  function blindText(stage){if(!stage)return'—';return stage.type==='break'?'BREAK':`${fmt(stage.sb)} / ${fmt(stage.bb)} / ${fmt(stage.ante)}`;}
  function pushHistory(label){state.history.push({label,at:Date.now(),snapshot:{counts:deep(state.counts),timer:deep(state.timer)}});if(state.history.length>30)state.history=state.history.slice(-30);}
  function toast(msg,type=''){const el=$('#toast');el.textContent=msg;el.className='toast'+(type?' '+type:'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),2600);}
  async function saveState(message){
    try{const mode=await EverestStore.save(state);$('#saveState').textContent=mode==='indexeddb'?'Saved locally · Same browser profile':'Running · storage fallback limited';if(message)toast(message,mode==='indexeddb'?'':'warn');}
    catch(e){$('#saveState').textContent='Running · autosave unavailable';if(message)toast(message,'warn');}
  }
  function locked(){if(state.settings.locked){toast('Controls are locked.','warn');return true;}return false;}

  function renderDashboard(){
    const stage=current(),next=state.blinds[state.timer.index+1],t=totals(),late=lateRegInfo();
    $('#dashTournamentName').textContent=state.tournament.name||'MAIN EVENT';
    $('#dashState').textContent=state.timer.running?'RUNNING':'PAUSED';$('#dashState').className='state-chip '+(state.timer.running?'running':'paused');
    $('#startPause').textContent=state.timer.running?'Pause':'Start / Resume';
    $('#lockBtn').textContent=state.settings.locked?'🔒 Controls locked':'🔓 Lock controls';
    $('#dashLevel').textContent=stage.name||((stage.type==='break')?'Break':'Level');$('#dashTimer').textContent=timeShort(secondsNow());
    $('#dashSB').textContent=stage.type==='break'?'—':fmt(stage.sb);$('#dashBB').textContent=stage.type==='break'?'—':fmt(stage.bb);$('#dashAnte').textContent=stage.type==='break'?'—':fmt(stage.ante);
    $('#dashNext').textContent=next?`Next: ${next.type==='break'?next.name:blindText(next)}`:'Final stage';
    $('#lateRegBadge').textContent=`Late Reg: ${late.open?'OPEN':'CLOSE'}`;$('#dashLateReg').textContent=late.open?`Late reg: ${late.text} · ${late.detail}`:'Late reg: CLOSE';
    $('#statBuyins').textContent=state.counts.buyins;$('#statReentries').textContent=state.counts.reentries;$('#statRemaining').textContent=state.counts.remaining;$('#statEntries').textContent=t.entries;$('#statChips').textContent=fmt(t.chips);$('#statAverage').textContent=fmt(t.avg);$('#statITM').innerHTML=`${paidPlaces()} <small>paid</small>`;
    $('#prizeModeLabel').textContent=t.mode;$('#statPrize').textContent=money(t.prize);$('#prizeContributionText').textContent=money(t.contribution);$('#feesCollectedText').textContent=money(t.fees);$('#addonsText').textContent=state.counts.addons;
    $('#addonBtn').disabled=state.tournament.add.disabled;$('#quickHint').textContent=state.tournament.add.disabled?'Add-on is disabled. Buy-in / Re-entry add an entry and chips. Player Out only reduces players remaining.':'Buy-in / Re-entry add an entry and chips. Add-on adds chips only. Player Out only reduces players remaining.';
    $('#announceInput').value=state.display.announcement||'';
  }
  function renderTournament(){
    $('#tName').value=state.tournament.name||'';$('#tSubtitle').value=state.tournament.subtitle||'';$('#tCurrency').value=state.tournament.currency||'₱';$('#tGuarantee').value=number(state.tournament.guarantee);
    $('#buyChips').value=number(state.tournament.buy.chips);$('#buyPrize').value=number(state.tournament.buy.prize);$('#buyFee').value=number(state.tournament.buy.fee);
    $('#sameReentry').checked=!!state.tournament.re.same;$('#reChips').value=number(state.tournament.re.chips);$('#rePrize').value=number(state.tournament.re.prize);$('#reFee').value=number(state.tournament.re.fee);
    $('#noAddon').checked=!!state.tournament.add.disabled;$('#addChips').value=number(state.tournament.add.chips);$('#addPrize').value=number(state.tournament.add.prize);$('#addFee').value=number(state.tournament.add.fee);
    buildLateRegSelect();togglePackageFields();
  }
  function buildLateRegSelect(){const sel=$('#lateRegClose');const currentVal=state.tournament.lateRegCloseIndex;sel.innerHTML='<option value="">No automatic close</option>'+state.blinds.map((b,i)=>`<option value="${i}">After ${escapeHtml(b.name||((b.type==='break')?'Break':`Level ${i+1}`))}</option>`).join('');sel.value=currentVal===null?'':String(currentVal);}
  function togglePackageFields(){const same=$('#sameReentry').checked;$('#reentryFields').style.opacity=same?'.42':'1';$('#reentryFields').querySelectorAll('input').forEach(x=>x.disabled=same);const no=$('#noAddon').checked;$('#addonFields').style.opacity=no?'.42':'1';$('#addonFields').querySelectorAll('input').forEach(x=>x.disabled=no);}
  function renderBlindRows(){
    $('#blindRows').innerHTML=state.blinds.map((b,i)=>`<tr data-index="${i}"><td>${i+1}</td><td><select class="b-type"><option value="level" ${b.type==='level'?'selected':''}>Level</option><option value="break" ${b.type==='break'?'selected':''}>Break</option></select></td><td><input class="b-name" value="${escapeAttr(b.name||'')}" /></td><td><input class="b-min" type="number" min="1" value="${number(b.minutes)||1}" /></td><td><input class="b-sb" type="number" min="0" value="${number(b.sb)}" /></td><td><input class="b-bb" type="number" min="0" value="${number(b.bb)}" /></td><td><input class="b-ante" type="number" min="0" value="${number(b.ante)}" /></td><td><button class="row-remove" data-remove-blind="${i}">Remove</button></td></tr>`).join('');
    $$('[data-remove-blind]').forEach(b=>b.onclick=()=>{if(state.blinds.length<=1)return toast('At least one stage is required.','warn');state.blinds.splice(Number(b.dataset.removeBlind),1);state.timer.index=Math.min(state.timer.index,state.blinds.length-1);renderBlindRows();});
  }
  function readBlindRows(){
    const rows=$$('#blindRows tr');state.blinds=rows.map((tr,i)=>{const type=tr.querySelector('.b-type').value;return{type,name:tr.querySelector('.b-name').value.trim()||`${type==='break'?'Break':'Level'} ${i+1}`,minutes:Math.max(1,number(tr.querySelector('.b-min').value)),sb:type==='break'?0:number(tr.querySelector('.b-sb').value),bb:type==='break'?0:number(tr.querySelector('.b-bb').value),ante:type==='break'?0:number(tr.querySelector('.b-ante').value)};});
    if(state.tournament.lateRegCloseIndex!==null&&state.tournament.lateRegCloseIndex>=state.blinds.length)state.tournament.lateRegCloseIndex=null;
  }
  function renderITM(){
    $('#itmPercent').value=String(state.itm.percent??10);$('#itmCustom').value=number(state.itm.customPercent);$('#itmRound').value=state.itm.round||'up';$('#itmPaidCustom').value=number(state.itm.customPaid);
    $('#itmCustom').disabled=$('#itmPercent').value!=='custom';$('#customPaidWrap').style.display=$('#itmRound').value==='custom'?'flex':'none';renderPayoutStats();
  }
  function payoutCashValue(text){
    const raw=String(text??'').trim();
    if(!raw)return 0;
    const cleaned=raw.replace(/^[₱$€£¥]\s*/,'').replace(/,/g,'').trim();
    return /^\d+(?:\.\d+)?$/.test(cleaned)?number(cleaned):0;
  }
  function renderPayoutRows(){
    $('#payoutRows').innerHTML=state.payouts.map((p,i)=>`<tr data-index="${i}"><td><input class="p-place" type="number" min="1" value="${Math.max(1,Number(p.place)||i+1)}" /></td><td><input class="p-prize" type="text" value="${escapeAttr(p.prize||'')}" placeholder="e.g. ₱5,000 / iPhone 17 Pro / Tournament Ticket" /></td><td><button class="row-remove" data-remove-payout="${i}">Remove</button></td></tr>`).join('');
    $$('[data-remove-payout]').forEach(b=>b.onclick=()=>{state.payouts.splice(Number(b.dataset.removePayout),1);renderPayoutRows();renderPayoutStats();});
    $$('#payoutRows input').forEach(x=>x.addEventListener('input',renderPayoutStats));
  }
  function readPayoutRows(){state.payouts=$$('#payoutRows tr').map((tr,i)=>({place:Math.max(1,Math.floor(number(tr.querySelector('.p-place').value)||i+1)),prize:tr.querySelector('.p-prize').value.trim()}));}
  function renderPayoutStats(){
    const t=totals();let allocated=0;$$('#payoutRows .p-prize').forEach(x=>allocated+=payoutCashValue(x.value));if(!$('#payoutRows').children.length)allocated=(state.payouts||[]).reduce((sum,p)=>sum+payoutCashValue(p.prize),0);
    $('#payPrize').textContent=money(t.prize);$('#payItm').textContent=paidPlaces();$('#payAllocated').textContent=money(allocated);const un=t.prize-allocated;$('#payUnallocated').textContent=(un<0?'-':'')+money(Math.abs(un));$('#payUnallocated').style.color=un<0?'#ff9ca3':'';
  }
  let logoPreviewUrl=null;
  function setLogoPreview(blob){if(logoPreviewUrl)URL.revokeObjectURL(logoPreviewUrl);logoPreviewUrl=blob?URL.createObjectURL(blob):null;$('#logoPreview').classList.toggle('hidden',!logoPreviewUrl);if(logoPreviewUrl)$('#logoPreview').src=logoPreviewUrl;else $('#logoPreview').removeAttribute('src');}
  async function renderDisplaySettings(){
    $('#displayTitle').value=state.display.title||'';$('#displaySubtitle').value=state.display.subtitle||'';$('#displayFooter').value=state.display.footer||'';$('#showPlayers').checked=state.display.showPlayers!==false;$('#showPrize').checked=state.display.showPrize!==false;$('#showPayout').checked=state.display.showPayout!==false;$('#showLateReg').checked=state.display.showLateReg!==false;
    const logo=await EverestStore.loadBlob('logo');$('#logoStatus').textContent=logo?'Custom logo saved':'No custom logo';setLogoPreview(logo);$('#backgroundStatus').textContent=(await EverestStore.loadBlob('background'))?'Custom background saved':'Default background';
  }
  function renderSound(){
    $('#enableCountdown').checked=state.settings.countdown!==false;$('#enableBell').checked=state.settings.bell!==false;$('#countdownStatus').textContent=EverestAudio.has('countdown')?'Countdown MP3 saved in this browser':'No uploaded countdown · fallback tone will be used';$('#bellStatus').textContent=EverestAudio.has('bell')?'Bell MP3 saved in this browser':'No uploaded bell · fallback tone will be used';
  }
  async function renderStorage(){const e=await EverestStore.estimate();if(!e){$('#storageBadge').textContent='Storage: available';$('#storageInfo').textContent='Browser storage is available. Tournament state uses IndexedDB with a small localStorage fallback.';return;}const used=e.usage||0,quota=e.quota||0,pct=quota?used/quota*100:0;$('#storageBadge').textContent=`Storage: ${pct.toFixed(pct<1?1:0)}% used`;$('#storageInfo').textContent=`Browser storage: ${(used/1048576).toFixed(1)} MB used of ${(quota/1048576).toFixed(0)} MB. Large images and MP3 files are stored in IndexedDB so tournament buttons remain usable if localStorage is full.`;}
  async function renderAll(){renderDashboard();renderTournament();renderBlindRows();renderPayoutRows();renderITM();await renderDisplaySettings();renderSound();renderStorage();}

  function moveStage(index,keepRunning=true){
    index=Math.max(0,Math.min(state.blinds.length-1,index));const previousIndex=state.timer.index;const countdownPlayed=state.timer.countdownPlayed;EverestAudio.stopCountdown();lastCountdownTick=null;state.timer.index=index;state.timer.remaining=number(current().minutes)*60;state.timer.countdownPlayed=index===previousIndex?countdownPlayed:false;if(keepRunning&&state.timer.running)state.timer.endAt=Date.now()+state.timer.remaining*1000;else state.timer.endAt=null;renderDashboard();saveState();
  }
  async function autoAdvance(){
    if(advancing)return;advancing=true;EverestAudio.stopCountdown();lastCountdownTick=null;if(state.settings.bell!==false)EverestAudio.playBell();
    if(state.timer.index<state.blinds.length-1){state.timer.index++;state.timer.remaining=number(current().minutes)*60;state.timer.countdownPlayed=false;state.timer.running=true;state.timer.endAt=Date.now()+state.timer.remaining*1000;}else{state.timer.running=false;state.timer.remaining=0;state.timer.endAt=null;}
    renderDashboard();await saveState();advancing=false;
  }
  function changeCount(kind,delta){
    if(locked())return;delta=Number(delta)||0;pushHistory(`Change ${kind}`);
    if(kind==='buyins'||kind==='reentries'){
      const before=state.counts[kind];const after=Math.max(0,before+delta);const applied=after-before;state.counts[kind]=after;state.counts.remaining=Math.max(0,Math.min(state.counts.buyins+state.counts.reentries,state.counts.remaining+applied));
    }else if(kind==='remaining'){
      state.counts.remaining=Math.max(0,Math.min(state.counts.buyins+state.counts.reentries,state.counts.remaining+delta));
    }else if(kind==='addons'){
      if(state.tournament.add.disabled)return toast('Add-on is disabled.','warn');state.counts.addons=Math.max(0,state.counts.addons+delta);
    }
    renderDashboard();renderPayoutStats();saveState();
  }
  function playerOut(){if(locked())return;if(state.counts.remaining<=0)return toast('No remaining player to mark out.','warn');pushHistory('Player Out');state.counts.remaining--;renderDashboard();renderPayoutStats();saveState();}
  function undo(){const h=state.history.pop();if(!h)return toast('Nothing to undo.','warn');state.counts=deep(h.snapshot.counts);state.timer=deep(h.snapshot.timer);EverestAudio.stopCountdown();lastCountdownTick=null;renderDashboard();renderPayoutStats();saveState(`Undid: ${h.label}`);}
  function setTimerFromPrompt(){if(locked())return;const raw=prompt('Set remaining time (MM:SS or seconds):',timeShort(secondsNow()));if(raw===null)return;let seconds=0;if(String(raw).includes(':')){const parts=String(raw).split(':').map(Number);if(parts.some(Number.isNaN))return toast('Invalid time.','warn');seconds=parts.reduce((acc,n)=>acc*60+n,0);}else seconds=Number(raw);if(!Number.isFinite(seconds)||seconds<0)return toast('Invalid time.','warn');pushHistory('Set Time');state.timer.remaining=Math.floor(seconds);if(state.timer.running)state.timer.endAt=Date.now()+state.timer.remaining*1000;EverestAudio.stopCountdown();lastCountdownTick=null;renderDashboard();saveState();}
  function goToStage(){if(locked())return;const raw=prompt(`Go to stage number (1-${state.blinds.length}):`,String(state.timer.index+1));if(raw===null)return;const n=Math.floor(Number(raw));if(!Number.isFinite(n)||n<1||n>state.blinds.length)return toast('Invalid stage number.','warn');pushHistory('Go to Level');moveStage(n-1,true);}
  function startNextBreak(){if(locked())return;const i=state.blinds.findIndex((b,idx)=>idx>state.timer.index&&b.type==='break');if(i<0)return toast('No later break found in the blind structure.','warn');pushHistory('Start Break');moveStage(i,true);}

  function wireNavigation(){$$('.side-nav button').forEach(btn=>btn.onclick=()=>{$$('.side-nav button').forEach(x=>x.classList.remove('active'));$$('.tab-section').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$(`#tab-${btn.dataset.tab}`).classList.add('active');if(btn.dataset.tab==='display')renderDisplaySettings();if(btn.dataset.tab==='backup')renderStorage();});}
  function wire(){
    wireNavigation();
    $('#soundUnlock').onclick=async()=>{const ok=await EverestAudio.unlock();$('#soundUnlock').textContent=ok?'Sound Enabled ✓':'Enable Sound';toast(ok?'Sound enabled.':'Browser blocked audio. Click again. ',ok?'':'warn');};
    $('#startPause').onclick=()=>{if(locked())return;pushHistory('Start / Pause');if(state.timer.running){state.timer.remaining=secondsNow();state.timer.running=false;state.timer.endAt=null;EverestAudio.stopCountdown();lastCountdownTick=null;}else{if(secondsNow()<=0)state.timer.remaining=number(current().minutes)*60;state.timer.running=true;state.timer.endAt=Date.now()+state.timer.remaining*1000;lastCountdownTick=null;}renderDashboard();saveState();};
    $('#nextLevel').onclick=()=>{if(locked())return;pushHistory('Next Level');moveStage(state.timer.index+1,true);};
    $('#prevLevel').onclick=()=>{if(locked())return;pushHistory('Previous Level');moveStage(state.timer.index-1,true);};
    $('#resetLevel').onclick=()=>{if(locked())return;pushHistory('Reset Level');EverestAudio.stopCountdown();lastCountdownTick=null;state.timer.running=false;state.timer.endAt=null;state.timer.remaining=number(current().minutes)*60;renderDashboard();saveState();};
    $('#setTime').onclick=setTimerFromPrompt;$('#goToLevel').onclick=goToStage;$('#startBreak').onclick=startNextBreak;
    $$('[data-adjust]').forEach(b=>b.onclick=()=>{if(locked())return;pushHistory('Adjust Time');const next=Math.max(0,secondsNow()+Number(b.dataset.adjust));state.timer.remaining=next;if(state.timer.running)state.timer.endAt=Date.now()+next*1000;EverestAudio.stopCountdown();lastCountdownTick=null;renderDashboard();saveState();});
    $$('[data-count]').forEach(b=>b.onclick=()=>changeCount(b.dataset.count,Number(b.dataset.delta)));
    $('#buyinBtn').onclick=()=>changeCount('buyins',1);$('#reentryBtn').onclick=()=>changeCount('reentries',1);$('#addonBtn').onclick=()=>changeCount('addons',1);$('#playerOutBtn').onclick=playerOut;$('#undoBtn').onclick=undo;$('#lockBtn').onclick=()=>{state.settings.locked=!state.settings.locked;renderDashboard();saveState();};
    $('#announceBtn').onclick=()=>{state.display.announcement=$('#announceInput').value.trim();saveState('Announcement updated.');};$('#clearAnnounce').onclick=()=>{$('#announceInput').value='';state.display.announcement='';saveState('Announcement cleared.');};
    $('#sameReentry').onchange=togglePackageFields;$('#noAddon').onchange=togglePackageFields;
    $('#saveTournament').onclick=()=>{state.tournament.name=$('#tName').value.trim()||'MAIN EVENT';state.tournament.subtitle=$('#tSubtitle').value.trim();state.tournament.currency=$('#tCurrency').value||'₱';state.tournament.guarantee=number($('#tGuarantee').value);state.tournament.buy={chips:number($('#buyChips').value),prize:number($('#buyPrize').value),fee:number($('#buyFee').value)};state.tournament.re={same:$('#sameReentry').checked,chips:number($('#reChips').value),prize:number($('#rePrize').value),fee:number($('#reFee').value)};if(state.tournament.re.same)state.tournament.re={same:true,...deep(state.tournament.buy)};state.tournament.add={disabled:$('#noAddon').checked,chips:number($('#addChips').value),prize:number($('#addPrize').value),fee:number($('#addFee').value)};state.tournament.lateRegCloseIndex=$('#lateRegClose').value===''?null:Number($('#lateRegClose').value);renderDashboard();renderPayoutStats();saveState('Tournament settings saved.');};
    $('#addLevelRow').onclick=()=>{const n=state.blinds.filter(x=>x.type==='level').length+1;state.blinds.push({type:'level',name:`Level ${n}`,minutes:20,sb:0,bb:0,ante:0});renderBlindRows();};$('#addBreakRow').onclick=()=>{const n=state.blinds.filter(x=>x.type==='break').length+1;state.blinds.push({type:'break',name:`Break ${n}`,minutes:10,sb:0,bb:0,ante:0});renderBlindRows();};
    $('#saveBlinds').onclick=()=>{const wasRunning=state.timer.running;readBlindRows();state.timer.index=Math.min(state.timer.index,state.blinds.length-1);state.timer.remaining=number(current().minutes)*60;state.timer.endAt=wasRunning?Date.now()+state.timer.remaining*1000:null;state.timer.countdownPlayed=false;renderTournament();renderDashboard();saveState('Blind structure saved.');};
    $('#blindImport').onchange=e=>importTableFile(e.target.files[0],'blinds');
    $('#itmPercent').onchange=()=>{$('#itmCustom').disabled=$('#itmPercent').value!=='custom';renderPayoutStats();};$('#itmCustom').oninput=renderPayoutStats;$('#itmRound').onchange=()=>{$('#customPaidWrap').style.display=$('#itmRound').value==='custom'?'flex':'none';renderPayoutStats();};$('#itmPaidCustom').oninput=renderPayoutStats;
    $('#addPayoutRow').onclick=()=>{const n=state.payouts.length+1;state.payouts.push({place:n,prize:''});renderPayoutRows();};$('#payoutImport').onchange=e=>importTableFile(e.target.files[0],'payouts');
    $('#savePayouts').onclick=()=>{readPayoutRows();state.itm.percent=$('#itmPercent').value==='custom'?'custom':Number($('#itmPercent').value);state.itm.customPercent=number($('#itmCustom').value);state.itm.round=$('#itmRound').value;state.itm.customPaid=Math.floor(number($('#itmPaidCustom').value));const need=Math.max(10,paidPlaces());while(state.payouts.length<need){const n=state.payouts.length+1;state.payouts.push({place:n,prize:''});}renderPayoutRows();renderDashboard();renderPayoutStats();saveState('Payout & ITM saved.');};
    $('#saveDisplay').onclick=()=>{state.display.title=$('#displayTitle').value.trim();state.display.subtitle=$('#displaySubtitle').value.trim();state.display.footer=$('#displayFooter').value.trim();state.display.showPlayers=$('#showPlayers').checked;state.display.showPrize=$('#showPrize').checked;state.display.showPayout=$('#showPayout').checked;state.display.showLateReg=$('#showLateReg').checked;saveState('Display settings saved.');};
    $('#logoFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;const ok=await EverestStore.saveBlob('logo',f);$('#logoStatus').textContent=ok?'Custom logo saved':'Logo could not be saved';if(ok)setLogoPreview(f);toast(ok?'Logo saved.':'Could not save logo.','warn');};$('#clearLogo').onclick=async()=>{await EverestStore.deleteBlob('logo');$('#logoStatus').textContent='No custom logo';setLogoPreview(null);toast('Logo cleared.');};
    $('#backgroundFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;const ok=await EverestStore.saveBlob('background',f);$('#backgroundStatus').textContent=ok?'Custom background saved':'Background could not be saved';toast(ok?'Background saved.':'Could not save background.','warn');};$('#clearBackground').onclick=async()=>{await EverestStore.deleteBlob('background');$('#backgroundStatus').textContent='Default background';toast('Background cleared.');};
    $('#countdownFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;const ok=await EverestAudio.setFile('countdown',f);renderSound();toast(ok?'Countdown MP3 saved.':'Could not save countdown MP3.','warn');};$('#bellFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;const ok=await EverestAudio.setFile('bell',f);renderSound();toast(ok?'Bell MP3 saved.':'Could not save bell MP3.','warn');};
    $('#testCountdown').onclick=async()=>{if(!EverestAudio.unlocked)await EverestAudio.unlock();EverestAudio.stopCountdown();EverestAudio.playCountdown();};$('#testBell').onclick=async()=>{if(!EverestAudio.unlocked)await EverestAudio.unlock();EverestAudio.playBell();};$('#clearCountdown').onclick=async()=>{await EverestAudio.clear('countdown');renderSound();toast('Countdown cleared.');};$('#clearBell').onclick=async()=>{await EverestAudio.clear('bell');renderSound();toast('Bell cleared.');};$('#saveSound').onclick=()=>{state.settings.countdown=$('#enableCountdown').checked;state.settings.bell=$('#enableBell').checked;saveState('Sound settings saved.');};
    $('#exportBackup').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`everest-tournament-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);};
    $('#importBackup').onclick=async()=>{const f=$('#importBackupFile').files[0];if(!f)return toast('Choose a JSON backup first.','warn');try{state=merge(deep(defaults),JSON.parse(await f.text()));sanitize();EverestAudio.stopAll();lastCountdownTick=null;await renderAll();await saveState('Backup imported.');}catch(e){toast('Invalid backup file.','error');}};
    $('#requestPersist').onclick=async()=>toast((await EverestStore.persist())?'Persistent browser storage granted.':'Browser did not grant persistent storage.','warn');
    $('#resetAll').onclick=()=>{if(!confirm('Reset all tournament data? Export a backup first if needed.'))return;EverestAudio.stopAll();lastCountdownTick=null;state=deep(defaults);renderAll();saveState('Tournament data reset.');};
    EverestStore.onRemote(remote=>{state=merge(deep(defaults),remote);sanitize();renderDashboard();renderPayoutStats();});
  }

  async function importTableFile(file,kind){
    if(!file)return;try{
      let rows=[];
      if(window.XLSX){const data=await file.arrayBuffer();const wb=XLSX.read(data,{type:'array'});rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});}
      else if(file.name.toLowerCase().endsWith('.csv')){rows=parseCSV(await file.text());}
      else throw new Error('Excel parser unavailable');
      if(kind==='blinds'){
        const parsed=rows.map((r,i)=>{const type=String(r.Type??r.type??r.TYPE??'level').toLowerCase().includes('break')?'break':'level';return{type,name:String(r.Name??r.name??r.Level??r.level??`${type==='break'?'Break':'Level'} ${i+1}`),minutes:Math.max(1,number(r.Minutes??r.minutes??r.Min??r.min??r.Duration??r.duration??20)),sb:type==='break'?0:number(r.SB??r.sb??r.SmallBlind??r['Small Blind']),bb:type==='break'?0:number(r.BB??r.bb??r.BigBlind??r['Big Blind']),ante:type==='break'?0:number(r.Ante??r.ante)};}).filter(r=>r.name);
        if(!parsed.length)throw new Error('No blind rows');state.blinds=parsed;state.timer.index=0;state.timer.running=false;state.timer.endAt=null;state.timer.remaining=number(state.blinds[0].minutes)*60;state.timer.countdownPlayed=false;state.tournament.lateRegCloseIndex=null;renderBlindRows();renderTournament();renderDashboard();toast(`${parsed.length} blind rows imported.`);
      }else{
        const parsed=rows.map((r,i)=>{const place=Math.max(1,Math.floor(number(r.Place??r.place??r.Position??r.position??i+1)));let prize=String(r.Prize??r.prize??r.Item??r.item??r.Award??r.award??'').trim();const label=String(r.Label??r.label??'').trim();const amount=number(r.Amount??r.amount);if(!prize&&label&&!/^\d+(?:ST|ND|RD|TH)$/i.test(label))prize=label;if(!prize&&amount)prize=money(amount);else if(prize&&amount&&!payoutCashValue(prize))prize=`${prize} · ${money(amount)}`;return{place,prize};}).filter(r=>r.place);
        if(!parsed.length)throw new Error('No payout rows');state.payouts=parsed;while(state.payouts.length<10){const n=state.payouts.length+1;state.payouts.push({place:n,prize:''});}renderPayoutRows();renderPayoutStats();toast(`${parsed.length} payout rows imported.`);
      }
    }catch(e){toast('Could not import file. Check the column headers and file format.','error');}
    finally{if(file&&kind==='blinds')$('#blindImport').value='';if(file&&kind==='payouts')$('#payoutImport').value='';}
  }
  function parseCSV(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);if(!lines.length)return[];const split=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){out.push(cur);cur='';}else cur+=c;}out.push(cur);return out;};const headers=split(lines[0]).map(x=>x.trim());return lines.slice(1).map(line=>{const vals=split(line),o={};headers.forEach((h,i)=>o[h]=vals[i]??'');return o;});}
  function escapeHtml(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  function escapeAttr(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function tick(){
    if(!state.timer.running)return;
    const sec=secondsNow();state.timer.remaining=sec;$('#dashTimer').textContent=timeShort(sec);const late=lateRegInfo();$('#dashLateReg').textContent=late.open?`Late reg: ${late.text} · ${late.detail}`:'Late reg: CLOSE';
    if(sec>10)lastCountdownTick=null;
    if(sec<=10&&sec>0&&state.settings.countdown!==false&&sec!==lastCountdownTick){
      lastCountdownTick=sec;
      state.timer.countdownPlayed=true;
      EverestAudio.stopCountdown();
      EverestAudio.playCountdown();
    }
    if(sec<=0)autoAdvance();
  }
  async function init(){
    const loaded=await EverestStore.load();if(loaded)state=merge(deep(defaults),loaded);sanitize();await EverestAudio.load();wire();await renderAll();setInterval(tick,250);
  }
  init();
})();