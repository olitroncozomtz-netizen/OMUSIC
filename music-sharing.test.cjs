const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=__dirname;
function setup(href='https://oliver.github.io/OMUSIC/index.html?private=do-not-share#profile=old',navigation=false){
  const nodes=new Map(),memory=new Map(),listeners={},calls=[],messages=[],insertions=[];
  function element(){return {innerHTML:'',textContent:'',dataset:{},style:{},hidden:false,pause(){},play:()=>Promise.resolve(),parentElement:{classList:{toggle(){}}},classList:{add(){},remove(){},toggle(){},contains:()=>false},setAttribute(){},removeAttribute(){},insertAdjacentHTML(position,html){this.innerHTML+=html;insertions.push(html);},after(){},querySelector:s=>s.startsWith('[data-')?null:get(s),querySelectorAll:()=>[],remove(){}};}
  const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
  const location={href,hash:new URL(href).hash};
  const context={URL,URLSearchParams,location,document:{body:element(),createElement:element,getElementById:get,querySelectorAll:()=>[],querySelector:s=>get(s)},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},navigator:{},setTimeout:()=>1,clearTimeout(){},savePlaylists(){},loadPlaylistsFromCloud(){},saveProfilePic(){},openVideo(){},playlists:[],queue:[],history:[],currentSong:null,currentAlbumContext:null,audio:{paused:true,playCalls:0,play(){this.playCalls++;return Promise.resolve();},pause(){}},search:get('search'),title:get('title'),artist:get('artist'),cover:get('cover'),shuffleActive:false,repeatActive:false,formatTime:s=>Math.floor(s/60)+':00',addEventListener:(key,fn)=>listeners[key]=fn,matchMedia:()=>({matches:false})};
  context.window=context;context.messages=messages;context.calls=calls;vm.createContext(context);const run=code=>vm.runInContext(code,context);
  const entries=[];let position=0;
  if(navigation){
    context.document.head={prepend(){}};
    const artistNodes=[...fs.readFileSync(path.join(base,'index.html'),'utf8').matchAll(/data-artist-name="([^"]+)"[\s\S]*?<p>([^<]+)<\/p>/g)].map(match=>({dataset:{artistName:match[1]},querySelector:()=>({textContent:match[2]})}));
    context.document.querySelectorAll=selector=>selector==='[data-artist-name]'?artistNodes:[];
    const update=url=>{
      const previous=new URL(location.href),target=new URL(url||location.href,location.href);
      // El estándar History permite cambiar query/hash de file:, pero no su ruta.
      if(previous.protocol==='file:'&&(target.protocol!==previous.protocol||target.host!==previous.host||target.pathname!==previous.pathname))throw new DOMException('Cannot rewrite a local file path','SecurityError');
      location.href=target.href;location.hash=target.hash;
    };
    const go=delta=>{const target=position+delta;if(!entries[target])return;position=target;context.history.state=entries[position].state;update(entries[position].url);listeners.popstate?.({state:context.history.state});};
    Object.assign(context.history,{state:null,replaceState(state,title,url){this.state=state;update(url);entries[position]={state,url};},pushState(state,title,url){this.state=state;update(url);entries.splice(++position);entries[position]={state,url};},back:()=>go(-1),forward:()=>go(1)});
    run(fs.readFileSync(path.join(base,'index.html'),'utf8').match(/<script id="om-profile-routing">([\s\S]*?)<\/script>/)[1]);
  }
  run(['canciones.js','videos.js','track-durations.js'].map(n=>fs.readFileSync(path.join(base,n),'utf8')).join('\n'));
  run(fs.readFileSync(path.join(base,'omusic-redesign.js'),'utf8').replace(/omBoot\(\);\s*$/,''));
  run("omNavState=()=>{};omScrollTop=()=>{};omRenderLibrary=()=>{};omToast=m=>messages.push(m);omOpenSharedRoute=()=>{calls.push('legacy');return true;};omOpenSharedTrack=(value,push)=>{const s=songs.find(s=>s.url===value);if(!s)return false;omDetailView('track',s.title,'',push,value);omRenderTracks([s]);return true;};omShareDialog=(title,url)=>{window.shareDialog={title,url};};closeOptions=()=>{};openOptions=()=>{};omLoadPreferences();omInitDurations();");
  run(fs.readFileSync(path.join(base,'omusic-sharing.js'),'utf8'));
  if(navigation){
    run('loadLyrics=()=>{};omSyncPlayer=()=>{};omRenderNowPanel=()=>{};if(!OM.route)omShowHome(false);');
    run(fs.readFileSync(path.join(base,'omusic-routing.js'),'utf8'));
  }
  return {context,run,get,location,listeners,calls,messages,insertions,entries};
}
test('los tres enlaces conservan la subcarpeta de GitHub y excluyen parámetros privados',()=>{
  const h=setup();
  for(const [type,value,key]of [['album','OMAKASE','album'],['artist','Easykid','artist'],['song',h.run('songs.find(s=>s.url).url'),'track']]){
    const url=new URL(h.context.OMMusicShare.link(type,value));assert.equal(url.origin,'https://oliver.github.io');assert.equal(url.pathname,'/OMUSIC/index.html');assert.equal(url.search,'');assert.equal(new URLSearchParams(url.hash.slice(1)).get(key),value);assert.equal(url.hash.includes('profile='),false);
  }
});
test('un enlace de álbum abre únicamente sus canciones sin iniciar audio',()=>{
  const h=setup('https://omusic.test/#album=OMAKASE');assert.equal(h.run('OM.route.type'),'album');assert.equal(h.run('OM.route.value'),'OMAKASE');
  assert.ok(h.run("OM.activeList.every(s=>s.album==='OMAKASE')"));assert.match(h.insertions.join(''),/Compartir álbum/);assert.equal(h.context.audio.playCalls,0);assert.equal(h.context.currentSong,null);
});
test('el artista compartido abre su perfil y mantiene el límite de cinco canciones',()=>{
  const h=setup('https://omusic.test/#artist=Milo+j');assert.equal(h.run('OM.route.type'),'artist');assert.equal(h.run('OM.artistContext.key'),'Milo j');assert.equal(h.run('OM.activeList.length'),5);assert.ok(h.run("OM.activeList.every(s=>omArtistMatches(s,'Milo j'))"));assert.match(h.get('songList').innerHTML,/Ver más/);assert.match(h.insertions.join(''),/Compartir artista/);assert.equal(h.context.audio.playCalls,0);
});
test('un enlace de canción muestra la canción correcta sin cargar otra de forma predeterminada',()=>{
  const h=setup();const selected=h.run("songs.find(s=>s.artist==='Nsqk, Easykid')");h.location.hash='#'+new URLSearchParams({track:selected.url});h.context.OMMusicShare.resolve();assert.equal(h.run('OM.activeList.length'),1);assert.equal(h.run('OM.activeList[0].url'),selected.url);assert.equal(h.context.currentSong,null);assert.equal(h.context.audio.playCalls,0);
});
test('un enlace de video abre su tarjeta y permite compartirlo sin iniciar audio',()=>{
  const h=setup();const selected=h.run('videos[0]');h.location.hash='#'+new URLSearchParams({video:selected.url});h.context.OMMusicShare.resolve();assert.equal(h.run('OM.view'),'sharedVideo');assert.match(h.get('songList').innerHTML,/playVideo\(0\)/);assert.match(h.insertions.join(''),/Compartir video/);assert.equal(h.context.currentSong,null);assert.equal(h.context.audio.playCalls,0);
  const link=new URL(h.context.OMMusicShare.link('video',selected.url));assert.equal(new URLSearchParams(link.hash.slice(1)).get('video'),selected.url);assert.equal(link.pathname,'/OMUSIC/index.html');
});
test('la inicialización móvil tardía conserva el enlace compartido y Volver recupera el video',()=>{
  const h=setup();const selected=h.run('videos[0]');h.location.hash='#'+new URLSearchParams({video:selected.url});let ready;
  h.context.document.addEventListener=(name,handler)=>{if(name==='DOMContentLoaded')ready=handler;};h.context.applyMobTapZone=()=>{};
  const mobile=fs.readFileSync(path.join(base,'mobile-original.js'),'utf8'),start=mobile.indexOf("document.addEventListener('DOMContentLoaded', function() {"),end=mobile.indexOf('const _origLoadSongForMob',start);h.run(mobile.slice(start,end));ready();
  assert.equal(h.run('OM.view'),'sharedVideo');assert.equal(h.context.document.body.dataset.view,'sharedVideo');h.context.omRestore({type:'sharedVideo',value:selected.url});assert.equal(h.run('OM.route.value'),selected.url);assert.equal(h.context.audio.playCalls,0);
});
test('Compartir usa un cuadro para copiar en escritorio y conserva la reproducción',async()=>{
  const h=setup();const selected=h.run('songs.find(s=>s.url)');h.context.currentSong=selected;await h.context.omShareMusic('song',selected.url);assert.equal(h.context.shareDialog.title,'Compartir canción');assert.equal(new URLSearchParams(new URL(h.context.shareDialog.url).hash.slice(1)).get('track'),selected.url);assert.equal(h.context.currentSong,selected);assert.equal(h.context.audio.playCalls,0);
});
test('en celular se usa el menú nativo y cancelar no provoca un segundo cuadro',async()=>{
  const h=setup();h.context.matchMedia=()=>({matches:true});const sent=[];h.context.navigator.share=async data=>sent.push(data);
  await h.context.omShareMusic('album','OMAKASE');assert.equal(sent.length,1);assert.match(sent[0].url,/#album=OMAKASE$/);assert.equal(h.context.shareDialog,undefined);
  h.context.navigator.share=async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'});};await h.context.omShareMusic('artist','Easykid');assert.equal(h.context.shareDialog,undefined);
});
test('los enlaces desconocidos no interpretan HTML y las rutas anteriores siguen funcionando',()=>{
  const h=setup('https://omusic.test/#album=%3Cimg%20onerror%3Dalert(1)%3E');assert.equal(h.run('OM.view'),'sharedUnavailable');assert.doesNotMatch(h.get('om-detail').innerHTML,/<img/);assert.equal(h.context.OMMusicShare.link('album','missing'),null);
  h.location.hash='#party=AB12CD34EF56';h.context.OMMusicShare.resolve();assert.equal(h.calls.at(-1),'legacy');h.location.hash='#profile=user';h.context.OMMusicShare.resolve();assert.equal(h.calls.at(-1),'legacy');
});

test('los enlaces del APK apuntan a la web publicada y se comparten con el menú Android',async()=>{
  const h=setup('https://appassets.androidplatform.net/assets/www/index.html');let shared;
  h.context.OMAndroid={publicBase:'https://oliver.github.io/OMUSIC/',share:async data=>{shared=data;}};
  const song=h.run('songs.find(s=>s.url)');await h.context.OMMusicShare.share('song',song.url);
  const url=new URL(shared.url);assert.equal(url.origin,'https://oliver.github.io');assert.equal(url.pathname,'/OMUSIC/');assert.equal(new URLSearchParams(url.hash.slice(1)).get('track'),song.url);assert.equal(h.context.shareDialog,undefined);
});

test('abrir artista, álbum y canciones actualiza la barra y los botones nativos de historial',()=>{
  const h=setup('https://omusic.test/',true);
  h.run("omOpenArtist('Easykid')");assert.equal(new URL(h.location.href).pathname,'/artist/easykid');
  h.run("omOpenAlbum('OMAKASE')");assert.equal(new URL(h.location.href).pathname,'/album/omakase');
  h.context.omBack();assert.equal(h.run('OM.route.value'),'Easykid');assert.equal(new URL(h.location.href).pathname,'/artist/easykid');
  h.context.omForward();assert.equal(h.run('OM.route.value'),'OMAKASE');
  h.run('omShowSongs()');assert.equal(new URL(h.location.href).pathname,'/songs');assert.equal(h.context.audio.playCalls,0);
});
test('la dirección de una canción distingue versiones y al recargar abre esa canción sin audio',()=>{
  const h=setup('https://oliver.github.io/OMUSIC/',true),song=h.run('songs.find(s=>s.url)');
  const link=h.context.OMMusicShare.link('song',song.url);
  assert.match(new URL(link).pathname,/^\/OMUSIC\/song\/[a-z0-9-]+--[a-z0-9]+$/);
  const loaded=setup(link,true);assert.equal(loaded.run('OM.activeList[0].url'),song.url);assert.equal(loaded.context.audio.playCalls,0);assert.equal(loaded.context.currentSong,null);
  const pairs=h.run('songs.filter(s=>s.url).map(s=>[s.url,window.OMMusicRoutes.link("song",s.url)])');
  const byURL=new Map();for(const [url,link]of pairs)byURL.set(url,link);
  assert.equal(new Set(byURL.values()).size,byURL.size);
});
test('seleccionar música conserva la vista y el contexto; los saltos no llenan el historial',()=>{
  const h=setup('https://omusic.test/',true);h.run("omOpenArtist('Nsqk');omPlay(0)");
  assert.match(h.location.href,/\/song\//);assert.equal(h.run('OM.view'),'artist');
  const count=h.entries.length;h.run('playNext()');assert.equal(h.entries.length,count);assert.match(h.location.href,/\/song\//);
  const playing=h.context.currentSong.url;h.run("omOpenArtist('Easykid')");assert.equal(new URL(h.location.href).pathname,'/artist/easykid');assert.equal(h.context.currentSong.url,playing);
  h.context.omBack();assert.equal(h.run('OM.route.value'),'Nsqk');assert.equal(h.context.currentSong.url,playing);
});
test('compartir desde un perfil usa rutas musicales sin datos de sesión y respeta el sitio del APK',()=>{
  const h=setup('https://oliver.github.io/OMUSIC/user/@OliverM?session=secret',true);
  assert.equal(h.context.OMMusicShare.link('artist','Easykid'),'https://oliver.github.io/OMUSIC/artist/easykid');
  const url=new URL(h.context.OMMusicShare.link('album','OMAKASE'));assert.equal(url.pathname,'/OMUSIC/album/omakase');assert.equal(url.search,'');assert.equal(url.hash,'');
  h.context.OMAndroid={publicBase:'https://public.test/OMUSIC/'};assert.equal(h.context.OMMusicShare.link('artist','Easykid'),'https://public.test/OMUSIC/artist/easykid');
});
test('el enlace anterior se convierte y un artista inexistente conserva el aviso de contenido no disponible',()=>{
  const old=setup('https://omusic.test/#album=OMAKASE',true);assert.equal(new URL(old.location.href).pathname,'/album/omakase');assert.equal(new URL(old.location.href).hash,'');
  const missing=setup('https://omusic.test/artist/no-existe',true);assert.equal(missing.run('OM.view'),'sharedUnavailable');assert.equal(missing.context.audio.playCalls,0);
});
test('cada dirección conocida se recupera en GitHub Pages sin carpetas de rutas',()=>{
  const h=setup('https://omusic.test/',true);
  const fallback=fs.readFileSync(path.join(base,'404.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  for(const prefix of ['/','/OMUSIC/'])for(const route of h.context.OMMusicRoutes.paths()){
    let redirected;const href='https://omusic.test'+prefix+route;
    vm.runInNewContext(fallback,{URL,location:{href,pathname:prefix+route,hash:'',replace:url=>redirected=url}});
    assert.ok(redirected,route);const url=new URL(redirected);
    assert.equal(url.pathname,prefix);assert.equal(url.searchParams.get('om_route'),route);
  }
});


test('index.html local permite navegar, volver y reproducir sin cambiar la ruta del archivo',()=>{
  for(const href of ['file:///C:/Users/Oliver/Downloads/OMUSIC/index.html','file:///home/oliver/OMUSIC/index.html']){
    const h=setup(href,true);
    h.run("omOpenArtist('Alvaro')");assert.equal(h.run('OM.view'),'artist');assert.ok(h.run('OM.artistContext.tracks.length')>0);
    h.run('omShowVideos()');assert.equal(h.run('OM.view'),'videos');assert.match(h.get('songList').innerHTML,/playVideo\(0\)/);
    h.context.omBack();assert.equal(h.run('OM.view'),'artist');assert.equal(h.run('OM.artistContext.key'),'Alvaro');
    h.context.omForward();assert.equal(h.run('OM.view'),'videos');
    h.run("omOpenAlbum('OMAKASE')");assert.equal(h.run('OM.view'),'album');assert.ok(h.run("OM.activeList.every(s=>s.album==='OMAKASE')"));
    h.run('omPlay(0)');assert.equal(h.context.currentSong.url,h.run('OM.activeList[0].url'));assert.equal(h.context.audio.playCalls,1);
    assert.equal(h.location.href,href);
  }
});
test('los enlaces de la copia local vuelven a index.html y restauran el contenido sin iniciar audio',()=>{
  const h=setup('file:///C:/Users/Oliver/Downloads/OMUSIC/index.html',true);
  const link=h.context.OMMusicShare.link('album','OMAKASE');
  assert.equal(new URL(link).pathname,new URL(h.location.href).pathname);assert.match(new URL(link).hash,/album=OMAKASE/);
  const restored=setup(link,true);assert.equal(restored.run('OM.view'),'album');assert.equal(restored.run('OM.route.value'),'OMAKASE');assert.equal(restored.context.audio.playCalls,0);
});
