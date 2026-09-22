// Server-side change signals. Full records remain behind existing authorized APIs.
module.exports=function registerDashboardEvents(app,{db,requireUser,isAdminUser}){
 app.get('/dashboard/events',async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  let stopped=false,heartbeat,expiry,debounce;const unsubs=[];
  function stop(){if(stopped)return;stopped=true;clearInterval(heartbeat);clearTimeout(expiry);clearTimeout(debounce);unsubs.forEach(fn=>fn());if(!res.writableEnded)res.end();}
  res.on('close',stop);
  try{
   const [adminUser,profile,astro]=await Promise.all([isAdminUser(user),db.collection('smv_users').doc(user.uid).get(),db.collection('smv_astrologers').doc(user.uid).get()]);
   if(stopped)return;
   const role=adminUser?'admin':String(profile.data()?.role||'customer');
   res.status(200).set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
   res.flushHeaders();
   const send=event=>{if(!stopped)res.write(`event: ${event}\ndata: {}\n\n`);};
   const changed=()=>{clearTimeout(debounce);debounce=setTimeout(()=>send('change'),100);};
   const refs=[db.collection('smv_users').doc(user.uid)];
   if(role==='admin'){
    ['smv_questions','smv_astrologers','smv_users','smv_withdrawals','smv_payments','smv_payouts','smv_settings','smv_notifications','smv_reviews'].forEach(name=>refs.push(db.collection(name)));
   }else{
    refs.push(db.collection('smv_questions').where(role==='astrologer'?'astrologerId':'customerId','==',user.uid),db.collection('smv_notifications').where('userId','==',user.uid));
    if(role==='astrologer'){
     refs.push(db.collection('smv_astrologers').doc(user.uid),db.collection('smv_withdrawals').where('astrologerId','==',user.uid));
     if(String(astro.data()?.status)==='approved')refs.push(db.collection('smv_questions').where('status','==','available_to_astrologers'),db.collection('smv_settings').doc('workflow'));
    }
   }
   let waiting=refs.length;
   refs.forEach((ref,index)=>{
    let first=true;
    unsubs.push(ref.onSnapshot(()=>{
     if(first){first=false;if(--waiting===0)send('ready');return;}
     // Recheck access at reconnect after own role/approval changes.
     if(index===0 || (role==='astrologer'&&index===3)){send('change');stop();return;}
     changed();
    },err=>{console.warn('Dashboard stream listener failed:',err.code||err.message);stop();}));
   });
   heartbeat=setInterval(()=>{if(!stopped)res.write(': heartbeat\n\n');},20000);
   // Reauthenticate on reconnect; never outlive the verified ID token.
   expiry=setTimeout(stop,Math.max(1000,Math.min(25*60*1000,(Number(user.exp)*1000||Date.now()+25*60*1000)-Date.now())));
  }catch(e){if(!res.headersSent){res.status(500).json({error:'Live updates temporarily unavailable.'});}stop();}
 });
};
