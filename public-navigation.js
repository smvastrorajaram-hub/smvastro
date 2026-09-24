(function(){
 'use strict';
 const targets=new Set(['home','english-horoscope','private-consultation','smv-content-hub','publicBlogs','publicMedia','about','contact','askNowSection','faq']);
 let revision=0;
 function selection(id){
  const mapped={publicBlogs:'publicBlogs',publicMedia:'publicMedia',askNowSection:'home','smv-content-hub':'publicBlogs','private-consultation':'private-consultation'};
  document.querySelectorAll('#smvPremiumHeaderV9 .smv9-menu > a,#smvPremiumHeaderV9 .smv9-menu > button').forEach(el=>{
   const key=el.dataset.smvRoute||(el.getAttribute('href')||'').slice(1),active=key===(mapped[id]||id);
   el.classList.remove('active');el.classList.toggle('smv-nav-current',active);
   if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
  });
 }
 function navigate(id,{historyMode='push'}={}){
  if(!targets.has(id))return false;
  const target=document.getElementById(id);if(!target)return false;
  const ticket=++revision;window.__SMV_PUBLIC_ROUTE=id;window.__smvPreparePublicNavigation?.();
  ['dashboard','admin','smv-dashboard-page','ask-flow','register-flow','astro-register-form','astro-flow','contact'].forEach(key=>document.getElementById(key)?.classList.add('hidden'));
  document.body.dataset.smvWorkspace='closed';document.body.classList.remove('smv-horoscope-active');
  document.getElementById('smv-public-page')?.classList.remove('hidden');
  const publicSections=['home','askNowSection','faq','smv-content-hub','english-horoscope','about'];
  if(id==='private-consultation'){
   publicSections.forEach(key=>document.getElementById(key)?.classList.add('hidden'));
   document.getElementById('astrologer-directory')?.classList.add('hidden');
   target.classList.remove('hidden');
   window.dispatchEvent(new Event('smv:private-consultation-open'));
  }else{
   document.getElementById('astrologer-directory')?.classList.add('hidden');
   document.getElementById('private-consultation')?.classList.add('hidden');
   publicSections.forEach(key=>document.getElementById(key)?.classList.remove('hidden'));
  }
  if(id==='contact')target.classList.remove('hidden');
  if(['publicBlogs','publicMedia','smv-content-hub'].includes(id))window.__smvContentVisible=true;
  if(id==='english-horoscope')window.__smvPublicHoroscopeVisible=true;
  for(let el=target;el&&el!==document.body;el=el.parentElement){
   el.classList.remove('hidden','smv-v173-home-collapsed','smv-v173-sub-collapsed','smv-v174-faq-collapsed');
  }
  selection(id);
  if(historyMode==='push'&&location.hash!=='#'+id)history.pushState({smvView:'public',section:id},'','#'+id);
  if(historyMode==='replace')history.replaceState({smvView:'public',section:id},'','#'+id);
  requestAnimationFrame(()=>{if(ticket===revision)target.scrollIntoView({behavior:'auto',block:'start'});});
  return true;
 }
 window.__smvNavigatePublic=navigate;
 document.addEventListener('click',event=>{
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const control=event.target.closest?.('a[href^="#"],[data-smv-route]');if(!control)return;
  const id=control.dataset.smvRoute||(control.getAttribute('href')||'').slice(1);if(!targets.has(id))return;
  event.preventDefault();event.stopImmediatePropagation();navigate(id);
 },true);
 document.addEventListener('click',event=>{
  const back=event.target.closest?.('#privateConsultationBack');if(!back)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(new URLSearchParams(location.search).get('view')==='consult'){
   window.close();
   setTimeout(()=>{if(!window.closed)location.href='./#home';},120);
   return;
  }
  navigate('home',{historyMode:'push'});
 },true);
 window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(targets.has(id))navigate(id,{historyMode:'none'});});
 window.addEventListener('popstate',()=>{const id=location.hash.slice(1)||'home';if(targets.has(id))navigate(id,{historyMode:'none'});});
 function restore(){
  const params=new URLSearchParams(location.search);
  if(params.get('view')==='consult'){navigate('private-consultation',{historyMode:'none'});return;}
  const id=location.hash.slice(1);if(targets.has(id)&&id!=='home')navigate(id,{historyMode:'none'});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});else restore();
})();
