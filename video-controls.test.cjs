'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'omusic-video.js'), 'utf8');
const phoneSource = fs.readFileSync(path.join(__dirname, 'omusic-mobile-video.js'), 'utf8');

// El arnés simula las API de medios: permite reproducir carreras entre pistas
// y cambios de fullscreen sin depender de archivos remotos ni permisos de la UI.
class Target {
  constructor() { this.events = new Map(); }
  addEventListener(name, handler) {
    if (!this.events.has(name)) this.events.set(name, new Set());
    this.events.get(name).add(handler);
  }
  emit(name, values = {}) {
    const event = { type: name, target: this, preventDefault() {}, stopImmediatePropagation() {}, ...values };
    this['on' + name]?.(event);
    for (const fn of this.events.get(name) || []) fn(event);
  }
}
class Element extends Target {
  constructor() {
    super(); this.attrs = new Map(); this.style = {setProperty:(name,value)=>this.style[name]=value}; this.hidden = false; this.textContent = ''; this.innerHTML = '';
    const values = new Set();
    this.classList = {
      add: (...args) => args.forEach(value => values.add(value)),
      remove: (...args) => args.forEach(value => values.delete(value)),
      contains: value => values.has(value),
      toggle: (value, force) => { const enabled = force === undefined ? !values.has(value) : force; enabled ? values.add(value) : values.delete(value); return enabled; }
    };
  }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  removeAttribute(name) { this.attrs.delete(name); }
  get src() { return this.getAttribute('src') || ''; }
  set src(value) { this.setAttribute('src', value); }
  contains(el) { return el === this; }
  focus() { this.focused = true; }
  append(...children) { this.children=(this.children||[]).concat(children); }
  querySelector(selector) { this.parts ||= new Map(); if(!this.parts.has(selector))this.parts.set(selector,new Element());return this.parts.get(selector); }
  querySelectorAll() { return []; }
  get isConnected() { return true; }
}
class Media extends Element {
  constructor() { super(); this.paused = true; this.ended = false; this.readyState = 1; this.currentTime = 0; this.duration = 240; this.playbackRate = 1; this.volume = .7; }
  play() { this.paused = false; this.emit('play'); return Promise.resolve(); }
  pause() { if (this.paused) return; this.paused = true; this.emit('pause'); }
  load() { this.paused = true; this.currentTime = 0; }
}
function setup(phone = false) {
  const nodes = new Map();
  for (const id of ['videoModal', 'fsControls', 'fsBtn', 'fsPlayBtn', 'fsProgress', 'fsCurrentTime', 'fsDuration', 'fsVolume', 'cover-container', 'cover', 'lyrics-cover-big', 'lyrics-bg', 'lyrics-meta-title', 'lyrics-meta-artist', 'fsTitleText', 'fsArtistText', 'mob-player-modal', 'mobCloseVideoBtn', 'title', 'artist', 'progress', 'current', 'duration']) nodes.set(id, new Element());
  for (const id of ['audio', 'videoPlayer', 'miniVideoEl', 'lyrics-cover-video', 'mob-player-cover-video']) nodes.set(id, new Media());
  nodes.get('miniVideoEl').classList.add('mini-video-hidden');
  const expand = new Element(), player = new Element(), document = new Target();
  document.body = new Element(); document.fullscreenElement = null;
  document.querySelector = selector => selector === '.om-expand-btn' ? expand : selector === '.player' ? player : null;
  const background=[new Element(),new Element()];background[0].inert=false;background[1].inert=true;
  document.querySelectorAll = () => background;
  document.createElement = () => new Element();
  const audio = nodes.get('audio'), video = nodes.get('videoPlayer'), mini = nodes.get('miniVideoEl'), modal = nodes.get('videoModal');
  modal.contains = el => el === modal || el === video;
  let playerOpens = 0, exitCalls = 0;
  const messages = [], timers = new Map(); let timerId = 0;
  const context = {
    document, navigator: {}, activeVideo: null, currentSong: { title: 'Song A', url: 'song-a.flac' }, currentLrcLines: [],
    audio, cover: nodes.get('cover'), title: nodes.get('title'), artist: nodes.get('artist'), progress: nodes.get('progress'), current: nodes.get('current'), duration: nodes.get('duration'),
    $om: id => {if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);}, icon: name => name, formatTime: seconds => String(seconds || 0),
    updateLyricsSync() {}, updateMobVideoControls() {}, renderQueue() {}, omRenderNowPanel() {}, omSyncPlayer() {}, loadLyrics() {}, handleSongEnd() {}, playVideo_ended() {}, applyMobTapZone() {},
    omToast: message => messages.push(message), isMobile: () => false,
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    history: { pushState() {} },
    loadSong(song) { context.currentSong = song; audio.src = song.url; audio.play(); },
    openMobPlayerModal() { ++playerOpens; }
  };
  if(phone){
    context.matchMedia=query=>({matches:query.startsWith('(max-width')});context.addEventListener=()=>{};context.screen={};context.queue=[];
    context.videos=[{title:'Video A',url:'video-a.mp4',artist:'Artist A'},{title:'Video B',url:'video-b.mp4',artist:'Artist B'},{title:'Video C',url:'video-c.mp4',artist:'Artist C',blocked:true}];
    context.OM={liked:new Set()};context.OMSettings={allowed:item=>!item.blocked,prefs:{autoplay:true}};
    context.userKeyOM=()=> 'guest';context.esc=value=>String(value);context.img=()=>'<img>';context.artistPhotoOM=()=>'';context.omArtistLinks=value=>value;context.shuffleActive=false;context.repeatActive=false;
  }
  context.window = context;
  document.exitFullscreen = () => { ++exitCalls; document.fullscreenElement = null; document.webkitFullscreenElement = null; document.emit('fullscreenchange'); return Promise.resolve(); };
  vm.createContext(context); vm.runInContext(source, context);
  if(phone)vm.runInContext(phoneSource,context);
  const start = () => context.openVideo('video-a.mp4', { title: 'Video A', artist: 'Artist A', cover: 'cover-a.jpg' });
  return { context, audio, video, mini, modal, document, expand, nodes, messages, start, background, timers:()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}, playerOpens: () => playerOpens, exitCalls: () => exitCalls };
}
const settle = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

