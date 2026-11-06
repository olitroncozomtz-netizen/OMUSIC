/* Paleta uniforme de la portada. Los colores medidos evitan depender del CORS del proveedor. */
(() => {
  'use strict';
  function rgbToHsl(rgb){
    const [r,g,b]=rgb.map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,l=(max+min)/2;
    if(!delta)return [0,0,l];
    const s=delta/(1-Math.abs(2*l-1)),h=(max===r?((g-b)/delta+6)%6:max===g?(b-r)/delta+2:(r-g)/delta+4)/6;
    return [h,s,l];
  }
  function hslToRgb(h,s,l){
    const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h*6)%2-1)),m=l-c/2;
    const rgb=h<1/6?[c,x,0]:h<2/6?[x,c,0]:h<3/6?[0,c,x]:h<4/6?[0,x,c]:h<5/6?[x,0,c]:[c,0,x];
    return rgb.map(v=>Math.round((v+m)*255));
  }
  function fromRgb(rgb){
    const safe=rgb.map(v=>Math.min(255,Math.max(0,Number(v)||0))),[h,s,l]=rgbToHsl(safe);
    const saturation=s<.08?s:Math.min(.58,Math.max(.2,s*.72));
    const dark=hslToRgb(h,saturation,Math.min(.36,Math.max(.23,l*.65)));
    const light=hslToRgb(h,Math.min(.4,saturation*.75),.87);
    return {dark:dark.join(','),light:light.join(',')};
  }
  function dominant(data){
    const bins=new Map();
    for(let i=0;i<data.length;i+=4){if(data[i+3]<150)continue;const rgb=[data[i],data[i+1],data[i+2]],key=rgb.map(v=>v>>5).join(',');const bin=bins.get(key)||{count:0,rgb:[0,0,0]};bin.count++;rgb.forEach((v,j)=>bin.rgb[j]+=v);bins.set(key,bin);}
    let best=null;
    for(const bin of bins.values()){const rgb=bin.rgb.map(v=>v/bin.count),[,s,l]=rgbToHsl(rgb);const score=bin.count*(.55+s)*(l>.1&&l<.9?1:.25);if(!best||score>best.score)best={score,rgb};}
    return best?.rgb||[52,68,59];
  }
  function get(cover){const rgb=window.OM_COVER_COLORS?.[cover];return Array.isArray(rgb)&&rgb.length===3?fromRgb(rgb):null;}
  function apply(root,palette){root.style.setProperty('--om-mp-rgb',palette.dark);root.style.setProperty('--om-mp-light-rgb',palette.light);}
  window.OMCoverPalette={fromRgb,dominant,get,apply};
})();
