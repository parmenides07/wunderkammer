const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const IMAGE = /\.(png|jpe?g|webp|gif|avif)$/i;
const VERSION = 'webp-q90-v1';
async function buildImages(root, manifest, shell, css) {
  const output = path.join(root, 'generated/images');
  fs.mkdirSync(output, {recursive:true});
  const cacheFile = path.join(output, 'cache.json');
  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile)) : {};
  const refs = new Set();
  for (const [dir, files] of Object.entries(manifest.assetDirectories)) for (const name of files) if (IMAGE.test(name)) refs.add(`${dir}/${name}`);
  for (const match of (shell+'\n'+css).matchAll(/(?:src=["']|url\(["']?)(assets\/[^"')]+)["')]/g)) if(IMAGE.test(match[1])) refs.add(match[1]);
  const images = {};
  let processed = 0, cached = 0;
  const queue = [...refs];
  async function worker() {
    while(queue.length) {
      const source = queue.shift(), file = path.join(root, source);
      if(!fs.existsSync(file)) continue;
      const hash = crypto.createHash('sha256').update(VERSION).update(fs.readFileSync(file)).digest('hex').slice(0,20);
      if (cache[hash] && cache[hash].variants.every(v=>fs.existsSync(path.join(root,v.src)))) { images[source]={...cache[hash],original:source};cached++;continue; }
      const meta = await sharp(file,{limitInputPixels:200000000}).metadata();
      const swapped = meta.orientation >= 5 && meta.orientation <= 8;
      const width = swapped ? meta.height : meta.width, height = swapped ? meta.width : meta.height;
      const item = {width,height,original:source,variants:[]};
      // Small originals and animations retain their original encoding and animation.
      if (fs.statSync(file).size < 80000 && width <= 1200 || meta.pages > 1) {
        item.variants.push({src:source,width,height,bytes:fs.statSync(file).size});
      } else {
        const widths = [...new Set([600,1200,2000,2800].map(w=>Math.min(w,width)))];
        for (const w of widths) {
          const dest = `generated/images/${hash}-${w}.webp`;
          const result = await sharp(file,{limitInputPixels:200000000}).rotate().resize({width:w,withoutEnlargement:true}).webp({quality:90,alphaQuality:100,effort:4}).toFile(path.join(root,dest));
          item.variants.push({src:dest,width:result.width,height:result.height,bytes:result.size});
        }
      }
      images[source]=item;cache[hash]=item;processed++;
    }
  }
  await Promise.all([worker(),worker()]);
  for(const [source,item] of Object.entries(images)) {
    if(!/\.gif$/i.test(source)||fs.statSync(path.join(root,source)).size<80000)continue;
    const meta=await sharp(path.join(root,source)).metadata();
    if(!(meta.pages>1))continue;
    const hash=crypto.createHash('sha256').update(VERSION).update(fs.readFileSync(path.join(root,source))).digest('hex').slice(0,20);
    const poster=`generated/images/${hash}-poster.webp`;
    if(!fs.existsSync(path.join(root,poster)))await sharp(path.join(root,source)).resize({width:Math.min(1200,item.width),withoutEnlargement:true}).webp({quality:90}).toFile(path.join(root,poster));
    const dimensions=await sharp(path.join(root,poster)).metadata();
    item.animated=true;item.poster={src:poster,width:dimensions.width,height:dimensions.height,bytes:fs.statSync(path.join(root,poster)).size};
  }
  fs.writeFileSync(cacheFile,JSON.stringify(cache));
  console.log(`Images: ${processed} processed, ${cached} reused`);
  return images;
}
function displayVariant(item, width=1200) { return item.variants.find(v=>v.width>=width)||item.variants.at(-1); }
module.exports={buildImages,displayVariant};
