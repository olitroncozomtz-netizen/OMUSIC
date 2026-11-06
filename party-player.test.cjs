const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'.');
function setup(owner='guest'){
  const listeners=new Map(),nodes=new Map(),timers=new Map(),intervals=[],calls=[],notices=[];let time=100000,timer=0,room=null,connected=true;
  function node(){const handlers=new Map();return {innerHTML:'',textContent:'',disabled:false,style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},getBoundingClientRect:()=>({left:0,width:100}),addEventListener:(key,fn)=>{const list=handlers.get(key)||[];list.push(fn);handlers.set(key,list);},emit:(key,event={})=>{for(const fn of handlers.get(key)||[])fn(event);},querySelectorAll:()=>[]};}
  const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
  const audio=node();Object.assign(audio,{paused:true,currentTime:0,duration:100,readyState:1,playbackRate:1,src:'',playCalls:0,play(){this.playCalls++;this.paused=false;this.emit('play');return Promise.resolve();},pause(){this.paused=true;this.emit('pause');}});
  const songs=[{url:'a',title:'A',artist:'Artist'},{url:'b',title:'B',artist:'Artist'}];
  const context={window:null,document:{addEventListener:(name,fn)=>listeners.set(name,fn),hidden:false},navigator:{onLine:true},audio,songs,progress:get('progress'),lyricsContainer:get('lyrics-container'),currentLrcLines:[{time:12}],queueList:get('queueList'),currentSong:null,$om:get,esc:s=>String(s||''),img:()=>'',icon:()=>'',omToast:s=>notices.push(s),setInterval:fn=>intervals.push(fn),setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id),addEventListener:(name,fn)=>listeners.set(name,fn),OMSettings:{allowed:s=>s.url!=='blocked',reason:()=> 'blocked'},OMAudioSettings:{cancel(){}},loadSong(item,options){calls.push({type:'load',item,options});context.currentSong=item;audio.src=item.url;if(options?.autoplay!==false)audio.play();},openVideo(){calls.push({type:'video'});},playPause(){audio.paused?audio.play():audio.pause();},playNext(){calls.push({type:'normal-next'});},prevSong(){calls.push({type:'normal-prev'});},handleSongEnd(){calls.push({type:'normal-end'});},addToQueue:s=>calls.push({type:'local-queue',song:s}),renderQueue(){}};
  context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(base,'omusic-party-core.js'),'utf8'),context);
  const C=context.OMPartyCore;
  context.OMParty={get active(){return !!room;},get room(){return room;},get id(){return room?'ROOM':null;},get connected(){return connected;},get isHost(){return room?.hostId===owner;},owner,now:()=>time,updateStatus(){},presence:async()=>{},command:async(action,opts)=>calls.push({type:'command',action,opts}),enqueue:item=>calls.push({type:'party-queue',item})};
  context.omPartyCommand=(action,opts)=>context.OMParty.command(action,opts);
  vm.runInContext(fs.readFileSync(path.join(base,'omusic-party-player.js'),'utf8'),context);
  const emit=()=>listeners.get('omusic-party-state')();
  return {context,audio,calls,notices,C,get,intervals,timers,room(value){room=value;emit();},update(value){room={...room,...value};emit();},time(value){time=value;},disconnect(){connected=false;emit();},tick(){for(const fn of [...timers.values()])fn();timers.clear();}};
}
test('un invitado prepara la canción recibida sin reproducir hasta activar su audio',async()=>{
  const h=setup();h.room({...h.C.create('host','Party',100000,'a'),playing:true,heartbeatAt:100000,position:10});
  assert.equal(h.audio.src,'a');assert.equal(h.audio.paused,true);assert.equal(h.calls[0].options.autoplay,false);
  h.context.omPartyEnableAudio();await Promise.resolve();assert.equal(h.audio.paused,false);assert.ok(Math.abs(h.audio.currentTime-10)<.1);
});
test('entrar tarde se alinea con el reloj del anfitrión y los cambios remotos actualizan la misma instancia',async()=>{
  const h=setup();h.time(107000);h.room({...h.C.create('host','Party',100000,'a'),playing:true,heartbeatAt:107000,position:2});h.context.omPartyEnableAudio();await Promise.resolve();
  assert.ok(Math.abs(h.audio.currentTime-9)<.1);const media=h.audio;
  h.audio.currentTime=0;h.update({trackUrl:'b',queue:['a','b'],index:1,position:0,anchorMs:107000,revision:1});assert.equal(h.audio,media);assert.equal(h.audio.src,'b');assert.equal(h.audio.paused,false);
});
test('la pausa y el salto remotos no dejan una reproducción local independiente',async()=>{
  const h=setup();h.room({...h.C.create('host','Party',100000,'a'),playing:true,heartbeatAt:100000});h.context.omPartyEnableAudio();await Promise.resolve();
  h.update({playing:false,position:35,revision:1});assert.equal(h.audio.paused,true);assert.equal(h.audio.currentTime,35);
});
test('un invitado suma canciones y los controles no cambian el estado compartido',()=>{
  const h=setup();h.room({...h.C.create('host','Party',100000,'a'),heartbeatAt:100000});h.context.loadSong(h.context.songs[1]);h.context.playPause();h.context.playNext();h.context.prevSong();
  assert.equal(h.calls.filter(x=>x.type==='party-queue').length,1);assert.equal(h.calls.filter(x=>x.type==='command').length,0);assert.equal(h.audio.src,'a');assert.ok(h.notices.length>=3);
});
test('el anfitrión envía los controles al servidor y el final de pista avanza la party',()=>{
  const h=setup('host');h.room({...h.C.create('host','Party',100000,'a'),heartbeatAt:100000});h.context.playPause();h.context.handleSongEnd();
  assert.ok(h.calls.some(x=>x.type==='command'&&x.action==='play'));assert.ok(h.calls.some(x=>x.type==='command'&&x.action==='next'));assert.equal(h.calls.some(x=>x.type==='normal-end'),false);
});
test('sin conexión o sin latidos del anfitrión pausa y al salir restaura la velocidad local',async()=>{
  const h=setup();h.room({...h.C.create('host','Party',100000,'a'),playing:true,heartbeatAt:100000});h.context.omPartyEnableAudio();await Promise.resolve();h.disconnect();assert.equal(h.audio.paused,true);
  assert.match(h.context.OMPartyPlayer.status(),/conexión/);h.room(null);assert.equal(h.audio.playbackRate,1);h.context.playNext();assert.ok(h.calls.some(x=>x.type==='normal-next'));
  const old=setup();old.time(150000);old.room({...old.C.create('host','Party',100000,'a'),playing:true,heartbeatAt:100000});assert.equal(old.audio.paused,true);assert.match(old.context.OMPartyPlayer.status(),/anfitrión/);
});
test('un latido durante la cuenta atrás no cancela el inicio programado',()=>{
  const h=setup('host');h.room({...h.C.create('host','Party',100000,'a'),playing:true,anchorMs:101200,heartbeatAt:100000});h.context.omPartyEnableAudio();for(const fn of h.intervals)fn();
  assert.equal(h.calls.some(x=>x.type==='command'&&x.action==='heartbeat'),false);
});
