/* Estado compartido de las parties. Sin dependencias de la interfaz ni de Firebase. */
(() => {
  'use strict';
  const MAX_MEMBERS=12,MAX_QUEUE=100,START_DELAY=1200,STALE_MS=45000;
  const roomId=value=>typeof value==='string'&&/^[A-F0-9]{12}$/.test(value);
  const uid=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
  const pair=(a,b)=>[a,b].sort().join('~');
  const ms=value=>typeof value?.toMillis==='function'?value.toMillis():Number(value)||0;
  function target(room,now,duration=86400){
    const elapsed=room.playing?Math.max(0,(now-room.anchorMs)/1000):0;
    return Math.min(Number.isFinite(duration)&&duration>0?duration:86400,Math.max(0,Number(room.position)||0)+elapsed);
  }
  function valid(room){
    return !!room&&uid(room.hostId)&&typeof room.name==='string'&&room.name.length>0&&room.name.length<=60&&['active','ended'].includes(room.status)
      &&Array.isArray(room.memberIds)&&room.memberIds.includes(room.hostId)&&room.memberIds.length<=MAX_MEMBERS&&new Set(room.memberIds).size===room.memberIds.length&&room.memberIds.every(uid)
      &&Array.isArray(room.queue)&&room.queue.length<=MAX_QUEUE&&room.queue.every(u=>typeof u==='string'&&u.length>0&&u.length<=2000)
      &&Number.isInteger(room.index)&&room.index>=-1&&room.index<room.queue.length&&typeof room.trackUrl==='string'
      &&(room.index===-1?room.trackUrl===''&&room.queue.length===0:room.queue[room.index]===room.trackUrl)
      &&typeof room.playing==='boolean'&&(!room.playing||!!room.trackUrl)&&Number.isFinite(room.position)&&room.position>=0&&room.position<=86400
      &&Number.isFinite(room.anchorMs)&&Number.isInteger(room.revision)&&room.revision>=0;
  }
  function create(hostId,name,now,trackUrl=''){
    return {hostId,name:name.trim().slice(0,60)||'Mi party',status:'active',memberIds:[hostId],queue:trackUrl?[trackUrl]:[],index:trackUrl?0:-1,trackUrl,playing:false,position:0,anchorMs:now,revision:0};
  }
  function transition(room,action,options={}){
    if(!valid(room)||room.status!=='active')throw Error('Esta party ya no está disponible.');
    const now=options.now,r={...room,queue:[...room.queue],memberIds:[...room.memberIds],revision:room.revision+1};
    const current=target(room,now);
    const start=(index,position=0)=>{r.index=index;r.trackUrl=r.queue[index];r.position=position;r.playing=true;r.anchorMs=now+START_DELAY;};
    if(action==='enqueue'){
      if(!options.songUrl)throw Error('Elige una canción.');
      if(r.queue.length>=MAX_QUEUE)throw Error('La cola tiene un máximo de 100 canciones.');
      r.queue.push(options.songUrl);
      if(r.index===-1){r.index=0;r.trackUrl=options.songUrl;r.position=0;r.playing=false;r.anchorMs=now;}
    }else if(action==='select'){
      let index=r.queue.indexOf(options.songUrl);
      if(index<0){if(r.queue.length>=MAX_QUEUE)throw Error('La cola está llena.');r.queue.push(options.songUrl);index=r.queue.length-1;}
      start(index);
    }else if(action==='play'){
      if(!r.trackUrl)throw Error('Añade una canción a la party.');start(r.index,current);
    }else if(action==='pause'){r.position=current;r.playing=false;r.anchorMs=now;
    }else if(action==='seek'){r.position=Math.min(86400,Math.max(0,Number(options.position)||0));r.anchorMs=r.playing?now+START_DELAY:now;
    }else if(action==='next'){
      if(r.index+1<r.queue.length)start(r.index+1);else{r.playing=false;r.position=current;r.anchorMs=now;}
    }else if(action==='previous'){
      start(current>3?r.index:Math.max(0,r.index-1));
    }else if(action==='jump'){
      if(!Number.isInteger(options.index)||!r.queue[options.index])throw Error('Canción no encontrada.');start(options.index);
    }else if(action==='move'){
      const {from,to}=options;if(!Number.isInteger(from)||!Number.isInteger(to)||!r.queue[from]||!r.queue[to])throw Error('Posición no disponible.');
      const moved=r.queue.splice(from,1)[0];r.queue.splice(to,0,moved);
      r.index=from===r.index?to:from<r.index&&to>=r.index?r.index-1:from>r.index&&to<=r.index?r.index+1:r.index;
    }else if(action==='remove'){
      if(!Number.isInteger(options.index)||!r.queue[options.index]||options.index===r.index)throw Error('No se puede quitar la canción actual.');
      r.queue.splice(options.index,1);if(options.index<r.index)r.index--;
    }else if(action==='clear'){
      r.queue=r.trackUrl?[r.trackUrl]:[];r.index=r.trackUrl?0:-1;
    }else if(action==='heartbeat'){
      r.position=Math.min(86400,Math.max(0,Number(options.position)||0));r.playing=options.playing===true;r.anchorMs=now;
    }else if(action==='end'){r.status='ended';r.playing=false;r.position=current;r.anchorMs=now;
    }else throw Error('Acción no disponible.');
    if(!valid(r))throw Error('El estado de la party no es válido.');return r;
  }
  function correction(room,now,currentTime,duration){
    const position=target(room,now,duration),drift=position-currentTime;
    return {position,wait:room.playing?Math.max(0,room.anchorMs-now):0,seek:Math.abs(drift)>.9,rate:Math.abs(drift)>.12?1+(drift>0?.03:-.03):1};
  }
  async function retryTransaction(write,readLatest){
    const fingerprint=r=>JSON.stringify([r?.revision,r?.memberIds]);
    for(let attempt=0;attempt<5;attempt++){
      let observed=null;
      try{return await write(room=>{observed=fingerprint(room);});}
      catch(error){
        if(attempt===4||!observed||!['permission-denied','aborted'].includes(error?.code))throw error;
        const latest=await readLatest();
        if(fingerprint(latest)===observed)throw error;
      }
    }
  }
  window.OMPartyCore={MAX_MEMBERS,MAX_QUEUE,START_DELAY,STALE_MS,roomId,uid,pair,ms,target,valid,create,transition,correction,retryTransaction};
})();
