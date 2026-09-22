(function(){
  'use strict';
  const $=s=>document.querySelector(s),deep=x=>JSON.parse(JSON.stringify(x)),number=x=>Math.max(0,Number(x)||0),fmt=x=>Math.round(Number(x)||0).toLocaleString('en-US');
  const defaults={version:3,tournament:{name:'MAIN EVENT',subtitle:'',currency:'₱',guarantee:0,lateRegCloseIndex:null,buy:{chips:20000,prize:1000,fee:0},re:{same:true,chips:20000,prize:1000,fee:0},add:{disabled:false,chips:20000,prize:0,fee:0}},timer:{index:0,running:false,remaining:1200,endAt:null,countdownPlayed:false},counts:{buyins:0,reentries:0,addons:0,remaining:0},blinds:[{type:'level',name:'Level 1',minutes:20,sb:100,bb:200,ante:200},{type:'level',name:'Level 2',minutes:20,sb:100,bb:300,ante:300}],itm:{percent:10,customPercent:10,round:'up',customPaid:0},payouts:[],display:{title:'',subtitle:'EVEREST POKER ROOM',footer:'Everest Poker Room · Midori Casino 2F',announcement:'',showPlayers:true,showPrize:true,showPayout:true,showLateReg:true},settings:{}};
  let state=deep(defaults),page=0,logoUrl=null,bgUrl=null;
  function merge(a,b){if(!b||typeof b!=='object')return a;for(const k of Object.keys(b)){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))merge(a[k],b[k]);else a[k]=b[k];}return a;}
  function secondsNow(){return state.timer.running&&state.timer.endAt?Math.max(0,Math.ceil((state.timer.endAt-Date.now())/1000)):number(state.timer.remaining);}
  function timeShort(s){s=Math.max(0,Math.floor(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  function timeLong(s){s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
  function current(){return state.blinds[state.timer.index]||state.blinds[0]||defaults.blinds[0];}
  function rePackage(){return state.tournament.re.same?state.tournament.buy:state.tournament.re;}
  function totals(){const c=state.counts,t=state.tournament,r=rePackage(),a=t.add;const entries=c.buyins+c.reentries;const chips=c.buyins*number(t.buy.chips)+c.reentries*number(r.chips)+c.addons*number(a.chips);const contribution=c.buyins*number(t.buy.prize)+c.reentries*number(r.prize)+c.addons*number(a.prize);return{entries,chips,avg:c.remaining?Math.round(chips/c.remaining):0,prize:Math.max(contribution,number(t.guarantee))};}
  function paidPlaces(){const entries=totals().entries,rule=state.itm||defaults.itm;if(!entries)return 0;if(rule.round==='custom')return Math.max(0,Math.min(entries,Math.floor(number(rule.customPaid))));const pct=rule.percent==='custom'?number(rule.customPercent):number(rule.percent);const raw=entries*pct/100;if(rule.round==='down')return Math.floor(raw);if(rule.round==='nearest')return Math.round(raw);return Math.ceil(raw);}
  function lateReg(){const close=state.tournament.lateRegCloseIndex;if(close===null||close===''||!Number.isFinite(Number(close)))return{open:true,text:'OPEN'};const idx=Number(close);if(state.timer.index>idx)return{open:false,text:'CLOSE'};let sec=secondsNow();for(let i=state.timer.index+1;i<=idx&&i<state.blinds.length;i++)sec+=number(state.blinds[i].minutes)*60;return{open:true,text:timeLong(sec)};}
  function blind(stage){return stage&&stage.type==='break'?'BREAK':stage?`${fmt(stage.sb)} / ${fmt(stage.bb)} / ${fmt(stage.ante)}`:'—';}
  function money(n){return `${state.tournament.currency||'₱'}${fmt(n)}`;}
  function escapeHtml(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  function ordinal(n){const v=n%100;if(v>=11&&v<=13)return n+'TH';return n+({1:'ST',2:'ND',3:'RD'}[n%10]||'TH');}
  function payoutPrize(p){
    if(p&&Object.prototype.hasOwnProperty.call(p,'prize'))return String(p.prize??'');
    const place=Math.max(1,Number(p?.place)||1),label=String(p?.label??'').trim(),amount=number(p?.amount),defaultLabel=ordinal(place);
    let prize=label&&label.toUpperCase()!==defaultLabel.toUpperCase()?label:'';
    if(amount)prize=prize?`${prize} · ${money(amount)}`:money(amount);
    return prize;
  }

  function renderPayouts(){
    const rows=(state.payouts||[]).slice().sort((a,b)=>(Number(a.place)||0)-(Number(b.place)||0));const pages=Math.max(1,Math.ceil(Math.max(rows.length,10)/10));if(page>=pages)page=0;const chunk=rows.slice(page*10,page*10+10);const filled=Array.from({length:10},(_,i)=>chunk[i]||null);
    const paid=paidPlaces(),remaining=number(state.counts.remaining),inTheMoney=paid>0&&remaining>0&&remaining<=paid;
    $('#tvPayouts').innerHTML=filled.map((r,i)=>{const place=Number(r?.place)||page*10+i+1,prize=payoutPrize(r),eliminated=inTheMoney&&place>remaining&&place<=paid;return r?`<div class="tv-payout-row${eliminated?' tv-payout-eliminated':''}"><div class="tv-payout-place">${escapeHtml(place)}</div><div class="tv-payout-prize">${escapeHtml(prize||'—')}</div></div>`:`<div class="tv-payout-row tv-payout-empty"><div class="tv-payout-place">${page*10+i+1}</div><div class="tv-payout-prize">—</div></div>`;}).join('');
    $('#tvPage').textContent=pages>1?`PAYOUT ${page+1} / ${pages}`:'';
  }
  function render(){
    const stage=current(),next=state.blinds[state.timer.index+1],t=totals(),late=lateReg(),d=state.display||{};
    $('#tvTitle').textContent=d.title||state.tournament.name||'MAIN EVENT';$('#tvSubtitle').textContent=d.subtitle||state.tournament.subtitle||'EVEREST POKER ROOM';
    $('#tvState').textContent=state.timer.running?'RUNNING':'PAUSED';$('#tvState').className='tv-state '+(state.timer.running?'running':'paused');
    $('#tvLevel').textContent=(stage.name||'LEVEL').toUpperCase();$('#tvBlinds').textContent=blind(stage);$('#tvTimer').textContent=timeShort(secondsNow());$('#tvNext').textContent=next?(next.type==='break'?next.name:blind(next)):'FINAL STAGE';
    $('#tvRemaining').textContent=state.counts.remaining;$('#tvEntries').textContent=t.entries;$('#tvReentries').textContent=state.counts.reentries;$('#tvChips').textContent=fmt(t.chips);$('#tvAverage').textContent=fmt(t.avg);$('#tvITM').textContent=paidPlaces();$('#tvPrize').textContent=money(t.prize);
    $('#tvLateReg').textContent=late.text;$('#tvLateRegWrap').classList.toggle('closed',!late.open);$('#tvLateRegWrap').classList.toggle('hidden',d.showLateReg===false);
    $('#tvAnnouncement').textContent=d.announcement||'';$('#tvAnnouncement').classList.toggle('hidden',!d.announcement);$('#tvFooter').textContent=d.footer||'Everest Poker Room · Midori Casino 2F';
    $('#tvLeft').classList.toggle('hidden',d.showPlayers===false);$('#tvRight').classList.toggle('hidden',d.showPayout===false);$('#tvPrizeWrap').classList.toggle('hidden',d.showPrize===false);$('#tvRoot').classList.toggle('hide-left',d.showPlayers===false);$('#tvRoot').classList.toggle('hide-right',d.showPayout===false);$('#tvRoot').classList.toggle('break-mode',stage.type==='break');
    renderPayouts();
  }
  async function loadMedia(){
    const logo=await EverestStore.loadBlob('logo');if(logo){if(logoUrl)URL.revokeObjectURL(logoUrl);logoUrl=URL.createObjectURL(logo);$('#tvLogo').src=logoUrl;$('#tvLogoBox').classList.remove('hidden');}else{$('#tvLogoBox').classList.add('hidden');$('#tvLogo').removeAttribute('src');if(logoUrl){URL.revokeObjectURL(logoUrl);logoUrl=null;}}
    const bg=await EverestStore.loadBlob('background');if(bg){if(bgUrl)URL.revokeObjectURL(bgUrl);bgUrl=URL.createObjectURL(bg);$('#tvBackdrop').style.backgroundImage=`url("${bgUrl}")`;}else{$('#tvBackdrop').style.backgroundImage='none';if(bgUrl){URL.revokeObjectURL(bgUrl);bgUrl=null;}}
  }
  async function init(){const loaded=await EverestStore.load();if(loaded)state=merge(deep(defaults),loaded);await loadMedia();render();EverestStore.onRemote(s=>{state=merge(deep(defaults),s);page=0;render();});EverestStore.onMedia(()=>loadMedia());setInterval(render,250);setInterval(()=>{const pages=Math.max(1,Math.ceil(Math.max((state.payouts||[]).length,10)/10));if(pages>1){page=(page+1)%pages;renderPayouts();}},3000);}
  init();
})();