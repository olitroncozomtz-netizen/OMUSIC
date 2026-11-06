/* Amigos e invitaciones reales, guardados por cuenta en Cloud Firestore. */
(() => {
  'use strict';
  const C=window.OMPartyCore;
  const S={owner:null,epoch:0,tab:'friends',relations:[],invites:[],profiles:new Map(),results:[],query:'',partyQuery:'',searching:false,loading:false,error:'',searchTicket:0,unsub:[],roomUnsub:null,presenceUnsub:null,id:null,room:null,presence:[],connected:false,offset:0,inviteIds:new Set(),busy:false,pendingRoom:null};
  const arg=v=>esc(JSON.stringify(v));
  const ref=(...parts)=>window._doc(window._db,...parts),collection=(...parts)=>window._collection(window._db,...parts);
  const now=()=>Date.now()+S.offset;
  const song=url=>songs.find(s=>s.url===url&&s.url);
  const profile=id=>id===S.owner?omProfileData():S.profiles.get(id)||{name:'Perfil de OMUSIC',handle:id.slice(0,10),photo:'',ownerId:id};
  const friendId=f=>f.members.find(id=>id!==S.owner);
  const relation=id=>S.relations.find(f=>f.members.includes(id));
  const accepted=()=>S.relations.filter(f=>f.status==='accepted');
  const unread=()=>S.relations.filter(f=>f.status==='pending'&&f.to===S.owner).length+S.invites.filter(i=>C.ms(i.expiresAt)>now()).length;
  const isHost=()=>!!S.room&&S.room.hostId===S.owner;
  function message(error){
    if(error?.code==='permission-denied')return 'Firebase necesita las reglas nuevas de Amigos y Party. Abre “Activar Amigos y Party” para ver los pasos.';
    if(error?.code==='unauthenticated')return 'Inicia sesión con Google o GitHub para usar Amigos y Party.';
    if(error?.code==='unavailable'||error?.code==='deadline-exceeded')return 'No hay conexión con Firebase. La reproducción de la party se reanudará al reconectar.';
    return error?.message||'No se pudo completar la acción. Inténtalo de nuevo.';
  }
  function fail(error){S.error=message(error);paint();omToast(S.error);}
  async function cloud(){
    await window._omAuthReady;
    if(!window._currentFirebaseUser?.uid)throw Object.assign(Error(),{code:'unauthenticated'});
    if(!window._db||!window._onSnapshot||!window._runTransaction)throw Object.assign(Error(),{code:'unavailable'});
    return window._currentFirebaseUser.uid;
  }
  function same(owner,epoch){return S.owner===owner&&S.epoch===epoch&&window._currentFirebaseUser?.uid===owner;}
  async function loadProfiles(ids){
    const epoch=S.epoch;
    await Promise.all([...new Set(ids)].filter(id=>C.uid(id)&&id!==S.owner&&!S.profiles.has(id)).map(async id=>{
      S.profiles.set(id,{name:'Perfil de OMUSIC',handle:id.slice(0,10),photo:'',ownerId:id});
      try{const snap=await window._getDocServer(ref('publicProfiles',id));if(epoch===S.epoch&&snap.exists())S.profiles.set(id,omCleanProfile(snap.data(),id));}catch{}
    }));
    if(epoch===S.epoch)paint();
  }
  function preserveFocus(fn){
    const active=document.activeElement,id=active?.id,start=active?.selectionStart,end=active?.selectionEnd;
    fn();if(id)requestAnimationFrame(()=>{const el=$om(id);if(el){el.focus();if(typeof start==='number'&&el.setSelectionRange)try{el.setSelectionRange(start,end);}catch{}}});
  }
  function heading(){return `<header class="om-friends-heading"><div><span class="om-eyebrow">TU GENTE, TU MÚSICA</span><h1>Suena mejor juntos<span>.</span></h1><p>Encuentra a tus amigos y comparte el mismo momento.</p></div><button class="om-button-green" onclick="${S.room?'omOpenParty()':'omCreatePartyDialog()'}">${icon(S.room?'music':'plus',18)} ${S.room?'Ver mi party':'Crear una party'}</button></header>`;}
  function tabs(){return `<nav class="om-friends-tabs" aria-label="Amigos"><button class="${S.tab==='friends'?'active':''}" onclick="omOpenFriends('friends')">Mis amigos <span>${accepted().length}</span></button><button class="${S.tab==='requests'?'active':''}" onclick="omOpenFriends('requests')">Solicitudes <span>${S.relations.filter(f=>f.status==='pending'&&f.to===S.owner).length}</span></button><button class="${S.tab==='invites'?'active':''}" onclick="omOpenFriends('invites')">Invitaciones ${S.invites.length?`<span>${S.invites.length}</span>`:''}</button></nav>`;}
  function avatar(p,cls=''){return p.photo?img(p.photo,p.name,'om-friend-avatar '+cls):`<span class="om-friend-avatar om-friend-letter ${cls}" aria-hidden="true">${esc((p.name||'O')[0])}</span>`;}
  function card(id,controls=''){
    const p=profile(id);return `<article class="om-friend-card"><button class="om-friend-profile" onclick="omOpenProfile(${arg(id)})" aria-label="Ver perfil de ${esc(p.name)}">${avatar(p)}<span><strong>${esc(p.name)}</strong><small>@${esc(p.handle)}</small></span></button><div class="om-friend-card-actions">${controls}</div></article>`;
  }
  const empty=(title,body,action='')=>`<div class="om-social-empty">${icon('friends',34)}<h3>${title}</h3><p>${body}</p>${action}</div>`;
  const small=(label,action,extra='')=>`<button class="om-friend-action" onclick="${action}" ${extra}>${label}</button>`;
  function statusButton(id){const f=relation(id);if(id===S.owner)return '<span class="om-friend-status">Tú</span>';if(f?.status==='accepted')return '<span class="om-friend-status">'+icon('check',15)+' Amigos</span>';if(f?.status==='pending')return f.to===S.owner?small('Aceptar',`omAcceptFriend(${arg(f.id)})`):'<span class="om-friend-status">Solicitud enviada</span>';return small('Agregar',`omAddFriend(${arg(id)})`);}
  function setupNotice(){return S.error?`<div class="om-social-notice" role="status">${icon('sparkle',20)}<span>${esc(S.error)}</span><button onclick="omFriendsSetup()">Activar Amigos y Party</button></div>`:'';}
  function guest(){return empty('Tu gente está a un inicio de sesión.','Inicia sesión con Google o GitHub para agregar amigos y escuchar juntos. El modo invitado sigue disponible para tu música.',`<button class="om-button-green" onclick="omOpenAuth()">Iniciar sesión</button>`);}
  function friendsContent(){
    if(!S.owner)return guest();
    const friends=accepted();
    const results=S.searching?'<p class="om-social-hint" role="status">Buscando perfiles…</p>':S.query?`<section><h2>Perfiles encontrados</h2>${S.results.length?`<div class="om-friend-grid">${S.results.map(id=>card(id,statusButton(id))).join('')}</div>`:empty('No encontramos ese perfil.','Busca su @usuario o pega un enlace de perfil público de OMUSIC.')}</section>`:'';
    return `<div class="om-friends-layout"><div><form id="om-friend-search-form" class="om-friend-search" onsubmit="event.preventDefault();omFindFriends()"><label for="om-friend-search">Agregar amigos</label><div>${icon('search',19)}<input id="om-friend-search" type="search" maxlength="500" value="${esc(S.query)}" placeholder="@usuario o enlace de perfil" oninput="OMFriends.query=this.value"><button type="submit">Buscar</button></div></form>${results}<section class="om-friends-list"><div class="om-social-section-title"><h2>Tu círculo</h2><span>${friends.length} ${friends.length===1?'amigo':'amigos'}</span></div>${S.loading?'<p class="om-social-hint">Cargando tus amigos…</p>':friends.length?`<div class="om-friend-grid">${friends.map(f=>{const id=friendId(f);return card(id,small('Invitar a party',`omInviteFriend(${arg(id)})`)+small('Quitar',`omRemoveFriendDialog(${arg(f.id)})`,'aria-label="Quitar amistad"'));}).join('')}</div>`:empty('Aquí empieza tu círculo.','Busca un perfil y envía una solicitud. Cuando la acepte, podrán invitarse a una party.')}</section></div><aside class="om-party-intro"><span class="om-party-orbit">${icon('music',38)}</span><span class="om-eyebrow">UNA CANCIÓN. EL MISMO MOMENTO.</span><h2>Lejos, pero en la misma canción.</h2><p>Una cola compartida. Hasta 12 personas. El anfitrión marca el ritmo y todos pueden sumar música.</p><button class="om-button-green" onclick="${S.room?'omOpenParty()':'omCreatePartyDialog()'}">${S.room?'Volver a mi party':'Empezar una party'} ${icon('arrow',17)}</button><small>Solo pueden entrar los amigos invitados.</small>${!omProfileData().isPublic?`<button class="om-social-text-link" onclick="omShareProfile()">Hacer visible mi perfil</button>`:''}</aside></div>`;
  }
  function requestsContent(){
    if(!S.owner)return guest();const pending=S.relations.filter(f=>f.status==='pending'),incoming=pending.filter(f=>f.to===S.owner),outgoing=pending.filter(f=>f.from===S.owner);
    return `<section><h2>Recibidas</h2>${incoming.length?`<div class="om-friend-grid">${incoming.map(f=>card(f.from,small('Aceptar',`omAcceptFriend(${arg(f.id)})`)+small('Rechazar',`omDeleteFriendship(${arg(f.id)})`))).join('')}</div>`:empty('No tienes solicitudes pendientes.','Cuando alguien te agregue, podrás aceptar su solicitud aquí.')}</section>${outgoing.length?`<section><h2>Enviadas</h2><div class="om-friend-grid">${outgoing.map(f=>card(f.to,small('Cancelar solicitud',`omDeleteFriendship(${arg(f.id)})`))).join('')}</div></section>`:''}`;
  }
  function invitesContent(){
    if(!S.owner)return guest();const invites=S.invites.filter(i=>C.ms(i.expiresAt)>now());
    return `<section><h2>Te están esperando</h2>${invites.length?`<div class="om-party-invitations">${invites.map(i=>`<article class="om-party-invitation">${avatar(profile(i.from))}<div><span class="om-eyebrow">INVITACIÓN A PARTY</span><h3>${esc(i.name)}</h3><p>${esc(profile(i.from).name)} quiere escuchar contigo.</p></div><button class="om-button-green" onclick="omJoinParty(${arg(i.partyId)})">Unirme</button>${small('Ahora no',`omDismissPartyInvite(${arg(i.partyId)})`)}</article>`).join('')}</div>`:empty('Tu próxima escucha juntos está por llegar.','Las invitaciones de tus amigos aparecerán aquí. También puedes crear tu propia party.')}</section>`;
  }
  function renderFriends(){preserveFocus(()=>{$om('om-detail').innerHTML=`<article class="om-friends-page">${heading()}${setupNotice()}${tabs()}${S.tab==='requests'?requestsContent():S.tab==='invites'?invitesContent():friendsContent()}<footer class="om-social-footer">${icon('lock',13)} Tu lista de amigos y tus parties no son públicas. <button onclick="omFriendsSetup()">Ayuda para conectar</button></footer></article>`;});}
  function open(tab='friends',push=true){S.tab=['friends','requests','invites'].includes(tab)?tab:'friends';omCloseProfile();search.value='';omDetailView('friends','Amigos','',push,S.tab);OM.activeList=[];$om('songList').style.display='none';renderFriends();markNav();}
  function partyQueue(){
    const r=S.room;return r.queue.length?r.queue.map((url,index)=>{const track=song(url);return `<div class="om-party-track ${index===r.index?'is-current':''}"><span class="om-party-track-number">${index===r.index?icon('music',18):index+1}</span>${img(track?.cover,track?.title||'Canción no disponible')}<span><strong>${esc(track?.title||'Canción fuera de este catálogo')}</strong><small>${esc(track?.artist||'Actualiza el catálogo para escucharla.')}</small></span>${isHost()?small(index===r.index?'Sonando':'Reproducir',`omPartyCommand('jump',{index:${index}})`,track?'':'disabled'):''}</div>`;}).join(''):empty('La primera canción la pones tú.','Busca una canción y añádela a la cola compartida.');
  }
  function renderParty(){
    const r=S.room;if(!r){$om('om-detail').innerHTML=`<article class="om-friends-page">${heading()}${setupNotice()}${empty('Escuchemos juntos.','Crea una party o abre una invitación de tus amigos.',`<button class="om-button-green" onclick="omOpenFriends('invites')">Ver invitaciones</button>`)}</article>`;return;}
    const track=song(r.trackUrl),host=profile(r.hostId),ready=window.OMPartyPlayer?.ready;
    preserveFocus(()=>{$om('om-detail').innerHTML=`<article class="om-party-page"><header class="om-party-heading"><div><span class="om-live-pill"><i></i> OMUSIC PARTY</span><h1>${esc(r.name)}</h1><p>Con ${esc(host.name)} ${isHost()?'· Tú eres el anfitrión':'· Anfitrión'} · ${r.memberIds.length}/${C.MAX_MEMBERS} personas</p></div><button class="om-button-outline" onclick="omPartyInviteDialog()">${icon('friends',18)} Invitar</button></header>${setupNotice()}<div class="om-party-layout"><section class="om-party-stage"><div class="om-party-art">${track?img(track.cover,track.title):`<div class="om-party-empty-art">${icon('music',80)}</div>`}<span class="om-party-art-badge">${icon('friends',14)} Escuchando juntos</span></div><span class="om-eyebrow">${r.playing?'AHORA SUENA':'EN PAUSA'}</span><h2>${esc(track?.title||'Todo listo para empezar.')}</h2><p>${esc(track?.artist||'Añade una canción a la cola de tu party.')}</p><div class="om-party-play-actions">${!ready?`<button class="om-button-green" onclick="omPartyEnableAudio()">${icon('volume',18)} Activar audio</button>`:''}${isHost()?`<button class="om-button-outline" onclick="omPartyCommand('${r.playing?'pause':'play'}')" ${track?'':'disabled'}>${icon(r.playing?'pause':'play',19)} ${r.playing?'Pausar para todos':'Reproducir para todos'}</button><button class="om-button-outline" onclick="omPartyCommand('next')" ${r.index+1<r.queue.length?'':'disabled'} aria-label="Siguiente en la party">${icon('next',19)}</button>`:'<span class="om-party-host-note">El anfitrión controla la reproducción.</span>'}</div><p id="om-party-status" class="om-party-sync-status" role="status"></p><button class="om-social-text-link" onclick="omLeavePartyDialog()">${isHost()?'Terminar party':'Salir de la party'}</button><section class="om-party-people"><h3>En esta party</h3><div>${r.memberIds.map(id=>{const p=profile(id),presence=S.presence.find(x=>x.uid===id),live=presence&&now()-C.ms(presence.seenAt)<65000;return `<div>${avatar(p)}<span><strong>${esc(p.name)}${id===S.owner?' · Tú':''}</strong><small>${id===r.hostId?'Anfitrión':live?(presence.ready?'Audio activado':'Preparándose'):'Sin conexión reciente'}</small></span></div>`;}).join('')}</div></section></section><section class="om-party-queue"><div class="om-social-section-title"><h2>La cola de todos</h2><span>${r.queue.length}/${C.MAX_QUEUE}</span></div><div class="om-party-queue-items">${partyQueue()}</div><form class="om-party-search" onsubmit="event.preventDefault();omSearchPartySongs()"><label for="om-party-song-search">Sumar una canción</label><div><input id="om-party-song-search" type="search" maxlength="100" placeholder="Canción o artista…" value="${esc(S.partyQuery)}" oninput="OMFriends.partyQuery=this.value;omSearchPartySongs()"><button type="submit" aria-label="Buscar canciones para la party">${icon('search',18)}</button></div></form><div id="om-party-song-results"></div><p class="om-social-hint">Cada persona reproduce el archivo en su dispositivo. Usa audífonos si están en la misma habitación. El crossfade y la repetición local no cambian la cola compartida.</p></section></div></article>`;searchPartySongs();});updateStatus();
  }
  function openParty(push=true){omCloseProfile();search.value='';omDetailView('party','Party','',push,S.id);OM.activeList=[];$om('songList').style.display='none';renderParty();markNav();}
  function paint(){if(OM.view==='friends')renderFriends();else if(OM.view==='party')renderParty();badge();banner();}
  function markNav(){document.querySelectorAll('[data-primary]').forEach(b=>b.classList.toggle('active',b.dataset.primary===(['friends','party'].includes(OM.view)?'friends':b.dataset.primary==='home'&&OM.view==='home'?'home':'__none')));}
  function badge(){document.querySelectorAll('[data-friends-badge]').forEach(el=>{el.textContent=unread()||'';el.hidden=!unread();});}
  function updateStatus(){const el=$om('om-party-status');if(el)el.textContent=window.OMPartyPlayer?.status()||(!S.connected?'Conectando con la party…':'Activa el audio para empezar.');banner();}
  function banner(){
    const node=$om('om-party-banner');if(!node)return;node.hidden=!S.room;
    if(S.room)node.innerHTML=`<button onclick="omOpenParty()">${icon('friends',19)}<span><strong>${esc(S.room.name)}</strong><small>${esc(window.OMPartyPlayer?.status()||'Party conectada')}</small></span><span class="om-party-count">${S.room.memberIds.length} ${icon('music',14)}</span></button>${!window.OMPartyPlayer?.ready?'<button class="om-party-activate" onclick="omPartyEnableAudio()">Activar audio</button>':''}`;
  }
  function emit(){window.dispatchEvent(new CustomEvent('omusic-party-state'));paint();}
  async function find(){
    const query=S.query.trim(),ticket=++S.searchTicket,epoch=S.epoch;if(!query){S.results=[];paint();return;}
    S.searching=true;paint();
    try{
      await cloud();let id='';try{const u=new URL(query,location.href);id=new URLSearchParams(u.hash.slice(1)).get('profile')||'';}catch{}
      const linkedHandle=/(?:^|\/)user\/(?:@|%40)/i.test(query)?window.OMProfileRoutes?.parse(query):null;
      let docs;if(linkedHandle){const p=await omResolveProfileHandle(linkedHandle);docs=p?[{id:p.ownerId,data:()=>p}]:[];}
      else if(id&&C.uid(id)){const snap=await window._getDocServer(ref('publicProfiles',id));docs=snap.exists()?[{id,data:()=>snap.data()}]:[];}
      else{const handle=omHandleKey(query.replace(/^@/,''));if(!handle)throw Error('Escribe un @usuario de OMUSIC o pega su enlace de perfil.');const snap=await window._getDocsServer(window._query(collection('publicProfiles'),window._orderBy('handleKey'),window._startAt(handle),window._endAt(handle+'\uf8ff'),window._limit(12)));docs=snap.docs;}
      if(epoch!==S.epoch||ticket!==S.searchTicket)return;S.results=docs.map(d=>{S.profiles.set(d.id,omCleanProfile(d.data(),d.id));return d.id;});S.error='';
    }catch(error){if(epoch===S.epoch&&ticket===S.searchTicket)S.error=message(error);}finally{if(epoch===S.epoch&&ticket===S.searchTicket){S.searching=false;paint();}}
  }
  async function add(id){
    try{const owner=await cloud(),epoch=S.epoch;if(!C.uid(id)||id===owner)return;if(!omProfileData().isPublic){omShowDialog(`<h2 id="om-dialog-title">Que puedan encontrarte.</h2><p>Para enviar solicitudes, publica primero tu perfil de OMUSIC. Esto muestra tu nombre de perfil y tus playlists públicas; tu correo sigue privado.</p><button class="om-button-green" onclick="omCloseDialog();omShareProfile()">Revisar mi perfil público</button>`);return;}
      if(relation(id))return;const stamp=window._serverTimestamp();await window._setDoc(ref('friendships',C.pair(owner,id)),{from:owner,to:id,members:[owner,id],status:'pending',createdAt:stamp,updatedAt:stamp});if(same(owner,epoch))omToast('Solicitud enviada.');
    }catch(error){fail(error);}
  }
  async function accept(id){try{await cloud();const f=S.relations.find(f=>f.id===id);if(!f||f.to!==S.owner||f.status!=='pending')return;await window._updateDoc(ref('friendships',id),{status:'accepted',updatedAt:window._serverTimestamp()});omToast('Ya son amigos.');}catch(error){fail(error);}}
  async function deleteFriendship(id){try{await cloud();if(!S.relations.some(f=>f.id===id))return;await window._deleteDoc(ref('friendships',id));omCloseDialog();}catch(error){fail(error);}}
  function removeDialog(id){const f=S.relations.find(f=>f.id===id);if(!f)return;omShowDialog(`<h2 id="om-dialog-title">¿Quitar a ${esc(profile(friendId(f)).name)} de tus amigos?</h2><p>Podrán volver a enviarse una solicitud.</p><button class="om-button-outline" onclick="omCloseDialog()">Cancelar</button>${small('Quitar amistad',`omDeleteFriendship(${arg(id)})`)}`);}
  function setup(){omShowDialog(`<h2 id="om-dialog-title">Activar Amigos y Party</h2><div class="om-settings-info"><p>Inicia sesión con Google o GitHub. Para que varias cuentas compartan amigos e invitaciones, publica las reglas de Firestore incluidas en esta versión.</p><ol><li>Abre tu proyecto <strong>omusic4-0</strong> en Firebase.</li><li>En <strong>Firestore Database → Reglas</strong>, integra el archivo nuevo y pulsa <strong>Publicar</strong>.</li><li>Autoriza el dominio donde uses OMUSIC en Authentication y vuelve a abrir Amigos.</li></ol><a href="firestore.rules" download="firestore.rules">Descargar reglas actualizadas</a><p>El sitio de este chat conserva su acceso privado. Tus amigos necesitan acceso al sitio o usar tu página de GitHub Pages. Cada persona debe activar su propio audio.</p><button class="om-button-green" onclick="omCloseDialog();omRetryFriends()">Volver a conectar</button></div>`);}
  async function calibrate(owner,epoch){
    const start=Date.now();await window._setDoc(ref('partyClocks',owner),{at:window._serverTimestamp()});const snap=await window._getDocServer(ref('partyClocks',owner)),end=Date.now();
    if(!same(owner,epoch))throw Error('La sesión cambió.');const server=C.ms(snap.data()?.at);if(!server)throw Error('No se pudo sincronizar el reloj.');S.offset=server-(start+end)/2;
  }
  function randomId(){const bytes=new Uint8Array(6);window.crypto.getRandomValues(bytes);return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();}
  function createDialog(){
    if(!S.owner){omOpenAuth();return;}if(S.room){openParty();return;}
    const current=currentSong&&song(currentSong.url)&&window.OMSettings.allowed(currentSong);
    omShowDialog(`<h2 id="om-dialog-title">Dale play a un momento juntos.</h2><p>Tú eliges qué suena. Tus amigos pueden sumar canciones a la cola.</p><form id="om-create-party-form"><label for="om-new-party-name">Nombre de la party</label><input id="om-new-party-name" maxlength="60" required value="${esc('Party de '+omProfileData().name)}">${current?`<label class="om-public-choice"><input id="om-party-use-current" type="checkbox" checked> Empezar con ${esc(currentSong.title)}</label>`:''}<p id="om-party-create-status" class="om-form-note" role="status"></p><button id="om-create-party-submit" class="om-button-green">Crear party</button></form>`);
    $om('om-create-party-form').onsubmit=async event=>{event.preventDefault();const name=$om('om-new-party-name').value,useCurrent=$om('om-party-use-current')?.checked,button=$om('om-create-party-submit');button.disabled=true;
      try{await createRoom(name,useCurrent?currentSong?.url:'');omCloseDialog();openParty();if(S.pendingInvite){const id=S.pendingInvite;S.pendingInvite=null;await invite(id);}}catch(error){if($om('om-party-create-status'))$om('om-party-create-status').textContent=message(error);button.disabled=false;}};
  }
  async function createRoom(name,trackUrl=''){
    const owner=await cloud(),epoch=S.epoch;if(S.id)throw Error('Ya estás en una party.');await calibrate(owner,epoch);const id=randomId();
    const room={...C.create(owner,String(name),now(),song(trackUrl)?trackUrl:''),updatedAt:window._serverTimestamp(),heartbeatAt:window._serverTimestamp(),expiresAt:window._Timestamp.fromMillis(now()+23*60*60*1000)};
    await window._setDoc(ref('parties',id),room);if(!same(owner,epoch))return;attachRoom(id);return id;
  }
  function detachRoom(notice='',clearSaved=true){
    S.roomUnsub?.();S.presenceUnsub?.();S.roomUnsub=null;S.presenceUnsub=null;S.id=null;S.room=null;S.presence=[];S.connected=false;
    if(S.owner&&clearSaved)try{localStorage.removeItem('omusic_party_'+S.owner);}catch{}emit();if(notice)omToast(notice);
  }
  function attachRoom(id){
    S.roomUnsub?.();S.presenceUnsub?.();S.presenceUnsub=null;S.id=id;S.room=null;S.connected=false;const epoch=S.epoch,owner=S.owner;
    S.roomUnsub=window._onSnapshot(ref('parties',id),{includeMetadataChanges:true},snap=>{
      if(!same(owner,epoch)||S.id!==id)return;if(snap.metadata.hasPendingWrites)return;
      if(snap.metadata.fromCache){S.connected=false;emit();return;}
      if(!snap.exists())return detachRoom('Esta party ya no existe.');const room=snap.data();
      if(!C.valid(room)||!room.memberIds.includes(owner))return detachRoom('Ya no formas parte de esta party.');
      if(room.status==='ended'||C.ms(room.expiresAt)<=now())return detachRoom('La party terminó. Gracias por escuchar juntos.');
      S.room=room;S.connected=true;try{localStorage.setItem('omusic_party_'+owner,id);}catch{}
      if(!S.presenceUnsub)S.presenceUnsub=window._onSnapshot(collection('parties',id,'presence'),snapshot=>{if(same(owner,epoch)&&S.id===id){S.presence=snapshot.docs.map(d=>d.data());paint();}},()=>{});
      loadProfiles(room.memberIds);emit();
    },error=>{if(same(owner,epoch)&&S.id===id){detachRoom();fail(error);}});
  }
  async function join(id){
    if(!C.roomId(id))return;try{const owner=await cloud(),epoch=S.epoch;if(S.id===id){openParty();return;}
      if(S.id){omShowDialog(`<h2 id="om-dialog-title">Ya estás en una party.</h2><p>Sal de la party actual antes de unirte a otra.</p><button class="om-button-green" onclick="omCloseDialog();omOpenParty()">Ver mi party</button>`);return;}
      await calibrate(owner,epoch);await C.retryTransaction(report=>window._runTransaction(window._db,async tx=>{const roomRef=ref('parties',id),snap=await tx.get(roomRef);if(!same(owner,epoch))throw Error('La sesión cambió.');if(!snap.exists())throw Error('Esta invitación ya no está disponible.');const r=snap.data();report(r);if(!C.valid(r)||r.status!=='active'||C.ms(r.expiresAt)<=now())throw Error('La party ya terminó.');if(r.memberIds.includes(owner))return;if(r.memberIds.length>=C.MAX_MEMBERS)throw Error('La party ya tiene 12 personas.');tx.update(roomRef,{memberIds:[...r.memberIds,owner],updatedAt:window._serverTimestamp()});}),async()=>{if(!same(owner,epoch))throw Error('La sesión cambió.');const snap=await window._getDocServer(ref('parties',id));if(!snap.exists())throw Error('La party ya terminó.');return snap.data();});
      if(!same(owner,epoch))return;attachRoom(id);openParty();omToast('Te uniste a la party. Activa tu audio para escuchar.');
    }catch(error){fail(error);}
  }
  async function command(action,options={}){
    const owner=await cloud(),epoch=S.epoch,id=S.id;if(!id||!S.connected)throw Error('Espera a conectar con la party.');
    return C.retryTransaction(report=>window._runTransaction(window._db,async tx=>{const roomRef=ref('parties',id),snap=await tx.get(roomRef);if(!same(owner,epoch)||S.id!==id)throw Error('La sesión cambió.');if(!snap.exists())throw Error('La party terminó.');const r=snap.data();report(r);if(!r.memberIds.includes(owner))throw Error('Ya no estás en esta party.');if(action!=='enqueue'&&r.hostId!==owner)throw Error('Solo el anfitrión controla la reproducción.');if(options.songUrl&&!song(options.songUrl))throw Error('Esa canción no está en el catálogo.');const next=C.transition(r,action,{...options,now:now()});
      const data={...next,updatedAt:window._serverTimestamp()};if(r.hostId===owner)data.heartbeatAt=window._serverTimestamp();tx.set(roomRef,data);return next;}),async()=>{if(!same(owner,epoch)||S.id!==id)throw Error('La sesión cambió.');const snap=await window._getDocServer(ref('parties',id)),r=snap.data();if(!r?.memberIds.includes(owner)||r.status!=='active'||(action!=='enqueue'&&r.hostId!==owner))throw Error('Ya no puedes modificar esta party.');return r;});
  }
  async function safeCommand(action,options={}){if(S.busy)return;S.busy=true;try{await command(action,options);}catch(error){fail(error);}finally{S.busy=false;}}
  async function enqueue(item){if(!item||!song(item.url))return omToast('Las parties usan canciones de audio del catálogo.');if(!window.OMSettings.allowed(item))return omToast(window.OMSettings.reason(item));try{await command('enqueue',{songUrl:item.url});omToast('Añadida a la cola de todos.');}catch(error){fail(error);}}
  async function invite(id){
    if(!S.owner)return omOpenAuth();if(!S.room){S.pendingInvite=id;return createDialog();}if(!isHost())return omToast('Solo el anfitrión puede invitar a sus amigos.');
    try{await cloud();if(!accepted().some(f=>f.members.includes(id)))throw Error('Primero deben ser amigos.');if(S.room.memberIds.includes(id))return omToast('Ya está en la party.');await window._setDoc(ref('partyInvites',id,'items',S.id),{from:S.owner,to:id,partyId:S.id,name:S.room.name,createdAt:window._serverTimestamp(),expiresAt:S.room.expiresAt});S.inviteIds.add(id);paint();omToast('Invitación enviada en OMUSIC.');}catch(error){fail(error);}
  }
  function inviteDialog(){
    if(!S.room)return createDialog();const url=omSocialLink('party',S.id);
    omShowDialog(`<h2 id="om-dialog-title">La música ya está. Falta tu gente.</h2><div class="om-settings-info"><p>${isHost()?'Invita a tus amigos. El enlace solo permite entrar a las cuentas que hayas invitado.':'Solo el anfitrión puede enviar invitaciones.'}</p>${isHost()?accepted().map(f=>{const id=friendId(f);return `<div class="om-party-invite-row">${avatar(profile(id))}<strong>${esc(profile(id).name)}</strong>${small(S.inviteIds.has(id)?'Invitado':'Invitar',`omInviteFriend(${arg(id)})`)}</div>`;}).join('')||'<p>Agrega amigos desde el apartado Amigos.</p>':''}<label for="om-party-share-url">Enlace de la party</label><input id="om-party-share-url" readonly value="${esc(url)}"><button class="om-button-green" onclick="omCopyPartyLink()">Copiar enlace</button><p class="om-form-note">El enlace no hace público el sitio ni abre la party a otras personas.</p></div>`);
  }
  async function copyLink(){if(!S.id)return;try{await navigator.clipboard.writeText(omSocialLink('party',S.id));omToast('Enlace copiado.');}catch{$om('om-party-share-url')?.select();omToast('Selecciona el enlace y cópialo.');}}
  async function dismiss(id){try{await cloud();await window._deleteDoc(ref('partyInvites',S.owner,'items',id));}catch(error){fail(error);}}
  function leaveDialog(){if(!S.room)return;omShowDialog(`<h2 id="om-dialog-title">${isHost()?'¿Terminar la party para todos?':'¿Salir de la party?'}</h2><p>${isHost()?'La reproducción compartida se detendrá para todos los participantes.':'Tu dispositivo dejará de seguir la música del anfitrión.'}</p><button class="om-button-outline" onclick="omCloseDialog()">Seguir escuchando</button><button class="om-button-green" onclick="omLeaveParty()">${isHost()?'Terminar party':'Salir de la party'}</button>`);}
  async function leave(){
    const id=S.id,owner=S.owner,epoch=S.epoch;if(!id)return;
    try{if(isHost())await command('end');else await window._runTransaction(window._db,async tx=>{const rr=ref('parties',id),snap=await tx.get(rr);if(!same(owner,epoch)||S.id!==id)throw Error('La sesión cambió.');if(snap.exists()&&snap.data().memberIds.includes(owner))tx.update(rr,{memberIds:snap.data().memberIds.filter(x=>x!==owner),updatedAt:window._serverTimestamp()});});
      window._deleteDoc(ref('parties',id,'presence',owner)).catch(()=>{});if(!isHost())window._deleteDoc(ref('partyInvites',owner,'items',id)).catch(()=>{});
      if(same(owner,epoch)){detachRoom();omCloseDialog();open();}
    }catch(error){fail(error);}
  }
  function searchPartySongs(){const el=$om('om-party-song-results');if(!el)return;const query=normal(S.partyQuery.trim());el.innerHTML=query?songs.filter(s=>s.url&&normal(s.title+' '+s.artist).includes(query)).slice(0,8).map(s=>`<div class="om-party-track">${img(s.cover,s.title)}<span><strong>${esc(s.title)}</strong><small>${esc(s.artist)}</small></span><button onclick="omPartyAddSong(${songs.indexOf(s)})" aria-label="Añadir ${esc(s.title)} a la party">${icon('plus',19)}</button></div>`).join('')||'<p class="om-social-hint">Sin resultados.</p>':'';}
  async function presence(ready){if(!S.room||!S.owner||!S.connected)return;try{await window._setDoc(ref('parties',S.id,'presence',S.owner),{uid:S.owner,ready:!!ready,seenAt:window._serverTimestamp()});}catch{}}
  function parsePartyLink(){let id;try{id=new URLSearchParams(location.hash.slice(1)).get('party');}catch{}if(!C.roomId(id))return false;S.pendingRoom=id;if(!window._currentFirebaseUser?.uid){open('invites',false);omToast('Inicia sesión con la cuenta invitada para entrar a la party.');return true;}if(S.owner===window._currentFirebaseUser.uid)join(id);return true;}
  async function reset(){
    S.epoch++;S.unsub.forEach(fn=>fn());S.unsub=[];detachRoom('',false);S.owner=window._currentFirebaseUser?.uid||null;S.relations=[];S.invites=[];S.profiles.clear();S.results=[];S.query='';S.error='';S.inviteIds.clear();S.offset=0;S.loading=!!S.owner;paint();if(!S.owner){parsePartyLink();return;}
    const owner=S.owner,epoch=S.epoch;
    try{await cloud();if(!same(owner,epoch))return;
      S.unsub.push(window._onSnapshot(window._query(collection('friendships'),window._where('members','array-contains',owner)),{includeMetadataChanges:true},snapshot=>{if(!same(owner,epoch)||snapshot.metadata.hasPendingWrites)return;S.loading=false;S.relations=snapshot.docs.map(d=>({...d.data(),id:d.id}));loadProfiles(S.relations.flatMap(f=>f.members));paint();},error=>{if(same(owner,epoch)){S.loading=false;S.error=message(error);paint();}}));
      S.unsub.push(window._onSnapshot(collection('partyInvites',owner,'items'),snapshot=>{if(!same(owner,epoch)||snapshot.metadata.hasPendingWrites)return;S.invites=snapshot.docs.map(d=>({...d.data(),id:d.id})).filter(i=>C.ms(i.expiresAt)>now());loadProfiles(S.invites.map(i=>i.from));paint();},error=>{if(same(owner,epoch)){S.error=message(error);paint();}}));
      if(!parsePartyLink()){let id;try{id=localStorage.getItem('omusic_party_'+owner);}catch{}if(C.roomId(id)){const snap=await window._getDocServer(ref('parties',id));if(same(owner,epoch)&&snap.exists()&&snap.data().memberIds.includes(owner)&&snap.data().status==='active'&&C.ms(snap.data().expiresAt)>Date.now()){await calibrate(owner,epoch);attachRoom(id);}}}
    }catch(error){if(same(owner,epoch)){S.loading=false;S.error=message(error);paint();}}
  }
  Object.assign(window,{OMFriends:S,OMParty:{get active(){return !!S.room;},get room(){return S.room;},get id(){return S.id;},get connected(){return S.connected;},get owner(){return S.owner;},get isHost(){return isHost();},now,command,enqueue,presence,updateStatus},omOpenFriends:open,omFindFriends:find,omAddFriend:add,omAcceptFriend:accept,omDeleteFriendship:deleteFriendship,omRemoveFriendDialog:removeDialog,omFriendsSetup:setup,omRetryFriends:reset,omCreatePartyDialog:createDialog,omCreateParty:createRoom,omOpenParty:openParty,omJoinParty:join,omPartyCommand:safeCommand,omInviteFriend:invite,omPartyInviteDialog:inviteDialog,omCopyPartyLink:copyLink,omDismissPartyInvite:dismiss,omLeavePartyDialog:leaveDialog,omLeaveParty:leave,omSearchPartySongs:searchPartySongs,omPartyAddSong:index=>enqueue(songs[index])});
  document.querySelector('.om-primary-nav').insertAdjacentHTML('beforeend',`<button data-primary="friends" onclick="omOpenFriends()">${icon('friends',21)} Amigos <span class="om-friends-badge" data-friends-badge hidden></span></button>`);
  $om('mobile-tab-bar').insertAdjacentHTML('beforeend',`<button class="mob-tab" id="tab-amigos" onclick="omOpenFriends()">${icon('friends',23)}<span>Amigos <b data-friends-badge hidden></b></span></button>`);
  document.querySelector('.om-filterbar').insertAdjacentHTML('afterend','<aside id="om-party-banner" hidden aria-label="Party actual"></aside>');
  const profileMenu=window.omToggleProfile;window.omToggleProfile=function(){profileMenu.apply(this,arguments);const menu=$om('om-profile-menu');if(!menu.hidden)menu.querySelector('button').insertAdjacentHTML('afterend',`<button onclick="omCloseProfile();omOpenFriends()">${icon('friends',16)} Amigos ${unread()?`<span>${unread()}</span>`:''}</button>`);};
  const renderProfile=window.omRenderProfile;window.omRenderProfile=function(p,list,own){renderProfile.apply(this,arguments);if(!own&&C.uid(p.ownerId)){S.profiles.set(p.ownerId,p);document.querySelector('.om-profile-actions')?.insertAdjacentHTML('beforeend',`<div class="om-profile-friend-action">${statusButton(p.ownerId)}${relation(p.ownerId)?.status==='accepted'?small('Invitar a party',`omInviteFriend(${arg(p.ownerId)})`):''}</div>`);}};
  const sharedRoute=window.omOpenSharedRoute;window.omOpenSharedRoute=function(){return parsePartyLink()||sharedRoute.apply(this,arguments);};
  const navState=window.omNavState;window.omNavState=function(){navState.apply(this,arguments);if(['friends','party'].includes(OM.view)){document.querySelectorAll('[data-primary]').forEach(b=>b.classList.toggle('active',b.dataset.primary==='friends'));document.querySelectorAll('.mob-tab').forEach(b=>b.classList.toggle('active',b.id==='tab-amigos'));}};
  window.addEventListener('omusic-auth-state',reset);window.addEventListener('hashchange',parsePartyLink);
  setInterval(()=>{updateStatus();if(S.room)presence(window.OMPartyPlayer?.ready);},20000);
  reset();
})();
