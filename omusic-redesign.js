/* OMUSIC · nueva interfaz. Los archivos originales se conservan completos. */
'use strict';
const OM = {
  view: 'home', libraryFilter: 'all', libraryQuery: '', route: null, back: [], forward: [],
  activeList: [], playbackList: [], liked: new Set(), savedAlbums: new Set(), followedArtists: new Set(), recent: [], listens: {}, listenRequest: null, sessionRequest: 0, currentPlaylist: null, artistContext: null,
  durations: {}, durationQueue: [], durationPending: new Set(), durationFailed: new Set(), durationWorkers: 0, lyricRequest: 0, lyricTimer: null, lastVolume: .7, focusedBeforeDialog: null
};
const $om = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, size = 22) => {
  const paths = {
    friends:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
    settings:'<path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z"/><circle cx="12" cy="12" r="3"/>',
    edit:'<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m13 6 5 5"/>',
    share:'<path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8"/>',
    globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
    library:'<path d="M4 4v16M9 4v16M15 4l5 15"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    check:'<path d="m6 12 4 4 8-9"/>',
    save:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    play:'<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',
    pause:'<path d="M7 4h4v16H7zM14 4h4v16h-4z" fill="currentColor" stroke="none"/>',
    next:'<path d="m4 5 12 7-12 7Z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>',
    prev:'<path d="m20 5-12 7 12 7Z" fill="currentColor" stroke="none"/><path d="M5 5v14"/>',
    shuffle:'<path d="M3 6h3c5 0 7 12 12 12h3M3 18h3c2 0 4-3 5-5M14 8c1-1 2-2 4-2h3m-3-3 3 3-3 3m0 6 3 3-3 3"/>',
    repeat:'<path d="m17 2 4 4-4 4M3 10V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14 0v2a2 2 0 0 1-2 2H3"/>',
    queue:'<path d="M3 5h18M3 10h12M3 15h12M3 20h12m4-6 4 3-4 3Z"/>',
    mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
    volume:'<path d="M11 4 5 9H2v6h3l6 5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute:'<path d="M11 4 5 9H2v6h3l6 5ZM16 9l6 6m0-6-6 6"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    pin:'<path d="m15 3 6 6-4 1-4 6-2-2-6 7m3-10 6-4 1-4m-7 8 8 8"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    video:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>',
    sparkle:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
    panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    collapse:'<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    moon:'<path d="M21 14A9 9 0 0 1 10 3a9 9 0 1 0 11 11Z"/>',
    text:'<path d="M3 5h18M12 5v16M8 21h8"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    logout:'<path d="M9 3H4v18h5M9 12h12m-5-5 5 5-5 5"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.music}</svg>`;
};
const brand = `<svg class="om-brand-symbol" width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect width="36" height="36" rx="18" fill="currentColor"/><path d="M10 17v5m5-10v15m6-18v15m5-9v6" stroke="#000" stroke-width="3" stroke-linecap="round"/></svg>`;
const img = (url, name = '', cls = '') => `<img src="${esc(url || 'placeholder.svg')}" alt="${esc(name)}" class="${cls}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='placeholder.svg'">`;
const normal = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const albumsOM = [...new Set(songs.map(s => s.album).filter(Boolean))].map(name => {
  const list=songs.filter(s=>s.album===name),credits=new Map();
  for(const song of list)for(const artist of new Set(song.artist.split(',').map(a=>a.trim()).filter(Boolean))){const key=normal(artist),credit=credits.get(key)||{name:artist,count:0};credit.count++;credits.set(key,credit);}
  const max=Math.max(...[...credits.values()].map(c=>c.count)),artists=[...credits.values()].filter(c=>c.count===max).map(c=>c.name);
  return {name,songs:list,cover:list[0].cover,artist:artists.join(', '),artists};
});
const albumOM = name => albumsOM.find(a => a.name.trim() === name.trim());
const getArtistOM = key => [...document.querySelectorAll('[data-artist-name]')].find(e=>[normal(e.dataset.artistName),normal(e.querySelector('p')?.textContent)].includes(normal(key)));
const artistPhotoOM = key => getArtistOM(key)?.dataset.artistPhoto || songs.find(s=>omArtistMatches(s,key))?.cover;
function omArtistRecord(key){
  const node=getArtistOM(key);return {key:node?.dataset.artistName||String(key||'').trim(),name:node?.querySelector('p')?.textContent||String(key||'').trim(),photo:node?.dataset.artistPhoto||''};
}
function omArtistLinks(credits){
  return String(credits||'').split(',').map(name=>name.trim()).filter(Boolean).map(name=>`<button type="button" class="om-artist-link" onclick="omOpenArtistCredit(event,${esc(JSON.stringify(name))})" aria-label="Ver perfil de ${esc(name)}">${esc(name)}</button>`).join(', ');
}
function omOpenArtistCredit(event,name){
  event?.preventDefault();event?.stopPropagation();
  if(typeof omCloseImmersive==='function')omCloseImmersive();
  if($om('mob-player-modal')?.style.display==='flex'&&typeof closeMobPlayerModal==='function')closeMobPlayerModal();
  openArtistProfile(name);
}
function omSyncArtistLinks(){
  if(!currentSong)return;
  for(const id of ['artist','lyrics-meta-artist','mob-player-artist','fsArtistText','mob-video-artist']){const node=$om(id);if(node)node.innerHTML=omArtistLinks(currentSong.artist);}
}
function omArtistMatches(song,key){
  const artist=omArtistRecord(key),aliases=[normal(artist.key),normal(artist.name)].filter(Boolean);
  return normal(song.artist).split(',').some(credit=>aliases.some(alias=>credit.trim()===alias||credit.trim().startsWith(alias+' ')));
}
function omArtistAlbums(key){return albumsOM.filter(album=>album.artists.some(artist=>omArtistMatches({artist},key)));}
function omArtistVideos(key){
  const artist=omArtistRecord(key),aliases=[artist.key,artist.name].map(name=>normal(name).trim());
  return videos.filter(video=>video.url&&String(video.artist||'').split(',').some(name=>{
    const credit=omArtistRecord(name.trim());
    return [credit.key,credit.name].some(value=>aliases.includes(normal(value).trim()));
  }));
}
function omFollowArtistButton(key){
  const artist=omArtistRecord(key),following=OM.followedArtists.has(artist.key);
  return `<button class="om-artist-follow ${following?'following':''}" data-follow-artist="${esc(artist.key)}" onclick="omToggleFollowArtist(${esc(JSON.stringify(artist.key))})" aria-pressed="${following}" aria-label="${following?'Dejar de seguir a':'Seguir a'} ${esc(artist.name)}">${following?'Siguiendo':'Seguir'}</button>`;
}
function omSyncFollowButtons(){
  document.querySelectorAll('[data-follow-artist]').forEach(button=>{const artist=omArtistRecord(button.dataset.followArtist),following=OM.followedArtists.has(artist.key);button.textContent=following?'Siguiendo':'Seguir';button.classList.toggle('following',following);button.setAttribute('aria-pressed',String(following));button.setAttribute('aria-label',`${following?'Dejar de seguir a':'Seguir a'} ${artist.name}`);});
}
function omToggleFollowArtist(key){
  const artist=omArtistRecord(key);if(!artist.key)return;
  const following=OM.followedArtists.has(artist.key);following?OM.followedArtists.delete(artist.key):OM.followedArtists.add(artist.key);
  storeOM('omusic_followed_artists_'+userKeyOM(),[...OM.followedArtists]);omRenderLibrary();omSyncFollowButtons();omUpdateQuickGrid();omToast(following?'Dejaste de seguir a '+artist.name:'Ahora sigues a '+artist.name);
}
const storeOM = (key, value) => { try {localStorage.setItem(key, JSON.stringify(value));} catch {omToast('No hay espacio para guardar más datos en este navegador.');} };
const readOM = (key, fallback) => {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}};
const userKeyOM = () => window._currentFirebaseUser?.uid || 'guest';
function omLoadPreferences() {
  const liked = readOM('omusic_liked_'+userKeyOM(), []);
  OM.liked = new Set(Array.isArray(liked) ? liked : []);
  const saved = readOM('omusic_saved_albums_'+userKeyOM(), []);
  OM.savedAlbums = new Set(Array.isArray(saved) ? saved.filter(name => albumsOM.some(a => a.name === name)) : []);
  const followed=readOM('omusic_followed_artists_'+userKeyOM(),[]);
  OM.followedArtists=new Set(Array.isArray(followed)?followed.filter(key=>typeof key==='string'&&key.length<=100).map(key=>omArtistRecord(key).key).filter(Boolean):[]);
  const recent = readOM('omusic_recent_'+userKeyOM(), []);
  const catalog=[...songs,...videos];
  OM.recent = Array.isArray(recent) ? recent.filter(url => catalog.some(s => s.url === url)).slice(0,30) : [];
  const listens = readOM('omusic_listens_'+userKeyOM(), {});
  OM.listens = Object.fromEntries(catalog.filter(s => Number.isSafeInteger(listens?.[s.url]) && listens[s.url] > 0).map(s => [s.url, listens[s.url]]));
  omSyncAlbumButtons();omSyncFollowButtons();omUpdateQuickGrid();
}
function omToast(message) {
  const el = $om('om-toast'); if (!el) return;
  el.textContent = message; el.classList.add('visible');
  clearTimeout(OM.toastTimer); OM.toastTimer = setTimeout(() => el.classList.remove('visible'), 3400);
}

function omBuildShell() {
  const searchEl = $om('search');
  const header = document.createElement('header'); header.className='om-global-header';
  header.innerHTML=`<button class="om-brand" onclick="openMusicaView()" aria-label="OMUSIC, inicio">${brand}<span>OMUSIC<span class="om-brand-dot">.</span></span></button>
    <div class="om-header-center"><button class="om-home-btn" onclick="openMusicaView()" title="Inicio" aria-label="Inicio">${icon('home',24)}</button><div class="om-search-wrap">${icon('search',24)}<div id="om-search-slot"></div><button class="om-search-clear" onclick="omClearSearch()" aria-label="Borrar búsqueda">${icon('close',18)}</button><span class="om-search-divider"></span><button onclick="omBrowse()" title="Explorar tu música" aria-label="Explorar tu música">${icon('grid',21)}</button></div></div>
    <div class="om-header-end"><button class="om-header-dj" onclick="window.lyriosOpenOverlay?.()">${icon('sparkle',17)}<span>Conoce a LYRIOS</span></button><span class="om-header-divider"></span><button id="om-theme-toggle" class="om-theme-toggle" type="button" onclick="window.OMTheme.toggle()" aria-label="Activar modo claro" title="Activar modo claro" aria-pressed="false"></button><button class="om-avatar" onclick="omToggleProfile()" aria-label="Abrir perfil" aria-haspopup="true" aria-controls="om-profile-menu" aria-expanded="false">O</button></div>
    <div id="om-profile-menu" class="om-profile-menu" hidden></div>`;
  document.body.prepend(header); $om('om-search-slot').append(searchEl);
  searchEl.placeholder='¿Qué quieres reproducir?';searchEl.setAttribute('aria-label','Buscar canciones, artistas, álbumes o videos');searchEl.autocomplete='off';
  const main=document.querySelector('.main-content');
  const filterbar=document.createElement('div');filterbar.className='om-filterbar';
  filterbar.innerHTML=`<div class="om-history"><button id="om-back" onclick="omBack()" aria-label="Volver" disabled>${icon('chevron',18)}</button><button id="om-forward" onclick="omForward()" aria-label="Avanzar" disabled>${icon('chevron',18)}</button></div><nav class="om-tabs" aria-label="Contenido"><button class="active" data-filter="all" onclick="omHomeFilter('all')">Todo</button><button data-filter="music" onclick="omHomeFilter('music')">Música</button><button data-filter="videos" onclick="omHomeFilter('videos')">Videos</button></nav>`;
  main.prepend(filterbar);
  const home=document.createElement('div');home.id='om-home';filterbar.after(home);
  const detail=document.createElement('div');detail.id='om-detail';home.after(detail);
  const sidebar=document.querySelector('.sidebar');
  sidebar.querySelector('.logo').style.display='none';
  const profile=sidebar.querySelector('.profile-section');profile.style.display='none';
  sidebar.querySelector('.sidebar-nav').style.display='none';
  const library=document.createElement('div'); library.className='om-library';
  library.innerHTML=`<nav class="om-primary-nav" aria-label="Navegación principal"><button data-primary="home" onclick="openMusicaView()">${icon('home',21)} Música</button><button data-primary="browse" onclick="omBrowse()">${icon('search',21)} Explorar</button><button data-primary="playlists" onclick="openPlaylists()">${icon('library',21)} Biblioteca</button><button data-primary="dj" onclick="window.lyriosOpenOverlay?.()">${icon('sparkle',21)} Tu DJ · LYRIOS <span>IA</span></button></nav><div class="om-library-heading"><button onclick="openPlaylists()">${icon('library',20)}<span>Tu colección</span></button><button onclick="createPlaylist()" title="Crear playlist" aria-label="Crear playlist">${icon('plus')}</button></div>
    <div class="om-library-chips"><button data-library="playlists" onclick="omLibraryFilter('playlists')">Playlists</button><button data-library="albums" onclick="omLibraryFilter('albums')">Álbumes</button><button data-library="artists" onclick="omLibraryFilter('artists')">Artistas</button></div>
    <div class="om-library-sort"><button onclick="omToggleLibrarySearch()" aria-label="Buscar en tu biblioteca" title="Buscar en tu biblioteca">${icon('search',18)}</button><span>Tu colección ${icon('list',17)}</span></div>
    <input id="om-library-search" type="search" placeholder="Buscar en tu biblioteca" aria-label="Buscar en tu biblioteca" hidden>
    <div id="om-library-items"></div>
    <button class="om-dj-card" onclick="window.lyriosOpenOverlay?.()"><span class="om-dj-orb">${icon('sparkle',23)}</span><span><strong>Tu DJ personal</strong><small>Descubre algo muy tú con LYRIOS</small></span>${icon('chevron',16)}</button>
    <div class="om-library-footer"><span>Hecho para escuchar.</span><span class="om-live-dot"></span></div>`;
  sidebar.append(library);
  const extras=document.createElement('div');extras.innerHTML=`<aside id="om-now-panel" aria-label="Sonando ahora" hidden></aside><div id="om-toast" role="status" aria-live="polite"></div><div id="om-dialog-backdrop" class="om-dialog-backdrop" hidden><section class="om-dialog" role="dialog" aria-modal="true" aria-labelledby="om-dialog-title"><button class="om-dialog-close" onclick="omCloseDialog()" aria-label="Cerrar">${icon('close')}</button><div id="om-dialog-content"></div></section></div>`;
  document.body.append(extras);
  const favorite=document.querySelector('.player-left > .icon-btn');favorite.id='om-save-track';favorite.onclick=()=>omLike(currentSong);favorite.title='Guardar en Tus me gusta';
  favorite.setAttribute('aria-label','Guardar en Tus me gusta');
  $om('mainPlayer').style.display='none';$om('mainPlayer').hidden=true;
  $om('playBtn').innerHTML=icon('play',22);$om('playBtn').setAttribute('aria-label','Reproducir');
  $om('btn-shuffle').innerHTML=icon('shuffle',18);$om('btn-shuffle').setAttribute('aria-pressed','false');$om('btn-shuffle').setAttribute('aria-label','Aleatorio');
  $om('btn-repeat').innerHTML=icon('repeat',18);$om('btn-repeat').setAttribute('aria-pressed','false');$om('btn-repeat').setAttribute('aria-label','Repetir canción');
  document.querySelector('.control-btn[onclick="prevSong()"]').innerHTML=icon('prev',20);
  document.querySelector('.control-btn[onclick="prevSong()"]').setAttribute('aria-label','Canción anterior');
  document.querySelector('.control-btn[onclick="playNext()"]').innerHTML=icon('next',20);
  document.querySelector('.control-btn[onclick="playNext()"]').setAttribute('aria-label','Siguiente canción');
  document.querySelector('.player-right').innerHTML=`<button class="om-player-tool" onclick="omToggleNowPanel()" title="Sonando ahora" aria-label="Sonando ahora">${icon('panel',18)}</button><button class="om-player-tool" id="om-lyrics-btn" onclick="toggleLyricsView()" title="Letras" aria-label="Mostrar letras">${icon('mic',18)}</button><button class="om-player-tool" id="om-queue-btn" onclick="toggleQueue()" title="Cola de reproducción" aria-label="Cola de reproducción" aria-expanded="false">${icon('queue',20)}</button><div class="volume-bar"><button id="om-volume-btn" onclick="omMute()" title="Silenciar" aria-label="Silenciar">${icon('volume',20)}</button></div><button class="om-player-tool om-expand-btn" onclick="openMobPlayerModal()" title="Abrir reproductor" aria-label="Abrir reproductor">${icon('expand',17)}</button>`;
  // Conservar la referencia y el control de volumen originales.
  document.querySelector('.player-right .volume-bar').append(volume); volume.setAttribute('aria-label','Volumen');
  progress.setAttribute('role','slider');progress.setAttribute('tabindex','0');progress.setAttribute('aria-label','Posición de reproducción');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');
  const nav=$om('mobile-tab-bar');
  nav.innerHTML=`<button class="mob-tab active" id="tab-explorar" onclick="openMusicaView()">${icon('home',23)}<span>Inicio</span></button><button class="mob-tab" id="tab-buscar" onclick="omBrowse()">${icon('search',23)}<span>Buscar</span></button><button class="mob-tab" id="tab-coleccion" onclick="openPlaylists()">${icon('library',23)}<span>Tu biblioteca</span></button>`;
  $om('queueBox').setAttribute('aria-label','Cola de reproducción');
  $om('queueBox').querySelector('h3').textContent='Cola de reproducción';
  document.querySelector('.close-lyrics').setAttribute('aria-label','Cerrar letras');
  $om('login-overlay').querySelector('.guest-note').textContent='Sin cuenta: tus playlists y favoritos se guardan en este navegador. La música requiere internet.';
}

function omLibraryFilter(type) {
  OM.libraryFilter=OM.libraryFilter===type?'all':type;omRenderLibrary();
}
function omToggleLibrarySearch() {
  const input=$om('om-library-search');input.hidden=!input.hidden;
  if(!input.hidden)input.focus();else{input.value='';OM.libraryQuery='';omRenderLibrary();}
}
function omRenderLibrary() {
  const node=$om('om-library-items');if(!node)return;
  document.querySelectorAll('[data-library]').forEach(b=>b.classList.toggle('active',b.dataset.library===OM.libraryFilter));
  let content=''; const q=normal(OM.libraryQuery);
  const row=(image,title,subtitle,action,extra='')=>`<button class="om-library-row ${extra}" onclick="${action}" title="${esc(title)}">${image}<span><strong>${esc(title)}</strong><small>${subtitle}</small></span></button>`;
  if(['all','playlists'].includes(OM.libraryFilter)){
    if(!q||normal('Tus me gusta').includes(q))content+=row(`<span class="om-liked-art">${icon('heart',22)}</span>`,'Tus me gusta',`${icon('pin',12)} Playlist · ${OM.liked.size} canciones`,'omOpenLiked()',OM.view==='liked'?'selected':'');
    playlists.filter(p=>!q||normal(p.name).includes(q)).forEach(p=>{const i=playlists.indexOf(p);content+=row(p.songs[0]?img(p.songs[0].cover):`<span class="om-playlist-art">${icon('music')}</span>`,p.name,`Playlist · ${p.songs.length} canciones`,`openPlaylist(${i})`,OM.currentPlaylist===i&&OM.view==='playlist'?'selected':'');});
  }
  if(['all','albums'].includes(OM.libraryFilter)){
    const ordered=['ATP','SAYONARA','DeBÍ TiRAR MáS FOToS','OMAKASE','$AD BOYZ 4 LIFE II','DATA','Un Verano Sin Ti'];
    const sorted=[...albumsOM].sort((a,b)=>{const ai=ordered.indexOf(a.name),bi=ordered.indexOf(b.name);return (ai<0?99:ai)-(bi<0?99:bi);});
    sorted.filter(a=>OM.savedAlbums.has(a.name)&&(!q||normal(a.name+' '+a.artist).includes(q))).forEach(a=>content+=row(img(a.cover),a.name,`Álbum guardado · ${esc(a.artist)}`,`filterByAlbum(${esc(JSON.stringify(a.name))})`,OM.route?.type==='album'&&OM.route.value===a.name?'selected':''));
  }
  if(['all','artists'].includes(OM.libraryFilter)){
    [...OM.followedArtists].map(omArtistRecord).filter(a=>!q||normal(a.name).includes(q)).forEach(a=>content+=row(img(a.photo||artistPhotoOM(a.key),a.name,'round'),a.name,'Siguiendo',`openArtistProfile(${esc(JSON.stringify(a.key))})`));
  }
  node.innerHTML=content||(q?'<p class="om-library-empty">No se encontraron coincidencias.</p>':`<div class="om-library-empty"><p>${OM.libraryFilter==='artists'?'Aquí aparecerán solo los artistas que sigas.':OM.libraryFilter==='albums'?'Aquí aparecerán los álbumes que guardes con el corazón.':'Empieza a guardar lo que más te gusta.'}</p><button onclick="${OM.libraryFilter==='artists'?'omShowArtists()':'omShowAlbums()'}">Explorar ${OM.libraryFilter==='artists'?'artistas':'álbumes'} ${icon('arrow',14)}</button></div>`);
}
function omAlbumSaveButton(name,large=false){
  const saved=OM.savedAlbums.has(name);
  return `<button class="om-album-save ${large?'om-album-save-large':''} ${saved?'saved':''}" data-save-album="${esc(name)}" onclick="omToggleAlbum(${esc(JSON.stringify(name))})" title="${saved?'Quitar álbum de favoritos':'Guardar álbum en favoritos'}" aria-label="${saved?'Quitar':'Guardar'} ${esc(name)} ${saved?'de':'en'} favoritos" aria-pressed="${saved}">${icon('heart',large?25:18)}</button>`;
}
function omSyncAlbumButtons(){
  document.querySelectorAll('[data-save-album]').forEach(button=>{
    const saved=OM.savedAlbums.has(button.dataset.saveAlbum);
    button.classList.toggle('saved',saved);button.setAttribute('aria-pressed',String(saved));
    button.title=saved?'Quitar álbum de favoritos':'Guardar álbum en favoritos';
    button.setAttribute('aria-label',`${saved?'Quitar':'Guardar'} ${button.dataset.saveAlbum} ${saved?'de':'en'} favoritos`);
  });
}
function omToggleAlbum(name){
  if(!albumsOM.some(a=>a.name===name))return;
  const saved=OM.savedAlbums.has(name);saved?OM.savedAlbums.delete(name):OM.savedAlbums.add(name);
  storeOM('omusic_saved_albums_'+userKeyOM(),[...OM.savedAlbums]);
  omRenderLibrary();omSyncAlbumButtons();omUpdateEditorial();omUpdateQuickGrid();
  if(OM.view==='playlists')omOpenLibrary(false);
  omToast(saved?'Álbum quitado de favoritos.':'Álbum guardado en tu biblioteca.');
}
function omAlbumCard(a) {
  return `<article class="om-media-card"><button class="om-card-main" onclick="filterByAlbum(${esc(JSON.stringify(a.name))})">${img(a.cover,a.name)}<strong>${esc(a.name)}</strong></button><span class="om-card-artists">${omArtistLinks(a.artist)}</span>${omAlbumSaveButton(a.name)}<button class="om-card-play" onclick="omPlayAlbum(${esc(JSON.stringify(a.name))})" title="Reproducir ${esc(a.name)}" aria-label="Reproducir ${esc(a.name)}">${icon('play',25)}</button></article>`;
}
function omArtistCard(node) {
  const key=node.dataset.artistName,name=node.querySelector('p').textContent;
  return `<article class="om-media-card om-artist-card"><button class="om-card-main" onclick="openArtistProfile(${esc(JSON.stringify(key))})">${img(node.dataset.artistPhoto,name)}<strong>${esc(name)}</strong><span>Artista</span></button><button class="om-card-play" onclick="omPlayArtist(${esc(JSON.stringify(key))})" aria-label="Reproducir ${esc(name)}">${icon('play',25)}</button></article>`;
}
function omSection(title,sub,action,content,cls='') {
  return `<section class="om-section ${cls}"><div class="om-section-heading"><div>${sub?`<span class="om-eyebrow">${esc(sub)}</span>`:''}<h2>${esc(title)}</h2></div><button onclick="${action}">Mostrar todo</button></div><div class="om-card-row">${content}</div></section>`;
}
function omHomeFilter(type) {
  if(type==='videos')return omShowVideos();
  omShowHome(true,type); 
}
function omRandomSelection(items,count,previous=[]){
  const shuffled=[...items];
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  let selected=shuffled.slice(0,count);
  if(shuffled.length>1&&selected.length===previous.length&&selected.every((item,i)=>item===previous[i])){
    shuffled.push(shuffled.shift());selected=shuffled.slice(0,count);
  }
  return selected;
}
function omRefreshHomeMix(){
  const previous=OM.homeMix||{};
  const quick=[...new Map(songs.filter(s=>s.url).map(s=>[s.url,s])).values()];
  OM.homeMix={albums:omRandomSelection(albumsOM,8,previous.albums),editorial:omRandomSelection(albumsOM,3,previous.editorial),artists:omRandomSelection([...document.querySelectorAll('[data-artist-name]')],6,previous.artists),quick:omRandomSelection(quick,9,previous.quick)};
}
function omEditorialAlbums(){
  if(!OM.homeMix)omRefreshHomeMix();
  return OM.homeMix.editorial;
}
function omEditorialMarkup(){
  const themes=[['VUELVE A TU UNIVERSO','Una canción. Mil recuerdos.','#244b56'],['EN REPEAT','De principio a fin.','#714449'],['HECHO PARA TI','Tu próximo favorito.','#3d385e']];
  return omEditorialAlbums().map((a,index)=>{
    const [label,title,color]=themes[index];
    return `<article class="om-editorial" data-editorial-album="${esc(a.name)}" style="--editorial-color:${color}"><button onclick="filterByAlbum(${esc(JSON.stringify(a.name))})"><div><span>${esc(label)}</span><h2>${esc(title)}</h2><small>${esc(a.artist)} · ${esc(a.name)}</small></div>${img(a.cover,a.name)}</button><button class="om-editorial-play" onclick="omPlayAlbum(${esc(JSON.stringify(a.name))})" aria-label="Reproducir ${esc(a.name)}">${icon('play',21)}</button></article>`;
  }).join('');
}
function omUpdateEditorial(){
  const grid=$om('om-editorial-grid');if(OM.view!=='home'||!grid)return;
  const content=omEditorialMarkup();if(grid.innerHTML!==content)grid.innerHTML=content;
}
function omQuickAlbums(){
  const direct=new Map(),artists=new Map(),recent=new Map(OM.recent.map((url,i)=>[url,i]));
  for(const song of [...songs,...videos]){
    const count=Math.min(100,OM.listens[song.url]||0),position=recent.get(song.url);
    const weight=count*10+(position===undefined?0:12*(1-position/30));
    if(!weight)continue;
    if(song.album)direct.set(song.album,(direct.get(song.album)||0)+weight*10);
    for(const name of new Set(normal(song.artist).split(',').map(a=>a.trim()).filter(Boolean)))artists.set(name,(artists.get(name)||0)+weight);
  }
  return albumsOM.map((album,index)=>{
    const affinity=album.artists.reduce((total,name)=>total+(artists.get(normal(name))||0),0);
    const liked=album.songs.filter(s=>OM.liked.has(s.url)).length;
    const followed=[...OM.followedArtists].some(key=>album.artists.some(artist=>omArtistMatches({artist},key)));
    return {album,index,score:(direct.get(album.name)||0)+affinity+(OM.savedAlbums.has(album.name)?2:0)+liked+(followed?1:0)};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,5).map(item=>item.album);
}
function omQuickGridMarkup(){
  const picks=omQuickAlbums();
  return `<button class="om-quick-item" onclick="omOpenLiked()"><span class="om-liked-art">${icon('heart',25)}</span><span><strong>Tus me gusta</strong><small>${OM.liked.size} canciones guardadas</small></span><span class="om-quick-play">${icon('play',21)}</span></button>`+picks.map(a=>`<button class="om-quick-item" data-quick-album="${esc(a.name)}" onclick="filterByAlbum(${esc(JSON.stringify(a.name))})">${img(a.cover)}<span><strong>${esc(a.name)}</strong><small>${esc(a.artist)}</small></span><span class="om-quick-play">${icon('play',21)}</span></button>`).join('')+(!picks.length?'<div class="om-quick-empty"><strong>Tu música va primero.</strong><small>Escucha canciones o sigue artistas para crear tu selección.</small></div>':'');
}
function omUpdateQuickGrid(){const grid=$om('om-quick-grid');if(grid&&OM.view==='home')grid.innerHTML=omQuickGridMarkup();}
function omRecordListen(){
  const pending=OM.listenRequest,song=currentSong;
  if(!pending||pending.counted||pending.owner!==userKeyOM()||pending.url!==song?.url||audio.getAttribute('src')!==song.url)return;
  pending.counted=true;
  OM.listens[song.url]=Math.min(100000,(OM.listens[song.url]||0)+1);
  OM.recent=[song.url,...OM.recent.filter(url=>url!==song.url)].slice(0,30);
  storeOM('omusic_listens_'+userKeyOM(),OM.listens);storeOM('omusic_recent_'+userKeyOM(),OM.recent);
  omUpdateEditorial();omUpdateQuickGrid();
}
function omShowHome(push=true,filter='all') {
  omRefreshHomeMix();
  omRoute({type:'home',value:filter},push);document.body.dataset.view='home';OM.view='home';
  search.value='';OM.currentPlaylist=null;currentAlbumContext=null;OM.artistContext=null;
  document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===filter);if(b.dataset.filter==='all')b.textContent='Para ti';});
  const recent=OM.recent.map(u=>songs.find(s=>s.url===u)).filter(Boolean);
  const curated=OM.homeMix.albums;
  const chosen=OM.homeMix.artists;
  const selected=OM.homeMix.quick;
  $om('om-home').innerHTML=`<div class="om-welcome"><div><span class="om-eyebrow">TU ESPACIO, TU MÚSICA</span><h1>La música que va contigo<span>.</span></h1></div><button class="om-text-link" onclick="omShowSongs()">Explorar todo ${icon('arrow',17)}</button></div><div id="om-quick-grid" class="om-quick-grid">${omQuickGridMarkup()}</div>
    ${recent.length?omSection('Vuelve a escucharlas','UN POCO MÁS DE LO QUE TE GUSTA','omShowRecent()',recent.slice(0,8).map(omSongCard).join('')):''}
    ${omSection('Álbumes que te van a encantar','ENCUENTRA TU PRÓXIMO FAVORITO','omShowAlbums()',curated.map(omAlbumCard).join(''))}
    <div id="om-editorial-grid" class="om-editorial-grid">${omEditorialMarkup()}</div>
    <section class="om-section om-selection-section"><div class="om-section-heading"><div><span class="om-eyebrow">DALE PLAY Y DÉJATE LLEVAR</span><h2>Selección rápida</h2></div><button onclick="omShowSongs()">Ver canciones ${icon('chevron',14)}</button></div><div class="om-quick-songs">${selected.map(s=>`<div class="om-quick-song"><button onclick="omPlaySong(${songs.indexOf(s)})">${img(s.cover)}<span><strong>${esc(s.title)}</strong><small>${esc(s.artist)} · ${esc(s.album||'Sencillo')}</small></span></button><button onclick="addToQueue(songs[${songs.indexOf(s)}])" aria-label="Agregar ${esc(s.title)} a la cola">${icon('plus',17)}</button></div>`).join('')}</div></section>
    ${omSection('Artistas de tu universo','','omShowArtists()',chosen.map(omArtistCard).join(''),'om-artists-section')}
    <footer class="om-main-footer"><div>${brand}<strong>OMUSIC<span>.</span></strong></div><p>Tu música. Tu espacio. Tu ritmo.</p><span>${songs.length} canciones · ${albumsOM.length} álbumes · ${videos.length} videos</span></footer>`;
  omNavState();omRenderLibrary();omScrollTop();
}
function omSongCard(s) {
  return `<article class="om-media-card"><button class="om-card-main" onclick="omPlaySong(${songs.indexOf(s)})">${img(s.cover,s.title)}<strong>${esc(s.title)}</strong></button><span class="om-card-artists">${omArtistLinks(s.artist)}</span><button class="om-card-play" onclick="omPlaySong(${songs.indexOf(s)})" aria-label="Reproducir ${esc(s.title)}">${icon('play',25)}</button></article>`;
}
function omRoute(route,push=true) {
  if(push&&OM.route&&JSON.stringify(route)!==JSON.stringify(OM.route)){OM.back.push(OM.route);OM.forward=[];}
  OM.route=route;$om('om-back').disabled=!OM.back.length;$om('om-forward').disabled=!OM.forward.length;
}
function omRestore(route) {
  switch(route.type){
    case 'home':omShowHome(false,route.value);break;
    case 'settings':omOpenSettings(route.value,false);break;
    case 'friends':omOpenFriends(route.value,false);break;
    case 'party':omOpenParty(false);break;
    case 'track':omOpenSharedTrack(route.value,false);break;
    case 'sharedVideo':omOpenSharedVideo(route.value,false);break;
    case 'album':omOpenAlbum(route.value,false);break;
    case 'artist':omOpenArtist(route.value,false);break;
    case 'artistAlbums':omShowArtistAlbums(route.value,false);break;
    case 'liked':omOpenLiked(false);break;
    case 'playlists':omOpenLibrary(false);break;
    case 'playlist':omOpenPlaylist(route.value,false);break;
    case 'profile':omOpenProfile(route.value,false);break;
    case 'publicPlaylist':omOpenPublicPlaylist(route.value.owner,route.value.id,false);break;
    case 'albums':omShowAlbums(false);break;
    case 'artists':omShowArtists(false);break;
    case 'videos':omShowVideos(false);break;
    case 'recent':omShowRecent(false);break;
    case 'browse':omBrowse(false);break;
    case 'search':search.value=route.value;omSearch(false);break;
    default:omShowSongs(false);
  }
}
function omBack(){if(!OM.back.length)return;OM.forward.push(OM.route);const route=OM.back.pop();omRestore(route);}
function omForward(){if(!OM.forward.length)return;OM.back.push(OM.route);const route=OM.forward.pop();omRestore(route);}
function omScrollTop(){document.querySelector('.main-content').scrollTop=0;}
function omNavState(){
  const primary=['playlist','playlists','liked','profile','publicPlaylist'].includes(OM.view)?'playlists':['browse','search'].includes(OM.view)?'browse':'home';
  document.querySelectorAll('[data-primary]').forEach(button=>{const active=button.dataset.primary===primary;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  document.querySelectorAll('.mob-tab').forEach(b=>b.classList.remove('active'));
  const id=['playlist','playlists','liked'].includes(OM.view)?'tab-coleccion':['browse','search'].includes(OM.view)?'tab-buscar':'tab-explorar';
  $om(id)?.classList.add('active');
  document.querySelector('.om-home-btn').classList.toggle('active',OM.view==='home');
  $om('om-search-slot').parentElement.classList.toggle('has-query',!!search.value);
  $om('top-bar-title').textContent=OM.view==='home'?'Música':OM.view;
}
function omDetailView(view,title,subtitle='',push=true,routeValue=null){
  if(view!=='artist')OM.artistContext=null;
  document.querySelectorAll('.om-discography').forEach(e=>e.remove());
  omRoute({type:view,value:routeValue},push);OM.view=view;OM.currentPlaylist=null;document.body.dataset.view=view;
  $om('om-detail').innerHTML=`<div class="om-page-heading">${subtitle?`<span class="om-eyebrow">${esc(subtitle)}</span>`:''}<h1>${esc(title)}</h1></div>`;
  $om('viewTitle').textContent=title;$om('songList').style.display='';$om('songList').className='om-track-list';
  $om('songList').innerHTML='';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',view==='videos'?b.dataset.filter==='videos':b.dataset.filter==='music'));
  omNavState();omScrollTop();
}
function omCollectionHeader(title,subtitle,coverUrl,list,opts={}){
  const art=opts.liked?`<div class="om-collection-cover om-liked-art">${icon('heart',80)}</div>`:opts.empty?`<div class="om-collection-cover om-playlist-art">${icon('music',70)}</div>`:img(coverUrl,title,'om-collection-cover');
  $om('om-detail').innerHTML=`<section class="om-collection-hero ${opts.artist?'is-artist':''} ${opts.liked?'is-liked':''}">${art}<div><span>${esc(subtitle)}</span><h1>${esc(title)}</h1><p><strong>${opts.author&&!opts.artist&&!opts.liked&&opts.playlist===undefined?omArtistLinks(opts.author):esc(opts.author||'Tu biblioteca de OMUSIC')}</strong><span> · ${list.length} canciones</span></p></div></section><div class="om-collection-toolbar"><button class="om-collection-play" onclick="omPlayActive()" aria-label="Reproducir ${esc(title)}">${icon('play',30)}</button><button class="om-toolbar-shuffle" onclick="toggleShuffle()" aria-label="Activar aleatorio">${icon('shuffle',25)}</button>${opts.playlist!==undefined?`<button class="om-toolbar-more" onclick="omPlaylistMenu(${opts.playlist})" aria-label="Opciones de la playlist">${icon('more',28)}</button>`:''}<span class="om-track-count">${list.length} canciones en tu colección</span><button class="om-list-style" onclick="omReverseList()">Orden ${icon('list',18)}</button></div>`;
  if(!opts.artist&&!opts.liked&&opts.playlist===undefined&&albumsOM.some(a=>a.name===title))document.querySelector('.om-toolbar-shuffle').insertAdjacentHTML('afterend',omAlbumSaveButton(title,true));
}
function omDurationMetadata(song){return window.OM_TRACK_METADATA?.[song.url||'track:'+song.title+'|'+song.artist];}
function omDurationSeconds(song){const value=Number(OM.durations[song.url]||omDurationMetadata(song)?.duration||song.duration);return Number.isFinite(value)&&value>0?value:null;}
function omDurationLabel(song){const seconds=omDurationSeconds(song);return seconds?formatTime(seconds):(!song.url||OM.durationFailed.has(song.url)||omDurationMetadata(song)?.unavailable?'No disponible':'Cargando…');}
function omUpdateDurationLabels(url){document.querySelectorAll('[data-duration]').forEach(el=>{if(el.dataset.duration!==url)return;const song={url},seconds=omDurationSeconds(song);el.textContent=omDurationLabel(song);el.classList.toggle('om-duration-unavailable',!seconds&&!OM.durationPending.has(url));});}
function omCacheDuration(url,seconds){if(!Number.isFinite(seconds)||seconds<=0)return;OM.durations[url]=seconds;OM.durationFailed.delete(url);omUpdateDurationLabels(url);storeOM('omusic_durations_v1',OM.durations);}
function omInitDurations(){
  const cached=readOM('omusic_durations_v1',{}),metadata=window.OM_TRACK_METADATA||{};
  for(const song of [...songs,...videos]){if(!song.url)continue;const value=Number(cached?.[song.url]||metadata[song.url]?.duration);if(Number.isFinite(value)&&value>0)OM.durations[song.url]=value;else if(metadata[song.url]?.unavailable)OM.durationFailed.add(song.url);}
}
function omLoadTrackDurations(list){
  if(typeof document.createElement!=='function')return;
  for(const song of list){if(!song.url||omDurationSeconds(song)||OM.durationFailed.has(song.url)||OM.durationPending.has(song.url)||omDurationMetadata(song)?.unavailable)continue;OM.durationPending.add(song.url);OM.durationQueue.push(song);}
  omPumpDurationQueue();
}
function omPumpDurationQueue(){
  while(OM.durationWorkers<3&&OM.durationQueue.length){
    const song=OM.durationQueue.shift(),media=document.createElement('audio');OM.durationWorkers++;let done=false;
    const finish=seconds=>{if(done)return;done=true;clearTimeout(timer);if(Number.isFinite(seconds)&&seconds>0)omCacheDuration(song.url,seconds);else OM.durationFailed.add(song.url);OM.durationPending.delete(song.url);omUpdateDurationLabels(song.url);media.removeAttribute('src');media.load();OM.durationWorkers--;omPumpDurationQueue();};
    const timer=setTimeout(()=>finish(null),15000);
    media.preload='metadata';media.muted=true;media.addEventListener('loadedmetadata',()=>finish(media.duration),{once:true});media.addEventListener('error',()=>finish(null),{once:true});media.src=song.url;media.load();
  }
}
function omRenderTracks(list,emptyMessage='Aún no hay canciones aquí.'){
  OM.activeList=list;const node=$om('songList');node.className='om-track-list';node.style.display='';
  if(!list.length){node.innerHTML=`<div class="om-empty">${icon('music',44)}<h2>${esc(emptyMessage)}</h2><p>Tu próxima canción favorita te está esperando.</p><button class="om-button-green" onclick="omShowSongs()">Explorar canciones</button></div>`;return;}
  node.innerHTML=`<div class="om-track-head"><span>#</span><span>Título</span><span class="om-track-album">Álbum</span><span></span><span class="om-track-duration">${icon('clock',16)}</span><span></span></div>`+
    list.map((s,i)=>`<div class="om-track-row ${currentSong?.url===s.url?'is-current':''}" data-url="${esc(s.url)}"><button class="om-track-number" onclick="omPlay(${i})" aria-label="Reproducir ${esc(s.title)}"><span>${i+1}</span>${icon('play',16)}<i class="om-equalizer"><b></b><b></b><b></b></i></button><div class="om-track-info"><button class="om-track-cover" onclick="omPlay(${i})" aria-label="Reproducir portada de ${esc(s.title)}">${img(s.cover)}</button><div class="om-track-text"><button class="om-track-title" onclick="omPlay(${i})"><strong>${esc(s.title)}</strong></button><small>${omArtistLinks(s.artist)}</small></div></div><button class="om-track-album" onclick="filterByAlbum(${esc(JSON.stringify(s.album||''))})">${esc(s.album||'Sencillo')}</button><button class="om-track-save ${OM.liked.has(s.url)?'saved':''}" onclick="omLike(OM.activeList[${i}])" aria-label="${OM.liked.has(s.url)?'Quitar de':'Guardar en'} Tus me gusta" aria-pressed="${OM.liked.has(s.url)}">${icon(OM.liked.has(s.url)?'check':'save',17)}</button><span class="om-track-duration ${omDurationLabel(s)==='No disponible'?'om-duration-unavailable':''}" data-duration="${esc(s.url)}">${omDurationLabel(s)}</span><button class="om-track-menu" onclick="openOptions(OM.activeList[${i}])" aria-label="Opciones de ${esc(s.title)}">${icon('more',22)}</button></div>`).join('');
  omLoadTrackDurations(list);
}
function omReverseList(){if(OM.view==='artist'&&OM.artistContext){OM.artistContext.tracks.reverse();omRenderArtistTracks();}else omRenderTracks([...OM.activeList].reverse());}
function omOpenAlbum(name,push=true){
  const a=albumsOM.find(a=>a.name===name);if(!a)return omToast('Esta canción se encuentra como sencillo.');
  search.value='';omDetailView('album',a.name,'',push,name);currentAlbumContext=null;
  omCollectionHeader(a.name,'Álbum',a.cover,a.songs,{author:a.artist});omRenderTracks(a.songs);omRenderLibrary();
}
function omOpenArtist(key,push=true){
  const record=omArtistRecord(key),list=songs.filter(s=>omArtistMatches(s,record.key));
  search.value='';omDetailView('artist',record.name,'',push,record.key);currentAlbumContext=null;
  OM.artistContext={key:record.key,tracks:[...list],expanded:false};
  omCollectionHeader(record.name,'Artista',artistPhotoOM(record.key),list,{artist:true,author:'En tu universo musical'});
  document.querySelector('.om-toolbar-shuffle')?.insertAdjacentHTML('afterend',omFollowArtistButton(record.key));omRenderArtistTracks();
  const related=omArtistAlbums(record.key),clips=omArtistVideos(record.key);
  if(related.length||clips.length){
    const extra=document.createElement('div');extra.className='om-discography';
    extra.innerHTML=(related.length?omSection('Discografía de '+record.name,'',`omShowArtistAlbums(${esc(JSON.stringify(record.key))})`,related.slice(0,6).map(omAlbumCard).join('')):'')+
      (clips.length?`<section class="om-section om-artist-videos" aria-label="Videos de ${esc(record.name)}"><div class="om-section-heading"><div><h2>Videos de ${esc(record.name)}</h2></div><span>${clips.length} ${clips.length===1?'video':'videos'}</span></div><div class="om-video-grid">${clips.map(omVideoCard).join('')}</div></section>`:'');
    $om('songList').after(extra);
  }
}
function omRenderArtistTracks(){
  const context=OM.artistContext;if(!context||OM.view!=='artist')return;
  omRenderTracks(context.expanded?context.tracks:context.tracks.slice(0,5));
  if(context.tracks.length>5)$om('songList').insertAdjacentHTML('beforeend',`<button class="om-artist-more" onclick="omToggleArtistTracks()" aria-expanded="${context.expanded}">${context.expanded?'Ver menos':'Ver más'}</button>`);
}
function omToggleArtistTracks(){if(OM.artistContext&&OM.view==='artist'){OM.artistContext.expanded=!OM.artistContext.expanded;omRenderArtistTracks();}}
function omShowArtistAlbums(key,push=true){
  const record=omArtistRecord(key),list=omArtistAlbums(record.key);search.value='';omDetailView('artistAlbums','Discografía de '+record.name,'ÁLBUMES DEL ARTISTA',push,record.key);
  $om('songList').className='om-card-grid';$om('songList').innerHTML=list.length?list.map(omAlbumCard).join(''):'<p class="om-library-empty">Todavía no hay álbumes de este artista en tu catálogo.</p>';
}
function omOpenLiked(push=true){
  search.value='';omDetailView('liked','Tus me gusta','',push);currentAlbumContext=null;
  const list=[...songs,...videos.map(v=>({...v,type:'video'}))].filter(s=>OM.liked.has(s.url));omCollectionHeader('Tus me gusta','Playlist',null,list,{liked:true,author:window._currentFirebaseUser?.displayName||'Tu colección personal'});omRenderTracks(list,'Guarda las canciones que te encantan');omRenderLibrary();
}
function omShowSongs(push=true){search.value='';currentAlbumContext=null;omDetailView('songs','Todas tus canciones',`${songs.length} CANCIONES PARA CADA MOMENTO`,push);omRenderTracks(songs);}
function omShowRecent(push=true){omDetailView('recent','Escuchadas recientemente','OTRA VEZ, POR FAVOR',push);omRenderTracks(OM.recent.map(u=>songs.find(s=>s.url===u)).filter(Boolean));}
function omShowAlbums(push=true){search.value='';omDetailView('albums','Tus álbumes','ELIGE TU PRÓXIMO REPEAT',push);$om('songList').className='om-card-grid';$om('songList').innerHTML=albumsOM.map(omAlbumCard).join('');}
function omShowArtists(push=true){search.value='';omDetailView('artists','Tus artistas','LAS VOCES DE TU BIBLIOTECA',push);$om('songList').className='om-card-grid';$om('songList').innerHTML=[...document.querySelectorAll('[data-artist-name]')].map(omArtistCard).join('');}
function omShowVideos(push=true){
  search.value='';omDetailView('videos','También se escucha con los ojos','TUS VIDEOS MUSICALES',push);
  $om('songList').className='om-video-grid';$om('songList').innerHTML=videos.map(v=>omVideoCard(v)).join('');
}
function omVideoCard(v){const i=videos.indexOf(v);return `<article class="om-media-card om-video-card"><button class="om-card-main" onclick="playVideo(${i})"><div>${img(v.cover,v.title)}<span>${icon('play',24)}</span></div><strong>${esc(v.title)}</strong><span>${esc(v.artist||'Video musical')}</span></button><button class="om-video-queue" onclick="omQueueVideo(${i})" aria-label="Agregar ${esc(v.title)} a la cola">${icon('plus',18)}</button></article>`;}
function omQueueVideo(i){addToQueue({...videos[i],type:'video'});}
function omBrowse(push=true){
  search.value='';omDetailView('browse','Encuentra tu próximo favorito','EXPLORA TU UNIVERSO',push);
  const moods=[['Para ti','Tus álbumes en repeat','ATP','#6e2a41'],['En español','Dale play a lo nuestro','SAYONARA','#b75722'],['De noche','Baja las luces, sube el volumen','DATA','#364e8d'],['Sin prisa','Un ratito para ti','Un Verano Sin Ti','#0d7169']];
  $om('songList').className='om-browse-content';$om('songList').innerHTML=`<div class="om-browse-grid">${moods.map(([t,d,a,c])=>`<button style="--mood-color:${c}" onclick="filterByAlbum(${esc(JSON.stringify(albumOM(a)?.name||albumsOM[0].name))})"><strong>${esc(t)}</strong><span>${esc(d)}</span>${img(albumOM(a)?.cover)}</button>`).join('')}</div>${omSection('Todos tus artistas','','omShowArtists()',[...document.querySelectorAll('[data-artist-name]')].slice(0,12).map(omArtistCard).join(''))}`;
  search.style.display='';search.focus();
}
function omClearSearch(){search.value='';omShowHome();search.focus();}
function omSearch(push=true){
  const q=normal(search.value.trim());if(!q)return omShowHome(push);
  const raw=search.value;omDetailView('search',`Resultados para “${raw}”`,'BUSCA ALGO QUE TE MUEVA',push,raw);
  const matched=songs.filter(s=>normal(s.title+' '+s.artist+' '+s.album).includes(q));
  const foundAlbums=albumsOM.filter(a=>normal(a.name+' '+a.artist).includes(q));
  const foundArtists=[...document.querySelectorAll('[data-artist-name]')].filter(a=>normal(a.dataset.artistName+' '+a.querySelector('p').textContent).includes(q));
  const foundVideos=videos.filter(v=>normal(v.title+' '+v.artist).includes(q));
  let cards='';
  if(foundArtists.length)cards+=omSection('Artistas','','omShowArtists()',foundArtists.slice(0,6).map(omArtistCard).join(''));
  if(foundAlbums.length)cards+=omSection('Álbumes','','omShowAlbums()',foundAlbums.slice(0,6).map(omAlbumCard).join(''));
  if(cards){const e=document.createElement('div');e.className='om-search-matches';e.innerHTML=cards;$om('om-detail').append(e);}
  if(matched.length){$om('viewTitle').textContent=`Canciones (${matched.length})`;omRenderTracks(matched);}
  else if(!foundVideos.length&&!cards){$om('songList').innerHTML=`<div class="om-empty">${icon('search',44)}<h2>No encontramos “${esc(raw)}”</h2><p>Prueba con otra canción, artista o álbum de tu biblioteca.</p></div>`;}
  if(foundVideos.length){const e=document.createElement('section');e.className='om-search-videos';e.innerHTML=`<h2>Videos</h2><div class="om-video-grid">${foundVideos.map(omVideoCard).join('')}</div>`;$om('songList').append(e);}
  omNavState();
}

