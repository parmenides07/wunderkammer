const CONTENT_PATH = 'content';
const backSound = new Audio('assets/holepunch.mp3');
const clickSound = new Audio('assets/page-flip-01a.mp3');
const hoverSound = new Audio('assets/boxclick1.mp3');
const fileSound = new Audio('assets/printer2.mp3');
const cache = {};
const history = [];
let currentSound = null;
let siteMuted = false;
let fileList = [];
let globalIndex = null;
let currentFolderPath = CONTENT_PATH;
let currentFolderIndex = null;

marked.use({ breaks: true });

function formatName(name) {
  return name
    .replace('.md', '')
    .replace('.csv', '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, str => str.toUpperCase());
}

function folderHasUnread(currentPath, currentIndex) {
  const subFiles = Object.keys(currentIndex).filter(k =>
    typeof currentIndex[k] === 'object' &&
    currentIndex[k].created &&
    k.endsWith('.md')
  );
  const subFolders = Object.keys(currentIndex).filter(k =>
    typeof currentIndex[k] === 'object' &&
    !currentIndex[k].created &&
    k !== 'assets'
  );
  for (const file of subFiles) {
    const visitKey = `visited:${currentPath}/${file}`;
    const lastVisited = localStorage.getItem(visitKey);
    const modifiedDate = new Date(currentIndex[file].modified).getTime();
    if (!lastVisited || modifiedDate > parseInt(lastVisited)) return true;
  }
  for (const folder of subFolders) {
    if (folderHasUnread(`${currentPath}/${folder}`, currentIndex[folder])) return true;
  }
  return false;
}

function collectAllFiles(currentPath, currentIndex) {
  const subFiles = Object.keys(currentIndex).filter(k =>
    typeof currentIndex[k] === 'object' &&
    currentIndex[k].created &&
    k.endsWith('.md')
  );
  const subFolders = Object.keys(currentIndex).filter(k =>
    typeof currentIndex[k] === 'object' &&
    !currentIndex[k].created &&
    k !== 'assets'
  );
  const folderName = currentPath.split('/').pop();
  subFiles.forEach(file => {
    if (file === `${folderName}.md`) return;
    fileList.push({
      path: `${currentPath}/${file}`,
      created: currentIndex[file].created,
      modified: currentIndex[file].modified
    });
  });
  subFolders.forEach(folder => {
    collectAllFiles(`${currentPath}/${folder}`, currentIndex[folder]);
  });
}

function buildFolderLinks(containerEl, currentPath, currentIndex, isRoot = false) {
  if (isRoot) {
    const header = document.createElement('div');
    header.classList.add('card-section-header');
    header.textContent = 'Sections:';
    containerEl.appendChild(header);
  }

  const subFolders = Object.keys(currentIndex).filter(k =>
    typeof currentIndex[k] === 'object' &&
    !currentIndex[k].created &&
    k !== 'assets' &&
    k !== '.obsidian'
  );

  subFolders.forEach(folder => {
    const a = document.createElement('a');
    a.setAttribute('tabindex', '-1');
    a.href = '#';
    a.textContent = formatName(folder);
    a.classList.add('folder-link');
    const subIndex = currentIndex[folder];
    const folderIndexFile = Object.keys(subIndex).find(f => f === `${folder}.md`);
    if (folderIndexFile) {
      a.dataset.path = `${currentPath}/${folder}/${folderIndexFile}`;
    }
    if (folderHasUnread(`${currentPath}/${folder}`, currentIndex[folder])) {
      a.classList.add('unread');
    }

    const subContainer = document.createElement('div');
    subContainer.classList.add('sub-links');
    subContainer.style.display = 'none';

    a.addEventListener('click', async (e) => {
      e.preventDefault();
      clickSound.currentTime = 0;
      clickSound.play();
      const isOpen = subContainer.style.display === 'flex';
      subContainer.style.display = isOpen ? 'none' : 'flex';
      a.classList.toggle('open', !isOpen);
      if (!isOpen) {
        buildFolderLinks(subContainer, `${currentPath}/${folder}`, currentIndex[folder]);
        currentFolderPath = `${currentPath}/${folder}`;
        currentFolderIndex = currentIndex[folder];
        fileList = [];
        collectAllFiles(currentFolderPath, currentFolderIndex);
        buildFileLinks(document.querySelector('.card-file-links'), currentFolderPath, currentFolderIndex);
        const indexFile = Object.keys(subIndex).find(f => f === `${folder}.md`);
        if (indexFile) {
          fileSound.currentTime = 0;
          fileSound.play();
          await renderContent(`${currentPath}/${folder}/${indexFile}`, subIndex[indexFile].created, subIndex[indexFile].modified);
        }
      } else {
        subContainer.innerHTML = '';
      }
    });
    a.addEventListener('mouseenter', () => hoverSound.cloneNode().play());
    containerEl.appendChild(a);
    containerEl.appendChild(subContainer);
  });
}

function buildFileLinks(containerEl, currentPath, currentIndex) {
  containerEl.innerHTML = '';
  const currentFolderName = currentPath.split('/').pop();

  // header
  const header = document.createElement('div');
  header.classList.add('receipt-header');
  header.textContent = 'Entries \n';
  containerEl.appendChild(header);

  const topDivider = document.createElement('div');
  topDivider.classList.add('receipt-divider');
  topDivider.textContent = '***********************************';
  containerEl.appendChild(topDivider);

  const subFiles = Object.keys(currentIndex).filter(k =>
    typeof currentIndex[k] === 'object' &&
    currentIndex[k].created &&
    k.endsWith('.md')
  );

  const folderIndexName = `${currentFolderName}.md`;
  const indexPos = subFiles.indexOf(folderIndexName);
  if (indexPos > -1) {
    subFiles.splice(indexPos, 1);
    subFiles.unshift(folderIndexName);
  }

  subFiles.forEach((file, i) => {
    const a = document.createElement('a');
    a.setAttribute('tabindex', '-1');
    a.href = '#';
    a.textContent = `${i + 1}  ${formatName(file)}`;
    a.classList.add('file-link');
    a.dataset.path = `${currentPath}/${file}`;

    const visitKey = `visited:${currentPath}/${file}`;
    const lastVisited = localStorage.getItem(visitKey);
    const modifiedDate = new Date(currentIndex[file].modified).getTime();
    if (!lastVisited || modifiedDate > parseInt(lastVisited)) {
      a.classList.add('unread');
    }

    a.addEventListener('click', async (e) => {
      e.preventDefault();
      fileSound.currentTime = 0;
      fileSound.play();
      await renderContent(`${currentPath}/${file}`, currentIndex[file].created, currentIndex[file].modified);
    });
    a.addEventListener('mouseenter', () => hoverSound.cloneNode().play());
    containerEl.appendChild(a);
  });

  const bottomDivider = document.createElement('div');
  bottomDivider.classList.add('receipt-divider');
  bottomDivider.textContent = '===================================';
  containerEl.appendChild(bottomDivider);

  const total = document.createElement('div');
  total.classList.add('receipt-total');
  total.textContent = `Total: ${subFiles.length + "00$"}`;
  containerEl.appendChild(total);
}

async function syncCardToPath(path) {
  if (!globalIndex) return;
  const parts = path.replace('content/', '').split('/');
  let currentIndex = globalIndex;
  let currentPath = CONTENT_PATH;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (currentIndex[part]) {
      currentIndex = currentIndex[part];
      currentPath = `${currentPath}/${part}`;
    }
  }

  currentFolderPath = currentPath;
  currentFolderIndex = currentIndex;
  fileList = [];
  collectAllFiles(currentFolderPath, currentFolderIndex);
  buildFileLinks(document.querySelector('.card-file-links'), currentFolderPath, currentFolderIndex);

  setTimeout(() => {
    document.querySelectorAll('.file-link').forEach(a => a.classList.remove('active-link'));
    const activeLink = [...document.querySelectorAll('.file-link')].find(a => a.dataset.path === path);
    if (activeLink) {
      activeLink.classList.add('active-link');
      activeLink.classList.remove('unread');
    }
    document.querySelectorAll('.folder-link').forEach(a => a.classList.remove('active-folder-link'));
    const activeFolderLink = [...document.querySelectorAll('.folder-link')].find(a => a.dataset.path === path);
    if (activeFolderLink) activeFolderLink.classList.add('active-folder-link');
  }, 50);
}

