const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'.');
function setup(){
  const nodes=new Map(),memory=new Map(),database=new Map();let failure=null;
  const get=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector:()=>null});return nodes.get(id);};
  const context={document:{getElementById:get,querySelectorAll:()=>[],querySelector:()=>null},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},location:{href:'https://omusic.test/',hash:''},navigator:{},setTimeout:()=>1,clearTimeout(){},addEventListener(){},savePlaylists(){},loadPlaylistsFromCloud(){},openVideo(){},saveProfilePic(){},playlists:[],currentSong:null,currentAlbumContext:null,history:[],_omAuthReady:Promise.resolve(),_db:{},_doc:(_, ...parts)=>parts.join('/'),_collection:(_, ...parts)=>parts.join('/')};
  context._getDocServer=async key=>({exists:()=>database.has(key),data:()=>database.get(key)});
  context._getDocsServer=async prefix=>({docs:[...database].filter(([key])=>key.startsWith(prefix+'/')&&!key.slice(prefix.length+1).includes('/')).map(([key,data])=>({id:key.split('/').at(-1),data:()=>data}))});
  context._writeBatch=()=>{const actions=[];return{set:(key,value)=>actions.push(['set',key,JSON.parse(JSON.stringify(value))]),delete:key=>actions.push(['delete',key]),commit:async()=>{if(failure)throw failure;for(const[type,key,value]of actions){if(type==='set')database.set(key,value);else database.delete(key);}}};};
  context._runTransaction=async(_,job)=>{const batch=context._writeBatch(),result=await job({...batch,get:context._getDocServer});await batch.commit();return result;};
  context.window=context;context.URL=URL;context.URLSearchParams=URLSearchParams;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(base,'canciones.js'),'utf8')+'\n'+fs.readFileSync(path.join(base,'videos.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(base,'omusic-redesign.js'),'utf8').replace(/omBoot\(\);\s*$/,''),context);
  const run=code=>vm.runInContext(code,context);
  run("omSyncProfile=()=>{};omRenderLibrary=()=>{};omCloseProfile=()=>{};omShowDialog=content=>{window.dialog=content};omDetailView=(view,title,sub,push,value)=>{OM.view=view;OM.route={type:view,value}};omCollectionHeader=(title,sub,cover,tracks,opts)=>{window.collectionTitle=title;window.collectionTracks=tracks};omRenderTracks=tracks=>{OM.activeList=tracks};omLoadPreferences();");
  vm.runInContext(fs.readFileSync(path.join(base,'omusic-social.js'),'utf8'),context);
  context._currentFirebaseUser={uid:'owner-a',displayName:'Oliver',email:'private@example.test'};
  run("playlists.push({id:'playlist-a',name:'Mi música',songs:[songs[0]],isPublic:false})");
  return {context,run,get,memory,database,fail:value=>failure=value};
}
test('publicar escribe una copia pública y conserva la lista privada de su propietario',async()=>{
  const h=setup();await h.context.omSetPlaylistPublic(0,true);
  const published=h.database.get('publicPlaylists/owner-a/items/playlist-a');
  assert.equal(published.ownerId,'owner-a');assert.equal(published.name,'Mi música');assert.equal(published.trackUrls.length,1);
  assert.equal(h.context.playlists[0].isPublic,true);assert.equal(h.database.get('playlists/owner-a').list[0].isPublic,true);
  assert.equal('email' in published,false);assert.equal(JSON.stringify(published).includes('private@example.test'),false);
});
test('otro navegador puede abrir la publicación y guardar una copia privada',async()=>{
  const h=setup();await h.context.omSetPlaylistPublic(0,true);
  h.context._currentFirebaseUser=null;h.context.playlists=[];
  await h.context.omOpenPublicPlaylist('owner-a','playlist-a');
  assert.equal(h.context.collectionTitle,'Mi música');assert.equal(h.context.collectionTracks.length,1);
  h.run('savePlaylists=async()=>{};omOpenPlaylist=()=>{}');await h.context.omClonePublicPlaylist();
  assert.equal(h.context.playlists[0].isPublic,false);assert.notEqual(h.context.playlists[0].id,'playlist-a');
});
test('hacer privada retira la copia pública y deja de resolver el enlace',async()=>{
  const h=setup();await h.context.omSetPlaylistPublic(0,true);await h.context.omSetPlaylistPublic(0,false);
  assert.equal(h.database.has('publicPlaylists/owner-a/items/playlist-a'),false);assert.equal(h.context.playlists[0].isPublic,false);
  h.context._currentFirebaseUser=null;await h.context.omOpenPublicPlaylist('owner-a','playlist-a');
  assert.match(h.get('om-detail').innerHTML,/no está disponible/);
});
test('un fallo del servidor no marca una playlist privada como pública',async()=>{
  const h=setup();h.fail({code:'permission-denied'});
  await assert.rejects(h.context.omSetPlaylistPublic(0,true));assert.equal(h.context.playlists[0].isPublic,false);assert.equal(h.database.size,0);
});
test('el modo invitado no puede publicar una playlist',async()=>{
  const h=setup();h.context._currentFirebaseUser=null;
  await assert.rejects(h.context.omSetPlaylistPublic(0,true),error=>error.code==='auth-required');assert.equal(h.database.size,0);
});
test('editar una lista pública actualiza su nombre y canciones compartidas',async()=>{
  const h=setup();await h.context.omSetPlaylistPublic(0,true);
  h.run("playlists[0].name='Para la noche';playlists[0].songs.push(songs[1])");await h.context.omSyncPublishedPlaylists();
  const published=h.database.get('publicPlaylists/owner-a/items/playlist-a');assert.equal(published.name,'Para la noche');assert.equal(published.trackUrls.length,2);
});
test('los cambios pública y privada se serializan para impedir que reaparezca una copia',async()=>{
  const h=setup();const publish=h.context.omSetPlaylistPublic(0,true),unpublish=h.context.omSetPlaylistPublic(0,false);await Promise.all([publish,unpublish]);
  assert.equal(h.database.has('publicPlaylists/owner-a/items/playlist-a'),false);assert.equal(h.context.playlists[0].isPublic,false);
});
test('una edición durante la publicación conserva la versión más reciente',async()=>{
  const h=setup();let release,entered;const wait=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve),create=h.context._writeBatch;let first=true;
  h.context._writeBatch=()=>{const batch=create(),commit=batch.commit;batch.commit=async()=>{if(first){first=false;entered();await wait;}return commit();};return batch;};
  const publishing=h.context.omSetPlaylistPublic(0,true);await started;
  h.run("playlists[0].name='Versión reciente';playlists[0].songs.push(songs[1])");const syncing=h.context.omSyncPublishedPlaylists();release();await Promise.all([publishing,syncing]);
  assert.equal(h.database.get('publicPlaylists/owner-a/items/playlist-a').name,'Versión reciente');assert.equal(h.database.get('playlists/owner-a').list[0].songs.length,2);
});
test('las portadas y datos de perfil se mantienen separados por usuario',async()=>{
  const h=setup();await h.context.omSaveProfile({name:'Oliver',handle:'oliverm',bio:'Música',photo:'https://example.test/avatar.png'});
  assert.equal(h.context.omProfileData().name,'Oliver');h.context._currentFirebaseUser={uid:'owner-b',displayName:'Otra cuenta'};
  assert.equal(h.context.omProfileData().name,'Otra cuenta');assert.notEqual(h.context.omProfileData().photo,'https://example.test/avatar.png');
  h.context._currentFirebaseUser=null;assert.equal(h.context.omProfileData().name,'Invitado');
});
test('el perfil público excluye playlists privadas, correos y controles de edición ajenos',async()=>{
  const h=setup();await h.context.omSaveProfile({name:'Oliver',handle:'oliverm',bio:'Mis canciones'});
  await h.context.omSetPlaylistPublic(0,true);await h.context.omChangeProfilePublic(true);
  assert.equal(h.database.has('publicProfiles/owner-a'),true);assert.equal(JSON.stringify(h.database.get('publicProfiles/owner-a')).includes('private@example.test'),false);
  h.context._currentFirebaseUser=null;await h.context.omOpenProfile('owner-a');
  const html=h.get('om-detail').innerHTML;assert.match(html,/Mi música/);assert.doesNotMatch(html,/Editar perfil|Solo para ti/);
});
test('los textos de perfil no se interpretan como HTML y se rechazan imágenes y enlaces ejecutables',()=>{
  const h=setup(),profile=h.context.omCleanProfile({name:'<img src=x onerror=alert(1)>',bio:'<script>alert(1)</script>',website:'javascript:alert(1)',photo:'javascript:alert(1)'});
  assert.equal(profile.photo,'');assert.equal(profile.website,'');h.context.omRenderProfile(profile,[],true);
  assert.match(h.get('om-detail').innerHTML,/&lt;script&gt;/);assert.doesNotMatch(h.get('om-detail').innerHTML,/<script>/);
});
test('las publicaciones solo incluyen canciones del catálogo de OMUSIC',async()=>{
  const h=setup();h.run("playlists[0].songs.push({url:'https://external.test/private.mp3',title:'Fuera del catálogo'})");await h.context.omSetPlaylistPublic(0,true);
  assert.equal(h.database.get('publicPlaylists/owner-a/items/playlist-a').trackUrls.length,1);
});

