
// songs se carga desde canciones.js

let queue = [];
let history = [];
let currentSong = null;
let currentAlbumContext = null; // Guarda las canciones del álbum activo para navegación

// NUEVO: Variables para letras
let currentLrcLines = []; // Guardará [{time: 10.5, text: "Hola"}]
let isLyricsViewActive = false;

// Referencias DOM (Existentes)
const audio = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const title = document.getElementById("title");
const artist = document.getElementById("artist");
const cover = document.getElementById("cover");
const progress = document.getElementById("progress");
const volume = document.getElementById("volume");
const songList = document.getElementById("songList");
const search = document.getElementById("search");
const queueList = document.getElementById("queueList");
const queueBox = document.getElementById("queueBox");
const current = document.getElementById("current");
const duration = document.getElementById("duration");

// NUEVO: Referencias DOM para letras
const lyricsOverlay = document.getElementById("lyrics-overlay");
const lyricsCoverBig = document.getElementById("lyrics-cover-big");
const lyricsContainer = document.getElementById("lyrics-container");


// --- LÓGICA DE AUTENTICACIÓN — manejada por Firebase en el <head> ---

// logout() está definida en el módulo Firebase del <head>
// Si por alguna razón no se cargó, evitar error:
if (typeof window.logout === 'undefined') {
    window.logout = () => location.reload();
}

// --- FUNCIONES PERFIL (Sin cambios) ---

function saveProfilePic(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById("userPic").src = e.target.result;
            localStorage.setItem("userProfilePic", e.target.result);
        };
        reader.readAsDataURL(input.files[0]);
    }
}


// --- FUNCIONES DEL REPRODUCTOR (Actualizado con carga de letras) ---

function formatTime(sec){
    if(!sec) return "0:00";
    let m = Math.floor(sec/60);
    let s = Math.floor(sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
}

let selectedSongForModal = null;

// ── HELPER: portada siempre como imagen estática en las tarjetas ──────────
// Los videos animados solo aparecen en el reproductor móvil y en la vista de letras
function createCoverMedia(song) {
    return `<img src="${song.cover}" class="card-cover">`;
}
// ──────────────────────────────────────────────────────────────────────────

function renderSongs(list){
    songList.innerHTML="";
    list.forEach((song, index) => {
        const card = document.createElement("div");
        card.className = "song-card";
        // IMPORTANTE: JSON.stringify escapado correctamente para onclick
        const songJson = JSON.stringify(song).replace(/"/g, '&quot;');
        
        card.innerHTML = `
            <div class="card-cover-container">
                ${createCoverMedia(song)}
                <button class="play-hover-btn" onclick="loadSong(${songJson})"><img src="original-b766c1b498d1.png" alt="Play" class="icon-16"></button>
            </div>
            <div class="card-info">
                <div class="card-title">${song.title}</div>
                <div class="card-artist">${song.artist}</div>
            </div>
            <button class="menu-dots" onclick="event.stopPropagation(); openOptions(${songJson})">⋮</button>
        `;
        // Animación escalonada solo en móvil + tap para reproducir
        if (window.innerWidth <= 768) {
            card.style.cssText += `
                opacity: 0;
                transform: translateY(18px);
                animation: songCardIn 0.32s cubic-bezier(0.22,1,0.36,1) forwards;
                animation-delay: ${Math.min(index * 35, 400)}ms;
            `;
        }
        // Tap en TODA la tarjeta reproduce (móvil); excluye solo el botón ⋮
        card.addEventListener('click', function(e) {
            if (window.innerWidth <= 768 && !e.target.closest('.menu-dots')) {
                loadSong(song);
            }
        });
        songList.appendChild(card);
    });
}

function openOptions(song) {
    selectedSongForModal = song;
    document.getElementById("modalSongTitle").innerText = song.title;
    document.getElementById("optionsModal").style.display = "block";
    document.getElementById("modalOverlay").style.display = "block";

    renderPlaylistOptions();
}

function closeOptions() {
    document.getElementById("optionsModal").style.display = "none";
    document.getElementById("modalOverlay").style.display = "none";
}

function executeAction(action) {
    if (action === 'queue') { addToQueue(selectedSongForModal); } 
    closeOptions();
}

function loadSong(song){

    const originalLoadSong = loadSong;
loadSong = function(item) {
    if (item.type === 'video') {
        // Si es video, pausamos el audio y abrimos el reproductor de video con el objeto completo
        audio.pause();
        playBtn.innerHTML = '<img src="original-b766c1b498d1.png" alt="Play" class="icon-22">';
        openVideo(item.url, item);
    } else {
        // Si es canción, cerramos el modal de video si estuviera abierto y cargamos normal
        closeVideo(); 
        originalLoadSong(item);
    }
}

    if(currentSong) history.push(currentSong);
    currentSong = song;
    audio.src = song.url;
    title.innerText = song.title;
    artist.innerText = song.artist;
    cover.src = song.cover;

    // Animación del bloque de info del player
    const trackInfo = document.querySelector(".track-info");
    if (trackInfo) {
        trackInfo.classList.remove("changing");
        void trackInfo.offsetWidth;
        trackInfo.classList.add("changing");
        setTimeout(() => trackInfo.classList.remove("changing"), 350);
    }
    
    // NUEVO: Preparar carátula grande de letras (imagen o video)
    const lyricsCoverVideoEl = document.getElementById('lyrics-cover-video');
    if (lyricsCoverVideoEl && lyricsCoverBig) {
        if (song.coverVideo) {
            lyricsCoverVideoEl.src = song.coverVideo;
            lyricsCoverVideoEl.poster = song.cover || '';
            lyricsCoverVideoEl.classList.remove('lyrics-cover-video-hidden');
            lyricsCoverBig.classList.add('lyrics-cover-img-hidden');
        } else {
            lyricsCoverVideoEl.src = '';
            lyricsCoverVideoEl.classList.add('lyrics-cover-video-hidden');
            lyricsCoverBig.classList.remove('lyrics-cover-img-hidden');
            lyricsCoverBig.src = song.cover;
        }
    } else {
        lyricsCoverBig.src = song.cover;
    }
    document.getElementById("lyrics-bg").src = song.cover;
    const _metaTitle = document.getElementById('lyrics-meta-title');
    const _metaArtist = document.getElementById('lyrics-meta-artist');
    if (_metaTitle) _metaTitle.innerText = song.title || '';
    if (_metaArtist) _metaArtist.innerText = song.artist || '';
    
    cover.classList.add("animate");
    setTimeout(()=>cover.classList.remove("animate"),300);
    
    audio.play();
    playBtn.innerHTML = '<img src="original-8855ebb60b11.png" alt="Pausa" class="icon-22">';

    // NUEVO: Intentar cargar letras (.lrc)
    loadLyrics(song.lyricsUrl);

    // --- ARREGLO PARA CONTROLES MULTIMEDIA (Sin cambios) ---
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title, artist: song.artist, album: 'OMUSIC',
            artwork: [
                { src: song.cover, sizes: '96x96',   type: 'image/png' },
                { src: song.cover, sizes: '512x512', type: 'image/png' },
            ]
        });
        navigator.mediaSession.setActionHandler('play', () => playPause());
        navigator.mediaSession.setActionHandler('pause', () => playPause());
        navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    }
    // Mostrar la barra del player de forma permanente (nunca ocultarla una vez mostrada)
    const _mainPlayer = document.getElementById('mainPlayer');
    if (_mainPlayer && _mainPlayer.style.display === 'none') {
        _mainPlayer.style.display = 'flex';
        document.body.classList.remove('player-hidden');
        // Activar tap zone en móvil
        if (typeof applyMobTapZone === 'function') applyMobTapZone();
    }

    // Update mob player modal info if open
    setTimeout(updateMobPlayerInfo, 80);
}
function playPause(){
    const videoPlayer = document.getElementById("videoPlayer");
    const videoModal = document.getElementById("videoModal");
    const isVideoOpen = videoModal.style.display === "flex";
    const fsPlayBtn = document.getElementById("fsPlayBtn");

    if(audio.paused){
        audio.play();
        if(isVideoOpen) videoPlayer.play();
        playBtn.innerHTML = '<img src="original-8855ebb60b11.png" alt="Pausa" class="icon-22">';
        if(fsPlayBtn) fsPlayBtn.innerHTML = '<img src="original-8855ebb60b11.png" alt="Pausa" class="icon-22">';
    } else {
        audio.pause();
        if(isVideoOpen) videoPlayer.pause();
        playBtn.innerHTML = '<img src="original-b766c1b498d1.png" alt="Play" class="icon-22">';
        if(fsPlayBtn) fsPlayBtn.innerHTML = '<img src="original-b766c1b498d1.png" alt="Play" class="icon-22">';
    }
}

function fsScrub(event) {
    const bar = document.getElementById("fsProgress");
    const rect = bar.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const newTime = ratio * audio.duration;
    if (!isNaN(newTime)) {
        audio.currentTime = newTime;
        const videoPlayer = document.getElementById("videoPlayer");
        if (videoPlayer) videoPlayer.currentTime = newTime;
    }
}

