// Renders film/index.html. Stills: node render.cjs --still=1,7,15  |  Frames: node render.cjs --from=0 --to=300 --out=DIR
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const arg=k=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:null};
const PORT=process.env.PORT||8770,FPS=30;
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>m.type()==='error'&&console.log('CERR',m.text()));
 await p.goto(`http://localhost:${PORT}/jdc-cengkareng/film/index.html`);await p.waitForFunction('window.READY',{timeout:180000});
 const still=arg('still');
 if(still){const out=arg('out')||'.';fs.mkdirSync(out,{recursive:true});for(const t of still.split(',')){await p.evaluate(t=>window.seek(+t),t);const f=path.join(out,`still_${t}.png`);await p.screenshot({path:f});console.log(f)}}
 else{const from=+arg('from'),to=+arg('to'),out=arg('out');fs.mkdirSync(out,{recursive:true});
  for(let f=from;f<to;f++){await p.evaluate(t=>window.seek(t),f/FPS);await p.screenshot({path:path.join(out,String(f).padStart(5,'0')+'.jpg'),type:'jpeg',quality:94});if(f%60===0)console.log('frame',f)}}
 await b.close()})();
