// Keep page boxes in article flow, but bound canvas/text resources independently
// of document length. Eviction never moves the reader's place.
const MAX_PAGES=6,MAX_PIXELS=4_000_000,CONCURRENCY=2;
let library;
function loadLibrary(base){
  library ||= import(new URL('generated/vendor/pdfjs/pdf.min.mjs',base).href).then(pdfjs=>{
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('generated/vendor/pdfjs/pdf.worker.min.mjs',base).href;
    return pdfjs;
  }).catch(error=>{library=null;throw error;});
  return library;
}
export function mountViewer(item,{base,addPage}){
  const {element,shadow,url,status,count}=item;
  const article=element.closest('.content');
  let disposed=false,loadingTask,doc,pdfjs,observer,resizeTimer,frame=0,active=0,scrollRoot;
  let states=[],wanted=new Set();
  const nearby=new Set(),abort=new AbortController();
  const style=document.createElement('link');style.rel='stylesheet';
  style.href=new URL('generated/vendor/pdfjs/pdf_viewer.css',base);
  const styleReady=new Promise(resolve=>{style.onload=()=>resolve(true);style.onerror=()=>resolve(false);});
  shadow.prepend(style);
  const viewport=()=>scrollRoot?{top:Math.max(0,scrollRoot.getBoundingClientRect().top),bottom:Math.min(innerHeight,scrollRoot.getBoundingClientRect().bottom)}:{top:0,bottom:innerHeight};
  const stamp=()=>`${element.clientWidth}:${devicePixelRatio}`;
  function schedule(){if(!disposed&&!frame)frame=requestAnimationFrame(update);}
  function observe(){
    if(!doc||disposed)return;
    const root=/auto|scroll/.test(getComputedStyle(article).overflowY)?article:null;
    if(observer&&root===scrollRoot)return;
    scrollRoot=root;observer?.disconnect();nearby.clear();
    observer=new IntersectionObserver(entries=>{
      for(const entry of entries){const state=states[Number(entry.target.dataset.page)-1];if(entry.isIntersecting)nearby.add(state);else nearby.delete(state);}
      schedule();
    },{root,rootMargin:'700px 0px'});
    for(const state of states)observer.observe(state.element);
  }
  function clearSurface(state){
    if(state.canvas){state.canvas.width=state.canvas.height=0;state.canvas.remove();state.canvas=null;}
    state.text?.remove();state.text=null;state.rendered=null;
    delete state.element.dataset.rendered;
  }
  function release(state){
    if(state.job){state.job.cancelled=true;state.job.renderTask?.cancel();state.job.textLayer?.cancel();}
    else clearSurface(state);
  }
  function update(){
    frame=0;if(disposed||!doc)return;
    const bounds=viewport(),middle=(bounds.top+bounds.bottom)/2;
    const candidates=[...nearby].map(state=>{
      const rect=state.element.getBoundingClientRect();
      return {state,visible:rect.bottom>bounds.top&&rect.top<bounds.bottom,distance:Math.abs((rect.top+rect.bottom)/2-middle)};
    }).sort((a,b)=>Number(b.visible)-Number(a.visible)||a.distance-b.distance);
    const selection=shadow.getSelection?.()||document.getSelection();
    const selected=selection&&!selection.isCollapsed?states.find(state=>state.element.contains(selection.anchorNode)):null;
    wanted=new Set([...(selected?[selected]:[]),...candidates.map(item=>item.state)].slice(0,MAX_PAGES));
    const current=candidates.find(item=>item.visible)?.state;
    if(current){count.textContent=`${current.number} / ${doc.numPages}`;count.setAttribute('aria-label',`Page ${current.number} of ${doc.numPages}`);}
    const size=stamp();
    for(const state of states)if(!wanted.has(state)||(state.rendered&&state.rendered!==size)||(state.job&&state.job.stamp!==size))release(state);
    pump();
  }
  function pump(){
    if(disposed)return;
    for(const state of wanted){
      if(active>=CONCURRENCY)break;
      if(!state.job&&!state.rendered&&!state.failed){
        const job={cancelled:false,stamp:stamp()};state.job=job;active++;
        render(state,job).finally(()=>{
          state.job=null;active--;
          if(job.cancelled||disposed)clearSurface(state);
          schedule();
        });
      }
    }
  }
  async function render(state,job){
    let page;
    try{
      page=await doc.getPage(state.number);
      if(job.cancelled||disposed)return;
      const original=page.getViewport({scale:1}),width=state.element.getBoundingClientRect().width;
      if(!width){job.cancelled=true;return;}
      const view=page.getViewport({scale:width/original.width});
      const density=Math.min(devicePixelRatio||1,3,Math.sqrt(MAX_PIXELS/(view.width*view.height)),8192/view.width,8192/view.height);
      const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
      canvas.width=Math.max(1,Math.floor(view.width*density));canvas.height=Math.max(1,Math.floor(view.height*density));
      state.canvas=canvas;state.element.append(canvas);
      job.renderTask=page.render({canvas,canvasContext:canvas.getContext('2d'),viewport:view,
        transform:[canvas.width/view.width,0,0,canvas.height/view.height,0,0]});
      await job.renderTask.promise;
      if(job.cancelled||disposed)return;
      state.element.dataset.rendered='true';
      // Supported TextLayer + unmodified upstream CSS; text failure cannot hide
      // an otherwise readable page. Styles live inside the PDF's shadow root.
      if(await styleReady){
        if(job.cancelled||disposed)return;
        const text=document.createElement('div');text.className='textLayer';
        text.style.setProperty('--total-scale-factor',view.scale*view.userUnit);
        state.text=text;state.element.append(text);
        try{
          job.textLayer=new pdfjs.TextLayer({container:text,viewport:view,textContentSource:page.streamTextContent()});
          await job.textLayer.render();
        }catch{if(!job.cancelled){text.remove();state.text=null;}}
      }
      if(!job.cancelled&&!disposed)state.rendered=job.stamp;
    }catch{
      if(!job.cancelled&&!disposed){
        clearSurface(state);state.failed=true;
        state.element.querySelector('.pdf-placeholder').textContent=`Page ${state.number} preview unavailable. Use Open PDF above.`;
      }
    }finally{page?.cleanup();}
  }
  const resize=new ResizeObserver(()=>{
    clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!disposed){observe();schedule();}},120);
  });
  resize.observe(element);
  document.addEventListener('scroll',schedule,{capture:true,passive:true,signal:abort.signal});
  window.addEventListener('resize',()=>{observe();schedule();},{passive:true,signal:abort.signal});
  window.addEventListener('pagehide',event=>{if(!event.persisted)destroy();},{signal:abort.signal});
  async function start(){
    try{
      status.textContent='Loading PDF…';
      pdfjs=await loadLibrary(base);if(disposed)return;
      const assets=new URL('generated/vendor/pdfjs/',base);
      loadingTask=pdfjs.getDocument({url,cMapUrl:new URL('cmaps/',assets).href,cMapPacked:true,
        standardFontDataUrl:new URL('standard_fonts/',assets).href,wasmUrl:new URL('wasm/',assets).href,
        iccUrl:new URL('iccs/',assets).href,isEvalSupported:false,disableAutoFetch:true,disableStream:true});
      doc=await loadingTask.promise;if(disposed)return;
      states=[...shadow.querySelectorAll('.pdf-page')].map((el,i)=>({element:el,number:i+1}));
      observe();
      // Local page boxes already exist. Unindexed/remote PDFs acquire exact boxes
      // progressively without waiting to paint page 1 until every box is read.
      for(let number=1;number<=doc.numPages;number++){
        if(disposed)return;
        if(!states[number-1]){
          const page=await doc.getPage(number);if(disposed)return;
          const {width,height}=page.getViewport({scale:1});page.cleanup();
          const el=addPage(shadow,number,[width,height]);
          const state={element:el,number};states.push(state);observer.observe(el);
          if(number%8===1)await new Promise(resolve=>setTimeout(resolve,0));
        }
      }
      count.textContent=`1 / ${doc.numPages}`;
      status.textContent='';status.hidden=true;schedule();
    }catch(error){
      if(disposed)return;
      status.hidden=false;
      status.textContent=error.name==='PasswordException'?'Password-protected PDF. Open the original above.':'PDF preview unavailable. Open or download the original above.';
      for(const page of shadow.querySelectorAll('.pdf-page'))page.remove();
      destroy();
    }
  }
  function destroy(){
    if(disposed)return;
    disposed=true;observer?.disconnect();resize.disconnect();abort.abort();
    clearTimeout(resizeTimer);cancelAnimationFrame(frame);wanted.clear();nearby.clear();
    for(const state of states)release(state);
    // Abort fetches and terminate this document's worker, including mid-render.
    loadingTask?.destroy().catch(()=>{});
  }
  start();return destroy;
}
