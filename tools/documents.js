const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {markdownReferences}=require('./markdown');
const {isPdf,localPath}=require('../js/pdf');
const version=require('pdfjs-dist/package.json').version;

// Read page boxes only; never rasterize PDFs or put them in the image pipeline.
async function buildDocuments(root,manifest){
  const output=path.join(root,'generated/documents');
  const cacheFile=path.join(output,'cache.json');
  const cache=fs.existsSync(cacheFile)?JSON.parse(fs.readFileSync(cacheFile,'utf8')):{};
  const used=new Set(),expected=new Set();
  let pdfjs;
  for(const page of manifest.pages){
    const refs=markdownReferences(page.body).images.map(image=>image.href).filter(isPdf);
    if(!refs.length)continue;
    const documents={};
    for(const ref of refs){
      const source=localPath(page.assetBase,ref);
      if(!source||!fs.existsSync(path.join(root,source)))continue; // check reports the author/source.
      const bytes=fs.readFileSync(path.join(root,source));
      const hash=crypto.createHash('sha256').update(version).update(bytes).digest('hex');
      used.add(hash);
      if(!cache[hash]){
        pdfjs ||= await import('pdfjs-dist/legacy/build/pdf.mjs');
        const task=pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,verbosity:0});
        try{
          const doc=await task.promise,pages=[];
          for(let n=1;n<=doc.numPages;n++){
            const pdfPage=await doc.getPage(n),{width,height}=pdfPage.getViewport({scale:1});
            pages.push([width,height]);pdfPage.cleanup();
          }
          cache[hash]={pages};
        }catch(error){
          // An unreadable preview must not prevent the rest of the site building.
          cache[hash]={error:error.name||'InvalidPDF'};
          console.warn(`${page.authorSource}: PDF preview metadata unavailable: ${ref} (${error.message})`);
        }finally{await task.destroy();}
      }
      documents[source]=cache[hash];
    }
    fs.mkdirSync(output,{recursive:true});
    const filename=`${page.id}.json`;expected.add(filename);
    fs.writeFileSync(path.join(output,filename),JSON.stringify(documents));
    page.documents=`generated/documents/${filename}`;
  }
  if(fs.existsSync(output)){
    for(const filename of fs.readdirSync(output))if(filename.endsWith('.json')&&filename!=='cache.json'&&!expected.has(filename))fs.unlinkSync(path.join(output,filename));
    fs.writeFileSync(cacheFile,JSON.stringify(Object.fromEntries([...used].map(hash=>[hash,cache[hash]]))));
  }
}
function copyPdfRuntime(vendor){
  const source=path.dirname(require.resolve('pdfjs-dist/package.json'));
  const output=path.join(vendor,'pdfjs');fs.mkdirSync(output,{recursive:true});
  for(const name of ['pdf.min.mjs','pdf.worker.min.mjs'])fs.copyFileSync(path.join(source,'build',name),path.join(output,name));
  fs.copyFileSync(path.join(source,'web/pdf_viewer.css'),path.join(output,'pdf_viewer.css'));
  fs.copyFileSync(path.join(source,'LICENSE'),path.join(output,'LICENSE'));
  for(const folder of ['cmaps','standard_fonts','wasm','iccs']){
    fs.cpSync(path.join(source,folder),path.join(output,folder),{recursive:true});
  }
}
module.exports={buildDocuments,copyPdfRuntime};
