// The nine scenes. Each returns {root, scene, cam, update(lt,t)}; lt is time since the scene's t0.
import * as THREE from 'three';
import {B,M,V,at,grp,rbox,cyl,puck,sph,tube,ext,parcel,pinObj,bubbleObj,tapeRoll,phoneObj,clay,mesh,ribbon} from '../clay-lab/clay.js';

const W=1080,H=1920;
export function makeScenes(X){
const {envTex,canvasTex,el,clamp,eOut,eIn,eIO,spring,prog,lerp}=X;

/* ---------- helpers ---------- */
function stage({fov=34,r=5.5,shadow=.22,env=.55}={}){
  const scene=new THREE.Scene();scene.environment=envTex;scene.environmentIntensity=env;
  const cam=new THREE.PerspectiveCamera(fov,W/H,.1,120);
  const key=new THREE.DirectionalLight('#fff4dc',2.4);key.position.set(-5,9,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.radius=12;key.shadow.blurSamples=20;key.shadow.bias=-.0006;key.shadow.normalBias=.02;
  Object.assign(key.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:.1,far:40});scene.add(key);
  const rim=new THREE.DirectionalLight('#ffe9b0',1.5);rim.position.set(5,4,-6);scene.add(rim);scene.add(new THREE.HemisphereLight('#fff8e6','#c9a24a',.5));
  const g=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({color:'#6b4a00',opacity:shadow}));g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
  return {scene,cam,key}}
const root=()=>{const r=el('section',null,null);const ov=el('div','ov',null,r);return [r,ov]};
// text block that springs in (and optionally out)
function txt(ov,cls,html,top,extra=''){const e=el('div',cls,html,ov);e.style.top=top+'px';if(extra)e.style.cssText+=extra;e.style.opacity=0;return e}
function show(e,lt,at,out=99,dy=50,base=''){const k=spring(lt-at,15,.5),o=clamp((lt-at)*6)*(1-eIO(prog(lt,out,out+.35)));e.style.opacity=o;e.style.transform=`${base} translateY(${(1-k)*dy-eIO(prog(lt,out,out+.35))*30}px)`}
function words(e,lt,times,out=99){[...e.querySelectorAll('span')].forEach((s,i)=>{const k=spring(lt-times[i],15,.5);s.style.transform=`translateY(${(1-k)*60}px) scaleY(${1+(1-k)*.1})`;s.style.opacity=clamp((lt-times[i])*6)});
  e.style.opacity=1-eIO(prog(lt,out,out+.35))}
