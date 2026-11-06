/* Video de PC y transiciones: conserva el reproductor y el audio compartidos. */
(() => {
  'use strict';
  const desktop=()=>matchMedia('(min-width:769px)').matches&&!matchMedia('(max-height:500px) and (pointer:coarse)').matches;
  const modal=$om('videoModal'),video=$om('videoPlayer'),player=$om('mainPlayer');
  const state={expanded:false,panel:'cover',playerHome:null,focus:null,inert:[],overlays:[],ticket:0};
  const before={open:window.openVideo,restore:window.restoreVideo,minimize:window.minimizeVideo,close:window.closeVideo,load:window.loadSong};
  const videoHome=document.createComment('om-desktop-video-home');video.before(videoHome);
  const top=document.createElement('header');top.className='om-dv-top';
  top.innerHTML=`<nav aria-label="Vistas del video"><button data-dv-panel="similar" onclick="omDesktopVideoPanel('similar')">Videos similares</button><button data-dv-panel="credits" onclick="omDesktopVideoPanel('credits')">Créditos</button></nav><button onclick="togglePiP()" aria-label="Imagen en imagen">${icon('panel',19)}</button><button id="om-dv-fullscreen" onclick="toggleFullscreenVideo()" aria-label="Pantalla completa">${icon('expand',19)}</button><button onclick="minimizeVideo()" aria-label="Minimizar video">${icon('chevron',22)}</button>`;
  const stage=document.createElement('div');stage.className='om-dv-stage';
  const art=document.createElement('div');art.className='om-dv-art';
  const panel=document.createElement('aside');panel.className='om-dv-panel';panel.hidden=true;panel.setAttribute('aria-label','Información del video');
  stage.append(art,panel);
  const slot=document.createElement('div');slot.className='om-dv-player-slot';modal.append(top,stage,slot);
  const quality=document.createElement('span');quality.className='om-dv-quality';quality.setAttribute('title','Resolución del archivo de video');document.querySelector('.player-right').append(quality);
  function animate(node,frames,options){return desktop()?window.OMMotion?.animate(node,frames,{duration:380,easing:'cubic-bezier(.22,1,.36,1)',...options}):null;}
  function flip(node,from){
    const to=node.getBoundingClientRect();if(!from?.width||!to.width||!to.height)return;
    animate(node,[{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transform:'translate(0,0) scale(1)'}],{duration:450});
  }
  function resolution(){quality.textContent=activeVideo?(video.videoHeight?video.videoHeight+'p':'VIDEO'):'';}
  function release(){
    ++state.ticket;window.OMMotion?.cancel(modal);window.OMMotion?.cancel(art);window.OMMotion?.cancel(panel);
    if(state.playerHome){state.playerHome.replaceWith(player);state.playerHome=null;}
    for(const {node,marker} of state.overlays.reverse())marker.replaceWith(node);state.overlays=[];
    if(video.parentNode===art)videoHome.after(video);
    for(const {node,value} of state.inert)node.inert=value;state.inert=[];
    state.expanded=false;document.body.classList.remove('om-desktop-video-open');modal.removeAttribute('data-desktop-panel');
    if(desktop()){modal.removeAttribute('aria-modal');modal.removeAttribute('role');}
  }
  function attach(animateOpen=true){
    if(!desktop()||!activeVideo||modal.style.display==='none')return;
    const opening=!state.expanded,from=$om('cover-container').getBoundingClientRect();
    if(opening){
      state.focus=document.activeElement;state.playerHome=document.createComment('om-desktop-player-home');player.before(state.playerHome);slot.append(player);art.append(video);
      for(const id of ['queueBox','modalOverlay','optionsModal','om-dialog-backdrop','om-toast']){const node=$om(id);if(!node)continue;const marker=document.createComment('om-desktop-overlay-home');node.before(marker);modal.append(node);state.overlays.push({node,marker});}
      state.inert=[...document.querySelectorAll('.om-global-header,.container,#mobile-tab-bar,#om-now-panel')].map(node=>({node,value:node.inert}));state.inert.forEach(({node})=>node.inert=true);
      state.expanded=true;document.body.classList.add('om-desktop-video-open');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Reproductor de videos');
    }
    setPanel(state.panel,false);resolution();
    if(opening&&animateOpen){animate(modal,[{opacity:0},{opacity:1}]);flip(art,from);top.querySelector('button')?.focus();}
    window.OMVideoChrome?.show();
  }
  function similar(){
    const names=normal(activeVideo?.artist||'').split(',').map(x=>x.trim()).filter(Boolean);
    return videos.map((item,index)=>({item,index,score:names.some(name=>normal(item.artist).split(',').map(x=>x.trim()).includes(name))?1:0})).filter(x=>x.item.url!==activeVideo?.url&&(!window.OMSettings||window.OMSettings.allowed({...x.item,type:'video'}))).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,18);
  }
  function setPanel(name,motion=true){
    const from=art.getBoundingClientRect();state.panel=['similar','credits'].includes(name)?name:'cover';modal.dataset.desktopPanel=state.panel;panel.hidden=state.panel==='cover';
    top.querySelectorAll('[data-dv-panel]').forEach(button=>{const selected=button.dataset.dvPanel===state.panel;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
    const item=activeVideo;if(!item)return;
    if(state.panel==='similar')panel.innerHTML=`<h2>Videos similares</h2><div class="om-dv-suggestions">${similar().map(({item,index})=>`<div><button onclick="playVideo(${index})">${img(item.cover,item.title)}<span><strong>${esc(item.title)}</strong><small>${esc(item.artist)}</small></span></button><button onclick="omQueueVideo(${index})" aria-label="Agregar ${esc(item.title)} a la cola">${icon('queue',20)}</button><button onclick="openOptions({...videos[${index}],type:'video'})" aria-label="Opciones de ${esc(item.title)}">${icon('more',20)}</button></div>`).join('')}</div>`;
    if(state.panel==='credits'){
      const year=item.year||item.releaseDate,label=item.recordLabel||item.label;
      panel.innerHTML=`<h2>${esc(item.title)}</h2><dl><dt>Artistas</dt><dd>${omArtistLinks(item.artist)}</dd>${item.album?`<dt>Álbum</dt><dd>${esc(item.album)}</dd>`:''}${year?`<dt>Lanzado</dt><dd>${esc(year)}</dd>`:''}${label?`<dt>Sello discográfico</dt><dd>${esc(label)}</dd>`:''}<dt>Formato</dt><dd>${esc((item.url.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1]||'Video').toUpperCase())}</dd>${video.videoHeight?`<dt>Resolución</dt><dd>${video.videoWidth} × ${video.videoHeight}</dd>`:''}</dl>`;
    }
    if(motion&&state.expanded){flip(art,from);if(!panel.hidden)animate(panel,[{opacity:0,transform:'translateX(25px)'},{opacity:1,transform:'translateX(0)'}]);}
    window.OMVideoChrome?.show();
  }
  window.openVideo=function(){release();const result=before.open.apply(this,arguments);attach();return result;};
  window.restoreVideo=function(){const result=before.restore.apply(this,arguments);attach();return result;};
  window.minimizeVideo=function(){
    if(!desktop()||!state.expanded)return before.minimize.apply(this,arguments);
    const ticket=++state.ticket;
    const finish=()=>{if(ticket!==state.ticket)return;release();before.minimize();resolution();state.focus?.isConnected&&state.focus.focus();};
    if(window.OMMotion)window.OMMotion.animate(modal,[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(24px) scale(.98)'}],{duration:220},finish);else finish();
  };
  window.closeVideo=function(){release();const result=before.close.apply(this,arguments);resolution();return result;};
  window.loadSong=function(song){if(song?.type!=='video')release();return before.load.apply(this,arguments);};
  window.omDesktopVideoPanel=name=>setPanel(state.panel===name?'cover':name);
  window.OMDesktopVideo={get expanded(){return state.expanded;},get panel(){return state.panel;},setPanel,fullscreenChanged(full){window.OMMotion?.cancel(art);$om('om-dv-fullscreen').setAttribute('aria-label',full?'Salir de pantalla completa':'Pantalla completa');}};
  video.addEventListener('loadedmetadata',resolution);
  window.addEventListener('resize',()=>{if(!desktop()&&state.expanded){release();window.OMMobileVideo?.refresh();}else if(desktop()&&activeVideo&&modal.style.display!=='none')attach(false);});
  document.addEventListener('keydown',event=>{
    if(!state.expanded||event.defaultPrevented||!$om('om-dialog-backdrop').hidden||$om('optionsModal').style.display==='block')return;
    if(event.key==='Escape'&&!modal.classList.contains('om-video-fullscreen')){event.preventDefault();state.panel!=='cover'?setPanel('cover'):window.minimizeVideo();}
    if(event.key==='Tab'){const buttons=[...modal.querySelectorAll('button,input,progress[tabindex]')].filter(node=>!node.disabled&&node.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  });
  for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{$om('om-dv-fullscreen').setAttribute('aria-label',modal.classList.contains('om-video-fullscreen')?'Salir de pantalla completa':'Pantalla completa');});
  modal.addEventListener('click',event=>{if(state.expanded&&event.target.closest('.om-artist-link'))window.minimizeVideo();});
  window.OMDesktopMotion={
    layout(root,art,from,panel){if(!desktop()||root.hidden)return;flip(art,from);if(panel&&!panel.hidden)animate(panel,[{opacity:0,transform:'translateX(25px)'},{opacity:1,transform:'translateX(0)'}]);},
    enter(root,art,from){if(!desktop())return;animate(root,[{opacity:0},{opacity:1}],{duration:360});flip(art,from);}
  };
})();
