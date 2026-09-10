
/* V173: adds collapse controls only to requested Home sections. Does not alter data/API/payment logic. */
(function(){
'use strict';
function addSection(id){
  const sec=document.getElementById(id); if(!sec || sec.dataset.smvV173Home==='1') return;
  const body=[...sec.children].filter(el=>!el.classList.contains('home-rule'));
  if(!body.length) return;
  const wrap=document.createElement('div'); wrap.className='smv-v173-home-collapse-body';
  body.forEach(el=>wrap.appendChild(el)); sec.appendChild(wrap);
  sec.dataset.smvV173Home='1'; sec.classList.add('smv-v173-home-section');
  const btn=document.createElement('button'); btn.type='button'; btn.className='smv-v173-home-toggle'; btn.textContent='▼'; btn.title='Collapse'; btn.setAttribute('aria-label','Collapse section');
  const rule=sec.querySelector(':scope > .home-rule'); (rule||sec).appendChild(btn);
  btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const closed=sec.classList.toggle('smv-v173-home-collapsed');btn.textContent=closed?'▶':'▼';btn.title=closed?'Expand':'Collapse';btn.setAttribute('aria-label',closed?'Expand section':'Collapse section');});
}
function addSub(id){
  const el=document.querySelector('.smv-v173-subregion[data-sup="'+id+'"]'); if(!el || el.dataset.smvV173Sub==='1') return;
  el.dataset.smvV173Sub='1'; const btn=el.querySelector('.smv-v173-sub-collapse'); if(!btn) return;
  btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const closed=el.classList.toggle('smv-v173-sub-collapsed');btn.textContent=closed?'▶':'▼';btn.title=closed?'Expand':'Collapse';btn.setAttribute('aria-label',closed?'Expand '+id:'Collapse '+id);});
}
function start(){
  addSection('approved-astrologers');
  addSection('english-horoscope');
  addSection('tamil-horoscope');
  addSub('blogs'); addSub('media');
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{start();setTimeout(start,600);setTimeout(start,1500)},{once:true}); else {start();setTimeout(start,600);setTimeout(start,1500);}
})();
