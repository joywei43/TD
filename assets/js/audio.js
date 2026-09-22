(function(){
  let unlocked=false;
  let ctx=null;
  let countdown=null,bell=null;
  let countdownUrl=null,bellUrl=null;

  function revoke(which){
    if(which==='countdown'&&countdownUrl){URL.revokeObjectURL(countdownUrl);countdownUrl=null;}
    if(which==='bell'&&bellUrl){URL.revokeObjectURL(bellUrl);bellUrl=null;}
  }
  function setAudio(which,blob){
    revoke(which);
    if(!blob){if(which==='countdown')countdown=null;else bell=null;return;}
    const url=URL.createObjectURL(blob);
    const a=new Audio(url);a.preload='auto';
    if(which==='countdown'){countdownUrl=url;countdown=a;}else{bellUrl=url;bell=a;}
  }
  async function load(){setAudio('countdown',await EverestStore.loadBlob('countdown'));setAudio('bell',await EverestStore.loadBlob('bell'));}
  async function unlock(){
    try{
      ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();
      await ctx.resume();
      unlocked=true;
      const o=ctx.createOscillator(),g=ctx.createGain();g.gain.value=.00001;o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+.01);
      return true;
    }catch(e){return false;}
  }
  async function setFile(which,file){const ok=await EverestStore.saveBlob(which,file);if(ok)setAudio(which,file);return ok;}
  async function clear(which){await EverestStore.deleteBlob(which);setAudio(which,null);}
  function fallback(freq,duration){
    if(!ctx||!unlocked)return false;
    try{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(.08,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration+.02);return true;}catch(e){return false;}
  }
  function play(audio,fallbackFreq,fallbackDuration){
    if(!unlocked)return false;
    if(audio){try{audio.currentTime=0;audio.play().catch(()=>{});return true;}catch(e){}}
    return fallback(fallbackFreq,fallbackDuration);
  }
  function stop(audio){if(!audio)return;try{audio.pause();audio.currentTime=0;}catch(e){}}
  function playCountdown(){return play(countdown,880,.25);}
  function stopCountdown(){stop(countdown);}
  function playBell(){return play(bell,1180,.38);}
  function stopAll(){stop(countdown);stop(bell);}
  function has(which){return which==='countdown'?!!countdown:!!bell;}
  window.EverestAudio={load,unlock,setFile,clear,playCountdown,stopCountdown,playBell,stopAll,has,get unlocked(){return unlocked;}};
})();