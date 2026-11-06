/* Reproductor ampliado: una portada, las letras originales y el mismo audio. */
(() => {
  'use strict';
  const root=$om('om-immersive'), panel=$om('om-im-panel');
  const state={open:false,tab:'cover',mounts:[],lastTrack:null,request:0,wantsNative:false,focus:null};
  const previousPlayer=window.openMobPlayerModal, previousLoad=window.loadSong, previousVideo=window.openVideo;
  const previousLyricsLoad=window.loadLyrics;
  const native=()=>[document.fullscreenElement,document.webkitFullscreenElement].includes(root);
  const mediaFormat=s=>{const ext=(s?.url||'').split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toUpperCase();return ['FLAC','MP3','M4A','AAC','WAV','OGG','OPUS','MP4','WEBM'].includes(ext)?ext:'AUDIO';};
  const isVideo=()=>!!activeVideo||currentSong?.type==='video';

  function mount(node,parent){
    if(!node||!parent)return;
    const marker=document.createComment('omusic-player-home');node.before(marker);parent.append(node);state.mounts.push({node,marker});
  }
  function restore(){for(const {node,marker} of state.mounts.reverse())marker.replaceWith(node);state.mounts=[];}
  function inertBackground(value){for(const selector of ['.om-global-header','.container','#mobile-tab-bar','#om-now-panel']){const node=document.querySelector(selector);if(node)node.inert=value;}}
  function refreshArtwork(){
    if(!state.open||!currentSong)return;
    const changed=state.lastTrack!==currentSong.url;
    if(changed){
      state.lastTrack=currentSong.url;
      $om('lyrics-cover-big').src=currentSong.cover||'placeholder.svg';
      $om('lyrics-cover-big').alt=currentSong.title;
      renderSimilar();renderCredits();
    }
    const cv=$om('lyrics-cover-video'), image=$om('lyrics-cover-big');
    const animation=currentSong.coverVideo||'';
    if(animation&&cv.getAttribute('src')!==animation)cv.src=animation;
    else if(!animation&&cv.getAttribute('src')){cv.pause();cv.removeAttribute('src');cv.load();}
    cv.poster=currentSong.cover||'placeholder.svg';
    const ready=!!animation&&cv.readyState>=2&&!cv.error;
    cv.classList.toggle('lyrics-cover-video-hidden',!ready);
    image.classList.toggle('lyrics-cover-img-hidden',ready);
    if(!animation||cv.error||audio.paused)cv.pause();
    else if(cv.paused)Promise.resolve(cv.play()).then(()=>{
      if(cv.getAttribute('src')===animation&&(!state.open||audio.paused))cv.pause();
    }).catch(()=>{
      if(state.open&&cv.getAttribute('src')===animation){
        cv.classList.add('lyrics-cover-video-hidden');image.classList.remove('lyrics-cover-img-hidden');
      }
    });
    $om('om-im-more').setAttribute('aria-label','Opciones de '+currentSong.title);
  }
  function centerLyrics(){
    if(!state.open||state.tab!=='lyrics')return;
    requestAnimationFrame(()=>{
      const line=lyricsContainer.querySelector('.lrc-line.active');
      if(line)lyricsContainer.scrollTo({top:Math.max(0,line.offsetTop-lyricsContainer.clientHeight/2+line.offsetHeight/2),behavior:'smooth'});
    });
  }
  function candidates(){
    const song=currentSong;if(!song)return[];
    const names=normal(song.artist).split(',').map(n=>n.trim()).filter(Boolean);
    const score=s=>(s.album&&s.album===song.album?20:0)+(names.some(n=>normal(s.artist).includes(n))?40:0)+(OM.liked.has(s.url)?3:0);
    return songs.filter(s=>s.url!==song.url).map((s,i)=>({s,i,score:score(s)})).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,12).map(x=>x.s);
  }
  function renderSimilar(){
    const s=currentSong;if(!s)return;
    const artistName=s.artist.split(',')[0].trim(), a=albumOM(s.album||'');
    const mixes=[['artist',artistName,artistPhotoOM(artistName)||s.cover,'MIX DE ARTISTA'],['album',a?.name||s.title,a?.cover||s.cover,'DEL MISMO UNIVERSO'],['discovery','Tu próximo favorito',candidates()[0]?.cover||s.cover,'DESCUBRE OMUSIC']];
    $om('om-im-similar').innerHTML=`<h2>Mixes para seguir escuchando</h2><div class="om-im-mixes">${mixes.map(([type,name,cover,label])=>`<button onclick="omImmersiveMix('${type}')">${img(cover)}<span class="om-im-mix-label">${esc(label)}</span><strong>${esc(name)}</strong><small>${type==='album'?'Más de este álbum':type==='artist'?'De tu biblioteca':'Una selección para ti'}</small></button>`).join('')}</div><h2>Canciones sugeridas</h2><div class="om-im-suggestions">${candidates().map(track=>{const index=songs.indexOf(track);return `<div><button onclick="omPlaySong(${index})">${img(track.cover)}<span><strong>${esc(track.title)}</strong><small>${esc(track.artist)}</small></span></button><button onclick="addToQueue(songs[${index}])" aria-label="Agregar ${esc(track.title)} a la cola">${icon('queue',20)}</button><button onclick="openOptions(songs[${index}])" aria-label="Opciones de ${esc(track.title)}">${icon('more',21)}</button></div>`;}).join('')}</div>`;
  }
  function renderCredits(){
    const s=currentSong;if(!s)return;
    const names=s.artist.split(',').map(name=>name.trim()).filter(Boolean);
    $om('om-im-credits').innerHTML=`<span class="om-eyebrow">SONANDO EN TU UNIVERSO</span><h1>${esc(s.title)}</h1><div class="om-im-credit-block"><h2>Artistas</h2>${names.map(name=>`<div class="om-im-credit-person">${img(artistPhotoOM(name)||s.cover,name)}<span><strong>${omArtistLinks(name)}</strong><small>Artista</small></span></div>`).join('')}</div><dl><div><dt>Álbum</dt><dd>${esc(s.album||'Sencillo')}</dd></div><div><dt>Formato de audio</dt><dd>${esc(mediaFormat(s))}</dd></div>${s.lyricsUrl?'<div><dt>Letras</dt><dd>Archivo sincronizado LRC</dd></div>':''}</dl><p class="om-im-credit-note">Información incluida en tu biblioteca de OMUSIC.</p>${s.album&&albumOM(s.album)?omAlbumSaveButton(s.album,true):''}`;
  }
  function setTab(tab){
    const motionFrom=$om('om-im-art').getBoundingClientRect?.();
    state.tab=['lyrics','similar','credits'].includes(tab)?tab:'cover';root.dataset.panel=state.tab;
    panel.hidden=state.tab==='cover';
    for(const name of ['lyrics','similar','credits'])$om('om-im-'+name).hidden=state.tab!==name;
    document.querySelectorAll('[data-im-tab]').forEach(b=>{const selected=b.dataset.imTab===state.tab;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
    $om('om-lyrics-btn').classList.toggle('active',state.tab==='lyrics');
    window.OMDesktopMotion?.layout(root,$om('om-im-art'),motionFrom,$om('om-im-'+state.tab));
    if(state.tab==='lyrics'){
      if(!lyricsContainer.textContent.trim())loadLyrics(currentSong?.lyricsUrl);
      centerLyrics();
    }
  }
  function exitNative(){
    state.wantsNative=false;++state.request;
    if(native()){
      const exit=document.exitFullscreen||document.webkitExitFullscreen||document.webkitCancelFullScreen;
      if(exit)try{Promise.resolve(exit.call(document)).catch(()=>{});}catch{}
    }
    updateNativeButton();
  }
  function updateNativeButton(){
    const b=$om('om-im-fullscreen');b.innerHTML=icon('expand',17);b.title=native()?'Salir de pantalla completa':'Pantalla completa';b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(native()));
  }
  function requestNative(){
    if(!state.open)return;
    state.wantsNative=true;const ticket=++state.request;
    const request=root.requestFullscreen||root.webkitRequestFullscreen||root.webkitRequestFullScreen;
    if(request)try{Promise.resolve(request.call(root)).then(()=>{
      if(ticket!==state.request||!state.open||!state.wantsNative){if(native()&&(!state.open||!state.wantsNative))exitNative();return;}
      updateNativeButton();
    }).catch(()=>{if(ticket===state.request)updateNativeButton();});}catch{}
  }
  window.omOpenImmersive=function(tab='cover',fullscreen=false){
    const motionOpening=!state.open,motionFrom=$om('cover-container')?.getBoundingClientRect?.();
    if(isVideo())return previousPlayer();
    if(!currentSong)return omToast('Elige una canción para empezar.');
    if(!state.open){
      state.open=true;state.focus=document.activeElement;state.lastTrack=null;
      clearTimeout(OM.lyricTimer);lyricsOverlay.classList.remove('active');lyricsOverlay.style.display='none';
      $om('mob-player-modal').style.display='none';
      mount($om('lyrics-cover-wrap'),$om('om-im-art'));mount(lyricsContainer,$om('om-im-lyrics'));
      mount($om('mainPlayer'),$om('om-im-player-slot'));
      for(const id of ['queueBox','modalOverlay','optionsModal','om-dialog-backdrop','om-toast'])mount($om(id),root);
      root.hidden=false;document.body.classList.add('om-immersive-open');inertBackground(true);
      const expand=root.querySelector('.om-expand-btn');if(expand){expand.title='Cerrar reproductor ampliado';expand.setAttribute('aria-label',expand.title);}
      $om('om-im-close').focus();
    }
    refreshArtwork();setTab(tab);updateNativeButton();
    if(motionOpening)window.OMDesktopMotion?.enter(root,$om('om-im-art'),motionFrom);
    if(fullscreen)requestNative();
  };
  window.omCloseImmersive=function(){
    if(!state.open)return;
    state.open=false;exitNative();
    const cv=$om('lyrics-cover-video');cv.pause();
    restore();root.hidden=true;document.body.classList.remove('om-immersive-open');inertBackground(false);
    $om('om-lyrics-btn').classList.remove('active');
    const expand=document.querySelector('.om-expand-btn');if(expand){expand.title='Abrir reproductor';expand.setAttribute('aria-label',expand.title);}
    state.focus?.focus();
  };
  window.omImmersiveTab=tab=>setTab(state.tab===tab&&tab!=='cover'?'cover':tab);
  window.omToggleMusicFullscreen=()=>native()?exitNative():requestNative();
  window.omImmersiveMix=function(type){
    if(!currentSong)return;
    const artist=normal(currentSong.artist.split(',')[0]);
    const list=type==='artist'?songs.filter(s=>normal(s.artist).includes(artist)):type==='album'?songs.filter(s=>s.album&&s.album===currentSong.album):candidates();
    if(!list.length)return omToast('Prueba con otra selección de tu biblioteca.');
    OM.playbackList=[...list];currentAlbumContext=null;loadSong(list.find(s=>s.url!==currentSong.url)||list[0]);
  };
  window.openMobPlayerModal=function(){
    if(isVideo())return previousPlayer.apply(this,arguments);
    if(state.open)return omCloseImmersive();
    return omOpenImmersive('cover');
  };
  window.closeMobPlayerModal=function(){if(state.open)omCloseImmersive();else $om('mob-player-modal').style.display='none';};
  window.toggleLyricsView=function(){
    if(isVideo())return omToast('Las letras están disponibles en las canciones de tu biblioteca.');
    if(state.open)setTab(state.tab==='lyrics'?'cover':'lyrics');else omOpenImmersive('lyrics');
  };
  window.openMobLyricsView=()=>omOpenImmersive('lyrics');
  window.closeMobLyricsView=()=>state.open&&setTab('cover');
  window.loadSong=function(song){
    if(song?.type==='video'&&state.open)omCloseImmersive();
    const result=previousLoad.apply(this,arguments);refreshArtwork();return result;
  };
  window.openVideo=function(){if(state.open)omCloseImmersive();return previousVideo.apply(this,arguments);};
  window.loadLyrics=async function(){await previousLyricsLoad.apply(this,arguments);centerLyrics();};
  for(const event of ['play','pause','loadedmetadata'])audio.addEventListener(event,refreshArtwork);
  for(const event of ['loadeddata','error'])$om('lyrics-cover-video').addEventListener(event,refreshArtwork);
  document.addEventListener('keydown',event=>{
    if(!state.open)return;
    if(event.key==='Escape'){
      if(!$om('om-dialog-backdrop').hidden||$om('optionsModal').style.display==='block')return;
      if($om('queueBox').classList.contains('active')){event.preventDefault();event.stopImmediatePropagation();toggleQueue();return;}
      event.preventDefault();event.stopImmediatePropagation();native()?exitNative():omCloseImmersive();
    }
    if(event.key==='Tab'){
      if(!$om('om-dialog-backdrop').hidden)return;
      const focusable=[...root.querySelectorAll('button,input,[tabindex="0"]')].filter(b=>!b.disabled&&b.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  },true);
  for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{
    if(native()&&(!state.open||!state.wantsNative))exitNative();
    updateNativeButton();
  });
  $om('om-im-fullscreen').innerHTML=icon('expand',17);
  $om('om-im-close').innerHTML=icon('chevron',20);
  const more=document.createElement('button');more.id='om-im-more';more.className='om-player-more';more.innerHTML=icon('more',20);more.title='Opciones de la canción';more.onclick=()=>currentSong&&openOptions(currentSong);document.querySelector('.player-left').append(more);
})();