function omOpenLibrary(push=true){
  search.value='';omDetailView('playlists','Tu biblioteca','TODO LO QUE ES MUY TÚ',push);
  $om('songList').className='om-card-grid';
  $om('songList').innerHTML=`<article class="om-media-card"><button class="om-card-main" onclick="omOpenLiked()"><span class="om-playlist-large om-liked-art">${icon('heart',60)}</span><strong>Tus me gusta</strong><span>${OM.liked.size} canciones guardadas</span></button></article>`+
    playlists.map((p,i)=>`<article class="om-media-card"><button class="om-card-main" onclick="openPlaylist(${i})">${p.songs.length?img(p.songs[0].cover,p.name):`<span class="om-playlist-large om-playlist-art">${icon('music',60)}</span>`}<strong>${esc(p.name)}</strong><span>Playlist · ${p.songs.length} canciones</span></button></article>`).join('')+
    `<article class="om-media-card om-create-card"><button class="om-card-main" onclick="createPlaylist()"><span class="om-playlist-large">${icon('plus',50)}</span><strong>Tu próxima playlist</strong><span>Hazle espacio a tus favoritas</span></button></article>`;
  const saved=albumsOM.filter(a=>OM.savedAlbums.has(a.name));
  if(saved.length){const section=document.createElement('section');section.className='om-saved-album-section';section.innerHTML=`<h2>Álbumes que guardaste</h2><div class="om-card-grid">${saved.map(omAlbumCard).join('')}</div>`;$om('songList').append(section);}
  omRenderLibrary();
}
function omOpenPlaylist(i,push=true){
  const p=playlists[i];if(!p)return omOpenLibrary(push);
  search.value='';omDetailView('playlist',p.name,'',push,i);OM.currentPlaylist=i;
  omCollectionHeader(p.name,p.isPublic?'Playlist pública':'Playlist privada',p.songs[0]?.cover,p.songs,{empty:!p.songs.length,playlist:i,author:window.omProfileData?.().name||window._currentFirebaseUser?.displayName||'Creada por ti'});omRenderTracks(p.songs,'Dale una primera canción a tu playlist');omRenderLibrary();
  if(p.isPublic)document.querySelector('.om-toolbar-more')?.insertAdjacentHTML('afterend',`<button class="om-toolbar-share" onclick="omSharePlaylist(${i})" aria-label="Compartir playlist">${icon('share',22)}</button>`);
}
function omShowDialog(content){
  OM.focusedBeforeDialog=document.activeElement;$om('om-dialog-content').innerHTML=content;$om('om-dialog-backdrop').hidden=false;
  requestAnimationFrame(()=>($om('om-dialog-content').querySelector('input,button,select,textarea,a[href]')||$om('om-dialog-backdrop').querySelector('.om-dialog-close'))?.focus());
}
function omCloseDialog(){$om('om-dialog-backdrop').hidden=true;OM.focusedBeforeDialog?.focus();}
function omCreatePlaylist(song=null){
  omShowDialog(`<span class="om-dialog-art">${icon('music',34)}</span><h2 id="om-dialog-title">Tu música merece su playlist.</h2><p>Ponle nombre a ese mood.</p><form id="om-playlist-form"><label for="om-playlist-name">Nombre de la playlist</label><input id="om-playlist-name" maxlength="80" placeholder="Mi nueva playlist" required autocomplete="off"><label class="om-public-choice"><input type="checkbox" id="om-playlist-public" ${window._currentFirebaseUser?'':'disabled'}> Hacer pública esta playlist</label><p class="om-form-note">${window._currentFirebaseUser?'Las playlists públicas se pueden abrir y escuchar con un enlace.':'Inicia sesión para publicar. En modo invitado se guarda en este navegador.'}</p><button class="om-button-green" type="submit">Crear playlist</button></form>`);
  $om('om-playlist-form').onsubmit=async e=>{
    e.preventDefault();const name=$om('om-playlist-name').value.trim();if(!name)return;
    const makePublic=$om('om-playlist-public').checked;
    playlists.push({name,songs:song?[song]:[]});await savePlaylists();
    const index=playlists.length-1;
    if(makePublic)try{await window.omSetPlaylistPublic?.(index,true);}catch(error){omCloseDialog();omOpenPlaylist(index);omToast(window.omSocialMessage?.(error)||'Playlist creada como privada. No se pudo publicar.');return;}
    omCloseDialog();omOpenPlaylist(index);omToast('Playlist creada. Hazla tuya.');
  };
}
function omPlaylistMenu(i){
  const p=playlists[i];if(!p)return;
  omShowDialog(`<h2 id="om-dialog-title">${esc(p.name)}</h2><form id="om-rename-form"><label for="om-playlist-name">Nombre de la playlist</label><input id="om-playlist-name" value="${esc(p.name)}" maxlength="80" required><button class="om-button-green" type="submit">Guardar cambios</button></form><div class="om-playlist-privacy"><span>${icon(p.isPublic?'globe':'lock',18)} ${p.isPublic?'Playlist pública':'Playlist privada'}</span><button id="om-playlist-visibility" class="om-button-outline">${p.isPublic?'Hacer privada':'Hacer pública'}</button>${p.isPublic?'<button class="om-button-outline" id="om-playlist-share">Compartir enlace</button>':''}<p id="om-playlist-status" class="om-form-note" role="status"></p></div><button class="om-delete-button" id="om-delete-playlist">Eliminar playlist</button>`);
  $om('om-playlist-visibility').onclick=()=>window.omTogglePlaylistVisibility?.(i);
  if(p.isPublic)$om('om-playlist-share').onclick=()=>omSharePlaylist(i);
  $om('om-rename-form').onsubmit=async e=>{e.preventDefault();const name=$om('om-playlist-name').value.trim();if(!name)return;p.name=name;await savePlaylists();omCloseDialog();omOpenPlaylist(i,false);omToast('Nombre actualizado.');};
  $om('om-delete-playlist').onclick=()=>{
    omShowDialog(`<h2 id="om-dialog-title">¿Eliminar “${esc(p.name)}”?</h2><p>Esta playlist dejará de aparecer en tu biblioteca.</p><div class="om-dialog-actions"><button class="om-button-outline" onclick="omCloseDialog()">Cancelar</button><button class="om-button-green" id="om-confirm-delete">Eliminar</button></div>`);
    $om('om-confirm-delete').onclick=async()=>{
      try{if(p.isPublic)await omSetPlaylistPublic(i,false);const index=playlists.indexOf(p);if(index<0)return;playlists.splice(index,1);await savePlaylists();omCloseDialog();omOpenLibrary();omToast('Playlist eliminada.');}
      catch{omToast('No se pudo retirar la playlist pública. Inténtalo de nuevo antes de eliminarla.');}
    };
  };
}
function omLike(s){
  if(!s)return;const was=OM.liked.has(s.url);was?OM.liked.delete(s.url):OM.liked.add(s.url);
  storeOM('omusic_liked_'+userKeyOM(),[...OM.liked]);omRenderLibrary();omSyncPlayer();omUpdateEditorial();omUpdateQuickGrid();
  if(OM.view==='liked')omOpenLiked(false);else if(OM.view==='artist')omRenderArtistTracks();else if($om('songList').classList.contains('om-track-list')){const list=OM.activeList;omRenderTracks(list);}
  omToast(was?'Quitada de Tus me gusta.':'Guardada en Tus me gusta.');
}

