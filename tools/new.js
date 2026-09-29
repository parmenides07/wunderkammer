const fs=require('node:fs');
const path=require('node:path');
const matter=require('gray-matter');
const {buildManifest}=require('../build');
function scaffold(root,options) {
 const type=options.type||'note',title=options.title?.trim();
 const sections={home:'home',project:'projects','project-note':'projects',note:'notes',essay:'notes',log:'notes',collection:'notes',archive:'archive',about:'about'};
 if(!sections[type])throw new Error(`Unknown type: ${type}`);
 if(!title)throw new Error('A title is required (--title "Your title").');
 const name=title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 if(!name)throw new Error('Please include an ASCII title or use an ASCII title and edit it afterward.');
 const section=sections[type];
 const group=options.collection||options.project;
 if(group&&!/^[a-z0-9][a-z0-9-]*$/.test(group))throw new Error('Collection/project must be a lowercase hyphenated identifier.');
 if(type==='project-note'&&!options.project)throw new Error('A project note needs --project <existing-project-id>.');
 const slug=type==='project'?`projects/${name}`:[section,group,name].filter(Boolean).join('/');
 const id=slug.replaceAll('/','-');
 const manifest=buildManifest(root);
 if(manifest.pages.some(p=>p.id===id||p.slug===slug))throw new Error(`A page already uses ${id} or ${slug}.`);
 const folder=type==='project'?`content/projects/${name}`:[`content/${section}`,group].filter(Boolean).join('/');
 const dest=path.join(root,folder,type==='project'?'index.md':`${name}.md`);
 if(fs.existsSync(dest))throw new Error(`Already exists: ${dest}`);
 const data={id,title,slug,section,type,topics:[],audience:['public'],status:'wip',published:true,created:new Date().toISOString().slice(0,10)};
 if(type==='project')data.project=name;else if(options.project)data.project=options.project;else if(options.collection)data.collection=options.collection;
 fs.mkdirSync(path.join(root,folder,'assets'),{recursive:true});
 fs.writeFileSync(dest,matter.stringify('\n',data),{flag:'wx'});
 return dest;
}
async function main() {
 const options={};const args=process.argv.slice(2);
 for(let i=0;i<args.length;i++){if(!['--type','--title','--collection','--project'].includes(args[i])||!args[i+1])throw new Error('Usage: npm run new -- --type note --title "A title" [--collection mindfill]');options[args[i].slice(2)]=args[++i];}
 if(!options.title && process.stdin.isTTY){const rl=require('node:readline/promises').createInterface({input:process.stdin,output:process.stdout});options.title=await rl.question('Title: ');rl.close();}
 console.log(`Created ${scaffold(path.resolve(__dirname,'..'),options)}\nPublic audience only. Edit the page, then preview with npm run dev.`);
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={scaffold};
