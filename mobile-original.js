
/* ─── Render videos as list in mobile Inicio ─── */
function renderMobVideosInHome() {
    if (!isMobile()) return;
    const songListEl = document.getElementById('songList');
    if (!songListEl) return;

    // Remove existing video section if any
    let existingVidSec = document.getElementById('mob-home-videos');
    if (existingVidSec) existingVidSec.remove();

    const section = document.createElement('div');
    section.id = 'mob-home-videos';
    section.style.cssText = 'margin-top:16px;';

    const header = document.createElement('div');
    header.style.cssText = 'padding:0 16px; margin-bottom:8px;';
    header.innerHTML = '<h3 class="section-title">🎬 Videos</h3>';
    section.appendChild(header);

    if (typeof videos !== 'undefined') {
        videos.forEach((video, index) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px 16px;cursor:pointer;border-bottom:1px solid #1a1a1a;';
            row.onmouseenter = () => row.style.background = 'rgba(255,255,255,0.04)';
            row.onmouseleave = () => row.style.background = 'transparent';
            row.onclick = () => playVideo(index);

            const coverSrc = video.cover || 'https://via.placeholder.com/48x48/1a1a1a/666?text=V';
            row.innerHTML = `
                <div class="pos-rel-shrink">
                    <img src="${coverSrc}" class="thumb-48-block">
                    <div class="thumb-overlay"><img src="original-b766c1b498d1.png" alt="Play" class="icon-20"></div>
                </div>
                <div class="flex-min">
                    <div class="track-title-text">${video.title}</div>
                    <div class="track-artist-text">${video.artist || 'Artista Desconocido'}</div>
                </div>
                <button onclick="event.stopPropagation(); addVidToQueue(event, ${index});" class="btn-icon-muted">⋮</button>
            `;
            section.appendChild(row);
        });
    }

    // Insert after songList
    songListEl.parentNode.insertBefore(section, songListEl.nextSibling);
}

/* ─── MOBILE TAB NAVIGATION ─── */
function isMobile() {
    return window.innerWidth <= 768;
}

