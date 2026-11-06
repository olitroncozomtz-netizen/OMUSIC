const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'omusic-party-core.js'),'utf8'),context);
const C=context.window.OMPartyCore;
test('dos relojes calibrados calculan la misma posición al entrar tarde',()=>{
  const room={...C.create('host','Con amigos',100000,'song-a'),playing:true,position:12,anchorMs:100000};
  assert.equal(C.target(room,108250),20.25);assert.equal(C.target(room,108250,18),18);
  assert.equal(C.target({...room,playing:false},108250),12);
});
test('la reproducción se programa en el futuro y pausa conserva la posición compartida',()=>{
  const room=C.create('host','Party',100000,'song-a'),playing=C.transition(room,'play',{now:101000});
  assert.equal(playing.anchorMs,102200);assert.equal(C.target(playing,101500),0);
  const paused=C.transition(playing,'pause',{now:110000});assert.equal(paused.position,7.8);assert.equal(paused.playing,false);
  assert.equal(C.target(paused,200000),7.8);
});
test('añadir canciones no cambia la canción actual ni su reloj',()=>{
  const room={...C.create('host','Party',100000,'song-a'),playing:true};
  const queued=C.transition(room,'enqueue',{now:105000,songUrl:'song-b'});
  assert.equal(queued.trackUrl,'song-a');assert.equal(queued.anchorMs,100000);assert.equal(queued.playing,true);assert.equal(queued.revision,1);
  assert.deepEqual(Array.from(queued.queue),['song-a','song-b']);assert.deepEqual(Array.from(room.queue),['song-a']);
});
test('cola vacía permite añadir la primera canción y se detiene al terminar la última',()=>{
  let room=C.create('host','Party',100000);assert.equal(C.valid(room),true);
  room=C.transition(room,'enqueue',{now:100000,songUrl:'a'});assert.equal(room.index,0);assert.equal(room.playing,false);
  room=C.transition(room,'play',{now:100000});room=C.transition(room,'next',{now:104200});assert.equal(room.playing,false);assert.equal(room.trackUrl,'a');
});
test('reordenar o quitar pendientes conserva la identidad de la canción actual',()=>{
  let room=C.create('host','Party',100000,'a');for(const songUrl of ['b','c','d'])room=C.transition(room,'enqueue',{now:100000,songUrl});
  room=C.transition(room,'jump',{now:100000,index:2});room=C.transition(room,'move',{now:102000,from:0,to:3});
  assert.equal(room.queue[room.index],'c');assert.equal(room.trackUrl,'c');assert.equal(room.index,1);
  room=C.transition(room,'remove',{now:102000,index:0});assert.equal(room.queue[room.index],'c');assert.equal(room.index,0);
  assert.throws(()=>C.transition(room,'remove',{now:102000,index:0}));
  room=C.transition(room,'clear',{now:102000});assert.deepEqual(Array.from(room.queue),['c']);assert.equal(room.playing,true);
});
test('corrige retrasos grandes con salto y pequeños con un ajuste suave de velocidad',()=>{
  const room={...C.create('host','Party',100000,'a'),playing:true};
  assert.equal(C.correction(room,110000,6,100).seek,true);
  const close=C.correction(room,110000,9.7,100);assert.equal(close.seek,false);assert.equal(close.rate,1.03);
  assert.equal(C.correction(room,110000,10.3,100).rate,.97);
  assert.equal(C.correction(room,110000,10.02,100).rate,1);
});
test('rechaza estados incoherentes, miembros repetidos, colas llenas y parties terminadas',()=>{
  const room=C.create('host','Party',100000,'a');assert.equal(C.valid({...room,trackUrl:'otra'}),false);assert.equal(C.valid({...room,memberIds:['host','host']}),false);
  assert.equal(C.valid({...room,position:NaN}),false);assert.equal(C.valid({...room,queue:['a'],index:3}),false);
  assert.throws(()=>C.transition({...room,queue:Array(100).fill('a')},'enqueue',{now:100000,songUrl:'b'}));
  assert.throws(()=>C.transition({...room,status:'ended'},'play',{now:100000}));
  assert.equal(C.pair('b','a'),C.pair('a','b'));assert.equal(C.roomId('AB12CD34EF56'),true);assert.equal(C.roomId('../bad'),false);
});
test('solo reintenta un permiso rechazado cuando el estado compartido cambió de verdad',async()=>{
  let attempts=0;const room=C.create('host','Party',100000,'a'),denied=Object.assign(Error('denied'),{code:'permission-denied'});
  const result=await C.retryTransaction(async report=>{attempts++;report(room);if(attempts===1)throw denied;return 'saved';},async()=>({...room,revision:1}));
  assert.equal(result,'saved');assert.equal(attempts,2);
  attempts=0;await assert.rejects(C.retryTransaction(async report=>{attempts++;report(room);throw denied;},async()=>room));assert.equal(attempts,1);
});
