
(function(){
  'use strict';
  function setupMedia(){
    const el=document.querySelector('.smv-v173-subregion[data-sup="media"]');
    if(!el) return;
    const head=el.querySelector('.smv-media-title-toggle');
    const btn=el.querySelector('.smv-v173-sub-collapse');
    if(!head || !btn) return;
    function sync(){
      const closed=el.classList.contains('smv-v173-sub-collapsed');
      btn.textContent=closed?'▶':'▼';
      btn.title=closed?'Expand':'Collapse';
      btn.setAttribute('aria-label',closed?'Expand Media':'Collapse Media');
      head.setAttribute('aria-expanded',String(!closed));
    }
    function toggle(){
      el.classList.toggle('smv-v173-sub-collapsed');
      sync();
    }
    if(el.dataset.smvMediaFinal==='1'){sync();return;}
    el.dataset.smvMediaFinal='1';
    head.addEventListener('click',function(e){
      if(e.target===btn || btn.contains(e.target)) return;
      e.preventDefault(); e.stopPropagation(); toggle();
    });
    btn.addEventListener('click',function(e){
      e.preventDefault(); e.stopPropagation(); toggle();
    });
    el.addEventListener('click',function(e){
      const title=e.target.closest('.smv-media-content-title');
      if(title && el.contains(title)){
        e.preventDefault(); e.stopPropagation(); toggle();
      }
    });
    sync();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',setupMedia,{once:true});
  }else setupMedia();
  setTimeout(setupMedia,300);
  setTimeout(setupMedia,1000);
  setTimeout(setupMedia,2000);
})();