function mobSwitchTab(tab) {
    if (!isMobile()) return;

    // Reset all tabs
    document.querySelectorAll('.mob-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');

    const mainContent = document.querySelector('.main-content');
    const topBar = document.querySelector('.top-bar');
    const topBarH1 = topBar ? topBar.querySelector('h1') : null;
    const searchInput = document.getElementById('search');

    const artistSection = document.getElementById('artistSection');
    const suggestedSection = document.getElementById('suggestedSection');
    const albumSection = document.getElementById('albumSection');
    const songHeaderFlex = document.querySelector('.song-header-flex');
    const songList = document.getElementById('songList');

    // Remove mobile views
    let collView = document.getElementById('mob-collection-panel');
    if (collView) collView.remove();
    let searchView = document.getElementById('mob-search-panel');
    if (searchView) searchView.remove();

    if (tab === 'explorar') {
        // Show everything normally
        mainContent.style.display = '';
        if (topBar) topBar.style.display = '';
        if (topBarH1) topBarH1.textContent = 'Explorar';
        if (searchInput) searchInput.style.display = 'none'; // hide inline search
        if (artistSection) artistSection.style.display = '';
        if (suggestedSection) suggestedSection.style.display = '';
        if (albumSection) albumSection.style.display = '';
        if (songHeaderFlex) songHeaderFlex.style.display = '';
        if (songList) songList.style.display = '';
        // Restore main page
        showHeaderSections();
        renderSongs(songs);
        document.getElementById('viewTitle').innerText = 'Todas las canciones';

    } else if (tab === 'buscar') {
        // Show search panel
        mainContent.style.display = '';
        if (topBar) topBar.style.display = '';
        if (topBarH1) topBarH1.textContent = 'Buscar';
        if (searchInput) {
            searchInput.style.display = 'block';
            searchInput.style.width = '100%';
            searchInput.style.marginTop = '10px';
            searchInput.placeholder = 'Buscar canciones, artistas...';
            searchInput.focus();
        }
        if (artistSection) artistSection.style.display = 'none';
        if (suggestedSection) suggestedSection.style.display = 'none';
        if (albumSection) albumSection.style.display = 'none';
        if (songHeaderFlex) songHeaderFlex.style.display = '';
        if (songList) songList.style.display = '';
        document.getElementById('viewTitle').innerText = '';
        renderSongs(songs);

    } else if (tab === 'coleccion') {
        // Show collection
        mainContent.style.display = '';
        if (topBar) topBar.style.display = '';
        if (topBarH1) topBarH1.textContent = 'Colección';
        if (searchInput) searchInput.style.display = 'none';
        if (artistSection) artistSection.style.display = 'none';
        if (suggestedSection) suggestedSection.style.display = 'none';
        if (albumSection) albumSection.style.display = 'none';
        if (songHeaderFlex) songHeaderFlex.style.display = 'none';
        if (songList) songList.style.display = 'none';

        // Build collection panel
        const panel = document.createElement('div');
        panel.id = 'mob-collection-panel';
        panel.style.cssText = 'padding: 0 16px;';

        // Profile row
        const userPicSrc = document.getElementById('userPic') ? document.getElementById('userPic').src : '';
        const userName = document.getElementById('displayUsername') ? document.getElementById('displayUsername').textContent : 'Usuario';
        panel.innerHTML = `
            <div class="header-row">
                <div class="flex-row-gap">
                    <img src="${userPicSrc}" class="avatar-32" onerror="this.style.display='none'">
                    <span class="text-muted-14">${userName}</span>
                </div>
                <button onclick="logout()" class="btn-danger-sm">Salir</button>
            </div>
            <h2 class="modal-title">Tus Playlists</h2>
            <div class="mb-20">
                <button onclick="mobCreatePlaylist()" class="mob-create-btn">+ Crear Playlist</button>
            </div>
            <div id="mob-playlist-list" class="flex-col-gap2"></div>

        `;
        mainContent.appendChild(panel);

        // Render playlists in the panel
        const mobPlList = panel.querySelector('#mob-playlist-list');
        if (typeof playlists !== 'undefined') {
            if (playlists.length === 0) {
                mobPlList.innerHTML = '<p class="text-dark-muted">No tienes playlists aún.</p>';
            } else {
                playlists.forEach((pl, i) => {
                    const item = document.createElement('div');
                    item.style.cssText = 'display:flex;align-items:center;gap:14px;padding:10px 0;cursor:pointer;border-bottom:1px solid #1a1a1a;';
                    // Portada: primera canción de la playlist o ícono por defecto
                    const coverSrc = (pl.songs && pl.songs.length > 0 && pl.songs[0].cover) ? pl.songs[0].cover : '';
                    const coverHtml = coverSrc
                        ? `<img src="${coverSrc}" class="queue-thumb-sm">`
                        : `<div class="thumb-placeholder">♪</div>`;
                    item.innerHTML = `
                        ${coverHtml}
                        <div class="flex-min">
                            <div class="track-title-text">${pl.name}</div>
                            <div class="text-xs-muted">Playlist · ${pl.songs ? pl.songs.length : 0} canciones</div>
                        </div>
                        <button onclick="event.stopPropagation(); mobDeletePlaylist(${i})" class="btn-icon-dark">🗑</button>
                    `;
                    item.onclick = () => mobOpenPlaylistSongs(i);
                    mobPlList.appendChild(item);
                });
            }
        }
    }
}

/* ─── Crear playlist desde móvil ─── */
function mobCreatePlaylist() {
    const name = prompt("Nombre de la playlist:");
    if (!name) return;
    playlists.push({ name: name, songs: [] });
    savePlaylists();
    mobSwitchTab('coleccion');
}

