const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'omusic-motion.js'),'utf8');
function setup(reduced=false){
  let time=0;const preference={matches:reduced,addEventListener(){}},animations=[];
  class Node{
    constructor(){this.events={};this.style={removeProperty:key=>delete this.style[key]};}
    addEventListener(name,handler){(this.events[name]||=[]).push(handler);}
    closest(){return null;}
    setPointerCapture(){}
    emit(name,props={}){const event={isPrimary:true,button:0,pointerId:1,clientX:0,clientY:0,target:this,preventDefault(){},stopImmediatePropagation(){},...props};for(const handler of this.events[name]||[])handler(event);}
    animate(){let resolve,reject;const animation={finished:new Promise((a,b)=>{resolve=a;reject=b;}),finish:()=>resolve(),cancel:()=>reject(new Error('cancelled'))};animations.push(animation);return animation;}
  }
  const document=new Node();document.querySelector=()=>null;const context={document,matchMedia:()=>preference,performance:{now:()=>time},requestAnimationFrame:()=>1,cancelAnimationFrame(){},Event:class{constructor(type){this.type=type;}},prevSong(){},dispatchEvent(){}};context.window=context;
  vm.createContext(context);vm.runInContext(source,context);return {M:context.OMMotion,Node,animations,advance:ms=>time+=ms};
}
test('cancelar una salida antigua impide ejecutar su cierre después de abrir otra vez',async()=>{
  const h=setup(),node=new h.Node();let closed=0;h.M.leave(node,'sheet',()=>closed++);h.M.enter(node,'sheet');h.animations[0].finish();await Promise.resolve();assert.equal(closed,0);
  h.M.leave(node,'sheet',()=>closed++);h.animations.at(-1).finish();await Promise.resolve();assert.equal(closed,1);
});
test('movimiento reducido ejecuta los cierres sin animaciones ni esperas',()=>{
  const h=setup(true),node=new h.Node();let closed=0;h.M.enter(node,'sheet');h.M.leave(node,'sheet',()=>closed++);assert.equal(h.animations.length,0);assert.equal(closed,1);
});
test('deslizar a cada lado cambia una sola pista y arrastrar hacia abajo minimiza',()=>{
  const h=setup(),node=new h.Node();let next=0,previous=0,closed=0;h.M.bindGestures(node,{horizontal:true,dismiss:true,onNext:()=>next++,onPrevious:()=>previous++,onDismiss:()=>closed++});
  for(const [x,y]of [[-100,8],[100,3],[8,130]]){node.emit('pointerdown');h.advance(180);node.emit('pointermove',{clientX:x,clientY:y});node.emit('pointerup',{clientX:x,clientY:y});}
  assert.deepEqual([next,previous,closed],[1,1,1]);assert.equal(node.style.translate,undefined);
});
test('un gesto cancelado, corto o iniciado en un control no salta canciones',()=>{
  const h=setup(),node=new h.Node();let changes=0;h.M.bindGestures(node,{horizontal:true,onNext:()=>changes++});node.emit('pointerdown');h.advance(300);node.emit('pointermove',{clientX:-20});node.emit('pointerup');
  node.emit('pointerdown');node.emit('pointermove',{clientX:-120});node.emit('pointercancel');node.emit('pointerup');
  const input={closest:()=>({tagName:'INPUT'})};node.emit('pointerdown',{target:input});node.emit('pointermove',{clientX:-120});node.emit('pointerup');assert.equal(changes,0);assert.equal(node.style.translate,undefined);
});
