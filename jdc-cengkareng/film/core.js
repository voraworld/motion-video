// JDC Cengkareng film: shared renderer, scene manager, spatial-carousel transitions, beat sync,
// per-scene graphic accents, brand frame and captions. window.seek(t) renders frame t deterministically.
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
const backOut=k=>{k=clamp(k);const c=1.9;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2)};
const rad=d=>d*Math.PI/180;
const CLEAN=new URLSearchParams(location.search).has('clean');

const TL=await (await fetch('timeline.json')).json();
for(const f of ['400 40px ArchivoBlack','700 20px Mono','800 20px Mono','600 20px Jakarta','700 20px Jakarta','800 20px Jakarta'])await document.fonts.load(f);

/* ---------- shared WebGL renderer ---------- */
const W=1080,H=1920,CY=900;
export const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.toneMapping=THREE.NeutralToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
export const envTex=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.04).texture;
export function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.userData={c,g,draw};return t}

/* ---------- scenes ---------- */
const host=$('#scenes');host.style.perspective='2600px';host.style.perspectiveOrigin=`540px ${CY}px`;
const SC=makeScenes({THREE,envTex,canvasTex,host,el,clamp,eOut,eIn,eIO,spring,prog,lerp});
const order=TL.scenes.map(s=>({...s,...SC[s.id]}));
order.forEach((s,i)=>{s.i=i;s.root.classList.add('scene');s.root.id=s.id;const cv=el('canvas','cv',null);cv.width=W;cv.height=H;s.root.prepend(cv);s.ctx=cv.getContext('2d');
  s.root.style.transformOrigin=`540px ${CY}px`;s.root.style.backfaceVisibility='hidden';s.root.style.overflow='hidden';host.appendChild(s.root);s.anchors={}});

/* ---------- security micro-print (moving, so it cannot be patched with a still) ---------- */
{const g=$('#micro').getContext('2d');g.fillStyle='#6b4a00';g.font='700 15px Mono';const line='JDC CENGKARENG · SERVICE POINT · +62 877-7589-7478 · SOEWARNA BUSINESS PARK LOT 7A–7B · ';
  for(let y=0,i=0;y<2320;y+=26,i++){g.fillText((line.repeat(6)).slice(i*7%line.length),-40,y)}}
$('#microTxt').textContent=('JDC CENGKARENG ✦ DHL EXPRESS SERVICE POINT ✦ +62 877-7589-7478 ✦ LOT 7A–7B SOEWARNA BUSINESS PARK ✦ ').repeat(6);
// card background (used when a scene becomes a card in the carousel)
const cardBG=(()=>{const c=document.createElement('canvas');c.width=540;c.height=960;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,960);gr.addColorStop(0,'#FFF6D4');gr.addColorStop(.48,'#FFEFB0');gr.addColorStop(1,'#FFE27A');g.fillStyle=gr;g.fillRect(0,0,540,960);
  g.globalAlpha=.07;g.save();g.translate(270,480);g.rotate(rad(-8));g.drawImage($('#micro'),-370,-580,740,1160);g.restore();return c.toDataURL('image/jpeg',.9)})();

/* ---------- carousel space + ghost cards (stills of the other scenes) ---------- */
const space=el('div',null,null,$('#bg'));space.style.cssText='position:absolute;inset:0;opacity:0;background:radial-gradient(circle at 50% 47%,#FFD84A 0%,#FFC20E 52%,#F0A500 100%)';
const orbit=el('div',null,'<svg viewBox="0 0 1080 1920" width="1080" height="1920"><ellipse cx="540" cy="900" rx="620" ry="120" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-dasharray="4 14"/><ellipse cx="540" cy="900" rx="840" ry="170" fill="none" stroke="#D40511" stroke-opacity=".25" stroke-width="2" stroke-dasharray="2 18"/></svg>',space);orbit.style.cssText='position:absolute;inset:0';
const ghosts={};order.forEach(s=>{const g=el('div','ghost',`<img src="thumbs/${s.id}.jpg" alt="">`,host);g.style.cssText=`position:absolute;left:0;top:0;width:1080px;height:1920px;visibility:hidden;transform-origin:540px ${CY}px;overflow:hidden;backface-visibility:hidden;background:#FFEFB0`;
  g.querySelector('img').style.cssText='width:100%;height:100%;display:block';ghosts[s.id]=g});
