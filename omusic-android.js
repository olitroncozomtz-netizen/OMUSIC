/* Integración del APK; en la página web normal este archivo no activa ningún puente. */
(() => {
  'use strict';
  if(location.origin!=='https://appassets.androidplatform.net'||location.pathname!=='/assets/www/index.html')return;
  function native(action,data={}){try{return JSON.parse(prompt('omusic-native:'+JSON.stringify({action,...data}),'')||'{}');}catch{return {ok:false};}}
  const capabilities=native('capabilities');if(!capabilities.ok)return;
  let pending=null;
  function finish(error,value){if(!pending)return;const request=pending;pending=null;clearTimeout(request.timeout);if(error)request.reject(error);else request.resolve(value);}
  function cancelled(){return {code:'auth/popup-closed-by-user'};}
  const auth={
    signIn(provider){
      if(pending)return Promise.reject({code:'auth/cancelled-popup-request'});
      const response=native('login',{provider});if(!response.ok||!response.state)return Promise.reject({code:'auth/network-request-failed'});
      return new Promise((resolve,reject)=>{pending={state:response.state,resolve,reject,timeout:setTimeout(()=>auth.cancel(),600000)};});
    },
    receive(response){if(pending&&response?.state===pending.state)finish(null,response.credential);},
    failed(){finish({code:'auth/invalid-credential'});},
    returned(){if(pending)auth.cancel();},
    cancel(){native('cancelAuth');finish(cancelled());}
  };
  window.OMAndroidAuth=auth;
  window.OMAndroid={
    publicBase:capabilities.website,
    pipEnabled:capabilities.pip,
    configureWebsite(){native('configureWebsite');},
    share(data){const result=native('share',data);return result.ok?Promise.resolve():Promise.reject(new Error('No se pudo compartir.'));},
    copy(text){return native('copy',{text}).ok?Promise.resolve():Promise.reject(new Error('No se pudo copiar.'));},
    pip(){return capabilities.pip&&native('pip').ok;},
    mediaCommand(action,position){
      if(typeof audio==='undefined'||typeof currentSong==='undefined'||!currentSong)return;
      if(action==='play'&&audio.paused)window.playPause();
      else if(action==='pause'&&!audio.paused)audio.pause();
      else if(action==='next')window.playNext();else if(action==='previous')window.prevSong();
      else if(action==='seek'&&Number.isFinite(position))audio.currentTime=Math.max(0,Math.min(audio.duration||0,position/1000));
    },
    back(){
      if(document.getElementById('om-dialog-backdrop')?.hidden===false){window.omCloseDialog?.();return true;}
      if(window.OMMobilePlayer?.queueOpen){window.omMobileQueueClose();return true;}
      if(document.body.classList.contains('om-mobile-player-open')){window.OMMobilePlayer.close();return true;}
      if(window.OMMobileVideo?.visible){window.omMobileVideoMinimize();return true;}
      if(document.body.classList.contains('om-immersive-open')){window.omCloseImmersive?.();return true;}
      if(typeof OM!=='undefined'&&OM.back.length){window.omBack();return true;}
      return false;
    }
  };
  document.addEventListener('DOMContentLoaded',()=>{
    document.documentElement.dataset.androidApp='true';
    // WebView's native clipboard/share support differs by Android version.
    try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:text=>window.OMAndroid.copy(text)}});}catch{}
    function publish(){
      if(typeof currentSong==='undefined'||!currentSong)return;
      native('media',{title:currentSong.title,artist:currentSong.artist,playing:!audio.paused,position:Math.round((audio.currentTime||0)*1000),duration:Math.round((Number.isFinite(audio.duration)?audio.duration:0)*1000)});
    }
    if(typeof audio!=='undefined')for(const event of ['play','pause','loadedmetadata','seeked','ended'])audio.addEventListener(event,publish);

  },{once:true});
})();