artist.onclick = () => { if(currentSong?.link) window.open(currentSong.link, "_blank"); };

// --- GESTIÓN DE FILA (Sin cambios) ---
function addToQueue(song){ queue.push(song); renderQueue(); }
function renderQueue(){
    queueList.innerHTML="";
    queue.forEach((song, i) => {
        const div = document.createElement("div");
        div.className = "queue-item";
        div.innerHTML = `
            <span>${i + 1}. ${song.title}</span>
            <button onclick="removeFromQueue(${i})" class="btn-remove-red">✕</button>
        `;
        queueList.appendChild(div);
    });
}
function removeFromQueue(index) { queue.splice(index, 1); renderQueue(); }
function playNext(){
    // Si hay álbum activo y la canción actual pertenece a él, navegar dentro del álbum
    if (currentAlbumContext && currentAlbumContext._currentIndex !== undefined) {
        const nextIdx = currentAlbumContext._currentIndex + 1;
        if (nextIdx < currentAlbumContext.length) {
            loadSongInAlbum(nextIdx);
            return;
        }
    }
    // Si no, usar la cola normal
    if(queue.length > 0){
        const next = queue.shift();
        renderQueue();
        if(next.type === 'video'){
            audio.pause();
            openVideo(next.url, next);
        } else {
            const videoModal = document.getElementById("videoModal");
            if(videoModal.style.display === "flex"){
                const videoPlayer = document.getElementById("videoPlayer");
                videoPlayer.pause();
                videoPlayer.src = "";
                videoModal.style.display = "none";
                activeVideo = null;
                const coverEl = document.getElementById("cover");
                coverEl.classList.remove("video-minimized-indicator");
                coverEl.title = "";
                coverEl.style.cursor = "default";
                document.removeEventListener("fullscreenchange", handleFullscreenChange);
                document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
                audio.ontimeupdate = () => {
                    const ct = audio.currentTime, dt = audio.duration;
                    progress.value = (ct / dt) * 100 || 0;
                    current.innerText = formatTime(ct);
                    duration.innerText = formatTime(dt);
                    updateLyricsSync(ct);
                };
                audio.onended = handleSongEnd;
                document.getElementById('audio').addEventListener('ended', () => {
    if (repeatActive) {
        document.getElementById('audio').currentTime = 0;
        document.getElementById('audio').play();
    } else if (shuffleActive) {
        // cambia esto por como tú llamas a una canción aleatoria
        const randomIndex = Math.floor(Math.random() * songs.length);
        playSong(randomIndex);
    } else {
        playNext();
    }
});
            }
            loadSong(next);
        }
    }
}
function prevSong(){
    // Si hay álbum activo y hay canción anterior en el álbum
    if (currentAlbumContext && currentAlbumContext._currentIndex !== undefined) {
        const prevIdx = currentAlbumContext._currentIndex - 1;
        if (prevIdx >= 0) {
            loadSongInAlbum(prevIdx);
            return;
        }
    }
    // Si no, usar historial global
    if(history.length>0) loadSong(history.pop());
}
function toggleQueue(){
    if (typeof isMobile === 'function' && isMobile()) return;
    queueBox.classList.toggle("active");
}


// =========================================
// --- NUEVO: Lógica de Letras (.lrc)    ---
// =========================================

// 1. Abrir/Cerrar vista de letras
function toggleLyricsView() {
    const overlay = document.getElementById("lyrics-overlay");

    if (!overlay.classList.contains("active")) {

        overlay.style.display = "grid";

        setTimeout(() => {
            overlay.classList.add("active");
        }, 10);

    } else {

        overlay.classList.remove("active");

        setTimeout(() => {
            overlay.style.display = "none";
        }, 350);
    }
}

// 2. Cargar y parsear archivo .lrc desde Cloudinary
async function loadLyrics(url) {
    // Resetear letras actuales
    currentLrcLines = [];
    lyricsContainer.innerHTML = '<p class="lrc-line">Cargando letras...</p>';
    
    if (!url) {
        lyricsContainer.innerHTML = '<p class="lrc-line">Letras no disponibles para esta canción.</p>';
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("No se pudo descargar el archivo de letras");
        const lrcText = await response.text();
        
        parseLrc(lrcText);
        renderLyricsToContainer();
        
    } catch (error) {
        console.error("Error cargando letras:", error);
        lyricsContainer.innerHTML = '<p class="lrc-line">Error al cargar las letras.</p>';
    }
}

// 3. Parsear el texto LRC a un array de objetos [{time, text}]
function parseLrc(lrcText) {
    const lines = lrcText.split('\n');
    // Regex para capturar [mm:ss.xx] o [mm:ss]
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

    lines.forEach(line => {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = match[3] ? parseInt(match[3]) : 0;
            
            // Convertir todo a segundos decimales
            // Si son 2 dígitos de ms (centisegundos), multiplicar por 10. Si son 3, dejar igual.
            const finalMs = match[3] && match[3].length === 2 ? milliseconds * 10 : milliseconds;
            const timeInSeconds = minutes * 60 + seconds + finalMs / 1000;
            
            // Extraer el texto eliminando la marca de tiempo
            const text = line.replace(timeRegex, '').trim();
            
            if (text) { // Solo añadir líneas con texto
                currentLrcLines.push({ time: timeInSeconds, text: text });
            }
        }
    });
    
    // Asegurar que estén ordenadas por tiempo (Cloudinary suele devolverlo bien, pero por si acaso)
    currentLrcLines.sort((a, b) => a.time - b.time);
}

// 4. Dibujar las líneas parseadas en el DOM
function renderLyricsToContainer() {
    // Animación de cambio de canción en letras
    lyricsContainer.classList.remove("lyrics-changing");
    void lyricsContainer.offsetWidth; // reflow
    lyricsContainer.classList.add("lyrics-changing");
    setTimeout(() => lyricsContainer.classList.remove("lyrics-changing"), 400);

    lyricsContainer.innerHTML = ""; // Limpiar "Cargando..."
    
    if (currentLrcLines.length === 0) {
        lyricsContainer.innerHTML = '<p class="lrc-line">Archivo de letras vacío o con formato incorrecto.</p>';
        return;
    }

    currentLrcLines.forEach((lineObj, index) => {
        const p = document.createElement('p');
        p.className = 'lrc-line';
        p.id = `lrc-${index}`; // ID único para hacer scroll y resaltar
        p.innerText = lineObj.text;
        
        // Opcional: Permitir hacer click en una línea para saltar a ese tiempo
        p.onclick = () => {
            audio.currentTime = lineObj.time;
        };
        
        lyricsContainer.appendChild(p);
    });
}

