// JDC Cengkareng film: shared renderer, scene manager, transitions, brand frame, deco and captions.
// window.seek(t) renders the frame at time t (seconds) deterministically.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makeScenes} from './scenes.js';

export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const eOut=t=>1-Math.pow(1-clamp(t),4);
export const eIn=t=>Math.pow(clamp(t),3);
export const eIO=t=>{t=clamp(t);return t<.5?8*t**4:1-Math.pow(-2*t+2,4)/2};
export const spring=(t,k=14,z=.42)=>{if(t<=0)return 0;const w=Math.sqrt(1-z*z)*k;return 1-Math.exp(-z*k*t)*(Math.cos(w*t)+z*k/w*Math.sin(w*t))};
export const prog=(t,a,b)=>clamp((t-a)/(b-a));
export const lerp=(a,b,k)=>a+(b-a)*k;
export const $=s=>document.querySelector(s);
export const el=(tag,cls,html,parent)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(parent)parent.appendChild(e);return e};

const TL=await (await fetch('timeline.json')).json();
await document.fonts.load('400 40px ArchivoBlack');await document.fonts.load('700 20px Mono');await document.fonts.load('800 20px Mono');await document.fonts.load('600 20px Jakarta');await document.fonts.load('700 20px Jakarta');await document.fonts.load('800 20px Jakarta');

/* ---------- shared WebGL renderer ---------- */
const W=1080,H=1920;
export const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.toneMapping=THREE.NeutralToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
export const envTex=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.04).texture;

// canvas texture helper (text is drawn with the page fonts, so names live inside the 3D objects)
export function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.userData={c,g,draw};return t}

/* ---------- scenes ---------- */
const host=$('#scenes');
const SC=makeScenes({THREE,envTex,canvasTex,host,el,clamp,eOut,eIn,eIO,spring,prog,lerp});
const order=TL.scenes.map(s=>({...s,...SC[s.id]}));
order.forEach(s=>{s.root.classList.add('scene');s.root.id=s.id;const cv=el('canvas','cv',null);cv.width=W;cv.height=H;s.root.prepend(cv);s.ctx=cv.getContext('2d');host.appendChild(s.root)});

/* ---------- security micro-print background (moves, so it cannot be patched with a still) ---------- */
{const g=$('#micro').getContext('2d');g.fillStyle='#6b4a00';g.font='700 15px Mono';const line='JDC CENGKARENG · SERVICE POINT · +62 877-7589-7478 · SOEWARNA BUSINESS PARK LOT 7A–7B · ';
  for(let y=0,i=0;y<2320;y+=26,i++){g.save();g.translate(0,y);g.fillText((line.repeat(6)).slice(i*7%line.length),-40,0);g.restore()}}
$('#microTxt').textContent=('JDC CENGKARENG ✦ DHL EXPRESS SERVICE POINT ✦ +62 877-7589-7478 ✦ LOT 7A–7B SOEWARNA BUSINESS PARK ✦ ').repeat(6);

/* ---------- decoration: packaging geometry, blurred by depth ---------- */
const SPR={X01:'deco-cube',X02:'deco-ring',X03:'deco-pill',X04:'deco-half',X05:'deco-dots',X06:'deco-plus',X07:'deco-tri'};
const DECO=[ // layer, sprite, size, blur, opacity, parallax, float amp, float period, phase, spin, pop
 ['back','X04',170,6,.35,.35,8,4.2,0,0,0],['back','X07',140,5,.3,.35,10,3.6,1.2,6,0],['back','X05',150,4,.38,.35,6,5,2,0,0],
 ['mid','X01',128,0,1,1,10,3.2,.4,-8,1],['mid','X06',108,0,1,1,8,3.8,2.2,10,1],
 ['front','X02',360,16,.6,1.5,16,4.6,.8,4,0],['front','X03',300,18,.5,1.5,14,5.2,2.6,-3,0]];
// per-scene anchor positions [x,y] for the 7 elements (kept clear of text, captions, header and footer)
const LAY={
 s2:[[90,620],[990,560],[110,1380],[975,1180],[120,960],[1020,1330],[20,1120]],
 s3:[[95,470],[985,540],[120,1340],[960,720],[125,730],[1010,1250],[30,1060]],
 s4:[[980,600],[110,640],[950,1380],[120,1180],[975,960],[60,1310],[1050,1120]],
 s5:[[100,560],[980,700],[960,1380],[130,1230],[960,980],[1020,1300],[20,1000]],
 s6:[[980,520],[100,600],[110,1390],[960,1230],[130,1010],[60,1330],[1040,980]],
 s7:[[90,520],[990,520],[1000,1400],[980,700],[90,1420],[1050,1060],[10,800]],
 s8:[[110,580],[970,620],[130,1400],[970,1250],[110,1150],[1020,1380],[30,1000]],
 s9:[[100,600],[980,560],[120,1390],[960,1100],[120,1040],[1030,1320],[20,1160]]};
