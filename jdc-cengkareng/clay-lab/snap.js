const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1600,height:900}});
p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>m.type()==='error'&&console.log('CERR',m.text()));
await p.goto('http://localhost:8765/index.html');await p.waitForFunction('window.DONE',{timeout:120000});
await p.locator('canvas').screenshot({path:'clay-test.png',omitBackground:true});await b.close()})();
