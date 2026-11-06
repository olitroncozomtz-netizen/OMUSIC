const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'omusic-immersive.js'),'utf8');
class Node {
  constructor(doc,tag='DIV'){this.doc=doc;this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.style={};this.attrs=new Map();this.dataset={};this.hidden=false;this.innerHTML='';this.textContent='';this.events=new Map();this.classes=new Set();this.classList={add:(...x)=>x.forEach(v=>this.classes.add(v)),remove:(...x)=>x.forEach(v=>this.classes.delete(v)),contains:v=>this.classes.has(v),toggle:(v,force)=>{const yes=force===undefined?!this.classes.has(v):force;yes?this.classes.add(v):this.classes.delete(v);return yes;}};}
  set id(v){this._id=v;this.doc.nodes.set(v,this);}get id(){return this._id;}
  set className(v){this.classes=new Set(v.split(' '));}
  append(...nodes){for(const node of nodes){if(node.parentNode)node.parentNode.children.splice(node.parentNode.children.indexOf(node),1);this.children.push(node);node.parentNode=this;}}
  before(node){const p=this.parentNode;const i=p.children.indexOf(this);p.children.splice(i,0,node);node.parentNode=p;}
  replaceWith(node){const p=this.parentNode;if(node.parentNode)node.parentNode.children.splice(node.parentNode.children.indexOf(node),1);p.children.splice(p.children.indexOf(this),1,node);node.parentNode=p;this.parentNode=null;}
  contains(node){return node===this||this.children.some(c=>c.contains(node));}
  addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,[]);this.events.get(name).push(fn);}
  emit(name,event={}){for(const fn of this.events.get(name)||[])fn({key:'',preventDefault(){},stopImmediatePropagation(){},...event});}
  querySelectorAll(selector){const descendants=this.children.flatMap(c=>[c,...c.querySelectorAll('*')]);if(selector==='*')return descendants;return descendants.filter(c=>selector.split(',').some(part=>part==='button'&&c.tagName==='BUTTON'||part==='input'&&c.tagName==='INPUT'||part.startsWith('.')&&part.slice(1).split('.').every(v=>c.classes.has(v))||part==='[data-im-tab]'&&c.dataset.imTab||part==='[tabindex="0"]'&&c.attrs.get('tabindex')==='0'));}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  setAttribute(k,v){this.attrs.set(k,String(v));}getAttribute(k){return this.attrs.get(k)||null;}
  removeAttribute(k){this.attrs.delete(k);}
  focus(){this.doc.activeElement=this;}getClientRects(){return this.hidden?[]:[{}];}
  get src(){return this.attrs.get('src')||'';}set src(v){this.attrs.set('src',v);this.readyState=0;this.error=null;}
  load(){this.readyState=0;this.error=null;}
  pause(){this.paused=true;this.emit('pause');}play(){this.paused=false;this.emit('play');return Promise.resolve();}
  scrollTo(value){this.lastScroll=value;}
}
function setup(){
  const doc={nodes:new Map(),activeElement:null,events:new Map(),fullscreenElement:null};
  doc.createElement=t=>new Node(doc,t);doc.createComment=()=>new Node(doc,'comment');doc.body=new Node(doc,'body');
  doc.getElementById=id=>doc.nodes.get(id);doc.querySelector=s=>s.startsWith('#')?doc.nodes.get(s.slice(1)):doc.body.querySelector(s);doc.querySelectorAll=s=>doc.body.querySelectorAll(s);
  doc.addEventListener=(name,fn)=>{if(!doc.events.has(name))doc.events.set(name,[]);doc.events.get(name).push(fn);};doc.emit=(name,event={})=>{for(const fn of doc.events.get(name)||[])fn({preventDefault(){},stopImmediatePropagation(){},...event});};
  const make=(id,parent=doc.body,tag='div',cls='')=>{const node=doc.createElement(tag);node.id=id;node.className=cls;parent.append(node);return node;};
  make('global-header',doc.body,'header','om-global-header');make('main-content',doc.body,'main','container');make('mobile-tab-bar');make('om-now-panel');
  const audio=make('audio');audio.paused=false;audio.src='song-a.flac';
  const player=make('mainPlayer',doc.body,'div','player'),left=make('player-left',player,'div','player-left'),right=make('player-right',player,'div','player-right');make('expand',right,'button','om-expand-btn');make('om-lyrics-btn',right,'button');
  for(const id of ['queueBox','modalOverlay','optionsModal','om-dialog-backdrop','om-toast','mob-player-modal'])make(id);
  doc.nodes.get('om-dialog-backdrop').hidden=true;doc.nodes.get('optionsModal').style.display='none';
  const oldOverlay=make('lyrics-overlay'),oldLeft=make('lyrics-left',oldOverlay),wrap=make('lyrics-cover-wrap',oldLeft),picture=make('lyrics-cover-big',wrap,'img'),clip=make('lyrics-cover-video',wrap,'video'),lyrics=make('lyrics-container',oldOverlay);lyrics.textContent='Lyrics A';clip.paused=true;
  const root=make('om-immersive');root.hidden=true;root.dataset.panel='cover';
  for(const name of ['similar','credits','lyrics']){const b=make('tab-'+name,root,'button');b.dataset.imTab=name;}
  make('om-im-fullscreen',root,'button');make('om-im-close',root,'button');make('om-im-art',root);
  const panel=make('om-im-panel',root);panel.hidden=true;for(const name of ['similar','credits','lyrics'])make('om-im-'+name,panel).hidden=true;
  make('om-im-player-slot',root);
  const a={url:'song-a.flac',title:'Song A',artist:'Artist A',album:'Album A',cover:'a.jpg',lyricsUrl:'a.lrc'},b={url:'song-b.mp3',title:'Song B',artist:'Artist A',album:'Album B',cover:'b.jpg'};
  let oldPlayerCalls=0;
  const context={document:doc,navigator:{},audio,currentSong:a,activeVideo:null,currentAlbumContext:null,lyricsContainer:lyrics,lyricsOverlay:oldOverlay,OM:{liked:new Set(),lyricTimer:null,playbackList:[]},songs:[a,b],
    $om:id=>doc.nodes.get(id),icon:name=>name,esc:s=>String(s||''),normal:s=>String(s||'').toLowerCase(),img:(src,alt)=>`<img src="${src}" alt="${alt||''}">`,albumOM:()=>null,artistPhotoOM:()=>null,omAlbumSaveButton:()=>'',omArtistLinks:name=>String(name),omToast(){},openOptions(){},
    openMobPlayerModal(){oldPlayerCalls++;},loadSong(s){context.currentSong=s;audio.src=s.url;audio.play();},openVideo(url){context.currentSong={url,type:'video'};context.activeVideo=context.currentSong;audio.src=url;audio.play();},loadLyrics:async()=>{lyrics.textContent='New lyrics';},requestAnimationFrame:fn=>fn(),clearTimeout(){}};
  context.window=context;doc.exitFullscreen=()=>{doc.fullscreenElement=null;doc.emit('fullscreenchange');return Promise.resolve();};
  vm.createContext(context);vm.runInContext(source,context);
  return {context,doc,audio,player,root,wrap,lyrics,oldOverlay,oldLeft,a,b,oldPlayerCalls:()=>oldPlayerCalls};
}
const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
test('abrir y cerrar la vista ampliada conserva el audio y restaura los controles',()=>{
  const h=setup();h.context.omOpenImmersive();
  assert.equal(h.root.hidden,false);assert.equal(h.player.parentNode.id,'om-im-player-slot');assert.equal(h.audio.parentNode,h.doc.body);assert.equal(h.audio.paused,false);assert.equal(h.audio.src,'song-a.flac');
  h.context.omCloseImmersive();assert.equal(h.root.hidden,true);assert.equal(h.player.parentNode,h.doc.body);assert.equal(h.wrap.parentNode,h.oldLeft);assert.equal(h.lyrics.parentNode,h.oldOverlay);assert.equal(h.audio.paused,false);
});
test('portada, letras, sugerencias y créditos comparten el mismo reproductor',()=>{
  const h=setup();h.context.omOpenImmersive();
  for(const name of ['lyrics','similar','credits']){h.context.omImmersiveTab(name);assert.equal(h.root.dataset.panel,name);assert.equal(h.doc.nodes.get('om-im-'+name).hidden,false);assert.equal(h.player.parentNode.id,'om-im-player-slot');}
  h.context.omImmersiveTab('credits');assert.equal(h.root.dataset.panel,'cover');assert.equal(h.doc.nodes.get('om-im-panel').hidden,true);
  assert.match(h.doc.nodes.get('om-im-similar').innerHTML,/Song B/);assert.match(h.doc.nodes.get('om-im-credits').innerHTML,/Artist A/);
});
test('cambiar de canción actualiza la portada sin salir de letras',()=>{
  const h=setup();h.context.omOpenImmersive('lyrics');h.context.loadSong(h.b);
  assert.equal(h.root.hidden,false);assert.equal(h.root.dataset.panel,'lyrics');assert.equal(h.doc.nodes.get('lyrics-cover-big').src,'b.jpg');assert.equal(h.doc.nodes.has('om-quality-badge'),false);assert.equal(h.audio.src,'song-b.mp3');
});
test('la portada animada usa el video de la canción y se pausa con el audio',async()=>{
  const h=setup();h.a.coverVideo='a-cover.mp4';h.context.omOpenImmersive();
  const clip=h.doc.nodes.get('lyrics-cover-video'),image=h.doc.nodes.get('lyrics-cover-big');
  assert.equal(clip.src,'a-cover.mp4');assert.equal(clip.poster,'a.jpg');
  assert.equal(image.classList.contains('lyrics-cover-img-hidden'),false);
  clip.readyState=2;clip.emit('loadeddata');await settle();
  assert.equal(clip.classList.contains('lyrics-cover-video-hidden'),false);assert.equal(image.classList.contains('lyrics-cover-img-hidden'),true);
  h.audio.pause();assert.equal(clip.paused,true);
  h.audio.play();await settle();assert.equal(clip.paused,false);
  h.context.loadSong(h.b);
  assert.equal(clip.src,'');assert.equal(clip.paused,true);assert.equal(clip.classList.contains('lyrics-cover-video-hidden'),true);
  assert.equal(image.src,'b.jpg');assert.equal(image.classList.contains('lyrics-cover-img-hidden'),false);
});
test('si falla la portada animada se muestra la imagen normal de la canción',()=>{
  const h=setup();h.a.coverVideo='a-cover.mp4';h.context.omOpenImmersive();
  const clip=h.doc.nodes.get('lyrics-cover-video'),image=h.doc.nodes.get('lyrics-cover-big');
  clip.readyState=2;clip.emit('loadeddata');
  clip.error={code:4};clip.emit('error');
  assert.equal(image.src,'a.jpg');assert.equal(image.classList.contains('lyrics-cover-img-hidden'),false);
  assert.equal(clip.classList.contains('lyrics-cover-video-hidden'),true);assert.equal(clip.paused,true);
});
test('abrir un video restaura la interfaz de música antes de reproducirlo',()=>{
  const h=setup();h.context.omOpenImmersive();h.context.openVideo('clip.mp4');
  assert.equal(h.root.hidden,true);assert.equal(h.player.parentNode,h.doc.body);assert.equal(h.context.activeVideo.url,'clip.mp4');
  h.context.openMobPlayerModal();assert.equal(h.oldPlayerCalls(),1);assert.equal(h.root.hidden,true);
});
test('pantalla completa rechazada mantiene la vista ampliada utilizable',async()=>{
  const h=setup();h.root.requestFullscreen=()=>Promise.reject(new Error('Blocked'));
  h.context.omOpenImmersive('cover',true);await settle();assert.equal(h.root.hidden,false);assert.equal(h.root.dataset.panel,'cover');assert.equal(h.audio.paused,false);
  h.context.omCloseImmersive();assert.equal(h.player.parentNode,h.doc.body);
});
test('fullscreen nativo sale sin detener la canción',async()=>{
  const h=setup();h.root.requestFullscreen=()=>{h.doc.fullscreenElement=h.root;h.doc.emit('fullscreenchange');return Promise.resolve();};
  h.context.omOpenImmersive('cover',true);await settle();assert.equal(h.doc.fullscreenElement,h.root);
  h.context.omToggleMusicFullscreen();await settle();assert.equal(h.doc.fullscreenElement,null);assert.equal(h.root.hidden,false);assert.equal(h.audio.paused,false);
});

test('pulsar la portada abre dentro de la pestaña y solo el botón explícito pide fullscreen',async()=>{
  const h=setup();let requests=0;
  h.root.requestFullscreen=()=>{requests++;h.doc.fullscreenElement=h.root;h.doc.emit('fullscreenchange');return Promise.resolve();};
  h.context.openMobPlayerModal();await settle();assert.equal(h.root.hidden,false);assert.equal(h.root.dataset.panel,'cover');assert.equal(requests,0);assert.equal(h.doc.fullscreenElement,null);
  h.context.omToggleMusicFullscreen();await settle();assert.equal(requests,1);assert.equal(h.doc.fullscreenElement,h.root);
  h.context.omCloseImmersive();assert.equal(h.doc.fullscreenElement,null);assert.equal(h.audio.paused,false);
});
