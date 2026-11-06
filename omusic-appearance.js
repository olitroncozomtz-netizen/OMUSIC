/* Una preferencia de apariencia para el teléfono, el PC y sus reproductores. */
(() => {
  'use strict';
  const root=document.documentElement,key='omusic_appearance_v1';
  const palettes=[{id:'green',name:'Verde',rgb:[99,165,113]},{id:'blue',name:'Azul',rgb:[82,132,201]},{id:'rose',name:'Rosa',rgb:[189,91,135]},{id:'amber',name:'Ámbar',rgb:[186,130,68]},{id:'violet',name:'Violeta',rgb:[142,112,190]},{id:'teal',name:'Turquesa',rgb:[51,153,156]}];
  let prefs={dynamic:true,palette:'green',amoled:false,systemFont:false},track=null,ticket=0;const cache=new Map();
  function read(){let raw;try{raw=JSON.parse(localStorage.getItem(key)||'{}');}catch{}prefs={dynamic:raw?.dynamic!==false,palette:palettes.some(p=>p.id===raw?.palette)?raw.palette:'green',amoled:raw?.amoled===true,systemFont:raw?.systemFont===true};}
  const text=(es,en)=>window.OMSettings?.text(es,en)||es;
  const selected=()=>palettes.find(p=>p.id===prefs.palette)||palettes[0];
  // La portada del álbum determina el reproductor; las preferencias solo colorean la interfaz.
  function albumCover(item){return (typeof albumsOM!=='undefined'&&albumsOM.find(album=>album.name===item?.album)?.cover)||item?.cover||'';}
  function coverPalette(cover){return cache.get(cover)||window.OMCoverPalette.get(cover)||window.OMCoverPalette.fromRgb([52,68,59]);}
  function songPalette(item){return coverPalette(albumCover(item));}
  function paletteFor(cover){return prefs.dynamic?coverPalette(cover):window.OMCoverPalette.fromRgb(selected().rgb);}
  function sync(){
    const palette=songPalette(track),interfacePalette=paletteFor(albumCover(track)),light=root.dataset.theme==='light';
    root.dataset.appearanceReady='true';root.dataset.amoled=String(prefs.amoled&&!light);root.dataset.systemFont=String(prefs.systemFont);
    for(const [name,value]of Object.entries({'--om-song-dark':`rgb(${palette.dark})`,'--om-song-light':`rgb(${palette.light})`,'--om-song-bg':`rgb(${light?palette.light:palette.dark})`,'--om-song-fg':light?'#182129':'#ffffff','--om-song-muted':light?'#182129b3':'#ffffffb3','--om-ap-accent':`rgb(${light?interfacePalette.dark:interfacePalette.light})`,'--om-ap-on-accent':light?'#ffffff':'#182129','--om-green':`rgb(${light?interfacePalette.dark:interfacePalette.light})`}))root.style.setProperty(name,value);
    const mobile=$om('om-mobile-player');if(mobile)window.OMCoverPalette.apply(mobile,palette);
    updatePreview();
  }
  function follow(item){
    if(item?.type==='video')return;
    const cover=albumCover(item),changed=albumCover(track)!==cover;track=item||null;sync();
    if(!changed)return;
    const request=++ticket;if(!cover||window.OMCoverPalette.get(cover)||cache.has(cover))return;
    const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{
      if(request!==ticket||albumCover(track)!==cover)return;
      try{const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,32,32);cache.set(cover,window.OMCoverPalette.fromRgb(window.OMCoverPalette.dominant(ctx.getImageData(0,0,32,32).data)));sync();}catch{}
    };image.src=cover;
  }
  function set(name,value){
    if(name==='palette'){if(!palettes.some(p=>p.id===value))return;prefs.palette=value;prefs.dynamic=false;}
    else if(['dynamic','amoled','systemFont'].includes(name))prefs[name]=value===true;
    else return;
    try{localStorage.setItem(key,JSON.stringify(prefs));}catch{}sync();
  }
  function updatePreview(){
    const label=$om('om-ap-preview-theme');if(!label)return;
    label.textContent=root.dataset.theme==='light'?text('Claro','Light'):text('Oscuro','Dark');
    const title=$om('om-ap-preview-title');if(title)title.textContent=track?.title||text('Tu música, a tu manera','Your music, your way');
    document.querySelectorAll('[data-ap-theme]').forEach(button=>{const on=button.dataset.apTheme===window.OMTheme.mode;button.setAttribute('aria-checked',String(on));button.tabIndex=on?0:-1;});
    document.querySelectorAll('[data-ap-toggle]').forEach(button=>button.setAttribute('aria-checked',String(prefs[button.dataset.apToggle])));
    document.querySelectorAll('[data-ap-palette]').forEach(button=>button.setAttribute('aria-pressed',String(!prefs.dynamic&&prefs.palette===button.dataset.apPalette)));
    const swatches=$om('om-ap-palettes');if(swatches)swatches.hidden=prefs.dynamic;
  }
  function toggle(name,title,description,symbol){return `<div class="om-ap-row"><span class="om-ap-row-icon">${icon(symbol,24)}</span><div><strong>${title}</strong><small>${description}</small></div><button type="button" class="om-ap-switch" role="switch" aria-label="${title}" aria-checked="${prefs[name]}" data-ap-toggle="${name}" onclick="omSetAppearance('${name}',this.getAttribute('aria-checked')!=='true')"><span>${icon('check',17)}</span></button></div>`;}
  function markup(){
    const theme=root.dataset.theme==='light'?text('Claro','Light'):text('Oscuro','Dark');
    return `<div class="om-appearance"><section class="om-ap-preview" aria-label="${text('Vista previa de la apariencia','Appearance preview')}"><div class="om-ap-preview-decoration" aria-hidden="true"></div><div class="om-ap-preview-player"><div class="om-ap-preview-art" aria-hidden="true">${icon('music',49)}</div><div class="om-ap-preview-meta"><strong id="om-ap-preview-title">${esc(track?.title||text('Tu música, a tu manera','Your music, your way'))}</strong><span>OMUSIC</span><div aria-hidden="true">${icon('prev',20)}<i>${icon('play',23)}</i>${icon('next',20)}</div></div></div><span id="om-ap-preview-theme" class="om-ap-preview-badge">${theme}</span><p>${text('Así se verá tu música.','This is how your music will look.')}</p></section><div class="om-ap-controls"><section><h2>${text('Colores','Colors')}</h2><div class="om-ap-group">${toggle('dynamic',text('Color dinámico','Dynamic color'),text('Usar la portada para los colores de la interfaz.','Use the album cover for interface colors.'),'grid')}</div><div id="om-ap-palettes" class="om-ap-palettes" role="group" aria-label="${text('Paletas de color','Color palettes')}" ${prefs.dynamic?'hidden':''}>${palettes.map(p=>{const c=window.OMCoverPalette.fromRgb(p.rgb);return `<button class="om-ap-swatch" data-ap-palette="${p.id}" style="--swatch-dark:rgb(${c.dark});--swatch-light:rgb(${c.light})" aria-label="${text('Paleta','Palette')} ${p.name}" aria-pressed="${!prefs.dynamic&&prefs.palette===p.id}" onclick="omSetAppearance('palette','${p.id}')"><span aria-hidden="true"><i></i><i></i><i></i><i></i></span>${icon('check',16)}</button>`;}).join('')}</div></section><section><h2>${text('Tema','Theme')}</h2><div class="om-ap-group"><div class="om-ap-themes" role="radiogroup" aria-label="${text('Tema de la aplicación','App theme')}" onkeydown="omAppearanceThemeKey(event)">${[['system',text('Sistema','System'),'settings'],['light',text('Claro','Light'),'sun'],['dark',text('Oscuro','Dark'),'moon']].map(([mode,label,symbol])=>`<button role="radio" data-ap-theme="${mode}" aria-checked="${window.OMTheme.mode===mode}" tabindex="${window.OMTheme.mode===mode?0:-1}" onclick="OMTheme.set('${mode}')">${icon(symbol,20)}${label}</button>`).join('')}</div>${toggle('amoled',text('AMOLED oscuro','AMOLED dark'),text('Negro puro en la interfaz oscura.','Pure black in the dark interface.'),'moon')}</div></section><section class="om-ap-group">${toggle('systemFont',text('Usar la fuente del sistema','Use system font'),text('Utiliza la fuente predeterminada del dispositivo.','Use your device’s default font.'),'text')}</section><p class="om-ap-note">${text('El fondo del reproductor siempre sigue la portada del álbum, en celular y PC. Tus preferencias se guardan en este navegador.','Player backgrounds always follow the album artwork on mobile and desktop. Preferences are saved in this browser.')}</p></div></div>`;
  }
  function themeKey(event){if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...event.currentTarget.querySelectorAll('[data-ap-theme]')],current=buttons.findIndex(b=>b.dataset.apTheme===window.OMTheme.mode);const index=event.key==='Home'?0:event.key==='End'?2:(current+(event.key==='ArrowRight'?1:2))%3;window.OMTheme.set(buttons[index].dataset.apTheme);buttons[index].focus();}
  read();
  window.OMAppearance={get prefs(){return {...prefs};},palettes,paletteFor,albumCover,songPalette,follow,sync,set,markup};window.omSetAppearance=set;window.omAppearanceThemeKey=themeKey;
  const syncPlayer=window.omSyncPlayer;window.omSyncPlayer=function(){const result=syncPlayer.apply(this,arguments);follow(currentSong);return result;};
  for(const event of ['play','loadedmetadata'])audio.addEventListener(event,()=>follow(currentSong));
  window.addEventListener('omusic-theme-change',sync);window.addEventListener('omusic-settings-change',updatePreview);
  window.addEventListener('storage',event=>{if(event.key===key){read();sync();}});
  follow(currentSong);
})();