async function renderContent(path, created, modified) {
  window.location.hash = path.replace('content/', '');
  document.querySelector('.content').scrollTop = 0;

  const visitKey = `visited:${path}`;
  localStorage.setItem(visitKey, Date.now());

  await syncCardToPath(path);

  const fileName = path.split('/').pop();
  const res = await fetch(path);
  let text = await res.text();
  const folder = path.substring(0, path.lastIndexOf('/'));

  let displayName = formatName(fileName);
  const titleMatch = text.match(/^title: (.+)\n/);
  if (titleMatch) {
    text = text.replace(titleMatch[0], '');
    displayName = titleMatch[1].trim();
  }

  const isWip = text.startsWith('wip: true');
  if (isWip) {
    text = text.replace('wip: true\n', '').trimStart();
    document.querySelector('.wip-sticker').style.display = 'block';
  } else {
    document.querySelector('.wip-sticker').style.display = 'none';
  }

  const bannerMatch = text.match(/^banner: (.+)\n/);
  if (bannerMatch) {
    text = text.replace(bannerMatch[0], '');
    const banner = document.querySelector('.banner');
    banner.src = `${folder}/${bannerMatch[1].trim()}`;
    banner.style.display = 'block';
    banner.onload = () => {
      document.querySelector('.content').style.paddingTop = `calc(${banner.offsetHeight}px + 2cqh)`;
      document.querySelector('.wip-sticker').style.top = (banner.offsetHeight - 146) + 'px';
    };
  } else {
    document.querySelector('.banner').style.display = 'none';
    document.querySelector('.content').style.paddingTop = '4cqw';
    document.querySelector('.wip-sticker').style.top = '5cqh';
  }

  const soundMatch = text.match(/^sound: (.+)\n/);
  if (soundMatch) {
    text = text.replace(soundMatch[0], '');
    const soundSrc = `${folder}/${soundMatch[1].trim()}`;
    if (currentSound) {
      currentSound.pause();
      currentSound.currentTime = 0;
    }
    if (!siteMuted) {
      const s = new Audio(soundSrc);
      s.loop = true;
      currentSound = s;
      s.play().catch(() => {});
    } else {
      const s = new Audio(soundSrc);
      s.loop = true;
      currentSound = s;
    }
  } else {
    if (currentSound) {
      currentSound.pause();
      currentSound.currentTime = 0;
      currentSound = null;
    }
  }

  const header = `<div class="doc-header">
    <em class="doc-dates">created: ${created || ''} &nbsp;&nbsp; modified: ${modified || ''}</em>
    <br><br>
    <h2>${displayName}</h2>
    <br>
  </div>`;

  const imagesFolderMatches = [...text.matchAll(/images\{([^}]+)\}/g)];
  for (const match of imagesFolderMatches) {
    const parts = match[1].split(',').map(s => s.trim());
    const imgFolder = parts[0];
    const flags = parts.slice(1);
    const isFullWidth = flags.includes('full');
    const fullFolder = imgFolder.startsWith('http') ? imgFolder : `${folder}/${imgFolder}`;
    try {
      const idxRes = await fetch('index.json');
      const idx = await idxRes.json();
      const partsPath = fullFolder.replace('content/', '').split('/').filter(Boolean);
      let node = idx;
      for (const part of partsPath) {
        if (node[part]) node = node[part];
      }
      const imageExts = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
      const imageFiles = Object.keys(node).filter(k => imageExts.test(k));
      const replacement = imageFiles.map(f => {
        const src = `${fullFolder}/${f}`;
        return isFullWidth ? `<img src="${src}" class="full-width-img">` : `![](${src})`;
      }).join('\n\n');
      text = text.replace(match[0], replacement);
    } catch {
      text = text.replace(match[0], '');
    }
  }

  const embedResults = {};
  const embedMatches = [...text.matchAll(/embed\{([^}]+)\}/g)];
  for (const match of embedMatches) {
    const embedFile = match[1].trim();
    const placeholder = `EMBEDPLACEHOLDER${Object.keys(embedResults).length}`;
    const embedPath = `${folder}/${embedFile}`;
    const embedRes = await fetch(embedPath);
    const embedText = await embedRes.text();
    let embedHtml = '';
    if (embedFile.endsWith('.csv')) {
      const parsedCsv = Papa.parse(embedText, { skipEmptyLines: true });
      const headers = parsedCsv.data[0];
      const body = parsedCsv.data.slice(1);
      embedHtml = `
        <div class="csv-table-wrapper">
          <table class="csv-table">
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>`;
    } else if (embedFile.endsWith('.html')) {
      const blob = new Blob([embedText], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      embedHtml = `<iframe src="${url}" class="html-embed"></iframe>`;
    }
    embedResults[placeholder] = embedHtml;
    text = text.replace(match[0], placeholder);
  }

  let parsed;
  if (cache[path]) {
    parsed = cache[path];
  } else {
    text = text.replace(
      /!\[([^\]]*)\]\((?!http)(?!content\/)([^)]+)\)/g,
      `![$1](${folder}/$2)`
    );
    let markedResult = marked.parse(text);
    Object.entries(embedResults).forEach(([placeholder, html]) => {
      markedResult = markedResult.replace(placeholder, html);
    });
    cache[path] = markedResult;
    parsed = cache[path];
  }

  document.querySelector('.content').innerHTML = `<div class="content-bg">${header + parsed}</div>`;

  const content = document.querySelector('.content');
  const contentBg = content.querySelector('.content-bg');
  const nodes = [...contentBg.childNodes];
  contentBg.innerHTML = '';

  let textWrapper = null;
  nodes.forEach(node => {
    const isImage = node.nodeName === 'IMG';
    const containsImage = node.querySelector && node.querySelector('img');
    if (!isImage && !containsImage) {
      if (!textWrapper) {
        textWrapper = document.createElement('div');
        textWrapper.classList.add('content-text');
        contentBg.appendChild(textWrapper);
      }
      textWrapper.appendChild(node);
    } else {
      textWrapper = null;
      contentBg.appendChild(node);
    }
  });

  content.querySelectorAll('img').forEach(img => {
    if (img.src.includes('#multiply')) {
      img.src = img.src.replace('#multiply', '');
      img.style.mixBlendMode = 'multiply';
      const wrapper = document.createElement('div');
      wrapper.classList.add('multiply-wrapper');
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
    }
  });

  content.querySelectorAll('img[alt^="sound:"]').forEach(img => {
    const rawSrc = img.alt.replace('sound:', '').trim();
    const soundSrc = rawSrc.startsWith('http') ? rawSrc : `${folder}/${rawSrc}`;
    img.style.cursor = 'pointer';
    img.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        if (currentSound) {
          currentSound.pause();
          currentSound.currentTime = 0;
        }
        const s = new Audio(soundSrc);
        currentSound = s;
        s.play();
      }
    });
    img.alt = '';
  });

  content.querySelectorAll('img:not([alt^="sound:"])').forEach(img => {
    img.addEventListener('click', () => {
      const lightbox = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightbox-img');
      lightboxImg.src = img.src;
      lightbox.classList.remove('active');
      lightboxImg.style.transform = 'scale(0.96)';
      void lightboxImg.offsetHeight;
      lightboxImg.style.transform = '';
      lightbox.classList.add('active');
    });
  });

  const nextBtn = document.getElementById('next-page-btn');
  const fileIdx = fileList.findIndex(f => f.path === path);
  if (fileIdx !== -1 && fileIdx < fileList.length - 1) {
    const next = fileList[fileIdx + 1];
    nextBtn.style.display = 'block';
    nextBtn.onclick = async () => {
      fileSound.currentTime = 0;
      fileSound.play();
      await renderContent(next.path, next.created, next.modified);
    };
  } else {
    nextBtn.style.display = 'none';
  }

  const hasImages = document.querySelector('.content img');
  if (!hasImages) {
    content.classList.add('text-only');
  } else {
    content.classList.remove('text-only');
  }

  setTimeout(updateFrame, 100);
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