/* ─── Abrir canciones de una playlist en móvil (igual que un álbum) ─── */
function mobOpenPlaylistSongs(index) {
    const pl = playlists[index];
    if (!pl) return;

    // Remover panel de colección si existe
    let collView = document.getElementById('mob-collection-panel');
    if (collView) collView.remove();

    // Mostrar el songList con las canciones de la playlist
    const mainContent = document.querySelector('.main-content');
    const artistSection = document.getElementById('artistSection');
    const suggestedSection = document.getElementById('suggestedSection');
    const albumSection = document.getElementById('albumSection');
    const songHeaderFlex = document.querySelector('.song-header-flex');
    const songListEl = document.getElementById('songList');
    const topBar = document.querySelector('.top-bar');
    const topBarH1 = topBar ? topBar.querySelector('h1') : null;
    const searchInput = document.getElementById('search');

    mainContent.style.display = '';
    if (topBar) topBar.style.display = '';
    if (searchInput) searchInput.style.display = 'none';
    if (artistSection) artistSection.style.display = 'none';
    if (suggestedSection) suggestedSection.style.display = 'none';
    if (albumSection) albumSection.style.display = 'none';
    if (songHeaderFlex) songHeaderFlex.style.display = '';
    if (songListEl) songListEl.style.display = '';

    // Título con flecha para volver
    if (topBarH1) topBarH1.textContent = '';
    document.getElementById('viewTitle').innerText = pl.name;

    // Agregar botón "Volver" encima del listado
    if (songListEl) {
        songListEl.innerHTML = '';
        // Back button
        const backBtn = document.createElement('button');
        backBtn.style.cssText = 'background:none;border:none;color:#b3b3b3;font-size:14px;padding:8px 0;cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:8px;';
        backBtn.innerHTML = '‹ Colección';
        backBtn.onclick = () => mobSwitchTab('coleccion');
        songListEl.appendChild(backBtn);

        if (pl.songs.length === 0) {
            const empty = document.createElement('p');
            empty.style.cssText = 'color:#555;font-size:14px;padding:20px 0;';
            empty.textContent = 'Esta playlist no tiene canciones aún.';
            songListEl.appendChild(empty);
            return;
        }

        // Botón reproducir todo
        const playAllBtn = document.createElement('button');
        playAllBtn.style.cssText = 'width:100%;background:#1db954;color:#fff;font-size:14px;font-weight:700;padding:12px;border-radius:10px;margin-bottom:14px;border:none;cursor:pointer;';
        playAllBtn.innerHTML = '<img src="original-b766c1b498d1.png" alt="Play" class="icon-16-mid"> Reproducir todo';
        playAllBtn.onclick = () => {
            // Cargar primera y poner el resto en cola
            currentAlbumContext = pl.songs.slice();
            loadSongInAlbum(0);
        };
        songListEl.appendChild(playAllBtn);

        // Listar canciones estilo lista (como álbum en móvil)
        pl.songs.forEach((song, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #1a1a1a;cursor:pointer;';
            row.onmouseenter = () => row.style.background = 'rgba(255,255,255,0.04)';
            row.onmouseleave = () => row.style.background = 'transparent';
            row.onclick = () => {
                currentAlbumContext = pl.songs.slice();
                loadSongInAlbum(idx);
            };
            row.innerHTML = `
                <img src="${song.cover || ''}" class="queue-thumb-sm">
                <div class="flex-min">
                    <div class="track-title-text">${song.title}</div>
                    <div class="track-artist-text">${song.artist || ''}</div>
                </div>
                <button onclick="event.stopPropagation(); queue.push(playlists[${index}].songs[${idx}]); renderQueue();" 
                    class="btn-icon-muted-18">+</button>
            `;
            songListEl.appendChild(row);
        });
    }
}

/* ─── Eliminar playlist desde móvil ─── */
function mobDeletePlaylist(index) {
    const confirmDelete = confirm('¿Eliminar esta playlist?');
    if (!confirmDelete) return;
    playlists.splice(index, 1);
    savePlaylists();
    mobSwitchTab('coleccion');
}

/* ─── Ir a videos desde móvil ─── */
function mobGoVideos() {
    document.querySelectorAll('.mob-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-explorar').classList.add('active');

    const mainContent = document.querySelector('.main-content');
    const artistSection = document.getElementById('artistSection');
    const suggestedSection = document.getElementById('suggestedSection');
    const albumSection = document.getElementById('albumSection');
    const songHeaderFlex = document.querySelector('.song-header-flex');
    const songList = document.getElementById('songList');
    const searchInput = document.getElementById('search');
    const topBar = document.querySelector('.top-bar');
    const topBarH1 = topBar ? topBar.querySelector('h1') : null;

    let collView = document.getElementById('mob-collection-panel');
    if (collView) collView.remove();

    mainContent.style.display = '';
    if (topBar) topBar.style.display = '';
    if (topBarH1) topBarH1.textContent = 'Videos';
    if (searchInput) searchInput.style.display = 'none';
    if (artistSection) artistSection.style.display = 'none';
    if (suggestedSection) suggestedSection.style.display = 'none';
    if (albumSection) albumSection.style.display = 'none';
    if (songHeaderFlex) songHeaderFlex.style.display = '';
    if (songList) songList.style.display = '';

    openVideos();
}

