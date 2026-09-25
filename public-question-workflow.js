'use strict';

// Public Questions only. All ownership, publication and earning transitions share
// the question transaction; browser state and the current switch cannot rewind it.
const DAY = 24 * 60 * 60 * 1000;
const fail = (message, httpStatus = 409) => { throw Object.assign(new Error(message), {httpStatus}); };
function millis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds != null || value._seconds != null) return Number(value.seconds ?? value._seconds) * 1000;
  const n = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(n) ? n : 0;
}
function availableAt(q) {
  return millis(q.answerAvailableAt) || millis(q.answerApprovedAt) || millis(q.adminAnswerApprovedAt)
    || (q.adminApprovalBypassed === true ? millis(q.answerSubmittedAt) : 0);
}
function editLocked(q, now) {
  const first = availableAt(q);
  return !!q.customerAnswerViewedAt || q.commissionStatus === 'credited' || (first > 0 && now >= first + DAY);
}
function createPublicWorkflow({db, FieldValue: F, Timestamp: T, FieldPath, clock = Date.now}) {
  const questions = db.collection('smv_questions');
  const stamp = () => T.fromMillis(clock());
  const refFor = id => {
    if (!/^[A-Za-z0-9_-]+$/.test(String(id || ''))) fail('A valid Question ID is required.', 400);
    return questions.doc(id);
  };
  function ensurePaid(q) {
    if (q.paymentStatus !== 'paid' || ['question_rejected','admin_rejected'].includes(q.status)
      || q.refundId || ['pending','processing','processed','completed','initiated'].includes(q.refundStatus)) fail('This question is not eligible for an answer or earning.');
  }
  async function submit(id, uid, answer) {
    return db.runTransaction(async tx => {
      const ref = refFor(id), snap = await tx.get(ref);
      if (!snap.exists) fail('Question not found.', 404);
      const q = snap.data(); ensurePaid(q);
      if (q.astrologerId !== uid) fail('This question is not assigned to you.', 403);
      const bypassApproval = q.adminApprovalBypassed === true;
      if (editLocked(q, clock())) fail('The answer is final: it was viewed, credited, or available for 24 hours.');
      if (!['admin_approved','revision_required','processing','admin_review','answer_draft'].includes(q.status)
        && !(bypassApproval && q.status === 'answered')) fail('This answer can no longer be edited.');
      const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
      if (!answer.trim() || wordCount < Number(q.answerMinWords || 150)) fail(`Please write at least ${Number(q.answerMinWords || 150)} words.`, 400);
      const pct = Number(q.commissionPercent ?? q.commissionRate ?? 20);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) fail('Invalid commission percentage.');
      const now = stamp(), first = availableAt(q) || now.toMillis();
      const patch = {answer, answerWordCount:wordCount, answerSubmittedAt:now, answerLastEditedAt:now,
        astrologerEditMode:false, status:bypassApproval?'answered':'processing',
        astrologerAnswerStatus:bypassApproval?'approved':'submitted',
        astrologerCommissionAmount:Math.round(Number(q.amount || 0)*pct)/100,
        commissionPercent:pct, commissionRate:pct,
        commissionStatus:bypassApproval?'pending_customer_view':'pending_admin_approval',
        updatedAt:now, answerEmailStatus:{state:'pending',updatedAt:now}};
      if (bypassApproval) Object.assign(patch, {answerAvailableAt:T.fromMillis(first),
        answerApprovedAt:q.answerApprovedAt || T.fromMillis(first),
        commissionAutoCreditDueAt:T.fromMillis(first + DAY)});
      tx.update(ref, patch);
      // The server owns this notification, eliminating browser re-reads/writes.
      if(q.customerId) tx.set(db.collection('smv_notifications').doc(q.customerId+'_answer_submitted_'+id), {
        userId:q.customerId,type:'astrologer_answer_submitted',title:'Astrologer Answer Submitted',
        message:bypassApproval?'Your answer is ready to view.':'Your answer is waiting for Admin review.',
        questionId:id,customerPaymentId:q.customerPaymentId||'',astrologerId:uid,
        astrologerName:q.astrologerName||'Astrologer',createdAt:now,updatedAt:now,read:false
      }, {merge:true});
      return {q,bypassApproval,wordCount};
    });
  }
  async function reopen(id, uid) {
    return db.runTransaction(async tx => {
      const ref=refFor(id), snap=await tx.get(ref); if(!snap.exists) fail('Question not found.',404);
      const q=snap.data(); ensurePaid(q);
      if(q.astrologerId!==uid) fail('This question is not assigned to you.',403);
      if(editLocked(q,clock()) || !q.answer) fail('This answer is no longer editable.');
      const published=q.status==='answered' && q.adminApprovalBypassed===true;
      if(!published && !['processing','answer_draft','admin_review','revision_required'].includes(q.status)) fail('This answer is not available for editing.');
      // Published answers remain visible while the astrologer edits a draft.
      tx.update(ref,{astrologerEditMode:true,editReopenedAt:stamp(),editReopenedBy:uid,updatedAt:stamp()});
      return {success:true,questionId:id,status:q.status,astrologerEditMode:true};
    });
  }
  async function approve(id, uid) {
    return db.runTransaction(async tx => {
      const ref=refFor(id),snap=await tx.get(ref);if(!snap.exists)fail('Question not found.',404);
      const q=snap.data();ensurePaid(q);
      if(!q.astrologerId || !String(q.answer||'').trim())fail('An assigned astrologer and submitted answer are required.');
      const amount=Number(q.astrologerCommissionAmount ?? q.commissionAmount ?? 0);
      if(!Number.isFinite(amount)||amount<0)fail('Invalid commission amount.');
      const alreadyApproved=q.status==='answered';
      if(!alreadyApproved){
        const first=availableAt(q)||clock(),now=stamp();
        tx.update(ref,{status:'answered',astrologerAnswerStatus:'approved',astrologerEditMode:false,
          commissionStatus:q.commissionStatus==='credited'?'credited':'pending_customer_view',
          answerAvailableAt:T.fromMillis(first),answerApprovedAt:T.fromMillis(first),adminAnswerApprovedAt:now,
          commissionAutoCreditDueAt:q.commissionStatus==='credited'?F.delete():T.fromMillis(first+DAY),
          answerApprovedBy:uid,commissionAmount:amount,astrologerCommissionAmount:amount,updatedAt:now,
          answerApprovalEmailStatus:{state:'pending',updatedAt:now,retry:true}});
      }
      return {q,amount,alreadyApproved,astrologerPaymentId:q.astrologerPaymentId||''};
    });
  }
  async function settle(id, {uid, automatic=false}={}) {
    return db.runTransaction(async tx => {
      const ref=refFor(id), snap=await tx.get(ref);if(!snap.exists)fail('Question not found.',404);
      const q=snap.data();
      if(uid && q.customerId!==uid)fail('You do not own this question.',403);
      ensurePaid(q);
      if(q.status!=='answered'||!String(q.answer||'').trim())fail('Answer is not ready yet.');
      const first=availableAt(q), now=stamp();
      const patch={commissionAutoCreditDueAt:F.delete()};
      if(!automatic && !q.customerAnswerViewedAt)patch.customerAnswerViewedAt=now;
      if(q.adminTakeover===true || q.commissionStatus==='admin_retained') {
        tx.update(ref,patch);
        return {success:true,questionId:id,credited:false,adminAnswered:true};
      }
      if(q.commissionStatus==='credited') {
        if(!automatic || q.commissionAutoCreditDueAt)tx.update(ref,patch);
        return {success:true,questionId:id,credited:true,already:true,autoCredit:automatic};
      }
      if(automatic && !q.customerAnswerViewedAt && (!first || clock()<first+DAY))fail('Commission becomes due 24 hours after the answer is available to the customer.');
      const amount=Number(q.astrologerCommissionAmount ?? q.commissionAmount ?? 0);
      if(!q.astrologerId || !Number.isFinite(amount)||amount<0)fail('Commission requires Admin review.');
      const canonical='SMV-PAT-PUB-'+id;
      const paymentId=q.astrologerPaymentId||canonical;
      const ledger=db.collection('smv_payments').doc(paymentId), ledgerSnap=await tx.get(ledger);
      // Older versions used counter IDs. Reuse an existing earning if present.
      let existing=ledgerSnap.exists?ledgerSnap.data():null;
      // Recover an older interrupted credit, where its ledger was committed
      // before the question update. This bounded lookup runs only once per credit.
      const prior=await tx.get(db.collection('smv_payments').where('questionId','==',id).limit(100));
      const earnings=prior.docs.filter(d=>d.data().type==='astrologer_earning'&&d.data().status==='credited');
      if(earnings.length>1)fail('Multiple existing earnings require Admin reconciliation.');
      if(earnings.length===1){
        existing=earnings[0].data();
        if(existing.astrologerId!==q.astrologerId)fail('Existing earning belongs to another astrologer; Admin review required.');
        if(Number(existing.earningAmount??existing.commissionAmount)!==amount)fail('Existing earning amount differs; Admin review required.');
      }
      if(existing && (existing.questionId!==id||existing.astrologerId!==q.astrologerId||existing.type!=='astrologer_earning'))fail('Existing earning needs Admin review.');
      if(!existing)tx.set(ledger,{paymentId,type:'astrologer_earning',customerId:q.customerId||null,
        astrologerId:q.astrologerId,questionId:id,bookingId:q.bookingId||null,grossAmount:Number(q.amount||0),
        commissionPercent:Number(q.commissionPercent??q.commissionRate??0),commissionAmount:amount,earningAmount:amount,
        status:'credited',paymentStatus:'pending_withdrawal',source:automatic?'public_answer_24h_auto_credit':'customer_answer_view',createdAt:now,updatedAt:now});
      Object.assign(patch,{commissionStatus:'credited',commissionCreditedAt:now,astrologerPaymentId:earnings[0]?.id||paymentId,
        commissionAmount:amount,astrologerCommissionAmount:amount,updatedAt:now});
      if(automatic)Object.assign(patch,{commissionAutoCreditedAt:now,commissionAutoCreditReason:'answer_available_24h_or_customer_viewed'});
      tx.update(ref,patch);
      tx.set(db.collection('smv_notifications').doc('public_earning_'+id),{userId:q.astrologerId,
        type:'earning_credited',title:'Earning Credited',message:`₹${amount.toFixed(2)} has been credited for your answer.`,
        questionId:id,commissionAmount:amount,createdAt:now,read:false},{merge:true});
      return {success:true,questionId:id,credited:true,already:false,autoCredit:automatic,commissionAmount:amount,astrologerPaymentId:earnings[0]?.id||paymentId};
    });
  }
  async function assign(id, uid, astroId, pct, reallocate=false) {
    if(!Number.isFinite(pct)||pct<0||pct>100)fail('Commission must be between 0 and 100.',400);
    return db.runTransaction(async tx=>{
      const ref=refFor(id),[qs,as]=await Promise.all([tx.get(ref),tx.get(db.collection('smv_astrologers').doc(astroId))]);
      if(!qs.exists)fail('Question not found.',404);
      if(!as.exists||as.data().status!=='approved')fail('Selected astrologer is not approved.');
      const q=qs.data();ensurePaid(q);
      if(q.status==='answered'||q.answer||availableAt(q))fail('A submitted answer cannot be reallocated.');
      if(!reallocate && q.astrologerId)fail('This question was already claimed. Refresh and use Reallocate.');
      if(reallocate && !q.astrologerId)fail('This question is not allocated yet.');
      const amount=Number(q.amount??q.paymentAmount??0);if(!Number.isFinite(amount)||amount<=0)fail('Invalid paid amount.');
      const astroCommission=Math.round(amount*pct)/100,adminCommission=Math.round((amount-astroCommission)*100)/100;
      tx.update(ref,{status:'paid',allocationStatus:'assigned_to_astrologer',astrologerId:astroId,
        astrologerName:as.data().name||'Astrologer',commissionPercent:pct,commissionRate:pct,
        astrologerCommissionAmount:astroCommission,adminCommissionAmount:adminCommission,
        adminQuestionApprovedAt:stamp(),adminQuestionApprovedBy:uid,
        adminApprovalBypassed:reallocate?q.adminApprovalBypassed===true:false,
        commissionStatus:'allocated_pending_answer',astrologerAnswerStatus:'pending',astrologerEditMode:false,
        claimedAt:F.delete(),claimedBy:F.delete(),updatedAt:stamp()});
      return {astroCommission,adminCommission,oldAstrologerId:q.astrologerId||''};
    });
  }
  async function migrateLegacy() {
    // Resumable one-time migration: no endless historical collection scan.
    const stateRef=db.collection('smv_settings').doc('publicSettlementBackfillV72');
    const state=await stateRef.get();if(state.exists&&state.data().done)return;
    const cursor=state.exists?state.data().cursor:null;
    let query=questions.where('status','==','answered').orderBy(FieldPath.documentId()).limit(50);
    if(cursor)query=query.startAfter(cursor);
    const snap=await query.get();
    for(const d of snap.docs)await db.runTransaction(async tx=>{
      const s=await tx.get(d.ref),q=s.data();if(!q||q.status!=='answered'||q.adminTakeover||q.commissionStatus==='admin_retained'||q.commissionStatus==='credited'||q.commissionAutoCreditDueAt)return;
      const first=availableAt(q);
      if(first)tx.update(d.ref,{answerAvailableAt:T.fromMillis(first),commissionAutoCreditDueAt:T.fromMillis(first+DAY)});
      else tx.update(d.ref,{commissionSettlementReview:'Missing original answer availability timestamp; Admin review required.'});
    });
    await stateRef.set({cursor:snap.docs.at(-1)?.id||cursor||'',done:snap.size<50,updatedAt:stamp()},{merge:true});
  }
  let running=false, migrationDone=false;
  async function sweep() {
    if(running)return {skipped:true};running=true;
    let checked=0,credited=0,review=0;
    try {
      if(!migrationDone){await migrateLegacy();const s=await db.collection('smv_settings').doc('publicSettlementBackfillV72').get();migrationDone=s.data()?.done===true;}
      const snap=await questions.where('commissionAutoCreditDueAt','<=',stamp()).limit(100).get();
      for(const d of snap.docs){
        checked++;
        try { const result=await settle(d.id,{automatic:true});if(!result.already)credited++; }
        catch(e){
          if(e.httpStatus===409){
            // Invalid legacy rows must not permanently occupy the first due page.
            await db.runTransaction(async tx=>{
              const s=await tx.get(d.ref);if(!s.exists)return;const q=s.data(),first=availableAt(q);
              if(q.status==='answered'&&q.answer&&q.paymentStatus==='paid'&&q.astrologerId&&first&&clock()<first+DAY){
                tx.update(d.ref,{commissionAutoCreditDueAt:T.fromMillis(first+DAY)});return;
              }
              if(millis(q.commissionAutoCreditDueAt)!==millis(d.data().commissionAutoCreditDueAt))return;
              tx.update(d.ref,{commissionAutoCreditDueAt:F.delete(),commissionSettlementReview:e.message});
            });review++;
          } else throw e;
        }
      }
      if(credited||review)await db.collection('smv_settings').doc('dashboardChange').set({
        updatedAt:stamp(),path:'/customer/mark-answer-viewed',category:'questions'
      },{merge:true});
      return {checked,credited,review};
    } finally {running=false;}
  }
  return {submit,reopen,approve,settle,assign,sweep};
}
module.exports={createPublicWorkflow,availableAt,editLocked,millis,DAY};