test('en video completo la inactividad oculta todo el cromo, incluso si el video está pausado',()=>{
  const h=setup();h.start();h.context.toggleFullscreenVideo();h.audio.pause();h.timers();assert.equal(h.modal.classList.contains('om-video-ui-hidden'),true);assert.equal(h.nodes.get('fsControls').style.opacity,'0');
  h.audio.currentTime=40;h.audio.emit('timeupdate');assert.equal(h.modal.classList.contains('om-video-ui-hidden'),true);
});
test('tocar la imagen o usar el teclado vuelve a mostrar los controles sin cambiar la reproducción',()=>{
  const h=setup();h.start();h.context.toggleFullscreenVideo();h.audio.currentTime=42;h.timers();h.modal.emit('click');assert.equal(h.modal.classList.contains('om-video-ui-hidden'),false);assert.equal(h.audio.currentTime,42);assert.equal(h.audio.paused,false);
  h.timers();h.document.emit('keydown',{key:'Tab'});assert.equal(h.modal.classList.contains('om-video-ui-hidden'),false);
});
test('arrastrar un control conserva su visibilidad y el temporizador se reinicia al soltar',()=>{
  const h=setup();h.start();h.context.toggleFullscreenVideo();h.modal.emit('pointerdown',{target:{closest:()=>({tagName:'INPUT'})}});h.timers();assert.equal(h.modal.classList.contains('om-video-ui-hidden'),false);
  h.document.emit('pointerup');h.timers();assert.equal(h.modal.classList.contains('om-video-ui-hidden'),true);
});
test('salir del modo completo o minimizar retira la ocultación para la próxima apertura',()=>{
  const h=setup();h.start();h.context.toggleFullscreenVideo();h.timers();h.context.toggleFullscreenVideo();assert.equal(h.modal.classList.contains('om-video-ui-hidden'),false);h.context.minimizeVideo();h.context.restoreVideo();assert.equal(h.modal.classList.contains('om-video-ui-hidden'),false);
});
test('la vista vertical normal del teléfono no oculta sus controles por inactividad',()=>{
  const h=setup(true);h.start();h.timers();assert.equal(h.modal.classList.contains('om-video-ui-hidden'),false);
});

