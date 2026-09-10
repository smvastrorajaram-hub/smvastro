
document.addEventListener('DOMContentLoaded', function(){
  /* V29: Keep the Bhava Chart visible and keep a separate Bhava Table heading. */
  document.querySelectorAll('#tamilHoroscopeResult, #englishHoroscopeResult').forEach(function(root){
    root.querySelectorAll('h3').forEach(function(h){
      const t=(h.textContent||'').trim();
      if(t.includes('பாவக கட்டம் (Bhava Chart)') || t.includes('பாவக கட்டம் (Bhava Table)')){
        h.textContent='Bhava Chart';
      }
    });
  });
});
