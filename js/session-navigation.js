
/* V119: final repair layer — Contact, logout indicator, approved astrologers only. */
(function(){
  function openContact(e){
    if(e){e.preventDefault();e.stopPropagation();}
    const contact=document.getElementById('contact');
    if(!contact)return;
    contact.classList.remove('hidden');
    try{contact.scrollIntoView({behavior:'smooth',block:'start'});}catch(_){contact.scrollIntoView();}
  }
  document.addEventListener('click',function(e){
    const link=e.target.closest && e.target.closest('#contactNav');
    if(link)openContact(e);
  },true);
  document.addEventListener('DOMContentLoaded',function(){
    window.__smvSetupLanguage?.();
    const link=document.getElementById('contactNav');
    if(link)link.onclick=openContact;
  },{once:true});

  function forceAuthButtonSync(){
    const b=document.getElementById('authBtn');
    if(!b)return;
    if(window.__SMV_LOGGED_OUT===true){b.textContent='Login';return;}
    const hasUser = !!(window.__smvCurrentUserPresent===true);
    if(!hasUser && (b.textContent||'').trim().toLowerCase()==='logout') b.textContent='Login';
  }
  window.addEventListener('smv:auth-user',()=>{window.__SMV_LOGGED_OUT=false;forceAuthButtonSync();});
  window.addEventListener('smv:logged-out',function(){
    const b=document.getElementById('authBtn');
    if(b)b.textContent='Login';
  });
  setInterval(function(){
    if(window.__SMV_LOGGED_OUT===true){const b=document.getElementById('authBtn');if(b)b.textContent='Login';}
  },500);
  function retryAstrologers(){
    const box=document.getElementById('astroCards');
    if(!box)return;
    const t=(box.textContent||'').toLowerCase();
    if(t.includes('loading astrologers')||t.includes('loading approved astrologers')){
      const fn=window.__smvReloadAstrologers;
      if(typeof fn==='function')Promise.resolve(fn()).catch(err=>console.error('V119 astrologer retry failed',err));
    }
  }
  setTimeout(retryAstrologers,1500);
  setTimeout(retryAstrologers,5000);
  setTimeout(retryAstrologers,12000);
})();