// =========================================
// --- MOBILE FULL PLAYER MODAL ---
// =========================================

function isMobile() {
    return window.innerWidth <= 768;
}

function openMobPlayerModal() {
    if (!isMobile()) return;
    const modal = document.getElementById('mob-player-modal');

    // Cancelar cualquier cierre pendiente
    if (modal._closeTimer) { clearTimeout(modal._closeTimer); modal._closeTimer = null; }

    // Resetear completamente el estado del modal
    modal.classList.remove('is-open', 'is-closing');
    modal.style.display = 'none';
    // Forzar reflow para que el navegador reconozca el cambio
    void modal.offsetWidth;
    // Ahora mostrar y animar
    modal.style.display = 'flex';
    void modal.offsetWidth;
    modal.classList.add('is-open');
    // Quitar clase de animación después de que termine (con fallback para Android)
    const tid = setTimeout(() => modal.classList.remove('is-open'), 450);
    modal.addEventListener('animationend', function h() {
        clearTimeout(tid);
        modal.classList.remove('is-open');
        modal.removeEventListener('animationend', h);
    });

    updateMobPlayerInfo();
    updateMobPlayerBtn();
    window.history.pushState({ omusicView: 'player' }, '');
    const lyriosBtnMob = document.getElementById('lyrios-btn');
    if (lyriosBtnMob) lyriosBtnMob.style.display = 'none';
}

function closeMobPlayerModal() {
    _cleanMobSubPanels();
    closeMobDotsMenu();
    const modal = document.getElementById('mob-player-modal');

    // Si no está visible, no hacer nada
    if (modal.style.display === 'none' || !modal.style.display) return;

    modal.classList.remove('is-open');
    modal.classList.add('is-closing');

    // Siempre ocultar con timeout (Android no dispara animationend confiablemente)
    if (modal._closeTimer) clearTimeout(modal._closeTimer);
    modal._closeTimer = setTimeout(() => {
        modal.classList.remove('is-closing');
        modal.style.display = 'none';
        modal._closeTimer = null;
    }, 350);
    modal.addEventListener('animationend', function h() {
        if (modal._closeTimer) { clearTimeout(modal._closeTimer); modal._closeTimer = null; }
        modal.classList.remove('is-closing');
        modal.style.display = 'none';
        modal.removeEventListener('animationend', h);
    });

    const lyriosBtnMobClose = document.getElementById('lyrios-btn');
    if (lyriosBtnMobClose) lyriosBtnMobClose.style.display = '';
}

/* ── Menú de 3 puntos ── */
function toggleMobDotsMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('mob-dots-menu');
    if (menu.style.display === 'none' || !menu.style.display) {
        const sub = document.getElementById('mob-dots-playlist-sub');
        sub.innerHTML = '';
        sub.classList.remove('open');
        document.getElementById('mob-pl-arrow').textContent = '▸';
        if (typeof playlists !== 'undefined' && playlists.length > 0) {
            playlists.forEach((pl, i) => {
                const btn = document.createElement('button');
                btn.textContent = pl.name;
                btn.onclick = () => { mobMenuAddToPlaylist(i); closeMobDotsMenu(); };
                sub.appendChild(btn);
            });
        } else {
            sub.innerHTML = '<button class="text-disabled">Sin playlists</button>';
        }
        menu.style.display = 'block';
    } else {
        closeMobDotsMenu();
    }
}
function closeMobDotsMenu() {
    const menu = document.getElementById('mob-dots-menu');
    if (menu) menu.style.display = 'none';
}
function mobMenuTogglePlaylistSub(e) {
    e.stopPropagation();
    const sub = document.getElementById('mob-dots-playlist-sub');
    const arrow = document.getElementById('mob-pl-arrow');
    const open = sub.classList.toggle('open');
    arrow.textContent = open ? '▾' : '▸';
}
function mobMenuAddToQueue() {
    const titleEl = document.getElementById('title');
    const artistEl = document.getElementById('artist');
    const coverEl = document.getElementById('cover');
    const audioEl = document.getElementById('audio');
    if (!titleEl || !titleEl.innerText) return;
    const item = { title: titleEl.innerText, artist: artistEl ? artistEl.innerText : '', cover: coverEl ? coverEl.src : '', url: audioEl ? audioEl.src : '' };
    if (typeof queue !== 'undefined') { queue.push(item); if (typeof renderQueue === 'function') renderQueue(); }
    closeMobDotsMenu();
}
function mobMenuAddToPlaylist(idx) {
    const titleEl = document.getElementById('title');
    const artistEl = document.getElementById('artist');
    const coverEl = document.getElementById('cover');
    const audioEl = document.getElementById('audio');
    if (!titleEl || !titleEl.innerText || !playlists[idx]) return;
    const item = { title: titleEl.innerText, artist: artistEl ? artistEl.innerText : '', cover: coverEl ? coverEl.src : '', url: audioEl ? audioEl.src : '' };
    if (!playlists[idx].songs) playlists[idx].songs = [];
    playlists[idx].songs.push(item);
    if (typeof savePlaylists === 'function') savePlaylists();
    closeMobDotsMenu();
}
document.addEventListener('click', function(e) {
    const menu = document.getElementById('mob-dots-menu');
    if (menu && menu.style.display !== 'none' && !menu.contains(e.target)) closeMobDotsMenu();
});

