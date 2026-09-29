function deferredAudio(src) { const audio = new Audio(); audio.preload = 'none'; audio.src = src; return audio; }
const backSound = deferredAudio('assets/holepunch.mp3');
const clickSound = deferredAudio('assets/page-flip-01a.mp3');
const hoverSound = deferredAudio('assets/boxclick1.mp3');
const fileSound = deferredAudio('assets/printer2.mp3');
const tuckSound = deferredAudio('assets/tuck1.mp3');
let currentSound = null;
let siteMuted = false;
try { siteMuted = localStorage.getItem('site:muted') === 'true'; } catch {}
let audioActivated = false;
function startAmbient() { if(currentSound && !siteMuted && audioActivated) currentSound.play().catch(()=>{}); }
document.addEventListener('pointerdown',()=>{audioActivated=true;startAmbient();},{once:true});
document.addEventListener('keydown',()=>{audioActivated=true;startAmbient();},{once:true});
let fileList = [];
let currentArrowEl = null;
let currentAnimationId = null;
let currentFadeTimeout1 = null;
let currentFadeTimeout2 = null;


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
  if(isMobileLayout() || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if (currentAnimationId) {
    cancelAnimationFrame(currentAnimationId);
    currentAnimationId = null;
  }
  if (currentFadeTimeout1) {
    clearTimeout(currentFadeTimeout1);
    currentFadeTimeout1 = null;
  }
  if (currentFadeTimeout2) {
    clearTimeout(currentFadeTimeout2);
    currentFadeTimeout2 = null;
  }

  const svg = document.getElementById('folder-line');
  svg.innerHTML = '';

  const receipt = document.querySelector('.receipt');
  if (!receipt || !folderEl) return;

  svg.style.position = 'fixed';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = '100vw';
  svg.style.height = '100vh';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '9999';

  const measureText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  measureText.style.fontFamily = 'Noto Serif, serif';
  measureText.style.fontSize = getComputedStyle(folderEl).fontSize;
  measureText.style.fontWeight = getComputedStyle(folderEl).fontWeight;
  measureText.textContent = folderEl.textContent.replace('► ', '').replace('▼ ', '');
  svg.appendChild(measureText);
  const textWidth = measureText.getBBox().width;
  svg.removeChild(measureText);

  const fRect = folderEl.getBoundingClientRect();
  const rRect = receipt.getBoundingClientRect();

  const x1 = fRect.left + textWidth;
  const y1 = fRect.top + fRect.height / 2;
  const x2 = rRect.left + 42;
  const y2 = rRect.top + 74;

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowSize = 10;

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <filter id="line-filter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="blur"/>
      <feDropShadow dx="0" dy="0" stdDeviation="2.4" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
  `;
  svg.appendChild(defs);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#4a4440');
  path.setAttribute('stroke-width', '2.5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('opacity', '0.715');
  path.setAttribute('filter', 'url(#line-filter)');
  svg.appendChild(path);

  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arrow.setAttribute('fill', 'none');
  arrow.setAttribute('stroke', '#4a4440');
  arrow.setAttribute('stroke-width', '2.5');
  arrow.setAttribute('stroke-linecap', 'round');
  arrow.setAttribute('stroke-linejoin', 'round');
  arrow.setAttribute('opacity', '0.715');
  arrow.setAttribute('filter', 'url(#line-filter)');
  svg.appendChild(arrow);

  function updateArrow(hx, hy) {
    const ax1 = hx - arrowSize * Math.cos(angle - 0.4);
    const ay1 = hy - arrowSize * Math.sin(angle - 0.4);
    const ax2 = hx - arrowSize * Math.cos(angle + 0.4);
    const ay2 = hy - arrowSize * Math.sin(angle + 0.4);
    arrow.setAttribute('d', `M ${ax1} ${ay1} L ${hx} ${hy} L ${ax2} ${ay2}`);
  }

  const len = path.getTotalLength();
  const trailLen = 50;
  const duration = 490;
  const start = performance.now();

  // capture references so the closure always touches the right elements
  const thispath = path;
  const thisArrow = arrow;

  function animate(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;

    const head = ease * (len + trailLen);
    const tail = Math.max(0, head - trailLen);
    const visibleLen = head - tail;

    thispath.setAttribute('stroke-dasharray', `0 ${tail} ${visibleLen} ${len * 10}`);

    const headClamped = Math.min(ease * len, len);
    const pt = thispath.getPointAtLength(headClamped);
    updateArrow(pt.x, pt.y);

    if (t < 1) {
      currentAnimationId = requestAnimationFrame(animate);
    } else {
      currentAnimationId = null;
      currentFadeTimeout1 = setTimeout(() => {
        thispath.style.transition = 'opacity 0.4s ease';
        thisArrow.style.transition = 'opacity 0.4s ease';
        thispath.style.opacity = '0';
        thisArrow.style.opacity = '0';
        currentFadeTimeout2 = setTimeout(() => svg.innerHTML = '', 400);
      }, 600);
    }
  }

  currentAnimationId = requestAnimationFrame(animate);
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
    if(isMobileLayout())return;
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

window.addEventListener('resize', () => { updateFrame(); syncMobileLayout(); syncBannerLayout(); });

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

  document.getElementById('tuck-files-btn').addEventListener('click', () => {
    tuckSound.currentTime = 0;
    playEffect(tuckSound);
    const panel = document.getElementById('card-files-panel');
    if (panel.dataset.tucked === 'true') {
      panel.style.left = panel.dataset.savedLeft || '48cqw';
      panel.dataset.tucked = 'false';
    } else {
      panel.dataset.savedLeft = panel.style.left || '48cqw';
      panel.style.left = '-' + (panel.offsetWidth - 38) + 'px';
      panel.dataset.tucked = 'true';
    }
  });
}).catch(showError);

document.querySelector('.cardicon2').addEventListener('click', () => {
  playEffect(backSound);
  const parent = activeGroup?.key.includes('/') ? activeGroup.key.split('/')[0] : null;
  if (parent) openGroup(navigation.catalog.get(parent));
  else goToPage(contentModel.pages.find(page => page.section === 'home') || contentModel.pages[0]);
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