// Mantener compatibilidad con los botones y el DJ del proyecto original.
window.openMusicaView=()=>omShowHome();
window.openExplorarView=()=>omBrowse();
window.openPlaylists=()=>omOpenLibrary();
window.openPlaylist=i=>omOpenPlaylist(i);
window.filterByAlbum=name=>omOpenAlbum(name);
window.openArtistProfile=key=>omOpenArtist(key);
window.createPlaylist=()=>omCreatePlaylist();
window.deletePlaylist=i=>omPlaylistMenu(i);
window.renderSongs=list=>omRenderTracks(list);
window.renderSongsWithAlbumContext=list=>omRenderTracks(list);
window.loadSongInAlbum=i=>{if(currentAlbumContext?.[i]){currentAlbumContext._currentIndex=i;loadSong(currentAlbumContext[i]);}};
window.mobSwitchTab=tab=>tab==='coleccion'?omOpenLibrary():tab==='buscar'?omBrowse():omShowHome();
window.openVideos=()=>omShowVideos();
window.openOptions=s=>{
  selectedSongForModal=s;$om('modalSongTitle').textContent=s.title;
  $om('playlistOptions').style.display='block';
  $om('optionsModal').style.display='block';$om('modalOverlay').style.display='block';renderPlaylistOptions();
};
window.renderPlaylistOptions=()=>{
  $om('playlistOptions').innerHTML=`<span class="om-options-label">AGREGAR A UNA PLAYLIST</span>`;
  playlists.forEach((p,i)=>{
    const b=document.createElement('button');b.textContent=p.name;b.onclick=async()=>{
      if(p.songs.some(s=>s.url===selectedSongForModal.url)){omToast('Esta canción ya está en la playlist.');closeOptions();return;}
      p.songs.push(selectedSongForModal);await savePlaylists();closeOptions();omToast('Agregada a '+p.name);if(OM.view==='playlist'&&OM.currentPlaylist===i)omOpenPlaylist(i,false);
    };$om('playlistOptions').append(b);
  });
  const b=document.createElement('button');b.innerHTML=icon('plus',16)+' Crear una playlist';b.onclick=()=>{const s=selectedSongForModal;closeOptions();omCreatePlaylist(s);};$om('playlistOptions').append(b);
};
const savePlaylistsOriginalOM=savePlaylists;
window.savePlaylists=async()=>{storeOM(_isGuest()?'playlists_guest':'playlists_'+userKeyOM(),playlists);await savePlaylistsOriginalOM();omRenderLibrary();if(window.omSyncPublishedPlaylists)await window.omSyncPublishedPlaylists().catch(()=>omToast('Playlist guardada. No se pudo actualizar su versión pública.'));};
const loadPlaylistsOriginalOM=loadPlaylistsFromCloud;
window.loadPlaylistsFromCloud=async uid=>{
  const owner=userKeyOM(),request=++OM.sessionRequest;
  const cached=readOM(uid?'playlists_'+uid:'playlists_guest',[]);
  playlists=Array.isArray(cached)?cached:[];omLoadPreferences();omRenderLibrary();omSyncProfile();omUpdateEditorial();
  let list=playlists;
  if(uid)try{const ref=window._doc(window._db,'playlists',uid);const snapshot=await window._getDoc(ref);list=snapshot.exists()?snapshot.data().list||[]:cached;}
  catch{list=cached;}
  if(request!==OM.sessionRequest||owner!==userKeyOM())return;
  playlists=Array.isArray(list)?list:[];
  _playlistsLoaded=true;omRenderLibrary();
};

