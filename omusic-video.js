/* Un solo estado de reproducción para el audio, el video y su miniatura. */
(() => {
  'use strict';
  const modal = $om('videoModal');
  const video = $om('videoPlayer');
  const mini = $om('miniVideoEl');
  const controls = $om('fsControls');
  const fullscreenButton = $om('fsBtn');
  const expandButton = document.querySelector('.om-expand-btn');
  const state = { generation: 0, minimized: false, fallback: false, wantsFullscreen: false, fullscreenRequest: 0, controlsTimer: null, interacting: false };
  const pendingPlay = new WeakMap();
  const loadSongBeforeFix = window.loadSong;
  const openPlayerBeforeFix = window.openMobPlayerModal;
  const nativeFullscreen = () => {
    const el = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    return !!el && (el === modal || modal.contains(el));
  };
  const isFullscreen = () => nativeFullscreen() || state.fallback;
  const fullView = () => !!window.OMDesktopVideo?.expanded || isFullscreen() || (!!activeVideo && modal.style.display !== 'none' && window.matchMedia?.('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)').matches);
  const isVideo = () => !!activeVideo || currentSong?.type === 'video';

  function pauseVisuals() {
    for (const el of [video, mini]) if (!el.paused) el.pause();
  }

  function syncMode() {
    const videoMode = isVideo();
    document.body.classList.toggle('om-video-active', videoMode);
    if (expandButton) expandButton.hidden = videoMode;
    const play = $om('fsPlayBtn');
    if (play) {
      play.innerHTML = icon(audio.paused ? 'play' : 'pause', 22);
      play.setAttribute('aria-label', audio.paused ? 'Reproducir' : 'Pausar');
    }
  }

  function seekVisual(el) {
    if (!el.getAttribute('src') || el.readyState === 0) return;
    try {
      if (Math.abs(el.currentTime - audio.currentTime) > .3) el.currentTime = audio.currentTime;
      el.playbackRate = audio.playbackRate;
    } catch { /* loadedmetadata y seeked vuelven a sincronizar cuando esté listo. */ }
  }

  function syncVisuals() {
    if (!activeVideo) { pauseVisuals(); return; }
    const shown = state.minimized ? mini : video;
    const hidden = state.minimized ? video : mini;
    if (!hidden.paused) hidden.pause();
    seekVisual(shown);
    if (audio.paused || audio.ended) { if (!shown.paused) shown.pause(); return; }
    if (!shown.getAttribute('src') || !shown.paused || pendingPlay.has(shown)) return;
    const token = {};
    const generation = state.generation;
    pendingPlay.set(shown, token);
    try {
      Promise.resolve(shown.play()).then(() => {
        if (generation === state.generation && (audio.paused || audio.ended || !activeVideo || shown !== (state.minimized ? mini : video))) shown.pause();
      }).catch(() => {}).finally(() => {
        if (pendingPlay.get(shown) === token) pendingPlay.delete(shown);
      });
    } catch { pendingPlay.delete(shown); }
  }

  function updateProgress() {
    const percent = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 100 : 0;
    progress.value = percent;
    current.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
    $om('fsProgress').value = percent;
    $om('fsCurrentTime').textContent = formatTime(audio.currentTime);
    $om('fsDuration').textContent = formatTime(audio.duration);
    if (activeVideo && typeof _syncMobVideoBar === 'function') _syncMobVideoBar(audio.currentTime, audio.duration);
    if (typeof updateLyricsSync === 'function') updateLyricsSync(audio.currentTime);
  }

  function hideChrome(hidden) {
    modal.classList.toggle('om-video-ui-hidden',hidden);
    controls.style.opacity=hidden?'0':'1';controls.style.pointerEvents=hidden?'none':'auto';
  }
  function showFullscreenControls() {
    clearTimeout(state.controlsTimer);hideChrome(false);
    if (!fullView()) { controls.style.opacity='0';controls.style.pointerEvents='none';return; }
    state.controlsTimer=setTimeout(()=>{if(fullView()&&!state.interacting)hideChrome(true);},3000);
  }

  function syncFullscreen() {
    const full = isFullscreen();
    modal.classList.toggle('om-video-fullscreen', full);
    document.body.classList.toggle('om-video-fullscreen', full);
    window.OMDesktopVideo?.fullscreenChanged?.(full);
    fullscreenButton.textContent = full ? '⊠' : '⛶';
    fullscreenButton.title = full ? 'Salir de pantalla completa' : 'Pantalla completa';
    fullscreenButton.setAttribute('aria-label', fullscreenButton.title);
    fullscreenButton.setAttribute('aria-pressed', String(full));
    clearTimeout(state.controlsTimer);
    state.interacting=false;showFullscreenControls();
  }

  function exitFullscreen() {
    ++state.fullscreenRequest;
    state.wantsFullscreen = false;
    state.fallback = false;
    if (nativeFullscreen()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen || document.msExitFullscreen;
      if (exit) {
        try { Promise.resolve(exit.call(document)).catch(() => {}); } catch {}
      }
    }
    syncFullscreen();
  }

  function unload(el) {
    el.pause();
    pendingPlay.delete(el);
    if (el.getAttribute('src')) { el.removeAttribute('src'); el.load(); }
  }

  function clearVideo(stopAudio) {
    const wasVideo = isVideo();
    ++state.generation;
    state.minimized = false;
    activeVideo = null;
    // Ocultar y descargar antes de cargar la siguiente pista, sin cierres diferidos.
    modal.style.display = 'none';
    modal.classList.remove('modal-opening', 'modal-closing');
    exitFullscreen();
    if (document.pictureInPictureElement === video && document.exitPictureInPicture) {
      try { Promise.resolve(document.exitPictureInPicture()).catch(() => {}); } catch {}
    }
    unload(video);
    unload(mini);
    mini.classList.add('mini-video-hidden');
    cover.classList.remove('mini-video-hidden', 'video-minimized-indicator');
    const holder = $om('cover-container');
    holder.classList.remove('video-minimized-indicator');
    holder.title = '';
    holder.style.cursor = 'pointer';
    if (stopAudio && wasVideo) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    audio.ontimeupdate = updateProgress;
    audio.onended = handleSongEnd;
    document.querySelector('.player').classList.remove('video-expanded');
    if (typeof applyMobTapZone === 'function') applyMobTapZone();
    const dj = $om('lyrios-btn');
    if (dj) dj.style.display = '';
    syncMode();
  }

  window.loadSong = function (song) {
    if (song?.url && song.type !== 'video') clearVideo(false);
    const result = loadSongBeforeFix.apply(this, arguments);
    syncMode();
    return result;
  };

  window.openVideo = function (url, metadata) {
    if (!url) return;
    clearVideo(false);
    const item = { ...metadata, url, type: 'video', title: metadata?.title || 'Video', artist: metadata?.artist || '' };
    const generation = state.generation;
    activeVideo = item;
    currentSong = item;
    if(typeof OM!=='undefined')OM.listenRequest={url:item.url,owner:userKeyOM(),counted:false};
    currentLrcLines = [];
    audio.pause();
    audio.src = url;
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    title.textContent = item.title;
    artist.textContent = item.artist;
    cover.src = item.cover || 'placeholder.svg';
    $om('lyrics-cover-big').src = cover.src;
    $om('lyrics-bg').src = cover.src;
    $om('lyrics-meta-title').textContent = item.title;
    $om('lyrics-meta-artist').textContent = item.artist;
    for (const id of ['lyrics-cover-video', 'mob-player-cover-video']) $om(id)?.pause();
    $om('fsTitleText').textContent = item.title;
    $om('fsArtistText').textContent = item.artist;
    $om('mob-player-modal').style.display = 'none';
    modal.style.display = 'flex';
    $om('mobCloseVideoBtn').style.display = 'flex';
    if (isMobile()) window.history.pushState({ omusicView: 'video' }, '');
    const dj = $om('lyrios-btn');
    if (dj) dj.style.display = 'none';
    if (typeof updateMobVideoControls === 'function') updateMobVideoControls(item);
    audio.ontimeupdate = updateProgress;
    audio.onended = () => { pauseVisuals(); playVideo_ended(); };
    loadLyrics(item.lyricsUrl);
    omSyncPlayer();
    syncMode();
    renderQueue();
    omRenderNowPanel();
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: item.title, artist: item.artist, album: 'OMUSIC', artwork: item.cover ? [{ src: item.cover }] : [] });
        navigator.mediaSession.setActionHandler('play', () => audio.play().catch(() => {}));
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      } catch {}
    }
    try {
      Promise.resolve(audio.play()).then(() => {
        if (generation === state.generation && activeVideo === item) { syncVisuals(); omSyncPlayer(); }
      }).catch(error => {
        if (generation === state.generation && error?.name !== 'AbortError') omToast('No se pudo reproducir este video. Intenta de nuevo.');
      });
    } catch { omToast('No se pudo reproducir este video. Intenta de nuevo.'); }
  };

  window.closeVideo = function () { clearVideo(true); omSyncPlayer(); };

  window.minimizeVideo = function () {
    if (!activeVideo) return;
    exitFullscreen();
    state.minimized = true;
    modal.style.display = 'none';
    if (mini.getAttribute('src') !== activeVideo.url) mini.src = activeVideo.url;
    mini.muted = true;
    cover.classList.add('mini-video-hidden');
    mini.classList.remove('mini-video-hidden');
    $om('cover-container').classList.add('video-minimized-indicator');
    $om('cover-container').title = 'Abrir video';
    syncVisuals();
  };

  window.restoreVideo = function () {
    if (!activeVideo) return;
    state.minimized = false;
    mini.pause();
    mini.classList.add('mini-video-hidden');
    cover.classList.remove('mini-video-hidden');
    $om('cover-container').classList.remove('video-minimized-indicator');
    modal.style.display = 'flex';
    syncVisuals();
  };

  window.openMobPlayerModal = function () {
    if (isVideo()) { if (activeVideo) restoreVideo(); return; }
    return openPlayerBeforeFix.apply(this, arguments);
  };

  window.toggleFullscreenVideo = function () {
    if (!activeVideo) return;
    if (isFullscreen()) { exitFullscreen(); return; }
    const requestId = ++state.fullscreenRequest;
    const generation = state.generation;
    state.wantsFullscreen = true;
    // Maximizar de inmediato; mantener este modo si el navegador no permite fullscreen.
    state.fallback = true;
    syncFullscreen();
    const request = modal.requestFullscreen || modal.webkitRequestFullscreen || modal.webkitRequestFullScreen || modal.msRequestFullscreen;
    if (!request) return;
    try {
      Promise.resolve(request.call(modal)).then(() => {
        if (requestId !== state.fullscreenRequest || generation !== state.generation) return;
        if (nativeFullscreen()) state.fallback = false;
        syncFullscreen();
      }).catch(() => {
        if (requestId === state.fullscreenRequest && generation === state.generation && activeVideo) { state.fallback = true; syncFullscreen(); }
      });
    } catch { /* El modo maximizado permanece disponible cuando se rechaza la API. */ }
  };

  window.handleFullscreenChange = function () {
    if (nativeFullscreen() && (!activeVideo || !state.wantsFullscreen)) { exitFullscreen(); return; }
    if (!nativeFullscreen()) state.wantsFullscreen = false;
    state.fallback = false;
    syncFullscreen();
  };
  for (const event of ['fullscreenchange', 'webkitfullscreenchange', 'MSFullscreenChange']) document.addEventListener(event, handleFullscreenChange);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.fallback) {
      event.preventDefault();
      event.stopImmediatePropagation();
      exitFullscreen();
      fullscreenButton.focus();
    }
  }, true);
  for (const event of ['pointermove','click','touchstart','focusin']) modal.addEventListener(event,showFullscreenControls);
  modal.addEventListener('pointerdown',event=>{state.interacting=!!event.target?.closest?.('button,input,progress');showFullscreenControls();});
  for(const event of ['pointerup','pointercancel'])document.addEventListener(event,()=>{if(state.interacting){state.interacting=false;showFullscreenControls();}});
  document.addEventListener('keydown',()=>{if(fullView())showFullscreenControls();});
  window.OMVideoChrome={show:showFullscreenControls,refresh:showFullscreenControls};
  for (const event of ['play', 'playing', 'pause', 'ended', 'seeking', 'seeked', 'ratechange', 'timeupdate']) audio.addEventListener(event, () => {
    syncVisuals();
    syncMode();
    if (event !== 'timeupdate') showFullscreenControls();
  });
  for (const event of ['waiting', 'stalled']) audio.addEventListener(event, pauseVisuals);
  audio.addEventListener('volumechange', () => { $om('fsVolume').value = audio.volume; });
  for (const el of [video, mini]) {
    el.addEventListener('loadedmetadata', syncVisuals);
    el.addEventListener('play', () => {
      if (!activeVideo || audio.paused || audio.ended || el !== (state.minimized ? mini : video)) el.pause();
    });
  }
  audio.ontimeupdate = updateProgress;
  syncMode();
  syncFullscreen();
})();
