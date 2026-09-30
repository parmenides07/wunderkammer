const test=require('node:test'),assert=require('node:assert/strict');
const {firstLeaf,validateContainers}=require('../js/navigation'),wiki=require('../js/wiki'),{markdownReferences}=require('../tools/markdown');
const direct={id:'direct'},nested={id:'nested'},later={id:'later'};
const child={key:'group/child',label:'Child',pages:[nested],children:[]};
test('container resolution prefers direct leaves, then ordered recursive children',()=>{const node={pages:[direct],children:[child,{pages:[later],children:[]}]};assert.equal(firstLeaf(node),direct);node.pages=[];assert.equal(firstLeaf(node),nested);node.children=[{pages:[],children:[child]},{pages:[later],children:[]}];assert.equal(firstLeaf(node),nested);});
test('dead visible containers report ID, label and view',()=>{const dead={key:'group/dead',label:'Empty Group',pages:[],children:[]};const messages=validateContainers({catalog:new Map([[dead.key,dead]])},'professional');assert.match(messages[0],/group\/dead.*Empty Group.*professional.*zero visible/);});
const models={professional:{pages:[{slug:'about',title:'Professional About'},{slug:'currents',title:'Currents'}]},public:{pages:[{slug:'about',title:'Personal About'},{slug:'notes/old',title:'Old writing'}]}};
test('canonical links and exact case aliases resolve view-specific titles',()=>{assert.equal(wiki.resolve(wiki.parse('[[About]]'),models,'professional').label,'Professional About');assert.equal(wiki.resolve(wiki.parse('[[about]]'),models,'public').label,'Personal About');assert.equal(wiki.resolve(wiki.parse('[[about|About me]]'),models,'public').label,'About me');});
test('personal escape hatch is explicit; unavailable links fail clearly',()=>{assert.match(wiki.resolve(wiki.parse('[[notes/old]]'),models,'professional').error,/unavailable/);assert.equal(wiki.resolve(wiki.parse('[[personal:notes/old|History]]'),models,'professional').label,'History');assert.match(wiki.resolve(wiki.parse('[[personal:missing]]'),models,'professional').error,/invalid explicit/);assert.match(wiki.resolve(wiki.parse('[[missing]]'),models,'public').error,/does not exist/);});
test('malformed and ambiguous links fail',()=>{for(const raw of ['[[about','[[]]','[[about|]]','[[about|a|b]]','[[https://example.test]]','[[a//b]]'])assert.ok(wiki.parse(raw).error,raw);const bad={public:{pages:[{slug:'about'},{slug:'about'}]}};assert.match(wiki.resolve(wiki.parse('[[about]]'),bad,'public').error,/ambiguous/);});
test('Markdown tokenizer preserves code, detects malformed prose and finds formatted links',()=>{const refs=markdownReferences('**[[About]]** `[[not-a-link]]`\n\n```md\n[[not-a-link]]\n```\n\n[[currents|Now]]\n[[unclosed\n');assert.equal(refs.semanticLinks.length,3);assert.equal(refs.semanticLinks[0].route,'about');assert.equal(refs.semanticLinks[1].label,'Now');assert.match(refs.semanticLinks[2].error,/unclosed/);});

test('check diagnostics include source, authored link and unavailable view',()=>{
 const source={id:'home-pro',authorSource:'content/home/professional.md'};
 const viewModels={professional:{...models.professional,byId:new Map([[source.id,source]])},public:{...models.public,byId:new Map()}};
 const errors=require('../tools/check').checkSemanticLinks(source,markdownReferences('[[notes/old|Old]] [[missing]] [[broken').semanticLinks,viewModels);
 assert.equal(errors.length,3);assert.match(errors[0],/content\/home\/professional.md: \[\[notes\/old\|Old\]\]: professional: target unavailable/);assert.match(errors[1],/does not exist/);assert.match(errors[2],/unclosed/);
});