function updateLyricsSync(currentTime) {
    if (currentLrcLines.length === 0) return;

    let currentLineIndex = -1;
    // Buscamos la línea que corresponde al tiempo actual
    for (let i = 0; i < currentLrcLines.length; i++) {
        if (currentTime >= currentLrcLines[i].time) {
            currentLineIndex = i;
        } else {
            break;
        }
    }

    if (currentLineIndex !== -1) {
        const lines = document.querySelectorAll('.lrc-line');
        const currentLineEl = document.getElementById(`lrc-${currentLineIndex}`);

        if (currentLineEl && !currentLineEl.classList.contains('active')) {
            // Quitamos la clase active de todas las líneas y se la damos a la actual
            lines.forEach(l => l.classList.remove('active'));
            currentLineEl.classList.add('active');
            
            // --- LÓGICA DE CENTRADO CORREGIDA ---
            const container = document.getElementById('lyrics-container');
            
            // Altura del contenedor visible
            const containerHeight = container.offsetHeight;
            // Posición de la línea respecto al inicio del contenedor de scroll
            const lineOffsetTop = currentLineEl.offsetTop;
            // Altura de la línea de texto actual
            const lineHeight = currentLineEl.offsetHeight;

            // Calculamos el punto de scroll para que la línea quede justo al centro
            // (Posición de la línea) - (Mitad del contenedor) + (Mitad de la línea para compensar su propio alto)
            const targetScroll = lineOffsetTop - (containerHeight / 2) + (lineHeight / 2);

            container.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }
}


// --- EVENTOS DEL AUDIO (Actualizados) ---

audio.onended=playNext;

audio.ontimeupdate=()=>{
    const currentTime = audio.currentTime;
    const durationTime = audio.duration;
    
    // Actualizar barra de progreso existente
    progress.value=(currentTime/durationTime)*100 || 0;
    current.innerText=formatTime(currentTime);
    duration.innerText=formatTime(durationTime);
    
    // NUEVO: Sincronizar letras si hay líneas cargadas
    updateLyricsSync(currentTime);
};

// --- OTROS EVENTOS (Sin cambios) ---

progress.onclick=(e)=>{
    const percent=e.offsetX/progress.offsetWidth;
    audio.currentTime=percent*audio.duration;
    const videoPlayer = document.getElementById("videoPlayer");
    const videoModal = document.getElementById("videoModal");
    if(videoModal.style.display === "flex") {
        videoPlayer.currentTime = audio.currentTime;
    }
};

volume.oninput=()=>audio.volume=volume.value;

function hideHeaderSections() {
    const as = document.getElementById("artistSection");
    const ab = document.getElementById("albumSection");
    const sg = document.getElementById("suggestedSection");
    const ra = document.getElementById("recommendedAlbumsSection");
    if (as) as.style.display = "none";
    if (ab) ab.style.display = "none";
    if (sg) sg.style.display = "none";
    if (ra) ra.style.display = "none";
}

function showHeaderSections() {
    const as = document.getElementById("artistSection");
    const ab = document.getElementById("albumSection");
    const sg = document.getElementById("suggestedSection");
    const ra = document.getElementById("recommendedAlbumsSection");
    if (as) as.style.display = "";
    if (ab) ab.style.display = "";
    if (sg) sg.style.display = "";
    if (ra) ra.style.display = "";
}

search.oninput = () => {
    const searchTerm = search.value.toLowerCase().trim();
    const isExplorar = document.getElementById('top-bar-title').innerText === 'Explorar';

    if (!searchTerm) {
        if (isExplorar) {
            // En Explorar vacío: restaurar vista explorar
            openExplorarView();
        } else {
            // Vacío en Música: volver al inicio normal
            showHeaderSections();
            document.getElementById("viewTitle").innerText = "Todas las canciones";
            renderSongs(songs);
        }
        return;
    }

    hideHeaderSections();

    // Ocultar sección de videos de explorar al buscar
    const explorarVideos = document.getElementById('explorarVideosSection');
    if (explorarVideos) explorarVideos.style.display = 'none';

    // Mostrar songList y song-header-flex (pueden estar ocultos en Explorar)
    const shf = document.querySelector('.song-header-flex');
    if (shf) shf.style.display = '';
    const sl = document.getElementById('songList');
    if (sl) sl.style.display = '';

    // 1. Buscar canciones por título
    const songMatches = songs.filter(s =>
        s.title.toLowerCase().includes(searchTerm) ||
        s.artist.toLowerCase().includes(searchTerm) ||
        (s.album && s.album.toLowerCase().includes(searchTerm))
    );

    // 2. Buscar videos por título o artista
    const videoMatches = videos.filter(v =>
        v.title.toLowerCase().includes(searchTerm) ||
        (v.artist && v.artist.toLowerCase().includes(searchTerm))
    );

    // 3. Buscar artistas exactos en el panel de artistas
    const artistItems = document.querySelectorAll('.artist-item');
    let artistMatches = [];
    artistItems.forEach(item => {
        const name = item.getAttribute('data-artist-name') || '';
        if (name.toLowerCase().includes(searchTerm)) {
            artistMatches.push({
                name: item.querySelector('p').innerText,
                photo: item.getAttribute('data-artist-photo'),
                key: name
            });
        }
    });

    // 4. Buscar álbumes únicos
    const songsWithAlbums = songs.filter(s => s.album && s.album.trim() !== "");
    const allAlbums = [...new Set(songsWithAlbums.map(s => s.album))];
    const albumMatches = allAlbums.filter(a => a.toLowerCase().includes(searchTerm));

    const container = document.getElementById("songList");
    container.className = "song-grid";
    container.innerHTML = "";

    // Mostrar artistas encontrados primero
    if (artistMatches.length > 0) {
        const artistHeader = document.createElement("div");
        artistHeader.style.cssText = "grid-column:1/-1; margin-bottom:10px;";
        artistHeader.innerHTML = `<h3 class="section-header">Artistas</h3>
            <div class="artist-scroll">
                ${artistMatches.map(a => `
                    <div class="artist-item" onclick="openArtistProfile('${a.key}')">
                        <div class="artist-avatar-wrap"><img src="${a.photo}" alt="${a.name}"></div>
                        <p>${a.name}</p>
                    </div>`).join('')}
            </div>`;
        container.appendChild(artistHeader);
    }

    // Mostrar canciones
    if (songMatches.length > 0) {
        const songHeader = document.createElement("div");
        songHeader.style.cssText = "grid-column:1/-1; margin:10px 0;";
        songHeader.innerHTML = `<h3 class="section-header">Canciones</h3>`;
        container.appendChild(songHeader);

        songMatches.forEach(song => {
            const card = document.createElement("div");
            card.className = "song-card";
            const songJson = JSON.stringify(song).replace(/"/g, '&quot;');
            card.innerHTML = `
                <div class="card-cover-container">
                    ${createCoverMedia(song)}
                    <button class="play-hover-btn" onclick="loadSong(${songJson})"><img src="original-b766c1b498d1.png" alt="Play" class="icon-16"></button>
                </div>
                <div class="card-info">
                    <div class="card-title">${song.title}</div>
                    <div class="card-artist">${song.artist}</div>
                </div>
                <button class="menu-dots" onclick="event.stopPropagation(); openOptions(${songJson})">⋮</button>
            `;
            // TAP en toda la tarjeta en móvil
            card.addEventListener('click', function(e) {
                if (!e.target.closest('.menu-dots')) {
                    loadSong(song);
                }
            });
            container.appendChild(card);
        });
    }

    // Mostrar videos
    if (videoMatches.length > 0) {
        const vidHeader = document.createElement("div");
        vidHeader.style.cssText = "grid-column:1/-1; margin:10px 0;";
        vidHeader.innerHTML = `<h3 class="section-header">Videos</h3>`;
        container.appendChild(vidHeader);

        videoMatches.forEach((video, idx) => {
            const globalIdx = videos.indexOf(video);
            const card = document.createElement("div");
            card.className = "song-card video-card";
            const coverSrc = video.cover || 'https://via.placeholder.com/300x169/1a1a1a/666?text=VIDEO';
            card.innerHTML = `
                <div class="card-cover-container" class="aspect-16-9">
                    <img src="${coverSrc}" class="card-cover" class="fit-cover">
                    <button class="play-hover-btn" onclick="playVideo(${globalIdx})"><img src="original-b766c1b498d1.png" alt="Play" class="icon-16"></button>
                </div>
                <div class="card-info" class="clickable">
                    <div class="card-title">${video.title}</div>
                    <div class="card-artist">${video.artist || 'Artista Desconocido'}</div>
                </div>
            `;
            card.addEventListener('click', function(e) {
                if (!e.target.closest('.play-hover-btn')) {
                    openVideo(video.url, video);
                }
            });
            container.appendChild(card);
        });
    }

    // Mostrar álbumes encontrados
    if (albumMatches.length > 0) {
        const albumHeader = document.createElement("div");
        albumHeader.style.cssText = "grid-column:1/-1; margin:10px 0;";
        albumHeader.innerHTML = `<h3 class="section-header">Álbumes</h3>`;
        container.appendChild(albumHeader);

        const albumScroll = document.createElement("div");
        albumScroll.className = "album-scroll";
        albumScroll.style.cssText = "grid-column:1/-1;";
        albumMatches.forEach(albumName => {
            const songData = songs.find(s => s.album === albumName);
            const albumCard = document.createElement("div");
            albumCard.className = "album-card";
            albumCard.onclick = () => filterByAlbum(albumName);
            albumCard.innerHTML = `<img src="${songData.cover}" alt="${albumName}"><p>${albumName}</p>`;
            albumScroll.appendChild(albumCard);
        });
        container.appendChild(albumScroll);
    }

    if (artistMatches.length === 0 && songMatches.length === 0 && videoMatches.length === 0 && albumMatches.length === 0) {
        container.innerHTML = `<p class="no-results">Sin resultados para "${search.value}"</p>`;
    }

    document.getElementById("viewTitle").innerText = `Resultados: "${search.value}"`;
};

// --- CARGA INICIAL (Actualizado con render) ---
window.onload = () => {
    // La sesión es manejada por Firebase onAuthStateChanged en el <head>.
    // Si hay foto de perfil custom guardada localmente, cargarla:
    const savedPic = localStorage.getItem("userProfilePic");
    if(savedPic) document.getElementById("userPic").src = savedPic;

    audio.volume = 1;
    document.getElementById("volume").value = 1;

    renderSongs(songs); // Dibujar lista inicial
    renderAlbums();     // Añade los álbumes
    renderSuggestedSongs();      // Sección aleatoria de sugerencias
    renderRecommendedAlbums();   // Álbumes que te encantarán
};

function renderSuggestedSongs() {
    const container = document.getElementById("suggestedList");
    if (!container) return;

    // Mezclar aleatoriamente y tomar máx. 10
    const shuffled = [...songs].sort(() => Math.random() - 0.5).slice(0, 10);

    container.innerHTML = "";
    shuffled.forEach((song) => {
        const idx = songs.indexOf(song);
        const row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; gap:12px; padding:8px 10px; border-radius:8px; cursor:pointer; transition:background 0.2s;";
        row.onmouseenter = () => row.style.background = "rgba(255,255,255,0.07)";
        row.onmouseleave = () => row.style.background = "transparent";
        row.onclick = () => { currentIndex = idx; loadSong(song); };

        row.innerHTML = `
            <img src="${song.cover || ''}" alt="" class="queue-thumb">
            <div class="flex-min">
                <div class="track-title-text">${song.title}</div>
                <div class="track-artist-text">${song.artist}</div>
            </div>
            <button onclick="event.stopPropagation(); queue.push(songs[${idx}]); renderQueue();" title="Agregar a la fila"
                class="queue-remove-btn"
                onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='#b3b3b3'">+</button>
        `;
        container.appendChild(row);
    });
}

function renderRecommendedAlbums() {
    const container = document.getElementById("recommendedAlbumsList");
    if (!container) return;

    const songsWithAlbums = songs.filter(s => s.album && s.album.trim() !== "");
    const uniqueAlbums = [...new Set(songsWithAlbums.map(s => s.album))];

    // Mezclar aleatoriamente y tomar máx. 6
    const shuffled = [...uniqueAlbums].sort(() => Math.random() - 0.5).slice(0, 6);

    container.innerHTML = "";
    shuffled.forEach(albumName => {
        const songData = songs.find(s => s.album === albumName);
        const albumCard = document.createElement("div");
        albumCard.className = "album-card";
        albumCard.onclick = () => filterByAlbum(albumName);
        albumCard.innerHTML = `<img src="${songData.cover}" alt="${albumName}"><p>${albumName}</p>`;
        container.appendChild(albumCard);
    });
}

function renderAlbums() {
    const albumList = document.getElementById("albumList");
    albumList.innerHTML = ""; // Limpiamos la lista actual

    // 1. Filtramos solo las canciones que SÍ tienen la propiedad 'album' definida
    const songsWithAlbums = songs.filter(song => song.album && song.album.trim() !== "");

    // 2. Obtenemos nombres de álbumes únicos para no repetirlos en la vista
    const uniqueAlbums = [...new Set(songsWithAlbums.map(song => song.album))];

    uniqueAlbums.forEach(albumName => {
        // Buscamos la primera canción que coincida con ese álbum para usar su portada
        const songData = songs.find(s => s.album === albumName);
        
        const albumCard = document.createElement("div");
        albumCard.className = "album-card";
        albumCard.onclick = () => filterByAlbum(albumName); // Función para filtrar canciones al hacer clic

        albumCard.innerHTML = `
            <img src="${songData.cover}" alt="${albumName}">
            <p>${albumName}</p>
        `;
        albumList.appendChild(albumCard);
    });
}

// Función complementaria para filtrar la lista de canciones por el álbum seleccionado
function filterByAlbum(albumName) {
    const filtered = songs.filter(s => s.album === albumName);
    document.getElementById("viewTitle").innerText = `Álbum: ${albumName}`;
    currentAlbumContext = filtered; // Guardar contexto del álbum para navegación
    renderSongsWithAlbumContext(filtered);
}

// Renderiza canciones del álbum con loadSong enlazado al contexto del álbum
function renderSongsWithAlbumContext(list) {
    songList.innerHTML = "";
    list.forEach((song, idx) => {
        const card = document.createElement("div");
        card.className = "song-card";
        const songJson = JSON.stringify(song).replace(/"/g, '&quot;');
        card.innerHTML = `
            <div class="card-cover-container">
                ${createCoverMedia(song)}
                <button class="play-hover-btn" onclick="loadSongInAlbum(${idx})"><img src="original-b766c1b498d1.png" alt="Play" class="icon-16"></button>
            </div>
            <div class="card-info">
                <div class="card-title">${song.title}</div>
                <div class="card-artist">${song.artist}</div>
            </div>
            <button class="menu-dots" onclick="event.stopPropagation(); openOptions(${songJson})">⋮</button>
        `;
        // TAP en toda la tarjeta en móvil (igual que renderSongs)
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.menu-dots')) {
                loadSongInAlbum(idx);
            }
        });
        songList.appendChild(card);
    });
}