function omPlaySong(i){if(!songs[i])return;OM.playbackList=songs;currentAlbumContext=null;loadSong(songs[i]);}
function omPlay(i){if(!OM.activeList[i])return;OM.playbackList=[...(OM.view==='artist'&&OM.artistContext?OM.artistContext.tracks:OM.activeList)];currentAlbumContext=OM.view==='album'?[...OM.activeList]:null;if(currentAlbumContext)currentAlbumContext._currentIndex=i;loadSong(OM.activeList[i]);}
function omPlayActive(){if(OM.view==='artist'&&OM.artistContext){const list=OM.artistContext.tracks;if(!list.length)return omToast('Este artista todavía no tiene canciones.');OM.playbackList=[...list];currentAlbumContext=null;return loadSong(list[shuffleActive?Math.floor(Math.random()*list.length):0]);}if(!OM.activeList.length)return omToast('Agrega canciones a esta playlist para empezar.');omPlay(shuffleActive?Math.floor(Math.random()*OM.activeList.length):0);}
function omPlayAlbum(name){const a=albumsOM.find(a=>a.name===name);if(!a)return;OM.playbackList=[...a.songs];currentAlbumContext=[...a.songs];currentAlbumContext._currentIndex=0;loadSong(a.songs[0]);}
function omPlayArtist(key){const list=songs.filter(s=>omArtistMatches(s,key));if(!list.length)return omToast('Este artista tiene videos en tu biblioteca.');OM.playbackList=list;currentAlbumContext=null;loadSong(list[0]);}
window.loadSong=function(s,options={}){
  if(!s?.url)return;
  if(s.type==='video'){audio.pause();openVideo(s.url,s);return;}
  if(typeof activeVideo!=='undefined'&&activeVideo)closeVideo();
  if(currentSong&&currentSong.url!==s.url&&options.history!==false)history.push(currentSong);
  currentSong=s;
  OM.listenRequest={url:s.url,owner:userKeyOM(),counted:false};
  if(currentAlbumContext&&!currentAlbumContext.some(x=>x.url===s.url))currentAlbumContext=null;
  if(!OM.playbackList.some(x=>x.url===s.url))OM.playbackList=songs;
  if(currentAlbumContext)currentAlbumContext._currentIndex=currentAlbumContext.findIndex(x=>x.url===s.url);
  audio.src=s.url;audio.onended=handleSongEnd;
  title.textContent=s.title;artist.textContent=s.artist;cover.src=s.cover||'placeholder.svg';
  $om('lyrics-cover-big').src=s.cover||'placeholder.svg';$om('lyrics-bg').src=s.cover||'placeholder.svg';
  $om('lyrics-meta-title').textContent=s.title;$om('lyrics-meta-artist').textContent=s.artist;
  const cv=$om('lyrics-cover-video');cv.pause();cv.removeAttribute('src');cv.classList.add('lyrics-cover-video-hidden');$om('lyrics-cover-big').classList.remove('lyrics-cover-img-hidden');
  if(s.coverVideo){cv.src=s.coverVideo;cv.poster=s.cover;cv.classList.remove('lyrics-cover-video-hidden');$om('lyrics-cover-big').classList.add('lyrics-cover-img-hidden');cv.play().catch(()=>{});}
  loadLyrics(s.lyricsUrl);
  omSyncPlayer();omRenderNowPanel();omRenderLibrary();
  if(options.autoplay!==false)audio.play().catch(e=>{if(e.name!=='AbortError'){omSyncPlayer();omToast('No se pudo reproducir este archivo. Prueba con otra canción.');}});
  if('mediaSession'in navigator){
    try{navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:s.artist,album:s.album||'OMUSIC',artwork:[{src:s.cover||new URL('placeholder.svg',location.href).href}]});
      navigator.mediaSession.setActionHandler('play',()=>audio.play().catch(()=>{}));navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('previoustrack',()=>prevSong());navigator.mediaSession.setActionHandler('nexttrack',()=>playNext());
    }catch{}
  }
  if(typeof updateMobPlayerInfo==='function')updateMobPlayerInfo();
};
window.playPause=function(){
  if(!currentSong)return omToast('Elige una canción o video para empezar.');
  const vp=$om('videoPlayer');const videoOpen=typeof activeVideo!=='undefined'&&activeVideo;
  if(!audio.getAttribute('src'))return loadSong(currentSong);
  if(audio.paused){audio.play().catch(()=>omToast('No se pudo reproducir el archivo. Prueba otra canción.'));if(videoOpen)vp.play().catch(()=>{});}else{audio.pause();if(videoOpen)vp.pause();}
};
window.playNext=function(){
  if(queue.length){const s=queue.shift();renderQueue();return loadSong(s);}
  if(!currentSong)return;
  const list=OM.playbackList.length?OM.playbackList:songs;let i=list.findIndex(s=>s.url===currentSong?.url);
  if(shuffleActive&&list.length>1){let n=i;while(n===i)n=Math.floor(Math.random()*list.length);i=n;}else i=(i+1)%list.length;
  if(list[i])loadSong(list[i]);
};
window.prevSong=function(){
  if(!currentSong)return;
  if(audio.currentTime>3){audio.currentTime=0;return;}
  const list=OM.playbackList.length?OM.playbackList:songs;const i=list.findIndex(s=>s.url===currentSong?.url);
  const s=history.pop()||list[(i-1+list.length)%list.length];if(s)loadSong(s,{history:false});
};
window.handleSongEnd=function(){if(repeatActive){audio.currentTime=0;audio.play().catch(()=>{});}else playNext();};
window.toggleShuffle=function(){shuffleActive=!shuffleActive;$om('btn-shuffle').classList.toggle('mode-active',shuffleActive);$om('btn-shuffle').setAttribute('aria-pressed',String(shuffleActive));omToast(shuffleActive?'Reproducción aleatoria activada.':'Reproducción aleatoria desactivada.');};
window.toggleRepeat=function(){repeatActive=!repeatActive;$om('btn-repeat').classList.toggle('mode-active',repeatActive);$om('btn-repeat').setAttribute('aria-pressed',String(repeatActive));omToast(repeatActive?'Esta canción se repite.':'Repetición desactivada.');};
function omSyncPlayer(){
  omSyncArtistLinks();
  const selected=!!currentSong?.url,player=$om('mainPlayer');document.body.classList.toggle('om-no-media',!selected);
  if(player){player.hidden=!selected;player.style.display=selected?'flex':'none';player.setAttribute('aria-hidden',String(!selected));}
  const playing=selected&&!audio.paused;document.body.classList.toggle('om-is-playing',playing);
  $om('playBtn').innerHTML=icon(playing?'pause':'play',22);$om('playBtn').setAttribute('aria-label',playing?'Pausar':'Reproducir');
  const saved=OM.liked.has(currentSong?.url);const b=$om('om-save-track');if(b){b.innerHTML=icon(saved?'check':'save',19);b.classList.toggle('saved',saved);b.setAttribute('aria-pressed',String(saved));b.title=saved?'Quitar de Tus me gusta':'Guardar en Tus me gusta';}
  document.querySelectorAll('.om-track-row').forEach(r=>r.classList.toggle('is-current',r.dataset.url===currentSong?.url));
  if(typeof updateMobPlayerBtn==='function')updateMobPlayerBtn();
  const mb=$om('mob-heart-btn');if(mb){mb.innerHTML=icon(saved?'heart':'save',23);mb.style.color=saved?'#1ed760':'#fff';mb.setAttribute('aria-label',saved?'Quitar de Tus me gusta':'Guardar en Tus me gusta');}
}
window.addToQueue=function(s){if(!s)return;queue.push(s);renderQueue();omToast('Agregada a la cola de reproducción.');};
window.renderQueue=function(){
  queueList.innerHTML=`<div class="om-queue-section-label">Sonando ahora</div>${currentSong?`<div class="om-queue-current">${img(currentSong.cover)}<span><strong>${esc(currentSong.title)}</strong><small>${esc(currentSong.artist)}</small></span>${icon('music',18)}</div>`:'<p class="om-queue-empty">Elige una canción para empezar.</p>'}<div class="om-queue-section-label">A continuación <span>${queue.length}</span></div>`+
    (queue.length?queue.map((s,i)=>`<div class="om-queue-row"><button onclick="omPlayQueued(${i})">${img(s.cover)}<span><strong>${esc(s.title)}</strong><small>${esc(s.artist)}</small></span></button><button onclick="removeFromQueue(${i})" aria-label="Quitar ${esc(s.title)} de la cola">${icon('close',17)}</button></div>`).join(''):'<div class="om-queue-empty">Tu cola está lista para tus favoritas.<br><small>Abre los tres puntos de una canción para agregarla.</small></div>');
  const mq=$om('mob-queue-list');if(mq)mq.innerHTML=queueList.innerHTML;
};
function omPlayQueued(i){const s=queue.splice(i,1)[0];renderQueue();if(s)loadSong(s);}
window.removeFromQueue=i=>{queue.splice(i,1);renderQueue();};
window.toggleQueue=function(){const open=queueBox.classList.toggle('active');$om('om-queue-btn').classList.toggle('active',open);$om('om-queue-btn').setAttribute('aria-expanded',String(open));if(open)renderQueue();};
window.toggleLyricsView=function(){
  if(!currentSong)return omToast('Elige una canción para ver su letra.');
  if(!lyricsContainer.textContent.trim())loadLyrics(currentSong.lyricsUrl);
  clearTimeout(OM.lyricTimer);const opening=!lyricsOverlay.classList.contains('active');
  if(opening){lyricsOverlay.style.display='grid';requestAnimationFrame(()=>lyricsOverlay.classList.add('active'));}else{lyricsOverlay.classList.remove('active');OM.lyricTimer=setTimeout(()=>{if(!lyricsOverlay.classList.contains('active'))lyricsOverlay.style.display='none';},260);}
  $om('om-lyrics-btn').classList.toggle('active',opening);
};
window.loadLyrics=async function(url){
  const request=++OM.lyricRequest;currentLrcLines=[];lyricsContainer.textContent='';
  if(!url){lyricsContainer.innerHTML='<p class="lrc-line">Esta canción todavía no tiene letra disponible.</p>';return;}
  lyricsContainer.innerHTML='<p class="lrc-line">Buscando las palabras…</p>';
  try{const response=await fetch(url);if(!response.ok)throw Error();const text=await response.text();if(request!==OM.lyricRequest)return;parseLrc(text);renderLyricsToContainer();}catch{if(request===OM.lyricRequest)lyricsContainer.innerHTML='<p class="lrc-line">La letra no está disponible en este momento.</p>';}
};
function omMute(){if(audio.volume){OM.lastVolume=audio.volume;audio.volume=0;}else audio.volume=OM.lastVolume||.7;volume.value=audio.volume;omVolumeUI();}
function omVolumeUI(){const b=$om('om-volume-btn');if(b){b.innerHTML=icon(audio.volume?'volume':'mute',19);b.setAttribute('aria-label',audio.volume?'Silenciar':'Activar sonido');}volume.style.setProperty('--volume-percent',(audio.volume*100)+'%');storeOM('omusic_volume',audio.volume);}
function omToggleNowPanel(){const p=$om('om-now-panel');p.hidden=!p.hidden;document.body.classList.toggle('om-now-open',!p.hidden);if(!p.hidden)omRenderNowPanel();}
function omRenderNowPanel(){const p=$om('om-now-panel');if(!p||p.hidden)return;const s=currentSong;if(!s)return;p.innerHTML=`<div class="om-now-heading"><strong>Sonando ahora</strong><button onclick="omToggleNowPanel()" aria-label="Cerrar panel">${icon('close',19)}</button></div>${img(s.cover,s.title,'om-now-cover')}<div class="om-now-meta"><div><h2>${esc(s.title)}</h2><p>${omArtistLinks(s.artist)}</p></div><button onclick="omLike(currentSong)" aria-label="Guardar canción">${icon(OM.liked.has(s.url)?'check':'save',21)}</button></div><button class="om-now-album" onclick="filterByAlbum(${esc(JSON.stringify(s.album||''))})"><span>DEL ÁLBUM</span><strong>${esc(s.album||'Sencillo')}</strong>${icon('arrow',20)}</button><div class="om-now-about"><span>Tu música, más cerca.</span><p>Abre las letras, guarda esta canción o agrégala a una de tus playlists.</p><button class="om-button-outline" onclick="openOptions(currentSong)">Agregar a una playlist</button></div>`;}

