import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../public-navigation.js',import.meta.url),'utf8');
function harness(){
 const names=['home','english-horoscope','approved-astrologers','smv-content-hub','publicBlogs','publicMedia','about','contact','askNowSection','dashboard','admin','smv-dashboard-page','ask-flow','register-flow','astro-register-form','astro-flow','smv-public-page','faq'];
 const elements={};let scrolled='',prepares=0;const events={};const pushes=[];
 const classes=()=>{const set=new Set(['hidden','smv-v173-home-collapsed']);return {add(...x){x.forEach(v=>set.add(v));},remove(...x){x.forEach(v=>set.delete(v));},contains:x=>set.has(x),toggle(x,on){if(on)set.add(x);else set.delete(x);}};};
 const body={dataset:{},classList:classes()};for(const id of names)elements[id]={classList:classes(),parentElement:body,querySelectorAll:()=>[],scrollIntoView(){scrolled=id;}};
 const ctx={Set,location:{hash:'#home'},history:{pushState(state,unused,hash){pushes.push(hash);ctx.location.hash=hash;},replaceState(){}},requestAnimationFrame:fn=>fn(),document:{body,readyState:'complete',getElementById:id=>elements[id],querySelectorAll:()=>[],addEventListener:(name,fn)=>events[name]=fn},window:{__smvPreparePublicNavigation(){prepares++;},addEventListener:(name,fn)=>events[name]=fn}};
 vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,elements,events,pushes,get scrolled(){return scrolled;},get prepares(){return prepares;}};
}
test('each public CTA scrolls to its own target, exits workspace and expands collapsed sections',()=>{
 const h=harness();for(const id of ['approved-astrologers','publicMedia','about','askNowSection','english-horoscope','publicBlogs']){
  assert.equal(h.ctx.window.__smvNavigatePublic(id),true);assert.equal(h.scrolled,id);assert.equal(h.elements[id].classList.contains('hidden'),false);assert.equal(h.elements[id].classList.contains('smv-v173-home-collapsed'),false);assert.equal(h.elements.dashboard.classList.contains('hidden'),true);assert.equal(h.ctx.document.body.dataset.smvWorkspace,'closed');assert.equal(h.pushes.at(-1),'#'+id);
 }
});
test('back/forward restores the requested section and does not add a history entry',()=>{
 const h=harness();h.ctx.location.hash='#publicMedia';h.events.popstate();assert.equal(h.scrolled,'publicMedia');assert.equal(h.pushes.length,0);
});
test('unknown/private hashes are not captured by the public router',()=>{
 const h=harness();assert.equal(h.ctx.window.__smvNavigatePublic('dashboard'),false);assert.equal(h.prepares,0);
});
test('modified clicks retain browser behavior; normal section clicks are intercepted once',()=>{
 const h=harness();let prevented=0,stopped=0;const target={closest:()=>({dataset:{},getAttribute:()=> '#about'})};
 const event={button:0,target,preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}};
 h.events.click({...event,ctrlKey:true});assert.equal(prevented,0);h.events.click(event);assert.equal(prevented,1);assert.equal(stopped,1);assert.equal(h.scrolled,'about');
});
test('password toggle changes input type, eye icon and accessible state in both directions',()=>{
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');const icon=app.slice(app.indexOf('function smvPasswordEye('),app.indexOf('function openAuth('));
 const binding=app.match(/passwordToggle.onclick=\(\)=>\{[^\n]+/)[0];
 const field={type:'password'},button={attributes:{},setAttribute(k,v){this.attributes[k]=v;}};
 const ctx={$:()=>field,passwordToggle:button};vm.createContext(ctx);vm.runInContext(icon+'\n'+binding,ctx);
 button.onclick();assert.equal(field.type,'text');assert.equal(button.attributes['aria-label'],'Hide password');assert.equal(button.attributes['aria-pressed'],'true');assert.match(button.innerHTML,/M3 3l18 18/);
 button.onclick();assert.equal(field.type,'password');assert.equal(button.attributes['aria-label'],'Show password');assert.equal(button.attributes['aria-pressed'],'false');assert.match(button.innerHTML,/<circle/);
});
