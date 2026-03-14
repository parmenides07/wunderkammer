const GITHUB_USER = 'YOUR_USERNAME';
const GITHUB_REPO = 'YOUR_REPO';
const BRANCH = 'main';
const CONTENT_PATH = 'content';

const apiBase = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents`;
const rawBase = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}`;

const cache = {};

async function getItems(path) {
  if (cache[path]) return cache[path];
  const res = await fetch(`${apiBase}/${path}`);
  const items = await res.json();
  cache[path] = items;
  return items;
}

async function renderContent(path) {
  const res = await fetch(`${rawBase}/${path}`);
  const text = await res.text();
  document.querySelector('.content').innerHTML = marked.parse(text);
}

async function navigate(path) {
  const items = await getItems(path);
  const folders = items.filter(i => i.type === 'dir');
  const files = items.filter(i => i.name.endsWith('.md'));

  // if only one md file and no folders, just show it
  if (files.length === 1 && folders.length === 0) {
    renderContent(files[0].path);
    return;
  }

  // otherwise build links from folders and files
  const cardLinks = document.querySelector('.card-links');
  cardLinks.innerHTML = '';

  // folders first
  folders.forEach(folder => {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = folder.name;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(folder.path);
    });
    cardLinks.appendChild(a);
  });

  // then files
  files.forEach(file => {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = file.name.replace('.md', '');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      renderContent(file.path);
    });
    cardLinks.appendChild(a);
  });
}

// start at content folder
navigate(CONTENT_PATH);