test('el usuario conserva mayúsculas y su enlace usa user/@Nombre en una subcarpeta',async()=>{
  const h=setup();h.context.location.href='https://oliver.github.io/OMUSIC/index.html?session=private#profile=old';
  await h.context.omSaveProfile({name:'Oliver',handle:'OliverM'});
  assert.equal(h.context.omProfileData().handle,'OliverM');assert.equal(h.database.get('userHandles/oliverm').ownerId,'owner-a');
  assert.equal(h.context.omSocialLink('profile','OliverM'),'https://oliver.github.io/OMUSIC/user/@OliverM');
  await h.context.omChangeProfilePublic(true);assert.match(h.context.dialog,/https:\/\/oliver.github.io\/OMUSIC\/user\/@OliverM/);assert.doesNotMatch(h.context.dialog,/#profile=|session=private/);
});
test('otro usuario no puede reservar el mismo nombre aunque cambie las mayúsculas',async()=>{
  const h=setup();await h.context.omSaveProfile({name:'Oliver',handle:'OliverM'});
  h.context._currentFirebaseUser={uid:'owner-b',displayName:'Otra cuenta'};
  await assert.rejects(h.context.omSaveProfile({name:'Otro',handle:'oliverm'}),error=>error.code==='handle-taken');
  assert.equal(h.database.has('userProfiles/owner-b'),false);assert.equal(h.context.omProfileData().name,'Otra cuenta');assert.equal(h.database.get('userHandles/oliverm').ownerId,'owner-a');
});
test('renombrar un usuario actualiza la reserva y el perfil público juntos',async()=>{
  const h=setup();await h.context.omSaveProfile({name:'Oliver',handle:'OliverM'});await h.context.omChangeProfilePublic(true);
  await h.context.omSaveProfile({...h.context.omProfileData(),handle:'OliverMusic'});
  assert.equal(h.database.has('userHandles/oliverm'),false);assert.equal(h.database.get('userHandles/olivermusic').ownerId,'owner-a');
  assert.equal(h.database.get('publicProfiles/owner-a').handle,'OliverMusic');assert.equal(await h.context.omResolveProfileHandle('OliverM'),null);
  assert.equal((await h.context.omResolveProfileHandle('OLIVERMUSIC')).ownerId,'owner-a');
});
test('cambiar solo las mayúsculas conserva al propietario de la misma reserva',async()=>{
  const h=setup();await h.context.omSaveProfile({name:'Oliver',handle:'oliverm'});await h.context.omSaveProfile({name:'Oliver',handle:'OliverM'});
  assert.equal(h.database.get('userHandles/oliverm').handle,'OliverM');assert.equal(h.database.get('userProfiles/owner-a').handleKey,'oliverm');
});
test('hacer privado un perfil desactiva el enlace pero mantiene reservado su usuario',async()=>{
  const h=setup();await h.context.omSaveProfile({name:'Oliver',handle:'OliverM'});await h.context.omChangeProfilePublic(true);await h.context.omChangeProfilePublic(false);
  assert.equal(await h.context.omResolveProfileHandle('OliverM'),null);assert.equal(h.database.has('publicProfiles/owner-a'),false);assert.equal(h.database.get('userHandles/oliverm').ownerId,'owner-a');
  h.context._currentFirebaseUser={uid:'owner-b'};await assert.rejects(h.context.omSaveProfile({name:'Otro',handle:'OliverM'}),error=>error.code==='handle-taken');
});
test('un fallo del servidor no guarda ni anuncia una reserva solo local',async()=>{
  const h=setup();h.fail({code:'unavailable'});
  await assert.rejects(h.context.omSaveProfile({name:'No guardado',handle:'OliverM'}));assert.equal(h.database.size,0);assert.equal(h.context.omProfileData().name,'Oliver');assert.equal(h.context.omProfileData().handleKey,'');
});
test('al rechazar un cambio ocupado se conservan el usuario y el enlace anteriores',async()=>{
  const h=setup();await h.context.omSaveProfile({name:'Oliver',handle:'OliverM'});await h.context.omChangeProfilePublic(true);
  h.database.set('userHandles/ocupado',{ownerId:'owner-b',handle:'Ocupado'});
  await assert.rejects(h.context.omSaveProfile({...h.context.omProfileData(),handle:'Ocupado'}),error=>error.code==='handle-taken');
  assert.equal(h.database.get('publicProfiles/owner-a').handle,'OliverM');assert.equal(h.context.omProfileData().handle,'OliverM');assert.equal(h.database.get('userHandles/oliverm').ownerId,'owner-a');
});
test('una cuenta antigua con un nombre repetido recibe un usuario único al volver a entrar',async()=>{
  const h=setup();h.database.set('userProfiles/owner-a',{ownerId:'owner-a',name:'Oliver',handle:'oliverm',bio:'Mi descripción',isPublic:true,updatedAt:1});
  h.database.set('userHandles/oliverm',{ownerId:'owner-b',handle:'OliverM'});
  await h.context.omLoadOwnProfile();assert.equal(h.context.omProfileData().handle,'oliverm2');assert.equal(h.database.get('userHandles/oliverm2').ownerId,'owner-a');
  assert.equal(h.database.get('userHandles/oliverm').ownerId,'owner-b');assert.equal(h.database.get('publicProfiles/owner-a').bio,'Mi descripción');
});
test('un nombre nuevo se reserva al cargar una cuenta y no usa el correo en el enlace',async()=>{
  const h=setup();h.context._currentFirebaseUser.displayName='Oliver M';await h.context.omLoadOwnProfile();
  assert.equal(h.database.get('userProfiles/owner-a').handle,'OliverM');assert.equal(h.database.get('userHandles/oliverm').ownerId,'owner-a');assert.equal(h.database.has('publicProfiles/owner-a'),false);
});
test('los usuarios inválidos se rechazan en vez de cambiar silenciosamente su enlace',async()=>{
  const h=setup();for(const handle of ['', 'Oliver M', '@OliverM', '../admin', 'x'.repeat(31), '<script>'])await assert.rejects(h.context.omSaveProfile({name:'Oliver',handle}),error=>error.code==='invalid-handle');assert.equal(h.database.size,0);
});
test('el invitado guarda un borrador sin reservar ningún usuario global',async()=>{
  const h=setup();h.context._currentFirebaseUser=null;const saved=await h.context.omSaveProfile({name:'Invitado',handle:'OliverM'});
  assert.equal(saved.localOnly,true);assert.equal(h.context.omProfileData().handleKey,'');assert.equal(h.database.size,0);
});
test('el enlace por usuario abre el perfil público y los enlaces antiguos siguen resolviéndose',async()=>{
  const h=setup();await h.context.omSaveProfile({name:'Oliver',handle:'OliverM'});await h.context.omChangeProfilePublic(true);
  h.context._currentFirebaseUser=null;await h.context.omOpenProfileHandle('OLIVERM');assert.match(h.get('om-detail').innerHTML,/@OliverM/);assert.doesNotMatch(h.get('om-detail').innerHTML,/Editar perfil|private@example.test/);
  h.context.location.hash='#profile=owner-a';assert.equal(h.context.omOpenSharedRoute(),true);
});
test('cambiar visibilidad usa el perfil remoto reciente y conserva su nuevo usuario',async()=>{
  const h=setup();await h.context.omSaveProfile({name:'Oliver',handle:'OliverM'});
  const recent={...h.database.get('userProfiles/owner-a'),name:'Nombre reciente',handle:'OliverMusic',handleKey:'olivermusic'};
  h.database.delete('userHandles/oliverm');h.database.set('userHandles/olivermusic',{ownerId:'owner-a',handle:'OliverMusic'});h.database.set('userProfiles/owner-a',recent);
  await h.context.omWriteProfile(h.context.omProfileData(),'owner-a',{visibility:true});
  assert.equal(h.database.get('publicProfiles/owner-a').name,'Nombre reciente');assert.equal(h.database.get('publicProfiles/owner-a').handle,'OliverMusic');assert.equal(h.database.has('userHandles/oliverm'),false);
});
