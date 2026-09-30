const {marked}=require('marked');
marked.use({extensions:[require('../js/wiki').extension()]});
// Use the same Markdown parser as the renderer, including reference images and titles.
function markdownReferences(body) {
  const images=[],links=[],semanticLinks=[];
  marked.walkTokens(marked.lexer(body),token=>{
    if(token.type==='semanticLink')semanticLinks.push(token);
    if(token.type==='image')images.push({href:token.href,alt:token.text});
    if(token.type==='link')links.push(token.href);
  });
  return {images,links,semanticLinks};
}
module.exports={markdownReferences};
