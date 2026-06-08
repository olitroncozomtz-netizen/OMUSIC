(function () {

  /* ══════════════════════════════════════════════════════════
     ★  SETS DEL DJ — EDITA AQUÍ PARA CAMBIAR EL ALGORITMO  ★
     ══════════════════════════════════════════════════════════ */

  const LYRIOS_SETS = [
    {
      label: '¡Bonito Día!',
      intro: '¡EMPEZEMOS TU DÍA CON ESTE SET!, ESTO ES {{song}} DE {{artist}}',
      songs: ['Feel It', 'Fruto', 'QUIZAS SI QUIZAS NO', 'QLOO*', 'VeLDÁ']
    },
    {  
      label: 'LO MEJOR DE LO MEJOR',
      intro: 'vamos a ponernos al dia con los exitos de esta plataforma, esto es {{song}} de {{artist}}',
      songs: ['DtMF', 'NO TENGA$ MIEDO', 'PIENSO EN TI.', 'chiclona', 'EN LA MISMA CIUDAD.']
    },
    {
      label: 'Perreo',
      intro: 'A perrear con {{song}} de {{artist}}',
      songs: ['EoO', 'Sci-Fi', 'SIN PODERES', 'MUBI','Me Porto Bonito']
    },
    {
      label: 'Tropical',
      intro: 'Ahora vamos con algo más tropical, esto es {{song}} de {{artist}}',
      songs: ['WELTiTA', 'KOKO', 'Moscow Mule','Party']
    },
    {
      label: 'De Noche',
      intro: 'Bajamos el ritmo. Modo nocturno con {{song}} de {{artist}}',
      songs: ['Tarde o temprano', 'PLN', 'EN VISTO','LOVELENGUAJE','Whyme?']
    },
    {
      label: 'TRISTE',
      intro: 'vamos a ponernos un Poco Sad, esto es {{song}} de {{artist}}',
      songs: ['LA CHERRY', 'MALASNOTICIAS', 'Tu Boda', 'MAMI 100PRE SABE', 'Where d It Go Wrong?']
    },  
    {
      label: 'Las que pocos se saben',
      intro: '¡Vamos A Probar algo NUEVO!,ESTO ES {{song}} DE {{artist}}',
      songs: ['Respect', 'PUES QUE LE HAGO?', 'WORLDWIDE', 'Zundada de fondo', '¿Pa Que Le Hacemos De Pedo?']
    },
    {
      label: 'TRAP',
      intro: 'PARA TODOS AQUELLOS FANS DEL TRAP, Esto Es {{song}} de {{artist}}',
      songs: ['Golfista', 'PASIEMPRE', 'PARAISO (daña)', 'DALE STOP', 'eCLIPSE sOLAR']
    },
    {
      label: 'METAL',
      intro: 'Vamos A Ponernos ¡METALICOS! con {{song}} de {{artist}}',
      songs: ['Master Of Puppets', 'Mastermind  (Remastered 2004 _ Remixed)', 'The Call of Ktulu', 'Trapped Under Ice', 'Fade to Black']
    },
    {
      label: 'Romanticas',
      intro: 'ES HORA DE PONERNOS CURSIS. Estas escuchando {{song}} de {{artist}}',
      songs: ['Always Love featuring Hyunjin', 'A VOS', 'La Mentira', 'Reina Pepiada', '309']
    },
    {
      label: 'Mis Favs',
      intro: 'Es hora de que te ponga de lo que eh escuchado y me ha gustado, Esto Es {{song}} de {{artist}}',
      songs: ['PUMAS', 'ADIVINO', 'M3&M4', 'london', 'MIAU']
    },
    {
      label: 'POP',
      intro: 'Es hora de algo POP, Esto Es {{song}} de {{artist}}',
      songs: ['Meteora', 'Sky', '90s', 'Cómo Te Atreves', 'No Hay Más Que Hablar']
    },
    {
      label: 'Un Poco De Todo',
      intro: 'Vamos a Explorar que hay en esta plataforma, Esto Es {{song}} de {{artist}}',
      songs: ['11 Y ONCE', 'ROSITA', 'Tiroteo (Remix)', 'Recordé', 'piel']
    },
  ];

  /* ── Mezclar array (Fisher-Yates) ── */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ── Obtener canciones del array global del HTML ── */
  function getSongs() {
    if (typeof songs !== 'undefined' && Array.isArray(songs)) return songs;
    return [];
  }

  /* ── Buscar canción por nombre (fuzzy) ── */
  function clean(str) {
    return (str || '').toLowerCase().replace(/[◗◖\s\W]/g, '');
  }

  function findSong(query) {
    const all = getSongs();
    if (!all.length || !query) return null;
    const q = clean(query);
    return (
      all.find(s => clean(s.title) === q) ||
      all.find(s => clean(s.title).includes(q)) ||
      all.find(s => q.includes(clean(s.title).substring(0, Math.max(4, clean(s.title).length - 2)))) ||
      null
    );
  }

  let shuffledSets     = [];
  let currentSetIndex  = 0;
  let shuffledSongs    = [];   // canciones del set actual mezcladas
  let currentSongInSet = 0;

  let isSpeaking   = false;
  let hasIntroduced = false;
  let lastSongTitle = '';


  let djActive = false;

  let _djIsPlayingSong = false;

  const AUDIO_DUCK_VOLUME   = 0.18;
  const AUDIO_NORMAL_VOLUME = 1.0;

  function getAudioEl() {
    return (typeof audio !== 'undefined' ? audio : null) || document.getElementById('audio');
  }
  function duckAudio()    { const e = getAudioEl(); if (e) e.volume = AUDIO_DUCK_VOLUME; }
  function restoreAudio() { const e = getAudioEl(); if (e) e.volume = AUDIO_NORMAL_VOLUME; }

  /* ══════════════════════════════════════════════════
     SÍNTESIS DE VOZ
  ══════════════════════════════════════════════════ */

  /* ══════════════════════════════════════════════════
     BARRA DE REPRODUCCIÓN — MOSTRAR/OCULTAR (solo desktop)
     La barra siempre es visible en PC cuando la IA está activa.
     SOLO se oculta mientras la IA habla, con animación suave.
  ══════════════════════════════════════════════════ */

  function isMobileDevice() {
    return window.innerWidth <= 768;
  }

  function injectPlayerBarStyles() {
    if (document.getElementById('lyrios-playerbar-styles')) return;
    const s = document.createElement('style');
    s.id = 'lyrios-playerbar-styles';
    s.textContent = `
      /* Transición suave para la barra del player cuando LYRIOS habla */
      #mainPlayer.lyrios-bar-speaking {
        transform: translateY(100%);
        opacity: 0;
        pointer-events: none;
      }
      #mainPlayer {
        transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1),
                    opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      /* En PC con LYRIOS activo, la barra queda encima del overlay */
      #mainPlayer.lyrios-bar-active {
        z-index: 100001 !important;
      }
      /* Mini info de set en la barra cuando LYRIOS está activo (desktop) */
      #lyrios-bar-set-info {
        display: none;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: rgba(196, 181, 253, 0.85);
        font-weight: 600;
        letter-spacing: 0.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 140px;
      }
      #lyrios-bar-set-info.visible {
        display: flex;
      }
      #lyrios-bar-set-badge {
        background: rgba(109,40,217,0.5);
        border: 1px solid rgba(138,92,246,0.4);
        border-radius: 8px;
        padding: 2px 7px;
        font-size: 10px;
        color: #c4b5fd;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(s);
  }

  /* Inyectar el badge de set dentro del player-right (solo desktop) */
  function injectBarSetBadge() {
    if (document.getElementById('lyrios-bar-set-info')) return;
    const playerRight = document.querySelector('.player-right');
    if (!playerRight) return;
    const badge = document.createElement('div');
    badge.id = 'lyrios-bar-set-info';
    badge.innerHTML = `
      <span id="lyrios-bar-set-badge">LYRIOS</span>
      <span id="lyrios-bar-set-label"></span>
    `;
    playerRight.insertBefore(badge, playerRight.firstChild);
  }

  function updateBarSetBadge(setLabel) {
    const info  = document.getElementById('lyrios-bar-set-info');
    const label = document.getElementById('lyrios-bar-set-label');
    if (!info) return;
    if (setLabel) {
      if (label) label.innerText = setLabel;
      info.classList.add('visible');
    } else {
      info.classList.remove('visible');
    }
  }

  /* Ocultar barra mientras la IA habla → modo speaking */
  function hidePlayerBar() {
    if (isMobileDevice()) {
      enterSpeakingMode();
      return;
    }
    if (djActive) {
      enterSpeakingMode();
    } else {
      const bar = document.getElementById('mainPlayer');
      if (bar) bar.classList.add('lyrios-bar-speaking');
    }
  }

  /* ── Actualizar portada y fondo en modo now-playing ── */
  function updateNowPlaying() {
    const coverSrc = (document.getElementById('cover') || {}).src || '';
    if (!coverSrc) return;
    const bg    = document.getElementById('lyrios-np-bg');
    const cover = document.getElementById('lyrios-np-cover');
    if (bg)    bg.style.backgroundImage    = `url('${coverSrc}')`;
    if (cover) cover.src = coverSrc;
  }

  /* Mini-canvas visualizador junto al logo LYRIOS */
  let miniAnimId  = null;
  let miniCanvasOn = false;

  function startMiniVisualizer() {
    const canvas = document.getElementById('lyrios-np-mini-canvas');
    if (!canvas || miniCanvasOn) return;
    miniCanvasOn = true;
    const ctx  = canvas.getContext('2d');
    const bars = 28;
    let tick   = 0;
    (function frame() {
      if (!miniCanvasOn) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, r = W * 0.28;
      tick += 0.06;
      for (let i = 0; i < bars; i++) {
        const a  = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const bH = 2 + Math.sin(tick * 2.5 + i * 0.45) * 3 + Math.sin(tick * 4 + i * 0.8) * 2;
        const len = Math.max(2, bH);
        ctx.strokeStyle = `hsla(${260 + (i / bars) * 60},80%,70%,0.75)`;
        ctx.lineWidth   = 2;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r,         cy + Math.sin(a) * r);
        ctx.lineTo(cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len));
        ctx.stroke();
      }
      miniAnimId = requestAnimationFrame(frame);
    })();
  }

  function stopMiniVisualizer() {
    miniCanvasOn = false;
    if (miniAnimId) { cancelAnimationFrame(miniAnimId); miniAnimId = null; }
    const canvas = document.getElementById('lyrios-np-mini-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  /* Cambiar overlay a modo NOW PLAYING (IA terminó de hablar) */
  function enterNowPlayingMode() {
    const ov = document.getElementById('lyrios-overlay');
    if (!ov) return;
    updateNowPlaying();
    ov.classList.remove('lyrios-speaking');
    ov.classList.add('lyrios-playing');
    // Mostrar logo pequeño y portada con clase visible
    setTimeout(() => {
      const logo  = document.getElementById('lyrios-np-logo');
      const cover = document.getElementById('lyrios-np-cover-wrap');
      if (logo)  logo.classList.add('visible');
      if (cover) cover.classList.add('visible');
    }, 60);
    startMiniVisualizer();

    if (isMobileDevice()) {
      // Mostrar barra móvil, ocultar PC
      const pcCtrl  = document.getElementById('lyrios-pc-controls');
      const mobBar  = document.getElementById('lyrios-mob-controls-bar');
      if (pcCtrl) pcCtrl.style.display = 'none';
      if (mobBar) mobBar.style.display = 'flex';
      // Mostrar info de canción, progreso y controles en móvil
      updateMobTrackInfo();
      const mobInfo  = document.getElementById('lyrios-mob-track-info');
      const mobProg  = document.getElementById('lyrios-mob-progress-wrap');
      const mobCtrl  = document.getElementById('lyrios-mob-controls');
      if (mobInfo) mobInfo.style.display = 'flex';
      if (mobProg) mobProg.style.display = 'block';
      if (mobCtrl) mobCtrl.style.display = 'flex';
      startMobProgressSync();
    } else {
      // La barra del player normal permanece visible abajo
      const bar = document.getElementById('mainPlayer');
      if (bar) bar.classList.remove('lyrios-bar-speaking');
    }
  }

  /* Cambiar overlay a modo HABLANDO (IA va a hablar) */
  function enterSpeakingMode() {
    const ov = document.getElementById('lyrios-overlay');
    if (!ov) return;
    ov.classList.remove('lyrios-playing');
    ov.classList.add('lyrios-speaking');
    const logo  = document.getElementById('lyrios-np-logo');
    const cover = document.getElementById('lyrios-np-cover-wrap');
    if (logo)  logo.classList.remove('visible');
    if (cover) cover.classList.remove('visible');
    stopMiniVisualizer();

    // Ocultar controles móviles, restaurar PC
    const pcCtrl2 = document.getElementById('lyrios-pc-controls');
    const mobBar2 = document.getElementById('lyrios-mob-controls-bar');
    if (isMobileDevice()) {
      if (pcCtrl2) pcCtrl2.style.display = 'none';
      if (mobBar2) mobBar2.style.display = 'none';
    } else {
      if (pcCtrl2) pcCtrl2.style.display = 'flex';
      if (mobBar2) mobBar2.style.display = 'none';
    }
    const mobInfo = document.getElementById('lyrios-mob-track-info');
    const mobProg = document.getElementById('lyrios-mob-progress-wrap');
    const mobCtrl = document.getElementById('lyrios-mob-controls');
    if (mobInfo) mobInfo.style.display = 'none';
    if (mobProg) mobProg.style.display = 'none';
    if (mobCtrl) mobCtrl.style.display = 'none';
    stopMobProgressSync();

    if (!isMobileDevice()) {
      // Ocultar barra del player mientras habla
      const bar = document.getElementById('mainPlayer');
      if (bar) bar.classList.add('lyrios-bar-speaking');
    }
  }

  /* Mostrar barra cuando la IA termina de hablar → modo now-playing */
  function showPlayerBar() {
    if (isMobileDevice()) {
      enterNowPlayingMode();
      return;
    }
    if (djActive) {
      enterNowPlayingMode();
    } else {
      const bar = document.getElementById('mainPlayer');
      if (bar) bar.classList.remove('lyrios-bar-speaking');
    }
  }

  /* Elevar z-index de la barra para que quede sobre el overlay LYRIOS */
  function activatePlayerBar() {
    if (isMobileDevice()) return;
    const bar = document.getElementById('mainPlayer');
    if (bar) bar.classList.add('lyrios-bar-active');
  }

  /* Devolver z-index normal al cerrar LYRIOS */
  function deactivatePlayerBar() {
    const bar = document.getElementById('mainPlayer');
    if (bar) {
      bar.classList.remove('lyrios-bar-active');
      bar.classList.remove('lyrios-bar-speaking');
    }
    updateBarSetBadge(null);
    stopMiniVisualizer();
    // Resetear overlay a modo speaking para la próxima vez
    const ov = document.getElementById('lyrios-overlay');
    if (ov) {
      ov.classList.remove('lyrios-playing');
      ov.classList.add('lyrios-speaking');
    }
    const logo  = document.getElementById('lyrios-np-logo');
    const cover = document.getElementById('lyrios-np-cover-wrap');
    if (logo)  logo.classList.remove('visible');
    if (cover) cover.classList.remove('visible');
  }

  function speak(text, onEnd) {
    showDjMessage(text);
    if (!window.speechSynthesis) { onEnd && onEnd(); return; }
    window.speechSynthesis.cancel();

    const utter  = new SpeechSynthesisUtterance(text);
    utter.lang   = 'es-MX';
    utter.rate   = isMobileDevice() ? 1.0 : 1.42;
    utter.pitch  = 1.12;
    utter.volume = 1;           // IA siempre al máximo

    function doSpeak() {
      const voices = window.speechSynthesis.getVoices();
      const v =
        voices.find(v => v.lang === 'es-MX' && /female|mujer|paulina|sabina/i.test(v.name)) ||
        voices.find(v => v.lang === 'es-MX') ||
        voices.find(v => v.lang.startsWith('es-')) ||
        voices.find(v => v.lang.startsWith('es')) ||
        voices[0];
      if (v) utter.voice = v;

      utter.onstart = () => {
        isSpeaking = true;
        duckAudio();
        hidePlayerBar(); // ← ocultar barra mientras habla (solo PC)
      };
      utter.onend   = () => {
        isSpeaking = false;
        restoreAudio();
        showPlayerBar(); // ← mostrar barra cuando termina
        onEnd && onEnd();
      };
      utter.onerror = () => {
        isSpeaking = false;
        restoreAudio();
        showPlayerBar();
        onEnd && onEnd();
      };
      window.speechSynthesis.speak(utter);
    }

    window.speechSynthesis.getVoices().length === 0
      ? (window.speechSynthesis.onvoiceschanged = doSpeak)
      : doSpeak();
  }

  function stopSpeaking() {
    window.speechSynthesis && window.speechSynthesis.cancel();
    isSpeaking = false;
    restoreAudio();
    showPlayerBar(); // ← asegurarse de mostrar barra al cancelar
  }

  /* ══════════════════════════════════════════════════
     LÓGICA DE SETS Y CANCIONES
  ══════════════════════════════════════════════════ */

  /*
   * Prepara un set: mezcla sus canciones y reinicia el índice.
   * Se llama cada vez que se entra a un set nuevo.
   */
  function prepareSet(setIndex) {
    const set = shuffledSets[setIndex];
    if (!set) return;
    shuffledSongs    = shuffle(set.songs); // [1] canciones en orden aleatorio
    currentSongInSet = 0;
  }

  function getCurrentSet() {
    return shuffledSets[currentSetIndex];
  }

  function buildIntro(set, song) {
    if (!set || !set.intro) return song ? `Ahora suena ${song.title}` : 'Siguiente.';
    const name   = song ? song.title.replace(/[◗◖]/g, '').trim() : '';
    const artist = song ? (song.artist || '') : '';
    return set.intro.replace('{{song}}', name).replace('{{artist}}', artist);
  }

  /* ── Reproducir canción marcando que fue el DJ ── */
  function playSong(song) {
    if (!song || typeof loadSong !== 'function') return;
    _djIsPlayingSong = true;
    loadSong(song);
    lastSongTitle = song.title;
    // Actualizar portada en now-playing mode un poco después
    // (para darle tiempo al player a actualizar #cover)
    setTimeout(() => {
      _djIsPlayingSong = false;
      if (djActive) updateNowPlaying();
    }, 800);
  }

  /*
   * Reproduce la entrada actual del set.
   * SOLO anuncia (habla) la primera canción de cada set.
   * Las demás se reproducen en silencio directamente.
   */
  function playCurrentEntry() {
    if (!djActive) return;

    // Saltarse canciones vacías / no encontradas
    while (currentSongInSet < shuffledSongs.length) {
      const song = findSong(shuffledSongs[currentSongInSet]);
      if (song) {
        if (currentSongInSet === 0) {
          // Primera canción del set → anunciar con intro (solo esta vez)
          const set = getCurrentSet();
          speak(buildIntro(set, song), () => playSong(song));
        } else {
          // Resto de canciones → reproducir en silencio
          playSong(song);
        }
        return;
      }
      // Canción no encontrada en la biblioteca, saltar
      currentSongInSet++;
    }

    // Se agotaron todas las canciones del set → pasar al siguiente
    advanceSet();
  }

  /*
   * Avanza a la siguiente canción dentro del set actual.
   * Si se acaban las canciones, llama advanceSet().
   */
  function advanceSong() {
    if (!djActive) return;
    currentSongInSet++;
    if (currentSongInSet >= shuffledSongs.length) {
      advanceSet();
    } else {
      playCurrentEntry();
    }
  }

  /*
   * Avanza al siguiente set.
   * [3] Cuando el set se acaba (ya sea por salto o por fin natural),
   *     se ABRE el overlay y la IA anuncia el cambio.
   */
  function advanceSet() {
    if (!djActive) return;

    currentSetIndex = (currentSetIndex + 1) % shuffledSets.length;

    // Si completó una vuelta entera, volver a mezclar el orden de los sets
    if (currentSetIndex === 0) {
      shuffledSets = shuffle(LYRIOS_SETS.map(s => Object.assign({}, s)));
    }

    prepareSet(currentSetIndex); // mezcla las canciones del nuevo set

    const nextSet = getCurrentSet();
    const label   = nextSet ? nextSet.label : '';

    const transitions = [
      `¡Siguiente ronda! ${label}, vamos.`,
      `Nuevo set: ${label}. ¡Arrancamos!`,
      `Pasamos a ${label}. ¡Dale!`,
      `El Set ${label} te va a encantar, ¡Dale!`,
      `Y ahora, el set ${label}. ¡No te lo pierdas!`,
      `¡Eso fue todo de ese set! Ahora viene ${label}. ¡Vamos con todo!`,
      `¡Siguiente set! Te traigo ${label}. ¡Prepárate!`
    ];
    const msg = transitions[Math.floor(Math.random() * transitions.length)];

    // Abrir el overlay para anunciar el nuevo set [3]
    const ov = document.getElementById('lyrios-overlay');
    if (ov) {
      ov.style.display = 'flex';
      // Asegurarse de que el overlay esté en modo "hablando"
      ov.classList.remove('lyrios-playing');
      ov.classList.add('lyrios-speaking');
    }
    // Ocultar portada y logo pequeño si estaban visibles
    const npLogo  = document.getElementById('lyrios-np-logo');
    const npCover = document.getElementById('lyrios-np-cover-wrap');
    if (npLogo)  npLogo.classList.remove('visible');
    if (npCover) npCover.classList.remove('visible');
    stopMiniVisualizer();

    startVisualizer();
    activatePlayerBar();         // ← elevar barra sobre el overlay
    updateBarSetBadge(label);    // ← actualizar badge en la barra

    speak(msg, () => {
      // Intro de la primera canción del nuevo set (ya la dice playCurrentEntry)
      setTimeout(playCurrentEntry, 300);
    });
  }

  /* ══════════════════════════════════════════════════
     OVERLAY — ABRIR / CERRAR
  ══════════════════════════════════════════════════ */

  function openOverlay() {
    const ov = document.getElementById('lyrios-overlay');
    if (!ov) return;

    // [1] Mezclar sets al abrir
    shuffledSets    = shuffle(LYRIOS_SETS.map(s => Object.assign({}, s)));
    currentSetIndex = 0;
    prepareSet(0);              // [2] mezclar canciones del primer set
    djActive        = true;

    ov.style.display = 'flex';
    // Mostrar controles según dispositivo desde el inicio
    const pcCtrl = document.getElementById('lyrios-pc-controls');
    const mobBar = document.getElementById('lyrios-mob-controls-bar');
    if (isMobileDevice()) {
      if (pcCtrl) pcCtrl.style.display = 'none';
      if (mobBar) mobBar.style.display = 'flex';
    } else {
      if (pcCtrl) pcCtrl.style.display = 'flex';
      if (mobBar) mobBar.style.display = 'none';
    }
    startVisualizer();
    activatePlayerBar();        // ← elevar barra encima del overlay (PC)
    updateBarSetBadge(shuffledSets[0] ? shuffledSets[0].label : '');

    if (!hasIntroduced) {
      hasIntroduced = true;
      const intros = [
        '¡Hola! Soy LYRIOS, tu DJ con inteligencia artificial. Tengo los sets listos. ¡Empezamos!',
        '¡Qué onda! Soy LYRIOS. Conozco cada canción de esta plataforma. ¡Arrancamos!',
        '¡Ya sé lo que necesitas escuchar. Empezamos!',
        '¡Buenas! Soy LYRIOS, el DJ de OMUSIC. ¡Vamos con todo!'
      ];
      speak(intros[Math.floor(Math.random() * intros.length)], () => setTimeout(playCurrentEntry, 300));
    } else {
      setTimeout(playCurrentEntry, 300);
    }
  }

  /*
   * Cierra el overlay completamente.
   * [4] Al ser llamado por intervención del usuario, resetea hasIntroduced
   *     para que la próxima vez que abra LYRIOS se presente de nuevo.
   */
  function closeOverlay(byUser) {
    const ov = document.getElementById('lyrios-overlay');
    if (!ov) return;
    djActive = false;
    ov.style.display = 'none';
    stopVisualizer();
    stopSpeaking();
    if (isListening) stopListening();
    deactivatePlayerBar();      // ← restaurar barra a estado normal

    if (byUser) {
      // [4] Reset completo: la IA se apaga hasta que el usuario pulse LYRIOS de nuevo
      hasIntroduced    = false;
      shuffledSets     = [];
      shuffledSongs    = [];
      currentSetIndex  = 0;
      currentSongInSet = 0;
      lastSongTitle    = '';
    }
  }

  /* ══════════════════════════════════════════════════
     HOOK REPRODUCTOR
  ══════════════════════════════════════════════════ */

  function hookPlayer() {
    const el = getAudioEl();
    if (!el) { setTimeout(hookPlayer, 500); return; }

    /* Canción terminada → siguiente del set automáticamente */
    el.addEventListener('ended', () => {
      if (!djActive) return;
      advanceSong();
    });

    /*
     * [4] Detectar si el usuario puso una canción manualmente.
     * Usamos 'play' + verificamos _djIsPlayingSong.
     * Si no fue el DJ, la IA se cierra por completo.
     * IMPORTANTE: quitar la pausa (unpause) de la canción actual
     * NO debe cerrar la IA — solo cargar una canción distinta lo hace.
     */
    let _djWasPaused = false;

    el.addEventListener('pause', () => {
      // Registrar pausa mientras el DJ está activo
      if (djActive) _djWasPaused = true;
    });

    el.addEventListener('play', () => {
      if (!djActive) return;
      if (_djIsPlayingSong) return; // fue el DJ cargando canción, ignorar

      // Si venía de una pausa → es un unpause de la canción del DJ, no cerrar
      if (_djWasPaused) {
        _djWasPaused = false;
        return;
      }

      // El usuario cargó una canción diferente → cerrar IA por completo
      closeOverlay(true);
    });
  }

  /*
   * También parcheamos window.loadSong para detectar llamadas
   * externas (botones, listas, etc.) que no vengan del DJ.
   */
  function patchLoadSong() {
    const origLoadSong = window.loadSong;
    if (typeof origLoadSong !== 'function') {
      setTimeout(patchLoadSong, 300);
      return;
    }
    window.loadSong = function(song) {
      // Si no fue el DJ quien llamó esto, cerrar la IA
      if (djActive && !_djIsPlayingSong) {
        closeOverlay(true);
      }
      origLoadSong.apply(this, arguments);
    };
  }

  /* ══════════════════════════════════════════════════
     VISUALIZADOR
  ══════════════════════════════════════════════════ */

  let animId   = null;
  let canvasOn = false;

  function startVisualizer() {
    const canvas = document.getElementById('lyrios-circular-canvas');
    if (!canvas || canvasOn) return;
    canvasOn = true;
    const ctx  = canvas.getContext('2d');
    const bars = 64;
    let tick   = 0;
    (function frame() {
      if (!canvasOn) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, r = W * 0.30;
      tick += 0.04;
      for (let i = 0; i < bars; i++) {
        const a  = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const bH = isSpeaking
          ? 18 + Math.sin(tick * 3 + i * 0.4) * 14 + Math.sin(tick * 5 + i * 0.7) * 8
          : 4  + Math.sin(tick + i * 0.3) * 3;
        const len = Math.max(4, bH);
        ctx.strokeStyle = `hsla(${260 + (i / bars) * 60},80%,65%,${isSpeaking ? 0.85 + Math.sin(tick + i) * 0.15 : 0.4})`;
        ctx.lineWidth   = 3.5;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r,         cy + Math.sin(a) * r);
        ctx.lineTo(cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len));
        ctx.stroke();
      }
      animId = requestAnimationFrame(frame);
    })();
  }

  function stopVisualizer() {
    canvasOn = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    const canvas = document.getElementById('lyrios-circular-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  /* ══════════════════════════════════════════════════
     MENSAJE DJ
  ══════════════════════════════════════════════════ */

  function showDjMessage(text) {
    const el = document.getElementById('lyrios-dj-msg');
    if (!el) return;
    el.innerText       = text;
    el.style.opacity   = '1';
    el.style.transform = 'translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(6px)';
    }, 6500);
  }

  /* ══════════════════════════════════════════════════
     SPEECH RECOGNITION
  ══════════════════════════════════════════════════ */

  let recognition = null;
  let isListening  = false;

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showDjMessage('Tu navegador no soporta el micrófono.'); return; }
    if (isListening) return;
    recognition                = new SR();
    recognition.lang           = 'es-MX';
    recognition.interimResults = false;
    recognition.onstart  = () => { isListening = true;  updateMicBtn(true); };
    recognition.onend    = () => { isListening = false; updateMicBtn(false); };
    recognition.onerror  = () => { isListening = false; updateMicBtn(false); };
    recognition.onresult = (e) => {
      const t = e.results[0][0].transcript.toLowerCase();
      if (/siguiente|skip|otra|cambia/.test(t)) {
        speak('¡Va!', () => advanceSong());
      } else if (/play|dale|empieza|pon/.test(t)) {
        playCurrentEntry();
      } else {
        showDjMessage('Di "siguiente" o "dale".');
      }
    };
    recognition.start();
  }

  function stopListening() {
    if (recognition) recognition.stop();
    isListening = false;
    updateMicBtn(false);
  }

  function updateMicBtn(on) {
    ['lyrios-overlay-mic', 'lyrios-overlay-mic-mob'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.style.background  = on ? 'rgba(220,38,38,0.5)'   : 'rgba(109,40,217,0.6)';
      btn.style.borderColor = on ? 'rgba(252,165,165,0.4)' : 'rgba(138,92,246,0.4)';
    });
  }

  /* ══════════════════════════════════════════════════
     HELPERS MÓVIL — INFO CANCIÓN + PROGRESO
  ══════════════════════════════════════════════════ */

  let mobProgressInterval = null;

  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function updateMobTrackInfo() {
    const titleSrc  = (document.getElementById('title')  || {}).innerText || '—';
    const artistSrc = (document.getElementById('artist') || {}).innerText || '—';
    const titleEl   = document.getElementById('lyrios-mob-track-title');
    const artistEl  = document.getElementById('lyrios-mob-track-artist');
    if (titleEl)  titleEl.innerText  = titleSrc;
    if (artistEl) artistEl.innerText = artistSrc;
    // Actualizar botón play/pause
    updateMobPlayPauseBtn();
  }

  function updateMobPlayPauseBtn() {
    const btn = document.getElementById('lyrios-mob-playpause');
    const a   = getAudioEl();
    if (!btn || !a) return;
    btn.innerHTML = a.paused
      ? '<img src="jugar.png" alt="Play" style="width:28px;height:28px;object-fit:contain;">'
      : '<img src="pausa.png" alt="Pausa" style="width:28px;height:28px;object-fit:contain;">';
  }

  function startMobProgressSync() {
    stopMobProgressSync();
    const a = getAudioEl();
    if (!a) return;
    // Sync play/pause state
    a.addEventListener('play',  updateMobPlayPauseBtn);
    a.addEventListener('pause', updateMobPlayPauseBtn);
    mobProgressInterval = setInterval(() => {
      const range  = document.getElementById('lyrios-mob-progress-range');
      const curEl  = document.getElementById('lyrios-mob-cur');
      const durEl  = document.getElementById('lyrios-mob-dur');
      if (!a.duration) return;
      if (range) range.value = (a.currentTime / a.duration) * 100;
      if (curEl) curEl.innerText = fmtTime(a.currentTime);
      if (durEl) durEl.innerText = fmtTime(a.duration);
      // Also update title if changed (new song)
      updateMobTrackInfo();
    }, 500);
  }

  function stopMobProgressSync() {
    if (mobProgressInterval) { clearInterval(mobProgressInterval); mobProgressInterval = null; }
    const a = getAudioEl();
    if (a) {
      a.removeEventListener('play',  updateMobPlayPauseBtn);
      a.removeEventListener('pause', updateMobPlayPauseBtn);
    }
  }

  /* ══════════════════════════════════════════════════
     INYECTAR ESTILOS
  ══════════════════════════════════════════════════ */

  function injectStyles() {
    if (document.getElementById('lyrios-styles')) return;
    const s = document.createElement('style');
    s.id = 'lyrios-styles';
    s.textContent = `
      #lyrios-dj-msg {
        width: min(480px, 86vw);
        margin: 16px auto 0;
        background: rgba(18, 8, 45, 0.85);
        border: 1px solid rgba(138, 92, 246, 0.28);
        border-radius: 16px;
        color: #d8caff;
        font-size: 14px;
        font-weight: 500;
        padding: 12px 18px;
        text-align: center;
        line-height: 1.55;
        pointer-events: none;
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.4s ease, transform 0.4s ease;
        backdrop-filter: blur(14px);
        min-height: 46px;
        box-sizing: border-box;
      }
      .lyrios-ov-chip {
        background: rgba(45, 27, 105, 0.7);
        border: 1px solid rgba(138, 92, 246, 0.35);
        border-radius: 20px;
        color: #c4b5fd;
        font-size: 12px;
        font-weight: 600;
        padding: 7px 16px;
        cursor: pointer;
        transition: background 0.2s, transform 0.15s;
        white-space: nowrap;
        font-family: inherit;
      }
      .lyrios-ov-chip:hover { background: rgba(109,40,217,0.6); transform: scale(1.05); }
      #lyrios-overlay-mic {
        background: rgba(109,40,217,0.6);
        border: 1px solid rgba(138,92,246,0.4);
        border-radius: 50%;
        color: #e2d9ff;
        width: 42px; height: 42px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: background 0.2s, border-color 0.2s;
        font-family: inherit;
      }
      #lyrios-overlay-mic:hover { background: rgba(124,58,237,0.85); }

      /* ══ NOW PLAYING MODE ══ */

      /* Fondo difuminado de la portada */
      #lyrios-np-bg {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
        filter: blur(60px) brightness(0.38) saturate(1.6);
        transform: scale(1.12);
        transition: background-image 0.7s ease;
        pointer-events: none;
        z-index: 0;
      }
      /* Capa oscura encima del bg */
      #lyrios-np-overlay-tint {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to bottom,
          rgba(6,2,18,0.45) 0%,
          rgba(6,2,18,0.15) 40%,
          rgba(6,2,18,0.5)  100%
        );
        z-index: 1;
        pointer-events: none;
      }

      /* Logo pequeño centrado arriba en modo now-playing */
      #lyrios-np-logo {
        position: absolute;
        top: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(-4px);
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.5s ease, transform 0.5s ease;
        pointer-events: none;
      }
      #lyrios-np-logo.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      #lyrios-np-logo span {
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 4px;
        color: #fff;
        text-shadow: 0 0 20px rgba(138,92,246,0.8);
        font-family: "Segoe UI", system-ui, sans-serif;
      }
      /* Anillo visualizador pequeño junto al logo */
      #lyrios-np-mini-canvas {
        width: 34px;
        height: 34px;
        opacity: 0.85;
      }

      /* Contenedor de portada grande — centrado */
      #lyrios-np-cover-wrap {
        position: relative;
        z-index: 5;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 480px;
        padding: 0 24px;
        box-sizing: border-box;
        opacity: 0;
        transform: translateY(22px) scale(0.96);
        transition: opacity 0.55s cubic-bezier(0.22,1,0.36,1),
                    transform 0.55s cubic-bezier(0.22,1,0.36,1);
        pointer-events: none;
      }
      #lyrios-np-cover-wrap.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      #lyrios-np-cover {
        width: min(380px, 72vw);
        height: min(380px, 72vw);
        object-fit: cover;
        border-radius: 14px;
        box-shadow:
          0 30px 80px rgba(0,0,0,0.7),
          0 0 0 1px rgba(255,255,255,0.08);
        animation: lyriosNpFloat 4s ease-in-out infinite;
      }
      @keyframes lyriosNpFloat {
        0%,100% { transform: translateY(0px); }
        50%      { transform: translateY(-8px); }
      }

      /* Modo speaking: ocultar now-playing, mostrar visualizador */
      #lyrios-overlay.lyrios-speaking #lyrios-np-bg            { opacity: 0; }
      #lyrios-overlay.lyrios-speaking #lyrios-np-overlay-tint  { opacity: 0; }
      #lyrios-overlay.lyrios-speaking #lyrios-np-logo          { opacity: 0 !important; transform: translateX(-50%) translateY(-4px) !important; }
      #lyrios-overlay.lyrios-speaking #lyrios-np-cover-wrap    { opacity: 0 !important; transform: translateY(22px) scale(0.96) !important; pointer-events: none !important; }
      #lyrios-overlay.lyrios-speaking #lyrios-viz-section      { opacity: 1; pointer-events: auto; display: flex; }
      #lyrios-overlay.lyrios-speaking #lyrios-overlay-header   { opacity: 1; }

      /* Modo playing: ocultar visualizador, mostrar now-playing */
      #lyrios-overlay.lyrios-playing  #lyrios-viz-section      { opacity: 0; pointer-events: none; display: none; }
      #lyrios-overlay.lyrios-playing  #lyrios-overlay-header   { opacity: 0; pointer-events: none; }
      #lyrios-overlay.lyrios-playing  #lyrios-np-bg            { opacity: 1; }
      #lyrios-overlay.lyrios-playing  #lyrios-np-overlay-tint  { opacity: 1; }

      #lyrios-viz-section {
        transition: opacity 0.4s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: calc(100% - 80px);
        padding: 0 20px;
        box-sizing: border-box;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
      }
      #lyrios-overlay-header {
        transition: opacity 0.4s ease;
      }
      #lyrios-np-bg    { transition: opacity 0.5s ease, background-image 0.7s ease; }
      #lyrios-np-overlay-tint { transition: opacity 0.5s ease; }

      /* ══ ESTILOS MÓVIL ══ */
      @media (max-width: 768px) {
        /* En móvil el overlay es flex columna centrada con padding inferior para la barra */
        #lyrios-overlay {
          justify-content: center !important;
          align-items: center !important;
          padding-bottom: 80px !important;
        }

        /* Sección del visualizador circular: centrada, sin padding extra */
        #lyrios-viz-section {
          width: 100% !important;
          height: calc(100% - 80px) !important;
          padding: 0 !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* Canvas circular centrado */
        #lyrios-circular-canvas {
          max-width: min(300px, 80vw) !important;
          max-height: min(300px, 80vw) !important;
          display: block !important;
          margin: 0 auto !important;
        }

        /* Mensaje del DJ centrado */
        #lyrios-dj-msg {
          text-align: center !important;
          margin: 12px auto 0 !important;
          width: min(340px, 88vw) !important;
          font-size: 13px !important;
        }

        /* Portada centrada en modo now-playing */
        #lyrios-np-cover-wrap {
          max-width: 100% !important;
          padding: 0 32px !important;
          margin-top: 64px !important;
        }
        #lyrios-np-cover {
          width: min(280px, 75vw) !important;
          height: min(280px, 75vw) !important;
        }

        /* Info de canción en modo now-playing móvil */
        #lyrios-mob-track-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 14px 24px 0;
          width: 100%;
          box-sizing: border-box;
          z-index: 5;
          position: relative;
        }
        #lyrios-mob-track-title {
          font-size: 19px;
          font-weight: 800;
          color: #fff;
          letter-spacing: 0.5px;
          text-shadow: 0 2px 12px rgba(0,0,0,0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 88vw;
        }
        #lyrios-mob-track-artist {
          font-size: 13px;
          color: rgba(255,255,255,0.55);
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 88vw;
        }
        /* Barra de progreso móvil en modo now-playing */
        #lyrios-mob-progress-wrap {
          width: 100%;
          padding: 16px 28px 0;
          box-sizing: border-box;
          z-index: 5;
          position: relative;
        }
        #lyrios-mob-progress-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: rgba(255,255,255,0.2);
          outline: none;
          cursor: pointer;
        }
        #lyrios-mob-progress-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(138,92,246,0.8);
        }
        #lyrios-mob-progress-times {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 11px;
          color: rgba(255,255,255,0.45);
        }

        /* Controles móvil en modo now-playing */
        #lyrios-mob-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding: 12px 0 0;
          width: 100%;
          z-index: 5;
          position: relative;
        }
        .lyrios-mob-ctrl {
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.7);
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: transform 0.15s, color 0.15s;
        }
        .lyrios-mob-ctrl:active { transform: scale(0.9); }
        .lyrios-mob-ctrl.play-pause {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #fff;
          color: #1a0a3a;
          font-size: 26px;
          box-shadow: 0 4px 24px rgba(138,92,246,0.5);
        }
        .lyrios-mob-ctrl.play-pause:active { transform: scale(0.93); }
      }
    `;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════
     INYECTAR OVERLAY
  ══════════════════════════════════════════════════ */

  function injectOverlay() {
    const existing = document.getElementById('lyrios-overlay');
    if (existing) existing.remove();

    const ov = document.createElement('div');
    ov.id = 'lyrios-overlay';
    ov.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:#0e051c;z-index:99999;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;font-family:"Segoe UI",system-ui,sans-serif;';

    ov.innerHTML = `
      <!-- ── FONDO DIFUMINADO (now-playing) ── -->
      <div id="lyrios-np-bg"></div>
      <div id="lyrios-np-overlay-tint"></div>

      <!-- ── LOGO PEQUEÑO centrado arriba (now-playing) ── -->
      <div id="lyrios-np-logo">
        <canvas id="lyrios-np-mini-canvas" width="34" height="34"></canvas>
        <span>LYRIOS</span>
      </div>

      <!-- ── BOTÓN CERRAR (siempre en esquina superior derecha) ── -->
      <button onclick="window.lyriosCloseOverlay&&window.lyriosCloseOverlay(true)"
        style="position:absolute;top:20px;right:24px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:50%;width:36px;height:36px;color:rgba(255,255,255,0.55);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:20;transition:background 0.2s;"
        onmouseover="this.style.background='rgba(255,255,255,0.16)'"
        onmouseout="this.style.background='rgba(255,255,255,0.08)'">&#8964;</button>

      <!-- ══ SECCIÓN HABLANDO: título + canvas, todo centrado ══ -->
      <div id="lyrios-viz-section">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(109,40,217,0.22) 0%,transparent 68%);pointer-events:none;"></div>
        <div id="lyrios-overlay-header" style="position:relative;z-index:2;width:100%;display:flex;align-items:center;justify-content:center;padding:0 0 28px 0;box-sizing:border-box;flex-shrink:0;">
          <h1 style="margin:0;font-size:clamp(26px,5vw,44px);font-weight:900;letter-spacing:6px;color:#fff;text-shadow:0 0 36px rgba(138,92,246,0.65);text-align:center;">LYRIOS IA</h1>
        </div>
        <canvas id="lyrios-circular-canvas" width="420" height="420"
          style="max-width:min(400px,75vw);max-height:min(400px,50vh);position:relative;z-index:2;display:block;margin:0 auto;"></canvas>
        <div id="lyrios-dj-msg" style="position:relative;z-index:2;"></div>
      </div>

      <!-- ── PORTADA GRANDE centrada (now-playing) ── -->
      <div id="lyrios-np-cover-wrap">
        <img id="lyrios-np-cover" src="" alt="">
      </div>

      <!-- ── BARRA INFERIOR (chips + mic + controles móvil) fija al fondo ── -->
      <div id="lyrios-bottom-bar" style="position:absolute;bottom:0;left:0;right:0;z-index:10;padding:14px 20px 24px;box-sizing:border-box;background:rgba(0,0,0,0.5);backdrop-filter:blur(20px);border-top:1px solid rgba(138,92,246,0.12);">

        <!-- Controles PC: chips + mic -->
        <div id="lyrios-pc-controls" style="display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;">
          <button class="lyrios-ov-chip" onclick="window._lyriosSkip&&window._lyriosSkip()">⏭ Siguiente</button>
          <button class="lyrios-ov-chip" onclick="window._lyriosRestart&&window._lyriosRestart()">↺ Reiniciar set</button>
          <button id="lyrios-overlay-mic" onclick="window.lyriosToggleMic&&window.lyriosToggleMic()" title="Micrófono" style="background:rgba(109,40,217,0.6);border:1px solid rgba(138,92,246,0.4);border-radius:50%;color:#e2d9ff;width:42px;height:42px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.2s;padding:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
        </div>

        <!-- Controles MÓVIL: anterior / play-pause / siguiente + mic -->
        <div id="lyrios-mob-controls-bar" style="display:none;flex-direction:column;align-items:center;gap:14px;">
          <!-- Info canción -->
          <div id="lyrios-mob-track-info" style="flex-direction:column;align-items:center;text-align:center;width:100%;">
            <div id="lyrios-mob-track-title" style="font-size:16px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:88vw;">—</div>
            <div id="lyrios-mob-track-artist" style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:88vw;">—</div>
          </div>
          <!-- Barra de progreso -->
          <div id="lyrios-mob-progress-wrap" style="width:100%;padding:0 8px;box-sizing:border-box;">
            <input id="lyrios-mob-progress-range" type="range" min="0" max="100" value="0" style="-webkit-appearance:none;appearance:none;width:100%;height:3px;border-radius:2px;background:rgba(255,255,255,0.2);outline:none;cursor:pointer;"
              oninput="(function(v){var a=document.getElementById('audio')||window.audio;if(a&&a.duration)a.currentTime=(v/100)*a.duration;})(this.value)">
            <div id="lyrios-mob-progress-times" style="display:flex;justify-content:space-between;margin-top:5px;font-size:11px;color:rgba(255,255,255,0.45);">
              <span id="lyrios-mob-cur">0:00</span>
              <span id="lyrios-mob-dur">0:00</span>
            </div>
          </div>
          <!-- Botones anterior / play / siguiente -->
          <div id="lyrios-mob-controls" style="display:flex;align-items:center;justify-content:center;gap:28px;width:100%;">
            <button class="lyrios-mob-ctrl" onclick="window._lyriosPrev&&window._lyriosPrev()" style="background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;">
              <img src="atras.png" alt="Anterior" style="width:36px;height:36px;object-fit:contain;">
            </button>
            <button class="lyrios-mob-ctrl play-pause" id="lyrios-mob-playpause" onclick="(function(){var a=document.getElementById('audio')||window.audio;if(a){if(a.paused)a.play();else a.pause();}})()" style="width:64px;height:64px;border-radius:50%;background:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(138,92,246,0.5);padding:0;">
              <img id="lyrios-mob-playpause-img" src="jugar.png" alt="Play/Pausa" style="width:28px;height:28px;object-fit:contain;">
            </button>
            <button class="lyrios-mob-ctrl" onclick="window._lyriosSkip&&window._lyriosSkip()" style="background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;">
              <img src="siguiente.png" alt="Siguiente" style="width:36px;height:36px;object-fit:contain;">
            </button>
          </div>
          <!-- Chips en móvil -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
            <button class="lyrios-ov-chip" onclick="window._lyriosSkip&&window._lyriosSkip()" style="font-size:11px;padding:5px 12px;">⏭ Siguiente</button>
            <button class="lyrios-ov-chip" onclick="window._lyriosRestart&&window._lyriosRestart()" style="font-size:11px;padding:5px 12px;">↺ Reiniciar</button>
            <button id="lyrios-overlay-mic-mob" onclick="window.lyriosToggleMic&&window.lyriosToggleMic()" style="background:rgba(109,40,217,0.6);border:1px solid rgba(138,92,246,0.4);border-radius:50%;color:#e2d9ff;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(ov);

    // Iniciar en modo hablando
    ov.classList.add('lyrios-speaking');
  }

  /* ══════════════════════════════════════════════════
     EXPONER GLOBALMENTE
  ══════════════════════════════════════════════════ */

  window.lyriosOpenOverlay  = openOverlay;
  window.lyriosCloseOverlay = closeOverlay;
  window.lyriosToggleMic    = () => isListening ? stopListening() : startListening();

  /* Botón ⏭ Siguiente: salta canción → si se acaba el set, advanceSet abre el overlay */
  window._lyriosSkip = () => {
    try {
      if (typeof stopSpeaking === 'function') stopSpeaking();
      _djIsPlayingSong = true;
      if (typeof advanceSong === 'function') advanceSong();
    } catch (e) {
      console.error('[LYRIOS] Error en skip:', e);
    }
  };

  /* Botón ⏮ Anterior */
  window._lyriosPrev = () => {
    try {
      if (typeof stopSpeaking === 'function') stopSpeaking();
      _djIsPlayingSong = true;
      if (currentSongInSet > 0) {
        currentSongInSet -= 2;
        if (currentSongInSet < -1) currentSongInSet = -1;
        if (typeof advanceSong === 'function') advanceSong();
      } else {
        currentSongInSet = -1;
        if (typeof advanceSong === 'function') advanceSong();
      }
    } catch (e) {
      console.error('[LYRIOS] Error en prev:', e);
    }
  };

  /* Botón ↺ Reiniciar set */
  window._lyriosRestart = () => {
    prepareSet(currentSetIndex);
    speak('Reiniciando el set.', () => setTimeout(playCurrentEntry, 300));
  };


  function patchPlayerButtons() {
    // Esperar a que existan las funciones del player
    const wait = setInterval(() => {
      // Buscar específicamente los botones con clase 'control-btn' (sin contar shuffle/repeat)
      const controlBtns = document.querySelectorAll('.playback-controls .control-btn');
      const prevBtn = controlBtns[0]; // Primer control-btn es Previous
      const nextBtn = controlBtns[controlBtns.length - 1]; // Último control-btn es Next
      
      if (!prevBtn || !nextBtn) return;
      clearInterval(wait);

      // Guardar onclick originales
      const origPrevClick = prevBtn.onclick;
      const origNextClick = nextBtn.onclick;

      prevBtn.onclick = function(e) {
        if (djActive) {
          // En modo DJ: retroceder canción dentro del set
          if (typeof stopSpeaking === 'function') stopSpeaking();
          _djIsPlayingSong = true;
          if (currentSongInSet > 0) {
            currentSongInSet -= 2; // -2 porque advanceSong hace +1
            if (currentSongInSet < -1) currentSongInSet = -1;
            if (typeof advanceSong === 'function') advanceSong();
          } else {
            // Ya estamos en la primera: reiniciar el set
            currentSongInSet = -1;
            if (typeof advanceSong === 'function') advanceSong();
          }
        } else {
          // Comportamiento normal
          if (typeof prevSong === 'function') prevSong();
          else if (origPrevClick) origPrevClick.call(this, e);
        }
      };

      nextBtn.onclick = function(e) {
        if (djActive) {
          // En modo DJ: siguiente canción dentro del set
          if (typeof stopSpeaking === 'function') stopSpeaking();
          _djIsPlayingSong = true;
          if (typeof advanceSong === 'function') advanceSong();
        } else {
          // Comportamiento normal
          if (typeof playNext === 'function') playNext();
          else if (origNextClick) origNextClick.call(this, e);
        }
      };

      // Inyectar badge de set en la barra también
      injectBarSetBadge();
    }, 300);
  }

  function patchNav() {
    ['openMusicaView', 'openPlaylists'].forEach(fn => {
      const orig = window[fn];
      if (typeof orig === 'function') window[fn] = function() {
        orig.apply(this, arguments);
        const b = document.getElementById('lyrios-topbar-btn');
        if (b) b.style.display = 'none';
      };
    });
    const origEx = window.openExplorarView;
    if (typeof origEx === 'function') window.openExplorarView = function() {
      origEx.apply(this, arguments);
      const b = document.getElementById('lyrios-topbar-btn');
      if (b) b.style.display = 'flex';
    };
  }

  /* ══════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════ */

  function init() {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    injectPlayerBarStyles();    // ← estilos de animación para la barra
    injectStyles();
    injectOverlay();
    hookPlayer();
    patchLoadSong();            // parchear loadSong para detectar intervención del usuario
    patchPlayerButtons();       // ← parchear ⏮ / ⏭ de la barra para el modo DJ

    if (typeof openExplorarView === 'function') {
      patchNav();
    } else {
      let tries = 0;
      const iv = setInterval(() => {
        if (typeof openExplorarView === 'function' || ++tries > 30) {
          clearInterval(iv);
          patchNav();
        }
      }, 200);
    }

    setTimeout(() => {
      const t = document.getElementById('top-bar-title');
      if (t && t.innerText === 'Explorar') {
        const b = document.getElementById('lyrios-topbar-btn');
        if (b) b.style.display = 'flex';
      }
    }, 800);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();
