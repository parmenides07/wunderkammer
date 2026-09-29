// Fetch build-parsed Markdown; authorSource retains the frontmatter-bearing original.
const markdownCache = new Map();
let renderGeneration = 0;
async function renderPage(page) {
  const generation = ++renderGeneration;
  const folder = page.assetBase;
  const { created, modified } = page;
  const displayName = escapeHtml(page.title);
  let text = markdownCache.get(page.id);
  if (text === undefined) {
    const response = await fetch(new URL(page.source, appBase));
    if (!response.ok) throw new Error(`${page.source}: HTTP ${response.status}`);
    text = await response.text();
    markdownCache.set(page.id, text);
  }
  if (generation !== renderGeneration) return;
  document.querySelector('.content').scrollTop = 0;
  const sticker = document.querySelector('.wip-sticker');
  sticker.style.display = page.status === 'wip' ? 'block' : 'none';
  sticker.style.transform = '';
  sticker.style.opacity = '';
  const banner = document.querySelector('.banner');
  banner.style.transform = '';
  banner.onload = null;
  if (page.banner) {
    banner.onload = () => {
      if (generation !== renderGeneration) return;
      document.querySelector('.content').style.paddingTop = `calc(${banner.offsetHeight}px + 2cqh)`;
      sticker.style.top = (banner.offsetHeight - 146) + 'px';
    };
    banner.src = assetUrl(folder, page.banner);
    banner.style.display = 'block';
  } else {
    banner.removeAttribute('src');
    banner.style.display = 'none';
    document.querySelector('.content').style.paddingTop = '4cqw';
    sticker.style.top = '5cqh';
  }
  if (currentSound) { currentSound.pause(); currentSound.currentTime = 0; }
  currentSound = page.sound ? new Audio(assetUrl(folder, page.sound)) : null;
  if (currentSound) {
    currentSound.loop = true;
    if (!siteMuted) currentSound.play().catch(() => {});
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
    const fullFolder = assetPath(folder, imgFolder);
    try {
      const imageExts = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
      const imageFiles = (contentModel.assets[fullFolder.replace(/\/$/, '')] || []).filter(k => imageExts.test(k));
      const replacement = imageFiles.map(f => {
        const src = assetUrl(fullFolder, f);
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
    const embedPath = assetUrl(folder, embedFile);
    const embedRes = await fetch(embedPath);
    if (!embedRes.ok) throw new Error(`Could not load embed: ${embedPath}`);
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
      // A real document URL preserves relative image/script URLs inside the embed.
      embedHtml = `<iframe src="${escapeHtml(embedPath)}" class="html-embed"></iframe>`;
    }
    embedResults[placeholder] = embedHtml;
    text = text.replace(match[0], placeholder);
  }

  if (generation !== renderGeneration) return;
  let parsed = marked.parse(text);
  Object.entries(embedResults).forEach(([placeholder, html]) => {
    parsed = parsed.replace(placeholder, html);
  });
  // Resolve URLs in an inert template before attaching images to the document.
  const template = document.createElement('template');
  template.innerHTML = parsed;
  template.content.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && !/^(?:[a-z]+:|\/)/i.test(src)) img.src = assetUrl(folder, src);
  });
  parsed = template.innerHTML;
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
    const soundSrc = assetUrl(folder, rawSrc);
    img.style.cursor = 'pointer';
    img.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        if (currentSound) {
          currentSound.pause();
          currentSound.currentTime = 0;
        }
        const s = new Audio(soundSrc);
        currentSound = s;
        if (!siteMuted) s.play().catch(() => {});
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
  const fileIdx = fileList.findIndex(f => f.id === page.id);
  if (fileIdx !== -1 && fileIdx < fileList.length - 1) {
    const next = fileList[fileIdx + 1];
    nextBtn.style.display = 'block';
    nextBtn.onclick = async () => {
      fileSound.currentTime = 0;
      playEffect(fileSound);
      goToPage(next);
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

  markVisited(page);
  refreshUnread();
  document.querySelector('.content').dataset.pageId = page.id;
  setTimeout(updateFrame, 100);
}

