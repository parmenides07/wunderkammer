// Small authoring/placeholder layer. The PDF renderer and worker are loaded only
// when an embedded document approaches the reading viewport.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SitePDF=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function isPdf(reference){
    try{return /\.pdf$/i.test(decodeURIComponent(String(reference).split(/[?#]/)[0]));}catch{return false;}
  }
  // Shared with the build/checker: decode once, after URL path resolution.
  function localPath(folder,reference){
    if(/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference))return null;
    try{return decodeURIComponent(new URL(reference,`https://site.invalid/${folder}/`).pathname.slice(1));}catch{return null;}
  }
  function renderer(){
    return {image(token){
      if(!isPdf(token.href))return false; // Marked's existing image renderer.
      const title=token.text.trim()||'PDF document';
      return `<span class="pdf-embed" role="region" aria-label="${escape(title)}" data-pdf-src="${escape(token.href)}">`+
        `<span class="pdf-controls"><span class="pdf-title">${escape(title)}</span>`+
        '<span class="pdf-count" aria-live="off"></span>'+
        `<a class="pdf-open" target="_blank" rel="noopener" aria-label="Open ${escape(title)} in a new tab">Open PDF ↗</a>`+
        `<a class="pdf-download" download aria-label="Download ${escape(title)}">Download</a></span>`+
        '<span class="pdf-status" role="status">PDF preview loads as you scroll.</span><span class="pdf-pages"></span></span>';
    }};
  }
  async function loadMetadata(page,base){
    if(!page.documents)return {};
    try{
      const response=await fetch(new URL(page.documents,base),{cache:'no-cache'});
      return response.ok?await response.json():{};
    }catch{return {};}
  }
  function addPage(shadow,number,dimensions){
    const page=document.createElement('div');
    page.className='pdf-page';page.dataset.page=number;
    page.setAttribute('role','group');page.setAttribute('aria-label',`Page ${number}`);
    page.style.aspectRatio=`${dimensions[0]} / ${dimensions[1]}`;
    const placeholder=document.createElement('span');placeholder.className='pdf-placeholder';
    placeholder.textContent=`Page ${number}`;placeholder.setAttribute('aria-hidden','true');
    page.append(placeholder);shadow.append(page);return page;
  }
  function mount(content,{base,folder,metadata,resolve}){
    const embeds=[...content.querySelectorAll('.pdf-embed')];
    if(!embeds.length)return ()=>{};
    let disposed=false;
    const instances=[];
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        observer.unobserve(entry.target);
        const item=instances.find(item=>item.element===entry.target);
        import(new URL('js/pdf-viewer.mjs',base).href).then(module=>{
          if(!disposed)item.destroy=module.mountViewer(item,{base,addPage});
        }).catch(()=>{
          if(disposed)return;
          for(const page of item.shadow.querySelectorAll('.pdf-page'))page.remove();
          item.status.textContent='PDF preview unavailable. Open or download the original above.';
        });
      }
    },{rootMargin:'700px 0px'});
    for(const element of embeds){
      const reference=element.dataset.pdfSrc,url=resolve(reference);
      for(const link of element.querySelectorAll('a'))link.href=url;
      const shadow=element.querySelector('.pdf-pages').attachShadow({mode:'open'});
      const styles=document.createElement('link');styles.rel='stylesheet';styles.href=new URL('js/pdf-pages.css',base);
      shadow.append(styles);
      const dimensions=metadata[localPath(folder,reference)]?.pages||[];
      dimensions.forEach((size,i)=>addPage(shadow,i+1,size));
      const count=element.querySelector('.pdf-count');
      if(dimensions.length)count.textContent=`1 / ${dimensions.length}`;
      const item={element,shadow,url,dimensions,count,status:element.querySelector('.pdf-status'),destroy:null};
      instances.push(item);observer.observe(element);
    }
    // Also handles styled 404/error shells and article replacement by callers.
    const removed=new MutationObserver(()=>{if(!embeds[0].isConnected)destroy();});
    removed.observe(content,{childList:true});
    function destroy(){
      if(disposed)return;
      disposed=true;observer.disconnect();removed.disconnect();
      for(const item of instances)item.destroy?.();
    }
    return destroy;
  }
  return {isPdf,localPath,renderer,loadMetadata,mount};
});
