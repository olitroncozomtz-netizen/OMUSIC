const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'.'),context={window:{}};vm.createContext(context);
for(const name of ['canciones.js','omusic-cover-colors.js','omusic-cover-palette.js'])vm.runInContext(fs.readFileSync(path.join(base,name),'utf8'),context);
const P=context.window.OMCoverPalette;
test('todas las portadas actuales tienen un color medido incluso sin CORS en el navegador',()=>{
  const covers=vm.runInContext('[...new Set(songs.map(s=>s.cover).filter(Boolean))]',context);for(const cover of covers){const color=P.get(cover);assert.ok(color,cover);assert.match(color.dark,/^\d+,\d+,\d+$/);assert.match(color.light,/^\d+,\d+,\d+$/);}
});
test('portadas rosas y azules producen fondos de distinto color con variantes para ambos temas',()=>{
  const pink=P.fromRgb([210,109,139]),blue=P.fromRgb([30,72,194]);assert.notEqual(pink.dark,blue.dark);assert.notEqual(pink.light,blue.light);
  const rgb=blue.dark.split(',').map(Number);assert.ok(rgb[2]>rgb[0]);assert.ok(pink.light.split(',').map(Number).every(v=>v>200));
});
test('la muestra dominante descarta bordes blancos cuando la imagen contiene color',()=>{
  const pixels=new Uint8ClampedArray(400);for(let i=0;i<100;i++)pixels.set(i<65?[230,230,230,255]:[20,60,180,255],i*4);
  const rgb=P.dominant(pixels);assert.ok(rgb[2]>rgb[0]*2);
});
test('aplicar una nueva portada sustituye ambos colores sin cambiar el tema ni el audio',()=>{
  const values={};const root={style:{setProperty:(key,value)=>values[key]=value}};P.apply(root,P.fromRgb([190,70,100]));const before=values['--om-mp-rgb'];P.apply(root,P.fromRgb([20,60,180]));assert.notEqual(values['--om-mp-rgb'],before);assert.ok(values['--om-mp-light-rgb']);
});
