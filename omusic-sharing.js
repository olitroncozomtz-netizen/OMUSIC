/* Enlaces de canciones, álbumes y artistas, válidos también en subcarpetas de GitHub Pages. */
(() => {
  'use strict';
  const previous={album:window.omOpenAlbum,artist:window.omOpenArtist,options:window.openOptions,route:window.omOpenSharedRoute,track:window.omOpenSharedTrack};
  const validText=value=>typeof value==='string'&&value.length>0&&value.length<=2000;
  const artistExists=name=>validText(name)&&[...songs,...videos].some(item=>omArtistMatches(item,name));
  function content(type,value){
    if(!validText(value))return null;
    if(type==='song'){const item=songs.find(s=>s.url===value);return item?{key:'track',value:item.url,title:item.title,description:item.artist}:null;}
    if(type==='video'){const item=videos.find(v=>v.url===value);return item?{key:'video',value:item.url,title:item.title,description:item.artist}:null;}
    if(type==='album'){const album=albumsOM.find(a=>a.name===value);return album?{key:'album',value:album.name,title:album.name,description:album.artist}:null;}
    if(type==='artist'&&artistExists(value)){const artist=omArtistRecord(value);return {key:'artist',value:artist.key,title:artist.name,description:'Artista en OMUSIC'};}
    return null;
  }
  function link(type,value){
    const item=content(type,value);if(!item)return null;
    if(window.OMMusicRoutes)return window.OMMusicRoutes.link(type,value);
    const url=window.OMProfileRoutes?.base()||new URL(window.OMAndroid?.publicBase||location.href);url.search='';url.hash=new URLSearchParams({[item.key]:item.value}).toString();url.username='';url.password='';return url.href;
  }
  async function share(type,value){
    const item=content(type,value),url=link(type,value);
    if(!item||!url)return omToast('Este contenido no está disponible en el catálogo.');
    closeOptions();
    if(window.OMAndroid){try{await window.OMAndroid.share({title:item.title+' · OMUSIC',url});return;}catch{}}
    if(navigator.share&&window.matchMedia?.('(max-width: 768px)').matches){
      try{await navigator.share({title:item.title+' · OMUSIC',text:item.description,url});return;}
      catch(error){if(error.name==='AbortError')return;}
    }
    omShareDialog('Compartir '+(type==='album'?'álbum':type==='artist'?'artista':type==='video'?'video':'canción'),url);
  }
  function button(type,value){
    const label='Compartir '+(type==='album'?'álbum':type==='artist'?'artista':type==='video'?'video':'canción');
    return `<button type="button" class="om-music-share-button" data-music-share="${type}" onclick="omShareMusic('${type}',${esc(JSON.stringify(value))})" aria-label="${label}" title="${label}">${icon('share',20)}<span>Compartir</span></button>`;
  }
  function decorate(type,value){
    if(!content(type,value))return;
    const toolbar=document.querySelector('.om-collection-toolbar');
    if(toolbar&&!toolbar.querySelector('[data-music-share]'))toolbar.querySelector('.om-track-count')?.insertAdjacentHTML('beforebegin',button(type,value));
  }
  function openTrack(value,push=true){
    if(!content('song',value))return false;
    const result=previous.track(value,push);
    const heading=document.querySelector('#om-detail .om-page-heading');
    if(result&&heading&&!heading.querySelector('[data-music-share]'))heading.insertAdjacentHTML('beforeend',button('song',value));return result;
  }
  function missing(){
    omDetailView('sharedUnavailable','Este enlace ya no está disponible.','',false);
    $om('om-detail').innerHTML=`<div class="om-empty"><h1>No encontramos este contenido.</h1><p>Puede que no esté en esta versión del catálogo de OMUSIC.</p><button class="om-button-green" onclick="omShowHome()">Explorar música</button></div>`;
    $om('songList').style.display='none';return true;
  }
  function openVideoPage(value,push=true){
    const item=videos.find(v=>v.url===value);if(!item)return false;
    omDetailView('sharedVideo',item.title,'VIDEO COMPARTIDO CONTIGO',push,value);$om('songList').className='om-video-grid';$om('songList').innerHTML=omVideoCard(item);document.querySelector('#om-detail .om-page-heading')?.insertAdjacentHTML('beforeend',button('video',value));return true;
  }
  function resolve(push=false){
    const params=new URLSearchParams(location.hash.slice(1));
    const key=['track','album','artist','video'].find(key=>params.has(key));
    if(!key)return previous.route.apply(this,arguments);
    const value=params.get(key),type=key==='track'?'song':key;
    if(!content(type,value))return missing();
    window.OMMobilePlayer?.close();window.omCloseImmersive?.();
    if(key==='album')window.omOpenAlbum(value,push);
    else if(key==='artist')window.omOpenArtist(value,push);
    else if(key==='video')openVideoPage(value,push);
    else openTrack(value,push);
    return true;
  }
  window.omOpenAlbum=function(name){const result=previous.album.apply(this,arguments);if(OM.view==='album')decorate('album',name);return result;};
  window.omOpenArtist=function(name){const result=previous.artist.apply(this,arguments);if(OM.view==='artist')decorate('artist',name);return result;};
  window.openOptions=function(item){
    const result=previous.options.apply(this,arguments);
    $om('optionsModal').querySelectorAll('#om-share-song-option').forEach(button=>button.remove());
    if(item?.url&&content('song',item.url))$om('optionsModal').insertAdjacentHTML('beforeend',`<button id="om-share-song-option" onclick="omShareMusic('song',${esc(JSON.stringify(item.url))})">${icon('share',17)} Compartir canción</button>`);
    else if(item?.url&&content('video',item.url))$om('optionsModal').insertAdjacentHTML('beforeend',`<button id="om-share-song-option" onclick="omShareMusic('video',${esc(JSON.stringify(item.url))})">${icon('share',17)} Compartir video</button>`);
    return result;
  };
  Object.assign(window,{OMMusicShare:{content,link,share,resolve,missing},omShareMusic:share,omShareSong:()=>currentSong&&share('song',currentSong.url),omOpenSharedTrack:openTrack,omOpenSharedVideo:openVideoPage,omOpenSharedRoute:resolve});
  window.addEventListener('hashchange',()=>{const params=new URLSearchParams(location.hash.slice(1));if(['track','album','artist','video'].some(key=>params.has(key)))resolve(false);});
  if(['track','album','artist','video'].some(key=>new URLSearchParams(location.hash.slice(1)).has(key)))resolve(false);
})();