const CARD_SH='0 0 0 16px #FFFDF6, 0 0 0 20px rgba(212,5,17,.85), 0 70px 120px -30px rgba(90,55,0,.55)';
const MODES={ringY:{step:34,R:2300,smin:.42},ringX:{step:42,R:2900,smin:.37},helix:{step:34,R:2300,smin:.4,dy:-560,rz:6},recap:{step:40,R:1760,smin:.34},cube:{smin:.6}};
function tfFor(p,mode,s){const M=MODES[mode],a=p*M.step,S=`scale3d(${s},${s},${s})`;
  if(mode==='ringX')return `${S} translate3d(0,${Math.sin(rad(a))*M.R}px,${(Math.cos(rad(a))-1)*M.R}px) rotateX(${-a}deg)`;
  return `${S} translate3d(${Math.sin(rad(a))*M.R}px,${M.dy?p*M.dy:0}px,${(Math.cos(rad(a))-1)*M.R}px) rotateY(${a}deg) rotateZ(${M.rz?p*M.rz:0}deg)`}
function trWindow(tr){const R=tr.mode==='recap';return {a0:tr.b-(R?1.45:.68),a1:tr.b-(R?1.15:.42),s0:tr.b-(R?1.25:.5),z1:tr.b+(R?.48:.42)}}
function trAt(t){for(const tr of TL.transitions){const w=trWindow(tr);if(t>=w.a0&&t<w.z1)return {tr,w}}return null}
function carouselC(tr,w,t){return eIO(prog(t,w.s0,tr.b))*(tr.mode==='recap'?1+order.length:1)}

