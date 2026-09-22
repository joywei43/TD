(function(){
  const DB_NAME='everest-td-v3';
  const STORE='kv';
  const STATE_KEY='state';
  const FALLBACK='everest-td-state-v3-lite';
  const CHANNEL='everest-td-sync-v3';
  let dbPromise=null;
  let channel=null;
  const stateListeners=new Set();
  const mediaListeners=new Set();

  function openDB(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));
    });
    return dbPromise;
  }
  async function get(key){
    const db=await openDB();
    return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  }
  async function put(key,value){
    const db=await openDB();
    return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('IndexedDB write aborted'));});
  }
  async function del(key){
    const db=await openDB();
    return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);});
  }
  function lite(state){
    return {
      version:state.version,updatedAt:state.updatedAt,tournament:state.tournament,timer:state.timer,
      counts:state.counts,blinds:state.blinds,itm:state.itm,payouts:state.payouts,display:state.display,
      settings:state.settings,history:(state.history||[]).slice(-30)
    };
  }
  async function load(){
    try{const x=await get(STATE_KEY);if(x)return x;}catch(e){}
    try{const raw=localStorage.getItem(FALLBACK);return raw?JSON.parse(raw):null;}catch(e){return null;}
  }
  async function save(state,{broadcast=true}={}){
    state.updatedAt=Date.now();
    let mode='indexeddb';
    try{await put(STATE_KEY,state);}catch(e){mode='memory';}
    try{localStorage.setItem(FALLBACK,JSON.stringify(lite(state)));}catch(e){}
    if(broadcast&&channel){try{channel.postMessage({type:'state',state});}catch(e){}}
    return mode;
  }
  async function saveBlob(key,blob){
    try{await put('blob:'+key,blob);if(channel)channel.postMessage({type:'media',key});return true;}catch(e){return false;}
  }
  async function loadBlob(key){try{return await get('blob:'+key)||null;}catch(e){return null;}}
  async function deleteBlob(key){try{await del('blob:'+key);if(channel)channel.postMessage({type:'media',key});return true;}catch(e){return false;}}
  function onRemote(fn){stateListeners.add(fn);return()=>stateListeners.delete(fn);}
  function onMedia(fn){mediaListeners.add(fn);return()=>mediaListeners.delete(fn);}
  try{
    channel=new BroadcastChannel(CHANNEL);
    channel.onmessage=e=>{
      if(!e.data)return;
      if(e.data.type==='state'&&e.data.state)stateListeners.forEach(fn=>fn(e.data.state));
      if(e.data.type==='media')mediaListeners.forEach(fn=>fn(e.data.key));
    };
  }catch(e){
    window.addEventListener('storage',event=>{
      if(event.key===FALLBACK&&event.newValue){try{const s=JSON.parse(event.newValue);stateListeners.forEach(fn=>fn(s));}catch(_){} }
    });
  }
  async function estimate(){try{return navigator.storage&&navigator.storage.estimate?await navigator.storage.estimate():null;}catch(e){return null;}}
  async function persist(){try{return navigator.storage&&navigator.storage.persist?await navigator.storage.persist():false;}catch(e){return false;}}
  window.EverestStore={load,save,saveBlob,loadBlob,deleteBlob,onRemote,onMedia,estimate,persist};
})();