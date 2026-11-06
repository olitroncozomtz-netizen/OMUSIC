const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'.');
function setup(){
  const memory=new Map(), nodes=new Map();
  const get=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',classList:{add(){},remove(){}}});return nodes.get(id);};
  const context={document:{getElementById:get,querySelectorAll:()=>[]},localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)},setTimeout:()=>1,clearTimeout(){},savePlaylists(){},loadPlaylistsFromCloud(){},openVideo(){},saveProfilePic(){},playlists:[]};
  context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(base,'canciones.js'),'utf8')+'\n'+fs.readFileSync(path.join(base,'videos.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(base,'omusic-redesign.js'),'utf8').replace(/omBoot\(\);\s*$/,''),context);
  const run=code=>vm.runInContext(code,context);
  run("omLoadPreferences();OM.libraryFilter='albums';omRenderLibrary();");
  return {context,run,memory,html:()=>get('om-library-items').innerHTML};
}
test('la biblioteca comienza sin álbumes automáticos',()=>{
  const h=setup();assert.match(h.html(),/Aquí aparecerán los álbumes que guardes/);assert.doesNotMatch(h.html(),/filterByAlbum/);
  assert.equal(h.run('songs.length'),365);assert.equal(h.run('albumsOM.length'),32);
});
test('guardar un álbum agrega solo ese álbum y sobrevive a otra carga',()=>{
  const h=setup();h.run("omToggleAlbum('ATP')");assert.match(h.html(),/ATP/);assert.doesNotMatch(h.html(),/OMAKASE/);
  h.run('OM.savedAlbums.clear();omLoadPreferences();omRenderLibrary()');assert.match(h.html(),/ATP/);
  h.run("omToggleAlbum('ATP')");assert.doesNotMatch(h.html(),/filterByAlbum/);
});
test('los álbumes favoritos se mantienen separados por usuario',()=>{
  const h=setup();h.run("omToggleAlbum('ATP');window._currentFirebaseUser={uid:'account-a'};omLoadPreferences();omRenderLibrary()");
  assert.doesNotMatch(h.html(),/filterByAlbum/);
  h.run("omToggleAlbum('OMAKASE')");assert.match(h.html(),/OMAKASE/);assert.doesNotMatch(h.html(),/ATP/);
  h.run('window._currentFirebaseUser=null;omLoadPreferences();omRenderLibrary()');assert.match(h.html(),/ATP/);assert.doesNotMatch(h.html(),/OMAKASE/);
});
test('dar me gusta a una canción no guarda su álbum entero',()=>{
  const h=setup();h.run('OM.liked.add(songs[0].url);omRenderLibrary()');assert.doesNotMatch(h.html(),/filterByAlbum/);
});
test('buscar en la biblioteca solo encuentra álbumes guardados',()=>{
  const h=setup();h.run("omToggleAlbum('ATP');OM.libraryQuery='Alvaro';omRenderLibrary()");assert.match(h.html(),/No se encontraron/);
  h.run("OM.libraryQuery='';omToggleAlbum('OMAKASE');OM.libraryQuery='Alvaro';omRenderLibrary()");assert.match(h.html(),/OMAKASE/);assert.doesNotMatch(h.html(),/ATP/);
});
test('datos de favoritos antiguos o inválidos no agregan álbumes desconocidos',()=>{
  const h=setup();h.memory.set('omusic_saved_albums_guest',JSON.stringify(['ATP','unknown-album']));h.run('omLoadPreferences();omRenderLibrary()');
  assert.equal(h.run('OM.savedAlbums.size'),1);assert.match(h.html(),/ATP/);
  h.memory.set('omusic_saved_albums_guest',JSON.stringify({name:'ATP'}));h.run('omLoadPreferences();omRenderLibrary()');assert.doesNotMatch(h.html(),/filterByAlbum/);
});
