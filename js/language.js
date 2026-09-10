/* One website language controller. Never translates IDs, entered data, or stored records. */
(()=>{
 const select=document.getElementById('langSelect');
 const ui=Object.assign({},window.SMV_TAMIL_UI,{
 'Sri Madurai Veerayah Astro Services':'ஸ்ரீ மதுரை வீரையா ஜோதிட சேவைகள்',
 'Horoscope & personal astrology consultation':'ஜாதகம் மற்றும் தனிப்பட்ட ஜோதிட ஆலோசனை',
 'Explore your birth chart or ask an astrologer about your life, family and career.':'உங்கள் பிறப்பு ஜாதகத்தைப் பார்க்கவும். வாழ்க்கை, குடும்பம், தொழில் தொடர்பான கேள்விகளை ஜோதிடரிடம் கேளுங்கள்.',
 'Blogs':'வலைப்பதிவுகள்','Blogs & Media':'வலைப்பதிவுகள் மற்றும் ஊடகங்கள்','Media':'ஊடகங்கள்','No published blogs yet.':'இன்னும் வலைப்பதிவுகள் வெளியிடப்படவில்லை.','No published media yet.':'இன்னும் ஊடகங்கள் வெளியிடப்படவில்லை.','Show password':'கடவுச்சொல்லைக் காட்டு','Hide password':'கடவுச்சொல்லை மறை','Install SMV ASTRO App':'SMV ASTRO செயலியை நிறுவுக','INSTALL APP':'செயலியை நிறுவுக',
 'Horoscope':'ஜாதகம்','Create Horoscope':'ஜாதகம் உருவாக்குக','Language':'மொழி',
 'PRIVATE ASTROLOGY CONSULTATION':'தனிப்பட்ட ஜோதிட ஆலோசனை','Have a Question About Your Life?':'உங்கள் வாழ்க்கை குறித்து கேள்வி உள்ளதா?',
 'Ask a personal astrology question and receive thoughtful guidance based on your birth details. Your question is handled privately by our astrology service.':'உங்கள் பிறந்த விவரங்களின் அடிப்படையில் தனிப்பட்ட ஜோதிட ஆலோசனையைப் பெறுங்கள். உங்கள் கேள்வி தனிப்பட்ட முறையில் கையாளப்படும்.',
 'Login is required before you submit your question.':'கேள்வியைச் சமர்ப்பிக்க முதலில் உள்நுழையுங்கள்.',
 'Loading approved astrologers...':'ஜோதிடர்கள் விவரம் ஏற்றப்படுகிறது…','Loading blogs...':'வலைப்பதிவுகள் ஏற்றப்படுகின்றன…','Loading media...':'ஊடகங்கள் ஏற்றப்படுகின்றன…'
 });
 const original=new WeakMap(), attributes=new WeakMap();let lang='ta';let queued=false;
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function translator(dict){const keys=Object.keys(dict).filter(k=>k && dict[k]!==k).sort((a,b)=>b.length-a.length);const pattern=new RegExp(keys.map(k=>'(?<![A-Za-z])'+escape(k)+'(?![A-Za-z])').join('|'),'g');return value=>dict[value.trim()] ? value.replace(value.trim(),dict[value.trim()]) : value.replace(pattern,key=>dict[key]);}
 const toTamil=translator(ui), chartTamil=translator(window.SMV_TAMIL_HOROSCOPE||{});
 const skip='script,style,textarea,input,select,[translate="no"],#tamilHoroscopeResult,#englishHoroscopeResult';
 function translateUI(){
  const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while(n=walk.nextNode()){
   if(!n.nodeValue.trim()||n.parentElement?.closest(skip))continue;
   let state=original.get(n);if(!state||n.nodeValue!==state.rendered)state={source:n.nodeValue};
   const value=lang==='ta'?toTamil(state.source):state.source;if(n.nodeValue!==value)n.nodeValue=value;
   state.rendered=value;original.set(n,state);
  }
  document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>{
   if(el.closest('#horoscope,[translate="no"]'))return;
   let state=attributes.get(el)||{};
   for(const a of ['placeholder','title','aria-label'])if(el.hasAttribute(a)){
    const value=el.getAttribute(a);if(!state[a]||state[a].rendered!==value)state[a]={source:value};
    const next=lang==='ta'?toTamil(state[a].source):state[a].source;
    if(next!==value)el.setAttribute(a,next);state[a].rendered=next;
   }attributes.set(el,state);
  });
 }
 function translateTamilChart(){
  const root=document.getElementById('tamilHoroscopeResult');if(!root)return;
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
  while(n=walk.nextNode())if(n.nodeValue.trim()&&!n.parentElement?.closest('script,style,input,textarea,[translate="no"]')){const value=chartTamil(n.nodeValue);if(value!==n.nodeValue)n.nodeValue=value;}
 }
 const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});});
 function refresh(){observer.disconnect();translateUI();translateTamilChart();observer.observe(document.body,{subtree:true,childList:true,characterData:true});}
 function syncBirthFields(from,to){
  for(const suffix of ['AstroName','Dob','Tob','BirthPlace','Lat','Lon','Nakshatra']){
   const a=document.getElementById(from+suffix),b=document.getElementById(to+suffix);if(a&&b){b.value=a.value;for(const k of ['locationSelected','latitude','longitude'])if(k in a.dataset)b.dataset[k]=a.dataset[k];}
  }
  const a=document.getElementById(from+'Rasi'),b=document.getElementById(to+'Rasi');if(a&&b)b.selectedIndex=a.selectedIndex;
 }
 function apply(next,copy=true){
  next=next==='en'?'en':'ta';
  if(window.__smvHoroscopeGenerating){select.value=lang;return;}
  const hadResult=copy&&next!==lang&&!!document.querySelector('#tamilHoroscopeResult:not(.hidden) h3,#englishHoroscopeResult:not(.hidden) h3');
  if(copy&&next!==lang)syncBirthFields(lang==='ta'?'tamil':'english',next==='ta'?'tamil':'english');
  lang=next;select.value=lang;document.documentElement.lang=lang;document.body.classList.toggle('lang-tamil',lang==='ta');window.__smvCurrentLanguage=lang;
  try{localStorage.setItem('smvLanguage',lang);}catch{}
  document.getElementById('tamil-horoscope').classList.toggle('language-exclusive-hide',lang!=='ta');
  document.getElementById('english-horoscope').classList.toggle('language-exclusive-hide',lang!=='en');
  // Existing results stay with their original language. Birth inputs survive switches.
  refresh();document.dispatchEvent(new CustomEvent('smv:language',{detail:{language:lang}}));
  if(hadResult) document.getElementById(lang==='ta'?'generateTamilHoroscope':'generateEnglishHoroscope').click();
 }
 select.addEventListener('change',()=>apply(select.value));
 window.__smvSetupLanguage=()=>{};window.__smvTranslateCurrentLanguage=refresh;window.__smvToggleLanguage=()=>apply(lang==='ta'?'en':'ta');
 document.querySelectorAll('a[href="#horoscope"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.getElementById('horoscope').scrollIntoView({behavior:'smooth'});}));
 // Do not allow language changes during an in-flight calculation.
 for(const id of ['generateTamilHoroscope','generateEnglishHoroscope']){
  const b=document.getElementById(id);new MutationObserver(()=>{select.disabled=!!document.querySelector('#generateTamilHoroscope:disabled,#generateEnglishHoroscope:disabled');}).observe(b,{attributes:true,attributeFilter:['disabled']});
 }
 let saved='ta';try{saved=localStorage.getItem('smvLanguage')||'ta';}catch{}apply(saved,false);
})();
