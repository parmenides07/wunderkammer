// Shared presentation for GIF and video playback; each format owns its media state.
const SiteAnimationControls={
  create(toggle){
    const preview=document.createElement('span');preview.className='animation-preview';
    const button=document.createElement('button');button.type='button';button.className='animation-control';
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="animation-icon-play" d="M8 5v14l11-7z"/><path class="animation-icon-pause" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
    function setPlaying(playing){
      preview.classList.toggle('is-playing',playing);
      const label=playing?'Pause animation':'Play animation';
      button.setAttribute('aria-label',label);button.title=label;
    }
    button.addEventListener('click',toggle);
    setPlaying(false);
    return {preview,button,setPlaying,destroy:()=>button.removeEventListener('click',toggle)};
  }
};
