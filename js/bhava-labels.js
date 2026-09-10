
document.addEventListener('DOMContentLoaded', function(){
  /*
   * V25 CRITICAL FIX:
   * The previous Bhava-header MutationObserver changed textContent inside
   * its own observed subtree. That generated another mutation, which called
   * the observer again indefinitely and could freeze the browser/Acode.
   *
   * No observer is needed. The English result is translated after generation,
   * so we safely apply the final labels after the result exists.
   */
  const fixBhavaHeaders=()=>{
    const root=document.getElementById('englishHoroscopeResult');
    if(!root) return;
    const table=root.querySelector('.bhava-table');
    if(table && table.tHead){
      const names=['House','Start','Middle','End','Rasi','Planets'];
      const cells=table.tHead.rows[0]?.cells||[];
      names.forEach((n,i)=>{
        if(cells[i] && cells[i].textContent !== n) cells[i].textContent=n;
      });
    }
    const h=[...root.querySelectorAll('h3')].find(x=>(x.textContent||'').includes('Bhava'));
    if(h && h.textContent !== 'Bhava Table') h.textContent='Bhava Chart';
  };
  window.__smvFixEnglishBhavaHeaders=fixBhavaHeaders;
});
