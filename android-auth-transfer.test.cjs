const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'omusic-android-auth.js'),'utf8').replace(/^import .*;\n/gm,'');
function setup(provider='google',invalid=false){
  const keys=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'}),state=crypto.randomBytes(32).toString('base64url'),pub=keys.publicKey.export({type:'spki',format:'der'}).toString('base64url');
  const nodes={signin:{disabled:true},status:{textContent:''},return:{hidden:true}},history=[];
  class Provider{setCustomParameters(){}static credentialFromResult(){return provider==='google'?{idToken:'mock-google-id',accessToken:'mock-access'}:{accessToken:'mock-github-access'};}}
  const context={document:{getElementById:name=>nodes[name]},location:{hash:invalid?'#provider=google':'#'+new URLSearchParams({state,pub,provider}),pathname:'/android-auth.html'},history:{replaceState:(...args)=>history.push(args)},URLSearchParams,TextEncoder,Uint8Array,crypto:crypto.webcrypto,atob,btoa,setTimeout:()=>1,initializeApp:()=>({}),getAuth:()=>({}),GoogleAuthProvider:Provider,GithubAuthProvider:Provider,signInWithPopup:async()=>({}),window:{OMUSIC_FIREBASE_CONFIG:{}}};
  vm.createContext(context);vm.runInContext(source,context);return{nodes,keys,state,history};
}
for(const provider of ['google','github'])test('el acceso '+provider+' vuelve cifrado y solo lo descifra la app solicitante',async()=>{
  const h=setup(provider);assert.equal(h.nodes.signin.disabled,false);assert.equal(h.history[0][2],'/android-auth.html');await h.nodes.signin.onclick();
  const url=new URL(h.nodes.return.href);assert.equal(url.protocol,'omusic-auth:');assert.equal(url.searchParams.get('state'),h.state);assert.ok(!url.href.includes('mock-'));
  const pub=crypto.createPublicKey({key:Buffer.from(url.searchParams.get('pub'),'base64url'),type:'spki',format:'der'}),secret=crypto.diffieHellman({privateKey:h.keys.privateKey,publicKey:pub}),key=crypto.createHash('sha256').update(secret).update(h.state).digest();
  const data=Buffer.from(url.searchParams.get('data'),'base64url'),iv=Buffer.from(url.searchParams.get('iv'),'base64url'),decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAAD(Buffer.from(h.state));decipher.setAuthTag(data.subarray(-16));const credential=JSON.parse(Buffer.concat([decipher.update(data.subarray(0,-16)),decipher.final()]).toString());
  assert.equal(credential.provider,provider);assert.match(credential.accessToken,/mock-/);
  const wrongKey=crypto.randomBytes(32),wrong=crypto.createDecipheriv('aes-256-gcm',wrongKey,iv);wrong.setAAD(Buffer.from(h.state));wrong.setAuthTag(data.subarray(-16));wrong.update(data.subarray(0,-16));assert.throws(()=>wrong.final());
});
test('un enlace Android incompleto no abre el proveedor ni genera un retorno',()=>{
  const h=setup('google',true);assert.equal(h.nodes.signin.hidden,true);assert.equal(h.nodes.signin.onclick,undefined);assert.equal(h.nodes.return.hidden,true);
});
