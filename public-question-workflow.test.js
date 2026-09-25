'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createPublicWorkflow,DAY,availableAt}=require('./public-question-workflow');
const del=Symbol('delete');
const T={fromMillis:n=>({toMillis:()=>n,seconds:n/1000})};
function fixture(overrides={}){
 let now=1000000000,tail=Promise.resolve();const docs=new Map();
 const snap=(path)=>({id:path.split('/').at(-1),ref:ref(path),exists:docs.has(path),data:()=>docs.get(path)});
 const ref=path=>({path,get:async()=>snap(path),set:async(d,o)=>write(path,d,o?.merge),update:async d=>write(path,d,true)});
 function write(path,data,merge){const out=merge?{...docs.get(path)}:{};for(const [k,v]of Object.entries(data)){if(v===del)delete out[k];else out[k]=v;}docs.set(path,out);}
 const query=(name,filters=[],limit=Infinity,cursor='')=>({
  where:(...f)=>query(name,[...filters,f],limit,cursor),limit:n=>query(name,filters,n,cursor),orderBy:()=>query(name,filters,limit,cursor),startAfter:c=>query(name,filters,limit,c),
  get:async()=>{const found=[...docs.keys()].filter(k=>k.startsWith(name+'/')&&k.split('/').at(-1)>cursor).sort().filter(k=>filters.every(([f,op,v])=>op==='=='?docs.get(k)[f]===v:docs.get(k)[f]?.toMillis?.()<=v.toMillis())).slice(0,limit).map(snap);return{docs:found,size:found.length,empty:!found.length};}
 });
 const db={collection:name=>({...query(name),doc:id=>ref(name+'/'+id)}),runTransaction:fn=>{
  const result=tail.then(async()=>{const writes=[];let written=false;const tx={get:async r=>{assert.equal(written,false,'all transaction reads precede writes');return r.get();},update:(r,d)=>{written=true;writes.push(()=>write(r.path,d,true));},set:(r,d,o)=>{written=true;writes.push(()=>write(r.path,d,o?.merge));}};const r=await fn(tx);writes.forEach(w=>w());return r;});tail=result.catch(()=>{});return result;
 }};
 docs.set('smv_questions/Q1',{status:'admin_approved',paymentStatus:'paid',customerId:'c1',astrologerId:'a1',amount:100,commissionPercent:20,answerMinWords:1,adminApprovalBypassed:true,...overrides});
 docs.set('smv_astrologers/a1',{status:'approved',name:'A'});
 const api=createPublicWorkflow({db,FieldValue:{delete:()=>del},Timestamp:T,FieldPath:{documentId:()=> '__name__'},clock:()=>now});
 return{api,db,docs,q:()=>docs.get('smv_questions/Q1'),time:n=>now=n,now:()=>now,ledger:()=>[...docs.entries()].filter(([k,v])=>k.startsWith('smv_payments/')&&v.type==='astrologer_earning')};
}
test('Auto answer publishes immediately with stable first-availability deadline',async()=>{
 const f=fixture();await f.api.submit('Q1','a1','answer');const first=availableAt(f.q());f.time(first+1000);await f.api.reopen('Q1','a1');assert.equal(f.q().status,'answered');await f.api.submit('Q1','a1','edited');assert.equal(availableAt(f.q()),first);assert.equal(f.q().commissionAutoCreditDueAt.toMillis(),first+DAY);
});
test('Manual answer waits for admin; 24 hours begins at approval, not submission',async()=>{
 const f=fixture({adminApprovalBypassed:false});await f.api.submit('Q1','a1','answer');assert.equal(f.q().status,'processing');assert.equal(availableAt(f.q()),0);f.time(f.now()+2*DAY);await f.api.approve('Q1','admin');const first=availableAt(f.q());assert.equal(first,f.now());f.time(first+2000);await f.api.approve('Q1','admin');assert.equal(availableAt(f.q()),first);await assert.rejects(f.api.settle('Q1',{automatic:true}));
});
test('Mark viewed credits immediately and locks answer edits',async()=>{
 const f=fixture();await f.api.submit('Q1','a1','answer');await f.api.settle('Q1',{uid:'c1'});assert.equal(f.ledger().length,1);assert.ok(f.q().customerAnswerViewedAt);await assert.rejects(f.api.submit('Q1','a1','edited'));
});
test('24-hour credit works without any customer login or fabricated view',async()=>{
 const f=fixture();await f.api.submit('Q1','a1','answer');f.time(f.now()+DAY-1);await assert.rejects(f.api.settle('Q1',{automatic:true}));f.time(f.now()+1);await f.api.settle('Q1',{automatic:true});assert.equal(f.q().commissionStatus,'credited');assert.equal(f.q().customerAnswerViewedAt,undefined);await assert.rejects(f.api.reopen('Q1','a1'));
});
test('Concurrent view, scheduler, admin retry: one earning only',async()=>{
 const f=fixture();await f.api.submit('Q1','a1','answer');f.time(f.now()+DAY);await Promise.all([f.api.settle('Q1',{uid:'c1'}),f.api.settle('Q1',{automatic:true}),f.api.settle('Q1',{automatic:true})]);assert.equal(f.ledger().length,1);
});
test('Wrong customer and wrong astrologer cannot mutate',async()=>{
 const f=fixture();await assert.rejects(f.api.submit('Q1','bad','answer'));await f.api.submit('Q1','a1','answer');await assert.rejects(f.api.settle('Q1',{uid:'bad'}));assert.equal(f.ledger().length,0);
});
test('Zero commission is retained, not replaced with default 20 percent',async()=>{
 const f=fixture({commissionPercent:0});await f.api.submit('Q1','a1','answer');await f.api.settle('Q1',{uid:'c1'});assert.equal(f.ledger()[0][1].earningAmount,0);
});
test('Rejected/refunded/unpaid questions never credit',async()=>{
 for(const override of [{paymentStatus:'pending'},{status:'question_rejected'},{refundStatus:'processed'}]){const f=fixture({answer:'a',status:'answered',...override});await assert.rejects(f.api.settle('Q1',{uid:'c1'}));assert.equal(f.ledger().length,0);}
});
test('Old interrupted earning is reused instead of issuing a second payment',async()=>{
 const f=fixture();await f.api.submit('Q1','a1','answer');f.docs.set('smv_payments/SMV-PAT-OLD',{type:'astrologer_earning',questionId:'Q1',astrologerId:'a1',status:'credited',earningAmount:20});await f.api.settle('Q1',{uid:'c1'});assert.equal(f.ledger().length,1);assert.equal(f.q().astrologerPaymentId,'SMV-PAT-OLD');
});
test('Historical manual answer uses approval timestamp and backfills due date',async()=>{
 const f=fixture({status:'answered',answer:'answer',adminApprovalBypassed:false,answerSubmittedAt:T.fromMillis(100),answerApprovedAt:T.fromMillis(1000)});await f.api.sweep();assert.equal(f.q().commissionStatus,'credited');assert.equal(availableAt(f.q()),1000);assert.equal(f.q().customerAnswerViewedAt,undefined);
});
test('Unknown historical availability requires review; never starts from updatedAt',async()=>{
 const f=fixture({status:'answered',answer:'answer',adminApprovalBypassed:false,updatedAt:T.fromMillis(100)});await f.api.sweep();assert.match(f.q().commissionSettlementReview,/Missing/);assert.equal(f.ledger().length,0);
});
test('Invalid overdue row is removed from due queue for Admin review',async()=>{
 const f=fixture({status:'question_rejected',commissionAutoCreditDueAt:T.fromMillis(100)});await f.api.sweep();assert.equal(f.q().commissionAutoCreditDueAt,undefined);assert.ok(f.q().commissionSettlementReview);
});
test('Admin can reallocate auto claimed unanswered question without manual approval timestamp',async()=>{
 const f=fixture();f.docs.set('smv_astrologers/a2',{status:'approved',name:'B'});await f.api.assign('Q1','admin','a2',30,true);assert.equal(f.q().astrologerId,'a2');assert.equal(f.q().adminApprovalBypassed,true);await assert.rejects(f.api.submit('Q1','a1','answer'));
});
test('Admin assignment cannot overwrite a claim; explicit reallocation required',async()=>{
 const f=fixture();await assert.rejects(f.api.assign('Q1','admin','a1',20));await f.api.submit('Q1','a1','answer');await assert.rejects(f.api.assign('Q1','admin','a1',20,true));
});
test('Admin-authored answer can be marked viewed without an astrologer earning',async()=>{
 const f=fixture({status:'answered',answer:'admin answer',adminTakeover:true,commissionStatus:'admin_retained'});await f.api.settle('Q1',{uid:'c1'});assert.ok(f.q().customerAnswerViewedAt);assert.equal(f.ledger().length,0);
});
test('Actual claim route: two approved astrologers compete; exactly one owns it',async()=>{
 const f=fixture({status:'available_to_astrologers',astrologerId:null,allocationStatus:'awaiting_admin'});
 f.docs.set('smv_astrologers/a2',{status:'approved',name:'B'});
 f.docs.set('smv_settings/workflow',{allowWithoutAdminApproval:true});
 const source=require('node:fs').readFileSync(__dirname+'/server.js','utf8');
 const start=source.indexOf("app.post('/astrologer/claim-question'");
 const code=source.slice(start,source.indexOf('\n});',start)+4);
 let handler;
 require('node:vm').runInNewContext(code,{app:{post:(p,m,h)=>handler=h},express:{json:()=>{}},requireUser:async r=>({uid:r.uid}),db:f.db,FieldValue:{serverTimestamp:()=>T.fromMillis(f.now())}});
 const res=()=>({code:200,status(n){this.code=n;return this;},json(data){this.data=data;return this;}});
 const a=res(),b=res();await Promise.all([handler({uid:'a1',body:{questionId:'Q1'}},a),handler({uid:'a2',body:{questionId:'Q1'}},b)]);
 assert.deepEqual([a.code,b.code].sort(),[200,409]);assert.ok(['a1','a2'].includes(f.q().astrologerId));assert.equal(f.q().adminApprovalBypassed,true);
});
test('Actual claim route: OFF blocks open claim but allows assigned astrologer',async()=>{
 const f=fixture({status:'available_to_astrologers',astrologerId:null,allocationStatus:'available_to_astrologers'});
 f.docs.set('smv_settings/workflow',{allowWithoutAdminApproval:false});
 const source=require('node:fs').readFileSync(__dirname+'/server.js','utf8'),start=source.indexOf("app.post('/astrologer/claim-question'");let handler;
 require('node:vm').runInNewContext(source.slice(start,source.indexOf('\n});',start)+4),{app:{post:(p,m,h)=>handler=h},express:{json:()=>{}},requireUser:async()=>({uid:'a1'}),db:f.db,FieldValue:{serverTimestamp:()=>T.fromMillis(f.now())}});
 const res=()=>({code:200,status(n){this.code=n;return this;},json(data){this.data=data;return this;}});
 let r=res();await handler({body:{questionId:'Q1'}},r);assert.equal(r.code,409);
 await f.api.assign('Q1','admin','a1',20);r=res();await handler({body:{questionId:'Q1'}},r);assert.equal(r.code,200);assert.equal(f.q().adminApprovalBypassed,false);
});
