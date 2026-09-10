
(function(){
  const nav=document.getElementById('horoscopeNav');
  if(nav && nav.dataset.v24!=='1'){
    nav.dataset.v24='1';
    nav.addEventListener('click',()=>document.body.classList.add('smv-horoscope-active'),true);
  }
  document.getElementById('generateEnglishHoroscope')?.addEventListener('click',()=>document.body.classList.add('smv-horoscope-active'),true);
  document.getElementById('generateTamilHoroscope')?.addEventListener('click',()=>document.body.classList.add('smv-horoscope-active'),true);
  document.querySelector('header a[href="#home"]')?.addEventListener('click',()=>document.body.classList.remove('smv-horoscope-active'),true);
})();
