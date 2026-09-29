const mobileQuery=matchMedia('(max-width: 900px), (pointer: coarse)');
function isMobileLayout(){return mobileQuery.matches;}
function setMobileNavigation(open) {
  if(!isMobileLayout())return;
  if(open)lockReadingScroll('index');else unlockReadingScroll('index');
  document.body.classList.toggle('index-open',open);
  document.getElementById('index-toggle').setAttribute('aria-expanded',String(open));
  document.getElementById('navigation-papers').inert=!open;
  document.querySelector('.material').inert=open;
  if(open)document.getElementById('index-close').focus({preventScroll:true});
  else document.getElementById('index-toggle').focus({preventScroll:true});
}
function syncMobileLayout() {
  syncReceiptPosition();
  const nav=document.getElementById('navigation-papers');
  nav.inert=isMobileLayout()&&!document.body.classList.contains('index-open');
  if(!isMobileLayout()) {unlockReadingScroll('index');document.body.classList.remove('index-open');document.querySelector('.material').inert=false;}
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

// Share one scroll lock between INDEX and PhotoSwipe. Fixed body avoids iOS
// background scrolling; restore the exact reading offset without focus scrolling.
const readingLocks=new Set();
let readingPosition;
function lockReadingScroll(owner) {
  if(readingLocks.has(owner))return;
  if(!readingLocks.size) {
    const body=document.body,content=document.querySelector('.content');
    readingPosition={x:window.scrollX,y:window.scrollY,article:content.scrollTop,styles:{}};
    for(const key of ['position','top','left','width','overflow'])readingPosition.styles[key]=body.style[key];
    body.style.overflow='hidden';
    if(isMobileLayout())Object.assign(body.style,{position:'fixed',top:`-${readingPosition.y}px`,left:`-${readingPosition.x}px`,width:'100%'});
  }
  readingLocks.add(owner);
}
function unlockReadingScroll(owner) {
  if(!readingLocks.delete(owner)||readingLocks.size)return;
  Object.assign(document.body.style,readingPosition.styles);
  window.scrollTo({left:readingPosition.x,top:readingPosition.y,behavior:'instant'});
  document.querySelector('.content').scrollTop=readingPosition.article;
}
