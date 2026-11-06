# OMUSIC para GitHub Pages

El ZIP incluye todos los archivos en un solo nivel, sin carpetas. La página se publica directamente con GitHub Pages, sin compilación.

## Subir a GitHub

1. Extrae este ZIP en tu computadora.
2. Abre tu repositorio en GitHub y selecciona **Add file → Upload files**.
3. Selecciona todos los archivos extraídos y súbelos juntos. `index.html` debe quedar en la raíz del repositorio.
4. Guarda con **Commit changes**.
5. En **Settings → Pages → Build and deployment**, selecciona **Deploy from a branch**, la rama **main** y la carpeta **/(root)**. Pulsa **Save**.
6. Abre el enlace que GitHub muestre cuando termine la publicación.

El archivo `.nojekyll` ya viene incluido para servir los archivos directamente; no necesitas compilar la página.

El único catálogo de canciones es `canciones.js`, actualizado con los datos de `canciones(3).js`. `videos.js` conserva el catálogo de videos y `track-durations.js` contiene las duraciones.

Si reemplazas una versión anterior, usa estos archivos actualizados. Los archivos de versiones anteriores, como `canciones(1).js` o `canciones(2).js`, no se utilizan en esta entrega.

## Firebase y Google

El código sigue conectado al proyecto `omusic4-0` desde `firebase-config.js`, en el objeto `window.OMUSIC_FIREBASE_CONFIG`.

1. En Firebase abre **Authentication → Configuración → Dominios autorizados → Agregar dominio**.
2. Agrega el dominio que te muestre GitHub Pages. Ejemplo: si la página es `https://TU_USUARIO.github.io/OMUSIC/`, autoriza solamente `TU_USUARIO.github.io`, sin `https://`, sin `/OMUSIC/` y sin puerto.
3. Conserva Google habilitado en **Authentication → Método de acceso**.
4. Conserva `authDomain` con el valor de tu configuración de Firebase; agregar el dominio autorizado no requiere cambiarlo por el de GitHub.
5. Las reglas se administran en **Firestore → Reglas**. El archivo de referencia es `firestore.rules`. Consulta también `ACTIVAR_PLAYLISTS_PUBLICAS.txt`.

Si utilizas otro proyecto de Firebase, reemplaza la configuración web dentro de `firebase-config.js` por los valores completos de ese proyecto.

## Modo claro y oscuro

Usa el botón de sol o luna, arriba junto al perfil. La elección se guarda en este navegador y se restaura al recargar. El modo oscuro es la apariencia inicial. Cambiar de modo no interrumpe la reproducción.

## Editar canciones

Edita solamente `canciones.js`, manteniendo la declaración `const songs = [...]`. Cada canción tiene título, artista, URL de audio y portada, además de los campos opcionales del catálogo. En colaboraciones, separa los nombres de artistas con comas.

El archivo adjunto incluía una entrada sin título ni audio. Se conserva dentro de los datos del archivo, pero se omite al cargar el catálogo para no mostrar una canción vacía. Hay 365 canciones con título.

## Probar en tu computadora

Extrae todo el ZIP y abre `index.html` con doble clic. Puedes navegar y reproducir música o videos como invitado; la reproducción de archivos remotos necesita internet. La copia local conserva la navegación interna sin intentar cambiar la ruta del archivo en tu computadora.

Para iniciar sesión con tu cuenta y compartir enlaces públicos, usa la página publicada o súbela a GitHub Pages con los pasos anteriores. También puedes usar **Open with Live Server** en Visual Studio Code para servir los archivos durante el desarrollo.

Si tienes Python en Windows, otra opción es ejecutar en esta carpeta:

```bash
py -m http.server 8000
```

Después abre `http://localhost:8000`. Para Google en desarrollo, autoriza `localhost` en Firebase.

## Qué datos se conservan

Los perfiles y playlists guardados en Firebase siguen vinculados a la misma cuenta. Los favoritos, historial y artistas seguidos se guardan actualmente en el navegador por dominio y no se trasladan automáticamente desde la dirección anterior de OMUSIC. Lo mismo ocurre con las playlists del modo invitado.

## Archivos de música y video

El ZIP incluye el código y los recursos locales de la página. La música, los videos, las letras y algunas portadas conservan sus enlaces externos. Necesitan conexión a internet y archivos accesibles en sus servicios de origen.

## Pruebas opcionales

Con Node.js instalado, ejecuta `npm test` o `node --test *.test.cjs`. No necesitas instalar paquetes adicionales. La suite incluye pruebas de perfiles, usuarios únicos, enlaces y las funciones existentes. Las pruebas de reglas de Firestore son opcionales y se omiten sin emulador.

## Documentación oficial