/* ---------- graphic accents, per scene (sharp, contextual, beat-synced) ---------- */
const IMG={X01:'deco-cube',X06:'deco-plus',I01:'icon-anywhere',I02:'icon-anytime',I03:'icon-rate',I04:'icon-noform',I05:'icon-location',I06:'icon-chat',A20:'check-stamp',A23:'map-pin'};
const src=c=>`../../inbox/jdc/jdc_${c}_${IMG[c]}.png`;
const SPARK=c=>`<svg viewBox="0 0 40 40"><path d="M20 0C21.5 13 27 18.5 40 20C27 21.5 21.5 27 20 40C18.5 27 13 21.5 0 20C13 18.5 18.5 13 20 0Z" fill="${c}"/></svg>`;
const ACC={
 s1:[{k:'motes',n:16}],
 s2:[{k:'ring',anchor:'boxTop',times:[3.0,3.14,3.3],col:'#fff',max:640},{k:'confetti',anchor:'boxTop',at:3.0,n:28},{k:'dash',from:'slot',to:'label',at:5.4,end:6.5},{k:'burst',anchor:'labelS',at:6.5},{k:'spark',x:900,y:600,s:40,col:'#D40511',at:3.3},{k:'spark',x:170,y:610,s:34,col:'#fff',at:3.4},{k:'spark',x:960,y:1200,s:28,col:'#FFCC00',at:3.5}],
 s3:[{k:'icon',c:'I01',x:120,y:640,s:150,at:.7},{k:'icon',c:'I02',x:960,y:640,s:150,at:3.2},{k:'ring',anchor:'gate',times:[1.6,3.6,5.6],col:'#D40511'},{k:'spark',anchor:'gate',dx:-120,dy:-40,s:34,col:'#FFCC00',at:2.0},{k:'spark',anchor:'gate',dx:130,dy:-10,s:26,col:'#fff',at:2.1}],
 s4:[{k:'pct',x:930,y:600,s:96,at:2.0},{k:'pct',x:150,y:1180,s:80,at:2.4},{k:'pct',x:990,y:1150,s:64,at:2.8},{k:'burst',anchor:'sticker',at:3.42},{k:'spark',x:110,y:640,s:34,col:'#D40511',at:1.0}],
 s5:[{k:'icon',c:'I04',x:965,y:1230,s:140,at:1.2},{k:'icon',c:'I06',x:950,y:640,s:150,at:4.2},{k:'burst',anchor:'bubble',at:4.3},{k:'spark',x:960,y:820,s:30,col:'#D40511',at:4.6}],
 s6:[{k:'ring',anchor:'home',every:1.0,from:.6,col:'#D40511'},{k:'icon',c:'A23',anchor:'home',dy:-40,s:120,at:.5,bounce:1},{k:'icon',c:'I05',x:955,y:600,s:130,at:1.6},{k:'spark',anchor:'van',dx:0,dy:-90,s:34,col:'#FFCC00',at:3.5}],
 s7:[{k:'icon',c:'I06',x:960,y:620,s:130,at:1.0},{k:'ticks',ys:[1291,1387,1483],x:960,ats:[.7,3.4,5.8]},{k:'burst',anchor:'stamp',at:8.65},{k:'spark',x:120,y:1150,s:30,col:'#D40511',at:6.6}],
 s8:[{k:'ring',anchor:'pin',every:.5,from:1.0,col:'#D40511',max:150},{k:'flight',at:5.0},{k:'spark',x:110,y:600,s:34,col:'#D40511',at:1.0},{k:'spark',x:980,y:610,s:26,col:'#fff',at:1.3}],
 s9:[{k:'confetti',anchor:'box',at:1.95,n:22},{k:'ring',anchor:'cta',times:[5.3,11.45],col:'#D40511',max:260},{k:'spark',anchor:'num',dx:-440,dy:-40,s:40,col:'#FFCC00',at:11.15},{k:'spark',anchor:'num',dx:445,dy:20,s:30,col:'#D40511',at:11.25}],
};
function mk(parent,cls,html,css){const e=el('div',cls,html,parent);e.style.cssText='position:absolute;left:0;top:0;will-change:transform,opacity;'+(css||'');return e}
order.forEach(s=>{const box=el('div','acc',null,s.root);box.style.cssText='position:absolute;inset:0;pointer-events:none';s.acc=(ACC[s.id]||[]).map(a=>{const o={...a,els:[]};
  if(a.k==='icon'){o.els.push(mk(box,'',`<img src="${src(a.c)}" style="width:100%;height:100%;display:block;filter:drop-shadow(0 12px 10px rgba(107,74,0,.22))">`,`width:${a.s}px;height:${a.s}px`))}
  if(a.k==='spark'){o.els.push(mk(box,'',SPARK(a.col),`width:${a.s}px;height:${a.s}px`))}
  if(a.k==='pct'){o.els.push(mk(box,'','%',`width:${a.s}px;height:${a.s}px;border-radius:50%;background:#fff;color:#D40511;font:400 ${a.s*.55}px/${a.s}px ArchivoBlack;text-align:center;box-shadow:0 10px 0 -4px rgba(212,5,17,.25),0 18px 24px -14px rgba(107,74,0,.5)`))}
  if(a.k==='ring'){for(let i=0;i<4;i++)o.els.push(mk(box,'','',`width:10px;height:10px;border-radius:50%;border:5px solid ${a.col}`))}
  if(a.k==='burst'){for(let i=0;i<10;i++)o.els.push(i%3===0?mk(box,'',`<img src="${src('X01')}" style="width:100%;height:100%">`,'width:46px;height:46px'):mk(box,'',SPARK(i%2?'#FFCC00':'#D40511'),'width:30px;height:30px'))}
  if(a.k==='confetti'){for(let i=0;i<a.n;i++)o.els.push(i%4===0?mk(box,'',`<img src="${src('X01')}" style="width:100%;height:100%">`,'width:54px;height:54px'):mk(box,'','',`width:${i%2?14:22}px;height:${i%2?34:14}px;border-radius:4px;background:${['#D40511','#FFCC00','#fff'][i%3]}`))}
  if(a.k==='motes'){for(let i=0;i<a.n;i++)o.els.push(mk(box,'','',`width:${4+i%4*2}px;height:${4+i%4*2}px;border-radius:50%;background:#FFF3B0;box-shadow:0 0 12px 3px rgba(255,220,90,.6)`))}
  if(a.k==='dash'){o.els.push(mk(box,'','<svg width="1080" height="1920" viewBox="0 0 1080 1920" style="overflow:visible"><path d="" fill="none" stroke="#D40511" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 16"/><circle r="10" fill="#D40511"/></svg>',''))}
  if(a.k==='flight'){o.els.push(mk(box,'','<svg width="1080" height="1920" viewBox="0 0 1080 1920"><path d="M -60 1290 Q 520 1150 1150 520" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="3 20"/></svg>',''))}
  if(a.k==='ticks'){a.ys.forEach(()=>o.els.push(mk(box,'','<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#2BB673"/><path d="M11 21l6 6 12-13" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>','width:44px;height:44px')))}
  return o})});