function _cleanMobSubPanels() {
    const modal = document.getElementById('mob-player-modal');
    if (!modal) return;
    // Eliminar paneles inline de letras y fila
    const lp = document.getElementById('mob-lyrics-panel');
    if (lp) { clearInterval(modal._lyricsSyncInterval); lp.remove(); }
    const qp = document.getElementById('mob-queue-panel');
    if (qp) qp.remove();
    modal.dataset.lyricsOpen = '0';
    modal.dataset.queueOpen = '0';
}

/* ── Vista de Letras en móvil — usa el mismo overlay que en PC ── */
function openMobLyricsView() {
    // Actualizar metadatos en el overlay antes de abrir
    const coverSrc = document.getElementById('mob-player-cover').src;
    const titleTxt = document.getElementById('mob-player-title').innerText;
    const artistTxt = document.getElementById('mob-player-artist').innerText;
    const metaTitle = document.getElementById('lyrics-meta-title');
    const metaArtist = document.getElementById('lyrics-meta-artist');
    if (metaTitle) metaTitle.innerText = titleTxt;
    if (metaArtist) metaArtist.innerText = artistTxt;

    // Reusar la misma función de desktop (quita la restricción de isMobile)
    const overlay = document.getElementById('lyrics-overlay');
    if (!overlay.classList.contains('active')) {
        overlay.style.display = 'grid';
        setTimeout(() => overlay.classList.add('active'), 10);
        // Registrar en el historial para el botón retroceso
        if (isMobile()) window.history.pushState({ omusicView: 'lyrics' }, '');
    }
}

function closeMobLyricsView() {
    const overlay = document.getElementById('lyrics-overlay');
    overlay.classList.remove('active');
    setTimeout(() => { overlay.style.display = 'none'; }, 350);
}

/* ── Vista de Fila inline dentro del modal móvil ── */
function openMobQueueView() {
    const modal = document.getElementById('mob-player-modal');
    if (modal.dataset.queueOpen === '1') return;
    modal.dataset.queueOpen = '1';

    const coverSrc = document.getElementById('mob-player-cover').src;

    const qPanel = document.createElement('div');
    qPanel.id = 'mob-queue-panel';
    qPanel.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;display:flex;flex-direction:column;overflow:hidden;background:#111;';

    qPanel.innerHTML = `
        <div style="position:absolute;inset:0;background-image:url('${coverSrc}');background-size:cover;background-position:center;filter:blur(30px) brightness(0.2);transform:scale(1.1);z-index:0;"></div>
        <div class="fs-topbar">
            <button onclick="closeMobQueueView()" class="fs-close-btn">✕</button>
            <span class="fs-label">Fila de reproducción</span>
            <div class="w-36"></div>
        </div>
        <div id="mob-queue-list" class="fs-content"></div>
    `;

    modal.style.position = 'fixed';
    modal.appendChild(qPanel);

    const listEl = qPanel.querySelector('#mob-queue-list');
    if (typeof queue !== 'undefined' && queue.length > 0) {
        queue.forEach((item, i) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);cursor:pointer;';
            row.innerHTML = `
                <img src="${item.cover || ''}" class="thumb-48-rounded">
                <div class="flex-min">
                    <div class="track-title-text">${item.title}</div>
                    <div class="text-xs-faded">${item.artist || ''}</div>
                </div>
            `;
            row.onclick = () => {
                const picked = queue.splice(i, 1)[0];
                renderQueue();
                loadSong(picked);
                closeMobQueueView();
            };
            listEl.appendChild(row);
        });
    } else {
        listEl.innerHTML = '<p class="empty-state">La fila está vacía</p>';
    }
}

