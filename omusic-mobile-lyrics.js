/* Letras del teléfono: seguimiento suave por línea, sin cambiar el audio ni la vista de PC. */
(() => {
  'use strict';
  const phone=matchMedia('(max-width: 768px)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const previous={sync:window.updateLyricsSync,render:window.renderLyricsToContainer,load:window.loadLyrics};
  const meta=/^\s*(作词|作曲|编曲|词曲|lyrics\s*by|written\s*by|compos(?:er|ed)\s*:)/i;
  const state={live:false,data:null,entries:[],index:-2,height:0,frame:0,lastTime:null,manualUntil:0,touch:false,needsFollow:false,animations:new Map()};
  const mounted=()=>phone.matches&&window.OMMobilePlayer?.open&&window.OMMobilePlayer.tab==='lyrics'&&document.getElementById('om-mobile-player')?.contains(lyricsContainer);
  const visible=()=>mounted()&&!window.OMMobilePlayer.queueOpen&&!document.hidden;
  function cancelMotion(){for(const animation of state.animations.values())animation.cancel();state.animations.clear();}
  function stop(){
    cancelAnimationFrame(state.frame);state.frame=0;cancelMotion();
    state.live=false;state.data=null;state.index=-2;state.lastTime=null;state.manualUntil=0;state.touch=false;state.needsFollow=false;
    lyricsContainer.classList.remove('om-mobile-lyrics-ready');lyricsContainer.style.removeProperty('--om-lyric-tail');
    for(const {node} of state.entries)node.classList.remove('om-lyric-past','om-lyric-next');
    state.entries=[];
  }
  function prepare(){
    if(state.data===currentLrcLines&&state.entries[0]?.node===lyricsContainer.querySelector('.lrc-line[id]'))return;
    cancelMotion();state.data=currentLrcLines;state.index=-2;
    state.entries=currentLrcLines.map((line,index)=>({node:document.getElementById('lrc-'+index),index,time:line.time})).filter(entry=>entry.node&&lyricsContainer.contains(entry.node));
    for(const entry of state.entries){entry.metadata=meta.test(entry.node.textContent);entry.node.classList.toggle('om-lrc-meta',entry.metadata);}
    lyricsContainer.classList.toggle('om-mobile-lyrics-ready',state.entries.length>0);
  }
  function activeIndex(time){
    let low=0,high=state.entries.length-1,result=-1;
    while(low<=high){const mid=(low+high)>>1;if(state.entries[mid].time<=time){result=mid;low=mid+1;}else high=mid-1;}
    while(result>=0&&state.entries[result].metadata)result--;
    return result;
  }
  function align(index,snap=false){
    const active=state.entries[index]?.node;if(!active||!visible())return;
    const height=lyricsContainer.clientHeight;if(!height)return;
    const bounds=lyricsContainer.getBoundingClientRect();
    const candidates=state.entries.filter((entry,i)=>!entry.metadata&&(Math.abs(i-index)<=8||state.animations.has(entry.node)));
    const before=new Map(candidates.map(({node})=>[node,node.getBoundingClientRect().top]));
    cancelMotion();
    lyricsContainer.style.setProperty('--om-lyric-tail',Math.ceil(height*.55)+'px');
    const target=Math.max(0,Math.min(lyricsContainer.scrollHeight-height,active.offsetTop+active.offsetHeight/2-height*.46));
    lyricsContainer.scrollTo({top:target,behavior:'auto'});
    if(snap||reduced.matches)return;
    // FLIP: el scroll llega a su destino; cada línea visible lo alcanza con un pequeño retraso.
    for(const {node,index:lineIndex} of candidates){
      const after=node.getBoundingClientRect(),from=before.get(node),distance=from-after.top;
      if(Math.abs(distance)<.5||!node.animate||((from<bounds.top-140||from>bounds.bottom+140)&&(after.bottom<bounds.top-140||after.top>bounds.bottom+140)))continue;
      const animation=node.animate([{translate:'0 '+distance+'px'},{translate:'0 0px'}],{duration:650,delay:Math.min(140,Math.max(0,lineIndex-state.entries[index].index)*26),easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
      state.animations.set(node,animation);
      animation.finished.then(()=>{if(state.animations.get(node)===animation)state.animations.delete(node);}).catch(()=>{});
    }
  }
  function sync(time,{snap=false}={}){
    if(!visible())return;
    const starting=!state.live;state.live=true;prepare();
    if(!state.entries.length){state.lastTime=null;return;}
    const index=activeIndex(Number.isFinite(time)?time:0),changed=index!==state.index;
    const jumped=state.lastTime!==null&&Math.abs(time-state.lastTime)>1.2;
    const resized=state.height!==lyricsContainer.clientHeight;
    state.lastTime=time;state.height=lyricsContainer.clientHeight;
    if(changed){
      for(const [i,{node}] of state.entries.entries()){
        node.classList.toggle('active',i===index);
        node.classList.toggle('om-lyric-past',index>=0&&i<index);
        node.classList.toggle('om-lyric-next',i>index&&i<=index+2);
      }
      state.index=index;
    }
    if(state.touch||performance.now()<state.manualUntil){state.needsFollow=true;return;}
    if(changed||resized||state.needsFollow||snap||starting){align(Math.max(0,index),snap||starting||jumped);state.needsFollow=false;}
  }
  function schedule(){
    if(state.frame||!visible()||audio.paused||reduced.matches)return;
    state.frame=requestAnimationFrame(()=>{state.frame=0;if(!visible())return;sync(audio.currentTime);schedule();});
  }
  function center(){if(!mounted())return false;sync(audio.currentTime);schedule();return true;}
  function visibility(){
    if(!visible()){stop();return;}
    center();
  }
  function hold(){if(!mounted())return;cancelMotion();state.manualUntil=performance.now()+3000;state.needsFollow=true;}
  lyricsContainer.addEventListener('pointerdown',()=>{if(mounted()){state.touch=true;hold();}},{passive:true});
  const release=()=>{if(state.touch){state.touch=false;state.manualUntil=performance.now()+3000;}};
  window.addEventListener('pointerup',release,{passive:true});window.addEventListener('pointercancel',release,{passive:true});
  lyricsContainer.addEventListener('wheel',hold,{passive:true});
  lyricsContainer.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(event.key))hold();});
  audio.addEventListener('timeupdate',()=>{if(mounted())center();});
  audio.addEventListener('play',visibility);
  audio.addEventListener('pause',()=>{cancelAnimationFrame(state.frame);state.frame=0;if(mounted())sync(audio.currentTime);});
  audio.addEventListener('seeked',()=>{if(!mounted())return;state.manualUntil=0;state.touch=false;sync(audio.currentTime,{snap:true});schedule();});
  audio.addEventListener('ended',()=>{cancelAnimationFrame(state.frame);state.frame=0;});
  document.addEventListener('visibilitychange',visibility);
  phone.addEventListener('change',visibility);reduced.addEventListener('change',()=>{cancelAnimationFrame(state.frame);state.frame=0;cancelMotion();if(mounted())sync(audio.currentTime,{snap:true});visibility();});
  window.updateLyricsSync=function(time){if(mounted()){sync(time);schedule();return;}return previous.sync.apply(this,arguments);};
  window.renderLyricsToContainer=function(){const result=previous.render.apply(this,arguments);state.data=null;if(mounted())center();return result;};
  window.loadLyrics=async function(){stop();const result=await previous.load.apply(this,arguments);if(mounted())visibility();return result;};
  window.OMMobileLyrics={center,visibility,stop};
})();
