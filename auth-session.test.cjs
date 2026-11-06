const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'auth-original.js'),'utf8').replace(/\bimport\(/g,'loadSDK(');
const user={uid:'google-a',displayName:'Oliver',email:'oliver@example.test',photoURL:'profile.jpg'};
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function setup(options={}){
  const memory=options.memory||new Map(),nodes=new Map(),events=[];
  const get=id=>{if(!nodes.has(id))nodes.set(id,{style:{},innerHTML:'Continuar con '+id,disabled:false,textContent:''});return nodes.get(id);};
  const auth={currentUser:options.user||null};let observer,signOutCalls=0,popupCalls=0,popupError=null,popupWait=null;
  class Provider{static credential(idToken,accessToken){return {idToken,accessToken};}setCustomParameters(value){this.parameters=value;}}
  const sdk={
    initializeApp:()=>({}),getAuth:()=>auth,GoogleAuthProvider:Provider,GithubAuthProvider:Provider,getFirestore:()=>({}),doc(){},getDoc(){},setDoc(){},
    onAuthStateChanged:(_,fn)=>{observer=fn;if(!options.deferRestore)observer(auth.currentUser);},
    signOut:async()=>{signOutCalls++;if(options.signOutError)throw Error('failed');auth.currentUser=null;observer?.(null);},
    signInWithCredential:async()=>{auth.currentUser=user;observer(user);return{user};},
    signInWithPopup:async()=>{popupCalls++;if(popupError)throw popupError;if(popupWait)await popupWait;auth.currentUser=user;observer(user);return{user};}
  };
  const context={document:{readyState:'complete',getElementById:get},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},CustomEvent:class{constructor(type){this.type=type;}},dispatchEvent:e=>events.push(e.type),loadSDK:async()=>{if(options.offline)throw Error('offline');if(options.importWait)await options.importWait;return sdk;}};
  context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'firebase-config.js'),'utf8'),context);vm.runInContext(source,context);
  return {context,nodes,memory,auth,events,get,restore:()=>observer(auth.currentUser),popupError:value=>popupError=value,popupWait:value=>popupWait=value,signOutCalls:()=>signOutCalls,popupCalls:()=>popupCalls};
}
test('restaura la cuenta de Google y actualiza el perfil',async()=>{
  const h=setup({user});await h.context._omAuthReady;
  assert.equal(h.context._currentFirebaseUser.uid,user.uid);assert.equal(h.context._guestMode,false);
  assert.equal(h.get('login-overlay').style.display,'none');assert.equal(h.get('displayUsername').textContent,'Oliver');assert.ok(h.events.includes('omusic-auth-state'));
});
test('cerrar sesión muestra las opciones y permite volver a entrar con Google',async()=>{
  const h=setup({user});await h.context._omAuthReady;await h.context.logout();
  assert.equal(h.context._currentFirebaseUser,null);assert.equal(h.auth.currentUser,null);assert.equal(h.context._guestMode,false);
  assert.equal(h.get('login-overlay').style.display,'flex');assert.equal(h.memory.get('omusic_auth_mode'),'signed-out');
  await h.context.loginGoogle();assert.equal(h.context._currentFirebaseUser.uid,user.uid);assert.equal(h.get('login-overlay').style.display,'none');assert.equal(h.get('btn-google').disabled,false);
});
test('el modo invitado funciona aunque Firebase no tenga conexión',async()=>{
  const h=setup({offline:true});await h.context._omAuthReady;await h.context.loginGuest();
  assert.equal(h.context._currentFirebaseUser,null);assert.equal(h.context._guestMode,true);assert.equal(h.get('login-overlay').style.display,'none');
  assert.equal(h.memory.get('omusic_auth_mode'),'guest');assert.equal(h.get('displayUsername').textContent,'Invitado');
});
test('elegir invitado antes de cargar Firebase impide recuperar una cuenta anterior',async()=>{
  let release;const importWait=new Promise(resolve=>release=resolve);const h=setup({user,importWait});
  await h.context.loginGuest();release();await h.context._omAuthReady;await settle();
  assert.equal(h.context._guestMode,true);assert.equal(h.context._currentFirebaseUser,null);assert.equal(h.auth.currentUser,null);assert.equal(h.get('login-overlay').style.display,'none');
});
test('una ventana cancelada vuelve a habilitar Google y admite otro intento',async()=>{
  const h=setup();await h.context._omAuthReady;const label=h.get('btn-google').innerHTML;
  h.popupError({code:'auth/popup-closed-by-user'});await h.context.loginGoogle();
  assert.equal(h.get('btn-google').disabled,false);assert.equal(h.get('btn-google').innerHTML,label);assert.match(h.get('authError').textContent,/Cerraste/);
  h.popupError(null);await h.context.loginGoogle();assert.equal(h.context._currentFirebaseUser.uid,user.uid);assert.equal(h.popupCalls(),2);
});
test('una respuesta tardía de Google no reemplaza el modo invitado elegido',async()=>{
  const h=setup();await h.context._omAuthReady;
  let release;h.popupWait(new Promise(resolve=>release=resolve));const login=h.context.loginGoogle();
  await h.context.loginGuest();release();await login;await settle();
  assert.equal(h.context._guestMode,true);assert.equal(h.context._currentFirebaseUser,null);assert.equal(h.auth.currentUser,null);assert.equal(h.get('login-overlay').style.display,'none');
});
test('un fallo al cerrar sesión conserva la cuenta activa',async()=>{
  const h=setup({user,signOutError:true});await h.context._omAuthReady;
  await assert.rejects(h.context.logout());assert.equal(h.context._currentFirebaseUser.uid,user.uid);assert.equal(h.context._guestMode,false);assert.equal(h.memory.get('omusic_auth_mode'),'account');
});

test('Android usa la credencial devuelta por el navegador sin abrir un popup de WebView',async()=>{
  const h=setup();await h.context._omAuthReady;let requested;
  h.context.OMAndroidAuth={signIn:async provider=>{requested=provider;return {provider,idToken:'mock-id-token'};},cancel(){}};
  await h.context.loginGoogle();assert.equal(requested,'google');assert.equal(h.popupCalls(),0);assert.equal(h.context._currentFirebaseUser.uid,user.uid);
});
test('elegir invitado cancela una solicitud Android pendiente y rechaza su respuesta tardía',async()=>{
  const h=setup();await h.context._omAuthReady;let resolve,cancels=0;
  h.context.OMAndroidAuth={signIn:()=>new Promise(done=>resolve=done),cancel:()=>cancels++};
  const login=h.context.loginGoogle();await h.context.loginGuest();resolve({provider:'google',idToken:'mock-id-token'});await login;
  assert.equal(cancels,1);assert.equal(h.context._currentFirebaseUser,null);assert.equal(h.context._guestMode,true);assert.equal(h.auth.currentUser,null);
});