const HB='scaleX(.82) skewX(-8deg)',HB2='scaleX(.84) skewX(-8deg)';
const mat=(map,o={})=>new THREE.MeshPhysicalMaterial({map,roughness:o.r??.6,sheen:.4,sheenColor:new THREE.Color('#fff1c2'),transparent:!!o.tr,clearcoat:o.cc||0});
function proj(v,cam){cam.updateMatrixWorld();const p=v.clone().project(cam);return [(p.x+1)/2*W,(1-p.y)/2*H]}
// branded tape texture: the service point's name repeats along every strip of tape
const tapeTex=(rot=0)=>{const t=canvasTex(1024,128,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#E8202B');gr.addColorStop(1,'#C40410');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(255,255,255,.92)';g.font='400 54px ArchivoBlack';g.textBaseline='middle';let x=10;for(let i=0;i<4;i++){g.fillText('JDC CENGKARENG',x,h/2+3);x+=g.measureText('JDC CENGKARENG').width+24;g.fillText('✦',x,h/2);x+=60}});
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.center.set(.5,.5);t.rotation=rot;return t};
function barcode(g,x,y,w,h,seed=7){let r=seed;const rnd=()=>(r=(r*9301+49297)%233280)/233280;let cx=x;g.fillStyle='#1B1912';while(cx<x+w-6){const bw=1+Math.floor(rnd()*4)*2;g.fillRect(cx,y,bw,h);cx+=bw+2+Math.floor(rnd()*3)*2}}
const labelTex=(o={})=>canvasTex(1024,o.h||680,(g,w,h)=>{g.fillStyle='#FFFDF6';g.beginPath();g.roundRect(0,0,w,h,36);g.fill();
  g.fillStyle='#D40511';g.beginPath();g.roundRect(0,0,w,110,[36,36,0,0]);g.fill();g.fillStyle='#fff';g.font='700 46px Mono';g.textBaseline='middle';g.fillText(o.top||'SHIP WITH',44,58);
  g.textAlign='right';g.fillText('DHL EXPRESS',w-44,58);g.textAlign='left';
  g.fillStyle='#8a7f66';g.font='700 34px Mono';g.fillText('SERVICE POINT',44,170);
  g.fillStyle='#1B1912';g.font='400 104px ArchivoBlack';g.save();g.translate(44,262);g.scale(.86,1);g.fillText('JDC CENGKARENG',0,0);g.restore();
  g.fillStyle='#D40511';g.font='800 50px Mono';g.fillText(o.num||'WA +62 877-7589-7478',44,368);
  g.strokeStyle='#E2D8C0';g.lineWidth=4;g.setLineDash([14,10]);g.beginPath();g.moveTo(44,430);g.lineTo(w-44,430);g.stroke();g.setLineDash([]);
  barcode(g,44,460,w-88,(o.h||680)-540);g.fillStyle='#8a7f66';g.font='700 26px Mono';g.fillText('JDC-CGK · SOEWARNA BUSINESS PARK LOT 7A–7B',44,(o.h||680)-46)});

/* ================= S1 · Hook: inside the box ================= */
function S1(){const [r,ov]=root();const scene=new THREE.Scene();scene.environment=envTex;scene.environmentIntensity=.15;
  const cam=new THREE.PerspectiveCamera(96,W/H,.05,60);const S=4,Hh=5,t=.1;
  const wallA=clay('#E0A616',{side:THREE.DoubleSide}),wallB=clay('#C98F0C',{side:THREE.DoubleSide}),flapM=clay('#F0B820',{side:THREE.DoubleSide});
  scene.add(at(rbox(S,Hh,t,.03,wallA),0,Hh/2,-S/2),at(rbox(S,Hh,t,.03,wallA),0,Hh/2,S/2),at(rbox(t,Hh,S,.03,wallB),-S/2,Hh/2,0),at(rbox(t,Hh,S,.03,wallB),S/2,Hh/2,0),at(rbox(S,t,S,.03,wallB),0,0,0));
  const flaps=[-1,1].map(sd=>{const pv=new THREE.Group();pv.position.set(sd*S/2,Hh+.05,0);const f=rbox(S/2-.02,t,S,.04,flapM);f.position.x=-sd*S/4;pv.add(f);
    const tp=at(rbox(.25,.02,S,.01,new THREE.MeshPhysicalMaterial({map:tapeTex(Math.PI/2),roughness:.45})),-sd*(S/2-.13),.06,0);pv.add(tp);scene.add(pv);return {pv,sd}});
  const seamM=new THREE.MeshBasicMaterial({color:'#FFF6C8'});const seam=at(new THREE.Mesh(new THREE.PlaneGeometry(.06,S*.98),seamM),0,Hh+.08,0,Math.PI/2,0,0);scene.add(seam);
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(1.8,S*.98),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{k:{value:1}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float k;varying vec2 vUv;void main(){float d=abs(vUv.x-.5)*2.;gl_FragColor=vec4(1.,.9,.45,pow(1.-d,4.)*.9*k);}'}));
  at(halo,0,Hh-.02,0,Math.PI/2,0,0);scene.add(halo);
  const sl=new THREE.SpotLight('#FFE7A0',60,Hh+1,.7,1,1.2);sl.position.set(0,Hh-.05,0);sl.target.position.set(0,0,0);scene.add(sl,sl.target);
  const hemi=new THREE.HemisphereLight('#ffe39a','#6a4a08',.8);scene.add(hemi);
  const l1=txt(ov,'h1','<span>S</span><span>H</span><span>I</span><span>P</span><span>P</span><span>I</span><span>N</span><span>G</span>',640,'font-size:150px;color:#FFCC00;text-shadow:0 0 40px rgba(255,204,0,.35)');
  const l2=txt(ov,'h1','<span>O</span><span>V</span><span>E</span><span>R</span><span>S</span><span>E</span><span>A</span><span>S</span><span>?</span>',800,'font-size:150px;color:#FFCC00;text-shadow:0 0 40px rgba(255,204,0,.35)');
  const l3=txt(ov,'sub','<span class="pillR" style="font-size:76px">MADE EASY.</span>',1010,'');
  const spray=(e,lt,a,step)=>{[...e.querySelectorAll('span')].forEach((s,i)=>{const k=clamp((lt-a-i*step)/.22);s.style.opacity=k;s.style.filter=`blur(${(1-k)*12}px)`;s.style.transform=`scale(${1+(1-k)*.25})`})};
  return {root:r,scene,cam,update(lt){
    const open=eIn(prog(lt,5.45,6.0)),crack=eOut(prog(lt,4.35,4.6))*.07;
    flaps.forEach(({pv,sd})=>{pv.rotation.z=-sd*(crack+open*2.2)});
    halo.material.uniforms.k.value=.55+.45*Math.sin(lt*3)*.2+.3*prog(lt,4.3,4.7)+open*2;sl.intensity=40+40*prog(lt,4.3,4.8)+open*200;hemi.intensity=.8+open*2;
    const rise=eIn(prog(lt,5.5,6.0));cam.position.set(0,.2+rise*3.2,0);cam.up.set(0,0,-1);cam.lookAt(0,Hh+2,0);cam.fov=96-rise*20;cam.updateProjectionMatrix();
    spray(l1,lt,.8,.055);spray(l2,lt,1.3,.055);l1.style.opacity=l2.style.opacity=1-prog(lt,5.3,5.6);
    show(l3,lt,3.25,5.3,40)}}}

/* ================= S2 · Intro: the service point label ================= */
function S2(){const [r,ov]=root();const {scene,cam}=stage({r:4});
  const rnd=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  scene.add(at(puck(1.75,.16,.07,M.W),-.35,.08,0));
  const box=new THREE.Group();box.position.set(-.35,.16,0);scene.add(box);const bw=1.7,bh=1.25,bd=1.3,t=.07;
  box.add(at(rbox(bw,bh,bd,.16,M.Y),0,bh/2,0));box.add(at(rbox(bw-.14,.02,bd-.14,.01,M.Yin),0,bh-.012,0));
  const tm=()=>new THREE.MeshPhysicalMaterial({map:tapeTex(Math.PI/2),roughness:.45,clearcoat:.3});
  // four flaps; the long ones carry one half of the branded tape each, so the tape tears on the blast
  const flaps=[[0,1,bd/2,bw],[0,-1,bd/2,bw],[1,0,bw*.42,bd],[-1,0,bw*.42,bd]].map(([x,z,len,wid],i)=>{const pv=new THREE.Group();pv.position.set(x*bw/2,bh,z*bd/2);
    const f=rbox(x?len:wid-.04,t*.8,x?wid-.04:len,.03,M.Y);f.position.set(-x*len/2,(x?-.012:0),-z*len/2);pv.add(f);
    if(!x)pv.add(at(rbox(.36,.03,len,.012,tm()),0,.045,-z*len/2));box.add(pv);return {pv,x,z,i}});
  box.add(at(rbox(.36,.42,.05,.02,tm()),0,bh-.21,bd/2+.01));
  const seam=new THREE.Mesh(new THREE.PlaneGeometry(bw*.92,.05),new THREE.MeshBasicMaterial({color:'#FFF6C8',transparent:true,opacity:0}));seam.rotation.x=-Math.PI/2;seam.position.y=bh+.07;box.add(seam);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(bw-.2,bd-.2),new THREE.MeshBasicMaterial({color:'#FFF3B0',transparent:true,opacity:0}));glow.rotation.x=-Math.PI/2;glow.position.y=bh-.005;box.add(glow);
  const inner=new THREE.PointLight('#FFD86B',0,7,1.4);inner.position.set(0,bh+.5,0);box.add(inner);
  // light column out of the open box
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(1.7,.72,4.2,48,1,true),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{k:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float k;varying vec2 vUv;void main(){float a=(1.-vUv.y)*.55*k*(.6+.4*sin(vUv.x*60.));gl_FragColor=vec4(1.,.86,.35,a);}'}));
  beam.position.set(0,bh+2.1,0);box.add(beam);
  // sunburst behind the box
  const rays=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,map:canvasTex(1024,1024,(g,w,h)=>{const c=w/2;for(let i=0;i<28;i++){g.beginPath();g.moveTo(c,c);g.arc(c,c,c,i/28*Math.PI*2,(i+.5)/28*Math.PI*2);g.closePath();g.fillStyle=i%2?'rgba(255,255,255,.55)':'rgba(255,214,64,.6)';g.fill()}
    const gr=g.createRadialGradient(c,c,0,c,c,c);gr.addColorStop(0,'rgba(255,250,220,1)');gr.addColorStop(.25,'rgba(255,240,170,.4)');gr.addColorStop(1,'rgba(255,230,140,0)');g.globalCompositeOperation='destination-in';g.fillStyle=gr;g.fillRect(0,0,w,h)})}));
  rays.position.set(-.35,1.7,-2.2);scene.add(rays);
  const printer=B.A06();printer.rotation.y=-.5;printer.scale.setScalar(.55);printer.position.set(1.2,0,1.15);scene.add(printer);
  printer.traverse(o=>{if(o.isMesh&&o.geometry.type==='BufferGeometry'&&o.material===M.W&&!o.geometry.parameters)o.visible=false});
  const label=new THREE.Mesh(new THREE.PlaneGeometry(.92,.61),new THREE.MeshPhysicalMaterial({map:labelTex(),roughness:.55,side:THREE.DoubleSide}));label.castShadow=true;box.add(label);
  const slot=new THREE.Object3D();slot.position.set(0,.6,.75);printer.add(slot);
  const eb=txt(ov,'eyebrow','MEET DHL EXPRESS',214);const h2=txt(ov,'h2','<span>SERVICE POINT</span>',268);
  const NAME='JDC CENGKARENG';const h1=txt(ov,'h1',NAME.split('').map(c=>`<span class="red">${c===' '?'&nbsp;':c}</span>`).join(''),360,'font-size:104px');h1.style.opacity=1;
  const letters=[...h1.querySelectorAll('span')];let fin=null;
  const sub=txt(ov,'sub','Jakarta Distribution Center',488,'font:700 30px Mono;letter-spacing:.14em;color:#6d6656');
  const qA=new THREE.Quaternion(),qB=new THREE.Quaternion(),fQ=new THREE.Quaternion(),BL=3.0;
  return {root:r,scene,cam,update(lt){
    const push=eIO(prog(lt,2.1,BL)),rec=lt>=BL?Math.exp(-(lt-BL)*3.2)*Math.cos((lt-BL)*9):0;
    cam.position.set(-.1+Math.sin(lt*.25)*.3,6.1-push*.35+rec*.35,15.6-push*1.0+rec*1.3);cam.lookAt(-.1,1.0+push*.1,0);
    const amp=eIn(prog(lt,2.0,BL))*(lt<BL?1:0);box.position.x=-.35+Math.sin(lt*71)*.035*amp;box.rotation.set(0,-.42+lt*.035,Math.sin(lt*53)*.03*amp);
    // flaps rattle, then blast open on the downbeat
    flaps.forEach(({pv,x,z,i})=>{const rattle=Math.max(0,Math.sin(lt*38+i*1.7))*.09*amp;const o=lt<BL?rattle:clamp(spring(lt-BL-i*.03,13,.32),0,1.25)*(x?2.0:2.3);if(x)pv.rotation.z=-x*o;else pv.rotation.x=z*o});
    seam.material.opacity=lt<BL?amp*.95:0;const b=lt>=BL?Math.exp(-(lt-BL)*1.4):0;
    glow.material.opacity=lt>=BL?.55+.45*b:0;inner.intensity=lt<BL?amp*6:6+30*b;beam.material.uniforms.k.value=lt>=BL?.45+.9*b:0;
    const rk=spring(lt-BL,9,.5);rays.visible=lt>=BL;rays.scale.setScalar(Math.max(.001,rk*(1+.05*Math.sin(lt*3))));rays.material.opacity=.55+.45*b;rays.lookAt(cam.position);rays.rotateZ(lt*.35);
    // label: printed (4.2–5.2) then flown onto the box (5.4–6.5)
    scene.updateMatrixWorld(true);
    const out=eOut(prog(lt,4.2,5.2)),fly=eIO(prog(lt,5.4,6.5));
    const sw=slot.getWorldPosition(new THREE.Vector3());const dir=new THREE.Vector3(0,0,1).applyQuaternion(printer.quaternion);
    const startW=sw.clone().addScaledVector(dir,-.25+out*.42).add(new THREE.Vector3(0,.02,0));const startL=box.worldToLocal(startW.clone());const endL=new THREE.Vector3(.18,.52,bd/2+.035);
    const p=startL.clone().lerp(endL,fly);p.y+=Math.sin(fly*Math.PI)*1.1;label.position.copy(p);
    qA.setFromEuler(new THREE.Euler(-Math.PI/2+.25,printer.rotation.y,0,'YXZ'));fQ.copy(box.getWorldQuaternion(new THREE.Quaternion())).invert().multiply(qA);qB.identity();label.quaternion.copy(fQ).slerp(qB,fly);
    const s=fly>=1?1+.06*Math.sin(clamp((lt-6.5)*10)*Math.PI):1;label.scale.set(s,s,1);label.visible=lt>=4.15;
    const top=proj(box.localToWorld(new THREE.Vector3(0,bh+.2,0)),cam);
    this.anchors={boxTop:top,slot:proj(sw,cam),label:proj(label.getWorldPosition(new THREE.Vector3()),cam),labelS:proj(box.localToWorld(endL.clone()),cam)};
    // the name erupts out of the box letter by letter and lands in the headline
    if(!fin){fin=letters.map(e=>[e.offsetLeft+e.offsetWidth/2-h1.offsetWidth/2,e.offsetTop+e.offsetHeight/2])}
    letters.forEach((e,i)=>{const ti=BL+.02+i*.035,k=prog(lt,ti,ti+.62),q=eOut(k);const fx=540+fin[i][0]*.82,fy=360+fin[i][1];
      const dx=(top[0]-fx)/.82,dy=top[1]-fy;const land=lt-(ti+.62);const sq=land>0?.2*Math.exp(-land*11)*Math.sin(land*34):0;
      e.style.opacity=lt>=ti?1:0;e.style.transform=`translate(${dx*(1-q)}px,${dy*(1-q)-Math.sin(q*Math.PI)*(240+rnd(i)*160)}px) rotate(${(1-q)*(rnd(i+7)-.5)*760}deg) scale(${lerp(.2,1,q)*(1+sq)},${lerp(.2,1,q)*(1-sq)})`});
    show(eb,lt,.9,99);words(h2,lt,[1.55],99);show(sub,lt,4.3,99,30)}}}

