/* Reproducción: filtros, final de lista, normalización y crossfade con dos audios. */
(() => {
  'use strict';
  const S=window.OMSettings;
  const state={fade:null,handoff:null,frame:0,context:null,nodes:new Map(),compressor:null,normalTimer:null};
  const originalLoad=window.loadSong,originalVideo=window.openVideo,originalMute=window.omMute,originalPause=window.playPause;
  const video=s=>s?.type==='video'||videos.some(v=>v.url&&v.url===s?.url);
  // Los archivos de este catálogo usan URLs públicas que admiten CORS.
  if(!audio.getAttribute('src'))audio.crossOrigin='anonymous';
  function choose(direction=1,automatic=false){
    if(direction>0){const index=queue.findIndex(S.allowed);if(index>=0)return {song:queue[index],kind:'queue',index};}
    const raw=OM.playbackList.length?OM.playbackList:songs;
    const list=raw.filter(S.allowed),current=list.findIndex(s=>s.url===currentSong?.url);
    if(shuffleActive&&list.length>1){
      const alternatives=list.filter(s=>s.url!==currentSong?.url);
      return {song:alternatives[Math.floor(Math.random()*alternatives.length)],kind:'list'};
    }
    const next=current+direction;
    if(list.length&&next>=0&&next<list.length)return {song:list[next],kind:'list'};
    if(!automatic&&list.length)return {song:list[direction>0?0:list.length-1],kind:'list'};
    if(!automatic||!S.prefs.autoplay)return null;
    const names=String(currentSong?.artist||'').split(',').map(s=>s.trim());
    const candidates=songs.filter(s=>s.url!==currentSong?.url&&S.allowed(s));
    candidates.sort((a,b)=>score(b)-score(a));
    function score(s){return (names.some(n=>omArtistMatches(s,n))?100:0)+(s.album&&s.album===currentSong?.album?25:0)+Math.min(15,OM.listens[s.url]||0);}
    return candidates.length?{song:candidates[0],kind:'recommendation',list:candidates.slice(0,20)}:null;
  }
  function commit(plan){
    if(plan.kind==='queue'){queue.splice(0,plan.index+1);renderQueue();}
    if(plan.kind==='recommendation'){OM.playbackList=plan.list;currentAlbumContext=null;}
  }
  function destroyPreview(f){
    if(!f)return;f.media.pause();f.media.removeAttribute('src');f.media.load();f.media.remove();
    const node=state.nodes.get(f.media);if(node){node.source.disconnect();node.analyser.disconnect();node.gain.disconnect();state.nodes.delete(f.media);}
    clearTimeout(f.timeout);
  }
  function cancel(){
    cancelAnimationFrame(state.frame);state.frame=0;
    const f=state.fade||state.handoff;state.fade=null;state.handoff=null;
    if(f){audio.volume=f.volume;destroyPreview(f);}
  }
  function complete(){
    const f=state.fade;if(!f)return;
    if(f.owner!==userKeyOM()||!S.allowed(f.plan.song)||(f.plan.kind==='queue'&&!queue.some(s=>s.url===f.plan.song.url))){cancel();return ended();}
    state.fade=null;state.handoff=f;cancelAnimationFrame(state.frame);audio.volume=f.volume;f.media.volume=f.volume;
    if(f.plan.kind==='queue')f.plan.index=queue.findIndex(s=>s.url===f.plan.song.url);
    commit(f.plan);
    const url=f.plan.song.url;
    audio.addEventListener('loadedmetadata',()=>{if(state.handoff===f&&currentSong?.url===url)try{audio.currentTime=f.media.currentTime;}catch{}},{once:true});
    audio.addEventListener('playing',()=>{if(state.handoff===f){state.handoff=null;destroyPreview(f);}},{once:true});
    f.timeout=setTimeout(()=>{if(state.handoff===f)cancel();},8000);
    window.loadSong(f.plan.song,{_omHandoff:true});
  }
  function ended(){
    if(state.fade)return complete();
    if(repeatActive&&S.allowed(currentSong)){audio.currentTime=0;return audio.play().catch(()=>{});}
    const plan=choose(1,true);if(!plan){audio.pause();return omSyncPlayer();}
    commit(plan);window.loadSong(plan.song);
  }
  function prepareFade(){
    if(window.OMParty?.active)return;
    if(!S.prefs.crossfade||state.fade||state.handoff||!currentSong||video(currentSong)||audio.paused||repeatActive||!Number.isFinite(audio.duration))return;
    const remaining=audio.duration-audio.currentTime;
    if(remaining<=.2||remaining>S.prefs.crossfadeSeconds||audio.duration<S.prefs.crossfadeSeconds*2+1)return;
    const plan=choose(1,true);if(!plan||video(plan.song))return;
    const media=document.createElement('audio');media.id='om-crossfade-audio';media.hidden=true;media.crossOrigin='anonymous';media.preload='auto';media.volume=0;media.src=plan.song.url;document.body.append(media);
    const f={media,plan,owner:userKeyOM(),old:currentSong.url,volume:audio.volume,started:false};state.fade=f;
    if(state.context)attach(media);
    media.addEventListener('error',()=>{if(state.fade===f)cancel();},{once:true});
    media.play().then(()=>{
      if(state.fade!==f)return;
      f.start=audio.currentTime;f.length=Math.max(.1,audio.duration-audio.currentTime);f.started=true;
      function frame(){
        if(state.fade!==f)return;
        if(f.owner!==userKeyOM()||currentSong?.url!==f.old||!S.prefs.crossfade){cancel();return;}
        const progress=Math.min(1,Math.max(0,(audio.currentTime-f.start)/f.length));
        audio.volume=f.volume*(1-progress);media.volume=f.volume*progress;
        state.frame=requestAnimationFrame(frame);
      }
      frame();
    }).catch(()=>{if(state.fade===f)cancel();});
  }
  function attach(media){
    if(state.nodes.has(media))return;
    const source=state.context.createMediaElementSource(media),analyser=state.context.createAnalyser(),gain=state.context.createGain();analyser.fftSize=2048;
    source.connect(analyser);analyser.connect(gain);gain.connect(state.compressor);state.nodes.set(media,{source,analyser,gain,samples:new Float32Array(analyser.fftSize)});
  }
  function configureNormalizer(){
    if(!state.context)return;
    const on=S.prefs.normalize,time=state.context.currentTime;
    state.compressor.threshold.setValueAtTime(on?-18:0,time);state.compressor.knee.setValueAtTime(on?24:0,time);state.compressor.ratio.setValueAtTime(on?3:1,time);state.compressor.attack.setValueAtTime(.006,time);state.compressor.release.setValueAtTime(.2,time);
    if(!on)for(const node of state.nodes.values())node.gain.gain.setTargetAtTime(1,time,.05);
  }
  async function normalize(){
    if(!S.prefs.normalize){configureNormalizer();return;}
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext){S.set('normalize',false);return omToast(S.text('Tu navegador no admite normalización de audio.','Your browser does not support audio normalization.'));}
    try{
      if(!state.context){
        state.context=new AudioContext();state.compressor=state.context.createDynamicsCompressor();state.compressor.connect(state.context.destination);attach(audio);
        state.normalTimer=setInterval(()=>{
          if(!S.prefs.normalize||state.context.state!=='running')return;
          for(const [media,node]of state.nodes){
            if(media.paused)continue;node.analyser.getFloatTimeDomainData(node.samples);
            let sum=0;for(const sample of node.samples)sum+=sample*sample;
            const rms=Math.sqrt(sum/node.samples.length);if(rms<.01)continue;
            const target=Math.max(.5,Math.min(1.6,.14/rms));node.gain.gain.setTargetAtTime(target,state.context.currentTime,.7);
          }
        },120);
      }
      configureNormalizer();await state.context.resume();
    }catch{S.set('normalize',false);omToast(S.text('No se pudo activar la normalización en este navegador.','Audio normalization could not be enabled in this browser.'));}
  }
  window.loadSong=function(song,options={}){
    if(!song)return;
    if(!S.allowed(song)){omToast(S.reason(song));return;}
    if(!options._omHandoff)cancel();
    if(S.prefs.normalize)normalize();else if(state.context)state.context.resume().catch(()=>{});
    return originalLoad.apply(this,arguments);
  };
  window.openVideo=function(url,metadata){const item={...(metadata||videos.find(v=>v.url===url)),url,type:'video'};if(!S.allowed(item))return omToast(S.reason(item));cancel();if(state.context)state.context.resume().catch(()=>{});return originalVideo.apply(this,arguments);};
  function startList(list,album=false){
    const valid=list.filter(S.allowed);if(!valid.length)return omToast(S.text('No hay contenido disponible con estos filtros.','No content is available with these filters.'));
    const song=valid[shuffleActive?Math.floor(Math.random()*valid.length):0];OM.playbackList=[...list];currentAlbumContext=album?[...list]:null;
    if(currentAlbumContext)currentAlbumContext._currentIndex=list.findIndex(s=>s.url===song.url);window.loadSong(song);
  }
  window.omPlayAlbum=name=>{const album=albumsOM.find(a=>a.name===name);if(album)startList(album.songs,true);};
  window.omPlayArtist=key=>startList(songs.filter(s=>omArtistMatches(s,key)));
  window.omPlayActive=()=>startList(OM.view==='artist'&&OM.artistContext?OM.artistContext.tracks:OM.activeList,OM.view==='album');
  window.playNext=function(){cancel();const plan=choose(1,false);if(plan){commit(plan);window.loadSong(plan.song);}else omToast(S.text('No hay contenido disponible con estos filtros.','No content is available with these filters.'));};
  window.prevSong=function(){
    cancel();if(audio.currentTime>3&&S.allowed(currentSong)){audio.currentTime=0;return;}
    let previous;while(history.length){const item=history.pop();if(S.allowed(item)){previous=item;break;}}
    previous=previous||choose(-1,false)?.song;if(previous)window.loadSong(previous,{history:false});
  };
  window.handleSongEnd=ended;
  window.omMute=function(){cancel();return originalMute.apply(this,arguments);};
  window.playPause=function(){if(currentSong&&!S.allowed(currentSong))return omToast(S.reason(currentSong));if(state.handoff)cancel();if(state.context)state.context.resume().catch(()=>{});return originalPause.apply(this,arguments);};
  audio.addEventListener('play',()=>{if(currentSong&&!S.allowed(currentSong))audio.pause();});
  audio.addEventListener('timeupdate',prepareFade);
  audio.addEventListener('pause',()=>{if(!audio.ended&&state.fade)cancel();});
  audio.addEventListener('seeking',()=>{if(state.fade)cancel();});
  volume.addEventListener('input',cancel,true);
  window.addEventListener('omusic-settings-change',event=>{cancel();if(['normalize','session'].includes(event.detail?.name))normalize();});
  window.OMAudioSettings={choose,cancel,normalize};
})();
