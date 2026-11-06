/* Sesión de OMUSIC: Google/GitHub con Firebase y modo local independiente. */
(() => {
  'use strict';
  const readMode=()=>{try{return localStorage.getItem('omusic_auth_mode');}catch{return null;}};
  let mode=['guest','signed-out'].includes(readMode())?readMode():'account';
  let services=null,intent=0,uiPending=false;
  window._guestMode=mode==='guest';
  window._currentFirebaseUser=null;
  window._omAuthStatus='loading';
  window._omAuthError='';

  function saveMode(){try{localStorage.setItem('omusic_auth_mode',mode);}catch{}}
  function showError(message){
    window._omAuthError=message;
    const el=document.getElementById('authError');if(el)el.textContent=message;
  }
  function renderSession(){
    if(document.readyState==='loading'){
      if(!uiPending){uiPending=true;document.addEventListener('DOMContentLoaded',()=>{uiPending=false;renderSession();},{once:true});}
      return;
    }
    const user=window._currentFirebaseUser;
    const overlay=document.getElementById('login-overlay');
    const shared=!!window.OMProfileRoutes?.parse()||/^#(?:playlist|profile|track|album|artist|video)=/.test(window.location?.hash||'');
    if(overlay){overlay.style.opacity='1';overlay.style.display=!user&&mode!=='guest'&&!shared?'flex':'none';}
    const name=document.getElementById('displayUsername'),picture=document.getElementById('userPic');
    if(name)name.textContent=user?.displayName||user?.email||'Invitado';
    if(picture)picture.src=user?.photoURL||'placeholder.svg';
    window.dispatchEvent(new CustomEvent('omusic-auth-state'));
  }
  function publishSession(user){
    window._currentFirebaseUser=mode==='account'?user:null;
    window._guestMode=mode==='guest';
    renderSession();
  }
  async function chooseMode(next){
    const previous=mode,ticket=++intent;window.OMAndroidAuth?.cancel();mode=next;saveMode();showError('');
    try{
      if(services?.auth.currentUser)await services.signOut(services.auth);
      if(ticket===intent)publishSession(null);
    }catch(error){
      if(ticket===intent){mode=previous;saveMode();showError('No se pudo cerrar la sesión. Inténtalo de nuevo.');}
      throw error;
    }
  }
  window.loginGuest=()=>chooseMode('guest').catch(()=>{});
  window.logout=()=>chooseMode('signed-out');

  function loginError(error,provider){
    const messages={
      'auth/popup-closed-by-user':'Cerraste la ventana de acceso. Puedes intentarlo de nuevo.',
      'auth/cancelled-popup-request':'Ya hay una ventana de acceso abierta.',
      'auth/popup-blocked':'Permite las ventanas emergentes de OMUSIC para iniciar sesión.',
      'auth/unauthorized-domain':'El acceso con '+provider+' todavía no está habilitado para esta dirección de OMUSIC. Puedes usar el modo invitado.',
      'auth/network-request-failed':'No se pudo conectar. Revisa tu conexión o usa el modo invitado.',
      'auth/account-exists-with-different-credential':'Esta cuenta ya usa otro método de acceso. Inicia sesión con el proveedor original.'
    };
    return messages[error?.code]||'No se pudo iniciar sesión con '+provider+'. Inténtalo de nuevo o continúa como invitado.';
  }
  async function loginProvider(name){
    if(!services){
      showError(window._omAuthStatus==='loading'?'El inicio de sesión se está preparando. Inténtalo en unos segundos.':'No se pudo conectar con el servicio de acceso. Recarga para reintentar o usa el modo invitado.');
      return;
    }
    const button=document.getElementById(name==='Google'?'btn-google':'btn-github');
    if(button?.disabled)return;
    const label=button?.innerHTML,previous=mode,ticket=++intent;
    mode='account';saveMode();showError('');
    if(button){button.disabled=true;button.textContent='Conectando…';}
    try{
      if(window.OMAndroidAuth){
        const result=await window.OMAndroidAuth.signIn(name==='Google'?'google':'github');
        if(ticket!==intent)return;
        const credential=name==='Google'?services.GoogleAuthProvider.credential(result.idToken||null,result.accessToken||null):services.GithubAuthProvider.credential(result.accessToken);
        await services.signInWithCredential(services.auth,credential);
      }else await services.signInWithPopup(services.auth,name==='Google'?services.google:services.github);
    }catch(error){
      if(ticket===intent){mode=previous;saveMode();showError(loginError(error,name));}
    }finally{
      if(button){button.disabled=false;button.innerHTML=label;}
    }
  }
  window.loginGoogle=()=>loginProvider('Google');
  window.loginGitHub=()=>loginProvider('GitHub');

  // Las importaciones no bloquean el modo invitado si no hay red.
  window._omAuthReady=(async()=>{
    const [appSDK,authSDK,dbSDK]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
    ]);
    const app=appSDK.initializeApp(window.OMUSIC_FIREBASE_CONFIG);
    const auth=authSDK.getAuth(app),google=new authSDK.GoogleAuthProvider(),github=new authSDK.GithubAuthProvider();
    google.setCustomParameters({prompt:'select_account'});
    services={auth,google,github,signInWithPopup:authSDK.signInWithPopup,signInWithCredential:authSDK.signInWithCredential,GoogleAuthProvider:authSDK.GoogleAuthProvider,GithubAuthProvider:authSDK.GithubAuthProvider,signOut:authSDK.signOut};
    window._db=dbSDK.getFirestore(app);window._doc=dbSDK.doc;window._getDoc=dbSDK.getDoc;window._setDoc=dbSDK.setDoc;
    window._getDocServer=dbSDK.getDocFromServer;window._getDocsServer=dbSDK.getDocsFromServer;window._collection=dbSDK.collection;window._writeBatch=dbSDK.writeBatch;
    window._onSnapshot=dbSDK.onSnapshot;window._query=dbSDK.query;window._where=dbSDK.where;window._limit=dbSDK.limit;window._orderBy=dbSDK.orderBy;window._startAt=dbSDK.startAt;window._endAt=dbSDK.endAt;
    window._runTransaction=dbSDK.runTransaction;window._updateDoc=dbSDK.updateDoc;window._deleteDoc=dbSDK.deleteDoc;window._serverTimestamp=dbSDK.serverTimestamp;window._Timestamp=dbSDK.Timestamp;
    window._omAuthStatus='ready';
    authSDK.onAuthStateChanged(auth,user=>{
      if(user&&mode!=='account'){
        publishSession(null);
        services.signOut(auth).catch(()=>showError('No se pudo cerrar la sesión anterior. Recarga e inténtalo de nuevo.'));
        return;
      }
      publishSession(user);
    },()=>{showError('No se pudo recuperar la sesión. Puedes usar el modo invitado.');publishSession(null);});
    if(!window._currentFirebaseUser&&mode!=='account')renderSession();
    return services;
  })().catch(()=>{
    window._omAuthStatus='unavailable';
    showError('No se pudo conectar con el servicio de acceso. Puedes usar el modo invitado.');
    publishSession(null);
    return null;
  });
})();
