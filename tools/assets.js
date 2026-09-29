const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const matter=require('gray-matter');const {markdownReferences}=require('./markdown');
const slash=s=>s.split(path.sep).join('/');
function auditAssets(root){
 const files=[],texts=[];
 function walk(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.name.startsWith('.'))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile()){const relative=slash(path.relative(root,file));if(!/\.md$/i.test(file))files.push(relative);if(/\.(md|html|css|js|json)$/i.test(file))texts.push(relative);}}}
 walk(path.join(root,'assets'));walk(path.join(root,'content'));
 for(const file of ['site.shell.html','style.css','script.js','site.config.json'])if(fs.existsSync(path.join(root,file)))texts.push(file);
 function sourceScripts(dir){if(!fs.existsSync(dir))return;for(const name of fs.readdirSync(dir))if(name.endsWith('.js'))texts.push(slash(path.relative(root,path.join(dir,name))));}
 sourceScripts(path.join(root,'js'));
 const inventory=new Set(files),used=new Set(),warnings=[],sizes=new Map();
 function reference(from,ref,gallery=false){
  if(!ref||/^(?:[a-z]+:|#|\/\/)/i.test(ref))return;
  let clean;try{clean=decodeURIComponent(ref.split(/[?#]/)[0]);}catch{return;}
  const source=slash(path.normalize(clean.startsWith('/')?clean.slice(1):path.join(path.dirname(from),clean)));
  if(inventory.has(source))used.add(source);
  if(gallery)for(const file of files)if(file.startsWith(source.replace(/\/$/,'')+'/')&&/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(file))used.add(file);
 }
 for(const file of texts){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  if(file.endsWith('.md')){
   let parsed;try{parsed=matter(text);}catch{continue;}
   for(const ref of [parsed.data.banner,parsed.data.sound])reference(file,ref);
   const refs=markdownReferences(parsed.content);
   for(const image of refs.images){reference(file,image.href);if(image.alt.startsWith('sound:'))reference(file,image.alt.slice(6));}
   for(const ref of refs.links)reference(file,ref);
   for(const m of parsed.content.matchAll(/(images|embed)\{([^}]+)\}/g))reference(file,m[2].split(',')[0].trim(),m[1]==='images');
  }
  for(const m of text.matchAll(/(?:src|href|poster|data-src)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)|["'`]([^"'`\n]+\.[a-z0-9]{2,5}(?:#[^"'`\n]*)?)["'`]/gi))reference(file,m[1]||m[2]||m[3]);
 }
 for(const file of files){
  if(/(?:~|\.bak|\.orig|\.sw[op])$/i.test(file)||/(?:^|\/)#[^/]+#$/.test(file))warnings.push(`${file}: possible editor backup (report only)`);
  if(!used.has(file))warnings.push(`${file}: possibly unreferenced asset (static reference scan; review dynamic uses)`);
  const size=fs.statSync(path.join(root,file)).size;if(!sizes.has(size))sizes.set(size,[]);sizes.get(size).push(file);
 }
 for(const candidates of sizes.values())if(candidates.length>1){
  const hashes=new Map();for(const file of candidates){const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');if(!hashes.has(hash))hashes.set(hash,[]);hashes.get(hash).push(file);}
  for(const duplicates of hashes.values())if(duplicates.length>1)warnings.push(`Exact duplicate assets: ${duplicates.join(' = ')}`);
 }
 return warnings;
}
module.exports={auditAssets};
