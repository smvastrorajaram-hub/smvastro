import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
import {createRefreshQueue} from '../dashboard-live.mjs';
const require=createRequire(import.meta.url),register=require('../dashboard-events.js');
const pause=()=>new Promise(resolve=>setTimeout(resolve,15));
test('bursts coalesce; an event during a request gets a second serialized update',async()=>{
 let calls=0,active=0,max=0,release;
 const gate=new Promise(r=>release=r);
 const q=createRefreshQueue({delay:1,canRun:()=>true,run:async()=>{calls++;active++;max=Math.max(max,active);if(calls===1)await gate;active--;}});
 q.request();q.request();q.request();await pause();assert.equal(calls,1);
 q.request();q.request();await pause();assert.equal(calls,1);release();await pause();assert.equal(calls,2);assert.equal(max,1);q.stop();
});
test('editing defers changes; resume preserves the pending event; stop cancels work',async()=>{
 let allowed=false,calls=0;const q=createRefreshQueue({delay:1,canRun:()=>allowed,run:async()=>{calls++;}});
 q.request();await pause();assert.equal(calls,0);assert.equal(q.pending,true);
 allowed=true;q.resume();await pause();assert.equal(calls,1);
 q.request();q.stop();await pause();assert.equal(calls,1);
});
function harness(role='customer',approved=true,authorized=true){
 const watches=[],writes=[];let handler,unsubscribed=0;
 const db={collection(name){return ref(name,[]);}};
 function ref(name,filters){return {where(field,op,value){return ref(name,[...filters,[field,op,value]]);},doc(id){return ref(name,[...filters,['doc',id]]);},async get(){return {exists:true,data:()=>name==='smv_users'?{role}:{status:approved?'approved':'pending'}};},onSnapshot(cb,error){watches.push({name,filters,cb,error});return ()=>unsubscribed++;}};}
 const res=new EventEmitter();res.writableEnded=false;res.headersSent=false;res.status=()=>res;res.set=()=>res;res.flushHeaders=()=>res.headersSent=true;res.write=x=>writes.push(x);res.end=()=>{res.writableEnded=true;};res.json=()=>res;
 register({get(path,fn){assert.equal(path,'/dashboard/events');handler=fn;}},{db,requireUser:async()=>authorized?{uid:'user-a',exp:Date.now()/1000+3600}:null,isAdminUser:async()=>role==='admin'});
 return {start:()=>handler({},res),watches,writes,res,get unsubscribed(){return unsubscribed;}};
}
test('customer stream watches only own profile, questions and notifications, and sends no records',async()=>{
 const h=harness();await h.start();assert.deepEqual(h.watches.map(w=>w.name),['smv_users','smv_questions','smv_notifications']);
 assert.deepEqual(h.watches[1].filters,[['customerId','==','user-a']]);assert.deepEqual(h.watches[2].filters,[['userId','==','user-a']]);
 h.watches.forEach(w=>w.cb({secret:'must not leak'}));assert.deepEqual(h.writes,['event: ready\ndata: {}\n\n']);
 h.res.emit('close');assert.equal(h.unsubscribed,3);assert.equal(h.res.writableEnded,true);
});
test('approved astrologer gets open-question signals; pending astrologer cannot subscribe to that queue',async()=>{
 for(const approved of [true,false]){const h=harness('astrologer',approved);await h.start();const open=h.watches.find(w=>w.filters.some(f=>f[0]==='status'));assert.equal(!!open,approved);if(open)assert.deepEqual(open.filters,[['status','==','available_to_astrologers']]);h.res.emit('close');}
});
test('admin gets approval, withdrawal and refund-related signals; listeners close on permission changes',async()=>{
 const h=harness('admin');await h.start();assert.ok(h.watches.some(w=>w.name==='smv_withdrawals'));assert.ok(h.watches.some(w=>w.name==='smv_payouts'));
 h.watches.forEach(w=>w.cb());h.watches[0].cb();assert.equal(h.res.writableEnded,true);assert.equal(h.unsubscribed,h.watches.length);
});
test('unauthenticated connection creates no listeners',async()=>{const h=harness('customer',true,false);await h.start();assert.equal(h.watches.length,0);});
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const appSource=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const loadSource=appSource.slice(appSource.indexOf('async function loadDashboard('),appSource.indexOf('function openPayoutChange()'));
test('failed refresh retains the existing dashboard instead of blanking it',async()=>{
 const box={innerHTML:'existing account data',querySelector:()=>null};let rejectProfile;
 const profile=new Promise((_,reject)=>rejectProfile=reject);let status='';
 const ctx={console:{error(){}},currentUser:{uid:'user-a'},dashboardReadyUid:'user-a',dashboardReadyAt:0,dashboardReadyRole:'customer',smvDashboardDirty:true,smvInternalView:'dashboard',dashboardLoadSeq:0,dashboardLoadPromise:null,dashboardLoadUid:null,$:()=>box,withTimeout:x=>x,getDoc:()=>profile,doc:()=>({}),db:{},renderApi:async()=>({success:true,questions:[]}),smvLiveStatus:text=>status=text};
 vm.createContext(ctx);vm.runInContext(loadSource,ctx);const task=ctx.loadDashboard('customer',true,true);
 assert.equal(box.innerHTML,'existing account data');rejectProfile(new Error('offline'));await task;
 assert.equal(box.innerHTML,'existing account data');assert.match(status,/previous information retained/);
});
test('workspace is isolated for both dashboard roles and restored on Home',()=>{
 function classes(initial=[]){const set=new Set(initial);return {contains:x=>set.has(x),toggle(x,on){if(on)set.add(x);else set.delete(x);}};}
 const roots={dashboard:{classList:classes(['hidden'])},admin:{classList:classes(['hidden'])},'smv-dashboard-page':{classList:classes(['hidden'])}};let sync;
 const body={dataset:{}};const ctx={document:{body,getElementById:id=>roots[id]},MutationObserver:class{constructor(fn){sync=fn;}observe(){}}};
 vm.createContext(ctx);const ui=readFileSync(new URL('../interface.js',import.meta.url),'utf8');vm.runInContext(ui.slice(ui.indexOf('(function isolateWorkspace')),ctx);
 assert.equal(body.dataset.smvWorkspace,'closed');roots.dashboard.classList.toggle('hidden',false);sync();assert.equal(body.dataset.smvWorkspace,'open');
 roots.dashboard.classList.toggle('hidden',true);roots.admin.classList.toggle('hidden',false);sync();assert.equal(body.dataset.smvWorkspace,'open');
 roots.admin.classList.toggle('hidden',true);sync();assert.equal(body.dataset.smvWorkspace,'closed');assert.equal(roots['smv-dashboard-page'].classList.contains('hidden'),true);
});
