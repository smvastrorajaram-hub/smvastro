
/* V174: FAQ section collapse only. Does not change FAQ question <details> behavior. */
(function(){
'use strict';
function initFAQ(){
  const sec=document.getElementById('faq');
  if(!sec || sec.dataset.smvV174Faq==='1') return;
  const list=sec.querySelector(':scope > .faq-list');
  if(!list) return;
  sec.dataset.smvV174Faq='1';
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='smv-v174-faq-toggle';
  btn.textContent='▼';
  btn.title='Collapse';
  btn.setAttribute('aria-label','Collapse FAQ section');
  btn.addEventListener('click',function(e){
    e.preventDefault(); e.stopPropagation();
    const closed=sec.classList.toggle('smv-v174-faq-collapsed');
    btn.textContent=closed?'▶':'▼';
    btn.title=closed?'Expand':'Collapse';
    btn.setAttribute('aria-label',closed?'Expand FAQ section':'Collapse FAQ section');
  });
  sec.appendChild(btn);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initFAQ,{once:true});
else initFAQ();
})();
