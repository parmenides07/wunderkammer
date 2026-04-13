const CONTENT_PATH = 'content';
const backSound = new Audio('assets/holepunch.mp3');
const clickSound = new Audio('assets/page-flip-01a.mp3');
const hoverSound = new Audio('assets/boxclick1.mp3');
const cache = {};
const history = [];

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

  const fileName = path.split('/').pop();
  const displayName = formatName(fileName);

    const header = `<div class="doc-header">
    <em class="doc-dates">created: ${created || ''} &nbsp;&nbsp; modified: ${modified || ''}</em>
    <br>
    <br>
    <h2>${displayName}</h2>
    <br>
    </div>`;

  let parsed;
  const res = await fetch(path);
  let text = await res.text();
  const folder = path.substring(0, path.lastIndexOf('/'));

  const bannerMatch = text.match(/^banner: (.+)\n/);
  if (bannerMatch) {
    text = text.replace(bannerMatch[0], '');
    const banner = document.querySelector('.banner');
    banner.src = `${folder}/${bannerMatch[1].trim()}`;
    banner.style.display = 'block';
  } else {
    document.querySelector('.banner').style.display = 'none';
  }

const isWip = text.startsWith('wip: true');
if (isWip) {
  text = text.replace('wip: true\n', '').trimStart();
  document.querySelector('.wip-sticker').style.display = 'block';
} else {
  document.querySelector('.wip-sticker').style.display = 'none';
}

const bannerMatch = text.match(/^banner: (.+)\n/);

  if (cache[path]) {
    parsed = cache[path];
  } else {
    text = text.replace(
      /!\[([^\]]*)\]\((?!http)([^)]+)\)/g,
      `![$1](${folder}/$2)`
    );
    cache[path] = marked.parse(text);
    parsed = cache[path];
  }

  document.querySelector('.content').innerHTML = header + parsed + '<br>'.repeat(9);

  const content = document.querySelector('.content');
  const nodes = [...content.childNodes];
  content.innerHTML = '';

  let textWrapper = null;
  nodes.forEach(node => {
    const isImage = node.nodeName === 'IMG';
    const containsImage = node.querySelector && node.querySelector('img');
    if (!isImage && !containsImage) {
      if (!textWrapper) {
        textWrapper = document.createElement('div');
        textWrapper.classList.add('content-text');
        content.appendChild(textWrapper);
      }
      textWrapper.appendChild(node);
    } else {
      textWrapper = null;
      content.appendChild(node);
    }
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

  folders.forEach(folder => {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = formatName(folder);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      clickSound.currentTime = 0;
      clickSound.play();
      navigate(`${path}/${folder}`, index[folder]);
    });
    a.addEventListener('mouseenter', () => {
      hoverSound.cloneNode().play();
    });
    cardLinks.appendChild(a);
  });

  files.forEach(file => {
    if (file === `${folderName}.md`) return;
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = formatName(file);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      clickSound.currentTime = 0;
      clickSound.play();
      renderContent(`${path}/${file}`, index[file].created, index[file].modified);
    });
    a.addEventListener('mouseenter', () => {
      hoverSound.cloneNode().play();
    });
    cardLinks.appendChild(a);
  });
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

init();

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