test('el video de teléfono abre dentro de la pestaña, con controles y fondo inaccesible',()=>{
  const h=setup(true);let requests=0;h.modal.requestFullscreen=()=>{requests++;return Promise.resolve();};h.start();
  assert.equal(requests,0);assert.equal(h.context.OMMobileVideo.visible,true);assert.equal(h.modal.getAttribute('role'),'dialog');assert.equal(h.nodes.get('om-vm-title').textContent,'Video A');assert.ok(h.background.every(node=>node.inert));assert.equal(h.audio.paused,false);
});
test('minimizar y restaurar el video en teléfono conserva el audio y el punto de reproducción',async()=>{
  const h=setup(true);h.start();h.audio.currentTime=51;h.audio.pause();h.context.omMobileVideoMinimize();await settle();
  assert.equal(h.context.OMMobileVideo.visible,false);assert.equal(h.modal.style.display,'none');assert.equal(h.background[0].inert,false);assert.equal(h.background[1].inert,true);
  h.context.restoreVideo();await settle();assert.equal(h.context.OMMobileVideo.visible,true);assert.equal(h.audio.currentTime,51);assert.equal(h.audio.paused,true);assert.equal(h.video.paused,true);
});
test('Siguiente en teléfono sigue el catálogo de videos y omite los bloqueados',()=>{
  const h=setup(true);h.start();h.context.playNext();assert.equal(h.context.activeVideo.url,'video-b.mp4');h.context.playNext();assert.equal(h.context.activeVideo.url,'video-a.mp4');
  h.audio.currentTime=0;h.context.prevSong();assert.equal(h.context.activeVideo.url,'video-b.mp4');
});
test('Anterior reinicia el video y el control de posición no reanuda un video pausado',()=>{
  const h=setup(true);h.start();h.audio.pause();h.audio.currentTime=44;h.context.prevSong();assert.equal(h.context.activeVideo.url,'video-a.mp4');assert.equal(h.audio.currentTime,0);
  h.context.omMobileVideoSeek(500);assert.equal(h.audio.currentTime,120);assert.equal(h.video.currentTime,120);assert.equal(h.audio.paused,true);
  h.audio.duration=NaN;h.context.omMobileVideoSeek(900);assert.equal(h.audio.currentTime,120);
});
test('el final respeta autoplay desactivado y repetición en teléfono',async()=>{
  const h=setup(true);h.start();h.audio.currentTime=240;h.audio.pause();h.context.OMSettings.prefs.autoplay=false;h.context.playVideo_ended();assert.equal(h.context.activeVideo.url,'video-a.mp4');assert.equal(h.audio.paused,true);
  h.context.repeatActive=true;h.context.playVideo_ended();await settle();assert.equal(h.audio.currentTime,0);assert.equal(h.audio.paused,false);
});
test('cambiar de pista cancela un cierre animado pendiente y no oculta el video nuevo',()=>{
  const h=setup(true);let finish;h.context.OMMotion={enter(){},cancel(){},leave:(element,type,done)=>finish=done};h.start();h.context.omMobileVideoMinimize();
  h.context.openVideo('video-b.mp4',h.context.videos[1]);finish();assert.equal(h.context.activeVideo.url,'video-b.mp4');assert.equal(h.modal.style.display,'flex');assert.equal(h.context.OMMobileVideo.visible,true);
});
test('de video a canción retira el diálogo móvil y restaura los permisos de foco anteriores',()=>{
  const h=setup(true);h.start();h.context.loadSong({title:'Una canción',url:'song.flac'});assert.equal(h.context.OMMobileVideo.visible,false);assert.equal(h.background[0].inert,false);assert.equal(h.background[1].inert,true);assert.equal(h.audio.src,'song.flac');assert.equal(h.modal.getAttribute('aria-modal'),null);
});

