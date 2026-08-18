import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs",authDomain:"smv-astro.firebaseapp.com",projectId:"smv-astro",storageBucket:"smv-astro.firebasestorage.app",messagingSenderId:"299081899217",appId:"1:299081899217:web:8d558df08e86037ea539f0"};
let app=null, auth=null, db=null, functions=null, httpsCallableFn=null, firebaseInitError=null;
try{
  app=initializeApp(firebaseConfig);
  auth=getAuth(app);
  db=getFirestore(app);
}catch(initError){
  firebaseInitError=initError;
  console.error("SMV ASTRO Firebase initialization failed",initError);
}
const RAZORPAY_BACKEND_URL="https://smv-astro-razorpay-webhook.onrender.com";
let firebaseFunctionsPromise=null;
async function ensureFirebaseFunctions(){
  if(functions && httpsCallableFn) return {functions,httpsCallable:httpsCallableFn};
  if(!firebaseFunctionsPromise){
    firebaseFunctionsPromise=import("https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js").then(mod=>{
      functions=mod.getFunctions(app,"asia-south1");
      httpsCallableFn=mod.httpsCallable;
      return {functions,httpsCallable:httpsCallableFn};
    });
  }
  return firebaseFunctionsPromise;
}
async function callFunction(name,data={}){
  const api=await ensureFirebaseFunctions();
  return withTimeout(api.httpsCallable(api.functions,name)(data));
}
async function renderApi(path, options={}){
  const token=auth.currentUser ? await auth.currentUser.getIdToken() : "";
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(token) headers.Authorization=`Bearer ${token}`;
  const response=await fetch(RAZORPAY_BACKEND_URL+path,{...options,headers});
  let data=null; try{data=await response.json();}catch(e){data={};}
  if(!response.ok) throw new Error(data?.error||`Payment server error (${response.status})`);
  return data;
}
const ADMIN_UID="TwjeEIFS3Zcf1SxboLZoujm91Ky2";
let currentUser=null, selectedAstro=null, pendingAfterLogin=null, questionServicePrice=5, pendingQuestionId="";
const $=id=>document.getElementById(id);
const show=id=>$(id)?.classList.remove("hidden"); const hide=id=>$(id)?.classList.add("hidden");
const go=id=>$(id)?.scrollIntoView({behavior:"smooth",block:"start"});
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function message(id,html){if($(id)) $(id).innerHTML=html;}
function withTimeout(promise,ms=15000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(`Request did not respond within ${Math.round(ms/1000)} seconds.`)),ms))]);}
window.closeModal=()=>$("modal").classList.add("hidden");
function openModal(html){$("modalContent").innerHTML=html;$("modal").classList.remove("hidden");}

// ---------- Navigation ----------
function openRegister(){hide("astro-flow");hide("ask-flow");hide("astro-register-form");show("register-flow");go("register-flow");}
function openAstroRegister(){hide("register-flow");show("astro-register-form");go("astro-register-form");}
function openAstroFlow(){openQuestionService();}
async function openQuestionService(){if(!currentUser){pendingAfterLogin="question";openAuth("login");return;} hide("register-flow");hide("astro-register-form");hide("astro-flow");show("ask-flow"); selectedAstro=null; $("askTitle").textContent="Ask Your Question"; await loadQuestionPrice(); $("birthName").value=""; $("birthDate").value=""; $("birthTime").value=""; $("birthPlace").value=""; $("birthGender").value=""; $("questionText").value=""; message("askMsg",""); go("ask-flow");}

$("authBtn")?.addEventListener("click",async()=>{if(currentUser){await logoutToHome();}else{openAuth("login");}});
$("customerRegBtn")?.addEventListener("click",()=>openAuth("register"));
$("privateConsultBtn")?.addEventListener("click",()=>openQuestionService());
$("astroRegBtn")?.addEventListener("click",openAstroRegister);
$("regBackBtn")?.addEventListener("click",()=>{hide("register-flow");window.scrollTo({top:0,behavior:"smooth"});});
$("astroRegBackBtn")?.addEventListener("click",openRegister);
$("backHomeBtn")?.addEventListener("click",()=>{hide("astro-flow");hide("ask-flow");window.scrollTo({top:0,behavior:"smooth"});});
$("backAstroBtn")?.addEventListener("click",()=>{hide("ask-flow");go("ask-service");});
$("dashLink")?.addEventListener("click",e=>{e.preventDefault();loadDashboard();go("dashboard");});
$("adminLink")?.addEventListener("click",e=>{e.preventDefault();loadAdminPanel();go("admin");});
$("askServiceBtn")?.addEventListener("click",e=>{e.preventDefault();openQuestionService();});
$("consultationNav")?.addEventListener("click",e=>{e.preventDefault();openQuestionService();});

// ---------- Login / customer registration ----------

