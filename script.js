const CONTENT_PATH = 'content';
const backSound = new Audio('assets/holepunch.mp3');
const clickSound = new Audio('assets/page-flip-01a.mp3');
const hoverSound = new Audio('assets/boxclick1.mp3');
const fileSound = new Audio('assets/printer2.mp3');
const cache = {};
const history = [];
let currentSound = null;

marked.use({ breaks: true });

function formatName(name) {
  return name
    .replace('.md', '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, str => str.toUpperCase());
}

async function renderContent(path, created, modified) {
  window.location.hash = path.replace('content/', '');
  document.querySelector('.content').scrollTop = 0;

  // highlight active link
  document.querySelectorAll('.card-links .file-link, .card-links .folder-link').forEach(a => {
    a.classList.remove('active-link');
  });
  const activeLink = [...document.querySelectorAll('.file-link')].find(a => a.dataset.path === path);
  if (activeLink) activeLink.classList.add('active-link');

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
    };
  } else {
    document.querySelector('.banner').style.display = 'none';
    document.querySelector('.content').style.paddingTop = '4cqw';
  }

  const header = `<div class="doc-header">
    <em class="doc-dates">created: ${created || ''} &nbsp;&nbsp; modified: ${modified || ''}</em>
    <br><br>
    <h2>${displayName}</h2>
    <br>
  </div>`;

  // expand images{} shorthand with optional flags e.g. images{assets/, full}
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
        return isFullWidth
          ? `<img src="${src}" class="full-width-img">`
          : `![](${src})`;
      }).join('\n\n');
      text = text.replace(match[0], replacement);
    } catch {
      text = text.replace(match[0], '');
    }
  }

  let parsed;
  if (cache[path]) {
    parsed = cache[path];
  } else {
    text = text.replace(
      /!\[([^\]]*)\]\((?!http)(?!content\/)([^)]+)\)/g,
      `![$1](${folder}/$2)`
    );
    cache[path] = marked.parse(text);
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

  const hasImages = document.querySelector('.content img');
  if (!hasImages) {
    content.classList.add('text-only');
  } else {
    content.classList.remove('text-only');
  }
}

async function navigate(path, index) {
  history.push(path);
  window.location.hash = path.replace('content/', '');

  const files = Object.keys(index).filter(k => typeof index[k] === 'object' && index[k].created);
  const folders = Object.keys(index).filter(k => typeof index[k] === 'object' && !index[k].created && k !== 'assets');
  const folderName = path.split('/').pop();
  const indexFile = files.find(f => f === `${folderName}.md`);

  if (indexFile) renderContent(`${path}/${indexFile}`, index[indexFile].created, index[indexFile].modified);

  if (files.length === 1 && folders.length === 0) {
    renderContent(`${path}/${files[0]}`, index[files[0]].created, index[files[0]].modified);
    return;
  }

  const cardLinks = document.querySelector('.card-links');
  cardLinks.innerHTML = '';

  function buildLinks(containerEl, currentPath, currentIndex) {
    const subFiles = Object.keys(currentIndex).filter(k => typeof currentIndex[k] === 'object' && currentIndex[k].created);
    const subFolders = Object.keys(currentIndex).filter(k => typeof currentIndex[k] === 'object' && !currentIndex[k].created && k !== 'assets');
    const currentFolderName = currentPath.split('/').pop();

    subFolders.forEach(folder => {
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = formatName(folder);
      a.classList.add('folder-link');

      const subContainer = document.createElement('div');
      subContainer.classList.add('sub-links');
      subContainer.style.display = 'none';

      a.addEventListener('click', (e) => {
        e.preventDefault();
        clickSound.currentTime = 0;
        clickSound.play();
        const isOpen = subContainer.style.display === 'flex';
        subContainer.style.display = isOpen ? 'none' : 'flex';
        a.classList.toggle('open', !isOpen);
        if (!isOpen) {
          buildLinks(subContainer, `${currentPath}/${folder}`, currentIndex[folder]);
          const subIndex = currentIndex[folder];
          const indexFile = Object.keys(subIndex).find(f => f === `${folder}.md`);
          if (indexFile) {
            fileSound.currentTime = 0;
            fileSound.play();
            renderContent(`${currentPath}/${folder}/${indexFile}`, subIndex[indexFile].created, subIndex[indexFile].modified);
          }
        } else {
          subContainer.innerHTML = '';
        }
      });
      a.addEventListener('mouseenter', () => hoverSound.cloneNode().play());

      containerEl.appendChild(a);
      containerEl.appendChild(subContainer);
    });

    subFiles.forEach(file => {
      if (file === `${currentFolderName}.md`) return;
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = formatName(file);
      a.classList.add('file-link');
      a.dataset.path = `${currentPath}/${file}`; // ← correctly inside the loop
      a.addEventListener('click', (e) => {
        e.preventDefault();
        fileSound.currentTime = 0;
        fileSound.play();
        renderContent(`${currentPath}/${file}`, currentIndex[file].created, currentIndex[file].modified);
      });
      a.addEventListener('mouseenter', () => hoverSound.cloneNode().play());
      containerEl.appendChild(a);
    });
  }

  buildLinks(cardLinks, path, index);
}

async function init() {
  const res = await fetch('index.json');
  const index = await res.json();

  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const parts = hash.split('/');
    let currentIndex = index;
    let currentPath = CONTENT_PATH;

    for (let i = 0; i < parts.length; i++) {
      const part = decodeURIComponent(parts[i]);
      if (typeof currentIndex[part] === 'object' && currentIndex[part].created) {
        navigate(currentPath, currentIndex);
        renderContent(`${CONTENT_PATH}/${parts.map(decodeURIComponent).join('/')}`, currentIndex[part].created, currentIndex[part].modified);
        return;
      } else if (typeof currentIndex[part] === 'object') {
        currentIndex = currentIndex[part];
        currentPath = `${currentPath}/${part}`;
      } else {
        navigate(CONTENT_PATH, index);
        return;
      }
    }
    navigate(currentPath, currentIndex);
  } else {
    navigate(CONTENT_PATH, index);
  }
}

const contentEl = document.querySelector('.content');
contentEl.addEventListener('scroll', () => {
  const banner = document.querySelector('.banner');
  const sticker = document.querySelector('.wip-sticker');
  const bannerH = banner.offsetHeight;
  const scrolled = contentEl.scrollTop;

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

init();

// lightbox close — registered once globally
document.getElementById('lightbox').addEventListener('click', () => {
  document.getElementById('lightbox').classList.remove('active');
});

document.querySelector('.cardicon').addEventListener('click', () => {
  backSound.currentTime = 0;
  backSound.play();
  history.pop();
  const previous = history.pop();
  if (previous) {
    fetch('index.json').then(r => r.json()).then(index => {
      const parts = previous.replace('content/', '').split('/');
      let currentIndex = index;
      for (const part of parts) {
        if (currentIndex[part]) currentIndex = currentIndex[part];
      }
      navigate(previous, currentIndex);
    });
  } else {
    fetch('index.json').then(r => r.json()).then(index => {
      navigate(CONTENT_PATH, index);
    });
  }
});

if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
  document.body.classList.add('safari');
}