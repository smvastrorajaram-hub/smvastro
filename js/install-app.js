
(function(){
  var installSection = document.getElementById('smvInstallAppSection');
  var installBtn = document.getElementById('smvInstallAppBtn');
  var help = document.getElementById('smvInstallAppHelp');
  if(!installSection || !installBtn) return;

  var deferredPrompt = null;
  var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  var iosStandalone = window.navigator.standalone === true;
  if(standalone || iosStandalone){
    installSection.style.display='none';
    return;
  }

  function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function isAndroid(){ return /android/i.test(navigator.userAgent); }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    installBtn.disabled = false;
    installBtn.textContent = 'INSTALL APP';
    help.textContent = 'Tap INSTALL APP to add SMV ASTRO to your Home Screen.';
  });

  window.addEventListener('appinstalled', function(){
    deferredPrompt = null;
    installSection.style.display='none';
  });

  installBtn.addEventListener('click', async function(){
    if(deferredPrompt){
      try{
        deferredPrompt.prompt();
        var choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if(choice && choice.outcome === 'accepted'){
          help.textContent='SMV ASTRO is being added to your Home Screen.';
        } else {
          help.textContent='Install cancelled. You can use INSTALL APP again later.';
        }
      }catch(err){
        console.warn('SMV ASTRO install prompt failed:',err);
      }
      return;
    }

    if(isIOS()){
      help.textContent='On iPhone/iPad: tap Share → Add to Home Screen → Add.';
    }else if(isAndroid()){
      help.textContent='If the install prompt does not appear, open your browser menu (⋮) and choose “Add to Home screen” or “Install app”.';
    }else{
      help.textContent='Use your browser menu and choose “Install app” or “Add to Home screen”.';
    }
  });

  // Before the browser exposes beforeinstallprompt, keep the option visible with a useful instruction.
  installBtn.disabled = false;
  if(isIOS()) help.textContent='Add SMV ASTRO from Safari: Share → Add to Home Screen.';
  else help.textContent='Install from your browser menu, or tap INSTALL APP when the browser provides the install prompt.';
})();