LAY.s1=LAY.s2;
const decoEls=DECO.map(d=>{const e=el('div','deco',`<img src="../../inbox/jdc/jdc_${d[1]}_${SPR[d[1]]}.png">`,$('#'+d[0]));e.style.width=e.style.height=d[2]+'px';return e});

/* ---------- captions ---------- */
const capEl=$('#cap');
function caption(t){const c=TL.captions.find(c=>t>=c[0]-.05&&t<c[1]+.6);if(!c){capEl.innerHTML='';return}
  const words=c[2].split(' '),tot=words.reduce((a,w)=>a+w.length+1,0);let acc=0;
  const html=words.map(w=>{const a=c[0]+(c[1]-c[0])*acc/tot;acc+=w.length+1;const b=c[0]+(c[1]-c[0])*acc/tot;return t>=a?`<b class="${t<b?'now':''}">${w}</b>`:w}).join(' ');
  capEl.innerHTML=`<div>${html}</div>`;capEl.style.opacity=clamp((t-c[0]+.05)*6)*(1-prog(t,c[1]+.3,c[1]+.6));capEl.classList.toggle('dark',t<6)}

/* ---------- transitions (both scenes render inside the window) ---------- */
const sceneAt=id=>order.find(s=>s.id===id);
const fx={flash:$('#flash'),tape:$('#tapeX'),laser:$('#laser'),ring:$('#ring'),road:$('#road'),st:[0,1,2].map(i=>$('#st'+i))};
{for(let i=0;i<24;i++){const r=el('div','tx','JDC CENGKARENG ✦ SERVICE POINT ✦ JDC CENGKARENG ✦ SERVICE POINT ✦',fx.tape);r.style.top=(i*100+20)+'px';r.style.left=(-(i*137)%400)+'px'}}
const TR=[ // [from, to, start, end, fn]
 ['s1','s2',5.45,6.35,(k,A,B,t)=>{const f=prog(t,5.75,6.0),g=1-prog(t,6.0,6.35);fx.flash.style.opacity=Math.min(f,g);A.root.style.visibility=t<6?'visible':'hidden';B.root.style.visibility=t>=6?'visible':'hidden'}],
 ['s2','s3',12.45,13.3,(k,A,B,t)=>{const a=eOut(prog(t,12.45,12.85)),b=eIn(prog(t,12.95,13.3));fx.tape.style.display='block';
   fx.tape.style.transform=`rotate(-8deg) translate(${lerp(-1700,0,a)+b*1900}px,${-b*500}px) rotate(${b*-6}deg)`;
   fx.tape.style.clipPath=b>0?`polygon(0 0,100% 0,100% 100%,${Array.from({length:30},(_,i)=>`${100-i*3.4}% ${100-(i%2?3:0)-b*8}%`).join(',')},0 100%)`:'none';
   A.root.style.visibility=t<12.9?'visible':'hidden';B.root.style.visibility=t>=12.9?'visible':'hidden'}],
 ['s3','s4',22.55,23.3,(k,A,B)=>{const e=eIO(k);fx.laser.style.display=k<1?'block':'none';fx.laser.style.top=(e*1920-4)+'px';B.root.style.clipPath=`inset(0 0 ${100-e*100}% 0)`;}],
 ['s4','s5',31.55,32.25,(k,A,B,t)=>{const a=eIn(prog(t,31.55,31.95));A.root.style.transform=`translateY(${-a*1920}px)`;A.root.style.filter=`blur(${Math.sin(a*Math.PI)*14}px)`;
   const s=spring(t-31.8,11,.55);B.root.style.transform=`translateY(${(1-s)*900}px)`;}],
 ['s5','s6',38.4,39.25,(k,A,B)=>{const e=eIO(k),R=e*1500,cx=540,cy=980;B.root.style.clipPath=`circle(${R}px at ${cx}px ${cy}px)`;
   fx.ring.style.display=k<1?'block':'none';fx.ring.style.width=fx.ring.style.height=(2*R+28)+'px';fx.ring.style.left=(cx-R-14)+'px';fx.ring.style.top=(cy-R-14)+'px';fx.ring.style.opacity=1-k*.6}],
 ['s6','s7',48.45,49.25,(k,A,B)=>{const e=eIO(k);fx.road.style.display=k<1?'block':'none';const x=lerp(-280,1100,e);fx.road.style.left=x+'px';B.root.style.clipPath=`inset(0 ${1080-x-130}px 0 0)`}],
 ['s7','s8',60.35,61.15,(k,A,B)=>{const e=eIO(k),p=A.pinScreen||[380,900];A.root.style.transformOrigin=`${p[0]}px ${p[1]}px`;A.root.style.transform=`scale(${1+e*5})`;A.root.style.opacity=1-prog(k,.5,1);
   B.root.style.clipPath=`circle(${eIn(k)*1700}px at ${p[0]}px ${p[1]}px)`}],
 ['s8','s9',70.35,71.15,(k,A,B)=>{fx.st.forEach((s,i)=>{const e=eIO(clamp(k*1.25-i*.12));s.style.display=k<1?'block':'none';s.style.top=(560+i*280)+'px';s.style.height=(e>.6?lerp(120,300,(e-.6)/.4):120)+'px';s.style.transform=`translateX(${lerp(1100,-1500,e)}px) skewX(-18deg)`});
   B.root.style.clipPath=`inset(0 0 0 ${lerp(100,0,eIO(prog(k,.25,1)))}%)`}],
];

