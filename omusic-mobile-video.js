/* Video de teléfono: marco negro, controles de una mano y el mismo audio maestro. */
(() => {
  'use strict';
  const modal=$om('videoModal'),video=$om('videoPlayer');
  const phone=()=>matchMedia('(max-width: 768px), (max-height: 500px) and (pointer: coarse)').matches;
  const before={open:window.openVideo,minimize:window.minimizeVideo,restore:window.restoreVideo,close:window.closeVideo,load:window.loadSong,next:window.playNext,previous:window.prevSong,ended:window.playVideo_ended};
  const state={visible:false,url:'',focus:null,inert:[],queue:false,closing:0,orientation:false,scrubbing:false};
  const top=document.createElement('header');top.className='om-vm-top';
  top.innerHTML=`<button onclick="omMobileVideoMinimize()" aria-label="Minimizar video">${icon('chevron',23)}</button><div id="om-vm-avatars" class="om-vm-avatars"></div><span class="om-vm-label">VIDEOS</span><button id="om-vm-fullscreen" onclick="toggleFullscreenVideo()" aria-label="Pantalla completa">${icon('expand',21)}</button><button id="om-vm-pip" onclick="omMobileVideoPiP()" aria-label="Imagen en imagen">${icon('panel',21)}</button>`;
  const bottom=document.createElement('div');bottom.className='om-vm-bottom';
  bottom.innerHTML=`<div class="om-vm-track"><div><h1 id="om-vm-title"></h1><div id="om-vm-artists"></div></div><button id="om-vm-save" onclick="omLike(currentSong);OMMobileVideo.refresh()" aria-label="Guardar video">${icon('plus',27)}</button></div><div class="om-vm-progress"><input id="om-vm-progress" type="range" min="0" max="1000" step="1" value="0" aria-label="Posición del video" oninput="omMobileVideoScrub(this.value)" onchange="omMobileVideoSeek(this.value)"><div><span id="om-vm-current">0:00</span><span>VIDEO</span><span id="om-vm-duration">0:00</span></div></div><nav class="om-vm-transport" aria-label="Controles del video"><button id="om-vm-shuffle" onclick="toggleShuffle();OMMobileVideo.refresh()" aria-label="Aleatorio" aria-pressed="false">${icon('shuffle',25)}</button><button onclick="omMobileVideoStep(-1)" aria-label="Video anterior">${icon('prev',30)}</button><button id="om-vm-play" onclick="playPause()" aria-label="Reproducir video">${icon('play',39)}</button><button onclick="omMobileVideoStep(1)" aria-label="Siguiente video">${icon('next',30)}</button><button id="om-vm-repeat" onclick="toggleRepeat();OMMobileVideo.refresh()" aria-label="Repetir video" aria-pressed="false">${icon('repeat',25)}</button></nav><footer class="om-vm-footer"><button onclick="omMobileVideoQueue(true)" aria-label="Abrir cola de videos">${icon('queue',24)}</button><div><span>Reproduciendo desde</span><strong>Videos</strong></div><button onclick="omShareMusic('video',currentSong.url)" aria-label="Compartir video">${icon('share',22)}</button><button onclick="openOptions(currentSong)" aria-label="Más opciones del video">${icon('more',25)}</button></footer>`;
  const list=document.createElement('section');list.id='om-vm-queue';list.className='om-vm-queue';list.hidden=true;list.setAttribute('aria-label','Cola de videos');
  list.innerHTML=`<header><button onclick="omMobileVideoQueue(false)" aria-label="Volver al video">${icon('arrow',24)}</button><h2>Tu próxima reproducción</h2></header><div id="om-vm-queue-content"></div>`;
  modal.append(top,bottom,list);
  function fullscreen(){return modal.classList.contains('om-video-fullscreen');}
  function background(on){
    if(on){state.inert=[...document.querySelectorAll('.om-global-header,.sidebar,.main-content,#mainPlayer,#mobile-tab-bar')].map(node=>({node,value:node.inert}));state.inert.forEach(({node})=>node.inert=true);}
    else{state.inert.forEach(({node,value})=>node.inert=value);state.inert=[];}
  }
  function progressUI(){
    if(!state.visible||state.scrubbing)return;const length=Number.isFinite(audio.duration)?audio.duration:0,percent=length?Math.min(1000,audio.currentTime/length*1000):0;
    $om('om-vm-progress').value=percent;$om('om-vm-progress').style.setProperty('--om-vm-progress',(percent/10)+'%');$om('om-vm-current').textContent=formatTime(audio.currentTime||0);$om('om-vm-duration').textContent=formatTime(length);
  }
  function refresh(){
    const visible=!!activeVideo&&phone()&&modal.style.display!=='none';
    document.body.classList.toggle('om-phone-video-open',visible);
    if(visible!==state.visible){
      if(visible){state.focus=document.activeElement;background(true);modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Reproductor de videos');top.querySelector('button')?.focus();window.OMMotion?.enter(modal,'sheet');}
      else{background(false);modal.removeAttribute('role');modal.removeAttribute('aria-modal');if(modal.contains(document.activeElement)&&state.focus?.isConnected)state.focus.focus();}
      state.visible=visible;
    }
    if(!visible){state.queue=false;state.scrubbing=false;list.hidden=true;return;}
    if(state.url!==activeVideo.url){
      const changing=!!state.url;state.url=activeVideo.url;state.scrubbing=false;
      $om('om-vm-title').textContent=activeVideo.title;$om('om-vm-artists').innerHTML=omArtistLinks(activeVideo.artist);
      const names=String(activeVideo.artist||'').split(',').map(name=>name.trim()).filter(Boolean);
      $om('om-vm-avatars').innerHTML=names.slice(0,3).map(name=>`<button onclick="omMobileVideoArtist(${esc(JSON.stringify(name))})" aria-label="Ver perfil de ${esc(name)}">${img(artistPhotoOM(name)||activeVideo.cover,name)}</button>`).join('')+(names.length>3?`<span>+${names.length-3}</span>`:'');
      video.poster=activeVideo.cover||'';video.setAttribute('aria-label',activeVideo.title);
      if(changing)window.OMMotion?.enter(video);
    }
    const playing=!audio.paused;$om('om-vm-play').innerHTML=icon(playing?'pause':'play',39);$om('om-vm-play').setAttribute('aria-label',playing?'Pausar video':'Reproducir video');
    const saved=OM.liked.has(activeVideo.url);$om('om-vm-save').innerHTML=icon(saved?'check':'plus',27);$om('om-vm-save').setAttribute('aria-pressed',String(saved));$om('om-vm-save').setAttribute('aria-label',saved?'Quitar video de Tus me gusta':'Guardar video');
    for(const [id,on]of [['shuffle',shuffleActive],['repeat',repeatActive]]){$om('om-vm-'+id).setAttribute('aria-pressed',String(on));}
    const full=fullscreen();$om('om-vm-fullscreen').innerHTML=icon(full?'collapse':'expand',21);$om('om-vm-fullscreen').setAttribute('aria-label',full?'Salir de pantalla completa':'Pantalla completa');$om('om-vm-fullscreen').setAttribute('aria-pressed',String(full));
    $om('om-vm-pip').hidden=window.OMAndroid?!window.OMAndroid.pipEnabled:!document.pictureInPictureEnabled||!video.requestPictureInPicture;
    top.inert=state.queue;bottom.inert=state.queue;video.inert=state.queue;list.hidden=!state.queue;
    progressUI();
  }
  function minimize(animated=true){
    if(!activeVideo)return;const ticket=++state.closing;
    const finish=()=>{if(ticket!==state.closing)return;before.minimize();refresh();};
    if(animated&&state.visible&&window.OMMotion)window.OMMotion.leave(modal,'sheet',finish);else finish();
  }
  function step(delta,automatic=false){
    if(!activeVideo)return;window.OMMotion?.setDirection(delta);
    if(delta<0&&audio.currentTime>3){audio.currentTime=0;return;}
    if(delta>0&&queue.length){let index=queue.findIndex(item=>window.OMSettings.allowed(item));if(index>=0){const item=queue.splice(index,1)[0];renderQueue();state.queue=false;window.loadSong(item);return;}}
    if(automatic&&!window.OMSettings.prefs.autoplay)return;
    const available=videos.filter(item=>window.OMSettings.allowed({...item,type:'video'}));if(!available.length)return omToast('No hay más videos disponibles.');
    const current=available.findIndex(item=>item.url===activeVideo.url);let index=(current+delta+available.length)%available.length;
    if(shuffleActive&&available.length>1){const others=available.filter(item=>item.url!==activeVideo.url);const item=others[Math.floor(Math.random()*others.length)];index=available.indexOf(item);}
    state.queue=false;window.openVideo(available[index].url,available[index]);
  }
  function scrub(value){state.scrubbing=true;const percent=Math.max(0,Math.min(1000,Number(value)||0));$om('om-vm-progress').style.setProperty('--om-vm-progress',percent/10+'%');$om('om-vm-current').textContent=formatTime((Number.isFinite(audio.duration)?audio.duration:0)*percent/1000);}
  function seek(value){state.scrubbing=false;if(Number.isFinite(audio.duration)&&audio.duration>0){audio.currentTime=audio.duration*Math.max(0,Math.min(1000,Number(value)||0))/1000;try{video.currentTime=audio.currentTime;}catch{}}progressUI();}
  function row(item,action,extra=''){return `<div class="om-vm-queue-row"><button onclick="${action}">${img(item.cover,item.title)}<span><strong>${esc(item.title)}</strong><small>${esc(item.artist||'OMUSIC')}</small></span>${icon('play',18)}</button>${extra}</div>`;}
  function queueView(open){
    state.queue=!!open;refresh();if(!open){bottom.querySelector('button')?.focus();return;}
    const queued=new Set(queue.map(item=>item.url));
    const upcoming=queue.map((item,index)=>row(item,`omMobileVideoQueuePlay(${index})`,`<button onclick="removeFromQueue(${index});omMobileVideoQueue(true)" aria-label="Quitar ${esc(item.title)} de la cola">${icon('close',19)}</button>`)).join('');
    const suggested=videos.filter(item=>item.url!==activeVideo?.url&&!queued.has(item.url)&&window.OMSettings.allowed({...item,type:'video'})).slice(0,12);
    $om('om-vm-queue-content').innerHTML=`<h3>Reproduciendo ahora</h3>${activeVideo?row(activeVideo,'omMobileVideoQueue(false)'):''}<h3>A continuación</h3>${upcoming||'<p>Añade videos desde las opciones de cada video.</p>'}<h3>Más videos para ti</h3>${suggested.map(item=>row(item,`omMobileVideoQueue(false);playVideo(${videos.indexOf(item)})`,`<button onclick="omQueueVideo(${videos.indexOf(item)});omMobileVideoQueue(true)" aria-label="Añadir ${esc(item.title)} a la cola">${icon('plus',21)}</button>`)).join('')}`;
    window.OMMotion?.enter(list,'side');list.querySelector('button')?.focus();
  }
  async function pip(){if(window.OMAndroid){if(!window.OMAndroid.pip())omToast('Imagen en imagen no está disponible en este dispositivo.');return;}try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else await video.requestPictureInPicture();}catch{omToast('Imagen en imagen no está disponible en este navegador.');}}
  for(const name of ['open','restore','close','load']){const global={open:'openVideo',restore:'restoreVideo',close:'closeVideo',load:'loadSong'}[name];window[global]=function(){++state.closing;window.OMMotion?.cancel(modal);const result=before[name].apply(this,arguments);refresh();return result;};}
  window.minimizeVideo=()=>minimize(false);
  window.playNext=function(){return phone()&&activeVideo?step(1):before.next.apply(this,arguments);};
  window.prevSong=function(){return phone()&&activeVideo?step(-1):before.previous.apply(this,arguments);};
  window.playVideo_ended=function(){if(!phone()||!activeVideo)return before.ended.apply(this,arguments);if(repeatActive){audio.currentTime=0;return audio.play().catch(()=>{});}return step(1,true);};
  Object.assign(window,{OMMobileVideo:{refresh,get visible(){return state.visible;},step},omMobileVideoStep:step,omMobileVideoMinimize:()=>minimize(true),omMobileVideoScrub:scrub,omMobileVideoSeek:seek,omMobileVideoQueue:queueView,omMobileVideoPiP:pip,omMobileVideoQueuePlay:index=>{state.queue=false;omPlayQueued(index);refresh();},omMobileVideoArtist:name=>{minimize(false);omOpenArtist(name);}});
  for(const name of ['play','pause','loadedmetadata','ended','emptied'])audio.addEventListener(name,refresh);audio.addEventListener('timeupdate',progressUI);
  window.addEventListener('resize',()=>{refresh();window.OMVideoChrome?.refresh();});window.addEventListener('omusic-settings-change',refresh);
  for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{
    refresh();const native=document.fullscreenElement||document.webkitFullscreenElement;
    if(native&&modal.contains(native)&&phone()&&screen.orientation?.lock){state.orientation=true;try{Promise.resolve(screen.orientation.lock('landscape')).catch(()=>{});}catch{}}
    else if(!native&&state.orientation){state.orientation=false;screen.orientation?.unlock?.();}
  });
  document.addEventListener('keydown',event=>{
    if(!state.visible||!$om('om-dialog-backdrop').hidden||$om('optionsModal').style.display==='block')return;
    if(event.key==='Escape'&&!fullscreen()){event.preventDefault();state.queue?queueView(false):minimize(true);}
    if(event.key==='Tab'){
      const buttons=[...modal.querySelectorAll('button,input')].filter(el=>!el.disabled&&!el.closest('[inert]')&&el.getClientRects().length),first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  });
  modal.addEventListener('click',event=>{if(event.target.closest('.om-artist-link'))minimize(false);});
  window.addEventListener('omusic-motion-ready',()=>{
    window.OMMotion.bindGestures(video,{horizontal:true,dismiss:true,onNext:()=>step(1),onPrevious:()=>step(-1),onDismiss:()=>minimize(true)});
    window.OMMotion.bindGestures(top,{dismiss:true,onDismiss:()=>minimize(true)});
  },{once:true});
  refresh();
})();