/* ================= S3 · Anywhere, anytime: sorting conveyor ================= */
function S3(){const [r,ov]=root();const {scene,cam}=stage({r:6});
  const conv=B.A07();conv.children.filter(o=>o.isGroup).forEach(o=>conv.remove(o));scene.add(conv);
  const R0=2.0,pts=[];for(let i=0;i<=48;i++){const a=Math.PI+i/48*Math.PI;pts.push(V(Math.cos(a)*R0,0,-Math.sin(a)*R0*.8))}
  const curve=new THREE.CatmullRomCurve3([V(-R0,0,-2.3),...pts,V(R0,0,-2.3)]);const gp=curve.getPointAt(.5);
  const gate=grp();{const Hg=2.05,back=-.95;gate.add(at(cyl(.06,.07,Hg,M.R,32),0,Hg/2,back),at(puck(.22,.08,.03,M.G),0,.04,back),at(rbox(.16,.14,-back+.25,.07,M.G),0,Hg,back/2+.1),at(rbox(.62,.2,.46,.09,M.G),0,Hg-.08,0),at(rbox(.5,.03,.08,.015,M.R),0,Hg-.19,0),at(cyl(.035,.035,.04,M.R,16),.2,Hg+.03,.12));
    const lz=new THREE.Mesh(new THREE.PlaneGeometry(1.1,Hg-.85),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 vUv;void main(){float w=mix(1.,.22,vUv.y);float d=abs(vUv.x-.5)*2./w;if(d>1.)discard;float a=(.12+.28*vUv.y)*(1.-pow(d,3.));gl_FragColor=vec4(.95,.12,.16,a);}'}));lz.position.set(0,.85+(Hg-.85)/2-.1,0);gate.add(lz)}
  gate.position.set(gp.x,0,gp.z);scene.add(gate);
  const sweep=new THREE.Mesh(new THREE.BoxGeometry(1.0,.025,.04),new THREE.MeshBasicMaterial({color:'#ff2a36'}));scene.add(sweep);
  const dios=['A09','A10','A11'].map(k=>{const d=B[k]();d.scale.setScalar(.31);const h=grp(d);scene.add(h);return h});
  const SPACE=.2,D1=.17,scans=[{t:1.6,u:'07:30',end:2.45},{t:3.6,u:'13:00',end:4.45},{t:5.6,u:'22:45',end:7.0}];
  const travel=t=>D1*eOut(t/1.4)+SPACE*(eIO(prog(t,2.5,3.4))+eIO(prog(t,4.5,5.4))+eIO(prog(t,7.0,8.2)));
  const num=txt(ov,'eyebrow','01',214,'font-size:40px');const h=txt(ov,'h1','<span>BOOK</span>',262);
  const wA=txt(ov,'h1','<span>ANYWHERE.</span>',376);const wB=txt(ov,'h1','<span class="red">ANYTIME.</span>',376);
  const tag=el('div','tagT','<b>07:30</b><i>BOOKED · JDC CGK</i>',ov);
  const chips=el('div',null,'<div class="chip">HOME</div><div class="chip">OFFICE</div><div class="chip">ON THE GO</div>',ov);chips.style.cssText='position:absolute;left:0;right:0;top:1420px;display:flex;justify-content:center;gap:18px';
  return {root:r,scene,cam,update(lt){
    const dx=Math.sin(lt/5*Math.PI)*.18;cam.fov=42;cam.updateProjectionMatrix();cam.position.set(dx,7.3-.2*eOut(lt/10),13.4-.6*eOut(lt/10));cam.lookAt(0,.75,-.6);
    const tr=travel(lt);dios.forEach((hh,i)=>{let u=.5-D1-i*SPACE+tr;hh.visible=u>0.01&&u<.99;u=clamp(u,0,1);const p=curve.getPointAt(u);hh.position.set(p.x,.7,p.z);hh.rotation.y=-.5;
      const s=scans[i];hh.position.y+=Math.max(0,(spring(lt-s.t+.15)-spring(lt-(s.t+1.4)))*.12)});
    sweep.visible=false;scans.forEach(s=>{const k=prog(lt,s.t,s.t+.45);if(k>0&&k<1){sweep.visible=true;sweep.position.set(gp.x,1.8-.95*eIO(k),gp.z)}});
    let ts=0,tx='07:30';scans.forEach(s=>{if(lt>=s.t+.35&&lt<s.end+.25){ts=spring(lt-(s.t+.35),16,.38)*(1-eIO(prog(lt,s.end,s.end+.25)));tx=s.u}});
    tag.querySelector('b').textContent=tx;const [x,y]=proj(V(gp.x,2.32,gp.z),cam);this.anchors={gate:proj(V(gp.x,1.95,gp.z),cam)};tag.style.left=(x-tag.offsetWidth/2)+'px';tag.style.top=(y-tag.offsetHeight-6)+'px';tag.style.transform=`scale(${ts})`;
    show(num,lt,.25,99,30);words(h,lt,[.35],99);
    const sw=eIO(prog(lt,2.85,3.2));show(wA,lt,.6,2.85,60,HB);show(wB,lt,3.1,99,60,HB);
    const cs=chips.querySelectorAll('.chip'),on=[6.75,7.35,7.95];cs.forEach((c,i)=>{const k=spring(lt-(6.5+i*.1),15,.55);c.style.transform=`translateY(${(1-k)*40}px)`;c.style.opacity=clamp((lt-(6.5+i*.1))*6);c.classList.toggle('on',lt>=on[i]&&(i===2||lt<on[i+1]))})}}}

/* ================= S4 · Competitive rates + promo ================= */
function S4(){const [r,ov]=root();const {scene,cam}=stage({r:5});
  const pivot=new THREE.Group();pivot.position.set(-.85,4.05,0);scene.add(pivot);
  pivot.add(at(puck(.16,.12,.05,M.R),0,0,-.05,Math.PI/2,0,0));
  const tag=new THREE.Group();tag.position.y=-2.35;pivot.add(tag);
  {const s=new THREE.Shape();s.moveTo(0,1.2);s.lineTo(.8,.68);s.lineTo(.8,-1.05);s.quadraticCurveTo(.8,-1.2,.65,-1.2);s.lineTo(-.65,-1.2);s.quadraticCurveTo(-.8,-1.2,-.8,-1.05);s.lineTo(-.8,.68);s.closePath();
   const hl=new THREE.Path();hl.absarc(0,.72,.13,0,Math.PI*2,true);s.holes.push(hl);tag.add(ext(s,.1,.07,M.Y));
   const face=canvasTex(512,640,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#D40511';g.font='400 150px ArchivoBlack';g.textAlign='center';g.save();g.translate(w/2,350);g.scale(.9,1);g.fillText('JDC',0,0);g.restore();
     g.fillStyle='#1B1912';g.font='800 46px Mono';g.fillText('CENGKARENG',w/2,430);g.fillStyle='#8a6a00';g.font='700 30px Mono';g.fillText('SERVICE POINT',w/2,486);
     g.strokeStyle='rgba(138,106,0,.5)';g.lineWidth=4;g.setLineDash([12,10]);g.strokeRect(36,140,w-72,400)});
   tag.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.75),new THREE.MeshPhysicalMaterial({map:face,transparent:true,roughness:.6})),0,-.32,.125));
   tag.add(tube([V(0,.8,0),V(0,.9,.18),V(0,1.6,.1),V(0,2.35,0)],.022,M.G));}
  const sticker=new THREE.Group();sticker.position.set(.55,-.95,.16);tag.add(sticker);
  sticker.add(at(puck(.42,.06,.025,M.R),0,0,0,Math.PI/2,0,0));
  sticker.add(at(new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshBasicMaterial({map:canvasTex(256,256,(g,w,h)=>{g.fillStyle='#fff';g.font='400 64px ArchivoBlack';g.textAlign='center';g.textBaseline='middle';g.fillText('PROMO',w/2,h/2+4)}),transparent:true})),0,0,.04));
  const rollA=grp(at(tapeRoll(.72),0,0,0,Math.PI/2,0,0)),rollB=grp(at(tapeRoll(.72),0,0,0,Math.PI/2,0,0));scene.add(rollA,rollB);
  const strip=at(rbox(2.0,.3,.06,.03,new THREE.MeshPhysicalMaterial({map:tapeTex(0),roughness:.45,clearcoat:.3})),1.75,1.85,.05,0,0,-.95);scene.add(strip);
  const A=V(1.15,2.55,0),Bp=V(2.35,1.15,0);
  const num=txt(ov,'eyebrow','02',214,'font-size:40px');const h=txt(ov,'h1','<span>COMPETITIVE</span>',262);const h2=txt(ov,'h1','<span class="red">RATES</span>',376);
  const ban=txt(ov,'sub','<span class="pillR" style="font-size:44px">+ SPECIAL PROMO DISCOUNTS</span>',1222);const ask=txt(ov,'sub','<span class="pillW">Ask us about the current promo</span>',1372);
  return {root:r,scene,cam,update(lt){
    cam.position.set(.6+Math.sin(lt*.3)*.25,3.1,18.6);cam.lookAt(.62,1.7,0);
    pivot.rotation.z=Math.sin(lt*2.4)*.24*Math.exp(-lt*.35)+(lt>3.4?Math.sin((lt-3.4)*5)*.08*Math.exp(-(lt-3.4)*1.5):0)+.02;
    const ra=eOut(prog(lt,1.4,2.3)),rb=eOut(prog(lt,1.6,2.5));
    rollA.position.set(lerp(5.5,A.x,ra),A.y,0);rollA.rotation.z=(1-ra)*7;rollB.position.set(lerp(6,Bp.x,rb),Bp.y,0);rollB.rotation.z=(1-rb)*7;
    const sk=eOut(prog(lt,2.3,2.9));strip.scale.set(Math.max(.001,sk),1,1);
    const sp=spring(lt-3.4,13,.42);sticker.scale.setScalar(lt<3.3?.0001:lerp(1.6,1,sp));sticker.rotation.z=(1-sp)*.6;scene.updateMatrixWorld(true);this.anchors={sticker:proj(sticker.getWorldPosition(new THREE.Vector3()),cam)};
    show(num,lt,.25,99,30);words(h,lt,[.4],99);words(h2,lt,[.7],99);show(ban,lt,2.4,99);show(ban,lt,2.4,99,50);show(ask,lt,4.95,99)}}}

