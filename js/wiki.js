/* Small inline Markdown extension; code spans/fences remain the parser's responsibility. */
(function(root){
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function parse(raw){
    if(!raw.endsWith(']]'))return {error:'unclosed semantic link'};
    const parts=raw.slice(2,-2).split('|'),target=parts[0].trim();
    if(parts.length>2||!target||(parts.length===2&&!parts[1].trim()))return {error:'expected [[route|label]] or [[route]]'};
    const personal=target.startsWith('personal:'),route=(personal?target.slice(9):target).toLowerCase();
    if(!/^[a-z0-9]+(?:[a-z0-9/-]*[a-z0-9])?$/.test(route)||route.includes('//'))return {error:'invalid logical route'};
    return {route,personal,label:parts[1]?.trim()};
  }
  function resolve(token,models,audience){
    if(token.error)return {error:token.error};
    const mode=token.personal?'public':audience,model=models[mode];
    const candidates=model.pages.filter(page=>page.slug===token.route);
    if(candidates.length>1)return {error:`ambiguous route in ${mode}`};
    const page=candidates[0];
    if(!page){const exists=Object.values(models).some(m=>m.pages.some(p=>p.slug===token.route));return {error:token.personal?'invalid explicit personal target':exists?`target unavailable in ${mode}; use personal: for an intentional personal link`:'target route does not exist'};}
    return {page,label:token.label||page.title};
  }
  function extension(render){return {name:'semanticLink',level:'inline',start:src=>src.indexOf('[['),tokenizer(src){
    if(!src.startsWith('[['))return;
    const raw=src.match(/^\[\[[^\n]*?\]\]/)?.[0]||src.match(/^[^\n]+/)[0];
    return {type:'semanticLink',raw,...parse(raw)};
  },renderer:render||((token)=>escape(token.raw))};}
  const api={parse,resolve,extension,escape};
  if(typeof module!=='undefined')module.exports=api;else root.SiteWiki=api;
})(globalThis);
