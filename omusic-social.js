/* Perfiles editables y playlists públicas: los datos privados siguen por cuenta. */
'use strict';
const OM_SOCIAL={request:0,epoch:0,writes:Promise.resolve(),publishing:0,profileOwner:null,profilePromise:null,shared:null,editOwner:null};
const omSocialQueue=job=>{const next=OM_SOCIAL.writes.then(job);OM_SOCIAL.writes=next.catch(()=>{});return next;};
const omSocialId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
const omHandleValid=value=>typeof value==='string'&&/^[A-Za-z0-9_]{1,30}$/.test(value);
const omHandleKey=value=>omHandleValid(value)?value.toLowerCase():'';
const omProfileError=(code,message)=>Object.assign(new Error(message),{code});
function omProfileMessage(error){
  if(error?.code==='handle-taken')return 'Ese nombre de usuario ya está ocupado. Elige otro.';
  if(error?.code==='invalid-handle')return 'Usa de 1 a 30 letras, números o guiones bajos, sin espacios ni @.';
  if(String(error?.code||'').includes('permission-denied'))return 'No se pudo reservar tu usuario. Actualiza las reglas de Firestore con el archivo incluido en OMUSIC.';
  return error?.message||'No se pudo guardar tu perfil. Revisa tu conexión e inténtalo de nuevo.';
}
function omSafeWebsite(value){
  const raw=String(value||'').trim();if(!raw)return '';
  try{const url=new URL(/^https?:\/\//i.test(raw)?raw:'https://'+raw);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href.slice(0,500):'';}catch{return '';}
}
function omSafeProfileImage(value,max=520000){
  const src=typeof value==='string'?value:'';
  return src.length<=max&&(/^(https?:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(src)||/^assets\/[a-z0-9_./-]+$/i.test(src))?src:'';
}
function omCleanProfile(data={},owner=userKeyOM()){
  if(!data||typeof data!=='object')data={};
  const user=owner===userKeyOM()?window._currentFirebaseUser:null;
  const name=String(data.name||user?.displayName||(owner==='guest'?'Invitado':'Usuario de OMUSIC')).trim().slice(0,80)||'OMUSIC';
  const handle=String(data.handle||name.normalize('NFD').replace(/[\u0300-\u036f]/g,'')).replace(/[^a-z0-9_]/gi,'').slice(0,30)||'omusic';
  const handleKey=data.handleKey===omHandleKey(handle)?data.handleKey:'';
  return {ownerId:owner,name,handle,handleKey,bio:String(data.bio||'').slice(0,160),website:omSafeWebsite(data.website),photo:omSafeProfileImage(data.photo||user?.photoURL||(owner==='guest'?localStorage.getItem('userProfilePic'):''),200000),banner:omSafeProfileImage(data.banner),isPublic:data.isPublic===true,updatedAt:Number.isSafeInteger(data.updatedAt)?data.updatedAt:0};
}
function omProfileData(){return omCleanProfile(readOM('omusic_profile_'+userKeyOM(),{}));}
function omStoreProfile(profile){storeOM('omusic_profile_'+profile.ownerId,profile);if(profile.ownerId===userKeyOM())omSyncProfile();}
function omEnsurePlaylistId(playlist){
  if(!omSocialId(playlist.id))playlist.id=window.crypto?.randomUUID?.()||'p_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
  return playlist.id;
}
function omPublicPlaylistData(playlist,owner=userKeyOM()){
  const profile=omProfileData(),allowed=new Set([...songs,...videos].map(s=>s.url));
  return {ownerId:owner,name:String(playlist.name||'Mi playlist').slice(0,80),ownerName:profile.name,ownerHandle:profile.handle,cover:playlist.songs?.[0]?.cover||'',trackUrls:(playlist.songs||[]).map(s=>s.url).filter(url=>allowed.has(url)).slice(0,1000),updatedAt:Date.now()};
}
async function omSocialCloud(){
  await window._omAuthReady;
  if(!window._db||!window._doc||!window._getDocServer||!window._writeBatch)throw Object.assign(new Error('El servicio no está disponible.'),{code:'unavailable'});
}
function omSocialMessage(error){
  return String(error?.code||'').includes('permission-denied')?'La publicación todavía no está habilitada en Firebase. Tu playlist sigue privada.':error?.code==='auth-required'?'Inicia sesión con Google o GitHub para publicar.':'No se pudo guardar la publicación. Revisa tu conexión e inténtalo de nuevo.';
}
async function omSetPlaylistPublic(index,makePublic){
  const owner=window._currentFirebaseUser?.uid,playlist=playlists[index];
  if(!owner)throw Object.assign(new Error('Inicia sesión para publicar.'),{code:'auth-required'});
  if(!playlist)throw Error('Playlist no encontrada.');
  const id=omEnsurePlaylistId(playlist);
  OM_SOCIAL.publishing++;
  return omSocialQueue(async()=>{
    await omSocialCloud();
    if(userKeyOM()!==owner||!playlists.includes(playlist))throw Error('La sesión cambió.');
    const snapshot=playlists.map(p=>p===playlist?{...p,isPublic:!!makePublic}:p);
    const batch=window._writeBatch(window._db),ref=window._doc(window._db,'publicPlaylists',owner,'items',id);
    if(makePublic)batch.set(ref,omPublicPlaylistData(playlist,owner));else batch.delete(ref);
    batch.set(window._doc(window._db,'playlists',owner),{list:snapshot});
    await batch.commit();
    storeOM('playlists_'+owner,snapshot);
    if(userKeyOM()===owner){playlist.isPublic=!!makePublic;omRenderLibrary();}
    return playlist;
  }).finally(()=>{OM_SOCIAL.publishing--;});
}
async function omSyncPublishedPlaylists(){
  const owner=window._currentFirebaseUser?.uid;
  if(!owner||(!playlists.some(p=>p.isPublic)&&!OM_SOCIAL.publishing))return;
  return omSocialQueue(async()=>{
    if(userKeyOM()!==owner)return;
    await omSocialCloud();
    const batch=window._writeBatch(window._db);
    for(const p of playlists.filter(p=>p.isPublic))batch.set(window._doc(window._db,'publicPlaylists',owner,'items',omEnsurePlaylistId(p)),omPublicPlaylistData(p,owner));
    batch.set(window._doc(window._db,'playlists',owner),{list:playlists});await batch.commit();
  });
}
async function omTogglePlaylistVisibility(index){
  const button=$om('om-playlist-visibility'),status=$om('om-playlist-status');
  if(button)button.disabled=true;
  try{const next=!playlists[index]?.isPublic;await omSetPlaylistPublic(index,next);omCloseDialog();omOpenPlaylist(index,false);omToast(next?'Playlist publicada. Ya puedes compartir su enlace.':'La playlist ahora es privada. El enlace anterior deja de funcionar.');}
  catch(error){if(status)status.textContent=omSocialMessage(error);if(button)button.disabled=false;}
}
function omSocialLink(type,value){
  if(type==='profile'){
    if(window.OMProfileRoutes)return window.OMProfileRoutes.link(value);
    if(!omHandleValid(value))throw omProfileError('invalid-handle','Nombre de usuario inválido.');
    const url=new URL('.',window.OMAndroid?.publicBase||window.location.href);url.search='';url.hash='';url.username='';url.password='';url.pathname+='user/@'+value;return url.href;
  }
  const url=window.OMProfileRoutes?.base()||new URL(window.OMAndroid?.publicBase||window.location.href);url.search='';url.hash=new URLSearchParams({[type]:value}).toString();return url.href;
}
function omShareDialog(title,url){
  omShowDialog(`<h2 id="om-dialog-title">${esc(title)}</h2><p>Comparte este enlace para que puedan abrirlo en OMUSIC.</p><label for="om-share-url">Enlace</label><input id="om-share-url" value="${esc(url)}" readonly><button id="om-copy-share" class="om-button-green">${icon('share',18)} Copiar enlace</button><p id="om-share-status" class="om-form-note" role="status"></p>`);
  $om('om-share-url').onclick=()=>{$om('om-share-url').select();};
  $om('om-copy-share').onclick=async()=>{try{await navigator.clipboard.writeText(url);$om('om-share-status').textContent='Enlace copiado.';}catch{$om('om-share-url').select();$om('om-share-status').textContent='Selecciona el enlace y cópialo con Ctrl+C.';}};
}
function omSharePlaylist(index){
  const p=playlists[index];if(!p?.isPublic)return omToast('Haz pública la playlist desde sus opciones para compartirla.');
  omShareDialog('Compartir '+p.name,omSocialLink('playlist',userKeyOM()+'.'+omEnsurePlaylistId(p)));
}
async function omLoadOwnProfile(){
  const owner=userKeyOM(),epoch=OM_SOCIAL.epoch;
  if(owner==='guest')return omProfileData();
  if(OM_SOCIAL.profileOwner===owner&&OM_SOCIAL.profilePromise)return OM_SOCIAL.profilePromise;
  OM_SOCIAL.profileOwner=owner;
  OM_SOCIAL.profilePromise=(async()=>{
    try{await omSocialCloud();const snap=await window._getDocServer(window._doc(window._db,'userProfiles',owner));
      if(userKeyOM()===owner&&epoch===OM_SOCIAL.epoch&&snap.exists()){
        const remote=omCleanProfile(snap.data(),owner);if(remote.updatedAt>=omProfileData().updatedAt)omStoreProfile(remote);
      }
      if(userKeyOM()===owner&&epoch===OM_SOCIAL.epoch&&!omProfileData().handleKey){
        // Las cuentas antiguas reservan su usuario al volver a entrar; las colisiones reciben un sufijo.
        const before=omProfileData().handle;
        const profile=await omSocialQueue(()=>omWriteProfile(omProfileData(),owner,{automatic:true}));
        if(profile.handle!==before)omToast('Tu usuario único ahora es @'+profile.handle+'. Puedes cambiarlo en Editar perfil.');
      }
    }catch{}
    return userKeyOM()===owner?omProfileData():null;
  })();return OM_SOCIAL.profilePromise;
}
function omResetSocialSession(){if(OM_SOCIAL.editOwner&&OM_SOCIAL.editOwner!==userKeyOM())omCloseDialog();OM_SOCIAL.editOwner=null;OM_SOCIAL.epoch++;OM_SOCIAL.request++;OM_SOCIAL.profileOwner=null;OM_SOCIAL.profilePromise=null;OM_SOCIAL.shared=null;omLoadOwnProfile();}
function omProfilePlaylistCard(p,own=false,index=-1,owner=''){
  const action=own?`omOpenPlaylist(${index})`:`omOpenPublicPlaylist(${esc(JSON.stringify(owner))},${esc(JSON.stringify(p.id))})`;
  const cover=p.songs?.[0]?.cover||p.cover;
  return `<article class="om-media-card om-profile-playlist"><button class="om-card-main" onclick="${action}">${cover?img(cover,p.name):`<span class="om-playlist-large om-playlist-art">${icon('music',54)}</span>`}<strong>${esc(p.name)}</strong><span>${p.isPublic===false?'Privada':'Pública'} · ${p.songs?.length??p.trackUrls?.length??0} canciones</span></button></article>`;
}
function omRenderProfile(profile,list,own){
  const art=profile.banner||profile.photo,publics=list.filter(p=>own?p.isPublic===true:p.isPublic!==false),privates=own?list.filter(p=>p.isPublic!==true):[];
  const cards=(items)=>items.map(p=>omProfilePlaylistCard(p,own,playlists.indexOf(p),profile.ownerId)).join('');
  const banner=art?`<div class="om-profile-panels">${[0,1,2].map(()=>img(art,'')).join('')}</div>`:`<span class="om-profile-monogram" aria-hidden="true">${esc(profile.name[0])}</span>`;
  $om('om-detail').innerHTML=`<article class="om-profile-page"><section class="om-profile-hero">${banner}<div class="om-profile-shade"></div><button class="om-profile-back" onclick="OM.back.length?omBack():omShowHome()" aria-label="Volver">${icon('chevron',22)}</button><div class="om-profile-identity">${profile.photo?img(profile.photo,profile.name,'om-profile-picture'):''}<div><span class="om-eyebrow">${own?'TU PERFIL EN OMUSIC':'PERFIL PÚBLICO'}</span><h1>${esc(profile.name)}</h1><p class="om-profile-handle">@${esc(profile.handle)} <span>· ${publics.length} playlists públicas</span></p>${profile.bio?`<p class="om-profile-bio">${esc(profile.bio)}</p>`:''}${profile.website?`<a class="om-profile-website" href="${esc(profile.website)}" target="_blank" rel="noopener noreferrer">${esc(profile.website.replace(/^https?:\/\//,''))}</a>`:''}</div></div></section><div class="om-profile-content"><div class="om-profile-actions">${own?`<button onclick="omEditProfile()">${icon('edit',22)}<span>Editar perfil</span></button><button onclick="omShareProfile()">${icon('share',22)}<span>Compartir</span></button>`:''}</div><section class="om-profile-section"><div class="om-section-heading"><h2>Playlists públicas</h2>${own?'<button onclick="omOpenLibrary()">Ver tu biblioteca</button>':''}</div>${publics.length?`<div class="om-profile-grid">${cards(publics)}</div>`:`<div class="om-profile-empty">${icon('globe',30)}<h3>${own?'Tu música también se puede compartir.':'Todavía no hay playlists públicas.'}</h3><p>${own?'Abre las opciones de una playlist y elige “Hacer pública”.':''}</p>${own?'<button class="om-button-outline" onclick="omOpenLibrary()">Ir a mis playlists</button>':''}</div>`}</section>${privates.length?`<section class="om-profile-section"><div class="om-section-heading"><h2>Solo para ti</h2><span>Playlists privadas</span></div><div class="om-profile-grid">${cards(privates)}</div></section>`:''}</div></article>`;
  $om('songList').style.display='none';
}
async function omOpenProfile(owner=null,push=true){
  owner=owner||userKeyOM();const own=owner===userKeyOM(),request=++OM_SOCIAL.request;
  if(owner!=='guest'&&!omSocialId(owner))return;
  omCloseProfile();omDetailView('profile','Mi perfil','',push,owner);currentAlbumContext=null;
  if(own){
    omRenderProfile(omProfileData(),playlists.map(p=>{if(p.isPublic!==true)p.isPublic=false;return p;}),true);
    await omLoadOwnProfile();if(request===OM_SOCIAL.request&&OM.view==='profile'&&userKeyOM()===owner)omRenderProfile(omProfileData(),playlists,true);
  }else{
    try{await omSocialCloud();const [snap,collection]=await Promise.all([window._getDocServer(window._doc(window._db,'publicProfiles',owner)),window._getDocsServer(window._collection(window._db,'publicPlaylists',owner,'items'))]);
      if(request!==OM_SOCIAL.request||OM.view!=='profile')return;
      if(!snap.exists())throw Error('private');
      const profile=omCleanProfile(snap.data(),owner),list=collection.docs.map(doc=>({...doc.data(),id:doc.id,isPublic:true}));
      omRenderProfile(profile,list,false);
    }catch{if(request===OM_SOCIAL.request)omSocialUnavailable('Este perfil no está disponible. Puede ser privado o haberse dejado de compartir.');}
  }
}
function omSocialUnavailable(message){$om('om-detail').innerHTML=`<div class="om-empty"><h2>${esc(message)}</h2><button class="om-button-green" onclick="omShowHome()">Volver a Inicio</button></div>`;$om('songList').style.display='none';}
async function omSaveProfile(data,owner=userKeyOM()){
  if(owner!==userKeyOM())throw Error('La sesión cambió.');
  if(!omHandleValid(data.handle))throw omProfileError('invalid-handle','Nombre de usuario inválido.');
  if(owner==='guest'){
    const profile=omCleanProfile({...data,handleKey:'',updatedAt:Date.now()},owner);omStoreProfile(profile);return {profile,localOnly:true};
  }
  const profile=await omSocialQueue(()=>omWriteProfile(data,owner));return {profile,localOnly:false};
}
async function omWriteProfile(data,owner,{automatic=false,visibility}={}){
  await omSocialCloud();
  if(!window._runTransaction)throw omProfileError('unavailable','Conéctate a Internet para reservar tu nombre de usuario.');
  if(owner==='guest'||window._currentFirebaseUser?.uid!==owner||owner!==userKeyOM())throw Error('La sesión cambió.');
  for(let attempt=0;attempt<(automatic?20:1);attempt++){
    try{
      const profile=await window._runTransaction(window._db,async transaction=>{
        if(owner!==userKeyOM())throw Error('La sesión cambió.');
        const privateRef=window._doc(window._db,'userProfiles',owner),snap=await transaction.get(privateRef),previous=snap.exists()?snap.data():null;
        if(automatic&&previous?.handleKey===omHandleKey(previous?.handle))return omCleanProfile(previous,owner);
        const source=previous&&(visibility!==undefined||(automatic&&previous.updatedAt>data.updatedAt))?previous:data;
        const original=source.handle;
        if(!omHandleValid(original))throw omProfileError('invalid-handle','Nombre de usuario inválido.');
        const suffix=attempt===0?'':attempt<10?String(attempt+1):'_'+owner.replace(/[^A-Za-z0-9_]/g,'').slice(-8)+String(attempt-9);
        const handle=original.slice(0,30-suffix.length)+suffix,key=omHandleKey(handle),handleRef=window._doc(window._db,'userHandles',key);
        const reserved=await transaction.get(handleRef);
        if(reserved.exists()&&reserved.data().ownerId!==owner)throw omProfileError('handle-taken','Ese nombre de usuario ya está ocupado. Elige otro.');
        const previousKey=omHandleKey(previous?.handle);
        const oldRef=previousKey&&previousKey!==key?window._doc(window._db,'userHandles',previousKey):null;
        const oldReservation=oldRef?await transaction.get(oldRef):null;
        const next=omCleanProfile({...source,handle,handleKey:key,isPublic:visibility??previous?.isPublic??source.isPublic,updatedAt:Date.now()},owner);
        if(owner!==userKeyOM())throw Error('La sesión cambió.');
        // Todas las lecturas van antes de las escrituras; Firebase reintenta las colisiones simultáneas.
        transaction.set(handleRef,{ownerId:owner,handle});
        transaction.set(privateRef,next);
        const publicRef=window._doc(window._db,'publicProfiles',owner);
        if(next.isPublic)transaction.set(publicRef,next);else transaction.delete(publicRef);
        if(oldReservation?.exists()&&oldReservation.data().ownerId===owner)transaction.delete(oldRef);
        return next;
      });
      if(owner!==userKeyOM())throw Error('La sesión cambió.');
      omStoreProfile(profile);return profile;
    }catch(error){if(!automatic||error?.code!=='handle-taken'||attempt===19)throw error;}
  }
}
function omReadProfileImage(file,kind){
  return new Promise((resolve,reject)=>{
    if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type)||file.size>8*1024*1024)return reject(Error('Elige una imagen PNG, JPG, WebP o GIF de hasta 8 MB.'));
    const reader=new FileReader();reader.onerror=()=>reject(Error('No se pudo leer la imagen.'));
    reader.onload=()=>{const picture=new Image();picture.onerror=()=>reject(Error('No se pudo abrir la imagen.'));picture.onload=()=>{
      const max=kind==='banner'?1600:400,scale=Math.min(1,max/Math.max(picture.width,picture.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(picture.width*scale));canvas.height=Math.max(1,Math.round(picture.height*scale));canvas.getContext('2d').drawImage(picture,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL('image/webp',.8);if(data.length>(kind==='banner'?520000:200000))reject(Error('La imagen tiene demasiado detalle. Prueba con una más pequeña.'));else resolve(data);
    };picture.src=reader.result;};reader.readAsDataURL(file);
  });
}
async function omEditProfile(){
  const session=userKeyOM();await omLoadOwnProfile();if(session!==userKeyOM())return;
  const owner=userKeyOM(),draft={...omProfileData()};
  OM_SOCIAL.editOwner=owner;
  omShowDialog(`<h2 id="om-dialog-title">Hazlo muy tú.</h2><p>Tu foto, tu portada y un poco de ti.</p><form id="om-profile-form"><div class="om-profile-editor-art">${img(draft.banner||draft.photo,'Portada','om-edit-banner')}${img(draft.photo,'Foto de perfil','om-edit-photo')}</div><div class="om-profile-upload"><label>Subir foto<input id="om-edit-photo-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><label>Subir portada<input id="om-edit-banner-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label></div><label for="om-profile-name">Nombre</label><input id="om-profile-name" maxlength="80" required value="${esc(draft.name)}"><label for="om-profile-handle">Nombre de usuario</label><input id="om-profile-handle" minlength="1" maxlength="30" pattern="[A-Za-z0-9_]+" value="${esc(draft.handle)}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="om-handle-help om-handle-preview om-handle-status" required><p id="om-handle-help" class="om-form-note">De 1 a 30 letras, números o guiones bajos. Tu usuario es único, sin distinguir mayúsculas.</p><p id="om-handle-preview" class="om-form-note"></p><p id="om-handle-status" class="om-form-note" role="status" aria-live="polite"></p><label for="om-profile-bio">Descripción</label><textarea id="om-profile-bio" maxlength="160" rows="2" placeholder="Algo sobre ti y tu música">${esc(draft.bio)}</textarea><label for="om-profile-website">Enlace</label><input id="om-profile-website" maxlength="500" value="${esc(draft.website)}" placeholder="https://..."><p id="om-profile-status" class="om-form-note" role="status">${owner==='guest'?'Se guarda en este navegador. Inicia sesión para compartir tu perfil.':''}</p><button id="om-profile-save" class="om-button-green" type="submit">Guardar perfil</button></form>${draft.isPublic?'<button class="om-delete-button" id="om-profile-unpublish">Dejar de compartir mi perfil</button>':''}`);
  let uploads=0,handleTimer,handleRequest=0;const form=$om('om-profile-form');
  function previewHandle(){
    const handle=$om('om-profile-handle').value,ticket=++handleRequest,status=$om('om-handle-status');
    clearTimeout(handleTimer);
    $om('om-handle-preview').textContent=omHandleValid(handle)?'Tu enlace: '+omSocialLink('profile',handle):'';
    if(!omHandleValid(handle)){status.textContent=omProfileMessage({code:'invalid-handle'});return;}
    if(owner==='guest'){status.textContent='Inicia sesión para reservar este nombre de usuario.';return;}
    status.textContent='Comprobando disponibilidad…';
    handleTimer=setTimeout(async()=>{
      try{
        await omSocialCloud();const snap=await window._getDocServer(window._doc(window._db,'userHandles',omHandleKey(handle)));
        if(ticket!==handleRequest||$om('om-profile-form')!==form||owner!==userKeyOM())return;
        status.textContent=!snap.exists()?'Disponible. Se reservará al guardar.':snap.data().ownerId===owner?'Este nombre de usuario es tuyo.':'Ese nombre de usuario ya está ocupado. Elige otro.';
      }catch{if(ticket===handleRequest&&$om('om-profile-form')===form)status.textContent='No se pudo comprobar. Necesitas conexión para reservar tu usuario.';}
    },350);
  }
  $om('om-profile-handle').oninput=previewHandle;previewHandle();
  for(const kind of ['photo','banner'])$om('om-edit-'+kind+'-file').onchange=async event=>{
    if(!event.target.files[0])return;uploads++;$om('om-profile-save').disabled=true;
    try{draft[kind]=await omReadProfileImage(event.target.files[0],kind);if($om('om-profile-form')===form){$om('om-dialog-content').querySelector('.om-edit-'+kind).src=draft[kind];$om('om-profile-status').textContent='Imagen lista.';}}
    catch(error){if($om('om-profile-form')===form)$om('om-profile-status').textContent=error.message;}
    finally{uploads--;if($om('om-profile-form')===form)$om('om-profile-save').disabled=uploads>0;}
  };
  $om('om-profile-form').onsubmit=async event=>{
    event.preventDefault();const button=$om('om-profile-save');button.disabled=true;
    const raw=$om('om-profile-website').value.trim(),website=omSafeWebsite(raw);
    if(raw&&!website){$om('om-profile-status').textContent='Escribe un enlace http o https válido.';button.disabled=false;return;}
    try{const saved=await omSaveProfile({...draft,name:$om('om-profile-name').value,handle:$om('om-profile-handle').value,bio:$om('om-profile-bio').value,website},owner);if($om('om-profile-form')!==form)return;omCloseDialog();omOpenProfile();omToast(saved.localOnly?'Perfil guardado en este navegador.':'Perfil guardado.');omSyncPublishedPlaylists().catch(()=>{});}
    catch(error){if($om('om-profile-form')===form){$om('om-profile-status').textContent=omProfileMessage(error);button.disabled=false;}}
  };
  if(draft.isPublic)$om('om-profile-unpublish').onclick=()=>omChangeProfilePublic(false);
}
async function omChangeProfilePublic(makePublic){
  const owner=window._currentFirebaseUser?.uid;if(!owner){omCloseDialog();omOpenAuth();return;}
  try{
    await omLoadOwnProfile();if(owner!==userKeyOM())return;
    const profile=await omSocialQueue(()=>omWriteProfile(omProfileData(),owner,{visibility:!!makePublic}));
    omCloseDialog();if(makePublic)omShareDialog('Compartir tu perfil',omSocialLink('profile',profile.handle));else{omOpenProfile();omToast('Tu perfil dejó de compartirse.');}
  }catch(error){omToast(omProfileMessage(error));}
}
async function omShareProfile(){
  if(!window._currentFirebaseUser)return omShowDialog('<h2 id="om-dialog-title">Tu perfil, en todas partes.</h2><p>Inicia sesión para publicar tu perfil y compartir tus playlists.</p><button class="om-button-green" onclick="omCloseDialog();omOpenAuth()">Iniciar sesión</button>');
  const owner=userKeyOM();await omLoadOwnProfile();if(owner!==userKeyOM())return;
  if(omProfileData().isPublic){
    try{const profile=await omSocialQueue(()=>omWriteProfile(omProfileData(),owner,{automatic:true}));if(profile.isPublic)return omShareDialog('Compartir tu perfil',omSocialLink('profile',profile.handle));}
    catch(error){omToast(omProfileMessage(error));return;}
  }
  omShowDialog('<h2 id="om-dialog-title">Compartir tu perfil</h2><p>Tu nombre, foto, portada, descripción y enlace estarán visibles. Se mostrarán solo tus playlists públicas.</p><button class="om-button-green" onclick="omChangeProfilePublic(true)">Publicar perfil y obtener enlace</button>');
}
async function omOpenPublicPlaylist(owner,id,push=true){
  if(!omSocialId(owner)||!omSocialId(id))return;
  const request=++OM_SOCIAL.request;omDetailView('publicPlaylist','Cargando playlist…','',push,{owner,id});currentAlbumContext=null;
  try{await omSocialCloud();const snapshot=await window._getDocServer(window._doc(window._db,'publicPlaylists',owner,'items',id));
    if(request!==OM_SOCIAL.request||OM.view!=='publicPlaylist')return;
    if(!snapshot.exists())throw Error('private');
    const p=snapshot.data(),catalog=[...songs,...videos.map(v=>({...v,type:'video'}))],tracks=(Array.isArray(p.trackUrls)?p.trackUrls:[]).slice(0,1000).map(url=>catalog.find(s=>s.url===url)).filter(Boolean);
    OM_SOCIAL.shared={...p,id,ownerId:owner,songs:tracks};
    omCollectionHeader(String(p.name||'Playlist'),'Playlist pública',tracks[0]?.cover,tracks,{empty:!tracks.length,author:String(p.ownerName||'OMUSIC')});omRenderTracks(tracks,'Esta playlist todavía no tiene canciones.');
    document.querySelector('.om-collection-toolbar')?.insertAdjacentHTML('beforeend','<button class="om-button-outline" onclick="omClonePublicPlaylist()">Guardar una copia</button>');
  }catch{if(request===OM_SOCIAL.request)omSocialUnavailable('Esta playlist no está disponible. Puede ser privada o haberse eliminado.');}
}
async function omClonePublicPlaylist(){
  const p=OM_SOCIAL.shared;if(!p)return;
  playlists.push({id:omEnsurePlaylistId({}),name:p.name,songs:[...p.songs],isPublic:false});await savePlaylists();omOpenPlaylist(playlists.length-1);omToast('Copia privada guardada en tu biblioteca.');
}
function omOpenSharedRoute(){
  const params=new URLSearchParams((window.location?.hash||'').slice(1)),playlist=params.get('playlist'),profile=params.get('profile');
  if(playlist){const pieces=playlist.split('.');if(pieces.length===2&&pieces.every(omSocialId)){omOpenPublicPlaylist(pieces[0],pieces[1]);return true;}}
  if(profile&&omSocialId(profile)){omOpenProfile(profile);return true;}
  const handle=window.OMProfileRoutes?.parse();
  if(handle){omOpenProfileHandle(handle);return true;}
  return false;
}
async function omResolveProfileHandle(handle){
  const key=omHandleKey(handle);if(!key)return null;
  await omSocialCloud();
  const reservation=await window._getDocServer(window._doc(window._db,'userHandles',key));
  if(!reservation.exists())return null;
  const owner=reservation.data().ownerId;if(!omSocialId(owner))return null;
  const snap=await window._getDocServer(window._doc(window._db,'publicProfiles',owner));
  if(!snap.exists()||snap.data().isPublic!==true||snap.data().handleKey!==key)return null;
  return omCleanProfile(snap.data(),owner);
}
async function omOpenProfileHandle(handle,push=true){
  const request=++OM_SOCIAL.request;
  omCloseProfile();omDetailView('profile','Cargando perfil…','',push,null);currentAlbumContext=null;
  try{
    const profile=await omResolveProfileHandle(handle);
    if(request!==OM_SOCIAL.request||OM.view!=='profile')return;
    if(!profile)throw Error('missing');
    await omOpenProfile(profile.ownerId,false);
  }catch{if(request===OM_SOCIAL.request&&OM.view==='profile')omSocialUnavailable('Este perfil no está disponible. Puede ser privado o haber cambiado de usuario.');}
}
window.saveProfilePic=async input=>{try{const photo=await omReadProfileImage(input.files?.[0],'photo');await omSaveProfile({...omProfileData(),photo});omSyncProfile();if(OM.view==='profile')omOpenProfile(null,false);}catch(error){omToast(error.message);}};
window.addEventListener('hashchange',omOpenSharedRoute);
omLoadOwnProfile().then(()=>omSyncProfile());omSyncProfile();omOpenSharedRoute();
