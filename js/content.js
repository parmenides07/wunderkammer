/* Select the editorial variant and curate the page universe before navigation. */
(function (root) {
  const comparePages = (a, b) => (a.order??100) - (b.order??100) || (a.title||a.slug).localeCompare(b.title||b.slug) || a.id.localeCompare(b.id);
  function validateRoutes(pages){
    const slugs=new Map(),groups=new Map();
    for(const page of pages){
      const source=page.authorSource||page.id;
      if(page.variant!==undefined&&!['professional','personal'].includes(page.variant))throw new Error(`${source}: invalid variant`);
      if(page.variantGroup!==undefined&&!/^[a-z0-9][a-z0-9-]*$/.test(page.variantGroup))throw new Error(`${source}: invalid variantGroup`);
      if(page.variant&&!page.variantGroup)throw new Error(`${source}: variant requires variantGroup`);
      if(page.variant&&!(page.audience.length===1&&page.audience[0]===(page.variant==='personal'?'public':'professional')))throw new Error(`${source}: variant audience must match its view`);
      if(page.variantGroup){if(groups.has(page.variantGroup)&&groups.get(page.variantGroup)!==page.slug)throw new Error(`${source}: variantGroup must use one logical slug`);groups.set(page.variantGroup,page.slug);}
      const siblings=slugs.get(page.slug)||[];siblings.push(page);slugs.set(page.slug,siblings);
    }
    for(const [slug,siblings] of slugs){
      if(siblings.length<2)continue;
      const group=siblings[0].variantGroup;
      if(!group||siblings.some(p=>p.variantGroup!==group)||!siblings.some(p=>p.variant))throw new Error(`${siblings.at(-1).authorSource||siblings.at(-1).id}: duplicate slug "${slug}" (also in ${siblings[0].authorSource||siblings[0].id}): all sources must explicitly share a variantGroup (${siblings.map(p=>p.authorSource||p.id).join(', ')})`);
      for(const mode of ['public','professional']){
        const eligible=siblings.filter(p=>p.audience.includes(mode));
        if(eligible.filter(p=>p.variant).length>1||eligible.filter(p=>!p.variant).length>1)throw new Error(`duplicate slug "${slug}": ambiguous ${mode} variants/fallbacks (${eligible.map(p=>p.authorSource||p.id).join(', ')})`);
      }
    }
  }
  function createContentModel(manifest, audience, config={}) {
    const selected=new Map();
    for(const page of manifest.pages.filter(page=>page.published&&page.audience.includes(audience))){
      const previous=selected.get(page.slug);
      if(!previous||page.variant)selected.set(page.slug,page);
    }
    const policy=audience==='professional'?config.views?.root:null;
    const pages=[...selected.values()].filter(page=>(!policy?.navigation||policy.navigation.includes(page.section))&&
      (page.section!=='projects'||!policy?.projects||policy.projects.includes(page.project))).sort(comparePages);
    const bySlug = new Map(pages.map(page => [page.slug, page]));
    const byId = new Map(pages.map(page => [page.id, page]));
    return {pages,bySlug,byId,resolve(route){return bySlug.get(manifest.aliases[route]||route);},topic(topic){return pages.filter(page=>page.topics.includes(topic));},assets:manifest.assetDirectories};
  }
  const api={createContentModel,comparePages,validateRoutes};
  if(typeof module!=='undefined')module.exports=api;else root.SiteContent=api;
})(globalThis);
