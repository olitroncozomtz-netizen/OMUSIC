const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'.');
function setup(saved={},darkSystem=false){
  const memory=new Map(Object.entries(saved)),listeners={},systemListeners=[];
  function element(){return {dataset:{},style:{setProperty(name,value){this[name]=value;}},setAttribute(){},addEventListener(){}};}
  const root=element(),mobile=element(),system={matches:darkSystem,addEventListener:(name,fn)=>systemListeners.push(fn)};
  const document={documentElement:root,getElementById:id=>id==='om-mobile-player'?mobile:null,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}};
  const audio={paused:true,currentTime:37,src:'unchanged.flac',addEventListener(){}};
  const context={document,audio,currentSong:null,localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)},matchMedia:()=>system,addEventListener:(name,fn)=>(listeners[name]||=[]).push(fn),dispatchEvent:event=>(listeners[event.type]||[]).forEach(fn=>fn(event)),CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},omSyncPlayer(){},$om:document.getElementById,OMSettings:{text:es=>es},esc:value=>String(value),icon:name=>`<svg>${name}</svg>`};context.window=context;
  vm.createContext(context);const run=code=>vm.runInContext(code,context);
  for(const name of ['canciones.js','omusic-cover-colors.js','omusic-cover-palette.js','omusic-theme.js','omusic-appearance.js']){run(fs.readFileSync(path.join(base,name),'utf8'));if(name==='canciones.js')run("const albumsOM=[...new Set(songs.map(s=>s.album).filter(Boolean))].map(name=>({name,cover:songs.find(s=>s.album===name).cover}));");}
  return {context,run,root,mobile,memory,audio,systemChange:value=>{system.matches=value;systemListeners.forEach(fn=>fn());}};
}
test('la misma portada da un fondo uniforme de color en claro y oscuro para los dos reproductores',()=>{
  const h=setup(),item=h.run("songs.find(s=>s.title==='SAMSA')"),palette=h.context.OMCoverPalette.get(item.cover);h.context.OMAppearance.follow(item);
  assert.equal(h.root.style['--om-song-bg'],`rgb(${palette.dark})`);assert.equal(h.mobile.style['--om-mp-rgb'],palette.dark);h.context.OMTheme.set('light');assert.equal(h.root.style['--om-song-bg'],`rgb(${palette.light})`);assert.equal(h.mobile.style['--om-mp-light-rgb'],palette.light);assert.equal(h.root.dataset.theme,'light');
});
test('al cambiar de portada cambian ambos colores del reproductor de PC y móvil',()=>{
  const h=setup();h.context.OMAppearance.follow(h.run("songs.find(s=>s.title==='SAMSA')"));const before=h.root.style['--om-song-dark'];h.context.OMAppearance.follow(h.run("songs.find(s=>s.title==='SICHEF.')"));assert.notEqual(h.root.style['--om-song-dark'],before);assert.equal(h.root.style['--om-song-light'],`rgb(${h.mobile.style['--om-mp-light-rgb']})`);
});
test('la paleta manual cambia la interfaz sin cambiar el fondo del álbum en claro ni oscuro',()=>{
  const h=setup(),item=h.run("songs.find(s=>s.title==='SICHEF.')");h.context.OMAppearance.follow(item);
  for(const theme of ['dark','light']){
    h.context.OMTheme.set(theme);const before=h.root.style['--om-song-bg'],mobile=h.mobile.style['--om-mp-rgb'];
    h.context.OMAppearance.set('dynamic',false);h.context.OMAppearance.set('palette','blue');
    const accent=h.root.style['--om-ap-accent'];h.context.OMAppearance.set('palette','rose');
    assert.notEqual(h.root.style['--om-ap-accent'],accent);assert.equal(h.root.style['--om-song-bg'],before);assert.equal(h.mobile.style['--om-mp-rgb'],mobile);
    h.context.OMAppearance.set('dynamic',true);assert.equal(h.root.style['--om-song-bg'],before);
  }
});
test('dos canciones del mismo álbum conservan su fondo aunque tengan distintas portadas individuales',()=>{
  const h=setup(),item=h.run("songs.find(s=>s.title==='SAMSA')"),other=h.run("songs.find(s=>s.title==='SICHEF.')");h.context.OMAppearance.follow(item);const before=h.root.style['--om-song-bg'];
  h.context.OMAppearance.set('palette','violet');h.context.OMAppearance.follow({...item,url:'another-track',cover:other.cover});assert.equal(h.root.style['--om-song-bg'],before);
  h.context.OMAppearance.follow(other);assert.notEqual(h.root.style['--om-song-bg'],before);
});
test('al recargar con color dinámico desactivado el fondo sigue al álbum actual',()=>{
  const h=setup({omusic_appearance_v1:JSON.stringify({dynamic:false,palette:'amber'})}),item=h.run("songs.find(s=>s.title==='SAMSA')");h.context.OMAppearance.follow(item);
  assert.equal(h.root.style['--om-song-bg'],`rgb(${h.context.OMCoverPalette.get(item.cover).dark})`);
});
test('Sistema sigue los cambios del dispositivo; elegir Claro lo mantiene fijo',()=>{
  const h=setup({},true);h.context.OMTheme.set('system');assert.equal(h.root.dataset.theme,'dark');h.systemChange(false);assert.equal(h.root.dataset.theme,'light');assert.equal(h.context.OMTheme.mode,'system');h.context.OMTheme.set('light');h.systemChange(true);assert.equal(h.root.dataset.theme,'light');
});
test('se restauran tema, paleta, AMOLED y fuente del sistema al recargar',()=>{
  const h=setup();h.context.OMTheme.set('light');h.context.OMAppearance.set('palette','rose');h.context.OMAppearance.set('amoled',true);h.context.OMAppearance.set('systemFont',true);const next=setup(Object.fromEntries(h.memory));assert.equal(next.root.dataset.theme,'light');assert.equal(next.context.OMAppearance.prefs.palette,'rose');assert.equal(next.root.dataset.systemFont,'true');assert.equal(next.root.dataset.amoled,'false');next.context.OMTheme.set('dark');assert.equal(next.root.dataset.amoled,'true');
});
test('la apariencia no modifica el audio ni la posición ni el estado de pausa',()=>{
  const h=setup();h.context.OMTheme.set('system');h.context.OMAppearance.set('palette','violet');h.context.OMAppearance.set('amoled',true);h.context.OMAppearance.set('systemFont',true);assert.deepEqual([h.audio.src,h.audio.currentTime,h.audio.paused],['unchanged.flac',37,true]);
});
test('la pantalla muestra las opciones solicitadas sin los estilos excluidos',()=>{
  const h=setup(),html=h.context.OMAppearance.markup();for(const label of ['Color dinámico','Sistema','Claro','Oscuro','AMOLED oscuro','Usar la fuente del sistema'])assert.ok(html.includes(label));assert.doesNotMatch(html,/Material|Mornye/i);assert.equal((html.match(/data-ap-palette=/g)||[]).length,6);
});
test('los valores de apariencia inválidos se normalizan y nunca entran en CSS',()=>{
  const h=setup({omusic_theme:'invalid',omusic_appearance_v1:JSON.stringify({palette:'url(javascript:alert(1))',amoled:'true',systemFont:'true'})});assert.equal(h.context.OMAppearance.prefs.palette,'green');assert.equal(h.root.dataset.theme,'dark');assert.equal(h.root.dataset.systemFont,'false');assert.doesNotMatch(h.root.style['--om-song-bg'],/url|javascript/);
});
