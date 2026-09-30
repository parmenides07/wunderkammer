/* Entry views share one filtered semantic model and one application shell. */
(function(root){
  function audience(pathname){return /\/personal(?:\/(?:index\.html)?)?$/.test(pathname)?'public':'professional';}
  function personalFallback(manifest,route,config={}){
    const content=typeof module!=='undefined'?require('./content'):root.SiteContent;
    const personal=content.createContentModel(manifest,'public',config).resolve(route);
    return personal&&!content.createContentModel(manifest,'professional',config).resolve(route)?personal.slug:null;
  }
  function routeHref(pathname,search,route){return `${pathname}${search}#/${route}`;}
  const api={audience,personalFallback,routeHref};
  if(typeof module!=='undefined')module.exports=api;else root.SiteViews=api;
})(globalThis);