const place=(e,x,y,sc=1,rot=0,op=1)=>{e.style.transform=`translate(${x-e.offsetWidth/2}px,${y-e.offsetHeight/2}px) rotate(${rot}deg) scale(${sc})`;e.style.opacity=op};
const rnd=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
function accents(s,lt,t){const beat=(t%.5)/.5,down=t%2<.5,pulse=Math.exp(-beat*7);
  s.acc.forEach((a,ai)=>{const A=a.anchor&&s.anchors[a.anchor];const ax=A?A[0]+(a.dx||0):a.x,ay=A?A[1]+(a.dy||0):a.y;
    if(a.k==='icon'){const k=spring(lt-a.at,13,.42),op=clamp((lt-a.at)*6);const fl=Math.sin((lt+ai)*1.6)*8,bo=a.bounce?-Math.abs(Math.sin(lt*Math.PI*2))*26:0;
      place(a.els[0],ax,ay+fl+bo,k*(1+(down?.06:.025)*pulse),Math.sin(lt*1.2+ai)*5,op*(A||!a.anchor?1:0))}
    if(a.k==='spark'){const k=spring(lt-a.at,14,.4);place(a.els[0],ax,ay+Math.sin(lt*2+ai)*6,k*(.75+.45*pulse),lt*40+ai*30,clamp((lt-a.at)*6))}
    if(a.k==='pct'){const k=spring(lt-a.at,13,.38);place(a.els[0],ax,ay+Math.sin(lt*2.2+ai)*10-Math.abs(Math.sin((lt-a.at)*Math.PI*2))*14,k*(1+.07*pulse),Math.sin(lt*1.5+ai)*12,clamp((lt-a.at)*6))}
    if(a.k==='ring'){const times=a.times||(lt>=a.from?Array.from({length:4},(_,i)=>Math.floor((lt-a.from)/a.every-i)*a.every+a.from).filter(x=>x>=a.from):[]);
      a.els.forEach((e,i)=>{const t0=times[i];const k=t0==null?1:prog(lt,t0,t0+1.1);const r=lerp(16,a.max||130,eOut(k));e.style.width=e.style.height=(2*r)+'px';e.style.borderWidth=lerp(7,2,k)+'px';
        place(e,ax,ay,1,0,(t0!=null&&lt>=t0&&k<1&&A)?(1-k)*.9:0)})}
    if(a.k==='burst'||a.k==='confetti'){const k=prog(lt,a.at,a.at+(a.k==='confetti'?1.6:.95));a.els.forEach((e,i)=>{const ang=rnd(i+ai*13)*Math.PI*2,sp=(a.k==='confetti'?520:300)*(.55+rnd(i*3.1)*.6);
      const x=ax+Math.cos(ang)*sp*eOut(k),y=ay+Math.sin(ang)*sp*eOut(k)*.8+(a.k==='confetti'?900*k*k:220*k*k);place(e,x,y,(1-k*.4)*(k>0?1:0),rnd(i)*360+k*540,(k>0&&k<1&&A)?1-eIn(k):0)})}
    if(a.k==='motes'){a.els.forEach((e,i)=>{const y=1500-((lt*90*(.6+rnd(i)*.8)+rnd(i+9)*1300)%1300),x=540+(rnd(i+3)-.5)*170+Math.sin(lt*1.3+i)*14;place(e,x,y,.8+.4*Math.sin(lt*4+i),0,.25+.6*rnd(i+5)*clamp(lt*2)*(1-prog(lt,5.3,5.6)))})}
    if(a.k==='dash'){const P=s.anchors[a.from],Q=s.anchors[a.to];const svg=a.els[0];if(!P||!Q){svg.style.opacity=0;return}const k=eIO(prog(lt,a.at,a.end-.4));
      const mx=(P[0]+Q[0])/2,my=Math.min(P[1],Q[1])-260;const path=svg.querySelector('path');path.setAttribute('d',`M ${P[0]} ${P[1]} Q ${mx} ${my} ${Q[0]} ${Q[1]}`);const L=path.getTotalLength();
      path.style.strokeDashoffset=-lt*40;path.setAttribute('stroke-dasharray',`2 16`);path.style.clipPath='none';const pt=path.getPointAtLength(L*k);const c=svg.querySelector('circle');c.setAttribute('cx',pt.x);c.setAttribute('cy',pt.y);
      svg.style.opacity=(lt>a.at&&lt<a.end+.3?1:0)*(1-prog(lt,a.end,a.end+.3));path.style.strokeDasharray=`2 16`;path.setAttribute('pathLength',L);
      svg.style.transform='none';path.style.opacity=1;path.setAttribute('stroke-dasharray',`${L*k} ${L}`)}
    if(a.k==='flight'){const svg=a.els[0];const k=eIO(prog(lt,a.at,a.at+3.2));const p=svg.querySelector('path');const L=p.getTotalLength();p.setAttribute('stroke-dasharray',`${L*k} ${L}`);svg.style.opacity=lt>a.at?1-prog(lt,a.at+4.2,a.at+4.8):0;svg.style.transform='none'}
    if(a.k==='ticks'){a.els.forEach((e,i)=>{const k=spring(lt-a.ats[i]-.25,15,.4);place(e,a.x,a.ys[i],k,0,clamp((lt-a.ats[i]-.25)*6))})}
  })}