/* ================= S5 · No registration: forms fall like dominoes ================= */
function S5(){const [r,ov]=root();const {scene,cam}=stage({r:6});
  const panels=[0,1,2,3,4].map(i=>{const pv=new THREE.Group();pv.position.set(-1.6+i*.75,0,1.4-i*.95);const p=B.A16();p.rotation.set(0,0,0);p.position.set(0,1.25,.09);pv.add(p);scene.add(pv);return pv});
  const bub=bubbleObj({lines:false});const face=canvasTex(512,320,(g,w,h)=>{g.fillStyle='#1B1912';g.font='700 52px Jakarta';g.fillText('Hi, JDC',34,120);g.fillText('Cengkareng!',34,190);g.fillStyle='#8a7f66';g.font='700 26px Mono';g.fillText('NO SIGN-UP · JUST CHAT',34,262)});
  bub.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.5,.94),new THREE.MeshBasicMaterial({map:face,transparent:true})),-.02,.02,.28));
  const bg=grp(bub);scene.add(bg);
  const num=txt(ov,'eyebrow','03',214,'font-size:40px');const h=txt(ov,'h1','<span>NO REGISTRATION</span>',262,'font-size:100px');
  const tape=el('div','tape',null,ov);tape.style.cssText+='left:268px;top:300px;width:700px;height:30px;transform:rotate(-3deg) scaleX(0)';
  const h2=txt(ov,'h1','<span class="red">NEEDED.</span>',380);
  return {root:r,scene,cam,update(lt){
    cam.position.set(6.3+Math.sin(lt*.3)*.25,7.3,14.6);cam.lookAt(-.05,1.05,-.45);
    panels.forEach((pv,i)=>{const a=eIn(prog(lt,2.7+i*.25,3.2+i*.25));pv.rotation.x=-a*1.42});
    const bk=spring(lt-4.0,10,.5);bg.position.set(-.35,lerp(-.5,3.0,bk)+Math.sin(lt*2)*.06,1.9);bg.lookAt(cam.position);bg.rotateY(-.3+Math.sin(lt*1.3)*.04);bg.rotateZ(.04);bg.scale.setScalar(Math.max(.001,bk*1.22));bg.visible=lt>3.9;scene.updateMatrixWorld(true);this.anchors={bubble:proj(bg.getWorldPosition(new THREE.Vector3()),cam)};
    show(num,lt,.25,99,30);words(h,lt,[.35],99);const tk=eOut(prog(lt,.85,1.15));tape.style.transform=`rotate(-3deg) scaleX(${tk})`;tape.style.opacity=1;
    words(h2,lt,[1.45],99)},bubbleAt:[540,980]}}

