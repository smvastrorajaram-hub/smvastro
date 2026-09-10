
(function(){
  if(window.__SMV_ASKNOW_HARD_ROUTER_V2__) return;
  window.__SMV_ASKNOW_HARD_ROUTER_V2__=true;
  document.addEventListener("click", function(e){
    const btn=e.target && e.target.closest ? e.target.closest("#askNowButton") : null;
    if(!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.__SMV_ASK_NOW_INTENT=true;
    const fn=window.__smvOpenQuestionService;
    if(typeof fn!=="function"){ console.error("ASK NOW hard router: controller not ready"); return; }
    Promise.resolve(fn()).catch(err=>console.error("ASK NOW hard route failed:",err));
  }, true);
})();
