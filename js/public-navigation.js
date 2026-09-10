
/* SMV FINAL DASHBOARD-ONLY GUARD */
(function(){
  function clean(){
    const view=document.getElementById("dashboard");
    if(!view || view.classList.contains("hidden")) return;
    ["smv-content-hub","horoscope","horoscope-tools","tamil-horoscope","english-horoscope"].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.classList.add("hidden");
    });
  }
  window.addEventListener("hashchange",clean);
  window.addEventListener("popstate",()=>setTimeout(clean,0));
  document.addEventListener("smv:dashboard-opened",clean);
})();