/* ---------- frame ---------- */
window.seek=(t)=>{
  // reset fx + scene styles
  fx.flash.style.opacity=0;fx.tape.style.display='none';fx.laser.style.display='none';fx.ring.style.display='none';fx.road.style.display='none';fx.st.forEach(s=>s.style.display='none');
  order.forEach(s=>{s.root.style.visibility='hidden';s.root.style.clipPath='none';s.root.style.transform='none';s.root.style.filter='none';s.root.style.opacity=1});
  const active=new Set();order.forEach(s=>{if(t>=s.t0&&t<s.t1)active.add(s.id)});
  const trs=TR.filter(r=>t>=r[2]&&t<r[3]);trs.forEach(r=>{active.add(r[0]);active.add(r[1])});
  // update + draw each active scene (one shared renderer, copied onto the scene's own canvas)
  order.forEach(s=>{if(!active.has(s.id))return;s.root.style.visibility='visible';const lt=t-s.t0;s.update(lt,t);
    s.ctx.clearRect(0,0,W,H);if(s.scene){renderer.render(s.scene,s.cam);s.ctx.drawImage(renderer.domElement,0,0)}});
  trs.forEach(r=>{const A=sceneAt(r[0]),B=sceneAt(r[1]);r[4](prog(t,r[2],r[3]),A,B,t)});

  // brand frame: in at the drop (6.0 s)
  const hin=spring(t-5.85,12,.6),fin=spring(t-5.95,12,.6);
  $('#header').style.transform=`translateY(${(1-hin)*-170}px)`;$('#footer').style.transform=`translateY(${(1-fin)*290}px)`;
  $('#header').style.setProperty('--hx',(t*40%400)+'px');
  $('#footer').style.setProperty('--fx',(t*30%300)+'px');
  $('#footer').style.setProperty('--mx',(-(t*38)%900)+'px');
  const sw=(t%8)/8;$('#footer').style.setProperty('--sx',lerp(-300,1300,eIO(prog(sw,0,.35)))+'px');
  // background micro-print + grid drift
  const cur=order.find(s=>t>=s.t0&&t<s.t1)||order[order.length-1];
  const dx=Math.sin(t/5*Math.PI)*.18;
  $('#micro').style.transform=`translate(${-t*6%104}px,${-t*3%52}px) rotate(-8deg)`;
  $('#grid').style.transform=`translateX(${-dx*.3*260}px)`;
  $('#bg').style.opacity=1;
  // deco: lerp layout between scenes, float/spin/pop micro animation
  const idx=order.indexOf(cur),prev=order[Math.max(0,idx-1)];
  const kLay=eIO(prog(t,cur.t0-.6,cur.t0+.6));const L0=LAY[prev.id]||LAY.s2,L1=LAY[cur.id]||LAY.s2;
  const dVis=clamp((t-5.9)*2.5)*(1-.6*prog(t,77.5,78.2)*(1-prog(t,82.4,83)));
  const beat=t%0.5;
  DECO.forEach((d,i)=>{const e=decoEls[i];const x=lerp(L0[i][0],L1[i][0],kLay),y=lerp(L0[i][1],L1[i][1],kLay);
    const fl=Math.sin((t+d[8])/d[7]*Math.PI*2)*d[6];const rot=d[9]*t+(i*23%40-20);
    const pop=d[10]?1+.07*Math.exp(-beat*14)*Math.sin(Math.min(beat*30,Math.PI)):1;const par=-dx*d[5]*260;
    e.style.left=(x-d[2]/2+par)+'px';e.style.top=(y-d[2]/2+fl)+'px';e.style.opacity=d[4]*dVis;
    e.style.filter=d[3]?`blur(${d[3]}px)`:'none';e.style.transform=`rotate(${rot}deg) scale(${pop},${2-pop})`});
  caption(t);
};
await document.fonts.load('400 40px ArchivoBlack');await document.fonts.load('700 20px Mono');await document.fonts.load('600 20px Jakarta');await document.fonts.ready;
await Promise.all([...document.images].map(i=>i.complete?1:new Promise(o=>{i.onload=i.onerror=o})));
await Promise.all(order.map(s=>s.ready||1));
window.seek(0);window.READY=true;
