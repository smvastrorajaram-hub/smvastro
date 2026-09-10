
/* English-only presentation fix:
   Rahu/Ketu are always shown as Retrograde in Planetary Positions and
   Sarvatobhadra Chakra, matching the requested traditional presentation.
   No MutationObserver is used, so this cannot create a render loop/freeze. */
(function(){
  const isNodePlanet=(v)=>{
    const q=String(v??'').trim().toLowerCase();
    return q==='rahu'||q==='ketu'||q==='ராகு'||q==='கேது';
  };
  window.__smvForceEnglishRahuRetrograde=function(root){
    if(!root)return;
    root.querySelectorAll('tr').forEach(tr=>{
      const cells=[...tr.children];
      if(!cells.length || !isNodePlanet(cells[0]?.textContent)) return;
      cells.forEach(td=>{
        const q=(td.textContent||'').trim();
        if(/^(Direct|Retrograde|வக்கிரம்|வக்ரம்|நேர்கதி)$/i.test(q)){
          td.textContent='Retrograde';
        }
      });
    });
    root.querySelectorAll('.transit-planet').forEach(card=>{
      const b=card.querySelector('b');
      if(!b || !isNodePlanet(b.textContent))return;
      card.querySelectorAll('span').forEach(sp=>{
        if(/^(Direct|Retrograde|வக்கிரம்|வக்ரம்|நேர்கதி)$/i.test((sp.textContent||'').trim()))
          sp.textContent='Retrograde';
      });
    });
  };
})();
