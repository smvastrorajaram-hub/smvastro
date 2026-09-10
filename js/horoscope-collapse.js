
/* V172: robust UI-only symbol collapse. No data/Firebase/API/payment logic is changed. */
(function(){
'use strict';
const TARGETS=new Set([
'Public Question Inbox','Questions — Unanswered Queue','Earnings History','Notifications','My Consultations',
'Admin Earnings History','Allocated Questions — Admin Control','Answers Awaiting Approval','Answers — Answered Questions',
'Astrologer Applications','Astrologer Withdrawals','Customer Reviews','Admin Answers','Admin Reviews','Question Approval',
'Answer Approval','Public Question Approval','Payment Method Changes — Admin Approval','Recent Questions',
'Blogs & Downloadable Content','Blog Writer & Publisher','Upload PDF / Image / Video / Music','Commission Settings'
]);
const EXCLUDE=new Set(['Astrologer Dashboard','Customer Dashboard','Profile','Astrologer Profile','My Questions','Total Earnings','My Dashboard']);
function text(x){return String(x||'').replace(/\s+/g,' ').trim()}
function heading(card){const h=card.querySelector(':scope > h2,:scope > h3,:scope > h4');return text(h&&h.textContent)}
function add(card){
 if(!card || card.dataset.smvCollapseV172==='1' || card.closest('.modalbox') || !card.classList.contains('card')) return;
 const h=heading(card); if(!h || EXCLUDE.has(h) || !TARGETS.has(h)) return;
 card.dataset.smvCollapseV172='1'; card.classList.add('smv-v172-collapsible');
 const btn=document.createElement('button'); btn.type='button'; btn.className='smv-v172-collapse-btn'; btn.textContent='▼'; btn.title='Collapse'; btn.setAttribute('aria-label','Collapse section');
 btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();const closed=card.classList.toggle('smv-v172-collapsed');btn.textContent=closed?'▶':'▼';btn.title=closed?'Expand':'Collapse';btn.setAttribute('aria-label',closed?'Expand section':'Collapse section');});
 card.appendChild(btn);
}
function scan(){document.querySelectorAll('#dashboardContent .card,#admin .card').forEach(add)}
let t=0; function later(){clearTimeout(t);t=setTimeout(scan,150)}
function start(){scan();new MutationObserver(later).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
