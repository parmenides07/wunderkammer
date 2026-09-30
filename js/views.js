/* Entry views share one filtered semantic model and one application shell. */
(function(root){
  function audience(pathname){return /\/personal(?:\/(?:index\.html)?)?$/.test(pathname)?'public':'professional';}
  function personalFallback(manifest,route){
    const slug=manifest.aliases[route]||route;
    const page=manifest.pages.find(page=>page.slug===slug&&page.published&&page.audience.includes('public'));
    return page&&!page.audience.includes('professional')?page.slug:null;
  }
  function routeHref(pathname,search,route){return `${pathname}${search}#/${route}`;}
  const api={audience,personalFallback,routeHref};
  if(typeof module!=='undefined')module.exports=api;else root.SiteViews=api;
})(globalThis);
