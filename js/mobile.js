const mobileQuery=matchMedia('(max-width: 900px), (pointer: coarse)');
function isMobileLayout(){return mobileQuery.matches;}
function setMobileNavigation(open) {
  if(!isMobileLayout())return;
  document.body.classList.toggle('index-open',open);
  document.getElementById('index-toggle').setAttribute('aria-expanded',String(open));
  document.getElementById('navigation-papers').inert=!open;
  document.querySelector('.material').inert=open;
  if(open)document.getElementById('index-close').focus();
  else document.getElementById('index-toggle').focus();
}
function syncMobileLayout() {
  const nav=document.getElementById('navigation-papers');
  nav.inert=isMobileLayout()&&!document.body.classList.contains('index-open');
  if(!isMobileLayout()) {document.body.classList.remove('index-open');document.querySelector('.material').inert=false;}
}
document.getElementById('index-toggle').addEventListener('click',()=>setMobileNavigation(!document.body.classList.contains('index-open')));
document.getElementById('index-close').addEventListener('click',()=>setMobileNavigation(false));
document.addEventListener('keydown',e=>{
  if(!isMobileLayout()||!document.body.classList.contains('index-open'))return;
  if(e.key==='Escape')setMobileNavigation(false);
  if(e.key==='Tab') {
    const links=[...document.getElementById('navigation-papers').querySelectorAll('button,a')].filter(el=>el.getClientRects().length);
    const first=links[0],last=links.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
mobileQuery.addEventListener('change',syncMobileLayout);
