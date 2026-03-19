const GITHUB_USER = 'parmenides07';
const GITHUB_REPO = 'wunderkammer';
const BRANCH = 'master';
const CONTENT_PATH = 'content';
const backSound = new Audio('assets/holepunch.mp3');
const clickSound = new Audio('assets/page-flip-01a.mp3');

const apiBase = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents`;
const rawBase = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}`;

const cache = {};
const history = [];

function formatName(name) {
  return name
    .replace('.md', '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, str => str.toUpperCase());
}

async function getItems(path) {
  if (cache[path]) return cache[path];
  const res = await fetch(`${apiBase}/${path}`);
  const items = await res.json();
  cache[path] = items;
  return items;
}

marked.use({ breaks: true });

async function renderContent(path) {
  console.log(path)
  window.location.hash = path.replace('content/', '');
  const res = await fetch(`${rawBase}/${path}`);
  let text = await res.text(); 

  const folder = path.substring(0, path.lastIndexOf('/'));
  console.log('folder:', folder);
  console.log('before:', text);
  
  text = text.replace(
    /!\[([^\]]*)\]\((?!http)([^)]+)\)/g,
    `![$1](${rawBase}/${folder}/$2)`
  );
  console.log('after:', text);

  document.querySelector('.content').innerHTML = marked.parse(text) + '<br>'.repeat(9);

  const hasImages = document.querySelector('.content img');
  if (!hasImages) {
    document.querySelector('.content').classList.add('text-only');
  } else {
    document.querySelector('.content').classList.remove('text-only');
  }
}

async function navigate(path) {
  history.push(path);
  window.location.hash = path.replace('content/', '');
  const items = await getItems(path);
  const folders = items.filter(i => i.type === 'dir' && i.name.toLowerCase() !== 'assets');
  const files = items.filter(i => i.name.endsWith('.md'));

  const folderName = path.split('/').pop();
  const indexFile = files.find(f => f.name === `${folderName}.md`);

  if (indexFile) renderContent(indexFile.path);

  if (files.length === 1 && folders.length === 0) {
    renderContent(files[0].path);
    return;
  }

  const cardLinks = document.querySelector('.card-links');
  cardLinks.innerHTML = '';

  folders.forEach(folder => {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = formatName(folder.name);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      clickSound.currentTime = 0;
      clickSound.play();
      navigate(folder.path);
    });
    cardLinks.appendChild(a);
  });

  files.forEach(file => {
    if (file.name === `${folderName}.md`) return;
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = formatName(file.name);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      clickSound.currentTime = 0;
      clickSound.play();
      renderContent(file.path);
    });
    cardLinks.appendChild(a);
  });
}

const hash = window.location.hash.replace('#', '');
if (hash) {
  const path = `content/${hash}`;
  if (hash.endsWith('.md')) {
    // render the file AND build the parent folder links
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    navigate(parentPath);
    renderContent(path);
  } else {
    navigate(path);
  }
} else {
  navigate(CONTENT_PATH);
}

document.querySelector('.cardicon').addEventListener('click', () => {
  backSound.currentTime = 0;
  backSound.play();
  history.pop();
  const previous = history.pop();
  if (previous) {
    navigate(previous);
  } else {
    navigate(CONTENT_PATH);
  }
});