test('pantalla completa nativa entra y sale con el mismo botón', async () => {
  const h = setup(); h.start();
  h.modal.requestFullscreen = () => { h.document.fullscreenElement = h.modal; h.document.emit('fullscreenchange'); return Promise.resolve(); };
  h.context.toggleFullscreenVideo(); await settle();
  assert.equal(h.document.fullscreenElement, h.modal);
  assert.equal(h.modal.classList.contains('om-video-fullscreen'), true);
  assert.equal(h.nodes.get('fsBtn').getAttribute('aria-pressed'), 'true');
  h.context.toggleFullscreenVideo(); await settle();
  assert.equal(h.document.fullscreenElement, null);
  assert.equal(h.modal.classList.contains('om-video-fullscreen'), false);
  assert.equal(h.audio.paused, false);
});

test('fullscreen bloqueado mantiene el video maximizado y Escape lo restaura', async () => {
  const h = setup(); h.start(); h.modal.requestFullscreen = () => Promise.reject(new Error('Permissions Policy'));
  h.context.toggleFullscreenVideo(); await settle();
  assert.equal(h.modal.classList.contains('om-video-fullscreen'), true);
  h.document.emit('keydown', { key: 'Escape' });
  assert.equal(h.modal.classList.contains('om-video-fullscreen'), false);
  assert.equal(h.modal.style.display, 'flex');
  assert.equal(h.audio.paused, false);
});

test('fullscreen funciona con la API WebKit que no devuelve una promesa', async () => {
  const h = setup(); h.start();
  h.modal.webkitRequestFullscreen = () => { h.document.webkitFullscreenElement = h.modal; h.document.emit('webkitfullscreenchange'); };
  h.context.toggleFullscreenVideo(); await settle();
  assert.equal(h.nodes.get('fsBtn').getAttribute('aria-pressed'), 'true');
  h.document.exitFullscreen = undefined;
  h.document.webkitExitFullscreen = () => { h.document.webkitFullscreenElement = null; h.document.emit('webkitfullscreenchange'); };
  h.context.toggleFullscreenVideo(); await settle();
  assert.equal(h.nodes.get('fsBtn').getAttribute('aria-pressed'), 'false');
});

test('pausar y reanudar el audio también controla el mini video', async () => {
  const h = setup(); h.start(); h.context.minimizeVideo(); await settle();
  assert.equal(h.mini.paused, false); assert.equal(h.video.paused, true);
  h.audio.pause(); await settle();
  assert.equal(h.mini.paused, true);
  await h.audio.play(); await settle();
  assert.equal(h.mini.paused, false); assert.equal(h.video.paused, true);
  h.audio.currentTime = 82; h.audio.playbackRate = 1.5; h.audio.emit('seeking');
  assert.equal(h.mini.currentTime, 82); assert.equal(h.mini.playbackRate, 1.5);
});

test('minimizar y restaurar mientras está pausado no inicia la reproducción', async () => {
  const h = setup(); h.start(); h.audio.pause();
  h.context.minimizeVideo(); await settle(); assert.equal(h.mini.paused, true);
  h.context.restoreVideo(); await settle();
  assert.equal(h.video.paused, true); assert.equal(h.mini.paused, true); assert.equal(h.audio.paused, true);
});

test('cambiar de video minimizado a canción limpia el video sin pausar la pista nueva', async () => {
  const h = setup(); h.start(); h.context.minimizeVideo();
  h.context.loadSong({ title: 'Song B', url: 'song-b.flac' }); await settle();
  assert.equal(h.context.activeVideo, null); assert.equal(h.modal.style.display, 'none');
  assert.equal(h.video.getAttribute('src'), null); assert.equal(h.mini.getAttribute('src'), null);
  assert.equal(h.mini.paused, true); assert.equal(h.mini.classList.contains('mini-video-hidden'), true);
  assert.equal(h.nodes.get('cover').classList.contains('mini-video-hidden'), false);
  assert.equal(h.audio.src, 'song-b.flac'); assert.equal(h.audio.paused, false); assert.equal(h.expand.hidden, false);
});

