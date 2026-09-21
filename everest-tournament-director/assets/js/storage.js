(function(){
  const DB='everest-td-v2', STORE='kv', STATE='state', CH='everest-td-sync-v2';
  let dbp=null; const listeners=new Set(); let channel=null;
  function openDB(){ if(dbp) return dbp; dbp=new Promise((resolve,reject)=>{ const r=indexedDB.open(DB,1); r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)}; r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);}); return dbp; }
  async function idbGet(key){ const db=await openDB(); return new Promise((res,rej)=>{const t=db.transaction(STORE,'readonly'),r=t.objectStore(STORE).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}); }
  async function idbSet(key,val){ const db=await openDB(); return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(val,key);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('IndexedDB aborted'))}); }
  async function idbDel(key){ const db=await openDB(); return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(key);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)}); }
  async function load(){ try{const x=await idbGet(STATE);if(x)return x}catch(e){} try{const raw=localStorage.getItem('everest-td-state-lite');return raw?JSON.parse(raw):null}catch(e){return null} }
  function lite(s){return {version:s.version,updatedAt:s.updatedAt,tournament:s.tournament,timer:s.timer,counts:s.counts,finance:s.finance,blinds:s.blinds,payouts:s.payouts,display:s.display,settings:s.settings,history:(s.history||[]).slice(-20)}}
  async function save(state,{broadcast=true}={}){ state.updatedAt=Date.now(); let mode='indexeddb'; try{await idbSet(STATE,state)}catch(e){mode='memory';}
    try{localStorage.setItem('everest-td-state-lite',JSON.stringify(lite(state)))}catch(e){}
    if(broadcast&&channel){try{channel.postMessage({type:'state',state})}catch(e){}}
    return mode;
  }
  async function saveBlob(key,blob){try{await idbSet('blob:'+key,blob);return true}catch(e){return false}}
  async function loadBlob(key){try{return await idbGet('blob:'+key)}catch(e){return null}}
  async function delBlob(key){try{await idbDel('blob:'+key)}catch(e){} }
  function onRemote(cb){listeners.add(cb);return()=>listeners.delete(cb)}
  try{channel=new BroadcastChannel(CH);channel.onmessage=e=>{if(e.data&&e.data.type==='state')listeners.forEach(fn=>fn(e.data.state))}}catch(e){window.addEventListener('storage',ev=>{if(ev.key==='everest-td-state-lite'&&ev.newValue){try{const s=JSON.parse(ev.newValue);listeners.forEach(fn=>fn(s))}catch(_){}}})}
  async function persist(){try{if(navigator.storage&&navigator.storage.persist)return await navigator.storage.persist()}catch(e){}return false}
  async function estimate(){try{if(navigator.storage&&navigator.storage.estimate)return await navigator.storage.estimate()}catch(e){}return null}
  window.EverestStore={load,save,saveBlob,loadBlob,delBlob,onRemote,persist,estimate};
})();
