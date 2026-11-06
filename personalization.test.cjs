const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'.');
function setup(){
  const memory=new Map(),nodes=new Map();
  const get=id=>{
    if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',style:{},src:'',pause(){},play:()=>Promise.resolve(),removeAttribute(){},classList:{add(){},remove(){},toggle(){},contains:()=>false}});
    return nodes.get(id);
  };
  const audio={src:'',paused:false,play:()=>Promise.resolve(),getAttribute:name=>name==='src'?audio.src:null};
  const context={document:{getElementById:get,querySelectorAll:()=>[],querySelector:()=>null},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},setTimeout:()=>1,clearTimeout(){},navigator:{},savePlaylists(){},loadPlaylistsFromCloud(){},openVideo(){},saveProfilePic(){},playlists:[],currentSong:null,currentAlbumContext:null,history:[],audio,title:get('title'),artist:get('artist'),cover:get('cover'),loadLyrics(){}};
  context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(base,'canciones.js'),'utf8')+'\n'+fs.readFileSync(path.join(base,'videos.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(base,'omusic-redesign.js'),'utf8').replace(/omBoot\(\);\s*$/,''),context);
  const run=code=>vm.runInContext(code,context);
  context._playlistsLoaded=false;
  run('omLoadPreferences();omSyncPlayer=()=>{};omRenderNowPanel=()=>{};loadLyrics=()=>{};');
  return {context,run,memory,get,audio,rank:()=>Array.from(run('omEditorialAlbums().map(a=>a.name)'))};
}
test('las secciones aleatorias eligen álbumes distintos del catálogo completo',()=>{
  const h=setup();h.run('omRefreshHomeMix()');assert.equal(h.rank().length,3);assert.equal(new Set(h.rank()).size,3);
  assert.equal(h.run('OM.homeMix.albums.length'),8);assert.equal(h.run('new Set(OM.homeMix.albums).size'),8);
  assert.equal(h.run('albumsOM.length'),32);
});
test('Selección rápida usa nueve canciones distintas con archivo y cambia en cada visita',()=>{
  const h=setup();h.run('Math.random=()=>.99999;omRefreshHomeMix()');const before=Array.from(h.run('OM.homeMix.quick.map(s=>s.url)'));
  assert.equal(before.length,9);assert.equal(new Set(before).size,9);assert.ok(before.every(Boolean));
  h.run('omRefreshHomeMix()');assert.notDeepEqual(Array.from(h.run('OM.homeMix.quick.map(s=>s.url)')),before);
  assert.equal(h.run('OM.homeMix.quick.every(s=>songs.includes(s))'),true);
});
test('volver a Inicio cambia el orden incluso si el sorteo repite el resultado anterior',()=>{
  const h=setup();h.run('Math.random=()=>.99999;omRefreshHomeMix()');const before=h.rank(),albums=h.run('OM.homeMix.albums.map(a=>a.name).join()');
  h.run('omRefreshHomeMix()');assert.notDeepEqual(h.rank(),before);assert.notEqual(h.run('OM.homeMix.albums.map(a=>a.name).join()'),albums);
  const stable=h.rank();h.run("omToggleAlbum('SAYONARA');omUpdateEditorial()");assert.deepEqual(h.rank(),stable);
  const html=h.get('om-editorial-grid').innerHTML;
  for(const name of h.rank())assert.ok(html.includes(h.run('esc('+JSON.stringify(name)+')')));
});
test('cuenta una reproducción al comenzar y no vuelve a contar al reanudar',()=>{
  const h=setup();h.run("loadSong(albumOM('SAYONARA').songs[0])");
  assert.equal(h.run('Object.keys(OM.listens).length'),0);
  h.run('omRecordListen();omRecordListen()');assert.equal(h.run('OM.listens[currentSong.url]'),1);
  h.run('loadSong(currentSong);omRecordListen()');assert.equal(h.run('OM.listens[currentSong.url]'),2);
  h.run('OM.listens={};OM.recent=[];omLoadPreferences()');assert.equal(h.run('OM.listens[currentSong.url]'),2);
});
test('los gustos y reproducciones de una cuenta no pasan a otro usuario o al invitado',()=>{
  const h=setup();h.run("window._currentFirebaseUser={uid:'account-a'};omLoadPreferences();omToggleAlbum('SAYONARA');loadSong(albumOM('SAYONARA').songs[0]);omRecordListen()");
  assert.equal(h.run("OM.savedAlbums.has('SAYONARA')"),true);
  h.run("window._currentFirebaseUser={uid:'account-b'};omLoadPreferences();omRecordListen()");assert.equal(h.run('OM.savedAlbums.size'),0);assert.equal(h.run('Object.keys(OM.listens).length'),0);
  h.run('window._currentFirebaseUser=null;omLoadPreferences()');assert.equal(h.run('OM.savedAlbums.size'),0);
  h.run("window._currentFirebaseUser={uid:'account-a'};omLoadPreferences()");assert.equal(h.run("OM.savedAlbums.has('SAYONARA')"),true);assert.equal(h.run('OM.listens[currentSong.url]'),1);
});
test('cargar una canción sin llegar a reproducirla no modifica sus preferencias',()=>{
  const h=setup();h.run("loadSong(albumOM('SAYONARA').songs[0])");assert.equal(h.run('OM.recent.length'),0);assert.equal(h.run('Object.keys(OM.listens).length'),0);
});
test('el perfil ofrece Google y modo local, y cerrar el cuadro no cambia la sesión',()=>{
  const h=setup(),avatar={setAttribute(){}};h.context.document.querySelector=()=>avatar;
  h.get('om-profile-menu').hidden=true;h.run('omToggleProfile()');
  assert.match(h.get('om-profile-menu').innerHTML,/Iniciar sesión con Google/);assert.match(h.get('om-profile-menu').innerHTML,/modo offline/);
  h.run("window._currentFirebaseUser={uid:'account-a',displayName:'Oliver'};window._guestMode=false;omCloseProfile();omToggleProfile();omCloseAuth()");
  assert.match(h.get('om-profile-menu').innerHTML,/Cerrar sesión/);assert.equal(h.context._guestMode,false);assert.equal(h.context._currentFirebaseUser.uid,'account-a');
});
test('una carga antigua de Firestore no sustituye las playlists del invitado',async()=>{
  const h=setup();let resolveSnapshot;
  h.context._doc=()=>({});h.context._getDoc=()=>new Promise(resolve=>resolveSnapshot=resolve);
  h.memory.set('playlists_guest',JSON.stringify([{name:'Mi lista local',songs:[]}]));
  h.run("window._currentFirebaseUser={uid:'account-a'}");const loading=h.context.loadPlaylistsFromCloud('account-a');
  h.run('window._currentFirebaseUser=null');await h.context.loadPlaylistsFromCloud(null);
  resolveSnapshot({exists:()=>true,data:()=>({list:[{name:'Lista de otra cuenta',songs:[]}]})});await loading;
  assert.equal(h.context.playlists[0].name,'Mi lista local');
});