function closeMobQueueView() {
    const modal = document.getElementById('mob-player-modal');
    modal.dataset.queueOpen = '0';
    const p = document.getElementById('mob-queue-panel');
    if (p) p.remove();
}

function updateMobPlayerInfo() {
    const titleEl = document.getElementById('mob-player-title');
    const artistEl = document.getElementById('mob-player-artist');
    const coverEl = document.getElementById('mob-player-cover');
    const coverVideoEl = document.getElementById('mob-player-cover-video');
    const bg = document.getElementById('mob-player-bg');
    const titleSrc = document.getElementById('title').innerText;
    const artistSrc = document.getElementById('artist').innerText;
    const coverSrc = document.getElementById('cover').src;
    if (titleEl) titleEl.innerText = titleSrc;
    if (artistEl) { if (typeof omArtistLinks === 'function') artistEl.innerHTML = omArtistLinks(currentSong?.artist || artistSrc); else artistEl.innerText = artistSrc; }
    if (bg && coverSrc) bg.style.backgroundImage = `url('${coverSrc}')`;

    // Mostrar video animado si la canción tiene coverVideo, si no mostrar imagen
    const hasCoverVideo = currentSong && currentSong.coverVideo;
    if (coverVideoEl && coverEl) {
        if (hasCoverVideo) {
            coverVideoEl.src = currentSong.coverVideo;
            coverVideoEl.poster = currentSong.cover || '';
            coverVideoEl.classList.remove('mob-cover-video-hidden');
            coverEl.classList.add('mob-cover-img-hidden');
        } else {
            coverVideoEl.src = '';
            coverVideoEl.classList.add('mob-cover-video-hidden');
            coverEl.classList.remove('mob-cover-img-hidden');
            if (coverEl) coverEl.src = coverSrc;
        }
    } else if (coverEl) {
        coverEl.src = coverSrc;
    }
}

function updateMobPlayerBtn() {
    const btn = document.getElementById('mob-play-btn');
    if (btn) {
        btn.innerHTML = audio.paused ? '<img src="original-b766c1b498d1.png" alt="Play" class="icon-22">' : '<img src="original-8855ebb60b11.png" alt="Pausa" class="icon-22">';
    }
}

function mobSeek(val) {
    if (audio.duration) {
        audio.currentTime = (val / 100) * audio.duration;
    }
}

function toggleMobHeart() {
    const btn = document.getElementById('mob-heart-btn');
    if (btn) btn.innerText = btn.innerText === '♡' ? '♥' : '♡';
}

// Hook into audio events to keep modal in sync
const _origAudioTimeUpdate = audio.ontimeupdate;
audio.addEventListener('timeupdate', function() {
    const rangeEl = document.getElementById('mob-progress-range');
    const curEl = document.getElementById('mob-current-time');
    const durEl = document.getElementById('mob-duration');
    if (rangeEl && audio.duration) rangeEl.value = (audio.currentTime / audio.duration) * 100;
    if (curEl) curEl.innerText = formatTime(audio.currentTime);
    if (durEl) durEl.innerText = formatTime(audio.duration);
});

audio.addEventListener('play', updateMobPlayerBtn);
audio.addEventListener('pause', updateMobPlayerBtn);
audio.addEventListener('play', updateMobVideoPlayBtn);
audio.addEventListener('pause', updateMobVideoPlayBtn);

// Show tap zone only on mobile
function applyMobTapZone() {
    const zone = document.getElementById('mob-player-tap-zone');
    if (zone) zone.style.display = isMobile() ? 'block' : 'none';
}
window.addEventListener('resize', applyMobTapZone);

