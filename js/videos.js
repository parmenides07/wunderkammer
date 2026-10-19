// Convert media while the parsed Markdown is still in its inert template.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SiteVideos=api;
})(globalThis,function(){
  function isVideo(reference){
    try{return /\.(mp4|webm)$/i.test(decodeURIComponent(String(reference).split(/[?#]/)[0]));}catch{return false;}
  }
  function replaceImage(image){
    const video=image.ownerDocument.createElement('video');
    for(const name of ['src','class','title','width','height','style']){
      if(image.hasAttribute(name))video.setAttribute(name,image.getAttribute(name));
    }
    video.classList.add('embedded-video');
    video.setAttribute('aria-label',image.alt||image.title||'Video');
    for(const name of ['muted','loop','playsinline'])video.setAttribute(name,'');
    video.preload='metadata';
    image.replaceWith(video);
  }
  function mount(content){
    const videos=[...content.querySelectorAll('video.embedded-video')];
    if(!videos.length)return ()=>{};
    const items=new Map();
    let disposed=false;
    const shouldPlay=video=>!disposed&&video.isConnected&&items.get(video).requested&&items.get(video).visible&&!document.hidden;
    function update(video){
      const item=items.get(video),version=++item.version;
      if(shouldPlay(video)){
        if(video.paused)video.play().catch(error=>{
          if(disposed||version!==item.version||error.name==='AbortError')return;
          item.requested=false;item.controls.setPlaying(false);
        });
      }else video.pause();
    }
    function onPlay(event){
      const video=event.currentTarget;
      if(!shouldPlay(video))video.pause();
      else items.get(video).controls.setPlaying(true);
    }
    function onPause(event){items.get(event.currentTarget).controls.setPlaying(false);}
    function onVisibility(){videos.forEach(update);}
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        items.get(entry.target).visible=entry.isIntersecting;
        update(entry.target);
      }
    });
    for(const video of videos){
      const item={requested:false,visible:false,version:0};
      function toggle(){item.requested=!item.requested;update(video);}
      item.onClick=event=>{event.preventDefault();event.stopPropagation();toggle();};
      item.controls=SiteAnimationControls.create(item.onClick);
      items.set(video,item);
      // A linked Markdown video must not put a playback button inside a link.
      const link=video.parentElement;
      const target=link.matches('a')&&link.children.length===1&&!link.textContent.trim()?link:video;
      target.replaceWith(item.controls.preview);
      item.controls.preview.append(video,item.controls.button);
      video.muted=true;
      video.pause();
      video.addEventListener('click',item.onClick);
      video.addEventListener('play',onPlay);
      video.addEventListener('pause',onPause);
      observer.observe(video);
    }
    document.addEventListener('visibilitychange',onVisibility);
    // Error/404 shells can also replace the article outside renderPage.
    const removed=new MutationObserver(()=>{if(!videos[0].isConnected)destroy();});
    removed.observe(content,{childList:true});
    function destroy(){
      if(disposed)return;
      disposed=true;observer.disconnect();removed.disconnect();
      document.removeEventListener('visibilitychange',onVisibility);
      for(const video of videos){
        const item=items.get(video);
        item.controls.destroy();video.removeEventListener('click',item.onClick);
        video.removeEventListener('play',onPlay);video.removeEventListener('pause',onPause);video.pause();
        video.removeAttribute('src');video.load();
      }
    }
    return destroy;
  }
  return {isVideo,replaceImage,mount};
});