async function navigate(path, index) {
  history.push(path);
  window.location.hash = path.replace('content/', '');

  const files = Object.keys(index).filter(k => typeof index[k] === 'object' && index[k].created);
  const folders = Object.keys(index).filter(k => typeof index[k] === 'object' && !index[k].created && k !== 'assets');
  const folderName = path.split('/').pop();
  const indexFile = files.find(f => f === `${folderName}.md`);

  if (indexFile) await renderContent(`${path}/${indexFile}`, index[indexFile].created, index[indexFile].modified);

  if (files.length === 1 && folders.length === 0) {
    await renderContent(`${path}/${files[0]}`, index[files[0]].created, index[files[0]].modified);
    return;
  }

  const folderLinks = document.querySelector('.card-folder-links');
  folderLinks.innerHTML = '';
  buildFolderLinks(folderLinks, CONTENT_PATH, globalIndex, true);

  currentFolderPath = path;
  currentFolderIndex = index;
  fileList = [];
  collectAllFiles(path, index);
  buildFileLinks(document.querySelector('.card-file-links'), path, index);
}

async function init() {
  const res = await fetch('index.json');
  globalIndex = await res.json();
  currentFolderIndex = globalIndex;

  const folderLinks = document.querySelector('.card-folder-links');
  folderLinks.innerHTML = '';
  buildFolderLinks(folderLinks, CONTENT_PATH, globalIndex, true);

  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const parts = hash.split('/');
    let currentIndex = globalIndex;
    let currentPath = CONTENT_PATH;

    for (let i = 0; i < parts.length; i++) {
      const part = decodeURIComponent(parts[i]);
      if (typeof currentIndex[part] === 'object' && currentIndex[part].created) {
        await renderContent(
          `${CONTENT_PATH}/${parts.map(decodeURIComponent).join('/')}`,
          currentIndex[part].created,
          currentIndex[part].modified
        );
        return;
      } else if (typeof currentIndex[part] === 'object') {
        currentIndex = currentIndex[part];
        currentPath = `${currentPath}/${part}`;
      } else {
        await navigate(CONTENT_PATH, globalIndex);
        return;
      }
    }
    await navigate(currentPath, currentIndex);
  } else {
    await navigate(CONTENT_PATH, globalIndex);
  }
}