// Carga una canción del álbum activo por su índice dentro del contexto
function loadSongInAlbum(idx) {
    currentAlbumContext._currentIndex = idx;
    loadSong(currentAlbumContext[idx]);
}

// renderAlbums() se llama desde window.onload después de cargar canciones.js

// ============================================================
// --- FUNCIÓN: Abrir perfil de artista ---
// Busca canciones Y videos del artista y los muestra juntos.
// El parámetro "artistKey" es la palabra clave que se busca
// dentro del campo "artist" de canciones y videos.
// ============================================================
function openArtistProfile(artistKey) {
    hideHeaderSections();
    // Buscar el artista en el DOM para obtener foto y nombre
    const artistEl = document.querySelector(`.artist-item[data-artist-name="${artistKey}"]`);
    const artistPhoto = artistEl ? artistEl.getAttribute('data-artist-photo') : '';
    const artistDisplayName = artistEl ? artistEl.querySelector('p').innerText : artistKey;

    // Filtrar canciones del artista (coincidencia parcial)
    const artistSongs = songs.filter(s =>
        s.artist.toLowerCase().includes(artistKey.toLowerCase())
    );

    // Filtrar videos del artista (coincidencia parcial)
    const artistVideos = videos.filter(v =>
        v.artist && v.artist.toLowerCase().includes(artistKey.toLowerCase())
    );

    // Filtrar álbumes del artista
    const artistAlbumSongs = artistSongs.filter(s => s.album && s.album.trim() !== "");
    const artistAlbums = [...new Set(artistAlbumSongs.map(s => s.album))];

    // Actualizar título
    document.getElementById("viewTitle").innerText = artistDisplayName;

    const container = document.getElementById("songList");
    container.className = "song-grid";
    container.innerHTML = "";

    // ---- BANNER DEL ARTISTA ----
    const bannerWrap = document.createElement("div");
    bannerWrap.style.cssText = "grid-column:1/-1; position:relative; width:100%; border-radius:18px; overflow:hidden; margin-bottom:24px; min-height:220px;";
    bannerWrap.innerHTML = `
        <!-- Imagen de fondo difuminada como banner -->
        <div style="position:absolute; inset:0; background-image:url('${artistPhoto}'); background-size:cover; background-position:center top; filter:blur(18px) brightness(0.45); transform:scale(1.08);"></div>
        <!-- Gradiente oscuro en la parte inferior -->
        <div class="artist-bg-gradient"></div>
        <!-- Contenido encima del banner -->
        <div class="artist-header-inner">
            <img src="${artistPhoto}" alt="${artistDisplayName}"
                 class="artist-photo">
            <div>
                <div class="artist-label">Artista</div>
                <h2 class="artist-name-heading">${artistDisplayName}</h2>
                <div class="artist-meta">${artistSongs.length} canciones · ${artistVideos.length} videos · ${artistAlbums.length} álbumes</div>
            </div>
        </div>
    `;
    container.appendChild(bannerWrap);

    // ---- CANCIONES (lista, máximo 10 + ver más) ----
    if (artistSongs.length > 0) {
        const MAX_SONGS = 10;
        let songsShown = false;
        let showingAll = false;

        const songSection = document.createElement("div");
        songSection.style.cssText = "grid-column:1/-1; margin-bottom:24px;";

        const songHeader = document.createElement("div");
        songHeader.style.cssText = "display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #282828; padding-bottom:8px;";
        songHeader.innerHTML = `<h3 class="section-header-sm">🎵 Canciones</h3>`;
        songSection.appendChild(songHeader);

        // Tabla de canciones
        const songTable = document.createElement("div");
        songTable.id = "artist-song-table";

        function renderArtistSongs(all) {
            songTable.innerHTML = "";
            const list = all ? artistSongs : artistSongs.slice(0, MAX_SONGS);
            list.forEach((song, idx) => {
                const row = document.createElement("div");
                row.className = "artist-song-row";
                const songJson = JSON.stringify(song).replace(/"/g, '&quot;');
                row.innerHTML = `
                    <span class="artist-song-num">${idx + 1}</span>
                    <img src="${song.cover}" class="artist-song-thumb">
                    <div class="artist-song-info">
                        <div class="artist-song-title">${song.title}</div>
                        <div class="artist-song-sub">${song.artist}</div>
                    </div>
                    <div class="artist-song-album">${song.album || ''}</div>
                    <button class="artist-song-play" onclick="loadSong(${songJson})"><img src="original-b766c1b498d1.png" alt="Play" class="icon-16"></button>
                    <button class="artist-song-menu" onclick="event.stopPropagation(); openOptions(${songJson})">⋮</button>
                `;
                // TAP en toda la fila (móvil y desktop)
                row.addEventListener('click', function(e) {
                    if (!e.target.closest('.artist-song-menu') && !e.target.closest('.artist-song-play')) {
                        loadSong(song);
                    }
                });
                songTable.appendChild(row);
            });
        }

        renderArtistSongs(false);
        songSection.appendChild(songTable);

        // Botón Ver más / Ver menos
        if (artistSongs.length > MAX_SONGS) {
            const verMasBtn = document.createElement("button");
            verMasBtn.className = "ver-mas-btn";
            verMasBtn.innerText = `Ver más (${artistSongs.length - MAX_SONGS} más)`;
            verMasBtn.onclick = () => {
                showingAll = !showingAll;
                renderArtistSongs(showingAll);
                verMasBtn.innerText = showingAll ? "Ver menos" : `Ver más (${artistSongs.length - MAX_SONGS} más)`;
            };
            songSection.appendChild(verMasBtn);
        }

        container.appendChild(songSection);
    }

    // ---- VIDEOS ----
    if (artistVideos.length > 0) {
        const vidSection = document.createElement("div");
        vidSection.style.cssText = "grid-column:1/-1; margin-bottom:24px;";
        const vidHeader = document.createElement("div");
        vidHeader.style.cssText = "margin-bottom:12px; border-bottom:1px solid #282828; padding-bottom:8px;";
        vidHeader.innerHTML = `<h3 class="section-header-sm">🎬 Videos</h3>`;
        vidSection.appendChild(vidHeader);

        const vidGrid = document.createElement("div");
        vidGrid.className = "song-grid";
        vidGrid.style.cssText = "padding:0;";

        artistVideos.forEach(video => {
            const globalIdx = videos.indexOf(video);
            const card = document.createElement("div");
            card.className = "song-card video-card";
            const coverSrc = video.cover || 'https://via.placeholder.com/300x169/1a1a1a/666?text=VIDEO';
            card.innerHTML = `
                <div class="card-cover-container" class="aspect-16-9">
                    <img src="${coverSrc}" class="card-cover" class="fit-cover">
                    <button class="play-hover-btn" onclick="playVideo(${globalIdx})"><img src="original-b766c1b498d1.png" alt="Play" class="icon-16"></button>
                </div>
                <div class="card-info" class="clickable">
                    <div class="card-title">${video.title}</div>
                    <div class="card-artist">${video.artist || 'Artista Desconocido'}</div>
                </div>
            `;
            card.addEventListener('click', function(e) {
                if (!e.target.closest('.play-hover-btn')) {
                    openVideo(video.url, video);
                }
            });
            vidGrid.appendChild(card);
        });
        vidSection.appendChild(vidGrid);
        container.appendChild(vidSection);
    }

    // ---- ÁLBUMES DEL ARTISTA ----
    if (artistAlbums.length > 0) {
        const albumSection = document.createElement("div");
        albumSection.style.cssText = "grid-column:1/-1; margin-bottom:24px;";
        const albumHeader = document.createElement("div");
        albumHeader.style.cssText = "margin-bottom:12px; border-bottom:1px solid #282828; padding-bottom:8px;";
        albumHeader.innerHTML = `<h3 class="section-header-sm">💿 Álbumes</h3>`;
        albumSection.appendChild(albumHeader);

        const albumScroll = document.createElement("div");
        albumScroll.className = "album-scroll";

        artistAlbums.forEach(albumName => {
            const songData = artistAlbumSongs.find(s => s.album === albumName);
            const albumCard = document.createElement("div");
            albumCard.className = "album-card";
            albumCard.onclick = () => filterByAlbum(albumName);
            albumCard.innerHTML = `
                <img src="${songData.cover}" alt="${albumName}">
                <p>${albumName}</p>
            `;
            albumScroll.appendChild(albumCard);
        });
        albumSection.appendChild(albumScroll);
        container.appendChild(albumSection);
    }

    if (artistSongs.length === 0 && artistVideos.length === 0) {
        container.innerHTML += `<p class="no-results">No se encontró contenido para este artista.</p>`;
    }
}

// --- SISTEMA DE PLAYLISTS — Cloud sync con Firestore ---
// Si el usuario está autenticado con Google/GitHub → Firestore (sync entre dispositivos)
// Si es invitado → localStorage (solo local)

let playlists = [];
let _playlistsLoaded = false;

function _isGuest() {
    return window._guestMode === true || !window._currentFirebaseUser;
}

function _guestKey() {
    return "playlists_guest";
}

// Cargar playlists según el modo
async function loadPlaylistsFromCloud(uid) {
    if (!uid) {
        // Invitado: cargar de localStorage
        playlists = JSON.parse(localStorage.getItem(_guestKey()) || "[]");
        _playlistsLoaded = true;
        return;
    }
    try {
        const ref = window._doc(window._db, "playlists", uid);
        const snap = await window._getDoc(ref);
        if (snap.exists()) {
            playlists = snap.data().list || [];
        } else {
            playlists = [];
        }
    } catch(e) {
        console.warn("Error cargando playlists de Firestore:", e);
        playlists = [];
    }
    _playlistsLoaded = true;
}

async function savePlaylists() {
    if (_isGuest()) {
        localStorage.setItem(_guestKey(), JSON.stringify(playlists));
        return;
    }
    const uid = window._currentFirebaseUser.uid;
    try {
        const ref = window._doc(window._db, "playlists", uid);
        await window._setDoc(ref, { list: playlists });
    } catch(e) {
        console.warn("Error guardando playlists en Firestore:", e);
        // Fallback a localStorage
        localStorage.setItem("playlists_" + uid, JSON.stringify(playlists));
    }
}

async function createPlaylist() {
    const name = prompt("Nombre de la playlist:");
    if (!name) return;
    playlists.push({ name: name, songs: [] });
    await savePlaylists();
    openPlaylists();
}

function openPlaylists() {
    if (typeof setActiveNavBtn === 'function') setActiveNavBtn('nav-btn-coleccion');
    hideHeaderSections();
    const explorarVideos = document.getElementById('explorarVideosSection');
    if (explorarVideos) explorarVideos.style.display = 'none';
    const shf = document.querySelector('.song-header-flex');
    if (shf) shf.style.display = '';
    const container = document.getElementById("songList");
    container.style.display = '';
    container.innerHTML = "";

    const header = document.getElementById("viewTitle");
    header.innerText = "Tus Playlists";
    document.getElementById('top-bar-title').innerText = 'Colección';

    // Indicador de sincronización
    if (!_isGuest()) {
        const syncBadge = document.createElement("div");
        syncBadge.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:14px;color:#1db954;font-size:12px;";
        syncBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> Playlists sincronizadas con tu cuenta`;
        container.appendChild(syncBadge);
    } else {
        const localBadge = document.createElement("div");
        localBadge.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:14px;color:#888;font-size:12px;";
        localBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Solo guardadas localmente (modo invitado)`;
        container.appendChild(localBadge);
    }

    // Botón crear
    const btn = document.createElement("button");
    btn.innerText = "+ Crear Playlist";
    btn.onclick = createPlaylist;
    btn.style.marginBottom = "20px";
    container.appendChild(btn);

    playlists.forEach((pl, index) => {
        const div = document.createElement("div");
        div.className = "song";
        div.innerHTML = `
            <span class="clickable" onclick="openPlaylist(${index})">${pl.name}</span>
            <button onclick="deletePlaylist(${index})"
                class="btn-remove-playlist">
                🗑
            </button>
        `;
        container.appendChild(div);
    });
}

async function deletePlaylist(index) {
    const confirmDelete = confirm("¿Eliminar esta playlist?");
    if (!confirmDelete) return;
    playlists.splice(index, 1);
    await savePlaylists();
    openPlaylists();
}

function openPlaylist(index) {
    const pl = playlists[index];
    document.getElementById("viewTitle").innerText = pl.name;
    renderSongs(pl.songs);
}

async function addToPlaylist(song) {
    if (playlists.length === 0) {
        alert("Primero crea una playlist");
        return;
    }
    const names = playlists.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    const choice = prompt("Elige playlist:\n" + names);
    const i = parseInt(choice) - 1;
    if (playlists[i]) {
        playlists[i].songs.push(song);
        await savePlaylists();
        alert("Agregado a " + playlists[i].name);
    }
}

function renderPlaylistOptions() {
    const container = document.getElementById("playlistOptions");
    container.innerHTML = "";

    if (playlists.length === 0) {
        const p = document.createElement("p");
        p.innerText = "No tienes playlists";
        p.style.color = "#aaa";
        container.appendChild(p);
        return;
    }

    playlists.forEach((pl, index) => {
        const btn = document.createElement("button");
        btn.innerText = "+  " + pl.name;
        btn.style.background = "#444";
        btn.onclick = async () => {
            playlists[index].songs.push(selectedSongForModal);
            await savePlaylists();
            alert("Agregado a " + pl.name);
            closeOptions();
        };
        container.appendChild(btn);
    });
}

// Los videos están definidos en videos.js

/* =====================================================
   NAVEGACIÓN PRINCIPAL — Música / Explorar / Colección
   ===================================================== */

function setActiveNavBtn(id) {
    ['nav-btn-musica', 'nav-btn-explorar', 'nav-btn-coleccion'].forEach(btnId => {
        const el = document.getElementById(btnId);
        if (el) el.classList.remove('sidebar-nav-btn--active');
    });
    const active = document.getElementById(id);
    if (active) active.classList.add('sidebar-nav-btn--active');
}

function openMusicaView() {
    setActiveNavBtn('nav-btn-musica');
    // Ocultar sección de videos de explorar
    const explorarVideos = document.getElementById('explorarVideosSection');
    if (explorarVideos) explorarVideos.style.display = 'none';
    // Ocultar buscador de explorar (mostrar el normal)
    const explorarSearch = document.getElementById('explorar-search-bar');
    if (explorarSearch) explorarSearch.style.display = 'none';
    const mainSearch = document.getElementById('search');
    if (mainSearch) { mainSearch.style.display = ''; mainSearch.value = ''; }
    // Mostrar title
    document.getElementById('top-bar-title').innerText = 'Música';
    // Mostrar canciones + secciones normales
    showHeaderSections();
    renderSongs(songs);
    document.getElementById('viewTitle').innerText = 'Todas las canciones';
    currentAlbumContext = null;
    // Mostrar song-header-flex y songList
    const shf = document.querySelector('.song-header-flex');
    if (shf) shf.style.display = '';
    const sl = document.getElementById('songList');
    if (sl) sl.style.display = '';
}

function openExplorarView() {
    setActiveNavBtn('nav-btn-explorar');
    // Ocultar secciones de música
    hideHeaderSections();
    const shf = document.querySelector('.song-header-flex');
    if (shf) shf.style.display = 'none';
    const sl = document.getElementById('songList');
    if (sl) { sl.innerHTML = ''; sl.style.display = 'none'; }
    // Cambiar título
    document.getElementById('top-bar-title').innerText = 'Explorar';
    // Mostrar buscador explorar
    const mainSearch = document.getElementById('search');
    if (mainSearch) mainSearch.style.display = '';
    mainSearch.value = '';
    // Mostrar artistas y sección de videos
    const artistSection = document.getElementById('artistSection');
    if (artistSection) artistSection.style.display = '';
    const suggestedSection = document.getElementById('suggestedSection');
    if (suggestedSection) suggestedSection.style.display = 'none';
    const albumSection = document.getElementById('albumSection');
    if (albumSection) albumSection.style.display = 'none';
    // Renderizar y mostrar videos
    const explorarVideos = document.getElementById('explorarVideosSection');
    if (explorarVideos) explorarVideos.style.display = '';
    renderExplorarVideos();
}

function renderExplorarVideos() {
    const container = document.getElementById('explorarVideoList');
    if (!container) return;
    container.innerHTML = '';
    videos.forEach((video, index) => {
        const card = document.createElement('div');
        card.className = 'song-card video-card';
        const coverSrc = video.cover || 'https://via.placeholder.com/300x169/1a1a1a/666?text=VIDEO';
        card.innerHTML = `
            <div class="card-cover-container" class="aspect-16-9">
                <img src="${coverSrc}" class="card-cover" class="fit-cover">
                <button class="play-hover-btn" onclick="playVideo(${index})"><img src="original-b766c1b498d1.png" alt="Play" class="icon-16"></button>
            </div>
            <div class="card-info">
                <div class="card-title">${video.title}</div>
                <div class="card-artist">${video.artist || 'Artista Desconocido'}</div>
            </div>
            <div class="pos-relative">
                <button class="menu-dots" onclick="toggleVidMenuGrid(event,${index})">⋮</button>
                <div id="expl-vid-menu-${index}" class="dropdown-menu-z2000">
                    <div onclick="addVidToQueue(event,${index});document.getElementById('expl-vid-menu-${index}').style.display='none';" class="dropdown-item">&#10133; Agregar a la fila</div>
                </div>
            </div>
        `;
        card.onclick = (e) => {
            if (!e.target.closest('.menu-dots') && !e.target.closest('[id^="expl-vid-menu"]')) {
                openVideo(video.url, video);
            }
        };
        container.appendChild(card);
    });
}

function openVideos() {
    hideHeaderSections();
    const songList = document.getElementById("songList");
    const viewTitle = document.getElementById("viewTitle");
    viewTitle.innerText = "Videos Musicales";
    songList.innerHTML = "";
    
    // Cambiamos el contenedor a Grid (como las canciones de Inicio)
    songList.className = "song-grid"; 

    videos.forEach((video, index) => {
        const card = document.createElement("div");
        card.className = "song-card video-card"; // Usamos song-card para el estilo visual

        // JSON de video para pasar a las funciones (igual que con canciones)
        const videoJson = JSON.stringify(video).replace(/"/g, '"');

        const coverSrc = video.cover || 'https://via.placeholder.com/300x169/1a1a1a/666?text=VIDEO';
        card.innerHTML = `
            <div class="card-cover-container" class="aspect-16-9">
                <img src="${coverSrc}" class="card-cover" class="fit-cover">
                <button class="play-hover-btn" onclick="playVideo(${index})"><img src="original-b766c1b498d1.png" alt="Play" class="icon-16"></button>
            </div>
            <div class="card-info">
                <div class="card-title">${video.title}</div>
                <div class="card-artist">${video.artist || 'Artista Desconocido'}</div>
            </div>
            <div class="pos-relative">
                <button class="menu-dots" onclick="toggleVidMenuGrid(event, ${index})">⋮</button>
                <div id="vid-grid-menu-${index}" class="dropdown-menu-z2000">
                    <div onclick="addVidToQueue(event, ${index}); document.getElementById('vid-grid-menu-${index}').style.display='none';" class="dropdown-item">&#10133; Agregar a la fila</div>
                </div>
            </div>
        `;
        songList.appendChild(card);
    });
}

function renderVideos() {
const container = document.getElementById("videoList");
    container.innerHTML = "";

    videos.forEach((video, index) => {
        const card = document.createElement("div");
        card.className = "song-card"; 

        // Agregamos el artista y el botón de 3 puntos (menú de opciones)
        card.innerHTML = `
            <div class="card-cover-container">
                <img src="${video.cover}" class="card-cover">
                <button class="play-hover-btn"><img src="original-b766c1b498d1.png" alt="Play" class="icon-16"></button>
            </div>
            <div class="card-info" class="flex-text-left">
                <div class="card-title">${video.title}</div>
                <div class="card-artist" class="text-sm-muted">
                    ${video.artist || 'Artista Desconocido'}
                </div>
            </div>
            <div class="video-options" class="pos-relative">
                <button class="options-btn" onclick="toggleVidMenu(event, ${index})" class="btn-icon-transparent">⋮</button>
                <div id="vid-menu-${index}" class="dropdown-menu-top">
                    <div onclick="addVidToQueue(event, ${index})" class="clickable">Añadir a la fila</div>
                </div>
            </div>
        `
        `<div class="tu-clase-de-item-de-video" onclick="tuFuncionParaReproducirVideo(${index})">
    <img src="${video.cover}" class="tu-clase-de-cover">
    
    <div class="flex-1"> <div class="tu-clase-de-titulo">${video.title}</div>
        
            <div class="vid-artist">${video.artist || 'Artista Desconocido'}</div>
         </div>

        <div class="flex-row-center">
            <span class="vid-options" onclick="toggleVidMenu(event, ${index})">⋮</span>
        
            <div id="vid-menu-${index}" class="vid-menu">
                 <div onclick="addVidToQueue(event, ${index})">Añadir a la fila</div>
                </div>
            </div>
        </div>`
        ;

    
        card.onclick = (e) => {
            if (!e.target.closest('.video-options')) {
                openVideo(video.url, video);
            }
        };

        container.appendChild(card);
    });
}

function openVidOptions(event, video) {
    event.stopPropagation(); // Evita reproducir al tocar puntos
    
    selectedSongForModal = video; // Reutilizamos la variable de canciones
    document.getElementById("modalSongTitle").innerText = video.title;
    
    // Mostramos el modal principal de opciones
    document.getElementById("optionsModal").style.display = "block";
    document.getElementById("modalOverlay").style.display = "block";

    // Ocultamos opciones de playlist (los videos no van a playlists de canciones por ahora)
    document.getElementById("playlistOptions").style.display = "none";
}

// 3. Modificar executeAction para manejar videos en la fila
const originalExecuteAction = executeAction;
executeAction = function(action) {
    if (action === 'queue' && selectedSongForModal.url && selectedSongForModal.url.includes('.mp4')) {
        // Es un video, lo añadimos a la fila principal
        addVidToMainQueue(selectedSongForModal);
        closeOptions();
    } else {
        // Es una canción o playlist, llamamos a la función original
        originalExecuteAction(action);
    }
}

function addVidToMainQueue(video) {
    // Creamos un objeto compatible con la fila existente
    const queueItem = {
        ...video,
        cover: video.cover, // Usamos la misma portada
        type: 'video' // Marcamos que es video
    };
    
    queue.push(queueItem);
    renderQueue();
}

// ── Variable para saber si hay video activo ──
let activeVideo = null;

function openVideo(url, videoObj) {
    const modal = document.getElementById("videoModal");
    const videoPlayer = document.getElementById("videoPlayer");

    // Guardamos referencia al video activo
    activeVideo = videoObj || null;

    // Sincronizamos el <video> con el <audio> del player
    // El <video> está en mute — el sonido sale por el <audio>
    videoPlayer.src = url;
    audio.src = url;

    // Actualizamos info del player
    if (videoObj) {
        title.innerText = videoObj.title || "Video";
        artist.innerText = videoObj.artist || "";
        cover.src = videoObj.cover || "";
        lyricsCoverBig.src = videoObj.cover || "";
        document.getElementById("lyrics-bg").src = videoObj.cover || "";

        // Actualizar Media Session para que el OS muestre carátula y nombre
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: videoObj.title || "Video",
                artist: videoObj.artist || "",
                album: 'OMUSIC',
                artwork: videoObj.cover ? [
                    { src: videoObj.cover, sizes: '512x512', type: 'image/jpeg' },
                ] : []
            });
            navigator.mediaSession.setActionHandler('play', () => playPause());
            navigator.mediaSession.setActionHandler('pause', () => playPause());
            navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
            navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
        }
    }

    // Mostramos el modal (el player sigue visible abajo, z-index menor que antes)
    modal.style.display = "flex";
    // Ocultar botón LYRIOS mientras el video está abierto
    const lyriosBtn = document.getElementById('lyrios-btn');
    if (lyriosBtn) lyriosBtn.style.display = 'none';
    // Animación de apertura
    modal.classList.remove("modal-closing");
    modal.classList.add("modal-opening");
    setTimeout(() => modal.classList.remove("modal-opening"), 350);

    // En móvil: mostrar botón cerrar y registrar estado en el historial
    const mobCloseBtn = document.getElementById("mobCloseVideoBtn");
    if (isMobile()) {
        if (mobCloseBtn) mobCloseBtn.style.display = "flex";
        // Ocultar el mob-player-modal si estaba abierto
        const mobModal = document.getElementById("mob-player-modal");
        if (mobModal) mobModal.style.display = "none";
        // Registrar estado para el botón retroceso
        window.history.pushState({ omusicView: 'video' }, '');
        // Expandir el player mini para mostrar todos los controles igual que en PC
        _expandPlayerForVideo();
    } else {
        if (mobCloseBtn) mobCloseBtn.style.display = "none";
    }

    // Actualizar título en los controles fullscreen
    const fsTitleText = document.getElementById("fsTitleText");
    const fsArtistText = document.getElementById("fsArtistText");
    if (fsTitleText) fsTitleText.innerText = videoObj ? (videoObj.title || "") : "";
    if (fsArtistText) fsArtistText.innerText = videoObj ? (videoObj.artist || "") : "";

    // Actualizar controles de video en móvil
    if (typeof updateMobVideoControls === 'function') updateMobVideoControls(videoObj);

    // Animación de cambio en el video player
    const vp = document.getElementById("videoPlayer");
    vp.classList.remove("changing");
    void vp.offsetWidth; // reflow para reiniciar animación
    vp.classList.add("changing");
    setTimeout(() => vp.classList.remove("changing"), 500);

    // Mostrar la barra del player de forma permanente
    const _mainPlayerVid = document.getElementById('mainPlayer');
    if (_mainPlayerVid && _mainPlayerVid.style.display === 'none') {
        _mainPlayerVid.style.display = 'flex';
        document.body.classList.remove('player-hidden');
        if (typeof applyMobTapZone === 'function') applyMobTapZone();
    }

    // Reproducimos ambos sincronizados
    audio.currentTime = 0;
    videoPlayer.currentTime = 0;

    audio.play().then(() => {
        videoPlayer.play();
        playBtn.innerHTML = '<img src="original-8855ebb60b11.png" alt="Pausa" class="icon-22">';
    }).catch(() => {});

    // Sincronizar video con audio en cada tick
    audio.ontimeupdate = () => {
        const currentTime = audio.currentTime;
        const durationTime = audio.duration;

        // Mantener video en sync con audio (puede desincronizarse mínimamente)
        if (Math.abs(videoPlayer.currentTime - currentTime) > 0.3) {
            videoPlayer.currentTime = currentTime;
        }

        progress.value = (currentTime / durationTime) * 100 || 0;
        current.innerText = formatTime(currentTime);
        duration.innerText = formatTime(durationTime);

        // Sync controles fullscreen
        const fsProgress = document.getElementById("fsProgress");
        const fsCurrentTime = document.getElementById("fsCurrentTime");
        const fsDuration = document.getElementById("fsDuration");
        if (fsProgress) fsProgress.value = (currentTime / durationTime) * 100 || 0;
        if (fsCurrentTime) fsCurrentTime.innerText = formatTime(currentTime);
        if (fsDuration) fsDuration.innerText = formatTime(durationTime);

        updateLyricsSync(currentTime);

        // Sync barra de progreso de video en móvil
        if (typeof _syncMobVideoBar === 'function') _syncMobVideoBar(currentTime, durationTime);
        // Sync botón play en móvil
        if (typeof updateMobVideoPlayBtn === 'function') updateMobVideoPlayBtn();
    };

    // Cuando termina el audio, cerrar video y pasar al siguiente
    audio.onended = () => {
        videoPlayer.pause();
        playVideo_ended();
    };

    // Fullscreen: ocultar player solo si está en pantalla completa
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
}

