/* Opcional: verifica las reservas con el SDK y el emulador reales de Firestore. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
if(!process.env.FIRESTORE_EMULATOR_HOST){test('usuarios únicos con reglas reales (requiere emulador de Firestore)',{skip:true},()=>{});}
else{
  const modules=process.env.OMUSIC_EMULATOR_MODULES||__dirname;
  const {initializeTestEnvironment,assertSucceeds,assertFails}=require(require.resolve('@firebase/rules-unit-testing',{paths:[modules]}));
  const {doc,setDoc,getDoc,getDocFromServer,getDocsFromServer,collection,deleteDoc,updateDoc,writeBatch,runTransaction}=require(require.resolve('firebase/firestore',{paths:[modules]}));
  let env;const databases=new Map();
  const db=uid=>{if(!databases.has(uid))databases.set(uid,env.authenticatedContext(uid).firestore());return databases.get(uid);};
  function app(uid){
    const memory=new Map();
    const bridge=(database,job)=>runTransaction(database,tx=>job({get:ref=>tx.get(ref),set:(ref,value)=>tx.set(ref,JSON.parse(JSON.stringify(value))),delete:ref=>tx.delete(ref)}));
    const c={URL,URLSearchParams,location:{href:'https://omusic.test/',hash:''},_omAuthReady:Promise.resolve(),_db:db(uid),_doc:doc,_getDocServer:getDocFromServer,_getDocsServer:getDocsFromServer,_writeBatch:writeBatch,_runTransaction:bridge,_collection:collection,
      localStorage:{getItem:()=>null},addEventListener(){},songs:[],videos:[],omSyncProfile(){},omToast(){},
      userKeyOM:()=>c._currentFirebaseUser?.uid||'guest',readOM:(key,fallback)=>memory.get(key)||fallback,storeOM:(key,value)=>memory.set(key,value)};
    c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'omusic-social.js'),'utf8'),c);
    c._currentFirebaseUser={uid,displayName:'Oliver'};return c;
  }
  const profile=(uid,handle,isPublic=false)=>({ownerId:uid,name:uid,handle,handleKey:handle.toLowerCase(),bio:'',website:'',photo:'',banner:'',isPublic,updatedAt:1});
  test.before(async()=>{const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');env=await initializeTestEnvironment({projectId:'demo-omusic-profiles',firestore:{host,port:Number(port),rules:fs.readFileSync(path.join(__dirname,'firestore.rules'),'utf8')}});});
  test.beforeEach(async()=>env.clearFirestore());test.after(async()=>env?.cleanup());
  test('dos cuentas que guardan a la vez OliverM y oliverm solo producen un propietario',async()=>{
    const a=app('owner-a'),b=app('owner-b');const results=await Promise.allSettled([a.omSaveProfile(profile('owner-a','OliverM')),b.omSaveProfile(profile('owner-b','oliverm'))]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'handle-taken');
    const reservation=(await getDoc(doc(a._db,'userHandles','oliverm'))).data();assert.ok(['owner-a','owner-b'].includes(reservation.ownerId));
  });
  test('las reglas rechazan reservas huérfanas, perfiles sin reserva y claves con mayúsculas',async()=>{
    const d=db('owner-a');await assertFails(setDoc(doc(d,'userHandles','oliverm'),{ownerId:'owner-a',handle:'OliverM'}));
    await assertFails(setDoc(doc(d,'userProfiles','owner-a'),profile('owner-a','OliverM')));
    const batch=writeBatch(d);batch.set(doc(d,'userHandles','OliverM'),{ownerId:'owner-a',handle:'OliverM'});batch.set(doc(d,'userProfiles','owner-a'),{...profile('owner-a','OliverM'),handleKey:'OliverM'});await assertFails(batch.commit());
  });
  test('ni otro usuario ni un visitante pueden robar, borrar o sobrescribir una reserva',async()=>{
    const a=app('owner-a');await a.omSaveProfile(profile('owner-a','OliverM'));
    for(const d of [db('owner-b'),env.unauthenticatedContext().firestore()]){
      await assertFails(setDoc(doc(d,'userHandles','oliverm'),{ownerId:'owner-b',handle:'oliverm'}));await assertFails(deleteDoc(doc(d,'userHandles','oliverm')));
      await assertFails(setDoc(doc(d,'userProfiles','owner-a'),profile('owner-a','Otro')));
    }
  });
  test('un perfil publicado se renombra atómicamente y libera su nombre anterior',async()=>{
    const a=app('owner-a');await a.omWriteProfile(profile('owner-a','OliverM'), 'owner-a',{visibility:true});
    await a.omSaveProfile({...a.omProfileData(),handle:'OliverMusic'});
    assert.equal((await getDoc(doc(a._db,'userHandles','oliverm'))).exists(),false);assert.equal((await getDoc(doc(a._db,'publicProfiles','owner-a'))).data().handle,'OliverMusic');
    const b=app('owner-b');await assertSucceeds(b.omSaveProfile(profile('owner-b','OliverM')));
  });
  test('el dueño tampoco puede conservar dos reservas ni desajustar su perfil público',async()=>{
    const a=app('owner-a');await a.omWriteProfile(profile('owner-a','OliverM'),'owner-a',{visibility:true});
    await assertFails(deleteDoc(doc(a._db,'userHandles','oliverm')));
    await assertFails(updateDoc(doc(a._db,'publicProfiles','owner-a'),{handle:'Impostor',handleKey:'impostor'}));
    const batch=writeBatch(a._db),p=profile('owner-a','Nuevo',true);batch.set(doc(a._db,'userProfiles','owner-a'),p);batch.set(doc(a._db,'publicProfiles','owner-a'),p);batch.set(doc(a._db,'userHandles','nuevo'),{ownerId:'owner-a',handle:'Nuevo'});await assertFails(batch.commit());
  });
  test('el perfil privado conserva su usuario y no se puede resolver desde un visitante',async()=>{
    const a=app('owner-a');await a.omWriteProfile(profile('owner-a','OliverM'),'owner-a',{visibility:true});await a.omWriteProfile(a.omProfileData(),'owner-a',{visibility:false});
    const visitor=env.unauthenticatedContext().firestore();await assertFails(getDoc(doc(visitor,'userProfiles','owner-a')));assert.equal((await getDoc(doc(visitor,'publicProfiles','owner-a'))).exists(),false);
    assert.equal((await getDoc(doc(visitor,'userHandles','oliverm'))).data().ownerId,'owner-a');assert.equal(await a.omResolveProfileHandle('OliverM'),null);
  });
  test('las cuentas antiguas duplicadas se migran sin borrar la reserva de otra cuenta',async()=>{
    await env.withSecurityRulesDisabled(async c=>{const store=c.firestore();for(const uid of ['owner-a','owner-b']){const p=profile(uid,'oliverm',true);delete p.handleKey;await setDoc(doc(store,'userProfiles',uid),p);await setDoc(doc(store,'publicProfiles',uid),p);}});
    const a=app('owner-a'),b=app('owner-b');await Promise.all([a.omLoadOwnProfile(),b.omLoadOwnProfile()]);
    assert.notEqual(a.omProfileData().handleKey,b.omProfileData().handleKey);assert.ok(a.omProfileData().handleKey);assert.ok(b.omProfileData().handleKey);
    for(const c of [a,b])assert.equal((await getDoc(doc(c._db,'userHandles',c.omProfileData().handleKey))).data().ownerId,c._currentFirebaseUser.uid);
  });
}