function makeDraggable(panelEl) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  panelEl.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('tuck-btn')) return;
    if (e.target.tagName === 'A') return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = panelEl.offsetLeft;
    startTop = panelEl.offsetTop;
    panelEl.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panelEl.style.left = `${startLeft + (e.clientX - startX)}px`;
    panelEl.style.top = `${startTop + (e.clientY - startY)}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      panelEl.classList.remove('dragging');
    }
  });
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
});

document.getElementById('lightbox').addEventListener('click', () => {
  document.getElementById('lightbox').classList.remove('active');
});

document.querySelector('.cardicon2').addEventListener('click', () => {
  backSound.currentTime = 0;
  backSound.play();
  history.pop();
  const previous = history.pop();
  if (previous) {
    const parts = previous.replace('content/', '').split('/');
    let currentIndex = globalIndex;
    for (const part of parts) {
      if (currentIndex[part]) currentIndex = currentIndex[part];
    }
    navigate(previous, currentIndex);
  } else {
    navigate(CONTENT_PATH, globalIndex);
  }
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
if (isWebKit) document.body.classList.add('safari');

document.querySelector('.content').addEventListener('click', async (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('mailto')) return;

  e.preventDefault();

  const hash = href.replace('#', '');
  const parts = hash.split('/');
  let currentIndex = globalIndex;
  let currentPath = CONTENT_PATH;

  for (let i = 0; i < parts.length; i++) {
    const part = decodeURIComponent(parts[i]);
    if (typeof currentIndex[part] === 'object' && currentIndex[part].created) {
      await renderContent(
        `${CONTENT_PATH}/${parts.map(decodeURIComponent).join('/')}`,
        currentIndex[part].created,
        currentIndex[part].modified
      );
      return;
    } else if (typeof currentIndex[part] === 'object') {
      currentIndex = currentIndex[part];
      currentPath = `${currentPath}/${part}`;
    } else {
      await navigate(CONTENT_PATH, globalIndex);
      return;
    }
  }
  await navigate(currentPath, currentIndex);
});