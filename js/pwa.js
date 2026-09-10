if('serviceWorker' in navigator && location.protocol!=='file:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{}));
}
