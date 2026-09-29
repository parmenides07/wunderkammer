(function (root) {
  function createNavigation(model, config, audience, validateRoots=false) {
    const titleCase = value => value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const catalog=new Map(),pageGroups=new Map();
    const add=(key,label,parent=null,order=100)=>{
      if(catalog.has(key))throw new Error(`site.config.json: duplicate container "${key}"`);
      const node={key,label,parent,order,pages:[],allPages:[],children:[]};catalog.set(key,node);return node;
    };
    const definitions=config.groups||[];
    if(!Array.isArray(definitions)||definitions.some(def=>!def||typeof def!=='object'))throw new Error('site.config.json: groups must be an array of group definitions');
    const sections=config.sections.map((section,i)=>{
      const node=add(section.id,audience==='professional'?section.professionalLabel||section.label:section.label,null,i);
      const field=section.id==='projects'?'project':'collection';
      const settings=(field==='project'?config.projects:config.collections)||[];
      const ids=new Set(model.pages.filter(p=>p.section===section.id).map(p=>p[field]).filter(Boolean));
      // Configuration can define a project containing only nested pages. No folder inspection.
      for(const def of definitions)if(typeof def.parent==='string'&&def.parent.startsWith(section.id+'/')){
        const id=def.parent.slice(section.id.length+1);
        if(validateRoots&&(!/^[a-z0-9][a-z0-9-]*$/.test(id)||(!ids.has(id)&&!settings.some(item=>item.id===id))))throw new Error(`site.config.json: unknown parent container "${def.parent}"`);
        ids.add(id);
      }
      for(const id of ids){
        const item=settings.find(s=>s.id===id),rank=settings.findIndex(s=>s.id===id);
        add(`${section.id}/${id}`,item?.label||titleCase(id),node.key,rank<0?settings.length:rank);
      }
      return node;
    });
    for(const def of definitions){
      if(!/^[a-z0-9][a-z0-9-]*$/.test(def.id||'')||typeof def.label!=='string'||!def.label.trim()||typeof def.parent!=='string'||!def.parent)throw new Error('site.config.json: each group needs an id, label and parent');
      if(def.order!==undefined&&!Number.isFinite(def.order))throw new Error(`site.config.json: invalid order for group "${def.id}"`);
      add(`group/${def.id}`,def.label,def.parent.includes('/')?def.parent:`group/${def.parent}`,def.order??100);
    }
    for(const node of catalog.values()){
      if(node.parent){const parent=catalog.get(node.parent);if(!parent)throw new Error(`site.config.json: unknown parent "${node.parent}" for "${node.key}"`);parent.children.push(node);}
      const seen=new Set();let current=node;
      while(current){if(seen.has(current.key))throw new Error(`site.config.json: group cycle at "${current.key}"`);seen.add(current.key);current=catalog.get(current.parent);}
    }
    for(const page of model.pages){
      const field=page.section==='projects'?'project':'collection';
      const base=page[field]?`${page.section}/${page[field]}`:page.section;
      const node=catalog.get(page.parent?`group/${page.parent}`:base);
      if(!node)throw new Error(`${page.authorSource||page.id}: unknown parent group "${page.parent}"`);
      if(page.parent){let ancestor=node;while(ancestor&&ancestor.key!==base)ancestor=catalog.get(ancestor.parent);if(!ancestor)throw new Error(`${page.authorSource||page.id}: parent group is outside ${base}`);}
      node.pages.push(page);pageGroups.set(page.id,node);
    }
    function collect(node){
      node.children.sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label));
      node.children=node.children.filter(child=>collect(child).length);
      node.allPages=[...node.pages,...node.children.flatMap(child=>child.allPages)];
      if(!node.allPages.length)catalog.delete(node.key);
      return node.allPages;
    }
    return {sections:sections.filter(section=>collect(section).length),catalog,pageGroups};
  }
  function activePath(navigation,node){
    const path=[];
    while(node){if(node.children.length)path.unshift(node.key);node=navigation.catalog.get(node.parent);}
    return path;
  }
  function indexEntries(page,navigation){
    return (navigation.pageGroups.get(page.id)?.pages||[]).filter(p=>p.id!==page.id)
      .slice().sort((a,b)=>b.created.localeCompare(a.created)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
  }
  function receiptSelection(previous,container,page){
    const directLeafPages=container.pages;
    const receiptEligible=directLeafPages.length>=2;
    return {selectedContainerId:container.key,activePageId:page?.id||null,directLeafPages,receiptEligible,
      receiptTucked:previous.selectedContainerId===container.key?(!receiptEligible||previous.receiptTucked):!receiptEligible};
  }
  const api={createNavigation,activePath,indexEntries,receiptSelection};
  if(typeof module!=='undefined')module.exports=api;else root.SiteNavigation=api;
})(globalThis);
