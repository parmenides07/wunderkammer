const fs = require('fs');
const path = require('path');

function buildIndex(dir) {
  const result = {};
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory() && item !== 'assets') {
      result[item] = buildIndex(fullPath);
    } else if (item.endsWith('.md')) {
      result[item] = true;
    }
  });
  return result;
}

const index = buildIndex('./content');
fs.writeFileSync('./index.json', JSON.stringify(index, null, 2));
console.log('index.json generated');