function openAuth(mode="login"){
  hide("dashboard"); hide("admin"); hide("dashLink"); hide("adminLink");
  closeModal();
  openModal(`<h2>${mode==="login"?"Login":"Create Customer Account"}</h2>
  <div id="authMsg" class="small"></div>
  ${mode==="register"?`<input id="name" placeholder="Full name" autocomplete="name"><input id="phone" placeholder="Mobile number" autocomplete="tel">`:""}
  <input id="email" type="email" placeholder="Email" autocomplete="email">
  <input id="password" type="password" placeholder="Password (minimum 6 characters)" autocomplete="${mode==="login"?"current-password":"new-password"}">
  <button class="btn" id="submitAuth">${mode==="login"?"Login":"Create Account"}</button>
  ${mode==="login"?`<button class="btn gray" id="forgotAuth">Forgot Password?</button>`:""}
  <button class="btn gray" id="switchAuth">${mode==="login"?"Create new customer account":"I already have an account"}</button>`);
  $("submitAuth").onclick=()=>submitAuth(mode);
  $("switchAuth").onclick=()=>openAuth(mode==="login"?"register":"login");
  if($("forgotAuth")) $("forgotAuth").onclick=async()=>{
    const email=$("email").value.trim(),m=$("authMsg");
    if(!email){m.innerHTML='<span class="error">Enter your registered email first.</span>';return;}
    try{
      const {sendPasswordResetEmail}=await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js");
      await withTimeout(sendPasswordResetEmail(auth,email));
      m.innerHTML='<span class="success">Password reset email sent. Please check Inbox and Spam.</span>';
    }catch(e){m.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}
  };
}
async function submitAuth(mode){
 const msg=$("authMsg"),email=$("email").value.trim(),password=$("password").value;
 if(!email||!password){msg.innerHTML='<span class="error">Please enter email and password.</span>';return;}
 const btn=$("submitAuth");btn.disabled=true;btn.textContent=mode==="login"?"Signing in...":"Creating...";
 try{
  if(mode==="login"){
    // Do not wait for a separate auth-state promise here. Firebase already returns
    // the signed-in user from signInWithEmailAndPassword; use that result directly.
    const loginCred=await withTimeout(signInWithEmailAndPassword(auth,email,password),20000);
    if(!loginCred?.user){throw new Error("Login did not return a Firebase user. Please try again.");}
    currentUser=loginCred.user;
    const goToQuestion=pendingAfterLogin==="question";
    pendingAfterLogin=null;
    closeModal();
    if(goToQuestion){
      await openQuestionService();
      return;
    }
    hide("dashboard"); hide("admin"); hide("dashLink"); hide("adminLink");
    if(loginCred.user.uid === ADMIN_UID){
      show("adminLink");
      await loadAdminPanel();
      go("admin");
    }else{
      show("dashLink");
      await loadDashboard();
      go("dashboard");
    }
    return;
  }
  const name=$("name").value.trim(),phone=$("phone").value.trim();
  if(!name||password.length<6){msg.innerHTML='<span class="error">Enter name and a password of at least 6 characters.</span>';return;}
  const cred=await withTimeout(createUserWithEmailAndPassword(auth,email,password),20000);
  await withTimeout(setDoc(doc(db,"smv_users",cred.user.uid),{
    uid:cred.user.uid,name,phone,email,role:"customer",status:"active",emailVerificationRequired:true,createdAt:serverTimestamp()
  }),15000);
  msg.innerHTML='<span class="success"><b>Registration successful ✓</b><br>Account created. A verification email has been sent. Verify it once, then use Login normally.</span><button class="btn" id="registrationLoginBtn" style="margin-top:10px">Go to Login</button>';
  $("registrationLoginBtn").onclick=async()=>{await logoutToHome();openAuth("login");};
 }catch(e){
  let t=e?.message||String(e);
  if(e?.code==="auth/wrong-password"||e?.code==="auth/invalid-credential") t="Incorrect email or password.";
  if(e?.code==="auth/network-request-failed") t="Network connection failed. Please try again.";
  msg.innerHTML='<span class="error">'+escapeHtml(t)+'</span>';
 }finally{if($("submitAuth")){btn.disabled=false;btn.textContent=mode==="login"?"Login":"Create Account";}}
}
let authReadyResolve;
const authReady=new Promise(r=>authReadyResolve=r);
function waitForAuthReady(){return authReady;}
// ---------- Astrologer list ----------
async function loadAstrologers(){ return; }
async function loadAstroCards(){
 const box=$("astroCards");box.innerHTML='<div class="empty">Loading astrologers...</div>';
 try{const snap=await withTimeout(getDocs(query(collection(db,"smv_astrologers"),where("status","==","approved"))));
  if(snap.empty){box.innerHTML='<div class="empty">No approved astrologers available yet.</div>';return;}
  box.innerHTML="";snap.forEach(d=>{const a={id:d.id,...d.data()},card=document.createElement("div");card.className="card";card.style.marginTop="12px";card.innerHTML=`${a.photoData?`<img src="${a.photoData}" alt="Astrologer photo" style="width:72px;height:72px;border-radius:50%;object-fit:cover">`:''}<h3>${escapeHtml(a.name||"Astrologer")}</h3><p><b>${escapeHtml(a.expertise||a.specialization||"Astrology")}</b></p><p>⭐ ${escapeHtml(a.rating||a.averageRating||"New")} · ${escapeHtml(a.experience||"Experienced")} years experience</p><p>${escapeHtml(a.bio||a.about||"Professional astrologer")}</p><p class="small">Secure payment amount is shown only at checkout.</p><div class="action-row"><button class="btn gray" data-profile>PROFILE & REVIEWS</button></div>`;card.querySelector("[data-profile]").onclick=()=>openPublicAstrologerProfile(a);box.appendChild(card);});
 }catch(e){box.innerHTML='<div class="empty error">Could not load astrologers. Please check Firebase/Firestore rules.</div>';}
}
async function loadQuestionPrice(){try{const snap=await getDoc(doc(db,"smv_settings","question")); const v=Number(snap.data()?.price||5); questionServicePrice=Number.isFinite(v)&&v>=1?v:5; $("askRate").innerHTML=`<b>₹${questionServicePrice} per Question</b>`;}catch(e){questionServicePrice=5; $("askRate").innerHTML="<b>Question price is set by SMV ASTRO administration.</b>";}}
function showAskFlow(a){openQuestionService();}
$("submitQuestionBtn")?.addEventListener("click",async()=>{
 const name=$("birthName").value.trim();
 const text=$("questionText").value.trim();
 if(!currentUser){message("askMsg",'<span class="error">Please login before asking.</span>');return;}
 if(!name){message("askMsg",'<span class="error">Please enter the person\'s name.</span>');$("birthName").focus();return;}
 if(!$("birthDate").value||!$("birthTime").value||!$("birthPlace").value.trim()){message("askMsg",'<span class="error">Please complete all birth details.</span>');return;}
 if(!text){message("askMsg",'<span class="error">Please enter your question.</span>');return;}
 const amount=Number(questionServicePrice||0);
 if(!Number.isFinite(amount)||amount<1){message("askMsg",'<span class="error">Invalid question price.</span>');return;}
 const btn=$("submitQuestionBtn");btn.disabled=true;btn.textContent="CREATING PAYMENT...";
 try{
  // PAYMENT COMPATIBILITY FIX: use a non-empty question ID so this build also
  // works if an older Render instance still requires questionId.
  // Birth date/time remain India wall-clock values and are explicitly tagged IST;
  // no UTC conversion is performed.
  const makeQuestionId=()=>{try{return crypto.randomUUID().replace(/-/g,"").slice(0,20);}catch(e){return "q_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,12);}};
  const questionId=(pendingQuestionId&&/^[A-Za-z0-9_-]{6,}$/.test(pendingQuestionId))?pendingQuestionId:makeQuestionId();
  pendingQuestionId=questionId;
  const birthDate=$("birthDate").value;
  const birthTime=$("birthTime").value;
  const birthPlace=$("birthPlace").value.trim();
  const birthGender=$("birthGender").value;
  const payload={customerName:name,question:text,amount,birthDetails:{name,birthDate,birthTime,birthPlace,birthGender,timezone:"Asia/Kolkata",utcOffsetMinutes:330},serviceName:"Public Astrology Question",customerEmail:currentUser.email||""};
  await withTimeout(setDoc(doc(db,"smv_questions",questionId),{
    customerId:currentUser.uid,customerName:name,birthName:name,question:text,amount,
    status:"awaiting_payment",paymentStatus:"pending",allocationStatus:"awaiting_admin",
    birthDetails:{name,birthDate,birthTime,birthPlace,birthGender,timezone:"Asia/Kolkata",utcOffsetMinutes:330},
    birthDate,birthTime,birthPlace,birthGender,createdAt:serverTimestamp()
  },{merge:true}),15000);
  const orderRes=await withTimeout(renderApi("/create-order",{method:"POST",body:JSON.stringify(payload)}),30000);
  if(orderRes?.questionId) pendingQuestionId=String(orderRes.questionId).trim();
  const {orderId,keyId,amount:paise,currency}=orderRes||{};
  if(!pendingQuestionId||!orderId||!keyId){throw new Error("Payment order was not created correctly. Please retry.");}
  btn.textContent="OPENING RAZORPAY...";
  const options={
   key:keyId,amount:paise,currency:currency||"INR",name:"SMV ASTRO SERVICES",
   description:"Public astrology question",order_id:orderId,
   prefill:{email:currentUser.email||""},
   notes:{questionId:pendingQuestionId},
   theme:{color:"#6b21a8"},
   handler:async function(response){
    try{
     message("askMsg",'<span class="small">Verifying payment securely...</span>');
     const vr=await withTimeout(renderApi("/verify-payment",{method:"POST",body:JSON.stringify({
      questionId:pendingQuestionId,razorpay_order_id:response.razorpay_order_id,
      razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature
     })}),30000);
     if(vr?.verified){
      message("askMsg",'<span class="success"><b>Payment successful ✓</b><br>Your question is now waiting for Admin approval.</span>');
      btn.disabled=false;btn.textContent="PAID ✓";
      pendingQuestionId="";
      await new Promise(r=>setTimeout(r,500));
      hide("ask-flow"); show("dashboard"); await loadDashboard(); go("dashboard");
     }else{throw new Error("Payment verification failed.");}
    }catch(err){message("askMsg",'<span class="error">Payment received but verification failed. Please contact admin with your payment ID.</span>');btn.disabled=false;btn.textContent="RETRY VERIFICATION";}
   },
   modal:{ondismiss:function(){message("askMsg",'<span class="small">Payment window closed. Your question is still awaiting payment. You can retry.</span>');btn.disabled=false;btn.textContent="RETRY PAYMENT";}}
  };
  const rzp=new Razorpay(options);
  rzp.on("payment.failed",function(resp){message("askMsg",'<span class="error">Payment failed: '+escapeHtml(resp.error?.description||"Please try again.")+'</span>');btn.disabled=false;btn.textContent="RETRY PAYMENT";});
  rzp.open();
 }catch(e){
   const detail=e?.message||e?.details||e?.error?.message||String(e);
   const code=e?.code?` [${escapeHtml(String(e.code))}]`:"";
   console.error("SMV ASTRO payment error",e);
   message("askMsg",'<span class="error"><b>Payment could not be started.</b>'+code+'<br>'+escapeHtml(detail)+'</span>');
   btn.disabled=false;btn.textContent="RETRY PAYMENT";
 }
});

// ---------- Astrologer registration ----------
async function compressPhoto(file){
  if(!file) throw new Error("Profile photo is required.");
  return new Promise((resolve,reject)=>{
    const img=new Image(), reader=new FileReader();
    reader.onload=()=>{img.onload=()=>{const max=320, scale=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale)); c.getContext('2d').drawImage(img,0,0,c.width,c.height); resolve(c.toDataURL('image/jpeg',0.78));}; img.onerror=()=>reject(new Error("Could not read profile photo.")); img.src=reader.result;};
    reader.onerror=()=>reject(new Error("Could not read profile photo.")); reader.readAsDataURL(file);
  });
}
$("astroRegistrationForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const form=e.target,btn=form.querySelector('button[type="submit"]');
 const name=$("arName").value.trim(),mobile=$("arMobile").value.trim(),email=$("arEmail").value.trim(),password=$("arPassword").value,specialization=$("arSpecialization").value.trim(),experience=Number($("arExperience").value||0),bio=$("arBio").value.trim(),bankName=$("arBankName").value.trim(),accountName=$("arAccountName").value.trim(),accountNumber=$("arAccountNumber").value.trim(),ifsc=$("arIfsc").value.trim(),upi=$("arUpi").value.trim(),photoFile=$("arPhoto").files[0];
 if(!name||!mobile||!email||password.length<6||!specialization||experience<0||!bio||!bankName||!accountName||!accountNumber||!ifsc||!photoFile){message("astroRegMsg",'<span class="error">Please complete all required fields.</span>');return;}
 btn.disabled=true;btn.textContent="CREATING ACCOUNT...";message("astroRegMsg",'<span class="small">Creating your account...</span>');
 try{
  const photoData=await compressPhoto(photoFile);
  const cred=await withTimeout(createUserWithEmailAndPassword(auth,email,password));const uid=cred.user.uid;
  try{await withTimeout(sendEmailVerification(cred.user));}catch(ve){}
  btn.textContent="SAVING PROFILE...";
  const batch=writeBatch(db);
  batch.set(doc(db,"smv_users",uid),{uid,name,phone:mobile,mobile,email,role:"astrologer",status:"pending",emailVerificationRequired:true,createdAt:serverTimestamp()});
  batch.set(doc(db,"smv_astrologers",uid),{uid,name,specialization,expertise:specialization,experience,about:bio,bio,photoData,status:"pending",role:"astrologer",createdAt:serverTimestamp()});
  batch.set(doc(db,"smv_notifications",uid+"_"+Date.now()),{userId:uid,type:"registration",title:"Registration submitted",message:"Your astrologer application is pending Admin approval.",createdAt:serverTimestamp(),read:false});
  batch.set(doc(db,"smv_payouts",uid),{uid,bankName,accountName,accountNumber,ifsc,upi,updatedAt:serverTimestamp(),status:"pending_admin_review"});
  await withTimeout(batch.commit());
  form.reset();btn.textContent="SUBMITTED ✓";message("astroRegMsg",'<span class="success"><b>Registration submitted ✓</b><br>Your complete profile is waiting for Admin approval. Email verification is required once at registration. Your bank/UPI details are private and will not be shown back in full.</span><button class="btn" id="astroGoLogin" style="margin-top:10px">Go to Login</button>');
  $("astroGoLogin").onclick=async()=>{await logoutToHome();openAuth("login");};
 }catch(err){let text=err?.message||String(err);if(err?.code==="auth/email-already-in-use")text="This email is already registered. Please use Login instead.";else if(err?.code==="auth/operation-not-allowed")text="Email/Password registration is disabled in Firebase Authentication.";else if(err?.code==="auth/network-request-failed")text="Firebase network connection failed. Check your internet connection.";else if(err?.code==="permission-denied")text="Firestore permission denied. Check Firestore Rules.";message("astroRegMsg",'<span class="error"><b>Registration failed:</b> '+escapeHtml(text)+'</span>');btn.disabled=false;btn.textContent="SUBMIT REGISTRATION";}
});
// ---------- Dashboard / admin / session ----------
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_TOUCH_MS = 30 * 1000;
let idleTimer=null, lastActivity=Date.now(), intentionalLogout=false, lastAuthUid=null;
function touchSession(){ if(!currentUser) return; lastActivity=Date.now(); sessionStorage.setItem('smv_last_activity',String(lastActivity)); }
function clearIdleTimer(){ if(idleTimer){clearTimeout(idleTimer);idleTimer=null;} }
function armIdleTimer(){ clearIdleTimer(); if(!currentUser) return; const tick=()=>{ if(!currentUser)return; const idle=Date.now()-lastActivity; if(idle>=SESSION_IDLE_MS){ logoutToHome('Your session expired after 30 minutes of inactivity.'); return;} idleTimer=setTimeout(tick, Math.min(SESSION_IDLE_MS-idle,60000)); }; idleTimer=setTimeout(tick,60000); }
['click','touchstart','keydown','scroll','pointerdown'].forEach(ev=>window.addEventListener(ev,()=>{ if(currentUser && Date.now()-lastActivity>SESSION_TOUCH_MS) touchSession(); },{passive:true}));
window.addEventListener('pageshow',()=>{ if(currentUser){ touchSession(); armIdleTimer(); } });
async function logoutToHome(reason=''){
  intentionalLogout=true; clearIdleTimer(); sessionStorage.removeItem('smv_last_activity');
  currentUser=null; selectedAstro=null;
  try{await signOut(auth);}catch(e){console.warn("Logout failed",e);}
  hide('dashboard'); hide('admin'); hide('dashLink'); hide('adminLink');
  hide('ask-flow'); hide('register-flow'); hide('astro-flow');
  $('authBtn').textContent='Login'; closeModal(); window.scrollTo({top:0,behavior:'smooth'});
  if(reason) alert(reason);
  setTimeout(()=>{intentionalLogout=false;},800);
}