let _fsHideTimer = null;

function handleFullscreenChange() {
    const player = document.querySelector(".player");
    const fsControls = document.getElementById("fsControls");
    const minimizeBtn = document.getElementById("minimizeBtn");
    const fsBtn = document.getElementById("fsBtn");

    if (document.fullscreenElement || document.webkitFullscreenElement) {
        player.style.display = "none";
        if (minimizeBtn) minimizeBtn.style.display = "none";
        if (fsBtn) fsBtn.innerHTML = "⊠";
        if (fsControls) {
            fsControls.style.opacity = "1";
            fsControls.style.pointerEvents = "auto";
            _startFsHideTimer();
        }
        const modal = document.getElementById("videoModal");
        modal.addEventListener("mousemove", _onFsMouseMove);
        modal.addEventListener("mouseenter", _onFsMouseMove);
    } else {
        player.style.display = "flex";
        if (minimizeBtn) minimizeBtn.style.display = "flex";
        if (fsBtn) fsBtn.innerHTML = "⛶";
        if (fsControls) {
            fsControls.style.opacity = "0";
            fsControls.style.pointerEvents = "none";
        }
        clearTimeout(_fsHideTimer);
        const modal = document.getElementById("videoModal");
        modal.removeEventListener("mousemove", _onFsMouseMove);
        modal.removeEventListener("mouseenter", _onFsMouseMove);
    }
}

