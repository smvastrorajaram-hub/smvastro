// Coalesce updates, serialize requests and retain edits until a safe refresh.
export function createRefreshQueue({run,canRun,onPending=()=>{},onError=()=>{},delay=120}){
 let pending=false,running=false,timer=null,stopped=false;
 async function flush(){
  clearTimeout(timer);timer=null;
  if(stopped||running||!pending)return;
  if(!canRun()){onPending();return;}
  pending=false;running=true;
  try{await run();}catch(e){onError(e);}finally{running=false;if(pending&&!stopped)timer=setTimeout(flush,delay);}
 }
 return {request(){if(stopped)return;pending=true;clearTimeout(timer);timer=setTimeout(flush,delay);},resume(){if(pending)flush();},stop(){stopped=true;pending=false;clearTimeout(timer);},get pending(){return pending;}};
}

// Authenticated fetch stream: only invalidations, never account data or tokens in URLs.
export function watchDashboardEvents({url,getToken,onChange,onStatus,isVisible=()=>true}){
 let stopped=false,controller=null,timer=null,retry=0;
 async function connect(){
  if(stopped)return;
  if(!isVisible()){timer=setTimeout(connect,1500);return;}
  controller=new AbortController();
  try{
   const token=await getToken();if(stopped)return;
   const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'text/event-stream'},cache:'no-store',signal:controller.signal});
   if(!response.ok||!response.body)throw new Error('Live connection unavailable');
   retry=0;onStatus('Live updates connected');
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
   while(!stopped){
    const {done,value}=await reader.read();if(done)break;
    buffer+=decoder.decode(value,{stream:true});
    let end;while((end=buffer.indexOf('\n\n'))!==-1){
     const event=buffer.slice(0,end);buffer=buffer.slice(end+2);
     if(/^event: (change|ready)$/m.test(event))onChange();
    }
   }
  }catch(e){if(!stopped&&e.name!=='AbortError'){onStatus('Reconnecting live updates…');onChange();}}
  finally{if(!stopped){retry++;timer=setTimeout(connect,Math.min(15000,1000*2**Math.min(retry,4)));}}
 }
 connect();return ()=>{stopped=true;clearTimeout(timer);controller?.abort();};
}