- https://docs.github.com/es/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://firebase.google.com/docs/auth/web/google-signin?hl=es-419


## Configuración

Abre tu avatar y elige **Configuración**. El menú también incluye Perfil, Gestionar suscripción, Ayuda, Aviso legal y Cerrar sesión.

- **Cuenta:** editar perfil, datos de la cuenta, estado actual de OMUSIC, notificaciones de reproducción y acceso al cambio de contraseña de Google o GitHub. Esta versión no tiene planes de pago ni cobros configurados.
- **Reproducción:** normalización de volumen, crossfade de 1 a 12 segundos, reproducción automática, filtros de contenido explícito y de IA, y canciones o artistas bloqueados. Puedes bloquear desde las opciones de una canción o buscar en la pantalla Bloqueado.
- **Preferencias:** español o inglés para los ajustes y los principales controles de navegación, modo claro u oscuro, actividad de escucha, información de privacidad y accesibilidad.

Los ajustes se guardan en este navegador por separado para cada cuenta y para el invitado. Las notificaciones requieren permiso y funcionan mientras OMUSIC sigue abierto. El crossfade necesita dos archivos de audio disponibles; no se aplica a los videos ni a la repetición de una sola canción. La normalización usa Web Audio con archivos que permiten CORS.

Los filtros usan etiquetas del catálogo: `explicit: true` o `isExplicit: true` o `contentRating: "explicit"`, y `aiGenerated: true` o `isAI: true` o `generatedByAI: true`. No se deducen estas etiquetas a partir del título ni de la letra. El filtro explícito no incluye videos. Las canciones restringidas aparecen atenuadas y no se reproducen.

Las pruebas automáticas incluyen preferencias por cuenta, privacidad de la actividad, filtros, bloqueos, cola, reproducción automática, crossfade y normalización.


## Amigos y Party

Abre **Amigos** en la barra lateral, en la navegación inferior del celular o desde tu avatar. Busca un @usuario o pega un enlace de perfil público. Las solicitudes deben ser aceptadas por la otra persona.

Desde una tarjeta de amigo o desde **Crear una party**, crea una sala e invita a tus amigos. Hasta 12 cuentas pueden seguir la misma canción y la misma posición. El anfitrión controla reproducción, pausa, saltos y orden; todos los miembros pueden añadir canciones a la cola. Cada dispositivo debe pulsar **Activar audio**. Las parties usan archivos de audio del catálogo; los videos se mantienen en la reproducción individual.

**Para conectar cuentas reales, publica las reglas actualizadas de `firestore.rules` en Firebase > Firestore Database > Reglas.** La publicación de la página no modifica automáticamente tu proyecto de Firebase. Consulta `ACTIVAR_AMIGOS_Y_PARTY.txt`. Las reglas existentes de perfiles y playlists se conservan.

La sincronización usa actualizaciones en tiempo real, un reloj calibrado y corrección de posición. Depende de la conexión y de la disponibilidad del archivo en cada dispositivo. Las preferencias de contenido se respetan por cuenta. Las amistades y las parties son privadas; el enlace solo deja entrar a las cuentas invitadas. La función no hace pública la página alojada en este chat.

## Nuevo reproductor para celular

Pulsa el mini reproductor para abrir la portada grande o animada, controles amplios y progreso. **Letras** muestra el LRC sincronizado, cuando existe; el botón junto a Letras permite ocultar los controles para leer más líneas. La cola tiene las pestañas **Reproducir cola** y **Canciones sugeridas**. Puedes añadir sugerencias, mover canciones arrastrando el asa y usar las opciones Subir/Bajar/Quitar. Compartir crea un enlace a una canción de OMUSIC.

Los modos claro y oscuro también se aplican a Amigos, Party y al reproductor móvil.

Las pruebas básicas se ejecutan con `npm test` y no requieren compilar la página. Las pruebas opcionales de reglas requieren el emulador de Firestore y las dependencias de desarrollo de Firebase; `party-firestore.test.cjs` se omite cuando no está configurado `FIRESTORE_EMULATOR_HOST`.


## Compartir canciones, álbumes y artistas

Abre las opciones de una canción y pulsa **Compartir canción**; también puedes usar el botón de compartir del reproductor móvil. En las páginas de álbumes y artistas encontrarás **Compartir**. En celular se usa el menú del dispositivo cuando está disponible; en escritorio se muestra el enlace para copiar.

Los enlaces abren exactamente el contenido compartido sin iniciar audio automáticamente. Conservan la ruta de GitHub Pages y no incluyen parámetros de la sesión. Comparte desde la página donde quieras que tus amigos escuchen la música. El sitio privado de este chat sigue requiriendo acceso; tu publicación pública en GitHub Pages usa sus propios enlaces.

## Fondos según el álbum, en celular y PC

