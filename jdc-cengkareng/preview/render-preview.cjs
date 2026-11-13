// Renders preview/<name>.html to an MP4. Usage: node render-preview.cjs b3 [seconds] [fps] [--still t1,t2]
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const [name='b3',secs='5',fps='30']=process.argv.slice(2).filter(a=>!a.startsWith('--'));const stillArg=process.argv.find(a=>a.startsWith('--still='));
const OUT=process.env.FRAMES||path.join(require('os').tmpdir(),'jdc-frames-'+name);fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>m.type()==='error'&&console.log('CERR',m.text()));
await p.goto(`http://localhost:${process.env.PORT||8770}/jdc-cengkareng/preview/${name}.html`);await p.waitForFunction('window.READY',{timeout:120000});
if(stillArg){for(const t of stillArg.slice(8).split(',')){await p.evaluate(t=>window.seek(+t),t);await p.screenshot({path:path.join(OUT,`still_${t}.png`)});console.log(path.join(OUT,`still_${t}.png`))}await b.close();return}
const N=Math.round(+secs*+fps);for(let f=0;f<N;f++){await p.evaluate(t=>window.seek(t),f/ +fps);await p.screenshot({path:path.join(OUT,String(f).padStart(4,'0')+'.jpg'),type:'jpeg',quality:95});if(f%30===0)console.log('frame',f)}
await b.close();const mp4=path.join(__dirname,`${name}-preview.mp4`);
execFileSync('ffmpeg',['-v','error','-y','-framerate',fps,'-i',path.join(OUT,'%04d.jpg'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-movflags','+faststart',mp4]);console.log('wrote',mp4)})();