/* ================= S6 · Pickup at your place ================= */
function S6(){const [r,ov]=root();const {scene,cam}=stage({r:6,fov:32});
  scene.add(at(rbox(6.3,.3,4.7,.14,M.W),0,.15,0));
  const path=new THREE.CatmullRomCurve3([V(-2.2,.31,-.3),V(-1.55,.31,.2),V(-.45,.31,.45),V(.6,.31,.95),V(1.25,.31,1.6)]);
  const road=[];for(let i=0;i<=60;i++)road.push(path.getPointAt(i/60));scene.add(ribbon(road,.85,.03,M.G));
  for(let i=1;i<12;i++){const u=i/12,p=path.getPointAt(u),tg=path.getTangentAt(u);const d=at(rbox(.2,.012,.05,.02,M.W),p.x,.33,p.z);d.rotation.y=Math.atan2(-tg.z,tg.x);scene.add(d)}
  // JDC building with a sign on the roof
  const jdc=grp(at(rbox(1.7,1.15,1.2,.1,M.Y),0,.575,0),at(rbox(1.8,.1,1.3,.04,M.Yd),0,1.2,0),at(rbox(.7,.6,.05,.04,M.R),0,.32,.61));
  for(let k=0;k<5;k++)jdc.add(at(rbox(.66,.02,.055,.01,M.Rm),0,.1+k*.12,.62));
  const sign=canvasTex(1024,256,(g,w,h)=>{g.fillStyle='#D40511';g.beginPath();g.roundRect(0,0,w,h,30);g.fill();g.fillStyle='#fff';g.font='400 112px ArchivoBlack';g.textAlign='center';g.save();g.translate(w/2,140);g.scale(.86,1);g.fillText('JDC CENGKARENG',0,0);g.restore();g.font='700 36px Mono';g.fillStyle='#FFCC00';g.fillText('DHL EXPRESS SERVICE POINT',w/2,212)});
  jdc.add(at(rbox(1.9,.5,.06,.04,M.R),0,1.55,.1),at(new THREE.Mesh(new THREE.PlaneGeometry(1.84,.46),new THREE.MeshBasicMaterial({map:sign})),0,1.55,.135),at(cyl(.03,.03,.3,M.G),-.7,1.33,.1),at(cyl(.03,.03,.3,M.G),.7,1.33,.1));
  jdc.position.set(-2.2,.3,-1.45);scene.add(jdc);
  // customer's home
  const roofS=new THREE.Shape();roofS.moveTo(-.68,0);roofS.lineTo(0,.55);roofS.lineTo(.68,0);roofS.closePath();
  const home=grp(at(rbox(1.15,.8,1.0,.08,M.W),0,.4,0),at(ext(roofS,1.1,.05,M.R),0,.78,0),at(rbox(.26,.42,.05,.04,M.Y),-.2,.24,.51),at(rbox(.24,.22,.05,.04,M.G2),.25,.48,.51));
  home.position.set(2.55,.3,.45);home.rotation.y=-.75;scene.add(home);
  const pk=parcel(.42,.32,.36);scene.add(pk);const pkHome=V(1.86,.46,.92);
  // van with the service point's name on both sides
  const van=new THREE.Group();scene.add(van);
  const side=canvasTex(1024,256,(g,w,h)=>{g.fillStyle='#D40511';g.font='400 96px ArchivoBlack';g.save();g.translate(30,120);g.scale(.86,1);g.fillText('JDC CENGKARENG',0,0);g.restore();g.fillStyle='#1B1912';g.font='800 48px Mono';g.fillText('PICKUP · +62 877-7589-7478',34,205)});
  van.add(at(rbox(1.3,.66,.7,.14,M.Y),-.12,.55,0),at(rbox(.5,.5,.68,.12,M.Y),.62,.47,0),at(rbox(.12,.26,.6,.05,M.G2),.86,.6,0),at(rbox(.36,.2,.02,.04,M.G2),.62,.62,.35),at(rbox(.36,.2,.02,.04,M.G2),.62,.62,-.35));
  van.add(at(rbox(1.32,.09,.72,.03,M.R),-.12,.36,0));
  [1,-1].forEach(sd=>van.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.15,.29),new THREE.MeshBasicMaterial({map:side,transparent:true,side:THREE.DoubleSide})),-.12,.62,sd*.358,0,sd>0?0:Math.PI,0)));
  [[-.5,.36],[.55,.36],[-.5,-.36],[.55,-.36]].forEach(([x,z])=>van.add(at(puck(.15,.12,.05,M.G),x,.15,z,Math.PI/2,0,0)));
  van.add(at(rbox(.04,.08,.12,.02,M.W),.88,.38,.24),at(rbox(.04,.08,.12,.02,M.W),.88,.38,-.24),at(rbox(.04,.1,.1,.02,M.R),-.78,.5,.26),at(rbox(.04,.1,.1,.02,M.R),-.78,.5,-.26));
  van.traverse(o=>{if(o.isMesh)o.castShadow=true});van.scale.setScalar(.95);
  const num=txt(ov,'eyebrow','04',214,'font-size:40px');const h=txt(ov,'h1','<span>WE PICK UP</span>',262);const h2=txt(ov,'h1','<span class="red">AT YOUR PLACE.</span>',376,'font-size:104px');
  const sub=txt(ov,'sub','<span class="pillW">No need to bring it to JDC Cengkareng</span>',1395);
  return {root:r,scene,cam,update(lt){
    const yaw=Math.sin(lt*.2)*.12;cam.fov=38;cam.updateProjectionMatrix();cam.position.set(Math.sin(yaw)*16.4,12.3,Math.cos(yaw)*16.4);cam.lookAt(0,.75,.1);
    const go=eIO(prog(lt,.6,3.1)),back=eIO(prog(lt,4.7,7.4));let u=.06+go*.86-back*.84;u=clamp(u,0,1);
    const p=path.getPointAt(u),tg=path.getTangentAt(u);van.position.set(p.x,.31,p.z);
    const turn=eIO(prog(lt,3.9,4.6));van.rotation.y=Math.atan2(-tg.z,tg.x)+turn*Math.PI;van.position.y+=Math.abs(Math.sin(lt*14))*.012*(go>0&&go<1||back>0&&back<1?1:0);
    this.anchors={home:proj(home.position.clone().add(V(0,1.85,0)),cam),van:proj(van.position,cam)};const hop=prog(lt,3.3,3.95);const vp=van.position.clone().add(V(0,.75,0));
    if(hop<=0){pk.position.copy(pkHome);pk.scale.setScalar(1);pk.visible=true}else{const q=pkHome.clone().lerp(vp,eIO(hop));q.y+=Math.sin(hop*Math.PI)*.9;pk.position.copy(q);pk.rotation.y=hop*3;pk.scale.setScalar(1-eIn(hop)*.85);pk.visible=hop<1}
    show(num,lt,.2,99,30);words(h,lt,[.3],99);words(h2,lt,[1.5],99);show(sub,lt,5.05,99)}}}

