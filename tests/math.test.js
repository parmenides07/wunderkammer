const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const matter=require('gray-matter');
const {marked,Marked}=require('marked');
const {markdownReferences}=require('../tools/markdown');

test('Vivarium renders every authored inline and display equation without changing its LaTeX',()=>{
  const body=matter(fs.readFileSync(path.join(__dirname,'../content/projects/vivarium/index.md'),'utf8')).content;
  const tokens=[];
  marked.walkTokens(marked.lexer(body),token=>{if(/Katex$/.test(token.type))tokens.push(token);});
  assert.equal(tokens.filter(t=>t.type==='inlineKatex').length,18);
  assert.equal(tokens.filter(t=>t.type==='blockKatex').length,5);
  const html=marked.parse(body);
  assert.doesNotMatch(html,/katex-error/);
  assert.equal((html.match(/class="katex"/g)||[]).length,23);
  for(const token of tokens)assert.ok(html.includes(`<annotation encoding="application/x-tex">${token.text}</annotation>`),token.text);
  assert.match(html,/<strong>A\*<\/strong>/);
});

test('standard LaTeX and adjacent inline delimiters survive Markdown parsing',()=>{
  const html=marked.parse(String.raw`Inline ($n_i$), **$\alpha$** and $\frac{1}{2}$.

$$
\begin{aligned}
f(n) &= g(n)+h(n) \\
h(n) &= \min_{q\in Q}\sum_{i=1}^{N}\frac{\alpha_i}{i^2}
\end{aligned}
$$

$$x_{t+1}=x_t+\xi_t$$
`);
  assert.doesNotMatch(html,/katex-error/);
  assert.equal((html.match(/class="katex-display"/g)||[]).length,2);
  for(const element of ['mfrac','msub','mtable','munderover'])assert.ok(html.includes(`<${element}`),element);
  assert.match(html,/<strong><span class="katex">/);
});

test('literal dollars, code, ordinary Markdown, and media remain unchanged',()=>{
  const body='A $50000 fine. Escaped \\$n\\$.\n\n`$n_i$`\n\n```latex\n$$\n\\frac{1}{2}\n$$\n```\n\n**Bold**, *italic*, [link](#/home).\n\n![Image][photo]\n\n[photo]: assets/image.png "Caption"\n\n![Movie](assets/demo.mp4)\n\n![PDF](assets/paper.pdf)\n';
  assert.equal(marked.parse(body),new Marked().parse(body));
});

test('math is opaque to semantic-link and media discovery',()=>{
  const refs=markdownReferences(String.raw`$\text{[[not-a-route]] ![not an image](missing.png)}$

$$
\text{[not a link](missing.md)}
$$

[[home]] [Read](#/about) ![Image](assets/image.png "Caption")
`);
  assert.deepEqual(refs.images,[{href:'assets/image.png',alt:'Image'}]);
  assert.deepEqual(refs.links,['#/about']);
  assert.deepEqual(refs.semanticLinks.map(t=>t.route),['home']);
});

test('an invalid formula does not prevent the rest of an article from rendering',()=>{
  const html=marked.parse(String.raw`$\frac{1}{$`+'\n\n## Still readable\n\nArticle text.');
  assert.match(html,/katex-error/);
  assert.match(html,/<h2>Still readable<\/h2>/);
  assert.match(html,/<p>Article text\.<\/p>/);
});
