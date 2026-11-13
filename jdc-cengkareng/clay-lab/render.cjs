// Renders clay assets from factory.html to PNG. Usage: node render.cjs [CODE ...]  (serve this folder on :8765 first)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const NAMES={A01:'box-closed',A02:'box-open',A03:'box-inside-pov',A04:'tape-dispenser',A05:'tape-roll-red',A06:'label-printer',A07:'conveyor-u',A08:'scanner-gate',
A09:'diorama-home',A10:'diorama-office',A11:'diorama-onthego',A12:'phone',A13:'time-tag',A14:'price-tag',A15:'promo-sticker',A16:'form-panel',A17:'shredder',
A18:'chat-bubble',A19:'dieline-flat',A20:'check-stamp',A21:'airport-diorama',A22:'cargo-plane',A23:'map-pin',A24:'shipping-label-blank',
I01:'icon-anywhere',I02:'icon-anytime',I03:'icon-rate',I04:'icon-noform',I05:'icon-location',I06:'icon-chat',N01:'num-01',N02:'num-02',N03:'num-03',D01:'mini-parcels',D02:'tape-curl'};
const SIZE={A03:[1024,1536],A07:[1536,1024],A21:[1536,1024],D01:[1536,1024],D02:[1536,1024]};
const OUT=path.resolve(__dirname,'../../inbox/jdc');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8765/factory.html');await p.waitForFunction('window.READY');
const codes=process.argv.slice(2).length?process.argv.slice(2):Object.keys(NAMES);
for(const c of codes){const [w,h]=SIZE[c]||[1024,1024];try{const d=await p.evaluate(([c,w,h])=>window.renderAsset(c,w,h),[c,w,h]);
 const f=path.join(OUT,`jdc_${c}_${NAMES[c]}.png`);fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64'));console.log('ok',c)}catch(e){console.log('FAIL',c,e.message.split('\n')[0])}}
await b.close()})();
