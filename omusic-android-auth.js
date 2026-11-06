/* OAuth en el navegador del sistema. El resultado viaja cifrado al APK solicitante. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,GoogleAuthProvider,GithubAuthProvider,signInWithPopup} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
const button=document.getElementById('signin'),status=document.getElementById('status'),back=document.getElementById('return');
const params=new URLSearchParams(location.hash.slice(1)),state=params.get('state'),provider=params.get('provider'),publicKey=params.get('pub');
const valid=/^[A-Za-z0-9_-]{43}$/.test(state||'')&&['google','github'].includes(provider)&&/^[A-Za-z0-9_-]{100,180}$/.test(publicKey||'');
// Do not retain session material in browser history or transmit it as a referrer.
history.replaceState(null,'',location.pathname);
function bytes(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
function encoded(value){return btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
if(!valid){button.hidden=true;status.textContent='Abre Iniciar sesión desde la app de OMUSIC para generar una solicitud nueva.';}
else{
  const auth=getAuth(initializeApp(window.OMUSIC_FIREBASE_CONFIG));
  button.disabled=false;button.textContent='Continuar con '+(provider==='google'?'Google':'GitHub');status.textContent='Elige tu cuenta y después vuelve a la app.';
  button.onclick=async()=>{
    button.disabled=true;status.textContent='Abriendo tu cuenta…';
    try{
      const account=provider==='google'?new GoogleAuthProvider():new GithubAuthProvider();if(provider==='google')account.setCustomParameters({prompt:'select_account'});
      const result=await signInWithPopup(auth,account),credential=provider==='google'?GoogleAuthProvider.credentialFromResult(result):GithubAuthProvider.credentialFromResult(result);
      if(!credential)throw new Error('No se recibió la credencial de acceso.');
      const nativeKey=await crypto.subtle.importKey('spki',bytes(publicKey),{name:'ECDH',namedCurve:'P-256'},false,[]);
      const ephemeral=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
      const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:nativeKey},ephemeral.privateKey,256)),text=new TextEncoder(),salt=text.encode(state),material=new Uint8Array(shared.length+salt.length);material.set(shared);material.set(salt,shared.length);
      const aes=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',material),'AES-GCM',false,['encrypt']);
      const payload={provider};if(credential.idToken)payload.idToken=credential.idToken;if(credential.accessToken)payload.accessToken=credential.accessToken;
      const iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:salt},aes,text.encode(JSON.stringify(payload)));
      const response=new URLSearchParams({state,pub:encoded(await crypto.subtle.exportKey('spki',ephemeral.publicKey)),iv:encoded(iv),data:encoded(encrypted)});
      back.href='omusic-auth://callback?'+response;back.hidden=false;button.hidden=true;status.textContent='Listo. Pulsa Volver a OMUSIC para completar el acceso.';
      // Erase the encrypted callback once used; the app accepts it only once.
      back.onclick=()=>{setTimeout(()=>{back.removeAttribute('href');back.hidden=true;status.textContent='Continúa en la app. Para repetir el acceso, inicia otra solicitud desde OMUSIC.';},1500);};
    }catch(error){button.disabled=false;status.textContent=error?.code==='auth/popup-closed-by-user'?'Cerraste el acceso. Puedes intentarlo otra vez.':error?.code==='auth/unauthorized-domain'?'Autoriza este dominio en Firebase Authentication y vuelve a intentarlo.':'No se pudo completar el acceso. Revisa tu conexión e inténtalo de nuevo.';}
  };
}
