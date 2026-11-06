/* Preferencias de OMUSIC, separadas por cuenta y utilizables también como invitado. */
(() => {
  'use strict';
  const defaults={normalize:false,crossfade:false,crossfadeSeconds:5,autoplay:true,explicit:true,ai:true,history:true,notifications:false,language:'es',blockedTracks:[],blockedArtists:[]};
  const state={prefs:{...defaults},owner:'',tab:'account',blockQuery:'',menuItem:null};
  const text=(es,en)=>state.prefs.language==='en'?(en||es):es;
  const all=()=>[...songs,...videos.map(v=>({...v,type:'video'}))];
  const key=()=> 'omusic_settings_'+userKeyOM();
  const artistNames=s=>String(s?.artist||'').split(',').map(s=>s.trim()).filter(Boolean);
  function load(){
    const raw=readOM(key(),{});state.owner=userKeyOM();state.prefs={...defaults};
    for(const name of ['normalize','crossfade','autoplay','explicit','ai','history','notifications'])if(typeof raw?.[name]==='boolean')state.prefs[name]=raw[name];
    state.prefs.crossfadeSeconds=Math.min(12,Math.max(1,Number(raw?.crossfadeSeconds)||5));
    state.prefs.language=raw?.language==='en'?'en':'es';
    for(const name of ['blockedTracks','blockedArtists'])state.prefs[name]=Array.isArray(raw?.[name])?[...new Set(raw[name].filter(v=>typeof v==='string'&&v.length<=2000))]:[];
    document.documentElement.lang=state.prefs.language;translateNavigation();
    return state.prefs;
  }
  function save(){storeOM(key(),state.prefs);}
  function isVideo(s){return s?.type==='video'||videos.some(v=>v.url&&v.url===s?.url);}
  function reason(s){
    if(!s?.url)return text('Archivo no disponible','File unavailable');
    if(state.prefs.blockedTracks.includes(s.url))return text('Canción bloqueada','Blocked track');
    if(artistNames(s).some(name=>state.prefs.blockedArtists.some(blocked=>omArtistMatches({artist:name},blocked))))return text('Artista bloqueado','Blocked artist');
    if(!isVideo(s)&&!state.prefs.explicit&&(s.explicit===true||s.isExplicit===true||s.contentRating==='explicit'))return text('Contenido explícito desactivado','Explicit content disabled');
    if(!isVideo(s)&&!state.prefs.ai&&(s.aiGenerated===true||s.isAI===true||s.generatedByAI===true))return text('Contenido generado por IA desactivado','AI-generated content disabled');
    return '';
  }
  const allowed=s=>!reason(s);
  function markTracks(){
    document.querySelectorAll('.om-track-row').forEach(row=>{
      const song=OM.activeList.find(s=>s.url===row.dataset.url),why=song?reason(song):'';
      row.classList.toggle('om-content-unavailable',!!why);row.title=why;
      row.querySelectorAll('.om-track-number,.om-track-title,.om-track-cover').forEach(button=>button.setAttribute('aria-disabled',String(!!why)));
    });
  }
  function set(name,value){
    if(!Object.hasOwn(defaults,name)||['blockedTracks','blockedArtists'].includes(name))return;
    if(name==='crossfadeSeconds')value=Math.min(12,Math.max(1,Number(value)||5));
    else if(name==='language')value=value==='en'?'en':'es';
    else value=value===true;
    const focused=document.activeElement?.dataset?.setting;
    state.prefs[name]=value;save();document.documentElement.lang=state.prefs.language;
    markTracks();
    if(currentSong&&!allowed(currentSong))audio.pause();
    window.dispatchEvent(new CustomEvent('omusic-settings-change',{detail:{name,value}}));
    if(OM.view==='settings')open(state.tab,false);
    if(name==='history'&&$om('om-dialog-title')?.textContent===text('Preferencias de privacidad','Privacy preferences'))privacy();
    if(focused)requestAnimationFrame(()=>document.querySelector(`[data-setting="${focused}"]`)?.focus());
    translateNavigation();
  }
  function block(type,value,blocked=true){
    if(!['track','artist'].includes(type)||typeof value!=='string'||!value)return;
    const name=type==='track'?'blockedTracks':'blockedArtists',values=new Set(state.prefs[name]);
    blocked?values.add(value):values.delete(value);state.prefs[name]=[...values];save();markTracks();
    if(currentSong&&!allowed(currentSong))audio.pause();
    window.dispatchEvent(new CustomEvent('omusic-settings-change',{detail:{name}}));
    if(OM.view==='settings'&&state.tab==='blocked')open('blocked',false);
    omToast(blocked?text('Contenido bloqueado.','Content blocked.'):text('Contenido desbloqueado.','Content unblocked.'));
  }
  const external='<span aria-hidden="true">↗</span>';
  const chevron='<span aria-hidden="true">›</span>';
  const button=(label,action,extra='')=>`<button class="om-setting-button" onclick="${action}" ${extra}>${label}</button>`;
  const link=(label,description,action,arrow=chevron)=>`<button class="om-setting-row om-setting-link" onclick="${action}"><span><strong>${label}</strong>${description?`<small>${description}</small>`:''}</span>${arrow}</button>`;
  const row=(label,description,control='')=>`<div class="om-setting-row"><span><strong>${label}</strong>${description?`<small>${description}</small>`:''}</span>${control}</div>`;
  const toggle=(name,label,description)=>row(label,description,`<button type="button" class="om-setting-switch" data-setting="${name}" role="switch" aria-checked="${state.prefs[name]}" aria-label="${label}" onclick="omSetSetting('${name}',${!state.prefs[name]})"><span></span></button>`);
  const card=content=>`<div class="om-settings-card">${content}</div>`;
  const section=(title,content)=>`<section class="om-settings-section"><h2>${title}</h2>${content}</section>`;
  function account(){
    const profile=omProfileData(),user=window._currentFirebaseUser;
    return `<div class="om-settings-identity">${profile.photo?img(profile.photo,profile.name):`<span class="om-settings-avatar">${esc(profile.name[0])}</span>`}<strong>${esc(profile.name)}</strong>${button(text('Editar perfil','Edit profile'),'omEditProfile()')}</div>`+
    section(text('Información personal','Personal information'),card(row(text('Nombre','Name'),esc(profile.name),button(text('Gestionar','Manage'),'omEditProfile()'))+row(text('Correo electrónico','Email'),esc(user?.email||text('Modo invitado · Sin correo vinculado','Guest mode · No linked email')))))+
    section(text('Cuenta','Account'),card(row(text('Suscripción actual','Current subscription'),'OMUSIC · '+text('Sin plan de pago','No paid plan'),button(text('Gestionar','Manage'),"omShowSettingsInfo('subscription')"))+row(text('Nombre de usuario','Username'),'@'+esc(profile.handle)))+card(link(text('Ajustes de notificaciones','Notification settings'),'',"omNotificationSettings()",external)+link(text('Cambiar contraseña','Change password'),'',"omShowSettingsInfo('password')",external)))+
    (!user?`<p class="om-settings-note">${text('Estás en modo invitado. Inicia sesión para guardar tus perfiles y playlists en tu cuenta.','You are in guest mode. Sign in to save profiles and playlists to your account.')}</p>${button(text('Iniciar sesión','Sign in'),'omOpenAuth()')}`:'');
  }
  function playback(){
    return section(text('Reproducción','Playback'),card(toggle('normalize',text('Normalizar el volumen','Normalize volume'),text('Reduce las diferencias de volumen y controla los picos de las canciones.','Reduce volume differences and control peaks between tracks.'))+toggle('crossfade','Crossfade',text('Ajusta la duración de la transición y la superposición entre canciones.','Adjust the transition and overlap between songs.'))+`<div class="om-setting-crossfade ${state.prefs.crossfade?'':'is-off'}"><label for="om-crossfade-seconds">${text('Duración','Duration')} <output id="om-crossfade-output">${state.prefs.crossfadeSeconds} s</output></label><input id="om-crossfade-seconds" data-setting="crossfadeSeconds" type="range" min="1" max="12" step="1" value="${state.prefs.crossfadeSeconds}" aria-label="${text('Duración del crossfade','Crossfade duration')}" ${state.prefs.crossfade?'':'disabled'} oninput="document.getElementById('om-crossfade-output').textContent=this.value+' s'" onchange="omSetSetting('crossfadeSeconds',Number(this.value))"></div>`)+
    card(toggle('autoplay',text('Reproducción automática','Autoplay'),text('Seguir reproduciendo contenido similar cuando termine la lista abierta.','Keep playing similar music when the current list ends.'))+toggle('explicit',text('Permitir la reproducción de contenido explícito','Allow explicit content'),text('Se aplica a las canciones etiquetadas como explícitas en el catálogo. No incluye videos. Las canciones restringidas aparecen en gris.','Applies to songs marked explicit in the catalog. Videos are excluded. Restricted tracks appear dimmed.'))+toggle('ai',text('Permitir contenido generado por IA','Allow AI-generated content'),text('Se aplica a las canciones etiquetadas como generadas por IA en el catálogo. Las canciones restringidas aparecen en gris.','Applies to songs marked as AI-generated in the catalog. Restricted tracks appear dimmed.')))+
    card(link(text('Bloqueado','Blocked content'),text('Ver y editar tus canciones y artistas bloqueados.','View and edit your blocked songs and artists.'),"omOpenSettings('blocked')")))+`<p class="om-settings-note">${text('Los filtros dependen de las etiquetas del catálogo; OMUSIC no clasifica automáticamente las letras ni el origen de una canción.','Filters use catalog labels; OMUSIC does not automatically classify lyrics or how a song was made.')}</p>`;
  }
  function preferences(){
    return section(text('Preferencias','Preferences'),card(row(text('Idioma','Language'),text('Idioma de los ajustes y la navegación.','Language for settings and navigation.'),`<select data-setting="language" aria-label="${text('Idioma','Language')}" onchange="omSetSetting('language',this.value)"><option value="es" ${state.prefs.language==='es'?'selected':''}>Spanish — Español</option><option value="en" ${state.prefs.language==='en'?'selected':''}>English — Inglés</option></select>`)+link(text('Apariencia','Appearance'),text('Colores, tema y fuente de la aplicación.','App colors, theme and font.'),"omOpenSettings('appearance')"))+
    (window.OMAndroid?card(link(text('Sitio web para compartir','Sharing website'),text('Dirección de tu OMUSIC publicado, para compartir e iniciar sesión.','Your published OMUSIC address for sharing and sign-in.'),'OMAndroid.configureWebsite()')):'')+
    card(link(text('Preferencias de privacidad','Privacy preferences'),'',"omPrivacyDialog()",icon('more',18))+link(text('Términos y condiciones','Terms and conditions'),'',"omShowSettingsInfo('terms')",external)+link(text('Aviso de privacidad','Privacy notice'),'',"omShowSettingsInfo('privacy')",external)+link(text('Declaración de accesibilidad','Accessibility statement'),'',"omShowSettingsInfo('accessibility')",external)));
  }
  function blocked(){
    const tracks=all().filter(s=>state.prefs.blockedTracks.includes(s.url));
    const content=tracks.map(s=>row(esc(s.title),esc(s.artist),button(text('Desbloquear','Unblock'),`omSetBlocked('track',${esc(JSON.stringify(s.url))},false)`))).join('')+state.prefs.blockedArtists.map(name=>row(esc(omArtistRecord(name).name),text('Artista','Artist'),button(text('Desbloquear','Unblock'),`omSetBlocked('artist',${esc(JSON.stringify(name))},false)`))).join('');
    return section(text('Contenido bloqueado','Blocked content'),card(content||`<p class="om-setting-empty">${text('No tienes canciones ni artistas bloqueados.','You have no blocked songs or artists.')}</p>`)+`<div class="om-settings-block-search"><label for="om-block-search">${text('Buscar contenido para bloquear','Find content to block')}</label><input id="om-block-search" type="search" placeholder="${text('Canción o artista…','Song or artist…')}" value="${esc(state.blockQuery)}" oninput="omRenderBlockedResults(this.value)"></div><div id="om-block-results"></div>`);
  }
  function open(tab='account',push=true){
    state.tab=['account','playback','preferences','appearance','blocked'].includes(tab)?tab:'account';
    document.body.dataset.settingsTab=state.tab;
    omCloseProfile();search.value='';currentAlbumContext=null;
    omDetailView('settings',text('Configuración','Settings'),'',push,state.tab);
    $om('om-detail').innerHTML=`<article class="om-settings ${state.tab==='appearance'?'om-settings-appearance':''}"><header class="om-settings-heading"><span class="om-eyebrow">OMUSIC</span><h1>${state.tab==='appearance'?text('Apariencia','Appearance'):text('Configuración','Settings')}</h1><p>${state.tab==='appearance'?text('Tu música también tiene su color.','Your music has its own color.'):text('Tu cuenta y tu música, a tu manera.','Your account and your music, your way.')}</p></header><nav class="om-settings-tabs" aria-label="${text('Secciones de configuración','Settings sections')}">${[['account',text('Cuenta','Account')],['playback',text('Reproducción','Playback')],['preferences',text('Preferencias','Preferences')],['appearance',text('Apariencia','Appearance')]].map(([id,label])=>`<button class="${state.tab===id||state.tab==='blocked'&&id==='playback'?'active':''}" aria-current="${state.tab===id?'page':'false'}" onclick="omOpenSettings('${id}')">${label}</button>`).join('')}</nav>${state.tab==='account'?account():state.tab==='playback'?playback():state.tab==='preferences'?preferences():state.tab==='appearance'?(window.OMAppearance?.markup()||''):blocked()}</article>`;
    $om('songList').style.display='none';if(state.tab==='blocked')renderBlockedResults(state.blockQuery);
  }
  function renderBlockedResults(query=''){
    state.blockQuery=query;const node=$om('om-block-results');if(!node)return;const q=normal(query.trim());
    if(!q){node.innerHTML='';return;}
    const artists=[...new Set(songs.flatMap(artistNames))].filter(name=>normal(name).includes(q)).slice(0,5);
    const matches=songs.filter(s=>s.url&&normal(s.title+' '+s.artist).includes(q)).slice(0,10);
    node.innerHTML=card(artists.map(name=>row(esc(name),text('Artista','Artist'),button(state.prefs.blockedArtists.includes(name)?text('Desbloquear','Unblock'):text('Bloquear','Block'),`omSetBlocked('artist',${esc(JSON.stringify(name))},${!state.prefs.blockedArtists.includes(name)})`))).join('')+matches.map(s=>row(esc(s.title),esc(s.artist),button(state.prefs.blockedTracks.includes(s.url)?text('Desbloquear','Unblock'):text('Bloquear','Block'),`omSetBlocked('track',${esc(JSON.stringify(s.url))},${!state.prefs.blockedTracks.includes(s.url)})`))).join('')||`<p class="om-setting-empty">${text('Sin resultados.','No results.')}</p>`);
  }
  function dialog(title,content){omCloseProfile();omShowDialog(`<h2 id="om-dialog-title">${title}</h2><div class="om-settings-info">${content}</div>`);}
  function info(type){
    const user=window._currentFirebaseUser;
    const docs={
      subscription:[text('Gestionar suscripción','Manage subscription'),`<p>${text('Tu acceso actual es OMUSIC. Esta versión no tiene planes de pago ni cobros configurados.','Your current access is OMUSIC. This version has no paid plans or billing configured.')}</p><p>${text('Puedes editar tu perfil y gestionar tus playlists desde tu cuenta.','You can edit your profile and manage playlists from your account.')}</p>${button(text('Ver mi perfil','View profile'),'omCloseDialog();omOpenProfile()')}`],
      password:[text('Cambiar contraseña','Change password'),user?`<p>${text('El inicio de sesión se gestiona con tu proveedor. OMUSIC no guarda una contraseña propia para las cuentas de Google o GitHub.','Sign-in is managed by your provider. OMUSIC does not store a separate password for Google or GitHub accounts.')}</p>${(user.providerData||[]).some(p=>p.providerId==='github.com')?'<a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/updating-your-github-access-credentials" target="_blank" rel="noopener noreferrer">'+text('Cambiar contraseña en GitHub','Change your GitHub password')+' ↗</a>':'<a href="https://support.google.com/accounts/answer/41078" target="_blank" rel="noopener noreferrer">'+text('Cambiar contraseña de Google','Change your Google password')+' ↗</a>'}`:`<p>${text('En modo invitado no hay una contraseña. Inicia sesión con Google o GitHub para vincular una cuenta.','Guest mode has no password. Sign in with Google or GitHub to link an account.')}</p>${button(text('Iniciar sesión','Sign in'),'omCloseDialog();omOpenAuth()')}`],
      terms:[text('Términos y condiciones','Terms and conditions'),`<p>${text('OMUSIC reproduce el catálogo y los enlaces de medios que se han añadido a la página. La disponibilidad de canciones, videos, letras y portadas depende de sus servicios de origen.','OMUSIC plays the catalog and media links added to the page. Availability of songs, videos, lyrics, and artwork depends on their source services.')}</p><p>${text('Las playlists son privadas hasta que su propietario decide publicarlas. Compartir una playlist muestra su nombre y las canciones incluidas. Puedes retirar su publicación desde sus opciones.','Playlists are private until their owner publishes them. Sharing shows the playlist name and included tracks. You can unpublish it from its options.')}</p><p>${text('Esta información describe el funcionamiento actual de OMUSIC; no hay una suscripción comercial configurada.','This information describes how OMUSIC currently works; no commercial subscription is configured.')}</p>`],
      privacy:[text('Aviso de privacidad','Privacy notice'),`<p>${text('Firebase gestiona el acceso con Google o GitHub y guarda los perfiles y playlists vinculados a una cuenta. El correo no se incluye en los perfiles o playlists públicos.','Firebase manages Google or GitHub sign-in and stores account profiles and playlists. Email addresses are not included in public profiles or playlists.')}</p><p>${text('Las preferencias, favoritos, artistas seguidos y actividad se guardan en este navegador. Puedes dejar de registrar actividad y borrar tu historial desde Preferencias de privacidad.','Preferences, favorites, followed artists, and activity are stored in this browser. You can stop recording activity and clear history in Privacy preferences.')}</p><p>${text('Reproducir archivos externos conecta con los servicios que los alojan. Si utilizas el micrófono de LYRIOS, tu navegador administra su permiso y procesamiento de voz.','Playing external files connects to their hosting services. If you use the LYRIOS microphone, your browser manages its permission and speech processing.')}</p>${button(text('Preferencias de privacidad','Privacy preferences'),'omPrivacyDialog()')}`],
      accessibility:[text('Declaración de accesibilidad','Accessibility statement'),`<p>${text('Puedes recorrer los controles con Tab y activar botones con Enter o la barra espaciadora. Los controles principales tienen etiquetas para lectores de pantalla.','You can navigate controls with Tab and activate buttons with Enter or Space. Main controls have screen reader labels.')}</p><p>${text('OMUSIC ofrece modo claro y oscuro. Los interruptores de esta pantalla informan su estado y los ajustes funcionan con el teclado.','OMUSIC offers light and dark modes. Settings switches expose their state and support keyboard controls.')}</p><p>${text('Si encuentras un control difícil de usar, anota la pantalla y el problema para comunicarlo al responsable de tu OMUSIC.','If you find a control difficult to use, note the screen and issue and share them with your OMUSIC administrator.')}</p>`],
      help:[text('Ayuda','Help'),`<p><strong>${text('Empezar a escuchar','Start listening')}</strong><br>${text('Busca una canción y pulsa reproducir. La portada abre el reproductor ampliado dentro de la pestaña.','Find a song and press play. The artwork opens the expanded player inside the tab.')}</p><p><strong>${text('Cuenta y biblioteca','Account and library')}</strong><br>${text('Google y GitHub permiten vincular perfiles y playlists. El modo invitado funciona con datos locales.','Google and GitHub link profiles and playlists. Guest mode uses local data.')}</p><p><strong>${text('Si un archivo no suena','If a file will not play')}</strong><br>${text('Comprueba tu conexión y prueba otra canción. Un archivo retirado de su servicio de origen necesita un enlace nuevo.','Check your connection and try another song. A file removed from its source service needs a new link.')}</p>`],
      legal:[text('Aviso legal','Legal information'),`${link(text('Términos y condiciones','Terms and conditions'),'',"omShowSettingsInfo('terms')",external)}${link(text('Aviso de privacidad','Privacy notice'),'',"omShowSettingsInfo('privacy')",external)}${link(text('Declaración de accesibilidad','Accessibility statement'),'',"omShowSettingsInfo('accessibility')",external)}`]
    };
    const item=docs[type]||docs.help;dialog(item[0],item[1]);
  }
  function privacy(){
    dialog(text('Preferencias de privacidad','Privacy preferences'),toggle('history',text('Recordar mi actividad','Remember my activity'),text('Guardar escuchas recientes para personalizar tu inicio en este navegador.','Save recent listens to personalize your home page in this browser.'))+`<p>${text('Desactivar esta opción detiene los nuevos registros. Puedes borrar la actividad guardada sin borrar tus favoritos ni playlists.','Turning this off stops new activity records. You can clear saved activity without deleting favorites or playlists.')}</p>${button(text('Borrar historial de escuchas','Clear listening history'),'omConfirmClearHistory()')}${button(text('Gestionar mi perfil público','Manage my public profile'),'omCloseDialog();omShareProfile()')}`);
  }
  function clearHistory(){
    dialog(text('¿Borrar tu historial?','Clear your listening history?'),`<p>${text('Se borrarán las escuchas recientes y sus contadores de esta cuenta en este navegador. Tus playlists y favoritos se conservan.','This removes recent listens and counts for this account in this browser. Playlists and favorites are kept.')}</p>${button(text('Cancelar','Cancel'),'omCloseDialog()')}${button(text('Borrar historial','Clear history'),'omClearListeningHistory()')}`);
  }
  function doClearHistory(){OM.recent=[];OM.listens={};storeOM('omusic_recent_'+userKeyOM(),[]);storeOM('omusic_listens_'+userKeyOM(),{});omUpdateQuickGrid();omCloseDialog();omToast(text('Historial borrado.','History cleared.'));}
  function notifications(){
    const supported='Notification'in window,permission=supported?Notification.permission:'unsupported';
    dialog(text('Ajustes de notificaciones','Notification settings'),`<p>${text('Avisos de cambio de canción cuando OMUSIC siga abierto y su pestaña esté en segundo plano. No son notificaciones por correo.','Track-change alerts while OMUSIC is open in a background tab. These are not email notifications.')}</p>${row(text('Notificaciones de reproducción','Playback notifications'),supported?text('Permiso del navegador: ','Browser permission: ')+esc(permission):text('Este navegador no admite notificaciones.','This browser does not support notifications.'),button(state.prefs.notifications?text('Desactivar','Disable'):text('Activar','Enable'),'omRequestNotifications()',supported?'':'disabled'))}`);
  }
  async function requestNotifications(){
    if(state.prefs.notifications){set('notifications',false);return notifications();}
    if(!('Notification'in window))return;
    try{const permission=await Notification.requestPermission();set('notifications',permission==='granted');if(permission!=='granted')omToast(text('El navegador no concedió permiso.','The browser did not grant permission.'));notifications();}catch{omToast(text('No se pudieron activar las notificaciones.','Notifications could not be enabled.'));}
  }
  function menu(){
    const node=$om('om-profile-menu'),opening=node.hidden;omCloseProfile();if(!opening)return;
    const profile=omProfileData(),user=window._currentFirebaseUser;
    node.innerHTML=`<div><strong>${esc(profile.name)}</strong><small>${user?esc(user.email||text('Sesión iniciada','Signed in')):text('Modo local · Sin iniciar sesión.','Local mode · Not signed in.')}</small></div><button onclick="omCloseProfile();omOpenProfile()">${text('Perfil','Profile')}</button><button onclick="omOpenSettings('account')">${text('Gestionar suscripción','Manage subscription')}</button><button onclick="omOpenSettings()">${icon('settings',16)} ${text('Configuración','Settings')}</button><button onclick="omShowSettingsInfo('help')">${text('Ayuda','Help')} ${chevron}</button><button onclick="omShowSettingsInfo('legal')">${text('Aviso legal','Legal information')} ${chevron}</button>${!user?`<button onclick="omOpenAuth()">${text('Iniciar sesión / Modo offline','Sign in / Offline mode')}</button>`:''}<button class="om-settings-signout" onclick="omLogout()">${text('Cerrar sesión','Sign out')}</button>`;
    node.hidden=false;document.querySelector('.om-avatar')?.setAttribute('aria-expanded','true');
  }
  // Traducir solo los controles de navegación, conservando títulos, artistas y datos del catálogo.
  const dictionary={'Música':'Music','Explorar':'Browse','Biblioteca':'Library','Tu colección':'Your collection','Crear playlist':'Create playlist','Álbumes':'Albums','Artistas':'Artists','Para ti':'For you','Videos':'Videos','Inicio':'Home','Buscar':'Search','Tu biblioteca':'Your library','Conoce a LYRIOS':'Meet LYRIOS','Buscar canciones, artistas, álbumes o videos':'Search songs, artists, albums or videos','¿Qué quieres reproducir?':'What do you want to play?','Volver':'Back','Avanzar':'Forward','Activar modo claro':'Switch to light mode','Activar modo oscuro':'Switch to dark mode','Borrar búsqueda':'Clear search','Explorar tu música':'Browse your music'};
  const originals=new WeakMap(),attributes=new WeakMap();let translating=false;
  function translateNavigation(){
    if(typeof document.createTreeWalker!=='function')return;
    translating=true;
    for(const node of document.querySelectorAll('.om-global-header,.om-primary-nav,.om-library-heading,.om-library-chips,.om-filterbar,#mobile-tab-bar')){
      if(node.id==='om-profile-menu')continue;
      const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let leaf;
      while((leaf=walker.nextNode())){
        if(leaf.parentElement?.closest('#om-profile-menu,.om-avatar'))continue;
        let source=originals.get(leaf)||leaf.nodeValue.trim();if(dictionary[source]){originals.set(leaf,source);const value=state.prefs.language==='en'?dictionary[source]:source;if(leaf.nodeValue.trim()!==value)leaf.nodeValue=leaf.nodeValue.replace(leaf.nodeValue.trim(),value);}
      }
      for(const element of node.querySelectorAll('[aria-label],[title],[placeholder]')){
        let values=attributes.get(element)||{};
        for(const name of ['aria-label','title','placeholder']){const current=element.getAttribute(name);if(dictionary[current])values[name]=current;const source=values[name];if(source){const value=state.prefs.language==='en'?dictionary[source]:source;if(current!==value)element.setAttribute(name,value);}}
        attributes.set(element,values);
      }
    }
    translating=false;
  }
  Object.assign(window,{OMSettings:{get prefs(){return state.prefs;},get owner(){return state.owner;},load,set,allowed,reason,block,all,text,markTracks},omOpenSettings:open,omSetSetting:set,omSetBlocked:block,omRenderBlockedResults:renderBlockedResults,omShowSettingsInfo:info,omPrivacyDialog:privacy,omConfirmClearHistory:clearHistory,omClearListeningHistory:doClearHistory,omNotificationSettings:notifications,omRequestNotifications:requestNotifications,omToggleProfile:menu});
  const renderTracks=window.omRenderTracks;window.omRenderTracks=function(){const result=renderTracks.apply(this,arguments);markTracks();return result;};
  const record=window.omRecordListen;window.omRecordListen=function(){if(state.prefs.history)return record.apply(this,arguments);};
  audio.removeEventListener('playing',record);audio.addEventListener('playing',window.omRecordListen);
  const oldOptions=window.openOptions;window.openOptions=function(item){oldOptions.apply(this,arguments);state.menuItem=item;$om('optionsModal').querySelectorAll('[data-content-block]').forEach(button=>button.remove());if(!item?.url)return;$om('optionsModal').insertAdjacentHTML('beforeend',`<button data-content-block="track" onclick="omBlockCurrentOption()">${text('Bloquear canción','Block track')}</button><button data-content-block="artist" onclick="omBlockArtistOption()">${text('Bloquear artista…','Block artist…')}</button>`);};
  window.omBlockCurrentOption=()=>{if(state.menuItem){$om('optionsModal').style.display='none';block('track',state.menuItem.url);}};
  window.omBlockArtistOption=()=>{if(!state.menuItem)return;$om('optionsModal').style.display='none';dialog(text('Bloquear artista','Block artist'),artistNames(state.menuItem).map(name=>button(esc(name),`omSetBlocked('artist',${esc(JSON.stringify(name))});omCloseDialog()`)).join(''));};
  let lastNotification='';audio.addEventListener('playing',()=>{if(!state.prefs.notifications||!document.hidden||!('Notification'in window)||Notification.permission!=='granted'||lastNotification===currentSong?.url)return;lastNotification=currentSong.url;try{new Notification(currentSong.title,{body:currentSong.artist,icon:currentSong.cover,tag:'omusic-now-playing'});}catch{}});
  window.addEventListener('omusic-auth-state',()=>{load();markTracks();if(currentSong&&!allowed(currentSong))audio.pause();window.dispatchEvent(new CustomEvent('omusic-settings-change',{detail:{name:'session'}}));});
  if(typeof MutationObserver!=='undefined'){
    let pending=false;new MutationObserver(()=>{if(translating||pending)return;pending=true;requestAnimationFrame(()=>{pending=false;translateNavigation();});}).observe(document.body,{subtree:true,childList:true,characterData:true});
  }
  load();
})();
