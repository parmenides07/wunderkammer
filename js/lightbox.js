let viewer = null;
let viewerModule;
let viewerOpening = false;
async function openImageViewer(images, index, trigger) {
  if(viewer || viewerOpening)return;
  viewerOpening = true;
  try {
  const pageId=document.querySelector('.content').dataset.pageId;
  if(!document.getElementById('photoswipe-style')) {
    const link=document.createElement('link');link.id='photoswipe-style';link.rel='stylesheet';link.href=new URL('generated/vendor/photoswipe.css',appBase);
    await new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>{link.remove();reject(new Error('Unable to load image viewer styles'));};document.head.appendChild(link);});
  }
  viewerModule ||= import(new URL('generated/vendor/photoswipe.js',appBase).href);
  const {default:PhotoSwipe}=await viewerModule;
  if(document.querySelector('.content').dataset.pageId!==pageId)return;
  const dataSource=images.map(img=>({
    src:img.dataset.fullSrc||img.currentSrc||img.src,
    width:Number(img.dataset.fullWidth)||img.naturalWidth,
    height:Number(img.dataset.fullHeight)||img.naturalHeight,
    msrc:img.currentSrc||img.src,alt:img.alt,
    caption:img.dataset.caption||'',original:img.dataset.original||img.src
  }));
  if(!dataSource[index].width) { window.open(dataSource[index].original,'_blank','noopener');return; }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  viewer=new PhotoSwipe({dataSource,index,preload:[0,1],bgOpacity:.94,showHideAnimationType:reduced?'none':'fade',loop:false,returnFocus:true,trapFocus:true});

  viewer.on('uiRegister',()=>{
    viewer.ui.registerElement({name:'caption',order:9,isButton:false,appendTo:'root',onInit:(el,pswp)=>pswp.on('change',()=>{el.textContent=dataSource[pswp.currIndex]?.caption || '';})});
    viewer.ui.registerElement({name:'original',order:8,isButton:false,tagName:'a',appendTo:'root',onInit:(el,pswp)=>{el.textContent='Open original ↗';el.target='_blank';el.rel='noopener';pswp.on('change',()=>{el.href=dataSource[pswp.currIndex]?.original || '#';});}});
  });
  viewer.on('destroy',()=>{
    viewer=null;unlockReadingScroll('viewer');
    document.querySelector('.wrapper').inert=false;document.getElementById('index-toggle').inert=false;
    if(trigger.isConnected)trigger.focus({preventScroll:true});
  });
  lockReadingScroll('viewer');document.querySelector('.wrapper').inert=true;document.getElementById('index-toggle').inert=true;
  viewer.init();
  } finally { viewerOpening = false; }
}
function attachImageViewer(content) {
  const images=[...content.querySelectorAll('img')];
  images.forEach((img,index)=>{
    const parent=img.closest('p'),next=parent?.nextElementSibling;
    img.dataset.caption=img.title || (next?.matches('p') && next.children.length===1 && next.firstElementChild?.tagName==='EM' ? next.textContent : '');
    // Respect authored image links; otherwise give every Markdown image a keyboard-accessible fallback.
    if(img.closest('a'))return;
    const link=document.createElement('a');link.className='image-viewer';link.href=img.dataset.original||img.src;
    if(img.dataset.animation){
      const play=document.createElement('button');play.type='button';play.className='animation-control';play.textContent='Play animation';play.setAttribute('aria-pressed','false');
      play.addEventListener('click',()=>{const playing=play.getAttribute('aria-pressed')!=='true';img.removeAttribute('srcset');img.src=playing?img.dataset.animation:img.dataset.poster;play.setAttribute('aria-pressed',String(playing));play.textContent=playing?'Pause animation':'Play animation';});
      img.after(play);
    }
    link.setAttribute('aria-label',`Enlarge ${img.alt || 'image'}`);
    img.replaceWith(link);link.appendChild(img);
    link.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();openImageViewer(images,index,link).catch(()=>{window.location.href=link.href;});});
  });
}