function _onFsMouseMove() {
    const fsControls = document.getElementById("fsControls");
    if (fsControls) {
        fsControls.style.opacity = "1";
        fsControls.style.pointerEvents = "auto";
    }
    _startFsHideTimer();
}

function _startFsHideTimer() {
    clearTimeout(_fsHideTimer);
    _fsHideTimer = setTimeout(() => {
        const fsControls = document.getElementById("fsControls");
        if (fsControls && (document.fullscreenElement || document.webkitFullscreenElement)) {
            fsControls.style.opacity = "0";
            fsControls.style.pointerEvents = "none";
        }
    }, 3000);
}

function playVideo_ended() {
    if (queue.length > 0) {
        const next = queue.shift();
        renderQueue();
        if (next.type === 'video') {
            // Siguiente es video: no cerramos el modal, solo cargamos el nuevo video
            openVideo(next.url, next);
        } else {
            // Siguiente es canción: cerramos el modal y cargamos la canción
            closeVideo();
            loadSong(next);
        }
    } else {
        // No hay más en la fila, cerrar el modal
        closeVideo();
    }
}

function minimizeVideo() {
    const modal = document.getElementById("videoModal");
    modal.style.display = "none";

    // Mostrar el mini video en la carátula
    const coverEl = document.getElementById("cover");
    const miniVideoEl = document.getElementById("miniVideoEl");
    const coverContainer = document.getElementById("cover-container");
    const mainVideoPlayer = document.getElementById("videoPlayer");

    if (miniVideoEl && mainVideoPlayer.src) {
        // Sincronizar src y tiempo con el video principal
        miniVideoEl.src = mainVideoPlayer.src;
        miniVideoEl.currentTime = mainVideoPlayer.currentTime;
        miniVideoEl.play().catch(() => {});
        // Mantener mini video en sync con el audio
        audio.ontimeupdate = (function(origFn) {
            return function() {
                origFn && origFn();
                if (miniVideoEl && !modal || modal.style.display === "none") {
                    if (Math.abs(miniVideoEl.currentTime - audio.currentTime) > 0.5) {
                        miniVideoEl.currentTime = audio.currentTime;
                    }
                }
            };
        })(audio.ontimeupdate);

        // Ocultar imagen, mostrar mini video
        coverEl.classList.add("mini-video-hidden");
        miniVideoEl.classList.remove("mini-video-hidden");
    }

    // Indicador visual y cursor
    if (coverContainer) {
        coverContainer.style.cursor = "pointer";
        coverContainer.title = "Click para abrir el video";
        coverContainer.classList.add("video-minimized-indicator");
    }
    // Mostrar botón LYRIOS cuando el video está minimizado
    const lyriosBtnMin = document.getElementById('lyrios-btn');
    if (lyriosBtnMin) lyriosBtnMin.style.display = '';
}