El reproductor, las letras y la cola tienen un fondo uniforme de un solo color basado en la portada del álbum actual. El color cambia al elegir otro álbum y tiene una variante para el modo claro. Las portadas actuales ya tienen sus colores medidos para que el fondo también funcione cuando el servicio de imágenes no permite leer sus píxeles desde el navegador.


## Apariencia y animaciones

En **Configuración → Apariencia** puedes elegir **Sistema**, **Claro** u **Oscuro**, activar **AMOLED oscuro** y usar la fuente del sistema. **Color dinámico** controla solo los acentos de la interfaz. Si lo desactivas, aparecen seis paletas manuales. El fondo de la música conserva siempre el color de la portada del álbum; no usa la paleta manual. Funciona en la barra, la portada ampliada, las letras y la cola de celular, y en PC, con variantes clara y oscura.

Se mantienen las transiciones entre vistas, los gestos de la portada y las preferencias de movimiento reducido del dispositivo. Los controles del modo completo de video desaparecen tras unos segundos y reaparecen al tocar, mover el ratón o usar el teclado.

## APK de Android

La entrega incluye el APK firmado **OMUSIC.apk** por separado, para Android 8 o posterior. Contiene la misma página con sus catálogos y recursos locales. La música, videos, portadas remotas, letras, cuentas y parties siguen necesitando Internet.

Google y GitHub se abren en el navegador del sistema; después de acceder, pulsa **Volver a OMUSIC**. El retorno a la app está cifrado y se acepta una sola vez. En **Configuración → Preferencias → Sitio web para compartir** del APK puedes cambiar la dirección inicial por tu publicación en GitHub Pages. Publica también `android-auth.html`, `omusic-android-auth.js` y `firebase-config.js`, que ya vienen en este ZIP; autoriza el dominio de tu publicación en Firebase.

Los archivos de Android también están en la raíz: `MainActivity.java`, `PlaybackService.java`, `AndroidManifest.xml`, `styles.xml`, `ic_launcher.xml` y `build-android.py`. No se necesita compilar nada para GitHub Pages: esos archivos sirven solamente para reconstruir el APK. Consulta `ANDROID_LEEME.txt`. La clave de firma se guarda por separado y no está en el ZIP ni en la página.

El APK ha sido compilado, alineado y verificado con las herramientas oficiales de Android. Todavía requiere prueba de instalación y acceso real en un dispositivo Android. Los datos locales del navegador y del APK son independientes; los perfiles y playlists en Firebase usan la misma cuenta.


## Usuarios únicos y enlaces de perfil

Los perfiles se comparten como `https://TU_USUARIO.github.io/OMUSIC/user/@OliverM` o `https://tudominio.com/user/@OliverM`. El nombre del repositorio se conserva si publicas en una subcarpeta. La escritura de `OliverM` conserva sus mayúsculas; `OliverM`, `oliverm` y `OLIVERM` corresponden al mismo usuario. El campo **Nombre** es el nombre visible y el campo **Nombre de usuario** identifica tu enlace.

**Para activar esta actualización:**

1. Sube todos los archivos del ZIP a tu publicación, incluido **404.html**, junto a **index.html**. En GitHub Pages, la página 404 recupera los enlaces directos de perfil y restaura la dirección limpia al abrirlos o recargarlos. Si usas un servidor distinto, configura la ruta `/user/@usuario` para servir `index.html` o la página `404.html` del proyecto, conservando la ruta solicitada.
2. En tu proyecto Firebase, abre **Firestore Database → Reglas** y publica el contenido actualizado de **firestore.rules**. Conserva los bloques de otras aplicaciones si las hubiera. Este paso es indispensable: subir la página no publica las reglas.
3. Recarga OMUSIC e inicia sesión. Ve a **Perfil → Editar perfil**, escribe tu nombre de usuario y guarda. Se indica si está disponible. Pulsa **Compartir** para publicar el perfil y copiar su enlace.

Cada cuenta reserva un nombre de 1 a 30 letras ASCII, números o guiones bajos. La comprobación final se hace en una transacción de Firebase y las reglas también bloquean duplicados y reservas de otra persona. Se necesita conexión para guardar un usuario de cuenta; no se confirma una reserva solo en el navegador. Los invitados conservan borradores locales y necesitan iniciar sesión para reservar y compartir.

Las cuentas existentes reservan su usuario al volver a iniciar sesión. Si ya estaba ocupado, se agrega un sufijo y aparece un aviso; pueden elegir otro desde Editar perfil. No es una migración masiva de cuentas que todavía no han vuelto a abrir OMUSIC. Los enlaces anteriores `#profile=ID` siguen funcionando con los perfiles que continúan públicos.