document.addEventListener('DOMContentLoaded', function() {
    applyMobTapZone();
    // La interfaz actual ya abrió Inicio o el enlace compartido durante su arranque.
    if (typeof OM !== 'undefined') {
        window.omOpenSharedRoute?.(false);
        return;
    }
    if (isMobile()) {
        const searchInput = document.getElementById('search');
        if (searchInput) searchInput.style.display = 'none';
        mobSwitchTab('explorar');
    } else {
        openMusicaView();
    }
});

const _origLoadSongForMob = loadSong;

window.addEventListener('resize', function() {
    if (!isMobile()) {
        // Restore desktop
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.style.display = '';
            searchInput.style.width = '';
            searchInput.style.marginTop = '';
        }
        const artistSection = document.getElementById('artistSection');
        const suggestedSection = document.getElementById('suggestedSection');
        const albumSection = document.getElementById('albumSection');
        const recommendedAlbumsSection = document.getElementById('recommendedAlbumsSection');
        const songHeaderFlex = document.querySelector('.song-header-flex');
        const songList = document.getElementById('songList');
        if (artistSection) artistSection.style.display = '';
        if (suggestedSection) suggestedSection.style.display = '';
        if (albumSection) albumSection.style.display = '';
        if (recommendedAlbumsSection) recommendedAlbumsSection.style.display = '';
        if (songHeaderFlex) songHeaderFlex.style.display = '';
        if (songList) songList.style.display = '';
        let panel = document.getElementById('mob-collection-panel');
        if (panel) panel.remove();
    }
});

function _expandPlayerForVideo() {
    if (!isMobile()) return;
    const player = document.querySelector('.player');
    if (!player) return;

    player.classList.add('video-expanded');

    const tapZone = document.getElementById('mob-player-tap-zone');
    if (tapZone) tapZone.style.display = 'none';

    setTimeout(() => {
        const playerH = player.offsetHeight;
        const tabH = 56; // tab bar
        const videoModal = document.getElementById('videoModal');
        if (videoModal) {
            videoModal.style.height = 'calc(100% - ' + tabH + 'px - ' + playerH + 'px)';
        }
    }, 50);
}

function _restorePlayerAfterVideo() {
    if (!isMobile()) return;
    const player = document.querySelector('.player');
    if (!player) return;

    // Quitar clase — el CSS de móvil restaura los estilos originales
    player.classList.remove('video-expanded');

    // Restaurar la zona tapable del reproductor móvil (siempre visible en móvil)
    const tapZone = document.getElementById('mob-player-tap-zone');
    if (tapZone) tapZone.style.display = 'block';

    const videoModal = document.getElementById('videoModal');
    if (videoModal) {
        videoModal.style.height = '';
    }
}

let shuffleActive = false;
let repeatActive = false;

function toggleShuffle() {
    shuffleActive = !shuffleActive;
    document.getElementById('btn-shuffle').classList.toggle('mode-active', shuffleActive);
}

function toggleRepeat() {
    repeatActive = !repeatActive;
    document.getElementById('btn-repeat').classList.toggle('mode-active', repeatActive);
}

function handleSongEnd() {
    if (repeatActive) {
        audio.currentTime = 0;
        audio.play();
        return;
    }
    if (shuffleActive) {
        // Construir lista de donde reproducir (álbum, playlist o canciones globales)
        const context = currentAlbumContext ? currentAlbumContext : songs;
        // Evitar repetir la canción actual
        const available = context.filter(s => s.url !== audio.src);
        if (available.length === 0) { audio.currentTime = 0; audio.play(); return; }
        const randomSong = available[Math.floor(Math.random() * available.length)];
        loadSong(randomSong);
        return;
    }
    playNext();
}


window.addEventListener('popstate', function(e) {
    if (!isMobile()) return;
    if (window.OMMusicRoutes?.handlesPopstate(e)) return;

    const state = e.state;

    const videoModal = document.getElementById('videoModal');
    if (videoModal && videoModal.style.display === 'flex') {
        minimizeVideo();
        return;
    }

    const lyricsOverlayEl = document.getElementById('lyrics-overlay');
    if (lyricsOverlayEl && lyricsOverlayEl.classList.contains('active')) {
        closeMobLyricsView();
        return;
    }

    const mobModal = document.getElementById('mob-player-modal');
    if (mobModal && mobModal.style.display === 'flex') {
        closeMobPlayerModal();
        return;
    }

    if (state && state.omusicView) return;
    mobSwitchTab('explorar');
});
