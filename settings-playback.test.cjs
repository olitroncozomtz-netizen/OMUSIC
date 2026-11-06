const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'.');
function setup(){
  const nodes=new Map(),memory=new Map(),frames=new Map(),intervals=[],messages=[],extra=[];let frameId=0;
  function element(){
    const listeners=new Map(),classes=new Set();
    return {innerHTML:'',textContent:'',nodeValue:'',value:'',style:{},dataset:{},hidden:false,pause(){},play:()=>Promise.resolve(),parentElement:{classList:{toggle(){}}},classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle(x,on){on=on===undefined?!classes.has(x):on;on?classes.add(x):classes.delete(x);return on;}},
      setAttribute(k,v){this[k]=v;},getAttribute(k){return this[k]||null;},removeAttribute(k){delete this[k];},querySelectorAll:()=>[],querySelector:()=>null,append(node){extra.push(node);},remove(){const i=extra.indexOf(this);if(i>=0)extra.splice(i,1);},insertAdjacentHTML(position,html){this.innerHTML+=html;},
      addEventListener(name,fn,options){const list=listeners.get(name)||[];list.push({fn,once:options?.once});listeners.set(name,list);},removeEventListener(name,fn){listeners.set(name,(listeners.get(name)||[]).filter(x=>x.fn!==fn));},
      emit(name,event={}){for(const item of [...listeners.get(name)||[]]){if(item.once)this.removeEventListener(name,item.fn);item.fn(event);}},
    };
  }
  function media(){const node=element();return Object.assign(node,{paused:true,currentTime:0,duration:100,volume:.7,src:'',ended:false,autoPlaying:true,playCalls:0,play(){this.playCalls++;this.paused=false;this.ended=false;this.emit('play');if(this.autoPlaying&&!this.paused)this.emit('playing');return Promise.resolve();},pause(){this.paused=true;this.emit('pause');},load(){}});}
  const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
  const audio=media(),volume=element();
  const document={body:element(),documentElement:{dataset:{theme:'dark'},lang:'es'},hidden:false,createElement:tag=>tag==='audio'?media():element(),getElementById:get,querySelectorAll:()=>[],querySelector:()=>element()};
  const events=element();
  const context={document,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},navigator:{},setTimeout:()=>1,clearTimeout(){},setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval(){},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},addEventListener:(...args)=>events.addEventListener(...args),dispatchEvent:e=>events.emit(e.type,e),savePlaylists(){},loadPlaylistsFromCloud(){},saveProfilePic(){},openVideo(url){context.lastVideo=url;},playlists:[],queue:[],history:[],currentSong:null,currentAlbumContext:null,audio,volume,search:get('search'),title:get('title'),artist:get('artist'),cover:get('cover'),shuffleActive:false,repeatActive:false,formatTime:s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')};
  context.window=context;vm.createContext(context);const run=code=>vm.runInContext(code,context);
  run(['canciones.js','videos.js','track-durations.js'].map(name=>fs.readFileSync(path.join(base,name),'utf8')).join('\n'));
  run(fs.readFileSync(path.join(base,'omusic-redesign.js'),'utf8').replace(/omBoot\(\);\s*$/,''));
  context.messages=messages;
  run('omNavState=()=>{};omScrollTop=()=>{};omRenderNowPanel=()=>{};loadLyrics=()=>{};renderQueue=()=>{};omToast=message=>messages.push(message);omLoadPreferences();omInitDurations();audio.addEventListener("playing",omRecordListen);');
  run(fs.readFileSync(path.join(base,'omusic-settings.js'),'utf8'));
  run(fs.readFileSync(path.join(base,'omusic-audio-settings.js'),'utf8'));
  return {context,run,get,memory,audio,volume,messages,extra,intervals,frame(){const work=[...frames.values()];frames.clear();work.forEach(fn=>fn());}};
}
test('las preferencias se restauran y permanecen separadas entre invitado y cuentas',()=>{
  const h=setup();h.run("omSetSetting('autoplay',false);window._currentFirebaseUser={uid:'ana'};window.dispatchEvent(new CustomEvent('omusic-auth-state',{detail:{}}))");
  assert.equal(h.run('OMSettings.prefs.autoplay'),true);
  h.run("omSetSetting('crossfade',true);omSetSetting('crossfadeSeconds',9);window._currentFirebaseUser=null;window.dispatchEvent(new CustomEvent('omusic-auth-state',{detail:{}}))");
  assert.equal(h.run('OMSettings.prefs.autoplay'),false);assert.equal(h.run('OMSettings.prefs.crossfade'),false);
  h.run("window._currentFirebaseUser={uid:'ana'};window.dispatchEvent(new CustomEvent('omusic-auth-state',{detail:{}}))");
  assert.equal(h.run('OMSettings.prefs.crossfadeSeconds'),9);assert.equal(h.run('OMSettings.prefs.crossfade'),true);
});
test('desactivar actividad evita el registro del evento real de reproducción',()=>{
  const h=setup();h.run("omSetSetting('history',false);loadSong(songs[1])");assert.equal(h.run('OM.recent.length'),0);
  h.run("omSetSetting('history',true);loadSong(songs[2])");assert.equal(h.run('OM.recent.length'),1);assert.equal(h.run('OM.listens[songs[2].url]'),1);
  h.audio.emit('playing');assert.equal(h.run('OM.listens[songs[2].url]'),1);
});
test('los filtros usan etiquetas explícitas y de IA, respetan videos y bloquean colaboraciones',()=>{
  const h=setup();h.run("omSetSetting('explicit',false);omSetSetting('ai',false)");
  assert.equal(h.run("OMSettings.allowed({url:'clean',artist:'Nsqk'})"),true);
  assert.equal(h.run("OMSettings.allowed({url:'explicit',explicit:true})"),false);
  assert.equal(h.run("OMSettings.allowed({url:'ai',aiGenerated:true})"),false);
  assert.equal(h.run("OMSettings.allowed({url:'video',type:'video',explicit:true,aiGenerated:true})"),true);
  h.run("omSetBlocked('artist','Nsqk')");assert.equal(h.run("OMSettings.allowed({url:'collab',artist:'Nsqk, Easykid'})"),false);
  assert.equal(h.run("OMSettings.allowed({url:'other',artist:'Easykid'})"),true);
  h.run("omSetBlocked('artist','Nsqk',false)");assert.equal(h.run("OMSettings.allowed({url:'collab',artist:'Nsqk, Easykid'})"),true);
});
test('bloquear la canción actual la pausa e impide reanudarla desde los controles',()=>{
  const h=setup();h.run("loadSong(songs[1]);omSetBlocked('track',songs[1].url)");assert.equal(h.audio.paused,true);
  const calls=h.audio.playCalls;h.run('playPause();loadSong(songs[1])');assert.equal(h.audio.playCalls,calls);
  h.audio.play();assert.equal(h.audio.paused,true);
});
test('la cola y Reproducir álbum omiten canciones restringidas',()=>{
  const h=setup();h.run("window.a=songs[1];window.b=songs[2];window.c=songs[3];omSetBlocked('track',a.url);queue.push(a,b);playNext()");
  assert.equal(h.context.currentSong.url,h.context.b.url);assert.equal(h.context.queue.length,0);
  h.run("window.album=albumsOM.find(a=>a.songs.some(s=>s.url===window.a.url));omPlayAlbum(album.name)");
  assert.notEqual(h.context.currentSong.url,h.context.a.url);assert.equal(h.audio.paused,false);
});
test('autoplay desactivado se detiene al final, pero Siguiente permite volver al inicio',()=>{
  const h=setup();h.run("OM.playbackList=[songs[1],songs[2]];omSetSetting('autoplay',false);loadSong(songs[2]);handleSongEnd()");
  assert.equal(h.audio.paused,true);assert.equal(h.context.currentSong.url,h.run('songs[2].url'));
  h.run('playNext()');assert.equal(h.context.currentSong.url,h.run('songs[1].url'));
});
test('autoplay continúa con un artista relacionado y excluye contenido bloqueado',()=>{
  const h=setup();h.run("window.before=songs[1];OM.playbackList=[before];loadSong(before);handleSongEnd()");
  assert.notEqual(h.context.currentSong.url,h.context.before.url);assert.equal(h.run("omArtistMatches(currentSong,before.artist)"),true);assert.equal(h.audio.paused,false);
});
test('crossfade superpone audios y entrega la pista nueva en el punto ya escuchado',async()=>{
  const h=setup();h.run("OM.playbackList=[songs[1],songs[2]];omSetSetting('crossfade',true);loadSong(songs[1])");
  h.audio.currentTime=95;h.audio.emit('timeupdate');await Promise.resolve();await Promise.resolve();
  const incoming=h.extra.find(n=>n.id==='om-crossfade-audio');assert.ok(incoming);assert.equal(incoming.paused,false);
  h.audio.currentTime=97.5;incoming.currentTime=2.5;h.frame();assert.ok(Math.abs(h.audio.volume-.35)<.01);assert.ok(Math.abs(incoming.volume-.35)<.01);
  h.audio.autoPlaying=false;h.audio.currentTime=100;h.audio.ended=true;h.run('handleSongEnd()');h.audio.emit('loadedmetadata');
  assert.equal(h.context.currentSong.url,h.run('songs[2].url'));assert.equal(h.audio.currentTime,2.5);assert.equal(h.audio.volume,.7);
  h.audio.emit('playing');assert.equal(incoming.paused,true);assert.equal(h.extra.includes(incoming),false);
});
test('pausar o cambiar de cuenta cancela la transición y restaura el volumen',async()=>{
  const h=setup();h.run("OM.playbackList=[songs[1],songs[2]];omSetSetting('crossfade',true);loadSong(songs[1])");
  h.audio.currentTime=95;h.audio.emit('timeupdate');await Promise.resolve();h.audio.currentTime=98;h.frame();h.audio.pause();
  assert.equal(h.audio.volume,.7);assert.equal(h.extra.length,0);
  h.audio.play();h.audio.currentTime=95;h.audio.emit('timeupdate');await Promise.resolve();h.run("window._currentFirebaseUser={uid:'otra'};window.dispatchEvent(new CustomEvent('omusic-auth-state',{detail:{}}))");
  assert.equal(h.audio.volume,.7);assert.equal(h.extra.length,0);
});
test('normalización ajusta ganancia real y al desactivarla devuelve ganancia unitaria',async()=>{
  const h=setup();const gains=[],parameters=[];const parameter=()=>({setValueAtTime:v=>parameters.push(v),setTargetAtTime:v=>gains.push(v)});
  h.context.AudioContext=class{constructor(){this.currentTime=0;this.state='running';this.destination={};}createDynamicsCompressor(){return {connect(){},threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter()};}createMediaElementSource(){return {connect(){},disconnect(){}};}createAnalyser(){return {fftSize:2048,connect(){},disconnect(){},getFloatTimeDomainData:arr=>arr.fill(.28)};}createGain(){return {connect(){},disconnect(){},gain:parameter()};}resume(){return Promise.resolve();}};
  h.run("loadSong(songs[1]);omSetSetting('normalize',true)");await Promise.resolve();h.intervals[0]();assert.ok(gains.some(value=>Math.abs(value-.5)<.01));
  h.run("omSetSetting('normalize',false)");assert.equal(gains.at(-1),1);assert.equal(h.audio.paused,false);assert.ok(parameters.includes(-18));
});
