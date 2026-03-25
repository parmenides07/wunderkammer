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

async function renderContent(path) {
    window.location.hash = path.replace('content/', '');
    if (cache[path]) {
        document.querySelector('.content').innerHTML = cache[path] + '<br>'.repeat(9);
    } else {
        const res = await fetch(path);
        let text = await res.text();
        const folder = path.substring(0, path.lastIndexOf('/'));
        text = text.replace(
            /!\[([^\]]*)\]\((?!http)([^)]+)\)/g,
            `![$1](${folder}/$2)`
        );
        cache[path] = marked.parse(text);
        document.querySelector('.content').innerHTML = cache[path] + '<br>'.repeat(9);
    }
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
}

async function navigate(path, index) {
  history.push(path);
  window.location.hash = path.replace('content/', '');

  const folders = Object.keys(index).filter(k => typeof index[k] === 'object' && k !== 'assets');
  const files = Object.keys(index).filter(k => index[k] === true);
  const folderName = path.split('/').pop();
  const indexFile = files.find(f => f === `${folderName}.md`);

  if (indexFile) renderContent(`${path}/${indexFile}`);

  if (files.length === 1 && folders.length === 0) {
    renderContent(`${path}/${files[0]}`);
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
      renderContent(`${path}/${file}`);
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
      const part = parts[i];
      if (currentIndex[part] === true) {
        // it's a file — build parent links then render file
        navigate(currentPath, currentIndex);
        renderContent(`${CONTENT_PATH}/${hash}`);
        break;
      } else if (typeof currentIndex[part] === 'object') {
        // it's a folder — go deeper
        currentIndex = currentIndex[part];
        currentPath = `${currentPath}/${part}`;
      } else {
        // not found
        navigate(CONTENT_PATH, index);
        break;
      }
    }

    if (!hash.includes('.md')) {
      navigate(currentPath, currentIndex);
    }
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