async function renderNotifications(targetId){
  const box=$(targetId); if(!box||!currentUser)return;
  try{
    const snap=await withTimeout(getDocs(query(collection(db,'smv_notifications'),where('userId','==',currentUser.uid))));
    const docs=snap.docs.slice().sort((a,b)=>String(b.data().createdAt?.seconds||0).localeCompare(String(a.data().createdAt?.seconds||0))).slice(0,12);
    box.innerHTML=docs.length?docs.map(d=>{const n=d.data();return `<div style="padding:9px 0;border-bottom:1px solid #eee"><b>${escapeHtml(n.title||'Notification')}</b><div class="small">${escapeHtml(n.message||'')}</div></div>`}).join(''):'<div class="empty">No notifications.</div>';
  }catch(e){box.innerHTML='<div class="empty">Notifications unavailable.</div>';}
}
async function loadDashboard(){
 const box=$('dashboardContent'); if(!currentUser){box.innerHTML='<div class="card">Please login to continue.</div>';return;}
 try{
  const u=await withTimeout(getDoc(doc(db,'smv_users',currentUser.uid))), data=u.exists()?u.data():{};
  const role=data.role||'customer'; $('dashboardTitle').textContent=role==='astrologer'?'Astrologer Dashboard':'Customer Dashboard';
  if(role==='astrologer'){
   const a=await withTimeout(getDoc(doc(db,'smv_astrologers',currentUser.uid))), ad=a.exists()?a.data():{};
   const inbox=await withTimeout(callFunction('getAstrologerQuestionInbox',{})); const availableQuestions=inbox.data?.questions||[]; const qs=await withTimeout(getDocs(query(collection(db,'smv_questions'),where('astrologerId','==',currentUser.uid))));
   const active=qs.docs.filter(d=>['paid','admin_approved','admin_review','answer_draft','revision_required','processing'].includes(d.data().status));
   const approved=ad.status==='approved';
   const earnings=await withTimeout(callFunction('getAstrologerEarnings',{}));
   const ep=earnings.data||{};
   box.innerHTML=`<div class="grid">
    <div class="card">${ad.photoData?`<img src="${ad.photoData}" style="width:88px;height:88px;border-radius:50%;object-fit:cover">`:''}<span class="badge">ASTROLOGER</span><h3>${escapeHtml(data.name||'')}</h3>
    <p>Status: <b>${escapeHtml(ad.status||'pending')}</b></p><p><b>${escapeHtml(ad.expertise||ad.specialization||'Astrology')}</b></p>
    <p>${escapeHtml(ad.experience||0)} years experience</p><p>${escapeHtml(ad.bio||ad.about||'')}</p>
    <p class="small">Your customer/payment contact details remain private.</p>
    <div class="action-row"><button class="btn gray" id="changePayoutBtn">Change Payment Method</button></div></div>
    <div class="card"><h3>My Questions</h3><p><b>${active.length}</b> active question(s)</p><p>Approved profile: <b>${approved?'Yes':'Waiting for Admin'}</b></p></div>
    <div class="card"><h3>Total Earnings</h3><p style="font-size:28px"><b>₹${Number(ep.totalEarnings||0).toFixed(2)}</b></p><p>Available to Withdraw: <b>₹${Number(ep.availableToWithdraw||0).toFixed(2)}</b></p><p class="small">Minimum withdrawal: ₹${Number(ep.minimumWithdrawal||300).toFixed(2)}</p>${Number(ep.availableToWithdraw||0)>=Number(ep.minimumWithdrawal||300)?'<p class="success"><b>You can withdraw</b></p><button class="btn" id="withdrawBtn">WITHDRAW</button>':'<p class="small">Reach ₹300 to request a withdrawal.</p>'}</div>
   </div>
   <div class="card" style="margin-top:16px"><h3>Public Question Inbox</h3><p class="small">All paid public questions are shown here. The customer price and your current commission are shown automatically.</p>${!approved?'<div class="empty">Your astrologer profile must be approved by Admin before you can claim questions.</div>':availableQuestions.length?availableQuestions.slice(0,50).map(q=>`<div class="card" style="margin:10px 0"><b>${escapeHtml(q.question||'Question')}</b><div class="small">Birth details: ${escapeHtml(q.birthName||q.birthDetails?.name||'')} · ${escapeHtml(q.birthDate||q.birthDetails?.birthDate||'')} · ${escapeHtml(q.birthTime||q.birthDetails?.birthTime||'')} · ${escapeHtml(q.birthPlace||q.birthDetails?.birthPlace||'')} · ${escapeHtml(q.birthGender||q.birthDetails?.birthGender||'')}</div><div class="small"><b>Customer paid: ₹${Number(q.amount||0).toFixed(2)}</b> · <b>Your commission: ₹${Number(q.astrologerCommissionAmount||0).toFixed(2)}</b> (${Number(q.commissionPercent||q.commissionRate||0)}%)</div><button class="btn" data-claim-question="${q.id}">CLAIM & ANSWER</button></div>`).join(''):'<div class="empty">No paid public questions are available right now.</div>'}</div>
<div class="card" style="margin-top:16px"><h3>Questions & Answers</h3>
   ${qs.empty?'<div class="empty">No questions yet.</div>':qs.docs.slice(0,20).map(d=>{const q=d.data(); const canAnswer=approved && q.status==='admin_approved'; const commission=q.astrologerCommissionAmount!=null?`<div><b>Your Commission: ₹${Number(q.astrologerCommissionAmount).toFixed(2)}</b></div>`:''; const minWords=Number(q.answerMinWords||150); return `<div class="card" style="margin:10px 0"><b>${escapeHtml(q.question||'Question')}</b><div class="small">Status: ${escapeHtml(q.status||'')} · Minimum answer: ${minWords} words</div>${commission}${q.answer?`<p>${escapeHtml(q.answer)}</p>`:''}${canAnswer?`<textarea id="ans_${d.id}" placeholder="Write at least ${minWords} words...">${escapeHtml(q.answer||'')}</textarea><div class="small" id="count_${d.id}">0 / ${minWords} words</div><button class="btn" data-answer="${d.id}" disabled>Submit for Admin Approval</button>`:''}${q.status==='revision_required'?`<textarea id="ans_${d.id}" placeholder="Revise with at least ${minWords} words...">${escapeHtml(q.answer||'')}</textarea><div class="small" id="count_${d.id}">0 / ${minWords} words</div><button class="btn" data-answer="${d.id}" disabled>Resubmit for Admin Approval</button>`:''}</div>`}).join('')}</div>
   <div class="card" style="margin-top:16px"><h3>Earnings Ledger</h3><p class="small">Commission is credited only after Admin approves the submitted answer.</p>${ep.ledger&&ep.ledger.length?ep.ledger.map(x=>`<div style="padding:10px 0;border-bottom:1px solid #eee"><b>Consultation #${escapeHtml(x.questionId)}</b><div class="small">Gross: ₹${Number(x.grossAmount||0).toFixed(2)} · Commission: ₹${Number(x.commissionAmount||0).toFixed(2)} · <span class="success">Credited</span></div></div>`).join(''):'<div class="empty">No credited consultations yet.</div>'}</div>
   <div class="card" style="margin-top:16px"><h3>Payment Method</h3><p class="small">Your bank/UPI details are private. Full details are not displayed again.</p><button class="btn gray" id="changePayoutBtn2">Change Payment Method</button></div>`;
   document.querySelectorAll('[data-claim-question]').forEach(b=>b.onclick=async()=>{b.disabled=true;b.textContent='CLAIMING...';try{const r=await withTimeout(callFunction('claimPublicQuestion',{questionId:b.dataset.claimQuestion}));if(r.data?.claimed)loadDashboard();}catch(e){alert(e.message||String(e));b.disabled=false;b.textContent='CLAIM & ANSWER';}});
   document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=async()=>{
     const answer=$('ans_'+b.dataset.answer)?.value.trim(); if(!answer){alert('Please write an answer.');return;}
     b.disabled=true;b.textContent='Submitting...';
     try{const submit=await withTimeout(callFunction('submitAstrologerAnswer',{questionId:b.dataset.answer,answer})); if(submit.data?.submitted){loadDashboard();}}
     catch(e){alert(e.message||String(e));b.disabled=false;b.textContent='Submit for Admin Approval';}
   });
   document.querySelectorAll('[id^="ans_"]').forEach(t=>{
     const id=t.id.slice(4), btn=document.querySelector(`[data-answer="${id}"]`), counter=$('count_'+id), q=qs.docs.find(x=>x.id===id)?.data()||{}, min=Number(q.answerMinWords||150);
     const updateCount=()=>{const n=t.value.trim()?t.value.trim().split(/\s+/).filter(Boolean).length:0;if(counter)counter.textContent=`${n} / ${min} words`;if(btn)btn.disabled=n<min;};
     t.addEventListener('input',updateCount);updateCount();
   });
   if($('withdrawBtn')) $('withdrawBtn').onclick=async()=>{
     const ep2=await withTimeout(callFunction('getAstrologerEarnings',{})); const available=Number(ep2.data?.availableToWithdraw||0); const min=Number(ep2.data?.minimumWithdrawal||300);
     openModal(`<h2>Withdraw Earnings</h2><p>Available: <b>₹${available.toFixed(2)}</b></p><p class="small">Minimum withdrawal: ₹${min.toFixed(2)}. Payment will be arranged by Admin within 24–48 hours.</p><input id="withdrawAmount" type="number" min="${min}" max="${available}" step="0.01" value="${available.toFixed(2)}" placeholder="Amount"><button class="btn" id="confirmWithdraw">REQUEST WITHDRAWAL</button><div id="withdrawMsg" class="small" style="margin-top:8px"></div>`);
     $('confirmWithdraw').onclick=async()=>{const amount=Number($('withdrawAmount').value);const btn2=$('confirmWithdraw');btn2.disabled=true;try{await withTimeout(callFunction('requestAstrologerWithdrawal',{amount}));$('withdrawMsg').innerHTML='<span class="success"><b>Withdrawal request received.</b><br>Admin will arrange payment within 24–48 hours.</span>';setTimeout(()=>{closeModal();loadDashboard();},1000);}catch(e){$('withdrawMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';btn2.disabled=false;}};
   };
   const change=()=>openPayoutChange();
   if($('changePayoutBtn')) $('changePayoutBtn').onclick=change;
   if($('changePayoutBtn2')) $('changePayoutBtn2').onclick=change;
  } else {
   const qs=await withTimeout(getDocs(query(collection(db,'smv_questions'),where('customerId','==',currentUser.uid))));
   const paid=qs.docs.filter(d=>d.data().status!=='awaiting_payment').length;
   box.innerHTML=`<div class="grid"><div class="card"><span class="badge">CUSTOMER</span><h3>Welcome, ${escapeHtml(data.name||currentUser.email||'Customer')}</h3><p>Email verification: <b>${currentUser.emailVerified?'Verified':'Pending from registration'}</b></p><p>Mobile: Private</p></div><div class="card"><h3>My Questions</h3><p>Total: <b>${qs.size}</b></p><p>Paid/processed: <b>${paid}</b></p></div></div>
   <div class="card" style="margin-top:16px"><h3>My Consultations</h3>${qs.empty?'<div class="empty">No consultations yet. Start a private consultation to choose an astrologer.</div>':qs.docs.slice(0,20).map(d=>{const q=d.data(); const reviewButton=q.status==='answered'&&!q.reviewed?`<button class="btn" data-review="${d.id}" data-astro="${q.astrologerId}">Rate & Review</button>`:''; const statusMap={awaiting_payment:'Payment Pending',payment_failed:'Payment Failed',pending_admin_approval:'Payment Received — Question Awaiting Admin Approval',paid:'Waiting for Astrologer',admin_approved:'Waiting for Astrologer',processing:'Processing',answer_draft:'Processing',admin_review:'Processing',revision_required:'Revision Required',answered:'Answer Ready',question_rejected:'Question Rejected'}; const astroName=q.astrologerName||'Selected Astrologer'; const statusText=q.status==='pending_admin_approval'?'Payment Received — Waiting for Admin Question Approval':q.status==='paid'||q.status==='admin_approved'?`Waiting for Astrologer — ${astroName}`:q.status==='processing'||q.status==='answer_draft'||q.status==='admin_review'?`Processing — ${astroName} answer received and under Admin review`:q.status==='answered'?'Answer Ready':(statusMap[q.status]||q.status||'Processing'); const steps=[['Payment Received',['pending_admin_approval','paid','admin_approved','processing','answer_draft','admin_review','answered'].includes(q.status)],['Question Approved',['paid','admin_approved','processing','answer_draft','admin_review','answered'].includes(q.status)],['Astrologer Answer Submitted',['processing','answer_draft','admin_review','answered'].includes(q.status)],['Admin Approval',['answered'].includes(q.status)],['Answer Ready',['answered'].includes(q.status)]]; const timeline=`<div class="timeline">${steps.map(x=>`<div class="timeline-step ${x[1]?'done':''}"><span>${x[1]?'✓':'○'}</span>${x[0]}</div>`).join('')}</div>`; return `<div style="padding:14px 0;border-bottom:1px solid #eee"><b>${escapeHtml(q.question||'Question')}</b><div class="small">Astrologer: <b>${escapeHtml(astroName)}</b> · Status: <b>${escapeHtml(statusText)}</b></div>${timeline}${q.answer&&q.status==='answered'?`<div class="card" style="margin-top:10px"><b>Astrologer Answer</b><p style="white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(q.answer)}</p></div>`:''}${reviewButton}</div>`}).join('')}</div>`;
   document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>openReview(b.dataset.review,b.dataset.astro));
  }
  const note=document.createElement('div'); note.className='card'; note.style.marginTop='16px'; note.innerHTML='<h3>Notifications</h3><div id="userNotifications"><div class="small">Loading...</div></div>'; box.appendChild(note); await renderNotifications('userNotifications'); show('dashboard'); touchSession(); armIdleTimer();
 }catch(e){box.innerHTML='<div class="card error">Could not load dashboard. Please refresh and try again.</div>';}
}
function openPayoutChange(){
 openModal(`<h2>Change Payment Method</h2><p class="small">For security, your previous bank/UPI details are not displayed. Enter the new details.</p>
 <input id="pBank" placeholder="Bank Name"><input id="pAccountName" placeholder="Account Holder Name"><input id="pAccount" inputmode="numeric" placeholder="Account Number"><input id="pIfsc" placeholder="IFSC"><input id="pUpi" placeholder="UPI ID (optional)"><button class="btn" id="savePayout">Submit for Admin Review</button><div id="payoutMsg" class="small"></div>`);
 $('savePayout').onclick=async()=>{try{await setDoc(doc(db,'smv_payouts',currentUser.uid),{uid:currentUser.uid,bankName:$('pBank').value.trim(),accountName:$('pAccountName').value.trim(),accountNumber:$('pAccount').value.trim(),ifsc:$('pIfsc').value.trim(),upi:$('pUpi').value.trim(),status:'pending_admin_review',updatedAt:serverTimestamp()},{merge:true});$('payoutMsg').innerHTML='<span class="success">Payment method submitted for Admin review.</span>';setTimeout(closeModal,600);}catch(e){$('payoutMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}}; 
}
function openReview(questionId,astroId){
 openModal(`<h2>Rate your consultation</h2><select id="reviewStars"><option value="5">★★★★★ — 5</option><option value="4">★★★★☆ — 4</option><option value="3">★★★☆☆ — 3</option><option value="2">★★☆☆☆ — 2</option><option value="1">★☆☆☆☆ — 1</option></select><textarea id="reviewText" placeholder="Write your review"></textarea><button class="btn" id="submitReview">Submit Review</button><div id="reviewMsg" class="small"></div>`);
 $('submitReview').onclick=async()=>{try{await withTimeout(callFunction('submitVerifiedReview',{questionId,astrologerId:astroId,rating:Number($('reviewStars').value),review:$('reviewText').value.trim()}));$('reviewMsg').innerHTML='<span class="success">Thank you. Your verified review was submitted.</span>';setTimeout(()=>{closeModal();loadDashboard();},500);}catch(e){$('reviewMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}}; 
}
async function loadAdminPanel(){
 if(!currentUser||currentUser.uid!==ADMIN_UID){hide('admin');return;}
 show('admin');
 try{
  const [users,astros,questions]=await Promise.all([withTimeout(getDocs(collection(db,'smv_users'))),withTimeout(getDocs(collection(db,'smv_astrologers'))),withTimeout(getDocs(collection(db,'smv_questions')))]);
  const customers=users.docs.filter(d=>d.data().role==='customer').length, pendingDocs=astros.docs.filter(d=>d.data().status==='pending'); const userMap=new Map(users.docs.map(d=>[d.id,d.data()]));
  $('adminSummary').innerHTML=`<div class="stat">Customers <b>${customers}</b></div><div class="stat">Astrologers <b>${astros.size}</b></div><div class="stat">Pending <b>${pendingDocs.length}</b></div><div class="stat">Questions <b>${questions.size}</b></div>`;
  let settings={astroPercent:20,adminPercent:80}; try{const ss=await getDoc(doc(db,'smv_settings','commission'));if(ss.exists())settings=ss.data();}catch(e){}
  let questionSettings={price:5}; try{const qps=await getDoc(doc(db,'smv_settings','question'));if(qps.exists())questionSettings=qps.data();}catch(e){}
  $('questionPrice').value=Number(questionSettings.price||5);
  $('saveQuestionPrice').onclick=async()=>{const price=Math.round(Number($('questionPrice').value)*100)/100;if(!Number.isFinite(price)||price<1){$('questionPriceMsg').innerHTML='<span class="error">Enter a valid price of at least ₹1.</span>';return;}await setDoc(doc(db,'smv_settings','question'),{price,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});$('questionPriceMsg').innerHTML='<span class="success">Current public question price saved: ₹'+price.toFixed(2)+'</span>';questionServicePrice=price;};
  $('astroCommission').value=settings.astroPercent??20;$('adminCommission').value=settings.adminPercent??80;
  $('saveCommission').onclick=async()=>{const a=Number($('astroCommission').value),ad=Number($('adminCommission').value);if(a<0||ad<0||Math.abs(a+ad-100)>0.001){$('commissionMsg').innerHTML='<span class="error">Astrologer % + Admin % must equal 100%.</span>';return;}await setDoc(doc(db,'smv_settings','commission'),{astroPercent:a,adminPercent:ad,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});$('commissionMsg').innerHTML='<span class="success">Commission settings saved.</span>';};
  let answerSettings={minimumWords:150}; try{const aw=await getDoc(doc(db,'smv_settings','answer'));if(aw.exists())answerSettings=aw.data();}catch(e){}
  $('minimumAnswerWords').value=Number(answerSettings.minimumWords||150);
  $('saveAnswerWords').onclick=async()=>{const n=Math.floor(Number($('minimumAnswerWords').value));if(!Number.isFinite(n)||n<1||n>10000){$('answerWordsMsg').innerHTML='<span class="error">Enter a minimum between 1 and 10000 words.</span>';return;}await setDoc(doc(db,'smv_settings','answer'),{minimumWords:n,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});$('answerWordsMsg').innerHTML='<span class="success">Minimum answer length saved: '+n+' words. It applies to new paid questions.</span>';};
  $('testRazorpayBtn').onclick=async()=>{const b=$('testRazorpayBtn');b.disabled=true;b.textContent='TESTING...';try{const r=await withTimeout(renderApi('/test-razorpay',{method:'GET'}),60000);$('razorpayTestMsg').innerHTML='<span class="success"><b>Razorpay connection OK.</b> '+escapeHtml(r?.message||'Render payment server and Razorpay API are working.')+'</span>';}catch(e){$('razorpayTestMsg').innerHTML='<span class="error"><b>Razorpay test failed:</b> '+escapeHtml(e.message||String(e))+'</span>';}b.disabled=false;b.textContent='TEST RAZORPAY CONNECTION';};

  const box=$('pendingAstros');
  box.innerHTML=pendingDocs.length?pendingDocs.map(d=>{const a=d.data();return `<div class="card" style="margin:10px 0">${a.photoData?`<img src="${a.photoData}" style="width:100px;height:100px;border-radius:50%;object-fit:cover">`:''}<h3>${escapeHtml(a.name||'Astrologer')}</h3><p><b>Email:</b> ${escapeHtml(userMap.get(d.id)?.email||'')}</p><p><b>Mobile:</b> ${escapeHtml(userMap.get(d.id)?.mobile||userMap.get(d.id)?.phone||'')}</p><p><b>Expertise:</b> ${escapeHtml(a.expertise||a.specialization||'')}</p><p><b>Experience:</b> ${escapeHtml(a.experience||0)} years</p><p><b>Bio:</b> ${escapeHtml(a.bio||a.about||'')}</p><div id="payout_${d.id}" class="small">Loading private payout details...</div><div class="action-row"><input id="price_${d.id}" type="number" min="1" placeholder="Consultation amount (Admin only)"><button class="btn" data-approve="${d.id}">APPROVE</button><button class="btn gray" data-reject="${d.id}">REJECT</button></div><input id="reject_${d.id}" placeholder="Rejection reason (required if rejecting)"></div>`}).join(''):'<div class="empty">No pending astrologer applications.</div>';
  for(const d of pendingDocs){try{const ps=await getDoc(doc(db,'smv_payouts',d.id));if(ps.exists()){const p=ps.data();$('payout_'+d.id).innerHTML=`<b>PRIVATE BANK/UPI:</b> Bank: ${escapeHtml(p.bankName||'')} · Holder: ${escapeHtml(p.accountName||'')} · Account: ${escapeHtml(p.accountNumber||'')} · IFSC: ${escapeHtml(p.ifsc||'')} · UPI: ${escapeHtml(p.upi||'')} · Status: ${escapeHtml(p.status||'')}`;}}catch(e){$('payout_'+d.id).textContent='Payout details unavailable.';}}
  box.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{const id=b.dataset.approve,price=Number($('price_'+id).value);if(!price||price<1){alert('Admin must set the consultation amount before approval. This amount is not shown publicly.');return;}await updateDoc(doc(db,'smv_astrologers',id),{status:'approved',pricePerQuestion:price,approvedAt:serverTimestamp(),approvedBy:currentUser.uid});await updateDoc(doc(db,'smv_users',id),{status:'active'});await setDoc(doc(db,'smv_notifications',id+'_approval_'+Date.now()),{userId:id,type:'approval',title:'Astrologer application approved',message:'Your profile has been approved by Admin.',createdAt:serverTimestamp(),read:false});loadAdminPanel();});
  box.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async()=>{const id=b.dataset.reject,reason=$('reject_'+id).value.trim();if(!reason){alert('Enter rejection reason.');return;}await updateDoc(doc(db,'smv_astrologers',id),{status:'rejected',rejectionReason:reason,rejectedAt:serverTimestamp(),rejectedBy:currentUser.uid});await updateDoc(doc(db,'smv_users',id),{status:'rejected'});await setDoc(doc(db,'smv_notifications',id+'_reject_'+Date.now()),{userId:id,type:'rejection',title:'Astrologer application requires changes',message:reason,createdAt:serverTimestamp(),read:false});loadAdminPanel();});

  const questionApprovalBox=$('adminPendingQuestions');
  const pendingQuestions=questions.docs.filter(d=>{const q=d.data();return q.status==='pending_admin_approval'||(q.status==='paid'&&!q.adminQuestionApprovedAt);});
  questionApprovalBox.innerHTML=pendingQuestions.length?pendingQuestions.map(d=>{const q=d.data();const bd=q.birthDetails||{};return `<div class="card" style="margin:10px 0"><h3>${escapeHtml(q.customerName||bd.name||'Customer')}</h3><p><b>Question:</b> ${escapeHtml(q.question||'')}</p><p><b>Birth:</b> ${escapeHtml(bd.birthDate||q.birthDate||'')} · ${escapeHtml(bd.birthTime||q.birthTime||'')} · ${escapeHtml(bd.birthPlace||q.birthPlace||'')} · ${escapeHtml(bd.birthGender||q.birthGender||'')}</p><p><b>Amount Paid:</b> ₹${Number(q.amount||0).toFixed(2)} · <b>Payment:</b> ${escapeHtml(q.paymentStatus||q.status||'')}</p><div class="action-row"><button class="btn" data-approve-question="${d.id}">APPROVE QUESTION</button><button class="btn gray" data-reject-question="${d.id}">REJECT QUESTION</button></div><input id="questionReject_${d.id}" placeholder="Rejection reason (required if rejecting)"></div>`}).join(''):'<div class="empty">No questions awaiting Admin approval.</div>';
  questionApprovalBox.querySelectorAll('[data-approve-question]').forEach(b=>b.onclick=async()=>{const id=b.dataset.approveQuestion;b.disabled=true;try{await withTimeout(callFunction('approvePublicQuestion',{questionId:id}));await loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
  questionApprovalBox.querySelectorAll('[data-reject-question]').forEach(b=>b.onclick=async()=>{const id=b.dataset.rejectQuestion,reason=$('questionReject_'+id).value.trim();if(!reason){alert('Enter rejection reason.');return;}b.disabled=true;try{await withTimeout(callFunction('rejectPublicQuestion',{questionId:id,reason}));await loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});

  const answerBox=$('adminAnswers');const pendingAnswers=questions.docs.filter(d=>d.data().status==='admin_review');
  answerBox.innerHTML=pendingAnswers.length?pendingAnswers.map(d=>{const q=d.data();return `<div class="card" style="margin:10px 0"><b>${escapeHtml(q.question||'Question')}</b><p>${escapeHtml(q.answer||'')}</p><div class="small">Astrologer: ${escapeHtml(q.astrologerId||'')}</div><div class="action-row"><button class="btn" data-approve-answer="${d.id}">APPROVE ANSWER</button><button class="btn gray" data-reject-answer="${d.id}">REJECT ANSWER</button></div><input id="answerReject_${d.id}" placeholder="Rejection reason"></div>`}).join(''):'<div class="empty">No answers awaiting approval.</div>';
  answerBox.querySelectorAll('[data-approve-answer]').forEach(b=>b.onclick=async()=>{const id=b.dataset.approveAnswer;b.disabled=true;try{await withTimeout(callFunction('approveAnswerAndCreditCommission',{questionId:id}));loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
  answerBox.querySelectorAll('[data-reject-answer]').forEach(b=>b.onclick=async()=>{const id=b.dataset.rejectAnswer,reason=$('answerReject_'+id).value.trim();if(!reason){alert('Enter rejection reason.');return;}await updateDoc(doc(db,'smv_questions',id),{status:'revision_required',adminRejectionReason:reason,adminRejectedAt:serverTimestamp()});const q=questions.docs.find(x=>x.id===id)?.data();if(q) await setDoc(doc(db,'smv_notifications',q.astrologerId+'_answer_reject_'+Date.now()),{userId:q.astrologerId,type:'answer_rejected',title:'Answer requires revision',message:reason,questionId:id,createdAt:serverTimestamp(),read:false});loadAdminPanel();});

  const withdrawalSnap=await getDocs(collection(db,'smv_withdrawals'));
  const withdrawalDocs=withdrawalSnap.docs.slice().sort((a,b)=>Number(b.data().createdAt?.seconds||0)-Number(a.data().createdAt?.seconds||0)).slice(0,50);
  $('adminWithdrawals').innerHTML=withdrawalDocs.length?withdrawalDocs.map(d=>{const w=d.data();return `<div class="card" style="margin:10px 0"><b>₹${Number(w.amount||0).toFixed(2)}</b> · ${escapeHtml(w.status||'pending')}<div class="small">Astrologer: ${escapeHtml(w.astrologerId||'')} · Requested: ${escapeHtml(w.createdAt?.toDate? w.createdAt.toDate().toLocaleString(): 'Recently')}</div><div class="action-row">${w.status==='pending'?`<button class="btn" data-wstatus="${d.id}" data-status="processing">MARK PROCESSING</button><button class="btn gray" data-wstatus="${d.id}" data-status="rejected">REJECT</button>`:''}${w.status==='processing'?`<button class="btn" data-wstatus="${d.id}" data-status="paid">MARK PAID</button>`:''}</div></div>`}).join(''):'<div class="empty">No withdrawal requests.</div>';
  $('adminWithdrawals').querySelectorAll('[data-wstatus]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await withTimeout(callFunction('adminUpdateWithdrawalStatus',{withdrawalId:b.dataset.wstatus,status:b.dataset.status}));loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
  const reviewsSnap=await getDocs(collection(db,'smv_reviews'));$('adminReviews').innerHTML=reviewsSnap.empty?'<div class="empty">No reviews yet.</div>':reviewsSnap.docs.slice(-50).reverse().map(d=>{const r=d.data();return `<div style="padding:10px;border-bottom:1px solid #eee">⭐ ${Number(r.rating||0)}/5 — ${escapeHtml(r.review||'')}<div class="small">Verified customer · Astrologer: ${escapeHtml(r.astrologerId||'')} · Status: <b>${r.approved===true?'Approved':'Pending'}</b></div>${r.approved===true?'':'<div class="action-row"><button class="btn" data-review-approve="'+d.id+'">APPROVE REVIEW</button><button class="btn gray" data-review-reject="'+d.id+'">REJECT REVIEW</button></div>'}</div>`}).join('');
  $('adminReviews').querySelectorAll('[data-review-approve]').forEach(b=>b.onclick=async()=>{await updateDoc(doc(db,'smv_reviews',b.dataset.reviewApprove),{approved:true,approvedAt:serverTimestamp(),approvedBy:currentUser.uid});loadAdminPanel();});
  $('adminReviews').querySelectorAll('[data-review-reject]').forEach(b=>b.onclick=async()=>{await deleteDoc(doc(db,'smv_reviews',b.dataset.reviewReject));loadAdminPanel();});
  $('adminQuestions').innerHTML=questions.empty?'<div class="empty">No questions yet.</div>':questions.docs.slice(-50).reverse().map(d=>{const q=d.data();return `<div style="padding:10px;border-bottom:1px solid #eee"><b>${escapeHtml(q.question||'Question')}</b><div class="small">Status: ${escapeHtml(q.status||'')} · Customer: ${escapeHtml(q.customerId||'')} · Price paid: ₹${Number(q.amount||0).toFixed(2)} · Astrologer share: ₹${Number(q.astrologerCommissionAmount||0).toFixed(2)} · Admin share: ₹${Number(q.adminCommissionAmount||0).toFixed(2)} · ${escapeHtml(q.astrologerName||'Unclaimed')}</div></div>`}).join('');
 }catch(e){$('adminSummary').innerHTML='';$('pendingAstros').innerHTML='<div class="empty error">Unable to load admin data: '+escapeHtml(e.message||String(e))+'</div>';}
}
// Final auth state listener: one source of truth.
if(auth){ onAuthStateChanged(auth,async user=>{
   const previousUid=lastAuthUid;
   currentUser=user;
   if(authReadyResolve){authReadyResolve();authReadyResolve=null;}
   if(previousUid && (!user || previousUid!==user.uid)){
     hide('dashboard'); hide('admin'); hide('dashLink'); hide('adminLink');
   }
   if(intentionalLogout) return;
   $('authBtn').textContent=user?'Logout':'Login';
   if(user){
     lastAuthUid=user.uid; touchSession(); armIdleTimer();
     if(user.uid===ADMIN_UID){ hide('dashLink'); show('adminLink'); }
     else { show('dashLink'); hide('adminLink'); }
   }else{
     clearIdleTimer(); lastAuthUid=null;
     hide('dashLink');hide('adminLink');hide('dashboard');hide('admin');
   }
 }); }
if(firebaseInitError){
  console.error("SMV ASTRO Firebase is unavailable. Basic navigation is still available.",firebaseInitError);
}

window.__SMV_APP_READY=true;
