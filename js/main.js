let contentModel, navigation, activeGroup;
const expandedGroups = new Set();
const appBase = new URL('./', document.baseURI);
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function assetUrl(folder, reference) {
  if (/^(?:[a-z]+:|\/)/i.test(reference)) return new URL(reference, appBase).href;
  // Generated galleries already have site-root URLs; authored images are page-relative.
  return new URL(`${folder}/${reference}`, appBase).href;
}
function assetPath(folder, reference) {
  return decodeURIComponent(new URL(assetUrl(folder, reference)).pathname.slice(appBase.pathname.length)).replace(/\/$/, '');
}
function playEffect(sound) {
  if (siteMuted) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}
function lastVisit(page) {
  try { return Number(localStorage.getItem(`visited:${page.id}`) || 0); } catch { return 0; }
}
function markVisited(page) {
  try { localStorage.setItem(`visited:${page.id}`, Date.now()); } catch { /* Browsing still works without storage. */ }
}
function isUnread(page) { return lastVisit(page) < Date.parse(page.modified); }
function refreshUnread() {
  document.querySelectorAll('.file-link').forEach(link => {
    const page = contentModel.byId.get(link.dataset.id);
    link.classList.toggle('unread', !!page && isUnread(page));
  });
  document.querySelectorAll('.folder-link').forEach(link => {
    const node = navigation.catalog.get(link.dataset.group);
    link.classList.toggle('unread', node.pages.some(isUnread));
  });
}
function buildFolderLinks() {
  const container = document.querySelector('.card-folder-links');
  container.innerHTML = '<div class="card-section-header">Sections:</div>';
  function add(node, parent) {
    const a = document.createElement('a');
    a.href = `#/${node.pages[0].slug}`;
    a.textContent = node.label;
    a.className = 'folder-link';
    a.dataset.group = node.key;
    a.classList.toggle('active-folder-link', activeGroup?.key === node.key);
    a.classList.toggle('open', expandedGroups.has(node.key));
    const children = document.createElement('div');
    children.className = 'sub-links';
    children.style.display = expandedGroups.has(node.key) ? 'flex' : 'none';
    a.addEventListener('click', e => {
      e.preventDefault(); playEffect(clickSound);
      if (node.children.length && expandedGroups.has(node.key)) {
        expandedGroups.delete(node.key);
        buildFolderLinks();
        document.getElementById('folder-line').innerHTML = '';
        return;
      }
      expandedGroups.add(node.key);
      openGroup(node);
      requestAnimationFrame(() => drawFolderLine(document.querySelector(`[data-group="${node.key}"]`)));
    });
    a.addEventListener('mouseenter', () => playEffect(hoverSound.cloneNode()));
    parent.append(a, children);
    node.children.forEach(child => add(child, children));
  }
  navigation.sections.forEach(node => add(node, container));
  refreshUnread();
}
function buildFileLinks(page) {
  const container = document.querySelector('.card-file-links');
  container.innerHTML = '';
  const receiptPanel = document.getElementById('card-files-panel');
  receiptPanel.classList.remove('receipt-bob'); void receiptPanel.offsetHeight; receiptPanel.classList.add('receipt-bob');
  const add = (className, text) => { const el = document.createElement('div');el.className=className;el.textContent=text;container.appendChild(el); };
  add('receipt-header', activeGroup.label);
  add('receipt-divider', '***********************************');
  fileList = activeGroup.pages;
  fileList.forEach((entry, i) => {
    const a = document.createElement('a');
    a.href = `#/${entry.slug}`;
    a.textContent = `${i + 1}  ${activeGroup.key.includes('/') ? entry.navTitle || entry.title : entry.title}`;
    a.className = 'file-link'; a.dataset.id = entry.id;
    a.classList.toggle('active-link', page?.id === entry.id);
    a.addEventListener('click', e => { e.preventDefault();playEffect(fileSound);goToPage(entry); });
    a.addEventListener('mouseenter', () => playEffect(hoverSound.cloneNode()));
    container.appendChild(a);
  });
  add('receipt-divider', '===================================');
  add('receipt-total', `Total: ${fileList.length}.00$`);
  refreshUnread();
}
function openGroup(node) {
  activeGroup = node;
  buildFolderLinks();
  goToPage(node.pages[0]);
}
function goToPage(page) {
  if (!page || !contentModel.byId.has(page.id)) return;
  const hash = `#/${page.slug}`;
  if (window.location.hash === hash) handleRoute(); else window.location.hash = hash;
}
function showError(error) {
  console.error(error);
  document.querySelector('.content').innerHTML = `<div class="content-bg"><div class="content-text"><p>Unable to load this page. Please reload and try again.</p></div></div>`;
}
async function handleRoute() {
  try {
    let route;
    try { route = decodeURIComponent(window.location.hash.replace(/^#\/?/, '')); } catch { route = ''; }
    const page = contentModel.resolve(route || 'home');
    if (!page) {
      ++renderGeneration;
      if (currentSound) { currentSound.pause(); currentSound = null; }
      document.querySelector('.banner').style.display = 'none';
      document.querySelector('.wip-sticker').style.display = 'none';
      document.querySelector('.content').style.paddingTop = '4cqw';
      document.getElementById('next-page-btn').style.display = 'none';
      document.querySelector('.content').dataset.pageId = '';
      document.querySelector('.content').innerHTML = '<div class="content-bg"><div class="content-text"><h2>Page unavailable</h2><p>This page is not available in this view. Choose a section from the paper card.</p></div></div>';
      return;
    }
    if (window.location.hash !== `#/${page.slug}`) window.history.replaceState(null, '', `${location.pathname}${location.search}#/${page.slug}`);
    if (!activeGroup?.pages.some(entry => entry.id === page.id)) activeGroup = navigation.pageGroups.get(page.id);
    expandedGroups.add(page.section);
    buildFolderLinks(); buildFileLinks(page);
    await renderPage(page);
  } catch (error) { showError(error); }
}
async function init() {
  const [manifest, config] = await Promise.all(['manifest.json','site.config.json'].map(async url => {
    const response = await fetch(new URL(url, appBase));
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }));
  const audience = /\/work(?:\/(?:index\.html)?)?$/.test(window.location.pathname) ? 'professional' : 'public';
  contentModel = SiteContent.createContentModel(manifest, audience);
  navigation = SiteNavigation.createNavigation(contentModel, config, audience);
  // Carry visits forward from any recognized legacy path, once per stable ID.
  for (const [oldPath, slug] of Object.entries(manifest.aliases)) {
    const page = contentModel.bySlug.get(slug);
    if (!page) continue;
    try {
      const old = Number(localStorage.getItem(`visited:${oldPath.startsWith('content/') ? oldPath : 'content/' + oldPath}`));
      if (old > lastVisit(page)) localStorage.setItem(`visited:${page.id}`, old);
    } catch { /* Storage may be disabled. */ }
  }
  buildFolderLinks();
  window.addEventListener('hashchange', handleRoute);
  await handleRoute();
}
