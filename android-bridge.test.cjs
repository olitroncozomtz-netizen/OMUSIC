const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'omusic-android.js'),'utf8');
function setup(origin='https://appassets.androidplatform.net',pathname='/assets/www/index.html'){
  const calls=[],classes=new Set(),closed=[],dialog={hidden:true};
  const c={location:{origin,pathname},prompt:message=>{const data=JSON.parse(message.slice(14));calls.push(data);return JSON.stringify(data.action==='capabilities'?{ok:true,website:'https://music.example/',pip:true}:data.action==='login'?{ok:true,state:'one-native-transaction'}:{ok:true});},document:{addEventListener(){},getElementById:()=>dialog,body:{classList:{contains:value=>classes.has(value)}}},setTimeout:()=>1,clearTimeout(){},OMMobilePlayer:{queueOpen:false,open(){},close:()=>closed.push('player')},omCloseDialog:()=>closed.push('dialog'),OM:{back:[]}};
  c.window=c;vm.createContext(c);vm.runInContext(source,c);return{c,calls,classes,closed,dialog};
}
test('el puente Android no se activa en páginas web ni en otras rutas del origen reservado',()=>{
  for(const [origin,pathname]of [['https://music.example','/assets/www/index.html'],['https://appassets.androidplatform.net','/other.html']]){const h=setup(origin,pathname);assert.equal(h.calls.length,0);assert.equal(h.c.OMAndroid,undefined);}
});
test('el acceso Android solo acepta la respuesta de su transacción pendiente',async()=>{
  const h=setup();let done=false;const result=h.c.OMAndroidAuth.signIn('google').then(value=>{done=true;return value;});
  h.c.OMAndroidAuth.receive({state:'wrong',credential:{idToken:'wrong'}});await Promise.resolve();assert.equal(done,false);
  h.c.OMAndroidAuth.receive({state:'one-native-transaction',credential:{idToken:'mock-token'}});assert.equal((await result).idToken,'mock-token');
});
test('cancelar el acceso pendiente rechaza la promesa y no acepta respuestas posteriores',async()=>{
  const h=setup();const result=h.c.OMAndroidAuth.signIn('github');h.c.OMAndroidAuth.cancel();h.c.OMAndroidAuth.receive({state:'one-native-transaction',credential:{accessToken:'late'}});await assert.rejects(result,error=>error.code==='auth/popup-closed-by-user');assert.equal(h.calls.at(-1).action,'cancelAuth');
});
test('Volver en Android cierra el reproductor solo cuando está visible y deja salir desde Inicio',()=>{
  const h=setup();assert.equal(h.c.OMAndroid.back(),false);assert.equal(h.closed.length,0);h.classes.add('om-mobile-player-open');assert.equal(h.c.OMAndroid.back(),true);assert.deepEqual(h.closed,['player']);h.classes.clear();h.dialog.hidden=false;assert.equal(h.c.OMAndroid.back(),true);assert.deepEqual(h.closed,['player','dialog']);
});
