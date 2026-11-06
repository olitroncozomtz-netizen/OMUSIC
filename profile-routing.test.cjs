const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').match(/<script id="om-profile-routing">([\s\S]*?)<\/script>/)[1];
const fallback=fs.readFileSync(path.join(__dirname,'404.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function boot(href){
  let base;
  const c={URL,location:{href},document:{createElement:()=>({}),head:{prepend:tag=>base=tag.href}},history:{replaceState:(_,title,url)=>{c.location.href=url;}}};c.window=c;
  vm.createContext(c);vm.runInContext(source,c);return {c,base};
}
test('los enlaces de usuario conservan mayúsculas, dominio y subcarpeta sin datos de sesión',()=>{
  for(const [href,result]of [
    ['https://omusic.test/index.html?secret=x#playlist=old','https://omusic.test/user/@OliverM'],
    ['https://oliver.github.io/OMUSIC/','https://oliver.github.io/OMUSIC/user/@OliverM'],
    ['https://oliver.github.io/OMUSIC/user/@OtraPersona','https://oliver.github.io/OMUSIC/user/@OliverM']
  ])assert.equal(boot(href).c.OMProfileRoutes.link('OliverM'),result);
});
test('al entrar directamente se cargan todos los recursos desde la raíz de OMUSIC',()=>{
  const h=boot('https://oliver.github.io/OMUSIC/user/@OliverM');assert.equal(h.base,'https://oliver.github.io/OMUSIC/');assert.equal(h.c.OMProfileRoutes.parse(),'OliverM');
  assert.equal(h.c.OMProfileRoutes.base().href,'https://oliver.github.io/OMUSIC/');assert.equal(h.c.OMProfileRoutes.parse('https://omusic.test/user/%40OliverM/'),'OliverM');
});
test('GitHub Pages recupera la URL limpia después del salto de 404, también al recargar',()=>{
  for(const prefix of ['/', '/OMUSIC/']){
    let redirect;const c={URL,location:{href:'https://oliver.github.io'+prefix+'user/@OliverM',pathname:prefix+'user/@OliverM',hash:'',replace:url=>redirect=url}};
    vm.runInNewContext(fallback,c);assert.equal(redirect,'https://oliver.github.io'+prefix+'?om_profile=OliverM');
    const h=boot(redirect);assert.equal(h.c.location.href,c.location.href);assert.equal(h.c.OMProfileRoutes.parse(),'OliverM');assert.equal(h.base,'https://oliver.github.io'+prefix);
  }
});
test('las direcciones del APK usan su sitio público y nunca el origen local de Android',()=>{
  const h=boot('https://appassets.androidplatform.net/assets/www/index.html');h.c.OMAndroid={publicBase:'https://oliver.github.io/OMUSIC/'};
  assert.equal(h.c.OMProfileRoutes.link('OliverM'),'https://oliver.github.io/OMUSIC/user/@OliverM');
});
test('los enlaces de música compartidos desde un perfil no incluyen el usuario en su ruta',()=>{
  const h=boot('https://oliver.github.io/OMUSIC/user/@OliverM?session=x');const url=h.c.OMProfileRoutes.base();url.hash='album=OMAKASE';
  assert.equal(url.href,'https://oliver.github.io/OMUSIC/#album=OMAKASE');
});
test('las rutas inválidas no se interpretan como perfiles ni provocan redirecciones',()=>{
  const h=boot('https://omusic.test/');
  for(const value of ['https://omusic.test/user/@','https://omusic.test/user/@Oliver%20M','https://omusic.test/user/@<script>','https://omusic.test/user/@'+ 'x'.repeat(31)])assert.equal(h.c.OMProfileRoutes.parse(value),null);
  assert.throws(()=>h.c.OMProfileRoutes.link('../admin'));assert.equal(boot('https://omusic.test/?om_profile=%3Cscript%3E').c.location.href,'https://omusic.test/?om_profile=%3Cscript%3E');
});

test('artistas, álbumes y canciones usan la raíz correcta en enlaces directos y en el 404',()=>{
  for(const prefix of ['/','/OMUSIC/'])for(const route of ['artist/nsqk','artist/nsqk/albums','album/omakase','song/samsa-nsqk--gsre3v','songs','music']){
    let redirect;const href='https://omusic.test'+prefix+route;
    vm.runInNewContext(fallback,{URL,location:{href,pathname:prefix+route,hash:'',replace:url=>redirect=url}});
    assert.ok(redirect);const restored=boot(redirect);
    assert.equal(restored.c.location.href,href);assert.equal(restored.base,'https://omusic.test'+prefix);
    assert.equal(restored.c.OMProfileRoutes.link('OliverM'),'https://omusic.test'+prefix+'user/@OliverM');
    const direct=boot(href);assert.equal(direct.base,'https://omusic.test'+prefix);
  }
});
test('un parámetro de ruta manipulado no permite salir del sitio',()=>{
  for(const route of ['https://evil.test/artist/nsqk','//evil.test/artist/nsqk','../artist/nsqk','artist/%2E%2E','song/<script>']){
    const href='https://omusic.test/?om_route='+encodeURIComponent(route);assert.equal(boot(href).c.location.href,href);
  }
});
