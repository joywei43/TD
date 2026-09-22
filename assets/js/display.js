(function(){
  'use strict';
  const $=s=>document.querySelector(s),deep=x=>JSON.parse(JSON.stringify(x)),number=x=>Math.max(0,Number(x)||0),fmt=x=>Math.round(Number(x)||0).toLocaleString('en-US');
  const defaults={version:3,tournament:{name:'MAIN EVENT',subtitle:'',currency:'₱',guarantee:0,lateRegCloseIndex:null,buy:{chips:20000,prize:1000,fee:0},re:{same:true,chips:20000,prize:1000,fee:0},add:{disabled:false,chips:20000,prize:0,fee:0}},timer:{index:0,running:false,remaining:1200,endAt:null,countdownPlayed:false},counts:{buyins:0,reentries:0,addons:0,remaining:0},blinds:[{type:'level',name:'Level 1',minutes:20,sb:100,bb:200,ante:200},{type:'level',name:'Level 2',minutes:20,sb:100,bb:300,ante:300}],itm:{percent:10,customPercent:10,round:'up',customPaid:0},payouts:[],display:{title:'',subtitle:'',footer:'BOOST YOUR CHIPS, CONTACT STAFF',announcement:'',showPlayers:true,showPrize:true,showPayout:true,showLateReg:true},settings:{}};
  let state=deep(defaults),page=0;

  function merge(a,b){if(!b||typeof b!=='object')return a;for(const k of Object.keys(b)){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))merge(a[k],b[k]);else a[k]=b[k];}return a;}
  function secondsNow(){return state.timer.running&&state.timer.endAt?Math.max(0,Math.ceil((state.timer.endAt-Date.now())/1000)):number(state.timer.remaining);}
  function timeShort(s){s=Math.max(0,Math.floor(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  function timeLong(s){s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
  function current(){return state.blinds[state.timer.index]||state.blinds[0]||defaults.blinds[0];}
  function rePackage(){return state.tournament.re.same?state.tournament.buy:state.tournament.re;}
  function totals(){const c=state.counts,t=state.tournament,r=rePackage(),a=t.add;const entries=c.buyins+c.reentries;const chips=c.buyins*number(t.buy.chips)+c.reentries*number(r.chips)+c.addons*number(a.chips);const contribution=c.buyins*number(t.buy.prize)+c.reentries*number(r.prize)+c.addons*number(a.prize);return{entries,chips,avg:c.remaining?Math.round(chips/c.remaining):0,prize:Math.max(contribution,number(t.guarantee))};}
  function paidPlaces(){const entries=totals().entries,rule=state.itm||defaults.itm;if(!entries)return 0;if(rule.round==='custom')return Math.max(0,Math.min(entries,Math.floor(number(rule.customPaid))));const pct=rule.percent==='custom'?number(rule.customPercent):number(rule.percent);const raw=entries*pct/100;if(rule.round==='down')return Math.floor(raw);if(rule.round==='nearest')return Math.round(raw);return Math.ceil(raw);}
  function payoutPrize(p){
    if(p&&Object.prototype.hasOwnProperty.call(p,'prize'))return String(p.prize??'').trim();
    const label=String(p?.label??'').trim(),amount=number(p?.amount);
    if(label&&amount)return `${label} · ${money(amount)}`;
    if(label)return label;
    if(amount)return money(amount);
    return '';
  }
  function effectivePaidPlaces(){
    const configured=paidPlaces();
    if(configured>0)return configured;
    return (state.payouts||[]).filter(p=>payoutPrize(p)).length;
  }
  function formatPrize(raw){return String(raw??'').trim()||'—';}
  function lateReg(){const close=state.tournament.lateRegCloseIndex;if(close===null||close===''||!Number.isFinite(Number(close)))return{open:true,text:'OPEN'};const idx=Number(close);if(state.timer.index>idx)return{open:false,text:'CLOSED'};let sec=secondsNow();for(let i=state.timer.index+1;i<=idx&&i<state.blinds.length;i++)sec+=number(state.blinds[i].minutes)*60;return{open:true,text:timeLong(sec)};}
  function nextBlindStage(){for(let i=state.timer.index+1;i<state.blinds.length;i++){if(state.blinds[i]?.type!=='break')return state.blinds[i];}return null;}
  function nextBreakInfo(){
    let breakIndex=-1;for(let i=state.timer.index+1;i<state.blinds.length;i++){if(state.blinds[i]?.type==='break'){breakIndex=i;break;}}
    if(breakIndex<0)return '—';
    let sec=secondsNow();for(let i=state.timer.index+1;i<breakIndex;i++)sec+=number(state.blinds[i]?.minutes)*60;
    return timeLong(sec);
  }
  function money(n){return `${state.tournament.currency||'₱'}${fmt(n)}`;}
  function escapeHtml(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}

  function renderPayouts(){
    const rows=(state.payouts||[]).slice().sort((a,b)=>(Number(a.place)||0)-(Number(b.place)||0));
    const pages=Math.max(1,Math.ceil(Math.max(rows.length,10)/10));if(page>=pages)page=0;
    const chunk=rows.slice(page*10,page*10+10),filled=Array.from({length:10},(_,i)=>chunk[i]||null);
    const paid=effectivePaidPlaces(),remaining=number(state.counts.remaining),inTheMoney=paid>0&&remaining>0&&remaining<=paid;
    $('#tvPayouts').innerHTML=filled.map((r,i)=>{
      const place=Number(r?.place)||page*10+i+1,prize=payoutPrize(r),eliminated=inTheMoney&&place>remaining&&place<=paid;
      if(!r||!prize)return `<div class="classic-payout-row classic-payout-empty"><div class="classic-payout-place">—</div><div class="classic-payout-prize">—</div></div>`;
      return `<div class="classic-payout-row${eliminated?' classic-payout-eliminated':''}"><div class="classic-payout-place">${escapeHtml(place)}</div><div class="classic-payout-prize">${escapeHtml(formatPrize(prize))}</div></div>`;
    }).join('');
    $('#tvPage').textContent=`${page+1} / ${pages}`;
  }

  function render(){
    const stage=current(),next=nextBlindStage(),t=totals(),late=lateReg(),d=state.display||{},paid=effectivePaidPlaces();
    $('#tvTitle').textContent=(d.title||state.tournament.name||'MAIN EVENT').toUpperCase();
    $('#tvSubtitle').textContent=(d.subtitle||state.tournament.subtitle||'').toUpperCase();
    $('#tvLevel').textContent=(stage.name||'LEVEL').toUpperCase();
    if(stage.type==='break'){$('#tvBlinds').textContent='BREAK';$('#tvAnte').textContent='';}
    else{$('#tvBlinds').textContent=`${fmt(stage.sb)} / ${fmt(stage.bb)}`;$('#tvAnte').textContent=`BB ANTE ${fmt(stage.ante)}`;}
    $('#tvTimer').textContent=timeShort(secondsNow());
    $('#tvNext').textContent=next?`${fmt(next.sb)} / ${fmt(next.bb)} / ${fmt(next.ante)}`:'FINAL STAGE';
    $('#tvNextBreak').textContent=nextBreakInfo();
    $('#tvRemaining').textContent=state.counts.remaining;$('#tvEntries').textContent=t.entries;$('#tvReentries').textContent=state.counts.reentries;$('#tvAddons').textContent=state.counts.addons;
    $('#tvChips').textContent=fmt(t.chips);$('#tvAverage').textContent=fmt(t.avg);$('#tvITM').textContent=paid;$('#tvPrize').textContent=money(t.prize);
    $('#tvLateReg').textContent=late.text;$('#tvLateRegWrap').classList.toggle('closed',!late.open);$('#tvLateRegWrap').classList.toggle('hidden',d.showLateReg===false);
    $('#tvAnnouncement').textContent=d.announcement||'';$('#tvAnnouncement').classList.toggle('hidden',!d.announcement);
    $('#tvFooter').textContent=(d.footer||'BOOST YOUR CHIPS, CONTACT STAFF').toUpperCase();
    $('#tvLeft').classList.toggle('hidden',d.showPlayers===false);$('#tvRight').classList.toggle('hidden',d.showPayout===false);$('#tvPrizeWrap').classList.toggle('hidden',d.showPrize===false);
    $('#tvRoot').classList.toggle('hide-left',d.showPlayers===false);$('#tvRoot').classList.toggle('hide-right',d.showPayout===false);$('#tvRoot').classList.toggle('break-mode',stage.type==='break');
    renderPayouts();
  }

  let logoUrl=null;
  async function refreshLogo(){
    const blob=await EverestStore.loadBlob('logo');
    if(logoUrl)URL.revokeObjectURL(logoUrl);
    logoUrl=blob?URL.createObjectURL(blob):null;
    $('#tvLogo').classList.toggle('hidden',!logoUrl);
    if(logoUrl)$('#tvLogo').src=logoUrl;else $('#tvLogo').removeAttribute('src');
  }
  async function init(){
    const loaded=await EverestStore.load();if(loaded)state=merge(deep(defaults),loaded);
    await refreshLogo();
    render();
    EverestStore.onMedia(key=>{if(key==='logo')refreshLogo();});
    EverestStore.onRemote(s=>{state=merge(deep(defaults),s);page=0;render();});
    setInterval(render,250);
    setInterval(()=>{const pages=Math.max(1,Math.ceil(Math.max((state.payouts||[]).length,10)/10));if(pages>1){page=(page+1)%pages;renderPayouts();}},3000);
  }
  init();
})();