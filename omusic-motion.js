/* Movimiento breve y gestos; ninguna animación crea ni reinicia el audio. */
(() => {
  'use strict';
  const preference=matchMedia('(prefers-reduced-motion: reduce)'),running=new Map();
  const ease='cubic-bezier(.2,.8,.2,1)';let pageFrame=0,direction=1;
  function cancel(element){const animation=running.get(element);if(animation){running.delete(element);animation.cancel();}}
  function animate(element,frames,options={},finish){
    if(!element)return finish?.();cancel(element);
    if(preference.matches||!element.animate){finish?.();return null;}
    const animation=element.animate(frames,{duration:300,easing:ease,...options});running.set(element,animation);
    animation.finished.then(()=>{if(running.get(element)!==animation)return;running.delete(element);finish?.();}).catch(()=>{});return animation;
  }
  function enter(element,type='fade'){
    const frames=type==='sheet'?[{transform:'translateY(100%)',borderRadius:'22px 22px 0 0'},{transform:'translateY(0)',borderRadius:'0'}]:type==='side'?[{opacity:0,transform:'translateX(32px)'},{opacity:1,transform:'translateX(0)'}]:[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}];
    return animate(element,frames,{duration:type==='sheet'?410:240});
  }
  function leave(element,type,finish){return animate(element,type==='sheet'?[{transform:'translateY(0)',borderRadius:'0'},{transform:'translateY(100%)',borderRadius:'22px 22px 0 0'}]:[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(35px)'}],{duration:240},finish);}
  function page(){cancelAnimationFrame(pageFrame);pageFrame=requestAnimationFrame(()=>enter(document.querySelector('.main-content')));}
  function track(root,oldCover){
    if(preference.matches)return;
    const art=root.querySelector('#om-mp-art'),current=root.querySelector('#om-mp-cover');
    if(art&&current&&root.dataset.tab==='cover'&&oldCover){
      art.querySelectorAll('[data-om-track-ghost]').forEach(node=>node.remove());
      const ghost=document.createElement('img');ghost.src=oldCover;ghost.alt='';ghost.setAttribute('aria-hidden','true');ghost.dataset.omTrackGhost='';ghost.className='om-track-ghost';art.append(ghost);
      animate(ghost,[{transform:'translateX(0)'},{transform:`translateX(${-direction*110}%)`}],{duration:350},()=>ghost.remove());
      animate(current,[{transform:`translateX(${direction*110}%)`},{transform:'translateX(0)'}],{duration:350});
    }
    enter(root.querySelector('.om-mp-track'));direction=1;
  }
  function layout(root,update){
    const old=root.dataset.tab==='lyrics'?root.querySelector('#om-mp-mini-cover'):root.querySelector('#om-mp-art');
    const from=old?.getBoundingClientRect(),url=root.querySelector('#om-mp-cover')?.src;
    update();if(preference.matches||!from?.width||!url)return;
    const target=root.dataset.tab==='lyrics'?root.querySelector('#om-mp-mini-cover'):root.querySelector('#om-mp-art'),to=target?.getBoundingClientRect();if(!to?.width)return;
    root.querySelectorAll('.om-artwork-flight').forEach(node=>node.remove());
    const ghost=document.createElement('img');ghost.src=url;ghost.alt='';ghost.className='om-artwork-flight';ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});root.append(ghost);
    animate(ghost,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`,opacity:.85}],{duration:330},()=>ghost.remove());
    enter(root.querySelector(root.dataset.tab==='lyrics'?'#om-mp-lyrics':'.om-mp-art'));
  }
  function bindGestures(surface,{horizontal=false,dismiss=false,onNext,onPrevious,onDismiss}={}){
    if(!surface)return;let drag=null,suppressUntil=0;
    surface.addEventListener('dragstart',event=>event.preventDefault());
    surface.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button>0||event.target.closest('button,input,a,[data-mq-handle],#lyrics-container'))return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),dx:0,dy:0,axis:null};
    });
    surface.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId)return;drag.dx=event.clientX-drag.x;drag.dy=event.clientY-drag.y;
      if(!drag.axis&&Math.hypot(drag.dx,drag.dy)>10)drag.axis=Math.abs(drag.dx)>Math.abs(drag.dy)?'x':'y';
      if(drag.axis==='x'&&horizontal){event.preventDefault();surface.style.translate=(drag.dx*.45)+'px 0';surface.setPointerCapture?.(event.pointerId);}
      else if(drag.axis==='y'&&dismiss&&drag.dy>0){event.preventDefault();surface.style.translate='0 '+(drag.dy*.5)+'px';surface.setPointerCapture?.(event.pointerId);}
    });
    function reset(event,cancelled=false){
      if(!drag||event.pointerId!==drag.id)return;const d=drag;drag=null;surface.style.removeProperty('translate');
      if(cancelled)return;const elapsed=Math.max(1,performance.now()-d.time);
      if(d.axis==='x'&&horizontal&&(Math.abs(d.dx)>65||(Math.abs(d.dx)>28&&Math.abs(d.dx)/elapsed>.6))){suppressUntil=performance.now()+400;direction=d.dx<0?1:-1;(d.dx<0?onNext:onPrevious)?.();}
      else if(d.axis==='y'&&dismiss&&d.dy>85&&Math.abs(d.dy)>Math.abs(d.dx)*1.3){suppressUntil=performance.now()+400;onDismiss?.();}
      else if(d.axis)enter(surface);
    }
    surface.addEventListener('pointerup',event=>reset(event));surface.addEventListener('pointercancel',event=>reset(event,true));
    surface.addEventListener('click',event=>{if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
  }
  function wrap(name,after){const before=window[name];if(typeof before!=='function')return;window[name]=function(){const result=before.apply(this,arguments);after.apply(this,arguments);return result;};}
  for(const name of ['omDetailView','omShowHome'])wrap(name,page);
  wrap('omShowDialog',()=>enter(document.querySelector('#om-dialog-backdrop .om-dialog')));
  wrap('openOptions',()=>enter($om('optionsModal')));
  wrap('omToggleProfile',()=>{if(!$om('om-profile-menu').hidden)enter($om('om-profile-menu'));});
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||preference.matches||button.disabled)return;
    if(button.getAttribute('aria-pressed')==='true'||button.classList.contains('om-setting-switch'))animate(button,[{scale:1},{scale:1.12,offset:.45},{scale:1}],{duration:260});
  });
  preference.addEventListener?.('change',()=>{if(preference.matches)for(const animation of running.values())animation.finish();});
  window.OMMotion={animate,enter,leave,cancel,track,layout,bindGestures,setDirection:value=>direction=value<0?-1:1,get reduced(){return preference.matches;}};
  const previous=window.prevSong;window.prevSong=function(){direction=-1;return previous.apply(this,arguments);};
  window.dispatchEvent(new Event('omusic-motion-ready'));
})();
