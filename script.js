function deferredAudio(src) { const audio = new Audio(); audio.preload = 'none'; audio.src = src; return audio; }
const backSound = deferredAudio('assets/holepunch.mp3');
const clickSound = deferredAudio('assets/page-flip-01a.mp3');
const hoverSound = deferredAudio('assets/boxclick1.mp3');
const printerSound = deferredAudio('assets/printer2.mp3');
const tuckSound = deferredAudio('assets/tuck1.mp3');
let currentSound = null;
let siteMuted = false;
try { siteMuted = localStorage.getItem('site:muted') === 'true'; } catch {}
let audioActivated = false;
function startAmbient() { if(currentSound && !siteMuted && audioActivated) currentSound.play().catch(()=>{}); }
document.addEventListener('pointerdown',()=>{audioActivated=true;startAmbient();},{once:true});
document.addEventListener('keydown',()=>{audioActivated=true;startAmbient();},{once:true});
let fileList = [];


marked.use({ breaks: true });

function formatName(name) {
  return name
    .replace('.md', '')
    .replace('.csv', '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, str => str.toUpperCase());
}
function drawFolderLine(folderEl) {
  if(!folderEl||!receiptState.receiptEligible||receiptState.receiptTucked||isMobileLayout()||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const svg=document.getElementById('folder-line');
  const from=folderEl.getBoundingClientRect(),to=document.querySelector('.receipt').getBoundingClientRect();
  const x=from.right,y=from.top+from.height/2,tx=to.left+42,ty=to.top+74;
  const angle=Math.atan2(ty-y,tx-x),size=10;
  svg.innerHTML=`<path d="M ${x} ${y} L ${tx} ${ty}"/><path d="M ${tx-size*Math.cos(angle-.4)} ${ty-size*Math.sin(angle-.4)} L ${tx} ${ty} L ${tx-size*Math.cos(angle+.4)} ${ty-size*Math.sin(angle+.4)}"/>`;
}

function updateFrame() {
  if(isMobileLayout())return;
  const contentEl = document.querySelector('.content');
  const maxScroll = contentEl.scrollHeight - contentEl.clientHeight;
  const distFromBottom = maxScroll - contentEl.scrollTop;

  const frame = document.querySelector('.frame');
  const frameSlide = Math.min(distFromBottom, frame.offsetHeight);
  frame.style.transform = `translateY(${frameSlide}px)`;

  const nextBtn = document.getElementById('next-page-btn');
  if (nextBtn && nextBtn.style.display !== 'none') {
    const btnSlide = Math.min(distFromBottom, nextBtn.offsetHeight * 2);
    nextBtn.style.transform = `scaleX(-1) translateY(${btnSlide}px)`;
  }
}

function makeDraggable(panelEl) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  function dragStart(clientX, clientY) {
    if(isMobileLayout()||panelEl.classList.contains('is-tucked'))return;
    stopReceiptEffects();
    isDragging = true;
    startX = clientX;
    startY = clientY;
    startLeft = panelEl.offsetLeft;
    startTop = panelEl.offsetTop;
    panelEl.classList.add('dragging');
  }

  function dragMove(clientX, clientY) {
    if (!isDragging) return;
    panelEl.style.left = `${startLeft + (clientX - startX)}px`;
    panelEl.style.top = `${startTop + (clientY - startY)}px`;
  }

  function dragEnd() {
    if (isDragging) {
      isDragging = false;
      panelEl.classList.remove('dragging');
    }
  }

  // mouse
  panelEl.addEventListener('mousedown', (e) => {
    if (e.target.closest('button,a')) return;
    dragStart(e.clientX, e.clientY);
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY));
  document.addEventListener('mouseup', dragEnd);


}

const contentEl = document.querySelector('.content');
contentEl.addEventListener('scroll', () => {
  if(isMobileLayout())return;
  const banner = document.querySelector('.banner');
  const sticker = document.querySelector('.wip-sticker');
  const bannerH = banner.offsetHeight;
  const scrolled = contentEl.scrollTop;
  updateFrame();

  if (banner.style.display !== 'none') {
    const bannerScrolled = Math.min(scrolled, bannerH);
    banner.style.transform = `translateY(-${bannerScrolled}px)`;
  }

  if (sticker && sticker.style.display !== 'none') {
    const stickerScrolled = Math.min(scrolled, sticker.offsetTop + sticker.offsetHeight);
    const fade = Math.max(0, 1 - scrolled / 150);
    sticker.style.transform = `translateY(-${stickerScrolled}px)`;
    sticker.style.opacity = fade;
  }
});

window.addEventListener('resize', () => { stopReceiptEffects(); updateFrame(); syncMobileLayout(); syncBannerLayout(); });

init().then(() => {
  document.getElementById('mute-btn').classList.toggle('muted',siteMuted);
  document.getElementById('mute-btn').setAttribute('aria-pressed',String(siteMuted));
  syncMobileLayout();
  setTimeout(updateFrame, 100);
  makeDraggable(document.getElementById('card-folders-panel'));
  makeDraggable(document.getElementById('card-files-panel'));

  document.getElementById('tuck-folders-btn').addEventListener('click', () => {
    tuckSound.currentTime = 0;
    playEffect(tuckSound);
    const panel = document.getElementById('card-folders-panel');
    if (panel.dataset.tucked === 'true') {
      panel.style.left = panel.dataset.savedLeft || '2cqw';
      panel.dataset.tucked = 'false';
    } else {
      panel.dataset.savedLeft = panel.style.left || '2cqw';
      panel.style.left = '-' + (panel.offsetWidth - 55) + 'px';
      panel.dataset.tucked = 'true';
    }
  });
}).catch(showError);

document.querySelector('.cardicon2').addEventListener('click', () => {
  playEffect(backSound);
  previousInternalPage();
});

document.getElementById('mute-btn').addEventListener('click', () => {
  siteMuted = !siteMuted;
  try { localStorage.setItem('site:muted', String(siteMuted)); } catch {}
  document.getElementById('mute-btn').setAttribute('aria-pressed',String(siteMuted));
  document.getElementById('mute-btn').classList.toggle('muted', siteMuted);
  if (siteMuted && currentSound) {
    currentSound.pause();
  } else if (!siteMuted && currentSound) {
    currentSound.play().catch(() => {});
  }
});

document.querySelector('.content').addEventListener('click', e => {
  const link = e.target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href?.startsWith('#/')) return;
  e.preventDefault();
  window.location.hash = href;
});