test('cambiar de canción sale del fullscreen y conserva el nuevo audio', async () => {
  const h = setup(); h.start();
  h.modal.requestFullscreen = () => { h.document.fullscreenElement = h.modal; h.document.emit('fullscreenchange'); return Promise.resolve(); };
  h.context.toggleFullscreenVideo(); await settle();
  h.context.loadSong({ title: 'Song C', url: 'song-c.flac' }); await settle();
  assert.equal(h.document.fullscreenElement, null); assert.equal(h.exitCalls(), 1);
  assert.equal(h.document.body.classList.contains('om-video-fullscreen'), false);
  assert.equal(h.audio.src, 'song-c.flac'); assert.equal(h.audio.paused, false);
});

test('la expansión de portada se oculta para videos y vuelve para canciones', async () => {
  const h = setup(); assert.equal(h.expand.hidden, false);
  h.start(); h.context.minimizeVideo(); assert.equal(h.expand.hidden, true);
  h.context.openMobPlayerModal(); assert.equal(h.playerOpens(), 0); assert.equal(h.modal.style.display, 'flex');
  h.context.loadSong({ title: 'Song D', url: 'song-d.flac' });
  h.context.openMobPlayerModal(); assert.equal(h.expand.hidden, false); assert.equal(h.playerOpens(), 1);
});

test('un rechazo tardío de fullscreen no reaparece sobre una canción', async () => {
  const h = setup(); let reject;
  h.start(); h.modal.requestFullscreen = () => new Promise((_, no) => { reject = no; });
  h.context.toggleFullscreenVideo(); h.context.loadSong({ title: 'Song E', url: 'song-e.flac' });
  reject(new Error('Late rejection')); await settle();
  assert.equal(h.modal.style.display, 'none'); assert.equal(h.modal.classList.contains('om-video-fullscreen'), false);
});

test('una entrada tardía a fullscreen se cancela después de cambiar de canción', async () => {
  const h = setup(); let enter;
  h.start(); h.modal.requestFullscreen = () => new Promise(resolve => { enter = () => { h.document.fullscreenElement = h.modal; h.document.emit('fullscreenchange'); resolve(); }; });
  h.context.toggleFullscreenVideo(); h.context.loadSong({ title: 'Song F', url: 'song-f.flac' });
  enter(); await settle();
  assert.equal(h.document.fullscreenElement, null); assert.equal(h.audio.src, 'song-f.flac'); assert.equal(h.audio.paused, false);
});

test('abrir otro video descarga la miniatura anterior y no deja cierres pendientes', async () => {
  const h = setup(); h.start(); h.context.minimizeVideo();
  h.context.loadSong({ title: 'Song G', url: 'song-g.flac' });
  h.context.openVideo('video-b.mp4', { title: 'Video B' }); await settle();
  assert.equal(h.context.activeVideo.url, 'video-b.mp4'); assert.equal(h.modal.style.display, 'flex');
  assert.equal(h.mini.getAttribute('src'), null); assert.equal(h.mini.paused, true); assert.equal(h.video.src, 'video-b.mp4');
  assert.equal(h.video.paused, false); assert.equal(h.nodes.get('cover').classList.contains('mini-video-hidden'), false);
});

test('minimizar repetidamente no acumula manejadores y cerrar detiene ambos videos', async () => {
  const h = setup(); h.start(); const progressHandler = h.audio.ontimeupdate;
  for (let i = 0; i < 8; i++) { h.context.minimizeVideo(); h.context.restoreVideo(); }
  assert.equal(h.audio.ontimeupdate, progressHandler); assert.equal(h.audio.events.get('pause').size, 1);
  h.context.minimizeVideo(); h.context.closeVideo(); await settle();
  assert.equal(h.audio.paused, true); assert.equal(h.video.paused, true); assert.equal(h.mini.paused, true);
  assert.equal(h.video.getAttribute('src'), null); assert.equal(h.mini.getAttribute('src'), null);
});
