
(function(){
  const BACKEND_URL=window.SMV_CONFIG.backendUrl;
  const $=id=>document.getElementById(id);

  function setupLocation(prefix){
    const place=$(prefix+'BirthPlace'),lat=$(prefix+'Lat'),lon=$(prefix+'Lon');
    if(!place||!lat||!lon||place.dataset.smvLocationBound==='1')return;
    place.dataset.smvLocationBound='1';
    const parent=place.parentElement; parent.classList.add('smv-location-wrap');
    const list=document.createElement('div'); list.className='smv-location-suggestions'; list.setAttribute('role','listbox'); parent.appendChild(list);
    const status=document.createElement('div'); status.className='smv-location-status'; parent.appendChild(status);
    let timer=null,controller=null,lastQuery='';
    function clear(){list.innerHTML='';list.classList.remove('show');}
    function statusText(t,c){status.textContent=t||'';status.className='smv-location-status'+(c?' '+c:'');}
    function choose(x){place.value=x.place||'';lat.value=Number(x.latitude).toFixed(6);lon.value=Number(x.longitude).toFixed(6);place.dataset.locationSelected='1';place.dataset.latitude=String(x.latitude);place.dataset.longitude=String(x.longitude);clear();statusText('');}
    function render(items){clear();if(!items.length){statusText('No matching location found. Please type a little more.','err');return;}items.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='smv-location-suggestion';b.setAttribute('role','option');b.textContent=x.place;b.addEventListener('click',()=>choose(x));list.appendChild(b);});list.classList.add('show');statusText('Select your exact place from the list.','');}
    async function search(q){if(q.length<2){clear();statusText('','');return;}if(q===lastQuery)return;lastQuery=q;if(controller)controller.abort();controller=new AbortController();statusText('Searching location…','');try{const r=await fetch((window.SMV_BACKEND_URL||window.SMV_CONFIG.backendUrl)+'/api/geocode?q='+encodeURIComponent(q),{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Location search failed');render(Array.isArray(data.results)?data.results:[]);}catch(e){if(e.name==='AbortError')return;clear();statusText(e.message||'Unable to search location.','err');}}
    place.addEventListener('input',()=>{place.dataset.locationSelected='0';lat.value='';lon.value='';lastQuery='';clearTimeout(timer);timer=setTimeout(()=>search(place.value.trim()),500);});
    place.addEventListener('focus',()=>{if(place.value.trim().length>=2&&list.children.length)list.classList.add('show');});
    document.addEventListener('click',e=>{if(!parent.contains(e.target))clear();});
  }
  setupLocation('english');

  $('generateEnglishHoroscope')?.addEventListener('click',async()=>{
    const date=$('englishDob')?.value||'',time=$('englishTob')?.value||'',place=$('englishBirthPlace')?.value.trim()||'',lat=$('englishLat')?.value||'',lon=$('englishLon')?.value||'';
    if(!date||!time){alert('Enter the date and time of birth.');return;}
    if(!place||place.length<2){
  alert('Enter your Place of Birth.');
  return;
}

if(lat===''||lon===''){
  alert('If the location is not available in the search list, enter Place of Birth, Latitude and Longitude manually.');
  return;
}
    // The existing, tested Swiss-Ephemeris renderer is reused as the calculation engine.
    // Its output is then translated into English; no second astronomical engine is introduced.
    const copy=(a,b)=>{if($(a)&&$(b))$(b).value=$(a).value;};
    copy('englishAstroName','tamilAstroName');copy('englishDob','tamilDob');copy('englishTob','tamilTob');copy('englishBirthPlace','tamilBirthPlace');copy('englishLat','tamilLat');copy('englishLon','tamilLon');copy('englishNakshatra','tamilNakshatra');
    const rmap=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
    const emap=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const ei=emap.indexOf($('englishRasi')?.value||'Aries');if($('tamilRasi'))$('tamilRasi').value=rmap[Math.max(0,ei)];
    const tplace=$('tamilBirthPlace');tplace.dataset.locationSelected='1';tplace.dataset.latitude=$('englishLat').value;tplace.dataset.longitude=$('englishLon').value;
    try{localStorage.setItem('smvLanguage','en');}catch(_e){}
    const englishResult=$('englishHoroscopeResult');
    // FINAL HOROSCOPE RELEASE RULE: do not open/show the horoscope result while
    // any calculation is still running. The Create Horoscope button is the only
    // loading indicator; chart + all new features are released together.
    if(englishResult){
      englishResult.classList.add('hidden');
      englishResult.setAttribute('aria-busy','true');
      englishResult.innerHTML='';
    }
    const btn=$('generateEnglishHoroscope');
    if(btn){btn.disabled=true;btn.textContent='⏳ Creating Horoscope…';}
    let englishProgress=$('englishHoroscopeProgress'); if(!englishProgress&&btn){englishProgress=document.createElement('div');englishProgress.id='englishHoroscopeProgress';englishProgress.className='smv-horoscope-progress';englishProgress.innerHTML='<span class="spin"></span><span>Creating Horoscope…<br>Preparing all calculations and features…</span>';btn.insertAdjacentElement('afterend',englishProgress);}
    try{
      const normalizeHoroscopeTime=value=>{
        const s=String(value||'').trim();
        let m=s.match(/^(\d{1,2}):([0-5]\d)$/);
        if(m){const h=Number(m[1]);if(h>=0&&h<=23)return `${String(h).padStart(2,'0')}:${m[2]}`;}
        m=s.match(/^(\d{1,2})[.:]([0-5]\d)\s*(AM|PM)$/i);
        if(m){let h=Number(m[1]);const ap=m[3].toUpperCase();if(h<1||h>12)return '';if(ap==='AM')h=h===12?0:h;else h=h===12?12:h+12;return `${String(h).padStart(2,'0')}:${m[2]}`;}
        return '';
      };
      const normalizedTime=normalizeHoroscopeTime(time);
      if(!normalizedTime)throw new Error('Enter a valid birth time, for example 22:05 (10:05 PM).');
      if(typeof window.__smvGenerateHoroscopeEngine!=='function')throw new Error('Horoscope engine is not ready. Please refresh the page.');
      // ENGLISH FLOW REPAIR:
      // Do NOT start a second Advanced request against the Tamil DOM and do NOT copy
      // a partially populated Advanced tree. First build the core chart, copy only
      // that stable core result, rename the containers, then run ONE complete
      // /api/horoscope/full request directly into the English Advanced root.
      const generated=await window.__smvGenerateHoroscopeEngine(false);
      const source=$('tamilHoroscopeResult'),target=$('englishHoroscopeResult');
      if(source&&target&&source.innerHTML.trim()){
        target.innerHTML=source.innerHTML;
        const copiedAdv=target.querySelector('#tamilAdvancedAstrology');
        if(copiedAdv){ copiedAdv.id='englishAdvancedAstrology'; copiedAdv.classList.add('hidden'); }
        const copiedTransitSlot=target.querySelector('#tamilDailyTransitPanchangSlot');
        if(copiedTransitSlot) copiedTransitSlot.id='englishDailyTransitPanchangSlot';

        target.classList.add('hidden');target.setAttribute('aria-busy','true');
        source.classList.add('hidden');

        if(typeof window.__smvApplyEnglishToHoroscope!=='function') throw new Error('English horoscope translator is not ready. Please refresh the page.');
        if(typeof window.__smvBindHoroscopeInteractions!=='function') throw new Error('English horoscope interactions are not ready. Please refresh the page.');
        window.__smvApplyEnglishToHoroscope(target);
        window.__smvBindHoroscopeInteractions(target,generated||{},$('englishAstroName')?.value?.trim()||'User','en');

        const englishAdvancedRoot=$('englishAdvancedAstrology');
        if(!englishAdvancedRoot || typeof window.__smvLoadAdvancedAstrology!=='function'){
          throw new Error('English Advanced Astrology container is not ready.');
        }
        // This is the ONLY English Advanced request. It uses the English root,
        // the verified core chart, and the current generation id, so an older
        // Tamil request cannot abort or overwrite it.
        await window.__smvLoadAdvancedAstrology({
          date,time:normalizedTime,lat,lon,lang:'en',
          rootId:'englishAdvancedAstrology',
          name:($('englishAstroName')?.value||'').trim(),
          chart:generated||null,
          generationId:window.__smvHoroscopeGenerationId
        });

        /* SINGLE ENGLISH RELEASE: the complete core + Advanced + Panchang +
           Transit + Dasa batch is now ready. */
        if(typeof window.__smvForceEnglishRahuRetrograde==='function'){
          window.__smvForceEnglishRahuRetrograde(target);
        }
        target.classList.remove('hidden');
        target.setAttribute('aria-busy','false');
        if(typeof window.__smvFixEnglishBhavaHeaders==='function') window.__smvFixEnglishBhavaHeaders();
        target.scrollIntoView({behavior:'smooth',block:'start'});
      }else throw new Error('Horoscope result was not returned.');
    }catch(e){
      if(englishResult){englishResult.setAttribute('aria-busy','false');englishResult.classList.add('hidden');englishResult.innerHTML='';}
      alert(e?.message||String(e));
    }
    finally{
      if(englishResult) englishResult.setAttribute('aria-busy','false');
      if(btn){btn.disabled=false;btn.textContent='🔮 Create Horoscope';}
      if(englishProgress) englishProgress.remove();
    }
  });
  $('clearEnglishHoroscope')?.addEventListener('click',()=>{['englishAstroName','englishDob','englishTob','englishBirthPlace','englishNakshatra','englishLat','englishLon'].forEach(id=>{if($(id))$(id).value='';});if($('englishRasi'))$('englishRasi').value='Aries';if($('englishBirthPlace')){$('englishBirthPlace').dataset.locationSelected='0';$('englishBirthPlace').dataset.latitude='';$('englishBirthPlace').dataset.longitude='';}if($('englishHoroscopeResult')){$('englishHoroscopeResult').classList.add('hidden');$('englishHoroscopeResult').innerHTML='';}});
})();
