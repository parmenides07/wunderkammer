const {marked}=require('marked');
// Use the same Markdown parser as the renderer, including reference images and titles.
function markdownReferences(body) {
  const images=[],links=[];
  marked.walkTokens(marked.lexer(body),token=>{
    if(token.type==='image')images.push({href:token.href,alt:token.text});
    if(token.type==='link')links.push(token.href);
  });
  return {images,links};
}
module.exports={markdownReferences};
