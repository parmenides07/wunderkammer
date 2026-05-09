const fs = require('fs');
const path = require('path');

const MD_EXTS = /\.(md|csv|html)$/;
const ASSET_EXTS = /\.(jpg|jpeg|png|gif|webp|svg|mp3|wav|ogg|mp4)$/i;

function buildIndex(dir) {
  const result = {};
  const items = fs.readdirSync(dir);
  
  let order = [];
  if (items.includes('_order.json')) {
    order = JSON.parse(fs.readFileSync(path.join(dir, '_order.json'), 'utf8'));
  }
  
  const sorted = [
    ...order.filter(o => items.includes(o)),
    ...items.filter(i => !order.includes(i) && i !== '_order.json')
  ];

  sorted.forEach(item => {
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