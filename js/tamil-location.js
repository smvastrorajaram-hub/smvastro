

(function(){
  const place = document.getElementById('tamilBirthPlace');
  const lat = document.getElementById('tamilLat');
  const lon = document.getElementById('tamilLon');
  if(!place || !lat || !lon) return;
  const parent = place.parentElement;
  parent.classList.add('smv-location-wrap');
  const list = document.createElement('div');
  list.className='smv-location-suggestions';
  list.setAttribute('role','listbox');
  parent.appendChild(list);
  const status=document.createElement('div');
  status.className='smv-location-status';
  parent.appendChild(status);
  let timer=null, controller=null, lastQuery='';
  function clearList(){list.innerHTML='';list.classList.remove('show');}
  function setStatus(text, cls){status.textContent=text||'';status.className='smv-location-status'+(cls?' '+cls:'');}
  function choose(item){
    place.value=item.place||'';
    lat.value=Number(item.latitude).toFixed(6);
    lon.value=Number(item.longitude).toFixed(6);
    place.dataset.locationSelected='1';
    place.dataset.latitude=String(item.latitude);
    place.dataset.longitude=String(item.longitude);
    clearList();
    setStatus('');
  }
  function render(items){
    clearList();
    if(!items.length){setStatus('No matching location found. Please type a little more.','err');return;}
    items.forEach(item=>{
      const b=document.createElement('button');
      b.type='button';b.className='smv-location-suggestion';b.setAttribute('role','option');
      b.textContent=item.place;
      b.addEventListener('click',()=>choose(item));
      list.appendChild(b);
    });
    list.classList.add('show');
    setStatus('Select your exact place from the list.','');
  }
  async function search(q){
    if(q.length<2){clearList();setStatus('','');return;}
    if(q===lastQuery)return;
    lastQuery=q;
    if(controller) controller.abort();
    controller=new AbortController();
    setStatus('Searching location…','');
    try{
      const r=await fetch('https://smv-astro-1fco.onrender.com/api/geocode?q='+encodeURIComponent(q),{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(data.error||'Location search failed');
      render(data.results||[]);
    }catch(e){
      if(e.name==='AbortError')return;
      clearList();setStatus(e.message||'Unable to search location.','err');
    }
  }
  place.addEventListener('input',()=>{
    place.dataset.locationSelected='0';
    lat.value='';lon.value='';
    lastQuery='';
    clearTimeout(timer);
    timer=setTimeout(()=>search(place.value.trim()),550);
  });
  place.addEventListener('focus',()=>{if(place.value.trim().length>=2 && list.children.length)list.classList.add('show');});
  document.addEventListener('click',e=>{if(!parent.contains(e.target))clearList();});
  place.addEventListener('keydown',e=>{
    if(e.key==='Escape')clearList();
  });
})();
