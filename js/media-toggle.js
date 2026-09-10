
(function(){
  'use strict';
  function setup(){
    const el=document.querySelector('.smv-v173-subregion[data-sup="media"]');
    if(!el || el.dataset.smvMediaToggle==='1') return;
    const head=el.querySelector('.smv-media-title-toggle');
    const btn=el.querySelector('.smv-v173-sub-collapse');
    if(!head || !btn) return;
    el.dataset.smvMediaToggle='1';
    function toggle(e){
      if(e && e.target===btn) return;
      e?.preventDefault(); e?.stopPropagation();
      const closed=el.classList.toggle('smv-v173-sub-collapsed');
      btn.textContent=closed?'▶':'▼';
      btn.title=closed?'Expand':'Collapse';
      btn.setAttribute('aria-label',closed?'Expand Media':'Collapse Media');
      head.setAttribute('aria-expanded',String(!closed));
    }
    head.addEventListener('click',toggle);
    head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){toggle(e);}});
    btn.addEventListener('click',e=>{
      e.preventDefault(); e.stopPropagation();
      const closed=el.classList.toggle('smv-v173-sub-collapsed');
      btn.textContent=closed?'▶':'▼';
      btn.title=closed?'Expand':'Collapse';
      btn.setAttribute('aria-label',closed?'Expand Media':'Collapse Media');
      head.setAttribute('aria-expanded',String(!closed));
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
  setTimeout(setup,600);
  setTimeout(setup,1500);
})();
