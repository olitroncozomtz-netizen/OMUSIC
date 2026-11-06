/* Reproductor de teléfono: portada, letras y cola, usando el mismo audio de OMUSIC. */
(() => {
  'use strict';
  const mobile=()=>window.matchMedia('(max-width: 768px)').matches;
  const isVideo=()=>currentSong?.type==='video'||(typeof activeVideo!=='undefined'&&activeVideo);
  const S={open:false,tab:'cover',controlsHidden:false,queueOpen:false,queueTab:'queue',focus:null,mount:null,inert:[],last:'',coverTicket:0,drag:null,scrubbing:false,sharedTicket:0};
  const before={open:window.openMobPlayerModal,close:window.closeMobPlayerModal,immersive:window.omOpenImmersive,lyrics:window.toggleLyricsView,video:window.openVideo,load:window.loadSong,queue:window.toggleQueue,renderQueue:window.renderQueue,shared:window.omOpenSharedRoute};
  const root=document.createElement('section');root.id='om-mobile-player';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Reproductor de OMUSIC');
  root.innerHTML=`<div class="om-mp-background" aria-hidden="true"></div><div class="om-mp-shell"><header class="om-mp-topbar"><button id="om-mp-close" class="om-mp-close" onclick="omMobilePlayerClose()" aria-label="Cerrar reproductor">${icon('chevron',23)}</button><button id="om-mp-artist-button" class="om-mp-artist" onclick="omMobileArtist()" aria-label="Ver artista"><img id="om-mp-artist-photo" alt=""></button><img id="om-mp-mini-cover" alt="Portada de la canción"><div class="om-mp-top-actions"><button id="om-mp-lyrics-button" class="om-mp-lyrics-toggle" onclick="omMobileLyricsToggle()" aria-pressed="false">Letras</button><button id="om-mp-controls-toggle" onclick="omMobileControlsToggle()" aria-label="Ocultar controles" aria-pressed="false">${icon('panel',22)}</button></div></header><main class="om-mp-stage"><div id="om-mp-art" class="om-mp-art"><img id="om-mp-cover" alt="Portada"><video id="om-mp-cover-video" muted playsinline loop preload="metadata" hidden></video></div><div id="om-mp-lyrics" class="om-mp-lyrics" hidden></div></main><div class="om-mp-bottom"><div class="om-mp-track"><div><h1 id="om-mp-title"></h1><div id="om-mp-artists"></div></div><button id="om-mp-save" onclick="omLike(currentSong);omMobilePlayerRefresh()" aria-label="Guardar canción" aria-pressed="false">${icon('plus',28)}</button></div><div class="om-mp-progress"><input id="om-mp-progress" type="range" min="0" max="1000" step="1" value="0" aria-label="Posición de la canción" oninput="omMobileScrub(this.value)" onchange="omMobileSeek(this.value)"><div><span id="om-mp-current">0:00</span><span id="om-mp-source">OMUSIC</span><span id="om-mp-duration">0:00</span></div></div><nav class="om-mp-transport" aria-label="Controles de reproducción"><button id="om-mp-shuffle" onclick="toggleShuffle();omMobilePlayerRefresh()" aria-label="Aleatorio" aria-pressed="false">${icon('shuffle',25)}</button><button onclick="prevSong()" aria-label="Canción anterior">${icon('prev',32)}</button><button id="om-mp-play" onclick="playPause()" aria-label="Reproducir">${icon('play',40)}</button><button onclick="playNext()" aria-label="Siguiente canción">${icon('next',32)}</button><button id="om-mp-repeat" onclick="toggleRepeat();omMobilePlayerRefresh()" aria-label="Repetir canción" aria-pressed="false">${icon('repeat',25)}</button></nav><footer class="om-mp-footer"><button onclick="omMobileQueueOpen()" aria-label="Abrir cola de reproducción">${icon('queue',25)}</button><div><span id="om-mp-context-label">Reproduciendo desde</span><strong id="om-mp-context"></strong></div><button onclick="omMobileShareSong()" aria-label="Compartir canción">${icon('share',23)}</button><button onclick="currentSong&&openOptions(currentSong)" aria-label="Más opciones de la canción">${icon('more',25)}</button></footer></div></div><section id="om-mobile-queue" class="om-mobile-queue" hidden aria-label="Cola de reproducción"><header><button onclick="omMobileQueueClose()" aria-label="Volver al reproductor">${icon('arrow',25)}</button><span>Tu música, a tu ritmo.</span></header><nav aria-label="Pestañas de la cola"><button data-mq-tab="queue" class="active" onclick="omMobileQueueTab('queue')">Reproducir cola</button><button data-mq-tab="suggestions" onclick="omMobileQueueTab('suggestions')">Canciones sugeridas</button></nav><div id="om-mobile-queue-content"></div></section>`;
  document.body.append(root);
  function setInert(on){
    if(on){S.inert=[...document.querySelectorAll('.om-global-header,.sidebar,.main-content,#mainPlayer,#mobile-tab-bar')].map(node=>({node,value:node.inert}));S.inert.forEach(({node})=>node.inert=true);}
    else{S.inert.forEach(({node,value})=>node.inert=value);S.inert=[];}
  }
  function open(tab='cover'){
    if(!currentSong)return omToast('Elige una canción para empezar.');if(isVideo())return before.open();
    window.OMMotion?.cancel(root);
    const opening=!S.open;
    if(!S.open){
      window.omCloseImmersive();S.open=true;S.focus=document.activeElement;S.last='';S.controlsHidden=false;
      const marker=document.createComment('om-mobile-lyrics');lyricsContainer.before(marker);S.mount=marker;$om('om-mp-lyrics').append(lyricsContainer);
      root.hidden=false;document.body.classList.add('om-mobile-player-open');setInert(true);$om('om-mp-close').focus();
    }
    S.tab=tab==='lyrics'?'lyrics':'cover';S.queueOpen=false;render();if(opening)window.OMMotion?.enter(root,'sheet');
  }
  function close(animated=false){
    if(!S.open)return;window.OMMotion?.cancel(root);
    const finish=()=>{S.open=false;S.queueOpen=false;window.OMMobileLyrics?.stop();$om('om-mp-cover-video').pause();if(S.mount){S.mount.replaceWith(lyricsContainer);S.mount=null;}root.hidden=true;document.body.classList.remove('om-mobile-player-open');setInert(false);S.focus?.focus();};
    if(animated&&window.OMMotion)window.OMMotion.leave(root,'sheet',finish);else finish();
  }
  function palette(item){
    if(window.OMAppearance){window.OMAppearance.follow(item);return;}
    const ticket=++S.coverTicket;
    const cached=window.OMCoverPalette.get(item?.cover);
    window.OMCoverPalette.apply(root,cached||window.OMCoverPalette.fromRgb([52,68,59]));
    if(cached)return;
    if(!item?.cover)return;const image=new Image();image.crossOrigin='anonymous';
    image.onload=()=>{if(ticket!==S.coverTicket)return;try{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,32,32);const rgb=window.OMCoverPalette.dominant(ctx.getImageData(0,0,32,32).data);window.OMCoverPalette.apply(root,window.OMCoverPalette.fromRgb(rgb));}catch{}};
    image.src=item.cover;
  }
  function render(){
    if(!S.open||!currentSong)return;const item=currentSong,changed=S.last!==item.url;root.dataset.tab=S.tab;root.classList.toggle('om-mp-controls-hidden',S.controlsHidden);root.querySelector('.om-mp-shell').inert=S.queueOpen;$om('om-mp-lyrics').hidden=S.tab!=='lyrics';$om('om-mp-art').hidden=S.tab==='lyrics';$om('om-mobile-queue').hidden=!S.queueOpen;
    $om('om-mp-title').textContent=item.title;$om('om-mp-artists').innerHTML=omArtistLinks(item.artist);$om('om-mp-lyrics-button').setAttribute('aria-pressed',String(S.tab==='lyrics'));
    $om('om-mp-controls-toggle').setAttribute('aria-label',S.controlsHidden?'Mostrar controles':'Ocultar controles');$om('om-mp-controls-toggle').setAttribute('aria-pressed',String(S.controlsHidden));
    $om('om-mp-lyrics-button').classList.toggle('active',S.tab==='lyrics');
    $om('om-mp-play').innerHTML=icon(audio.paused?'play':'pause',40);$om('om-mp-play').setAttribute('aria-label',audio.paused?'Reproducir':'Pausar');
    const saved=OM.liked.has(item.url);$om('om-mp-save').innerHTML=icon(saved?'check':'plus',28);$om('om-mp-save').setAttribute('aria-label',saved?'Quitar de Tus me gusta':'Guardar en Tus me gusta');$om('om-mp-save').setAttribute('aria-pressed',String(saved));
    for(const [id,on]of [['shuffle',shuffleActive],['repeat',repeatActive]]){const button=$om('om-mp-'+id);button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));button.disabled=window.OMParty?.active;}
    $om('om-mp-context').textContent=window.OMParty?.active?window.OMParty.room.name:(currentAlbumContext&&item.album?item.album:'Tu biblioteca');$om('om-mp-context-label').textContent=window.OMParty?.active?'Escuchando juntos':'Reproduciendo desde';
    $om('om-mp-source').textContent=window.OMParty?.active?'PARTY':'OMUSIC';
    if(changed){
      const oldCover=S.last?$om('om-mp-cover').src:null;
      S.last=item.url;for(const id of ['om-mp-cover','om-mp-mini-cover']){$om(id).src=item.cover||'placeholder.svg';$om(id).alt=item.title;}
      $om('om-mp-artist-photo').src=artistPhotoOM(item.artist.split(',')[0].trim())||item.cover||'placeholder.svg';
      const video=$om('om-mp-cover-video');video.pause();video.removeAttribute('src');video.hidden=true;
      if(item.coverVideo){video.src=item.coverVideo;video.poster=item.cover;video.hidden=false;if(!audio.paused)video.play().catch(()=>{video.hidden=true;});}
      palette(item);
      if(oldCover)window.OMMotion?.track(root,oldCover);
    }
    if(S.tab==='cover'&&!audio.paused){const video=$om('om-mp-cover-video');if(!video.hidden)video.play().catch(()=>{video.hidden=true;});}else $om('om-mp-cover-video').pause();
    updateTime();if(S.queueOpen)renderQueue();window.OMMobileLyrics?.visibility();if(S.tab==='lyrics')requestAnimationFrame(centerLyrics);
  }
  function centerLyrics(){
    if(!S.open||S.tab!=='lyrics')return;
    if(window.OMMobileLyrics?.center())return;
    lyricsContainer.querySelectorAll('.lrc-line').forEach(line=>line.classList.toggle('om-lrc-meta',/^\s*(作词|作曲|编曲|词曲|lyrics\s*by|written\s*by|compos(?:er|ed)\s*:)/i.test(line.textContent)));
    if(typeof updateLyricsSync==='function')updateLyricsSync(audio.currentTime);
    const active=lyricsContainer.querySelector('.lrc-line.active:not(.om-lrc-meta)')||lyricsContainer.querySelector('.lrc-line:not(.om-lrc-meta)');
    if(active)lyricsContainer.scrollTo({top:Math.max(0,active.offsetTop-lyricsContainer.clientHeight*.25),behavior:'auto'});
  }
  function lyricsToggle(){const update=()=>{S.tab=S.tab==='lyrics'?'cover':'lyrics';if(S.tab==='cover')S.controlsHidden=false;render();};window.OMMotion?window.OMMotion.layout(root,update):update();}
  function controlsToggle(){if(S.tab!=='lyrics')S.tab='lyrics';S.controlsHidden=!S.controlsHidden;render();}
  function updateTime(){
    if(!S.open||S.scrubbing)return;const duration=Number.isFinite(audio.duration)?audio.duration:omDurationSeconds(currentSong)||0;const percent=duration?Math.min(1000,audio.currentTime/duration*1000):0;
    $om('om-mp-progress').value=percent;$om('om-mp-progress').style.setProperty('--om-mp-progress',(percent/10)+'%');$om('om-mp-current').textContent=formatTime(audio.currentTime||0);$om('om-mp-duration').textContent=formatTime(duration);
  }
  function scrub(value){S.scrubbing=true;const duration=Number.isFinite(audio.duration)?audio.duration:omDurationSeconds(currentSong)||0;$om('om-mp-progress').style.setProperty('--om-mp-progress',(Number(value)/10)+'%');$om('om-mp-current').textContent=formatTime(duration*Number(value)/1000);}
  function seek(value){S.scrubbing=false;if(!Number.isFinite(audio.duration))return;const position=Math.max(0,Math.min(1000,Number(value)))/1000*audio.duration;if(window.OMParty?.active){if(window.OMParty.isHost)omPartyCommand('seek',{position});else omToast('El anfitrión controla la posición de la canción.');}else audio.currentTime=position;updateTime();}
  function queueItems(){return window.OMParty?.active?window.OMParty.room.queue.map((url,index)=>({item:songs.find(s=>s.url===url),index,current:index===window.OMParty.room.index})):queue.map((item,index)=>({item,index,current:false}));}
  function suggested(){
    const queued=new Set(queueItems().map(x=>x.item?.url)),names=String(currentSong?.artist||'').split(',').map(x=>x.trim());
    return songs.filter(s=>s.url&&s.url!==currentSong?.url&&!queued.has(s.url)&&window.OMSettings.allowed(s)).sort((a,b)=>score(b)-score(a)).slice(0,20);
    function score(s){return (names.some(name=>omArtistMatches(s,name))?100:0)+Math.min(15,OM.listens[s.url]||0);}
  }
  function queueRow(item,index,options={}){
    if(!item)return '';const canMove=!window.OMParty?.active||window.OMParty.isHost;
    return `<div class="om-mq-row ${options.current?'is-current':''}" ${options.suggested?'':`data-mq-index="${index}"`}><button class="om-mq-track" onclick="${options.suggested?`omMobileSuggestedPlay(${songs.indexOf(item)})`:`omMobileQueuePlay(${index})`}">${img(item.cover,item.title)}<span><strong>${esc(item.title)}</strong><small>${esc(item.artist)}</small></span></button>${options.suggested?`<button onclick="addToQueue(songs[${songs.indexOf(item)}]);omMobileQueueRefresh()" aria-label="Añadir ${esc(item.title)} a la cola">${icon('plus',24)}</button>`:`<button class="om-mq-options" onclick="omMobileQueueOptions(${index})" aria-label="Opciones de ${esc(item.title)} en la cola">${icon('more',19)}</button>${canMove?`<button class="om-mq-drag" data-mq-handle="${index}" aria-label="Mover ${esc(item.title)}. Usa los botones de opciones para cambiar el orden." title="Mantén y arrastra para mover">${icon('list',23)}</button>`:''}`}</div>`;
  }
  function renderQueue(){
    if(!S.open||!S.queueOpen)return;const el=$om('om-mobile-queue-content');document.querySelectorAll('[data-mq-tab]').forEach(b=>{const on=b.dataset.mqTab===S.queueTab;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    if(S.queueTab==='suggestions'){el.innerHTML=`<h2>Una más para tu momento</h2><p class="om-mq-hint">Canciones relacionadas con lo que estás escuchando.</p>${suggested().map((s,i)=>queueRow(s,i,{suggested:true})).join('')}`;return;}
    const items=queueItems();el.innerHTML=`<h2>Reproduciendo actualmente</h2><div class="om-mq-current">${currentSong?img(currentSong.cover,currentSong.title):''}<div><strong>${esc(currentSong?.title||'Elige una canción')}</strong><small>${esc(currentSong?.artist||'')}</small></div></div><div class="om-mq-heading"><h2>${window.OMParty?.active?'La cola de todos':'Tu cola de reproducción'}</h2><button onclick="omMobileQueueMenu()" aria-label="Opciones de la cola">${icon('more',24)}</button></div>${items.length?items.map(x=>queueRow(x.item,x.index,{current:x.current})).join(''):'<div class="om-mq-empty"><p>Tu siguiente canción aún está por llegar.</p><button onclick="omMobileQueueTab(\'suggestions\')">Explorar canciones sugeridas</button></div>'}`;
  }
  function queueOpen(){if(!S.open)open();if(!S.open)return;S.queueOpen=true;S.queueTab='queue';root.querySelector('.om-mp-shell').inert=true;$om('om-mobile-queue').hidden=false;window.OMMobileLyrics?.visibility();renderQueue();window.OMMotion?.enter($om('om-mobile-queue'),'side');$om('om-mobile-queue').querySelector('button')?.focus();}
  function queueClose(){S.queueOpen=false;root.querySelector('.om-mp-shell').inert=false;$om('om-mobile-queue').hidden=true;window.OMMobileLyrics?.visibility();}
  function queueTab(tab){S.queueTab=tab==='suggestions'?'suggestions':'queue';renderQueue();}
  function queuePlay(index){if(window.OMParty?.active){if(window.OMParty.isHost)omPartyCommand('jump',{index});else omToast('Solo el anfitrión cambia la canción.');}else omPlayQueued(index);renderQueue();}
  function move(from,to){if(window.OMParty?.active){if(window.OMParty.isHost)omPartyCommand('move',{from,to});return;}if(!queue[from]||!queue[to])return;const item=queue.splice(from,1)[0];queue.splice(to,0,item);window.renderQueue();renderQueue();}
  function remove(index){if(window.OMParty?.active)omPartyCommand('remove',{index});else removeFromQueue(index);omCloseDialog();renderQueue();}
  function queueOptions(index){
    const items=queueItems(),row=items.find(x=>x.index===index);if(!row?.item)return;if(window.OMParty?.active&&!window.OMParty.isHost)return omToast('El anfitrión organiza la cola de la party.');
    omShowDialog(`<h2 id="om-dialog-title">${esc(row.item.title)}</h2><p>Organiza tu próxima escucha.</p><div class="om-mq-dialog-actions">${index>0?`<button onclick="omMobileQueueMove(${index},${index-1});omCloseDialog()">${icon('arrow',17)} Subir</button>`:''}${index<items.length-1?`<button onclick="omMobileQueueMove(${index},${index+1});omCloseDialog()">${icon('arrow',17)} Bajar</button>`:''}${!row.current?`<button onclick="omMobileQueueRemove(${index})">${icon('close',17)} Quitar de la cola</button>`:''}</div>`);
  }
  function queueMenu(){if(window.OMParty?.active&&!window.OMParty.isHost)return omToast('El anfitrión organiza la cola de la party.');omShowDialog(`<h2 id="om-dialog-title">Tu cola de reproducción</h2><p>${window.OMParty?.active?'Se conservará la canción actual y se quitarán las demás.':'Quitar las canciones pendientes no detiene la canción actual.'}</p><button class="om-button-outline" onclick="omMobileQueueClear()">Vaciar canciones pendientes</button>`);}
  function clear(){if(window.OMParty?.active)omPartyCommand('clear');else{queue.length=0;window.renderQueue();}omCloseDialog();renderQueue();}
  async function share(){if(currentSong)return window.OMMusicShare.share('song',currentSong.url);}
  function sharedTrack(url,push=true){const item=songs.find(s=>s.url===url);if(!item)return false;omDetailView('track',item.title,'COMPARTIDA CONTIGO',push,url);OM.activeList=[item];omRenderTracks([item]);return true;}
  function sharedRoute(){const url=new URLSearchParams(location.hash.slice(1)).get('track');return url?sharedTrack(url):before.shared.apply(this,arguments);}
  function artist(){const name=currentSong?.artist.split(',')[0].trim();if(!name)return;close();omOpenArtist(name);}
  root.addEventListener('pointerdown',event=>{const handle=event.target.closest('[data-mq-handle]');if(!handle)return;S.drag={index:Number(handle.dataset.mqHandle),target:Number(handle.dataset.mqHandle),x:event.clientX,y:event.clientY,moved:false};handle.setPointerCapture(event.pointerId);});
  root.addEventListener('pointermove',event=>{if(!S.drag)return;if(Math.abs(event.clientY-S.drag.y)>8){S.drag.moved=true;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-mq-index]');if(target){S.drag.target=Number(target.dataset.mqIndex);root.querySelectorAll('.om-mq-drop').forEach(el=>el.classList.remove('om-mq-drop'));target.classList.add('om-mq-drop');}}});
  root.addEventListener('pointerup',()=>{if(!S.drag)return;const {index,target,moved}=S.drag;S.drag=null;root.querySelectorAll('.om-mq-drop').forEach(el=>el.classList.remove('om-mq-drop'));if(moved&&index!==target)move(index,target);});
  root.addEventListener('pointercancel',()=>{S.drag=null;root.querySelectorAll('.om-mq-drop').forEach(el=>el.classList.remove('om-mq-drop'));});
  $om('om-mp-cover-video').addEventListener('error',()=>{$om('om-mp-cover-video').hidden=true;});
  root.addEventListener('click',event=>{if(event.target.closest('.om-artist-link'))close();});
  document.addEventListener('keydown',event=>{if(!S.open)return;if(event.key==='Escape'){if(!$om('om-dialog-backdrop').hidden||$om('optionsModal').style.display==='block')return;event.preventDefault();event.stopImmediatePropagation();S.queueOpen?queueClose():close();}if(event.key==='Tab'&&$om('om-dialog-backdrop').hidden){const controls=[...root.querySelectorAll('button,input,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&!el.closest('[inert]')&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}},true);
  window.addEventListener('resize',()=>{if(S.open&&!mobile())close();});
  for(const event of ['play','pause','loadedmetadata','ended'])audio.addEventListener(event,render);audio.addEventListener('timeupdate',updateTime);
  window.addEventListener('omusic-party-state',render);
  Object.assign(window,{OMMobilePlayer:{get open(){return S.open;},get queueOpen(){return S.queueOpen;},get tab(){return S.tab;},get controlsHidden(){return S.controlsHidden;},open,close,render,move,suggested},omMobilePlayerOpen:open,omMobilePlayerClose:()=>close(true),omMobilePlayerRefresh:render,omMobileLyricsToggle:lyricsToggle,omMobileControlsToggle:controlsToggle,omMobileScrub:scrub,omMobileSeek:seek,omMobileQueueOpen:queueOpen,omMobileQueueClose:queueClose,omMobileQueueTab:queueTab,omMobileQueueRefresh:renderQueue,omMobileQueuePlay:queuePlay,omMobileQueueMove:move,omMobileQueueRemove:remove,omMobileQueueOptions:queueOptions,omMobileQueueMenu:queueMenu,omMobileQueueClear:clear,omMobileShareSong:share,omMobileArtist:artist,omMobileSuggestedPlay:index=>loadSong(songs[index]),omOpenSharedTrack:sharedTrack});
  window.openMobPlayerModal=function(){return mobile()?(S.open?close(true):open()):before.open.apply(this,arguments);};
  window.closeMobPlayerModal=function(){return S.open?close():before.close.apply(this,arguments);};
  window.omOpenImmersive=function(tab,fullscreen){return mobile()&&!isVideo()?open(tab==='lyrics'?'lyrics':'cover'):before.immersive.apply(this,arguments);};
  window.toggleLyricsView=function(){if(!mobile()||isVideo())return before.lyrics.apply(this,arguments);if(S.open)lyricsToggle();else open('lyrics');};
  window.openVideo=function(){if(S.open)close();return before.video.apply(this,arguments);};
  window.loadSong=function(item){const result=before.load.apply(this,arguments);if(S.open)render();return result;};
  window.toggleQueue=function(){return mobile()?queueOpen():before.queue.apply(this,arguments);};
  window.renderQueue=function(){const result=before.renderQueue.apply(this,arguments);renderQueue();return result;};
  const artistCredit=window.omOpenArtistCredit;window.omOpenArtistCredit=function(){if(S.open)close();return artistCredit.apply(this,arguments);};
  const renderLyrics=window.renderLyricsToContainer;window.renderLyricsToContainer=function(){const result=renderLyrics.apply(this,arguments);if(S.open&&S.tab==='lyrics')requestAnimationFrame(centerLyrics);return result;};
  window.omOpenSharedRoute=sharedRoute;window.addEventListener('hashchange',()=>{const url=new URLSearchParams(location.hash.slice(1)).get('track');if(url)sharedTrack(url);});
  const sharedUrl=new URLSearchParams(location.hash.slice(1)).get('track');if(sharedUrl)sharedTrack(sharedUrl,false);
  window.addEventListener('omusic-motion-ready',()=>{
    window.OMMotion.bindGestures(root.querySelector('.om-mp-stage'),{horizontal:true,dismiss:true,onNext:()=>playNext(),onPrevious:()=>prevSong(),onDismiss:()=>close(true)});
    window.OMMotion.bindGestures(root.querySelector('.om-mp-topbar'),{dismiss:true,onDismiss:()=>close(true)});
  },{once:true});
})();
