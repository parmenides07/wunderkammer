const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
const chokidar=require('chokidar');
const root=path.resolve(__dirname,'..'),clients=new Set();
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.md':'text/plain','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.woff2':'font/woff2','.csv':'text/csv','.mp4':'video/mp4'};
const reload=`<script>const events=new EventSource('/__events');events.onmessage=e=>{const data=JSON.parse(e.data);if(data.reload)location.reload();else if(data.error){let box=document.getElementById('dev-error');if(!box){box=document.createElement('pre');box.id='dev-error';box.style='position:fixed;inset:auto 1rem 1rem;z-index:99999;padding:1rem;background:#fff0d9;color:#782e27;white-space:pre-wrap;max-height:40vh;overflow:auto';document.body.appendChild(box);}box.textContent=data.error;}};</script>`;
function broadcast(data){for(const client of clients)client.write(`data: ${JSON.stringify(data)}\n\n`);}
let running=false,dirty=false,timer;
function rebuild() {
 if(running){dirty=true;return Promise.resolve();}running=true;
 return new Promise(resolve=>{
  let error='';const child=spawn(process.execPath,['build.js'],{cwd:root});child.stdout.pipe(process.stdout);child.stderr.on('data',data=>{error+=data;process.stderr.write(data);});
  child.on('close',code=>{running=false;broadcast(code?{error:error||'Build failed; see terminal.'}:{reload:true});resolve(code);if(dirty){dirty=false;rebuild();}});
 });
}
async function start() {
 if(await rebuild())throw new Error('Initial build failed. Fix the reported error and rerun npm run dev.');
 const server=http.createServer((req,res)=>{
  if(req.url==='/__events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(': connected\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  if(pathname.split('/').some(part=>part.startsWith('.')||part==='node_modules')){res.writeHead(403);res.end();return;}
  let file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
  try {
   if(fs.statSync(file).isDirectory()){if(!pathname.endsWith('/')){res.writeHead(302,{Location:pathname+'/'});res.end();return;}file=path.join(file,'index.html');}
   if(!fs.realpathSync(file).startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   const ext=path.extname(file),stat=fs.statSync(file),etag=`"${stat.size}-${stat.mtimeMs}"`;
   const headers={'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-cache',ETag:etag};
   if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return;}
   if(ext==='.html'){res.writeHead(200,headers);res.end(fs.readFileSync(file,'utf8').replace('</body>',reload+'</body>'));return;}
   res.writeHead(200,headers);fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('File not found');}
 });
 const port=Number(process.env.PORT||5173);server.on('error',e=>{console.error(e.message);process.exitCode=1;watcher.close();});
 const watcher=chokidar.watch(['content','assets','site.shell.html','style.css','script.js','js','site.config.json','legacy-routes.json','build.js','tools/images.js','tools/markdown.js'].map(p=>path.join(root,p)),{ignored:p=>/(^|[/\\])\.[^/\\]/.test(path.relative(root,p)),ignoreInitial:true,awaitWriteFinish:{stabilityThreshold:150,pollInterval:50}});
 watcher.on('all',()=>{clearTimeout(timer);timer=setTimeout(rebuild,150);});
 server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}/ — watching content and application files`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{watcher.close();for(const client of clients)client.end();server.close();});
}
start().catch(e=>{console.error(e.message);process.exitCode=1;});
