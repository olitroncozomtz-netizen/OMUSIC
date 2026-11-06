const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=__dirname;
function setup(){
  const nodes=new Map(),memory=new Map(),extras=[],messages=[];
  function element(){const values=new Set();return {innerHTML:'',textContent:'',style:{},dataset:{},hidden:false,pause(){},play:()=>Promise.resolve(),parentElement:{classList:{toggle(){}}},classList:{add:(...names)=>names.forEach(n=>values.add(n)),remove:(...names)=>names.forEach(n=>values.delete(n)),contains:n=>values.has(n),toggle:(n,force)=>{const on=force===undefined?!values.has(n):force;on?values.add(n):values.delete(n);return on;}},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},insertAdjacentHTML(position,html){this.innerHTML+=html;},after(node){extras.push(node);},remove(){const i=extras.indexOf(this);if(i>=0)extras.splice(i,1);}};}
  const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
  const artistNodes=[['Milo j','Milo j'],['Alvaro','Alvaro Díaz'],['Nsqk','NSQK'],['Bad Bunny','Bad Bunny'],['Trueno','Trueno']].map(([key,name])=>({dataset:{artistName:key,artistPhoto:key+'.jpg'},querySelector:()=>({textContent:name}),textContent:name}));
  const media=element();media.paused=true;media.currentTime=0;media.src='';media.playCalls=0;media.play=()=>{media.playCalls++;media.paused=false;return Promise.resolve();};media.pause=()=>media.paused=true;media.getAttribute=name=>name==='src'?media.src:null;
  const document={body:element(),createElement:()=>element(),getElementById:get,querySelectorAll:selector=>selector==='[data-artist-name]'?artistNodes:selector==='.om-discography'?[...extras]:[],querySelector:selector=>get(selector)};
  document.body.dataset={};
  const context={document,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},navigator:{},setTimeout:()=>1,clearTimeout(){},savePlaylists(){},loadPlaylistsFromCloud(){},saveProfilePic(){},openVideo(){},playlists:[],queue:[],history:[],currentSong:null,currentAlbumContext:null,audio:media,search:get('search'),title:get('title'),artist:get('artist'),cover:get('cover'),shuffleActive:false,repeatActive:false,formatTime:s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')};
  context.window=context;vm.createContext(context);
  vm.runInContext(['canciones.js','videos.js','track-durations.js'].map(name=>fs.readFileSync(path.join(base,name),'utf8')).join('\n'),context);
  vm.runInContext(fs.readFileSync(path.join(base,'omusic-redesign.js'),'utf8').replace(/omBoot\(\);\s*$/,''),context);
  const run=code=>vm.runInContext(code,context);
  run('omNavState=()=>{};omScrollTop=()=>{};omRenderNowPanel=()=>{};loadLyrics=()=>{};omToast=message=>window.messages.push(message);omLoadPreferences();omInitDurations();');context.messages=messages;
  return {context,run,get,memory,extras,media,messages};
}
test('Artistas solo contiene los artistas seguidos y permite dejar de seguirlos',()=>{
  const h=setup();h.run("OM.libraryFilter='artists';omRenderLibrary()");assert.doesNotMatch(h.get('om-library-items').innerHTML,/openArtistProfile/);
  h.run("omToggleFollowArtist('Milo j')");assert.match(h.get('om-library-items').innerHTML,/Milo j/);assert.doesNotMatch(h.get('om-library-items').innerHTML,/Bad Bunny/);
  h.run("omToggleFollowArtist('Milo j')");assert.doesNotMatch(h.get('om-library-items').innerHTML,/openArtistProfile/);
});
test('las variantes del nombre usan un solo seguimiento y se guardan por cuenta',()=>{
  const h=setup();h.run("window._currentFirebaseUser={uid:'a'};omLoadPreferences();omToggleFollowArtist('Álvaro Díaz')");assert.equal(h.run("OM.followedArtists.has('Alvaro')"),true);
  h.run("window._currentFirebaseUser={uid:'b'};omLoadPreferences()");assert.equal(h.run('OM.followedArtists.size'),0);
  h.run("window._currentFirebaseUser={uid:'a'};omLoadPreferences()");assert.equal(h.run('OM.followedArtists.size'),1);
  h.run("omToggleFollowArtist('Alvaro')");assert.equal(h.run('OM.followedArtists.size'),0);
});
test('el artista empieza con cinco canciones y Ver más muestra todo sin cambiar el contexto',()=>{
  const h=setup();h.run("omOpenArtist('Milo j')");const full=h.run('OM.artistContext.tracks.length');assert.ok(full>5);
  assert.equal((h.get('songList').innerHTML.match(/class="om-track-row /g)||[]).length,5);assert.match(h.get('songList').innerHTML,/Ver más/);
  assert.match(h.get('.om-toolbar-shuffle').innerHTML,/Seguir a Milo j/);
  h.run('omToggleArtistTracks()');assert.equal((h.get('songList').innerHTML.match(/class="om-track-row /g)||[]).length,full);assert.match(h.get('songList').innerHTML,/Ver menos/);
  h.run('omToggleArtistTracks()');assert.equal(h.run('OM.activeList.length'),5);
});
test('seleccionar una canción de las cinco continúa por todo el catálogo del artista',()=>{
  const h=setup();h.run("omOpenArtist('Milo j');loadSong=s=>{window.currentSong=s;window.chosen=s};omPlay(4)");
  assert.equal(h.run('OM.playbackList.length'),h.run('OM.artistContext.tracks.length'));
  h.run('playNext()');assert.equal(h.context.currentSong.url,h.run('OM.artistContext.tracks[5].url'));
});
test('la discografía excluye álbumes donde solo participa como invitado y Mostrar todo conserva el artista',()=>{
  const h=setup();const names=Array.from(h.run("omArtistAlbums('Milo j').map(a=>a.name)"));
  assert.ok(names.includes('La Vida Era Más Corta'));assert.ok(names.includes('en dormir sin Madrid'));assert.equal(names.includes('TURR4ZO'),false);
  h.run("omOpenArtist('Milo j')");assert.match(h.extras[0].innerHTML,/Discografía de Milo j/);assert.match(h.extras[0].innerHTML,/omShowArtistAlbums/);
  h.run("omShowArtistAlbums('Milo j')");assert.equal(h.run('OM.route.type'),'artistAlbums');assert.equal(h.run('OM.route.value'),'Milo j');assert.doesNotMatch(h.get('songList').innerHTML,/TURR4ZO|OMAKASE/);
  assert.equal(h.run("albumOM('DATA').artist"),'Tainy');
});
test('las cinco canciones ya muestran su duración antes de reproducir',()=>{
  const h=setup();h.run("omOpenArtist('Milo j')");
  const labels=[...h.get('songList').innerHTML.matchAll(/data-duration="[^"]*">([^<]+)</g)].map(m=>m[1]);assert.equal(labels.length,5);
  for(const label of labels)assert.match(label,/^\d+:\d\d$/);
  assert.equal(h.context.currentSong,null);assert.equal(h.media.playCalls,0);
});
test('las canciones sin archivo conservan su duración propia sin compartir una clave vacía',()=>{
  const h=setup();
  const first=h.run("omDurationLabel(songs.find(s=>s.title==='Andrea'))"),second=h.run("omDurationLabel(songs.find(s=>s.title==='Agosto'))");
  assert.match(first,/^\d+:\d\d$/);assert.match(second,/^\d+:\d\d$/);assert.notEqual(first,second);
  assert.equal(h.context.currentSong,null);assert.equal(h.media.playCalls,0);
});
test('sin canción elegida el reproductor está oculto y Reproducir no selecciona una predeterminada',()=>{
  const h=setup();h.run('omSyncPlayer();playPause()');assert.equal(h.get('mainPlayer').hidden,true);assert.equal(h.get('mainPlayer').style.display,'none');assert.equal(h.media.playCalls,0);assert.equal(h.context.currentSong,null);
  h.run('loadSong(songs[0])');assert.equal(h.get('mainPlayer').hidden,false);assert.equal(h.get('mainPlayer').style.display,'flex');assert.equal(h.media.playCalls,1);
});
test('los accesos rápidos empiezan vacíos y siguen el historial de cada usuario',()=>{
  const h=setup();assert.equal(h.run('omQuickAlbums().length'),0);
  h.run("window._currentFirebaseUser={uid:'a'};omLoadPreferences();loadSong(albumOM('SAYONARA').songs[0]);omRecordListen()");assert.equal(h.run('omQuickAlbums()[0].name'),'SAYONARA');
  h.run("window._currentFirebaseUser={uid:'b'};omLoadPreferences()");assert.equal(h.run('omQuickAlbums().length'),0);
  h.run("window._currentFirebaseUser={uid:'a'};omLoadPreferences()");assert.equal(h.run('omQuickAlbums()[0].name'),'SAYONARA');
});

test('cada artista de una colaboración abre su perfil y conserva la reproducción',()=>{
  const h=setup();h.run("currentSong=songs.find(s=>s.artist==='Nsqk, Easykid');window.beforeCredit=currentSong;omSyncPlayer()");
  assert.ok(h.context.currentSong);const markup=h.get('artist').innerHTML;
  assert.match(markup,/Ver perfil de Nsqk/);assert.match(markup,/Ver perfil de Easykid/);
  h.run("omOpenArtistCredit(null,'Easykid')");assert.equal(h.run('OM.route.value'),'Easykid');assert.ok(h.run("OM.artistContext.tracks.every(s=>omArtistMatches(s,'Easykid'))"));
  assert.equal(h.context.currentSong,h.context.beforeCredit);assert.equal(h.media.playCalls,0);
  h.run("omOpenArtistCredit(null,'Nsqk')");assert.equal(h.run('OM.route.value'),'Nsqk');assert.ok(h.run("OM.artistContext.tracks.every(s=>omArtistMatches(s,'Nsqk'))"));assert.equal(h.context.currentSong,h.context.beforeCredit);
});
test('los créditos de una lista son controles separados del botón de reproducir',()=>{
  const h=setup();h.run("omRenderTracks([songs.find(s=>s.artist==='Nsqk, Easykid')])");
  assert.match(h.get('songList').innerHTML,/class="om-track-title"/);assert.match(h.get('songList').innerHTML,/Ver perfil de Easykid/);
  assert.equal(h.context.currentSong,null);assert.equal(h.media.playCalls,0);
  assert.doesNotMatch(h.run("omArtistLinks('<img src=x onerror=alert(1)>')"),/<img/);
});


test('los videos del artista incluyen colaboraciones y respetan sus créditos completos',()=>{
  const h=setup();
  assert.ok(h.run("omArtistVideos('Álvaro Díaz').some(v=>v.title==='PIENSO EN TI.')"));
  assert.ok(h.run("omArtistVideos('Alvaro').some(v=>v.title==='MALASNOTICIAS.')"));
  assert.ok(h.run("omArtistVideos('Latin Mafia').some(v=>v.title==='MALASNOTICIAS.')"));
  assert.equal(h.run("omArtistVideos('Bad Bunny').some(v=>v.title==='PIENSO EN TI.')"),false);
  h.run("videos.push({title:'Otro artista',artist:'Alvaro Díaz Extra',url:'other'},{title:'Sin archivo',artist:'Alvaro Díaz',url:''})");
  assert.equal(h.run("omArtistVideos('Alvaro').some(v=>v.title==='Otro artista'||v.title==='Sin archivo')"),false);
});
test('el perfil muestra todos sus videos con el índice del catálogo y limpia la sección al navegar',()=>{
  const h=setup();h.run("omOpenArtist('Alvaro')");
  const html=h.extras[0].innerHTML,clips=Array.from(h.run("omArtistVideos('Alvaro')"));
  assert.match(html,/Videos de Alvaro Díaz/);
  assert.equal((html.match(/class="om-media-card om-video-card"/g)||[]).length,clips.length);
  for(const clip of clips){const index=h.run('videos').indexOf(clip);assert.ok(html.includes('playVideo('+index+')'));assert.ok(html.includes('omQueueVideo('+index+')'));}
  h.run("omOpenArtist('Trueno')");assert.equal(h.extras.length,1);assert.doesNotMatch(h.extras[0].innerHTML,/Videos de Alvaro Díaz/);
  h.run('omShowSongs()');assert.equal(h.extras.length,0);
});
test('un artista sin videos conserva su perfil y su discografía sin mostrar videos ajenos',()=>{
  const h=setup();h.run("videos.splice(0,videos.length);omOpenArtist('Milo j')");
  assert.match(h.extras[0].innerHTML,/Discografía de Milo j/);assert.doesNotMatch(h.extras[0].innerHTML,/om-artist-videos|om-video-card/);
});