function restoreVideo() {
    if (!activeVideo) return;
    const modal = document.getElementById("videoModal");
    const videoPlayer = document.getElementById("videoPlayer");
    if (modal && videoPlayer.src) {
        // Sincronizar video principal con el mini video antes de mostrarlo
        const miniVideoEl = document.getElementById("miniVideoEl");
        if (miniVideoEl && !miniVideoEl.classList.contains("mini-video-hidden")) {
            videoPlayer.currentTime = miniVideoEl.currentTime;
            miniVideoEl.pause();
            miniVideoEl.src = "";
        }

        // Ocultar mini video, mostrar carátula normal
        const coverEl = document.getElementById("cover");
        coverEl.classList.remove("mini-video-hidden");
        if (miniVideoEl) miniVideoEl.classList.add("mini-video-hidden");

        // Restaurar indicadores del contenedor
        const coverContainer = document.getElementById("cover-container");
        if (coverContainer) {
            coverContainer.classList.remove("video-minimized-indicator");
            coverContainer.title = "";
            coverContainer.style.cursor = "default";
        }

        modal.style.display = "flex";
        // Ocultar botón LYRIOS al restaurar el video
        const lyriosBtnRestore = document.getElementById('lyrios-btn');
        if (lyriosBtnRestore) lyriosBtnRestore.style.display = 'none';
    }
}

