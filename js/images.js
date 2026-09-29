const imageMetadataCache = new Map();
let currentImages = {};
async function loadPageImages(page) {
  if(!imageMetadataCache.has(page.id)) {
    const response=await fetch(new URL(page.images,appBase));
    if(!response.ok)throw new Error(`Image metadata: HTTP ${response.status}`);
    imageMetadataCache.set(page.id,await response.json());
  }
  return imageMetadataCache.get(page.id);
}
function imageInfo(url, metadata=currentImages) {
  const absolute=new URL(url,appBase);
  if(absolute.origin!==appBase.origin)return null;
  return metadata[decodeURIComponent(absolute.pathname.slice(appBase.pathname.length))];
}
function optimizeImage(img, metadata=currentImages, eager=false, layout='default') {
  const info=imageInfo(img.src,metadata);
  img.decoding='async';img.loading=eager?'eager':'lazy';
  if(!info)return;
  img.width=info.width;img.height=info.height;
  img.dataset.original=new URL(info.original,appBase).href;
  const inline=info.variants.filter(v=>v.width<=2000);
  const variants=info.poster?[info.poster]:(inline.length?inline:info.variants);
  if(info.poster){img.dataset.animation=new URL(info.original,appBase).href;img.dataset.poster=new URL(info.poster.src,appBase).href;}
  img.sizes=img.closest('.grid')?'(max-width: 390px) calc(100vw - 80px), (max-width: 900px) 42vw, 16vw':img.classList.contains('banner')?'(max-width: 900px) 100vw, 58vw':'(max-width: 600px) calc(100vw - 40px), (max-width: 900px) 90vw, 48vw';
  if(layout==='gallery'&&img.closest('.grid'))img.sizes='(max-width: 600px) calc(100vw - 80px), (max-width: 900px) calc((100vw - 80px) / 2), (min-width: 2400px) 14vw, 21vw';
  img.srcset=variants.map(v=>`${new URL(v.src,appBase).href} ${v.width}w`).join(', ');
  img.src=new URL((variants.find(v=>v.width>=1200)||variants.at(-1)).src,appBase).href;
  img.dataset.fullSrc=new URL(info.variants.at(-1).src,appBase).href;
  img.dataset.fullWidth=info.variants.at(-1).width;img.dataset.fullHeight=info.variants.at(-1).height;
}