/* ================= S7 · How it works: chat → box ================= */
function S7(){const [r,ov]=root();const {scene,cam}=stage({r:5});
  const phone=phoneObj(1.55);phone.position.set(-.85,2.0,.3);phone.rotation.set(-.08,.32,-.06);scene.add(phone);
  const chat=canvasTex(560,1220,()=>{});const scr=new THREE.Mesh(new THREE.PlaneGeometry(.8*1.55,1.72*1.55),new THREE.MeshBasicMaterial({map:chat,toneMapped:false}));scr.position.set(0,-.01*1.55,.1*1.55+.04);phone.add(scr);
  const pinAnchor=new THREE.Object3D();phone.add(pinAnchor);
  let last='';
  function drawChat(lt){const key=[lt>1.0,lt>3.5,lt>5.0&&lt<6.0,lt>6.0,lt>9.3].join();if(key===last)return;last=key;const g=chat.userData.g,w=560,h=1220;
    g.fillStyle='#F4F0E6';g.fillRect(0,0,w,h);g.fillStyle='#FFCC00';g.fillRect(0,0,w,170);
    g.fillStyle='#D40511';g.beginPath();g.arc(70,95,44,0,7);g.fill();g.fillStyle='#fff';g.font='400 30px ArchivoBlack';g.textAlign='center';g.fillText('JDC',70,106);g.textAlign='left';
    g.fillStyle='#1B1912';g.font='800 34px Jakarta';g.fillText('JDC Cengkareng',132,86);g.font='700 22px Mono';g.fillStyle='#6E1A0A';g.fillText('+62 877-7589-7478',132,122);
    g.fillStyle='rgba(27,25,18,.08)';g.beginPath();g.roundRect(170,196,220,40,20);g.fill();g.fillStyle='#8a7f66';g.font='700 18px Mono';g.textAlign='center';g.fillText('SAMPLE CHAT',280,222);g.textAlign='left';
    const msg=(y,txt,out)=>{g.font='600 27px Jakarta';const lines=txt.split('\n');const tw=Math.max(...lines.map(l=>g.measureText(l).width))+44,th=lines.length*36+30,x=out?w-tw-24:24;
      g.fillStyle=out?'#FFCC00':'#FFFFFF';g.beginPath();g.roundRect(x,y,tw,th,24);g.fill();g.fillStyle='#1B1912';lines.forEach((l,i)=>g.fillText(l,x+22,y+40+i*36));return y+th+18};
    let y=270;if(lt>1.0)y=msg(y,"Hi! I'd like to ship\na package overseas.",1);if(lt>3.5)y=msg(y,'A box of documents,\nabout 2 kg.',1);
    if(lt>5.0&&lt<6.0){g.fillStyle='#fff';g.beginPath();g.roundRect(24,y,120,56,24);g.fill();g.fillStyle='#b9b0a0';[0,1,2].forEach(i=>{g.beginPath();g.arc(56+i*28,y+28,7,0,7);g.fill()})}
    if(lt>6.0)y=msg(y,"Got it! We'll prepare\neverything for you.",0);
    if(lt>9.3){g.fillStyle='#fff';g.beginPath();g.roundRect(24,y,330,170,24);g.fill();g.fillStyle='#FFE58A';g.beginPath();g.roundRect(36,y+12,306,92,16);g.fill();
      g.fillStyle='#D40511';g.beginPath();g.arc(189,y+50,18,0,7);g.fill();g.beginPath();g.moveTo(173,y+58);g.lineTo(189,y+86);g.lineTo(205,y+58);g.fill();
      g.fillStyle='#1B1912';g.font='700 22px Jakarta';g.fillText('JDC Cengkareng · Lot 7A–7B',42,y+140);pinAnchor.position.set((189/w-.5)*.8*1.55,(.5-(y+60)/h)*1.72*1.55,.18)}
    chat.needsUpdate=true}
  // dieline that folds into the parcel
  const bx=new THREE.Group();bx.position.set(1.35,0,-1.9);bx.scale.setScalar(1.2);bx.rotation.y=-.5;scene.add(bx);const s=1.0,th=.05;
  bx.add(at(rbox(s,th,s,.02,M.Yl),0,th/2,0));
  const sides=[[0,1],[0,-1],[1,0],[-1,0]].map(([x,z])=>{const pv=new THREE.Group();pv.position.set(x*s/2,th,z*s/2);const p=rbox(x?s*.98:s,th,x?s:s*.98,.02,M.Y);p.geometry=new RoundedBoxGeometryFix(x?s:s,th,x?s:s);
    p.position.set(x*s/2,0,z*s/2);pv.add(p);bx.add(pv);return {pv,x,z}});
  const lid=new THREE.Group();sides[1].pv.children[0].add(lid);lid.position.set(0,0,-s/2);lid.add(at(rbox(s,th,s,.02,M.Y),0,0,-s/2));
  const btape=at(rbox(.3,.02,1.06,.01,new THREE.MeshPhysicalMaterial({map:tapeTex(Math.PI/2),roughness:.45})),0,s+th+.02,0);bx.add(btape);
  const blab=at(new THREE.Mesh(new THREE.PlaneGeometry(.62,.41),new THREE.MeshPhysicalMaterial({map:labelTex(),roughness:.55})),.12,s*.5+th,s/2+th/2+.012);bx.add(blab);
  const stamp=B.A20();stamp.scale.setScalar(.38);scene.add(stamp);
  const eb=txt(ov,'eyebrow','HOW IT WORKS',214);const h=txt(ov,'h1','<span>CHAT.</span> <span>TELL.</span> <span class="red">DONE.</span>',262);
  const steps=[['01','Chat with us on WhatsApp'],['02',"Tell us what you're shipping"],['03','We prepare everything, start to finish']].map((s,i)=>{const e=el('div','step',`<div class="n">${s[0]}</div><div class="t">${s[1]}</div>`,ov);e.style.top=(1250+i*96)+'px';e.style.height='82px';e.style.opacity=0;return e});
  const stepAt=[.7,3.4,5.8];
  return {root:r,scene,cam,update(lt,t){
    cam.position.set(.2+Math.sin(lt*.25)*.4,4.2,14.2);cam.lookAt(.3,1.25,0);
    phone.position.y=2.05+Math.sin(lt*1.4)*.05;drawChat(lt);
    // fold: sides 6.4–7.5 (staggered), lid 7.6–8.1, tape 8.0, label 8.3, stamp 8.6
    sides.forEach(({pv,x,z},i)=>{const a=eIO(prog(lt,6.4+i*.15,7.1+i*.15))*Math.PI/2;if(x)pv.rotation.z=x*a;else pv.rotation.x=-z*a});
    lid.rotation.x=eIO(prog(lt,7.55,8.1))*Math.PI/2;
    btape.visible=lt>8.0;btape.scale.set(1,1,Math.max(.001,eOut(prog(lt,8.0,8.3))));btape.position.y=s+th*1.5+.012;
    const ls=spring(lt-8.3,14,.45);blab.visible=lt>8.25;blab.scale.setScalar(Math.max(.001,lerp(1.5,1,ls)));
    const sk=spring(lt-8.6,12,.45);stamp.visible=lt>8.55;stamp.position.set(1.95,lerp(3.6,2.05,sk),-1.25);stamp.rotation.set(.9,0,.3);this.anchors={stamp:proj(stamp.position,cam)};
    scene.updateMatrixWorld(true);this.pinScreen=proj(pinAnchor.getWorldPosition(new THREE.Vector3()),cam);
    show(eb,lt,.25,99,30);words(h,lt,[.4,.65,.9],99);
    steps.forEach((e,i)=>{const k=spring(lt-(stepAt[i]-.15),15,.55);e.style.opacity=clamp((lt-(stepAt[i]-.15))*6);e.style.transform=`translateX(${(1-k)*-80}px)`;e.classList.toggle('on',lt>=stepAt[i]&&(i===2||lt<stepAt[i+1]))})}}}
