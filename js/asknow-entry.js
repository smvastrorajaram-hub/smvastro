
(function(){
  if(window.__SMV_FRESH_ASKNOW_ROUTER__) return;
  window.__SMV_FRESH_ASKNOW_ROUTER__=true;
  function bind(){
    const btn=document.getElementById("askNowButton");
    if(!btn || btn.dataset.smvBound==="1") return;
    btn.dataset.smvBound="1";
    btn.addEventListener("click",function(e){
      e.preventDefault(); e.stopPropagation();
      const fn=window.__smvOpenQuestionService;
      if(typeof fn!=="function"){
        console.error("ASK NOW controller is not ready");
        return;
      }
      Promise.resolve(fn()).catch(err=>console.error("ASK NOW failed:",err));
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
  window.addEventListener("load",bind,{once:true});
})();
