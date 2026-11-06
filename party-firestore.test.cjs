/* Opcional: FIRESTORE_EMULATOR_HOST + paquetes de Firebase instalados para las pruebas. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
if(!process.env.FIRESTORE_EMULATOR_HOST){test('permisos de Amigos y Party (requiere emulador de Firestore)',{skip:true},()=>{});}
else{
  const modules=process.env.OMUSIC_EMULATOR_MODULES||__dirname;
  const {initializeTestEnvironment,assertSucceeds,assertFails}=require(require.resolve('@firebase/rules-unit-testing',{paths:[modules]}));
  const {doc,setDoc,getDoc,getDocs,updateDoc,deleteDoc,collection,query,where,serverTimestamp,Timestamp,runTransaction}=require(require.resolve('firebase/firestore',{paths:[modules]}));
  const rules=fs.readFileSync(path.join(__dirname,'firestore.rules'),'utf8');
  const vm=require('node:vm'),ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'omusic-party-core.js'),'utf8'),ctx);const C=ctx.window.OMPartyCore;
  let env;const id='AB12CD34EF56',databases=new Map();const db=uid=>{if(!databases.has(uid))databases.set(uid,env.authenticatedContext(uid).firestore());return databases.get(uid);};
  const profile=uid=>({ownerId:uid,name:uid,handle:uid,bio:'',website:'',photo:'',banner:'',isPublic:true,updatedAt:1});
  async function seed(){await env.withSecurityRulesDisabled(async context=>{const store=context.firestore();for(const uid of ['host','guest','guest2','outsider'])await setDoc(doc(store,'publicProfiles',uid),profile(uid));});}
  function room(){return {hostId:'host',name:'Party de prueba',status:'active',memberIds:['host'],queue:['song-a'],index:0,trackUrl:'song-a',playing:false,position:0,anchorMs:Date.now(),revision:0,updatedAt:serverTimestamp(),heartbeatAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+60*60*1000)};}
  async function friendship(target='guest'){
    const f=doc(db('host'),'friendships',['host',target].sort().join('~'));await setDoc(f,{from:'host',to:target,members:['host',target],status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});await updateDoc(doc(db(target),f.path),{status:'accepted',updatedAt:serverTimestamp()});
  }
  async function create(){await setDoc(doc(db('host'),'parties',id),room());}
  async function invite(target='guest'){
    await friendship(target);const r=(await getDoc(doc(db('host'),'parties',id))).data();await setDoc(doc(db('host'),'partyInvites',target,'items',id),{from:'host',to:target,partyId:id,name:r.name,createdAt:serverTimestamp(),expiresAt:r.expiresAt});
  }
  async function join(uid='guest'){
    await runTransaction(db(uid),async tx=>{const ref=doc(db(uid),'parties',id),r=(await tx.get(ref)).data();tx.update(ref,{memberIds:[...r.memberIds,uid],updatedAt:serverTimestamp()});});
  }
  test.before(async()=>{const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');env=await initializeTestEnvironment({projectId:'demo-omusic',firestore:{host,port:Number(port),rules}});});
  test.beforeEach(async()=>{await env.clearFirestore();await seed();});test.after(async()=>env?.cleanup());
  test('solo el destinatario acepta una amistad y su lista queda privada',async()=>{
    const ref=doc(db('host'),'friendships','guest~host');await assertSucceeds(setDoc(ref,{from:'host',to:'guest',members:['host','guest'],status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(ref,{status:'accepted',updatedAt:serverTimestamp()}));await assertSucceeds(updateDoc(doc(db('guest'),ref.path),{status:'accepted',updatedAt:serverTimestamp()}));
    await assertFails(getDoc(doc(db('outsider'),ref.path)));await assertSucceeds(getDocs(query(collection(db('guest'),'friendships'),where('members','array-contains','guest'))));
  });
  test('un desconocido no puede leer parties, invitarse ni enumerarlas',async()=>{
    await create();await assertFails(getDoc(doc(db('outsider'),'parties',id)));await assertFails(getDocs(collection(db('host'),'parties')));
    await assertFails(setDoc(doc(db('outsider'),'partyInvites','outsider','items',id),{from:'host',to:'outsider',partyId:id,name:'Party',createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+30000)}));
    await assertFails(updateDoc(doc(db('outsider'),'parties',id),{memberIds:['host','outsider'],updatedAt:serverTimestamp()}));
  });
  test('un invitado entra y añade una canción, pero no toma el control ni reescribe la cola',async()=>{
    await create();await invite();await assertSucceeds(join());const guest=db('guest'),ref=doc(guest,'parties',id),r=(await getDoc(ref)).data();
    await assertFails(updateDoc(ref,{playing:true,anchorMs:Date.now(),revision:r.revision+1,updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(ref,{hostId:'guest',revision:r.revision+1,updatedAt:serverTimestamp()}));
    await assertSucceeds(updateDoc(ref,{queue:[...r.queue,'song-b'],revision:r.revision+1,updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(ref,{queue:['evil','song-b','song-c'],revision:r.revision+2,updatedAt:serverTimestamp()}));
    await assertFails(deleteDoc(ref));
  });
  test('los participantes suman canciones concurrentes sin perder ninguna',async t=>{
    await create();await invite();await invite('guest2');await join();t.diagnostic('Primer invitado dentro.');await join('guest2');t.diagnostic('Segundo invitado dentro.');
    await Promise.all(['guest','guest2'].map(uid=>C.retryTransaction(report=>runTransaction(db(uid),async tx=>{const ref=doc(db(uid),'parties',id),r=(await tx.get(ref)).data();report(r);tx.update(ref,{queue:[...r.queue,'song-'+uid],revision:r.revision+1,updatedAt:serverTimestamp()});}),async()=>(await getDoc(doc(db(uid),'parties',id))).data())));
    const r=(await getDoc(doc(db('host'),'parties',id))).data();assert.equal(r.queue.length,3);assert.ok(r.queue.includes('song-guest'));assert.ok(r.queue.includes('song-guest2'));
  });
  test('el anfitrión controla la música y no puede añadir miembros sin invitación',async()=>{
    await create();const ref=doc(db('host'),'parties',id);await assertSucceeds(updateDoc(ref,{playing:true,revision:1,anchorMs:Date.now()+1200,heartbeatAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(ref,{memberIds:['host','outsider'],revision:2,heartbeatAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertSucceeds(updateDoc(ref,{playing:false,status:'ended',revision:2,heartbeatAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(ref,{status:'active',revision:3,heartbeatAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  });
  test('presencia y salida son propias y el invitado deja de poder escribir',async()=>{
    await create();await invite();await join();const guest=db('guest');
    await assertSucceeds(setDoc(doc(guest,'parties',id,'presence','guest'),{uid:'guest',ready:true,seenAt:serverTimestamp()}));
    await assertFails(setDoc(doc(guest,'parties',id,'presence','host'),{uid:'host',ready:true,seenAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(guest,'parties',id),{memberIds:['guest'],updatedAt:serverTimestamp()}));
    await assertSucceeds(updateDoc(doc(guest,'parties',id),{memberIds:['host'],updatedAt:serverTimestamp()}));
    await assertFails(setDoc(doc(guest,'parties',id,'presence','guest'),{uid:'guest',ready:true,seenAt:serverTimestamp()}));
  });
  test('el reloj es privado y solo admite una marca del servidor',async()=>{
    const ref=doc(db('guest'),'partyClocks','guest');await assertSucceeds(setDoc(ref,{at:serverTimestamp()}));await assertFails(setDoc(ref,{at:Timestamp.fromMillis(0)}));await assertFails(getDoc(doc(db('host'),ref.path)));
  });
  test('un miembro puede aportar la primera canción a una cola vacía',async()=>{
    await setDoc(doc(db('host'),'parties',id),{...room(),queue:[],index:-1,trackUrl:''});await invite();await join();
    await assertSucceeds(updateDoc(doc(db('guest'),'parties',id),{queue:['song-first'],index:0,trackUrl:'song-first',revision:1,updatedAt:serverTimestamp()}));
  });
}