function RoundedBoxGeometryFix(w,h,d){return new THREE.BoxGeometry(w,h,d)}

/* ================= S8 · Location (GPT diorama, 2.5D) ================= */
function S8(){const [r,ov]=root();
  const wrap=el('div',null,null,ov);wrap.style.cssText='position:absolute;left:20px;top:650px;width:1040px;height:587px;perspective:1600px';
  const map=el('div',null,'<img src="../../inbox/jdc/jdc_A21_airport-diorama.png" style="width:100%;height:100%;display:block">',wrap);map.style.cssText='position:absolute;inset:0;transform-origin:50% 60%;filter:drop-shadow(0 30px 30px rgba(107,74,0,.28))';
  const pin=el('img',null,null,ov);pin.src='../../inbox/jdc/jdc_A23_map-pin.png';pin.style.cssText='position:absolute;width:190px;height:190px';
  const plab=el('div',null,'<span style="font:700 15px Mono;letter-spacing:.14em;color:#D40511;display:block">SERVICE POINT</span>JDC CENGKARENG',ov);plab.style.cssText='position:absolute;background:#fff;border-radius:16px;padding:10px 18px 12px;font:400 30px ArchivoBlack;color:#1B1912;box-shadow:0 14px 0 -6px rgba(122,90,0,.25);white-space:nowrap;transform-origin:50% 100%';
  const plane=el('img',null,null,ov);plane.src='../../inbox/jdc/jdc_A22_cargo-plane.png';plane.style.cssText='position:absolute;width:300px;height:300px';
  const eb=txt(ov,'eyebrow','FIND US',214);const h=txt(ov,'h2','<span>SOEWARNA BUSINESS PARK</span>',268,'font-size:70px');
  const lot=txt(ov,'sub','<span class="pillR">LOT 7A–7B</span>',358);const air=txt(ov,'sub','<span class="pillW" style="display:inline-flex;align-items:center;gap:12px;font:700 27px Mono;letter-spacing:.04em"><svg viewBox="0 0 24 30" style="width:22px;height:28px"><path d="M12 29C5 20 1 15 1 10.5A11 11 0 0 1 23 10.5C23 15 19 20 12 29Z" fill="#D40511"/><circle cx="12" cy="10.5" r="4.2" fill="#fff"/></svg>Soekarno-Hatta International Airport Area</span>',1300);
  const hero=[.581,.7];
  return {root:r,scene:null,cam:null,update(lt){
    const kb=eOut(lt/10);map.style.transform=`rotateX(${12-kb*4}deg) rotateZ(${-1+kb*2}deg) scale(${1+kb*.06})`;
    const px=20+hero[0]*1040,py=650+hero[1]*587-kb*10;const d=spring(lt-.75,12,.38);
    this.anchors={pin:[px,py-6]};pin.style.left=(px-95)+'px';pin.style.top=(py-170-(1-d)*420)+'px';pin.style.opacity=clamp((lt-.75)*8);pin.style.transform=`scale(${lerp(.8,1,d)},${lerp(1.25,1,d)})`;
    const lk=spring(lt-2.75,14,.5);plab.style.left=(px-plab.offsetWidth/2)+'px';plab.style.top=(py-300)+'px';plab.style.opacity=clamp((lt-2.75)*6);plab.style.transform=`scale(${lk})`;
    const f=eIO(prog(lt,5.2,8.6));plane.style.left=lerp(-320,1150,f)+'px';plane.style.top=lerp(1260,470,f)+'px';plane.style.transform=`rotate(-24deg) scale(${lerp(.55,1.05,f)})`;plane.style.opacity=f>0&&f<1?1:0;
    show(eb,lt,.25,99,30);words(h,lt,[.45],99);show(lot,lt,2.75,99);show(air,lt,4.75,99,30)}}}

