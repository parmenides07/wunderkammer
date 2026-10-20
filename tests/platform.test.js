const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../js/platform.js'),'utf8');
function detected(navigator){
  const classes=new Set();
  vm.runInNewContext(source,{navigator,document:{documentElement:{classList:{add:name=>classes.add(name)}}}});
  return classes.has('platform-macos');
}
test('macOS detection works without browser-specific checks or client hints',()=>{
  for(const browser of ['Version/18 Safari/605','Chrome/140 Safari/537','Firefox/140']){
    assert.equal(detected({platform:'MacIntel',maxTouchPoints:0,userAgent:`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${browser}`}),true);
  }
  assert.equal(detected({userAgentData:{platform:'macOS',mobile:false},userAgent:'',maxTouchPoints:0}),true);
});
test('iPhones and iPads keep mobile typography, including desktop-identifying iPads',()=>{
  for(const navigator of [
    {platform:'iPhone',userAgent:'iPhone; CPU iPhone OS like Mac OS X',maxTouchPoints:5},
    {platform:'iPad',userAgent:'iPad; CPU OS like Mac OS X',maxTouchPoints:5},
    {platform:'MacIntel',userAgent:'Macintosh; Intel Mac OS X 10_15 Version/18 Safari/605',maxTouchPoints:5},
    {platform:'MacIntel',userAgent:'Macintosh Mobile/15 Safari/605',maxTouchPoints:0},
    {userAgentData:{platform:'macOS',mobile:true},userAgent:'',maxTouchPoints:0}
  ])assert.equal(detected(navigator),false);
});
test('Linux, Windows, Android and unavailable platform signals keep their original styles',()=>{
  for(const platform of ['Linux x86_64','Win32','iPhone','']){
    assert.equal(detected({platform,maxTouchPoints:0,userAgent:''}),false);
  }
  assert.equal(detected({platform:'MacIntel',userAgentData:{platform:'Windows',mobile:false},userAgent:'',maxTouchPoints:0}),false);
  assert.equal(detected({platform:'Linux armv8l',userAgentData:{platform:'Android',mobile:true},userAgent:'Mobile',maxTouchPoints:5}),false);
  assert.equal(detected({}),false);
});
test('shared shell runs platform detection synchronously before stylesheets',()=>{
  const shell=fs.readFileSync(require.resolve('../site.shell.html'),'utf8');
  const script='<script src="js/platform.js"></script>';
  assert.ok(shell.includes(script));
  assert.ok(shell.indexOf(script)<shell.indexOf('rel="stylesheet"'));
});
