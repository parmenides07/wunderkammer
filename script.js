const backSound = new Audio('assets/holepunch.mp3');
const clickSound = new Audio('assets/page-flip-01a.mp3');
const hoverSound = new Audio('assets/boxclick1.mp3');
const fileSound = new Audio('assets/printer2.mp3');
const tuckSound = new Audio('assets/tuck1.mp3');
let currentSound = null;
let siteMuted = false;
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
    if (e.target.classList.contains('tuck-btn')) return;
    if (e.target.tagName === 'A') return;
    dragStart(e.clientX, e.clientY);
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY));
  document.addEventListener('mouseup', dragEnd);

  // touch
  panelEl.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('tuck-btn')) return;
    if (e.target.tagName === 'A') return;
    const t = e.touches[0];
    dragStart(t.clientX, t.clientY);
  }, { passive: true });

  panelEl.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    dragMove(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  panelEl.addEventListener('touchend', dragEnd);
}

const contentEl = document.querySelector('.content');
contentEl.addEventListener('scroll', () => {
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

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => location.reload(), 300);
});

init().then(() => {
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

document.getElementById('lightbox').addEventListener('click', () => {
  document.getElementById('lightbox').classList.remove('active');
});

document.querySelector('.cardicon2').addEventListener('click', () => {
  playEffect(backSound);
  const parent = activeGroup?.key.includes('/') ? activeGroup.key.split('/')[0] : null;
  if (parent) openGroup(navigation.catalog.get(parent));
  else goToPage(contentModel.pages.find(page => page.section === 'home') || contentModel.pages[0]);
});

document.getElementById('mute-btn').addEventListener('click', () => {
  siteMuted = !siteMuted;
  document.getElementById('mute-btn').classList.toggle('muted', siteMuted);
  if (siteMuted && currentSound) {
    currentSound.pause();
  } else if (!siteMuted && currentSound) {
    currentSound.play().catch(() => {});
  }
});

const isWebKit = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// showing — add active first, then visible on next frame so transition fires
function showOverlay(id) {
  const el = document.getElementById(id);
  el.classList.add('active');
  requestAnimationFrame(() => el.classList.add('visible'));
}

function hideOverlay(id) {
  const el = document.getElementById(id);
  el.classList.remove('visible');
  el.addEventListener('transitionend', () => el.classList.remove('active'), { once: true });
}

if (isWebKit || isMobile) {
  showOverlay('compat-warning');
} else {
  showOverlay('info-card');
}

document.getElementById('compat-ok').addEventListener('click', () => hideOverlay('compat-warning'));
document.getElementById('info-card').addEventListener('click', (e) => {
  if (!e.target.closest('.info-card-img')) hideOverlay('info-card');
});

document.querySelector('.content').addEventListener('click', e => {
  const link = e.target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href?.startsWith('#/')) return;
  e.preventDefault();
  window.location.hash = href;
});
