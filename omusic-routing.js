/* Direcciones de contenido y navegación, sin cambiar el diseño ni la reproducción. */
(() => {
  'use strict';
  // Al abrir index.html con doble clic, conservar la navegación interna y los
  // enlaces con #. History no permite cambiar la ruta de un archivo file:.
  if(new URL(location.href).protocol==='file:')return;
  const before={route:window.omRoute,shared:window.omOpenSharedRoute,load:window.loadSong};
  const slug=value=>normal(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,220)||'musica';
  function id(value){let hash=2166136261;for(const char of value)hash=Math.imul(hash^char.charCodeAt(0),16777619);return (hash>>>0).toString(36);}
  const catalogs=new Set(['music','songs','artists','albums','videos']);
  const byPath=new Map(),byValue=new Map();
  const root=()=>new URL('.',window.OMProfileRoutes.base());
  const actualRoot=()=>new URL('.',window.OMProfileRoutes.base(location.href));
  const artistKeys=[...new Set([...songs,...videos].flatMap(item=>String(item.artist||'').split(',').map(name=>omArtistRecord(name.trim()).key).filter(Boolean)))];
  function register(type,items){
    const groups=new Map();
    for(const item of items){const name=slug(item.name);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(item);}
    for(const [name,group]of groups)for(const item of group){
      const segment=type==='song'||type==='video'||group.length>1?name+'--'+id(item.value):name;
      const path=type+'/'+segment,entry={type,value:item.value,path};
      byPath.set(path,entry);byValue.set(type+'\n'+item.value,entry);
    }
  }
  register('artist',artistKeys.map(key=>({name:omArtistRecord(key).name,value:key})));
  register('album',albumsOM.map(album=>({name:album.name,value:album.name})));
  for(const [type,items]of [['song',songs],['video',videos]])register(type,items.filter(item=>item.url).map(item=>({name:item.title+' '+item.artist,value:item.url})));
  function entry(type,value){return byValue.get(type+'\n'+(type==='artist'?omArtistRecord(value).key:value));}
  function link(type,value,local=false){
    const found=entry(type,value);return found?new URL(found.path,local?actualRoot():root()).href:null;
  }
  function routeURL(route){
    const type=route.type==='track'?'song':route.type==='sharedVideo'?'video':route.type==='artistAlbums'?'artist':route.type;
    const found=link(type,route.value,true);
    if(found)return found+(route.type==='artistAlbums'?'/albums':'');
    if(catalogs.has(route.type))return new URL(route.type,actualRoot()).href;
    if(route.type==='home'&&route.value==='music')return new URL('music',actualRoot()).href;
    const current=new URL(location.href);
    if(route.type==='profile'&&window.OMProfileRoutes.parse())return current.href;
    const key={profile:'profile',publicPlaylist:'playlist',party:'party',friends:'party'}[route.type];
    if(key&&new URLSearchParams(current.hash.slice(1)).has(key)&&!window.OMContentPaths.parse())return current.href;
    return actualRoot().href;
  }
  let restoring=true,selecting=0;
  const initial=window.history.state?.omContentNav;
  let cursor=initial?.index||0,maximum=cursor;
  const token=initial?.token||Date.now().toString(36);
  function buttons(){
    $om('om-back').disabled=cursor===0;$om('om-forward').disabled=cursor>=maximum;
  }
  function remember(route,url,push){
    const current=window.history.state?.omContentNav;
    const changed=url!==location.href||JSON.stringify(current?.route)!==JSON.stringify(route);
    if(push&&changed){cursor++;maximum=cursor;}
    const state={...(window.history.state||{}),omContentNav:{token,index:cursor,route}};
    // Una entrada de contenido no debe heredar la marca de un modal móvil.
    delete state.omusicView;
    window.history[push&&changed?'pushState':'replaceState'](state,'',url);
    buttons();
  }
  window.omRoute=function(route,push=true){
    const result=before.route.apply(this,arguments);
    if(!restoring)remember(route,routeURL(route),push);
    return result;
  };
  function resolve(push=false){
    const parsed=window.OMContentPaths.parse();
    const hash=new URLSearchParams(location.hash.slice(1));
    if(!parsed||['track','artist','album','video','profile','playlist','party'].some(key=>hash.has(key)))return before.shared.apply(this,arguments);
    const wasRestoring=restoring;restoring=true;
    try{
      window.OMMobilePlayer?.close();window.omCloseImmersive?.();
      if(catalogs.has(parsed.type)){
        if(parsed.type==='music')omShowHome(push,'music');
        else ({songs:omShowSongs,artists:omShowArtists,albums:omShowAlbums,videos:omShowVideos})[parsed.type](push);
      }else{
        const found=byPath.get(parsed.type+'/'+parsed.slug);
        if(!found){window.OMMusicShare.missing();return true;}
        if(found.type==='artist'){if(parsed.albums)omShowArtistAlbums(found.value,push);else omOpenArtist(found.value,push);}
        else if(found.type==='album')omOpenAlbum(found.value,push);
        else if(found.type==='video')omOpenSharedVideo(found.value,push);
        else omOpenSharedTrack(found.value,push);
      }
      return true;
    }finally{restoring=wasRestoring;}
  }
  function handlesPopstate(event){return !!event.state?.omContentNav||!!window.OMContentPaths.parse();}
  window.OMMusicRoutes={link,resolve,handlesPopstate,paths:()=>[...byPath.keys(),...artistKeys.map(key=>entry('artist',key).path+'/albums'),...catalogs]};
  window.omOpenSharedRoute=resolve;
  window.omBack=()=>{if(cursor>0)window.history.back();};
  window.omForward=()=>{if(cursor<maximum)window.history.forward();};
  window.addEventListener('popstate',event=>{
    if(!handlesPopstate(event)||event.state?.omusicView)return;
    const nav=event.state?.omContentNav;
    restoring=true;
    try{
      window.OMMobilePlayer?.close();window.omCloseImmersive?.();
      if(nav?.token===token){cursor=nav.index;maximum=Math.max(maximum,cursor);omRestore(nav.route);}
      else if(!resolve(false))omShowHome(false);
    }finally{restoring=false;buttons();}
  });
  for(const name of ['omPlaySong','omPlay','omPlayActive','omPlayAlbum','omPlayArtist','omPlayQueued','omMobileSuggestedPlay']){
    const play=window[name];if(typeof play!=='function')continue;
    window[name]=function(){selecting++;try{return play.apply(this,arguments);}finally{selecting--;}};
  }
  window.loadSong=function(item){
    const result=before.load.apply(this,arguments);
    if(!restoring&&item?.url&&item.type!=='video'&&currentSong?.url===item.url&&(selecting||window.OMContentPaths.parse()?.type==='song')){
      const url=link('song',item.url,true);if(url)remember(OM.route,url,selecting>0&&window.OMContentPaths.parse()?.type!=='song');
    }
    return result;
  };
  const parsed=window.OMContentPaths.parse();
  if(parsed)resolve(false);
  restoring=false;
  // Convertir enlaces musicales anteriores sin romper perfiles, parties o playlists.
  if(OM.route&&!parsed)remember(OM.route,routeURL(OM.route),false);
  else if(OM.route)remember(OM.route,location.href,false);
})();
