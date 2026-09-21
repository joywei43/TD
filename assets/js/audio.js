(function(){
  let ctx=null, unlocked=false, countdownUrl=null, bellUrl=null, countdownAudio=null, bellAudio=null;
  async function unlock(){try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();unlocked=true;beep(760,.05,.02);return true}catch(e){return false}}
  function beep(freq=880,dur=.1,gain=.08,delay=0){if(!ctx||!unlocked)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,ctx.currentTime+delay);g.gain.linearRampToValueAtTime(gain,ctx.currentTime+delay+.005);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+delay+dur);o.connect(g).connect(ctx.destination);o.start(ctx.currentTime+delay);o.stop(ctx.currentTime+delay+dur+.03)}
  function setObj(which,blob){if(!blob)return;if(which==='countdown'){if(countdownUrl)URL.revokeObjectURL(countdownUrl);countdownUrl=URL.createObjectURL(blob);countdownAudio=new Audio(countdownUrl)}else{if(bellUrl)URL.revokeObjectURL(bellUrl);bellUrl=URL.createObjectURL(blob);bellAudio=new Audio(bellUrl)}}
  async function load(){setObj('countdown',await EverestStore.loadBlob('countdown'));setObj('bell',await EverestStore.loadBlob('bell'))}
  async function setFile(which,file){if(!file)return false;const ok=await EverestStore.saveBlob(which,file);if(ok)setObj(which,file);return ok}
  async function clear(which){await EverestStore.delBlob(which);setObj(which,null);if(which==='countdown'){countdownAudio=null;if(countdownUrl)URL.revokeObjectURL(countdownUrl);countdownUrl=null}else{bellAudio=null;if(bellUrl)URL.revokeObjectURL(bellUrl);bellUrl=null}}
  function playNode(audio){if(!audio||!unlocked)return false;try{audio.currentTime=0;audio.play().catch(()=>{});return true}catch(e){return false}}
  function countdown(){if(!playNode(countdownAudio))beep(980,.07,.07)}
  function bell(){if(bellAudio&&unlocked){[0,220,440].forEach(ms=>setTimeout(()=>playNode(bellAudio),ms));}else{beep(1120,.11,.1,0);beep(1120,.11,.1,.18);beep(1120,.14,.11,.36)}}
  function has(which){return which==='countdown'?!!countdownAudio:!!bellAudio}
  window.EverestAudio={unlock,load,setFile,clear,countdown,bell,has,get unlocked(){return unlocked}};
})();