async function togglePiP() {
    const videoPlayer = document.getElementById("videoPlayer");
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else if (videoPlayer.src) {
            await videoPlayer.requestPictureInPicture();
        }
    } catch (e) {
        console.warn("PiP no disponible:", e);
    }
}

function toggleFullscreenVideo() {
    const videoModal = document.getElementById("videoModal");
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const fsRequest = videoModal.requestFullscreen || videoModal.webkitRequestFullscreen;
        if (fsRequest) {
            fsRequest.call(videoModal).then(() => {
                // Intentar rotar a landscape en móviles
                try {
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock("landscape").catch(() => {});
                    }
                } catch(e) {}
            }).catch(() => {});
        }
    } else {
        const fsExit = document.exitFullscreen || document.webkitExitFullscreen;
        if (fsExit) {
            fsExit.call(document).then(() => {
                // Restaurar orientación al salir
                try {
                    if (screen.orientation && screen.orientation.unlock) {
                        screen.orientation.unlock();
                    }
                } catch(e) {}
            }).catch(() => {});
        }
    }
}

function closeVideo() {
    const modal = document.getElementById("videoModal");
    const videoPlayer = document.getElementById("videoPlayer");

    // Animación de cierre antes de ocultar
    modal.classList.add("modal-closing");
    setTimeout(() => {
        modal.classList.remove("modal-closing");
        modal.style.display = "none";
    }, 260);

    videoPlayer.pause();
    videoPlayer.src = "";
    audio.pause();
    audio.src = "";
    activeVideo = null;
    playBtn.innerHTML = '<img src="original-b766c1b498d1.png" alt="Play" class="icon-22">';

    // Quitar indicador de video minimizado en la carátula
    const coverEl = document.getElementById("cover");
    coverEl.classList.remove("video-minimized-indicator");
    coverEl.classList.remove("mini-video-hidden");
    coverEl.title = "";
    coverEl.style.cursor = "default";

    // Limpiar mini video en carátula
    const miniVideoEl = document.getElementById("miniVideoEl");
    if (miniVideoEl) {
        miniVideoEl.pause();
        miniVideoEl.src = "";
        miniVideoEl.classList.add("mini-video-hidden");
    }
    const coverContainer = document.getElementById("cover-container");
    if (coverContainer) {
        coverContainer.classList.remove("video-minimized-indicator");
        coverContainer.title = "";
        coverContainer.style.cursor = "default";
    }

    // Restaurar player si estaba oculto por fullscreen
    document.querySelector(".player").style.display = "flex";
    // En móvil: restaurar el player mini al estado normal
    if (isMobile()) _restorePlayerAfterVideo();
    // Restaurar botón LYRIOS al cerrar el video
    const lyriosBtnClose = document.getElementById('lyrios-btn');
    if (lyriosBtnClose) lyriosBtnClose.style.display = '';

    // Restaurar los listeners originales del audio para canciones
    audio.ontimeupdate = () => {
        const currentTime = audio.currentTime;
        const durationTime = audio.duration;
        progress.value = (currentTime / durationTime) * 100 || 0;
        current.innerText = formatTime(currentTime);
        duration.innerText = formatTime(durationTime);
        updateLyricsSync(currentTime);
    };
    audio.onended = handleSongEnd;

    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
}

function playVideo(index) {
    const video = videos[index];
    openVideo(video.url, video);
}

/* ── Controles de video en móvil ── */
function updateMobVideoPlayBtn() {
    const btn = document.getElementById('mob-video-play-btn');
    if (!btn) return;
    const img = btn.querySelector('img');
    if (!img) return;
    img.src = audio.paused ? 'original-b766c1b498d1.png' : 'original-8855ebb60b11.png';
    img.alt = audio.paused ? 'Play' : 'Pausa';
}
function mobVideoSeek(val) {
    if (audio.duration) {
        audio.currentTime = (val / 100) * audio.duration;
        const vp = document.getElementById('videoPlayer');
        if (vp) vp.currentTime = audio.currentTime;
    }
}
function updateMobVideoControls(videoObj) {
    const titleEl = document.getElementById('mob-video-title');
    const artistEl = document.getElementById('mob-video-artist');
    if (titleEl) titleEl.textContent = videoObj ? (videoObj.title || '') : '';
    if (artistEl) artistEl.textContent = videoObj ? (videoObj.artist || '') : '';
    updateMobVideoPlayBtn();
}
function _syncMobVideoBar(currentTime, durationTime) {
    const rangeEl = document.getElementById('mob-video-range');
    const curEl = document.getElementById('mob-video-current');
    const durEl = document.getElementById('mob-video-duration');
    if (rangeEl && durationTime) rangeEl.value = (currentTime / durationTime) * 100 || 0;
    if (curEl) curEl.textContent = formatTime(currentTime);
    if (durEl) durEl.textContent = formatTime(durationTime);
}

function toggleVidMenu(event, index) {
    event.stopPropagation(); // Evita que el video se reproduzca al tocar los puntos
    
    // Cerrar todos los demás menús de video primero
    document.querySelectorAll('[id^="vid-menu-"]').forEach(menu => {
        if (menu.id !== `vid-menu-${index}`) menu.style.display = 'none';
    });

    const menu = document.getElementById(`vid-menu-${index}`);
    menu.style.display = menu.style.display === "none" ? "block" : "none";
}
function addVidToQueue(event, index) {
    event.stopPropagation();
    const video = videos[index];
    const itemParaFila = {
        title: video.title,
        artist: video.artist || "Artista Desconocido",
        cover: video.cover,
        url: video.url,
        type: "video"
    };
    // Usamos la fila principal directamente
    queue.push(itemParaFila);
    renderQueue();
    
    // Cerrar el menú después de hacer clic
    const menu = document.getElementById(`vid-menu-${index}`);
    if (menu) menu.style.display = "none";
}

// Cerrar los menús si el usuario hace clic en cualquier otro lado de la pantalla
document.addEventListener("click", () => {
    document.querySelectorAll('[id^="vid-menu-"]').forEach(m => m.style.display = "none");
    document.querySelectorAll('[id^="vid-grid-menu-"]').forEach(m => m.style.display = "none");
});

function toggleVidMenuGrid(event, index) {
    event.stopPropagation();
    document.querySelectorAll('[id^="vid-grid-menu-"]').forEach(m => {
        if (m.id !== `vid-grid-menu-${index}`) m.style.display = 'none';
    });
    const menu = document.getElementById(`vid-grid-menu-${index}`);
    if (menu) {
        menu.style.display = (menu.style.display === "none" || menu.style.display === "") ? "block" : "none";
    }
}

function toggleVidMenu(event, index) {
    event.stopPropagation(); // Esto evita que al dar clic en los puntos se reproduzca el video
    
    // Primero cerramos cualquier otro menú que esté abierto
    document.querySelectorAll('[id^="vid-menu-"]').forEach(m => m.style.display = 'none');
    
    // Abrimos el menú al que le dimos clic
    const menu = document.getElementById(`vid-menu-${index}`);
    if (menu.style.display === "none" || menu.style.display === "") {
        menu.style.display = "block";
    } else {
        menu.style.display = "none";
    }
}