window.toggleMobHeart=()=>omLike(currentSong);
window.openMobPlayerModal=function(){
  const modal=$om('mob-player-modal');if(modal._closeTimer){clearTimeout(modal._closeTimer);modal._closeTimer=null;}
  modal.classList.remove('is-closing');modal.style.display='flex';modal.classList.add('is-open');
  updateMobPlayerInfo();omSyncPlayer();
  if(isMobile())window.history.pushState({omusicView:'player'},'');
  setTimeout(()=>modal.classList.remove('is-open'),450);
};
window.openMobLyricsView=function(){
  closeMobPlayerModal();setTimeout(()=>{if(!lyricsOverlay.classList.contains('active'))toggleLyricsView();},360);
};
window.closeMobLyricsView=function(){if(lyricsOverlay.classList.contains('active'))toggleLyricsView();};
const openVideoOriginalOM=openVideo;
window.openVideo=function(url,v){
  currentSong=v?{...v,type:'video'}:null;currentLrcLines=[];openVideoOriginalOM(url,v);
  omSyncPlayer();renderQueue();omRenderNowPanel();
};

function omCloseAuth(){$om('login-overlay').style.display='none';}
function omCloseProfile(){$om('om-profile-menu').hidden=true;document.querySelector('.om-avatar')?.setAttribute('aria-expanded','false');}
function omOpenAuth(){const el=$om('login-overlay');el.style.display='flex';el.style.opacity='1';$om('authError').textContent=window._omAuthError||'';omCloseProfile();}
function omToggleProfile(){
  const menu=$om('om-profile-menu');menu.hidden=!menu.hidden;document.querySelector('.om-avatar').setAttribute('aria-expanded',String(!menu.hidden));
  if(menu.hidden)return;
  const u=window._currentFirebaseUser;
  menu.innerHTML=`<div><strong>${esc(window.omProfileData?.().name||u?.displayName||u?.email||'Invitado')}</strong><small>${u?'Sesión iniciada. Tu biblioteca personal está disponible.':'Modo local · Sin iniciar sesión.'}</small></div><button onclick="omCloseProfile();omOpenProfile()">Ver mi perfil</button><button onclick="omCloseProfile();omEditProfile()">Editar perfil y portada</button><button onclick="openPlaylists();omCloseProfile()">Tu biblioteca</button>${u?'<button onclick="omLogout()">Cerrar sesión</button>':'<button onclick="omOpenAuth();loginGoogle()">Iniciar sesión con Google</button><button onclick="omOpenAuth()">Opciones de inicio de sesión</button>'}<button onclick="loginGuest();omCloseProfile()">${u?'Cambiar a':'Continuar en'} modo offline (invitado)</button>`;
}
function omSyncProfile(){
  const u=window._currentFirebaseUser,profile=window.omProfileData?.();const name=profile?.name||u?.displayName||u?.email||'Invitado';
  const pic=profile?.photo||u?.photoURL||(!u?localStorage.getItem('userProfilePic'):null);
  const avatar=document.querySelector('.om-avatar');if(!avatar)return;
  avatar.innerHTML=pic?img(pic,name):esc(name.charAt(0).toUpperCase());avatar.title=name;avatar.setAttribute('aria-label','Abrir perfil de '+name);
}
async function omLogout(){omCloseProfile();try{await window.logout();}catch{omToast('No se pudo cerrar la sesión. Intenta de nuevo.');}}
function omSessionChanged(){
  OM.listenRequest=null;OM.back=[];OM.forward=[];OM.libraryQuery='';OM.currentPlaylist=null;
  omCloseProfile();omLoadPreferences();omSyncProfile();
  window.omResetSocialSession?.();loadPlaylistsFromCloud(window._currentFirebaseUser?.uid||null);if(!window.omOpenSharedRoute?.())omShowHome(false);omSyncPlayer();
}
const saveProfilePicOriginalOM=saveProfilePic;
window.saveProfilePic=function(input){const f=input.files?.[0];if(!f)return;if(!f.type.startsWith('image/'))return omToast('Elige un archivo de imagen.');if(f.size>3*1024*1024)return omToast('Usa una foto de menos de 3 MB.');saveProfilePicOriginalOM(input);setTimeout(omSyncProfile,200);};

