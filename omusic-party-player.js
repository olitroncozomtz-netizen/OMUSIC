/* Sincroniza el mismo audio del reproductor con el reloj y el estado de la party. */
(() => {
  'use strict';
  const P=window.OMParty,C=window.OMPartyCore;
  const local={id:null,applying:false,ready:false,blocked:false,loading:false,error:'',timer:null,generation:0,revision:-1,lastTrack:'',playPending:false};
  const before={load:window.loadSong,video:window.openVideo,play:window.playPause,next:window.playNext,previous:window.prevSong,end:window.handleSongEnd,queue:window.addToQueue,renderQueue:window.renderQueue,seek:progress.onclick,key:progress.onkeydown};
  const song=()=>songs.find(s=>s.url===P.room?.trackUrl&&s.url);
  const stale=()=>P.room&&P.now()-C.ms(P.room.heartbeatAt)>C.STALE_MS;
  function status(){
    if(!P.active)return '';
    if(!P.connected||navigator.onLine===false)return 'Sin conexión · Esperando a reconectar';
    if(stale())return 'Esperando la conexión del anfitrión';
    if(local.blocked)return 'Esta canción está restringida en tus ajustes';
    if(local.error)return local.error;
    if(!P.room.trackUrl)return 'Añade la primera canción';
    if(!local.ready)return 'Activa el audio en este dispositivo';
    if(local.loading)return 'Cargando audio…';
    if(P.room.playing&&P.now()<P.room.anchorMs)return 'Preparando reproducción sincronizada…';
    return P.room.playing?'Siguiendo el tiempo del anfitrión':'En pausa para todos';
  }
  function controls(){for(const id of ['btn-shuffle','btn-repeat']){const button=$om(id);if(button){button.disabled=P.active;button.setAttribute('aria-disabled',String(P.active));}}}
  function reset(){const wasInParty=!!local.id;clearTimeout(local.timer);local.timer=null;local.generation++;local.id=P.id;local.ready=false;local.error='';local.loading=false;local.blocked=false;local.revision=-1;local.lastTrack='';local.playPending=false;audio.playbackRate=1;if(wasInParty||P.active)audio.pause();controls();}
  function play(){
    if(local.playPending||!audio.paused)return;
    local.playPending=true;const generation=local.generation;
    audio.play().catch(error=>{if(generation!==local.generation||!P.active)return;local.ready=false;local.error=error.name==='NotAllowedError'?'Pulsa “Activar audio” para escuchar.':'No se pudo reproducir este archivo en tu dispositivo.';P.updateStatus();}).finally(()=>{if(generation===local.generation)local.playPending=false;});
  }
  function sync(force=false){
    clearTimeout(local.timer);local.timer=null;
    if(!P.active)return;
    const r=P.room,item=song();
    if(!P.connected||navigator.onLine===false||stale()){audio.pause();P.updateStatus();return;}
    if(!item){local.blocked=!!r.trackUrl;audio.pause();if(r.trackUrl)local.error='Esta canción no está en tu versión del catálogo.';P.updateStatus();return;}
    local.blocked=!window.OMSettings.allowed(item);
    if(local.blocked){audio.pause();P.updateStatus();return;}
    if(currentSong?.url!==item.url){
      local.applying=true;local.loading=true;local.error='';local.lastTrack=item.url;
      try{before.load(item,{autoplay:false,history:false});installMediaSession();}finally{local.applying=false;}
    }
    if(!Number.isFinite(audio.duration)||audio.readyState<1){P.updateStatus();return;}
    local.loading=false;
    const timing=C.correction(r,P.now(),audio.currentTime,audio.duration);
    const drift=Math.abs(audio.currentTime-timing.position);
    if(timing.seek||(force&&drift>.2)||(!r.playing&&drift>.05)){try{audio.currentTime=timing.position;}catch{}}
    audio.playbackRate=r.playing?timing.rate:1;
    if(!r.playing||!local.ready){audio.pause();}
    else if(timing.wait>0){audio.pause();local.timer=setTimeout(()=>sync(true),timing.wait);}
    else play();
    P.updateStatus();
  }
  function stateChanged(){
    if(local.id!==P.id||!P.active){reset();if(!P.active)return;}
    window.OMAudioSettings?.cancel();controls();sync(local.revision!==P.room.revision);local.revision=P.room.revision;window.renderQueue();
  }
  function enable(){
    if(!P.active)return;const item=song();if(!item)return omToast('Añade una canción a la cola para activar tu audio.');if(!window.OMSettings.allowed(item))return omToast(window.OMSettings.reason(item));
    local.ready=true;local.error='';sync(true);const generation=local.generation;
    // El gesto del botón desbloquea el audio aunque la party todavía esté en pausa.
    audio.play().then(()=>{if(generation!==local.generation||!P.active)return;sync(true);P.presence(true);P.updateStatus();}).catch(error=>{if(generation!==local.generation)return;local.ready=false;local.error=error.name==='NotAllowedError'?'El navegador bloqueó el audio. Pulsa otra vez para activarlo.':'No se pudo cargar esta canción. Prueba otra desde la party.';P.updateStatus();});
  }
  function control(action,options={}){
    if(!P.active)return;
    if(!P.isHost)return omToast('El anfitrión controla la canción, la pausa y los saltos.');
    if(!local.ready&&['play','select','jump','next','previous'].includes(action))enable();
    return window.omPartyCommand(action,options);
  }
  function installMediaSession(){if(!('mediaSession'in navigator))return;try{for(const [name,fn]of Object.entries({play:()=>P.active?control('play'):audio.play().catch(()=>{}),pause:()=>P.active?control('pause'):audio.pause(),nexttrack:()=>window.playNext(),previoustrack:()=>window.prevSong(),seekto:event=>P.active?control('seek',{position:event.seekTime}):(audio.currentTime=event.seekTime)}))navigator.mediaSession.setActionHandler(name,fn);}catch{}}
  window.loadSong=function(item,options={}){if(!P.active||local.applying||options.party)return before.load.apply(this,arguments);if(!item||item.type==='video')return omToast('Las parties reproducen canciones de audio.');if(!window.OMSettings.allowed(item))return omToast(window.OMSettings.reason(item));return P.isHost?control('select',{songUrl:item.url}):P.enqueue(item);};
  window.openVideo=function(){if(P.active)return omToast('Sal de la party para reproducir un video.');return before.video.apply(this,arguments);};
  window.playPause=function(){return P.active?control(P.room.playing?'pause':'play'):before.play.apply(this,arguments);};
  window.playNext=function(){return P.active?control('next'):before.next.apply(this,arguments);};
  window.prevSong=function(){return P.active?control('previous'):before.previous.apply(this,arguments);};
  window.handleSongEnd=function(){if(!P.active)return before.end.apply(this,arguments);if(P.isHost)control('next');else audio.pause();};
  window.addToQueue=function(item){return P.active?P.enqueue(item):before.queue.apply(this,arguments);};
  window.renderQueue=function(){if(!P.active)return before.renderQueue.apply(this,arguments);queueList.innerHTML=`<div class="om-queue-section-label">Cola de la party · ${esc(P.room.name)}</div>`+P.room.queue.map((url,index)=>{const item=songs.find(s=>s.url===url);return `<div class="om-queue-row">${img(item?.cover)}<span><strong>${esc(item?.title||'Canción no disponible')}</strong><small>${index===P.room.index?'Sonando · ':''}${esc(item?.artist||'')}</small></span>${P.isHost?`<button onclick="omPartyCommand('jump',{index:${index}})" aria-label="Reproducir en la party">${icon('play',16)}</button>`:''}</div>`;}).join('');};
  progress.onclick=event=>{if(!P.active)return before.seek?.(event);if(!P.isHost)return omToast('El anfitrión controla la posición de la canción.');if(!Number.isFinite(audio.duration))return;const rect=progress.getBoundingClientRect();control('seek',{position:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*audio.duration});};
  progress.onkeydown=event=>{if(!P.active)return before.key?.(event);if(['ArrowRight','ArrowLeft'].includes(event.key)){event.preventDefault();control('seek',{position:Math.max(0,C.target(P.room,P.now(),audio.duration)+(event.key==='ArrowRight'?5:-5))});}};
  lyricsContainer.addEventListener('click',event=>{if(!P.active)return;const line=event.target.closest('.lrc-line');if(!line)return;event.preventDefault();event.stopImmediatePropagation();const index=Number(line.id.replace('lrc-',''));if(Number.isInteger(index)&&currentLrcLines[index])control('seek',{position:currentLrcLines[index].time});},true);
  for(const event of ['loadedmetadata','canplay'])audio.addEventListener(event,()=>{if(P.active)sync(true);});
  audio.addEventListener('waiting',()=>{if(P.active){local.loading=true;P.updateStatus();}});
  audio.addEventListener('error',()=>{if(P.active){local.error='El archivo no está disponible en este dispositivo.';local.ready=false;P.updateStatus();}});
  audio.addEventListener('play',()=>{if(P.active&&(!P.connected||local.blocked||stale()))audio.pause();});
  window.addEventListener('omusic-party-state',stateChanged);
  window.addEventListener('omusic-settings-change',()=>{if(P.active)sync(true);});
  window.addEventListener('offline',()=>{if(P.active){audio.pause();P.updateStatus();}});window.addEventListener('online',()=>sync(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&P.active)sync(true);});
  setInterval(()=>{if(P.active)sync();},1000);
  setInterval(()=>{if(P.active&&P.connected&&P.isHost&&!local.loading&&(!P.room.playing||(local.ready&&P.now()>P.room.anchorMs+500))&&!local.error&&!local.blocked){P.command('heartbeat',{position:P.room.playing?audio.currentTime:C.target(P.room,P.now(),audio.duration),playing:P.room.playing&&!audio.paused}).catch(()=>{});}},15000);
  window.OMPartyPlayer={get ready(){return local.ready;},status,sync,enable};window.omPartyEnableAudio=enable;
})();