/* ---------- captions ---------- */
const capEl=$('#cap');
function caption(t){const c=TL.captions.find(c=>t>=c[0]-.05&&t<c[1]+.6);if(!c){capEl.innerHTML='';return}
  const words=c[2].split(' '),tot=words.reduce((a,w)=>a+w.length+1,0);let acc=0;
  const html=words.map(w=>{const a=c[0]+(c[1]-c[0])*acc/tot;acc+=w.length+1;const b=c[0]+(c[1]-c[0])*acc/tot;return t>=a?`<b class="${t<b?'now':''}">${w}</b>`:w}).join(' ');
  capEl.innerHTML=`<div>${html}</div>`;capEl.style.opacity=clamp((t-c[0]+.05)*6)*(1-prog(t,c[1]+.3,c[1]+.6));capEl.classList.toggle('dark',t<6)}

const fx={flash:$('#flash')};
if(CLEAN){['#header','#footer','#cap','#fx'].forEach(s=>$(s).style.display='none')}

/* ---------- frame ---------- */
window.seek=(t)=>{
  fx.flash.style.opacity=0;space.style.opacity=0;
  order.forEach(s=>{const r=s.root.style;r.visibility='hidden';r.clipPath='none';r.transform='none';r.filter='none';r.opacity=1;r.borderRadius='0';r.boxShadow='none';r.background='transparent'});
  Object.values(ghosts).forEach(g=>{g.style.visibility='hidden';g.style.filter='none'});
  const cur=order.find(s=>t>=s.t0&&t<s.t1)||order[order.length-1];
  const T=trAt(t);const live=new Set([cur.id]);
  // T1 (hook -> intro): flap burst + flash, handled here
  if(t>=5.45&&t<6.35){live.add('s1');live.add('s2')}
  let plan=null;
  if(T){const {tr,w}=T;const A=order.find(s=>s.t1===tr.b),B=order.find(s=>s.t0===tr.b);live.add(A.id);live.add(B.id);
    const M=MODES[tr.mode];const z=t<tr.b?eIO(prog(t,w.a0,w.a1)):1-backOut(prog(t,tr.b,w.z1));const s=1-z*(1-M.smin);
    const c=carouselC(tr,w,t),v=Math.abs(carouselC(tr,w,t+1/30)-c)*30;plan={tr,A,B,z,s,c,v}}
  // update + draw live scenes
  order.forEach(s=>{if(!live.has(s.id))return;s.root.style.visibility='visible';const lt=t-s.t0;s.update(lt,t);
    s.ctx.clearRect(0,0,W,H);if(s.scene){renderer.render(s.scene,s.cam);s.ctx.drawImage(renderer.domElement,0,0)}accents(s,lt,t)});
  if(t>=5.45&&t<6.35){const f=prog(t,5.75,6.0),g=1-prog(t,6.0,6.35);fx.flash.style.opacity=Math.min(f,g);$('#s1').style.visibility=t<6?'visible':'hidden';$('#s2').style.visibility=t>=6?'visible':'hidden'}
  if(plan){const {tr,A,B,z,s,c,v}=plan;space.style.opacity=z;const blur=Math.min(12,v*(tr.mode==='recap'?1.6:2.2));
    const styleCard=(e,live_)=>{e.style.borderRadius=(z*80)+'px';e.style.boxShadow=z>.02?CARD_SH:'none';if(live_)e.style.background=z>.02?`url(${cardBG}) 0 0/100% 100%`:'transparent'};
    if(tr.mode==='cube'){const th=90*c*tr.dir,S=`scale3d(${s},${s},${s})`;
      A.root.style.transform=`${S} translateZ(-540px) rotateY(${-th}deg) translateZ(540px)`;B.root.style.transform=`${S} translateZ(-540px) rotateY(${90*tr.dir-th}deg) translateZ(540px)`;
      [A.root,B.root].forEach(e=>{styleCard(e,true);e.style.visibility='visible';if(blur>1)e.style.filter=`blur(${blur*.5}px)`})}
    else{const N=order.length,i=A.i;
      order.forEach(sc=>{let p=(sc.i-i)-c;if(tr.mode==='recap'){p=((p%N)+N+N/2)%N-N/2}const P=p*tr.dir;if(Math.abs(P)>(tr.mode==='recap'?4.4:2.3))return;
        const isLive=sc===A||sc===B;const e=isLive?sc.root:ghosts[sc.id];e.style.visibility='visible';e.style.transform=tfFor(P,tr.mode,s);styleCard(e,isLive);
        if(blur>1&&(!isLive||Math.abs(P)>.15))e.style.filter=`blur(${blur*(isLive?.5:1)}px)`;e.style.zIndex=String(100-Math.round(Math.abs(P)*10))})}
  }
  // beat sync: punch-in on every kick (bigger on the downbeat), shake + flash on each transition downbeat
  const beat=t%.5,down=t%2<.5,half=(t>=32&&t<40);
  if(!plan&&t>=6&&t<84){const amp=(down?.022:(half&&(t%1<.5)?0:.008))*Math.exp(-beat*16);cur.root.style.transform=`scale(${1+amp})`}
  const hits=[6,9,...TL.transitions.map(x=>x.b),84];const hit=hits.find(b=>t>=b&&t<b+(b===9?.5:.3));let sx=0,sy=0;
  if(hit!=null){const big=hit===9?2.1:1,k=prog(t,hit,hit+(hit===9?.5:.3));sx=Math.sin(t*95)*14*big*(1-k);sy=Math.cos(t*77)*10*big*(1-k);if(hit!==6)fx.flash.style.opacity=Math.max(+fx.flash.style.opacity,.32*(1-prog(t,hit,hit+.12)))}
  $('#film').style.transform=`translate(${sx}px,${sy}px)`;
  // brand frame
  const hin=spring(t-5.85,12,.6),fin=spring(t-5.95,12,.6);
  $('#header').style.transform=`translateY(${(1-hin)*-170}px)`;$('#footer').style.transform=`translateY(${(1-fin)*290}px)`;
  $('#header img').style.transform=`translateX(-50%) scale(${1+(t>=6&&down?.05:.015)*Math.exp(-beat*12)})`;
  $('#header').style.setProperty('--hx',(t*40%400)+'px');$('#footer').style.setProperty('--fx',(t*30%300)+'px');$('#footer').style.setProperty('--mx',(-(t*38)%900)+'px');
  $('#footer').style.setProperty('--sx',lerp(-300,1300,eIO(prog((t%8)/8,0,.35)))+'px');
  const dx=Math.sin(t/5*Math.PI)*.18;$('#micro').style.transform=`translate(${-t*6%104}px,${-t*3%52}px) rotate(-8deg)`;$('#grid').style.transform=`translateX(${-dx*78}px)`;
  caption(t);
};
await Promise.all([...document.images].map(i=>i.complete?1:new Promise(o=>{i.onload=i.onerror=o})));
window.seek(0);window.READY=true;
