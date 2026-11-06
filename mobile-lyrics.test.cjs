const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'omusic-mobile-lyrics.js'),'utf8');
function target(){const events=new Map();return {addEventListener:(name,fn)=>{if(!events.has(name))events.set(name,[]);events.get(name).push(fn);},emit:(name,event={})=>{for(const fn of events.get(name)||[])fn(event);}};}
function classes(){const values=new Set();return {add:(...names)=>names.forEach(n=>values.add(n)),remove:(...names)=>names.forEach(n=>values.delete(n)),contains:name=>values.has(name),toggle(name,on){if(on)values.add(name);else values.delete(name);}};}
function setup({mobile=true,reduced=false,open=true,paused=false}={}){
  let clock=0,frameId=0;const frames=new Map(),animations=[],oldSync=[],properties=new Map();
  const phone={...target(),matches:mobile},motion={...target(),matches:reduced};
  const box={...target(),classList:classes(),clientHeight:400,scrollHeight:2400,scrollTop:0,style:{setProperty:(k,v)=>properties.set(k,v),removeProperty:k=>properties.delete(k)},scrollTo({top}){this.scrollTop=top;},getBoundingClientRect:()=>({top:100,bottom:500}),contains:node=>nodes.includes(node),querySelector:()=>nodes[0]||null};
  let nodes=[];
  const createLines=times=>times.map((time,i)=>({id:'lrc-'+i,classList:classes(),textContent:'Frase '+i,offsetTop:35+i*100,offsetHeight:65,getBoundingClientRect(){const top=100+this.offsetTop-box.scrollTop;return {top,bottom:top+this.offsetHeight};},animate(keyframes,options){const animation={node:this,keyframes,options,cancelled:false,finished:new Promise(()=>{}),cancel(){this.cancelled=true;}};animations.push(animation);return animation;}}));
  const audio={...target(),paused,currentTime:8,src:'song-a.flac',playbackRate:1};
  const player={open,tab:'lyrics',queueOpen:false};let mounted=true;
  const doc={...target(),hidden:false,getElementById:id=>id==='om-mobile-player'?{contains:node=>mounted&&node===box}:nodes.find(n=>n.id===id)};
  const c={...target(),document:doc,performance:{now:()=>clock},matchMedia:q=>q.includes('768px')?phone:motion,requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),lyricsContainer:box,currentLrcLines:Array.from({length:12},(_,i)=>({time:i*2,text:'Frase '+i})),audio,OMMobilePlayer:player,updateLyricsSync:time=>oldSync.push(time),renderLyricsToContainer(){},loadLyrics:async()=>{}};
  nodes=createLines(c.currentLrcLines.map(l=>l.time));c.window=c;vm.createContext(c);vm.runInContext(source,c);
  return {c,box,audio,player,phone,motion,doc,frames,animations,oldSync,properties,get nodes(){return nodes;},time(value){audio.currentTime=value;c.updateLyricsSync(value);},advance(ms){clock+=ms;},mounted:value=>mounted=value,replace(times){c.currentLrcLines=times.map((time,i)=>({time,text:'Nueva frase '+i}));nodes=createLines(times);c.renderLyricsToContainer();},frame(){const [id,fn]=frames.entries().next().value||[];if(fn){frames.delete(id);fn();}}};
}
test('el efecto actúa solo dentro de las letras abiertas en celular y delega la vista de PC',()=>{
  for(const options of [{mobile:false},{open:false}]){
    const h=setup(options);h.c.OMMobileLyrics.visibility();h.time(10);
    assert.deepEqual(h.oldSync,[10]);assert.equal(h.frames.size,0);assert.equal(h.box.classList.contains('om-mobile-lyrics-ready'),false);assert.equal(h.animations.length,0);
  }
});
test('al abrir se centra la frase actual y se distinguen las anteriores y las próximas',()=>{
  const h=setup();h.c.OMMobileLyrics.visibility();
  assert.equal(h.nodes[4].classList.contains('active'),true);assert.equal(h.nodes[3].classList.contains('om-lyric-past'),true);assert.equal(h.nodes[5].classList.contains('om-lyric-next'),true);
  assert.ok(h.box.scrollTop>0);assert.equal(h.animations.length,0);assert.equal(h.frames.size,1);
  assert.equal(h.audio.src,'song-a.flac');assert.equal(h.audio.currentTime,8);assert.equal(h.audio.playbackRate,1);assert.equal(h.audio.paused,false);
});
test('un cambio de frase desplaza las líneas con un pequeño desfase entre ellas',()=>{
  const h=setup();h.c.OMMobileLyrics.visibility();h.time(9.9);h.time(10.05);
  const current=h.animations.find(a=>a.node===h.nodes[5]),next=h.animations.find(a=>a.node===h.nodes[6]);
  assert.ok(current);assert.ok(next);assert.ok(next.options.delay>current.options.delay);assert.ok(current.options.duration>0);
  assert.notEqual(current.keyframes[0].translate,'0 0px');assert.equal(current.keyframes.at(-1).translate,'0 0px');assert.equal(h.nodes[5].classList.contains('active'),true);
});
test('adelantar o retroceder la canción actualiza inmediatamente la frase sin recorrer las intermedias',()=>{
  const h=setup();h.c.OMMobileLyrics.visibility();h.audio.currentTime=18;h.audio.emit('seeked');
  assert.equal(h.nodes[9].classList.contains('active'),true);assert.equal(h.animations.length,0);
  h.audio.currentTime=0;h.audio.emit('seeked');assert.equal(h.nodes[0].classList.contains('active'),true);assert.equal(h.nodes[9].classList.contains('active'),false);
});
test('desplazarse con el dedo permite leer libremente antes de recuperar el seguimiento',()=>{
  const h=setup();h.c.OMMobileLyrics.visibility();h.box.emit('pointerdown');const start=h.box.scrollTop;h.time(10);
  assert.equal(h.box.scrollTop,start);assert.equal(h.nodes[5].classList.contains('active'),true);
  h.c.emit('pointerup');h.advance(3001);h.c.OMMobileLyrics.center();assert.notEqual(h.box.scrollTop,start);
});
test('pausar, abrir la cola o cerrar la letra detiene el trabajo de animación',()=>{
  const h=setup();h.c.OMMobileLyrics.visibility();h.audio.paused=true;h.audio.emit('pause');assert.equal(h.frames.size,0);
  h.audio.paused=false;h.audio.emit('play');assert.equal(h.frames.size,1);h.player.queueOpen=true;h.c.OMMobileLyrics.visibility();assert.equal(h.frames.size,0);
  h.player.queueOpen=false;h.c.OMMobileLyrics.visibility();assert.equal(h.frames.size,1);h.player.open=false;h.c.OMMobileLyrics.stop();assert.equal(h.frames.size,0);assert.equal(h.box.classList.contains('om-mobile-lyrics-ready'),false);
});
test('cambiar de canción descarta las líneas antiguas y sigue las marcas nuevas',()=>{
  const h=setup();h.c.OMMobileLyrics.visibility();const old=h.nodes;h.audio.currentTime=1;h.replace([0,1,2]);
  assert.equal(h.nodes[1].classList.contains('active'),true);assert.equal(h.nodes.length,3);assert.notEqual(h.nodes[1],old[1]);assert.ok([...h.frames.values()].length<=1);
});
test('movimiento reducido conserva la sincronización sin transiciones de desplazamiento',()=>{
  const h=setup({reduced:true});h.c.OMMobileLyrics.visibility();h.time(10);assert.equal(h.nodes[5].classList.contains('active'),true);assert.equal(h.animations.length,0);assert.equal(h.frames.size,0);
});
test('ocultar la pestaña o ampliar a escritorio cancela los movimientos pendientes',()=>{
  const h=setup();h.c.OMMobileLyrics.visibility();h.time(9.9);h.time(10.05);assert.ok(h.animations.length);
  h.doc.hidden=true;h.doc.emit('visibilitychange');assert.equal(h.frames.size,0);assert.ok(h.animations.every(a=>a.cancelled));
  h.doc.hidden=false;h.doc.emit('visibilitychange');h.phone.matches=false;h.phone.emit('change');h.time(12);assert.deepEqual(h.oldSync,[12]);assert.equal(h.box.classList.contains('om-mobile-lyrics-ready'),false);
});
test('el refresco de reproducción detecta los tiempos nuevos sin reiniciar la canción',()=>{
  const h=setup();h.c.OMMobileLyrics.visibility();h.audio.currentTime=10;h.frame();assert.equal(h.nodes[5].classList.contains('active'),true);assert.equal(h.frames.size,1);assert.equal(h.audio.currentTime,10);
});