/* ================= S9 · End card: seal it ================= */
function S9(){const [r,ov]=root();const {scene,cam}=stage({r:5});
  const tt=at(puck(1.9,.16,.07,M.W),0,.08,0);scene.add(tt);
  const box=new THREE.Group();box.position.set(0,.16,0);scene.add(box);const bw=1.9,bh=1.35,bd=1.45,t=.07;
  box.add(at(rbox(bw,bh,bd,.16,M.Y),0,bh/2,0));box.add(at(rbox(bw-.12,.02,bd-.12,.01,M.Yin),0,bh-.01,0));
  const flaps=[[0,1,bd/2,bw],[0,-1,bd/2,bw],[1,0,bw*.42,bd],[-1,0,bw*.42,bd]].map(([x,z,len,wid],i)=>{const pv=new THREE.Group();pv.position.set(x*bw/2,bh,z*bd/2);
    const f=rbox(x?len:wid-.04,t*.8,x?wid-.04:len,.03,M.Y);f.position.set(-x*len/2,0,-z*len/2);pv.add(f);box.add(pv);return {pv,x,z,i}});
  const tp=at(rbox(.42,.03,bd+.06,.015,new THREE.MeshPhysicalMaterial({map:tapeTex(Math.PI/2),roughness:.45,clearcoat:.3})),0,bh+.06,0);box.add(tp);
  const lab=at(new THREE.Mesh(new THREE.PlaneGeometry(1.4,.93),new THREE.MeshPhysicalMaterial({map:labelTex({top:'SHIP WITH',num:'WA 0877 7589 7478'}),roughness:.55})),0,bh*.5,bd/2+.012);box.add(lab);
  // phone that dials the number in sync with the voice-over
  const PS=1.18,phone=phoneObj(PS);scene.add(phone);
  const dial=canvasTex(560,1220,()=>{});const scr=new THREE.Mesh(new THREE.PlaneGeometry(.8*PS,1.72*PS),new THREE.MeshBasicMaterial({map:dial,toneMapped:false}));scr.position.set(0,-.01*PS,.1*PS+.04);phone.add(scr);
  const NUM='087775897478',D=[6.95,7.25,7.58,7.9,8.3,8.64,8.98,9.34,10.05,10.4,10.74,11.08];
  const typed=lt=>D.filter(d=>lt>=d).length;const fmt=n=>NUM.slice(0,n).replace(/^(\d{4})(\d{0,4})(\d{0,4}).*/,(m,a,b,c)=>[a,b,c].filter(Boolean).join(' '))||NUM.slice(0,n);
  let lastKey='';
  function drawDial(lt){const n=typed(lt),pressed=D.findIndex(d=>lt>=d&&lt<d+.2),done=lt>=11.45,go=lt>=11.95,caret=Math.floor(lt*2.5)%2;
    const key=[n,pressed,done,go,caret].join();if(key===lastKey)return;lastKey=key;const g=dial.userData.g,w=560,h=1220;
    g.fillStyle='#F4F0E6';g.fillRect(0,0,w,h);g.fillStyle='#FFCC00';g.fillRect(0,0,w,160);
    g.fillStyle='#D40511';g.beginPath();g.arc(72,88,44,0,7);g.fill();g.fillStyle='#fff';g.font='400 30px ArchivoBlack';g.textAlign='center';g.fillText('JDC',72,99);g.textAlign='left';
    g.fillStyle='#1B1912';g.font='800 34px Jakarta';g.fillText('JDC Cengkareng',134,80);g.font='700 21px Mono';g.fillStyle='#6E1A0A';g.fillText('SERVICE POINT · WHATSAPP',134,116);
    g.fillStyle='#fff';g.beginPath();g.roundRect(28,196,504,150,28);g.fill();g.strokeStyle=n>0&&!done?'#D40511':'#E6DFCC';g.lineWidth=4;g.stroke();
    g.fillStyle='#8a7f66';g.font='700 20px Mono';g.fillText('PHONE NUMBER',56,236);
    const txtN=fmt(n);g.fillStyle='#1B1912';g.font='800 50px Mono';g.fillText(txtN,56,306);if(!done&&caret){const tw=g.measureText(txtN).width;g.fillStyle='#D40511';g.fillRect(60+tw,264,5,52)}
    if(!done){const keys='123456789 0 '.split('');keys.forEach((k,i)=>{if(k===' ')return;const cx=110+(i%3)*170,cy=470+Math.floor(i/3)*160;const on=pressed>=0&&NUM[pressed]===k;
      g.fillStyle=on?'#D40511':'#fff';g.beginPath();g.arc(cx,cy,64,0,7);g.fill();if(!on){g.strokeStyle='#E6DFCC';g.lineWidth=3;g.stroke()}
      g.fillStyle=on?'#fff':'#1B1912';g.font='800 50px Mono';g.textAlign='center';g.fillText(k,cx,cy+18);g.textAlign='left'})}
    else{g.fillStyle='#fff';g.beginPath();g.roundRect(28,390,504,330,28);g.fill();g.fillStyle='#2BB673';g.beginPath();g.arc(92,470,30,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=7;g.beginPath();g.moveTo(78,471);g.lineTo(89,483);g.lineTo(108,458);g.stroke();
      g.fillStyle='#1B1912';g.font='800 32px Jakarta';g.fillText('Contact ready',140,464);g.fillStyle='#8a7f66';g.font='600 24px Jakarta';g.fillText('JDC Cengkareng · Service Point',140,500);
      g.fillStyle='#6d6656';g.font='600 23px Jakarta';g.fillText('Soewarna Business Park, Lot 7A–7B',56,574);g.fillText('Soekarno-Hatta Int’l Airport Area',56,608);
      g.fillStyle=go?'#1E8F57':'#2BB673';g.beginPath();g.roundRect(56,640,448,64,32);g.fill();g.fillStyle='#fff';g.font='800 28px Jakarta';g.textAlign='center';g.fillText(go?'Opening chat…':'Start chat',280,682);g.textAlign='left';
      if(go){g.fillStyle='#FFCC00';g.beginPath();g.roundRect(150,770,382,110,26);g.fill();g.fillStyle='#1B1912';g.font='700 27px Jakarta';g.fillText('Hi JDC Cengkareng!',176,815);g.fillText('I want to ship…',176,853)}}
    dial.needsUpdate=true}
  const eb=txt(ov,'eyebrow','DHL EXPRESS SERVICE POINT',214);const h=txt(ov,'h1','<span class="red">JDC CENGKARENG</span>',262,'font-size:104px');
  const tag=txt(ov,'h1','<span>SHIPPING,</span> <span class="red">UNBOXED.</span>',270,'font-size:90px');
  const cta=txt(ov,'sub','<span class="pillR" style="font-size:40px;display:inline-flex;align-items:center;gap:16px"><img src="../preview/whatsapp.svg" style="height:46px;transform:skewX(8deg)">CHAT ON WHATSAPP</span>',1222);
  const numEl=txt(ov,'sub',NUM.split('').map((c,i)=>`<span class="dg" style="display:inline-block;margin-right:${i===3||i===7?'26px':'0'}">${c}</span>`).join(''),1318,'font:800 88px Mono;color:#1B1912;letter-spacing:-.01em');
  const digits=[...numEl.querySelectorAll('.dg')];
  const pick=txt(ov,'sub','<span class="pillW" style="background:#FFCC00;font:700 26px Mono;letter-spacing:.1em">✦ PICKUP AVAILABLE ✦</span>',1448);
  return {root:r,scene,cam,update(lt){
    cam.position.set(Math.sin(lt*.22)*.5,4.5,11.2);cam.lookAt(0,-.1,0);
    // box seals (0–2.4), then steps back to make room for the phone (4.6–5.5)
    const mv=eIO(prog(lt,4.6,5.5));box.position.set(lerp(0,-1.45,mv),.16,lerp(0,-.9,mv));box.scale.setScalar(lerp(1,.62,mv));tt.position.set(lerp(0,-1.45,mv),.08,lerp(0,-.9,mv));tt.scale.setScalar(lerp(1,.62,mv));
    box.rotation.y=-.35+Math.sin(lt*.3)*.08+(lt<1.3?(1-eOut(lt/1.3))*.4:0)+mv*.5;
    flaps.forEach(({pv,x,z,i})=>{const c=spring(lt-(.15+i*.18),12,.5);const a=lerp(2.05,0,clamp(c,0,1.2));if(x)pv.rotation.z=-x*a;else pv.rotation.x=z*a;});
    const tk=eOut(prog(lt,1.3,1.6));tp.scale.set(1,1,Math.max(.001,tk));tp.visible=lt>1.28;
    const ls=spring(lt-1.9,14,.45);lab.visible=lt>1.85;lab.scale.setScalar(Math.max(.001,lerp(1.5,1,ls)));
    const pr=spring(lt-4.75,9,.55);phone.visible=lt>4.7;phone.position.set(.42,lerp(-4.5,.82,pr)+Math.sin(lt*1.5)*.04,1.4);phone.rotation.set(-.12,-.22+Math.sin(lt*.6)*.04,.03);drawDial(lt);
    scene.updateMatrixWorld(true);
    this.anchors={box:proj(box.localToWorld(new THREE.Vector3(0,bh,0)),cam),cta:[540,1262],num:[540,1372]};
    show(eb,lt,1.3,99,30);words(h,lt,[3.2],99);
    const tg=lt>=11.6;eb.style.opacity=tg?1-prog(lt,11.6,11.8):eb.style.opacity;h.style.opacity=tg?1-prog(lt,11.6,11.8):1;words(tag,lt,[11.75,11.95]);tag.style.opacity=lt>11.7?1:0;
    show(cta,lt,5.3);show(numEl,lt,5.9);show(pick,lt,6.4);
    digits.forEach((e,i)=>{const on=lt>=D[i],k=spring(lt-D[i],18,.4);e.style.color=on?'#1B1912':'rgba(27,25,18,.13)';e.style.transform=on?`translateY(${(1-k)*-26}px) scale(${1+(1-Math.min(k,1))*.25})`:'none';
      e.style.background=on&&lt<D[i]+.32?'rgba(255,204,0,.75)':'transparent';e.style.borderRadius='10px'})}}}

return {s1:S1(),s2:S2(),s3:S3(),s4:S4(),s5:S5(),s6:S6(),s7:S7(),s8:S8(),s9:S9()};
}