function omBoot(){
  omBuildShell();omLoadPreferences();omInitDurations();
  // Sustituir el inicio pesado original; conservar todo el catálogo y sus funciones.
  window.onload=()=>{};
  audio.volume=Math.min(1,Math.max(0,Number(readOM('omusic_volume',.7))));volume.value=audio.volume;omVolumeUI();
  volume.oninput=()=>{audio.volume=Number(volume.value);omVolumeUI();};
  search.oninput=()=>{clearTimeout(OM.searchTimer);OM.searchTimer=setTimeout(()=>omSearch(OM.view!=='search'),130);};
  $om('om-library-search').oninput=e=>{OM.libraryQuery=e.target.value;omRenderLibrary();};
  currentSong=null;OM.playbackList=[];title.textContent='Selecciona una canción';artist.textContent='';cover.src='placeholder.svg';
  $om('lyrics-cover-big').src='placeholder.svg';$om('lyrics-bg').src='placeholder.svg';$om('lyrics-meta-title').textContent='';$om('lyrics-meta-artist').textContent='';
  cover.onerror=()=>{cover.src='placeholder.svg';cover.onerror=null;};
  $om('cover-container').onclick=()=>{if(typeof activeVideo!=='undefined'&&activeVideo)restoreVideo();else openMobPlayerModal();};
  artist.onclick=null;
  audio.addEventListener('play',omSyncPlayer);audio.addEventListener('pause',omSyncPlayer);audio.addEventListener('ended',omSyncPlayer);
  audio.addEventListener('playing',omRecordListen);
  window.addEventListener('omusic-auth-state',omSessionChanged);
  audio.addEventListener('loadedmetadata',()=>{if(currentSong&&Number.isFinite(audio.duration))omCacheDuration(currentSong.url,audio.duration);});
  audio.addEventListener('error',()=>{omSyncPlayer();omToast('El archivo de esta canción no está disponible. Prueba con otra.');});
  audio.addEventListener('timeupdate',()=>progress.setAttribute('aria-valuenow',String(Math.round(Number(progress.value)))));
  progress.onclick=e=>{if(!Number.isFinite(audio.duration))return;const r=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*audio.duration;if(typeof activeVideo!=='undefined'&&activeVideo)$om('videoPlayer').currentTime=audio.currentTime;};
  progress.onkeydown=e=>{if(!Number.isFinite(audio.duration))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+(e.key==='ArrowRight'?5:-5)));}};
  audio.onended=handleSongEnd;
  document.addEventListener('keydown',e=>{
    const input=e.target.closest('input,textarea,select,[contenteditable="true"]');
    if(e.key==='Escape'){omCloseDialog();omCloseAuth();closeOptions();$om('om-profile-menu').hidden=true;if(lyricsOverlay.classList.contains('active'))toggleLyricsView();if(queueBox.classList.contains('active'))toggleQueue();return;}
    if(e.key==='Tab'&&!$om('om-dialog-backdrop').hidden){const items=[...$om('om-dialog-backdrop').querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled&&el.getClientRects().length);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    if(input)return;
    if(e.key==='/'){e.preventDefault();search.focus();}
    if(e.code==='Space'&&!e.target.closest('button')){e.preventDefault();playPause();}
  });
  $om('om-dialog-backdrop').onclick=e=>{if(e.target===$om('om-dialog-backdrop'))omCloseDialog();};
  document.addEventListener('click',e=>{if(!e.target.closest('.om-avatar,#om-profile-menu')){$om('om-profile-menu').hidden=true;document.querySelector('.om-avatar').setAttribute('aria-expanded','false');}});
  loadPlaylistsFromCloud(window._currentFirebaseUser?.uid||null);
  omShowHome(false);omSyncPlayer();omSyncProfile();renderQueue();
  // El tema usa su propia navegación móvil; los modales originales siguen disponibles.
  if(typeof applyMobTapZone==='function')applyMobTapZone();
  window.addEventListener('resize',()=>{search.style.display='';document.body.classList.remove('player-hidden');});
  if(typeof window.loginGoogle!=='function')window.loginGoogle=()=>{$om('authError').textContent='La conexión con Google aún no está lista. Puedes continuar como invitado.';};
  if(typeof window.loginGitHub!=='function')window.loginGitHub=()=>{$om('authError').textContent='La conexión con GitHub aún no está lista. Puedes continuar como invitado.';};
}

omBoot();