Cambiar el nombre de usuario actualiza el enlace y libera el anterior; no se mantiene una redirección del nombre antiguo. Dejar de compartir retira el perfil público y conserva reservado su usuario. La búsqueda de Amigos usa la clave sin mayúsculas y acepta los enlaces nuevos. Los perfiles antiguos aparecen en la búsqueda nueva después de reservar su usuario al volver a entrar.

La colección **userHandles/{usuario_en_minúsculas}** guarda solamente el propietario y el nombre de usuario. Los perfiles privados y públicos incluyen **handleKey** para validar la reserva. Los datos de perfil y su reserva se actualizan juntos, incluidos los cambios de nombre y de visibilidad.

Las pruebas nuevas están en `profile-routing.test.cjs`, `social-sharing.test.cjs` y `profile-firestore.test.cjs`. Para las pruebas de reglas, instala `firebase@10.12.2` y `@firebase/rules-unit-testing@3` fuera de la publicación, inicia el emulador de Firestore y configura `FIRESTORE_EMULATOR_HOST` y, si corresponde, `OMUSIC_EMULATOR_MODULES` con la carpeta de las dependencias.

Referencias oficiales:
- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site


## Animación de letras en celular

En pantallas de hasta 768 px, abre el reproductor y pulsa **Letras**. La frase actual se ilumina con un aumento discreto, las anteriores se atenúan y el desplazamiento avanza suavemente con un pequeño desfase entre las líneas visibles. Funciona con las marcas de tiempo de los archivos LRC de cada canción. No se inventan tiempos por palabra cuando el archivo solo contiene tiempos por línea.

Puedes desplazarte para leer otras partes: el seguimiento vuelve después de unos segundos. Tocar una frase conserva el salto a su momento. La animación se suspende cuando abres la cola, cierras las letras o dejas la pestaña en segundo plano. La preferencia de movimiento reducido elimina el desplazamiento animado. La vista de escritorio conserva su presentación y sincronización.

Los archivos nuevos son `omusic-mobile-lyrics.js` y `omusic-mobile-lyrics.css`. Se cargan desde `index.html` y se integran con el reproductor móvil. No hace falta cambiar Firebase para esta animación.


## Actualización para PC
Selección rápida elige nueve canciones diferentes al azar del catálogo cada vez que vuelves a Inicio o recargas. En PC, el video se abre en una vista amplia con Videos similares y Créditos. La barra usa transparencia neutra, también al minimizar, sin el color de la portada. Se conservan la misma reproducción y posición al cambiar de vista. Los créditos muestran únicamente los datos disponibles. La resolución indica la del archivo; no simula calidades que no existen. Las transiciones del reproductor ampliado y sus paneles respetan movimiento reducido.

## Direcciones de artistas, canciones y álbumes

La dirección del navegador cambia al abrir un artista (`/artist/nsqk`), un álbum (`/album/omakase`) o elegir una canción (`/song/samsa-nsqk--gsre3v`). El identificador final distingue archivos con títulos iguales. Compartir usa estas mismas direcciones. Los enlaces anteriores siguen funcionando y los enlaces de perfil conservan `/user/@Nombre`.

Se puede abrir, copiar y recargar cada enlace, y usar Atrás y Avanzar. Abrir un enlace compartido muestra el contenido sin iniciar el audio automáticamente. Seleccionar música conserva la vista y el contexto de reproducción; los cambios automáticos de canción no agregan entradas de historial.

No necesitas carpetas para estas direcciones. En GitHub Pages, `404.html` abre la página principal y recupera automáticamente el artista, canción, álbum, video o perfil solicitado, incluso al recargar y cuando el repositorio se publica bajo `/OMUSIC/`. Conserva `404.html` junto a `index.html`. Si agregas canciones o videos, edita sus catálogos; no hay que generar carpetas ni cambiar Firebase.


## Videos en los perfiles de artistas

Debajo de la discografía aparecen todos los videos en los que el artista tiene crédito en `videos.js`, incluidas sus colaboraciones. Puedes reproducirlos o agregarlos a la cola desde el perfil. Los nombres se comparan completos, sin importar mayúsculas o acentos; no se incluyen videos de artistas con nombres solo parecidos. En las colaboraciones, separa los artistas con comas. Si el artista no tiene videos, la sección no aparece.

## Entrega sin carpetas

Todos los estilos, scripts, imágenes, reglas de Firebase y archivos de referencia están en el mismo nivel que `index.html`. Las rutas de imágenes y descargas ya apuntan a esos archivos. No subas el ZIP cerrado: extráelo y sube su contenido. Para ejecutar las pruebas opcionales, usa `npm test` con Node.js; no hace falta instalar paquetes para las pruebas normales. Las pruebas de Firestore requieren el emulador descrito arriba.
