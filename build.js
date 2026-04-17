const fs = require('fs');
const path = require('path');

const MD_EXTS = /\.md$/;
const ASSET_EXTS = /\.(jpg|jpeg|png|gif|webp|svg|mp3|wav|ogg|mp4)$/i;

function buildIndex(dir) {
  const result = {};
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      result[item] = buildIndex(fullPath);
    } else if (MD_EXTS.test(item)) {
      result[item] = {
        created: stats.birthtime.toLocaleDateString(),
        modified: stats.mtime.toLocaleDateString()
      };
    } else if (ASSET_EXTS.test(item)) {
      result[item] = { asset: true };
    }
  });
  return result;
}

const index = buildIndex('./content');
fs.writeFileSync('./index.json', JSON.stringify(index, null, 2));
console.log('index.json generated');