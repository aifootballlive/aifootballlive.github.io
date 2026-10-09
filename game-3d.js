(()=>{
'use strict';
let THREE=null,GLTFLoader=null,scene=null,camera=null,renderer=null,clock=null;
let ball=null,keeper=null,playerA=null,playerB=null,goalObject=null;
let runtimeSettings={cameraZoom:100,stadiumExposure:116,idleMotion:100,ballSize:100,goalSize:100,sceneLabel:true};
let animation=null,installed=false,hooked=false,realMode=false;
let playerALoad=null,pendingPlayerA=null,pendingPlayerB=null;
const mixers=[];
const DEMO=!!window.AIFootballDemoMode;
const demoActors=new Map(),modelCache=new Map();
let demoTeams=[],teamGeneration=0,demoKeeperReady=false,SkeletonClone=null;
const phaseEvent=phase=>window.dispatchEvent(new CustomEvent('football-scene-phase',{detail:{phase}}));

const ASSETS={
  playerA:'./assets/models/player-a.glb?v=6',
  playerB:'./assets/models/player-a.glb?v=6',
  keeper:'./assets/models/player-a.glb?v=6'
};

const HOME={A:{x:-3.85,z:1.35},B:{x:-3.55,z:2.35}};
const VIEW={idle:{position:[-7.35,2.45,5.65],target:[.45,1.05,.05]},shot:{position:[-6.15,2.22,4.35],target:[1.15,.98,0]}};
if(DEMO){VIEW.idle={position:[-12,4.6,0],target:[1,1.05,0]};VIEW.shot=VIEW.idle;}
const GOAL_Z=DEMO?2.35:0,SHOT_Z=DEMO?.25:0;
const shotSide=team=>team==='A'?1:team==='B'?-1:.35;
const shotTarget=team=>GOAL_Z+shotSide(team)*(DEMO?.60:.78);
const RUN_MS=1100,TURN_MS=190,KICK_CONTACT_MS=180;
const PLAYER_A_TIMING={turn:300,run:1350,contact:300};
const cameraTarget={x:VIEW.idle.target[0],y:VIEW.idle.target[1],z:VIEW.idle.target[2]};
const facingCamera=home=>Math.atan2(VIEW.idle.position[0]-home.x,VIEW.idle.position[2]-home.z);
const angleLerp=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const smooth=t=>t*t*(3-2*t);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

function addStageShell(){
  if(document.getElementById('game3dStage'))return document.getElementById('game3dStage');
  const score=document.querySelector('.score');
  if(!score)return null;
  const wrap=document.createElement('section');
  wrap.id='game3dStage';
  wrap.innerHTML='<div id="game3dLabel">3D MAÇ SAHNESİ</div><div id="game3dCanvas"></div>';
  wrap.style.cssText='position:relative;height:clamp(400px,54vw,620px);margin:5px 0;border:1px solid #2b3556;border-radius:12px;overflow:hidden;background:linear-gradient(180deg,#10192a,#112c1b);';
  const label=wrap.firstElementChild;
  label.style.cssText='position:absolute;z-index:3;left:8px;top:7px;padding:4px 7px;border-radius:7px;background:rgba(8,14,26,.72);color:#fff;font-size:8px;font-weight:900;letter-spacing:.4px;pointer-events:none';
  if(DEMO)document.querySelector('.scene-anchor').replaceWith(wrap);else score.insertAdjacentElement('afterend',wrap);
  return wrap;
}
function setLabel(text){const el=document.getElementById('game3dLabel');if(el){el.textContent=text;el.style.display=runtimeSettings.sceneLabel?'block':'none'}}
function apply3DSettings(next={}){
  runtimeSettings={...runtimeSettings,...next};
  const exp=Math.max(.7,Math.min(1.5,(Number(runtimeSettings.stadiumExposure)||116)/100));
  if(renderer)renderer.toneMappingExposure=exp;
  if(ball){const s=Math.max(.7,Math.min(1.6,(Number(runtimeSettings.ballSize)||100)/100));ball.scale.setScalar(s)}
  if(goalObject){const s=Math.max(.8,Math.min(1.3,(Number(runtimeSettings.goalSize)||100)/100));goalObject.scale.set(1,s,s)}
  const label=document.getElementById('game3dLabel');if(label)label.style.display=runtimeSettings.sceneLabel?'block':'none';
}
async function loadThree(){
  if(THREE)return THREE;
  const mod=await import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js');THREE=mod;
  try{const loaderMod=await import('https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js');GLTFLoader=loaderMod.GLTFLoader;}catch(e){console.warn('GLTFLoader yüklenemedi; basit 3D kullanılacak',e)}
  return THREE;
}
function mat(color,rough=.65,metal=.03){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function mesh(g,m){const x=new THREE.Mesh(g,m);x.castShadow=true;x.receiveShadow=true;return x}
function createPlayer(team){
  const root=new THREE.Group();const skin=mat(0xe9b38f,.88,0),hair=mat(0x2e1c13,.9,0);const blue=0x173f9b,red=0xc91f2c,yellow=0xffd21f;const main=team==='A'?blue:red;
  const torso=mesh(new THREE.CapsuleGeometry(.28,.55,6,12),mat(main,.7,0));torso.position.y=1.35;root.add(torso);
  const stripe=mesh(new THREE.BoxGeometry(.09,.75,.035),mat(yellow,.65,0));stripe.position.set(0,1.35,.29);root.add(stripe);
  const skirt=mesh(new THREE.CylinderGeometry(.27,.38,.30,20,1,true),mat(team==='A'?0x152b59:0x6d1821,.72,0));skirt.position.y=.94;root.add(skirt);
  const head=mesh(new THREE.SphereGeometry(.22,20,16),skin);head.position.y=2.03;root.add(head);
  const hairCap=mesh(new THREE.SphereGeometry(.228,20,12,0,Math.PI*2,0,Math.PI*.58),hair);hairCap.position.set(0,2.10,0);root.add(hairCap);
  const pony=mesh(new THREE.CapsuleGeometry(.055,.28,4,8),hair);pony.position.set(0,1.96,-.24);pony.rotation.x=.45;root.add(pony);
  const armGeo=new THREE.CapsuleGeometry(.07,.48,5,8),legGeo=new THREE.CapsuleGeometry(.09,.62,5,8);
  const la=mesh(armGeo,skin),ra=mesh(armGeo,skin);la.position.set(-.36,1.36,0);ra.position.set(.36,1.36,0);la.rotation.z=-.18;ra.rotation.z=.18;root.add(la,ra);
  const ll=mesh(legGeo,skin),rl=mesh(legGeo,skin);ll.position.set(-.14,.43,0);rl.position.set(.14,.43,0);root.add(ll,rl);
  const sockMat=mat(team==='A'?0x142f68:0x7f1e29,.7,0);const lsock=mesh(new THREE.CylinderGeometry(.075,.075,.28,12),sockMat),rsock=lsock.clone();lsock.position.set(-.14,.24,0);rsock.position.set(.14,.24,0);root.add(lsock,rsock);
  const shoeMat=mat(0xffffff,.55,.05);const ls=mesh(new THREE.BoxGeometry(.18,.10,.34),shoeMat),rs=ls.clone();ls.position.set(-.14,.07,.09);rs.position.set(.14,.07,.09);root.add(ls,rs);
  root.userData={team,real:false,torso,ll,rl,la,ra,homeX:(HOME[team]||HOME.A).x,homeZ:(HOME[team]||HOME.A).z,baseRotationY:facingCamera(HOME[team]||HOME.A)};root.position.set(root.userData.homeX,0,root.userData.homeZ);root.rotation.y=root.userData.baseRotationY;return root;
}
function createKeeper(){
  const root=new THREE.Group();const skin=mat(0xdba47e,.88,0),kit=mat(0x159b57,.55,.02),dark=mat(0x0d5c37,.75,0);
  const body=mesh(new THREE.CapsuleGeometry(.31,.62,6,12),kit);body.position.y=1.33;root.add(body);
  const head=mesh(new THREE.SphereGeometry(.23,20,16),skin);head.position.y=2.06;root.add(head);
  const armGeo=new THREE.CapsuleGeometry(.075,.54,5,8),legGeo=new THREE.CapsuleGeometry(.095,.62,5,8);
  const la=mesh(armGeo,skin),ra=mesh(armGeo,skin);la.position.set(-.4,1.38,0);ra.position.set(.4,1.38,0);la.rotation.z=-.4;ra.rotation.z=.4;root.add(la,ra);
  const ll=mesh(legGeo,dark),rl=mesh(legGeo,dark);ll.position.set(-.15,.45,0);rl.position.set(.15,.45,0);root.add(ll,rl);
  root.userData={real:false,la,ra,ll,rl,homeX:3.75,homeZ:0};root.position.set(3.75,0,0);root.rotation.y=-Math.PI/2;return root;
}
function createGoal(){
  const g=new THREE.Group(),white=mat(0xf7f8fb,.34,.06);
  const goalX=4.42,backX=5.42,halfW=3.66,height=2.44,r=.055;
  const cyl=(radius,length)=>new THREE.CylinderGeometry(radius,radius,length,14);
  const postL=mesh(cyl(r,height),white);postL.position.set(goalX,height/2,-halfW);g.add(postL);
  const postR=mesh(cyl(r,height),white);postR.position.set(goalX,height/2,halfW);g.add(postR);
  const bar=mesh(cyl(r,halfW*2),white);bar.position.set(goalX,height,0);bar.rotation.x=Math.PI/2;g.add(bar);
  const backL=mesh(cyl(r*.8,backX-goalX),white);backL.position.set((goalX+backX)/2,.11,-halfW);backL.rotation.z=Math.PI/2;g.add(backL);
  const backR=mesh(cyl(r*.8,backX-goalX),white);backR.position.set((goalX+backX)/2,.11,halfW);backR.rotation.z=Math.PI/2;g.add(backR);
  const netMat=new THREE.LineBasicMaterial({color:0xeef3f8,transparent:true,opacity:.70});
  const line=(a,b)=>g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]),netMat));
  for(let y=.10;y<=height;y+=.18){
    line([backX,y,-halfW],[backX,y,halfW]);
    for(const z of [-halfW,halfW])line([goalX,y,z],[backX,y,z]);
  }
  for(let z=-halfW;z<=halfW;z+=.20){
    line([backX,.10,z],[backX,height,z]);
    line([goalX,height,z],[backX,height,z]);
    line([goalX,.08,z],[backX,.08,z]);
  }
  for(let x=goalX;x<=backX;x+=.16){
    for(const z of [-halfW,halfW])line([x,.08,z],[x,height,z]);
  }
  return g;
}
function addStadium(){
  const back=new THREE.Group();
  const dark=mat(0x161d2b,.88,0),stepMat=mat(0x252d3d,.9,0);
  const crowdColors=[0x162e68,0xf0c52f,0xb52b36,0xe8e4dc,0x4a4650,0x7d674f];
  const addCrowdRow=(x,y,zStart,count,spacing,axis='z',seed=0)=>{
    const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.075,7,6),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,vertexColors:true}),count);
    const torsos=new THREE.InstancedMesh(new THREE.BoxGeometry(.16,.22,.09),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,vertexColors:true}),count);
    const mh=new THREE.Matrix4(),mt=new THREE.Matrix4();
    for(let i=0;i<count;i++){
      const pos=axis==='z'?[x,y,zStart+i*spacing]:[zStart+i*spacing,y,x];
      const jitter=((i*17+seed*13)%11-5)*.008;
      mh.makeTranslation(pos[0],pos[1]+.13+jitter,pos[2]);heads.setMatrixAt(i,mh);
      mt.makeTranslation(pos[0],pos[1],pos[2]);torsos.setMatrixAt(i,mt);
      const col=new THREE.Color(crowdColors[(i+seed)%crowdColors.length]);
      heads.setColorAt(i,new THREE.Color([0xd7ad8b,0xb98264,0x8c5b45,0xe2bea0][(i+seed)%4]));
      torsos.setColorAt(i,col);
    }
    back.add(torsos,heads);
  };

  // Main stand directly behind the goal.
  for(let row=0;row<11;row++){
    const step=mesh(new THREE.BoxGeometry(.72,.30,11.2),row%2?dark:stepMat);
    step.position.set(6.05+row*.46,.58+row*.39,0);back.add(step);
    addCrowdRow(5.93+row*.46,.86+row*.39,-5.25,82,.128,'z',row);
  }
  // Upper deck / dark roof gives the same packed-stadium framing as the reference.
  const roof=mesh(new THREE.BoxGeometry(5.8,.32,12.6),mat(0x0c111a,.82,.03));roof.position.set(8.6,5.35,0);back.add(roof);
  for(let z=-5.4;z<=5.4;z+=1.35){
    const lamp=mesh(new THREE.BoxGeometry(.24,.18,.85),new THREE.MeshStandardMaterial({color:0xf4f7ff,emissive:0xd7e7ff,emissiveIntensity:3.0,roughness:.35}));
    lamp.position.set(5.75,4.92,z);back.add(lamp);
  }

  // Side stand visible on the left/background.
  for(let row=0;row<7;row++){
    const terrace=mesh(new THREE.BoxGeometry(15,.27,.78),row%2?dark:stepMat);
    terrace.position.set(-1.0,.72+row*.38,-4.35-row*.52);back.add(terrace);
    addCrowdRow(-7.8,.98+row*.38,-4.15-row*.52,84,.165,'x',row+20);
  }

  // Rails and pitch-side LED boards.
  const railMat=mat(0x8993a2,.45,.22);
  for(const y of [1.02,2.58,4.10]){
    const rail=mesh(new THREE.BoxGeometry(.055,.055,11.0),railMat);rail.position.set(5.62,y,0);back.add(rail);
  }
  const led=(x,z,w,label,bg,fg='#ffffff')=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=220;
    const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,220);
    ctx.fillStyle=fg;ctx.font='900 82px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,512,112);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const board=mesh(new THREE.BoxGeometry(w,.62,.10),new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:.18,roughness:.55}));
    board.position.set(x,.34,z);back.add(board);
  };
  led(.0,-3.62,4.0,'SARI-LACİVERT','#102f73','#f8d437');
  led(3.15,-3.62,2.1,'AI FOOTBALL','#1f2945','#ffffff');
  led(5.50,-2.10,.10,' ','#202631');
  const sideA=mesh(new THREE.BoxGeometry(.11,.62,3.0),new THREE.MeshStandardMaterial({color:0x143b86,emissive:0x0d2453,emissiveIntensity:.25,roughness:.55}));sideA.position.set(5.58,.34,-2.25);back.add(sideA);
  const sideB=mesh(new THREE.BoxGeometry(.11,.62,3.0),new THREE.MeshStandardMaterial({color:0xc72a35,emissive:0x5f1218,emissiveIntensity:.25,roughness:.55}));sideB.position.set(5.58,.34,2.25);back.add(sideB);

  // Stadium light wash.
  const flood1=new THREE.PointLight(0xdceaff,2.4,28,2);flood1.position.set(3.8,6.2,-4.8);back.add(flood1);
  const flood2=new THREE.PointLight(0xfff3d4,1.8,24,2);flood2.position.set(1.5,5.6,4.6);back.add(flood2);
  scene.add(back);
}
function grassMaterial(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ctx=canvas.getContext('2d'),data=ctx.createImageData(512,512);
  let seed=1729;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<data.data.length;i+=4){const n=random()*30;data.data[i]=32+n*.6;data.data[i+1]=63+n;data.data[i+2]=22+n*.4;data.data[i+3]=255;}
  ctx.putImageData(data,0,0);for(let i=0;i<25000;i++){const x=random()*512,y=random()*512;ctx.strokeStyle=i%2?'rgba(154,174,71,.22)':'rgba(17,41,12,.26)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*2,y-2-random()*5);ctx.stroke();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(18,12);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return new THREE.MeshStandardMaterial({map:texture,roughness:.93,metalness:0});
}
function setupScene(){
  const holder=document.getElementById('game3dCanvas');if(!holder)return;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x09111f);camera=new THREE.PerspectiveCamera(40,1,.1,100);camera.position.set(...VIEW.idle.position);camera.lookAt(...VIEW.idle.target);scene.fog=new THREE.Fog(0x09111f,18,42);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:DEMO,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;if('outputColorSpace' in renderer)renderer.outputColorSpace=THREE.SRGBColorSpace;
  if(DEMO){scene.background=null;scene.fog=null;renderer.setClearColor(0x000000,0);holder.style.background='url("assets/backgrounds/stadium-v1.png") center center / cover no-repeat';}
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=Math.max(.7,Math.min(1.5,(Number(runtimeSettings.stadiumExposure)||116)/100));
  holder.appendChild(renderer.domElement);renderer.domElement.style.cssText='display:block;width:100%;height:100%';holder.style.cssText='width:100%;height:100%';
  if(DEMO)holder.style.background='url("assets/backgrounds/stadium-v1.png") center center / cover no-repeat';
  scene.add(new THREE.HemisphereLight(0xdcecff,0x18331d,1.1));const sun=new THREE.DirectionalLight(0xffffff,2.8);sun.position.set(-3,8,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.bias=-.0003;sun.shadow.normalBias=.015;scene.add(sun);const fill=new THREE.DirectionalLight(0x86a7ff,1.1);fill.position.set(4,4,5);scene.add(fill);
  const pitch=mesh(new THREE.PlaneGeometry(36,24),grassMaterial());pitch.rotation.x=-Math.PI/2;pitch.receiveShadow=true;scene.add(pitch);
  const lineMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.88});
  const line=(pts,closed=false)=>{
    const v=pts.map(p=>new THREE.Vector3(p[0],.016,p[1]));
    if(closed)v.push(v[0].clone());
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(v),lineMat));
  };
  // Visible goal-side half of a football pitch.
  line([[-7.6,-4.35],[5.7,-4.35],[5.7,4.35],[-7.6,4.35]],true);
  // Penalty area and six-yard box.
  line([[.65,-3.55],[4.42,-3.55],[4.42,3.55],[.65,3.55]],false);
  line([[2.75,-1.95],[4.42,-1.95],[4.42,1.95],[2.75,1.95]],false);
  // Penalty spot and a subtle penalty arc.
  const penaltySpot=mesh(new THREE.CircleGeometry(.045,18),mat(0xffffff,.75,0));penaltySpot.rotation.x=-Math.PI/2;penaltySpot.position.set(.95,.018,0);scene.add(penaltySpot);
  const arcPts=[];for(let a=-1.05;a<=1.05;a+=.09)arcPts.push([.95-1.15*Math.cos(a),1.15*Math.sin(a)]);line(arcPts,false);
  if(!DEMO)addStadium();
  if(DEMO){const points=[[-3.25,.014,-5],[-3.25,.014,5]],line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),lineMat);scene.add(line);}
  goalObject=createGoal();scene.add(goalObject);keeper=createKeeper();keeper.userData.homeZ=GOAL_Z;keeper.position.z=GOAL_Z;playerA=createPlayer('A');playerB=createPlayer('B');scene.add(keeper,playerA,playerB);
  ball=mesh(new THREE.SphereGeometry(.18,28,22),mat(0xfafafa,.40,.02));ball.position.set(-1.0,.18,SHOT_Z);
  const directions=new THREE.IcosahedronGeometry(1,0).getAttribute('position'),seen=new Set();
  for(let i=0;i<directions.count;i++){const v=new THREE.Vector3().fromBufferAttribute(directions,i).normalize(),key=v.toArray().map(x=>x.toFixed(3)).join(',');if(seen.has(key))continue;seen.add(key);const patch=mesh(new THREE.CircleGeometry(.055,5),mat(0x101621,.7,0));patch.position.copy(v).multiplyScalar(.1805);patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v);ball.add(patch);}
  scene.add(ball);apply3DSettings(window.__AI_FOOTBALL_SETTINGS||{});const spot=mesh(new THREE.CircleGeometry(.055,16),mat(0xffffff,.8,0));spot.rotation.x=-Math.PI/2;spot.position.set(-1,.013,0);scene.add(spot);
  clock=new THREE.Clock();resize();window.addEventListener('resize',resize);animate();if(!DEMO)tryLoadRealModels();
}
function normalizeModel(root,targetHeight=2.15){root.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(root);const size=new THREE.Vector3();box.getSize(size);if(size.y>0){const s=targetHeight/size.y;root.scale.multiplyScalar(s)}root.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(root);root.position.y-=box.min.y;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){if(Array.isArray(o.material))o.material=o.material.map(m=>m.clone());else o.material=o.material.clone()}}});}
function tintTeamModel(root,team){const main=team==='A'?0x173f9b:0xc91f2c;const yellow=0xffd21f;const skirt=team==='A'?0x152b59:0x6d1821;root.traverse(o=>{if(!o.isMesh||!o.material)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){const n=((o.name||'')+' '+(m.name||'')).toLowerCase();if(/skin|face|head|hair|eye|teeth|mouth/.test(n))continue;if(/sock/.test(n)){if(m.color)m.color.setHex(skirt);continue}if(/skirt|short|bottom|pants/.test(n)){if(m.color)m.color.setHex(skirt);continue}if(/stripe|trim|line|accent/.test(n)){if(m.color)m.color.setHex(yellow);continue}if(/shirt|jersey|top|cloth|uniform|body|torso/.test(n)){if(m.color)m.color.setHex(main);continue}if(/stripe|trim|line|accent/.test(n)){if(m.color)m.color.setHex(yellow)}}});}
function clipsFor(gltf){const clips=gltf.animations||[];const pick=(...re)=>clips.find(c=>re.some(r=>r.test(c.name.toLowerCase())))||null;return{idle:pick(/idle/,/stand/,/breath/),run:pick(/run/,/jog/,/sprint/),kick:pick(/kick/,/shoot/,/soccer/),celebrate:pick(/celebr/,/victory/,/cheer/),saveLeft:pick(/save.*left/,/dive.*left/,/left.*dive/),saveRight:pick(/save.*right/,/dive.*right/,/right.*dive/),miss:pick(/miss/,/defeat/,/fall/)}};
function prepareActor(gltf,type,team){
  // Keep normalization on the visual child; match movement belongs to the wrapper.
  const model=gltf.scene;normalizeModel(model,2.42);tintTeamModel(model,team);
  const root=new THREE.Group();root.add(model);
  const mixer=new THREE.AnimationMixer(model),clips=clipsFor(gltf),actions={};
  for(const name of ['idle','run','kick']){
    if(!clips[name])throw new Error('Player A animation missing: '+name);
    actions[name]=mixer.clipAction(clips[name]);
  }
  root.userData={real:true,type,team,actions,mixer,homeX:(HOME[team]||HOME.A).x,homeZ:(HOME[team]||HOME.A).z,baseRotationY:facingCamera(HOME[team]||HOME.A),idlePhase:team==='A'?0:2.7,kickContactTime:model.userData.kickContactTime??7/30};
  root.userData.kickRig={hips:model.getObjectByName('mixamorigHips'),right:[model.getObjectByName('mixamorigRightUpLeg'),model.getObjectByName('mixamorigRightLeg'),model.getObjectByName('mixamorigRightFoot')],left:[model.getObjectByName('mixamorigLeftUpLeg'),model.getObjectByName('mixamorigLeftLeg'),model.getObjectByName('mixamorigLeftFoot')]};
  if(team==='A'||DEMO){
    model.updateMatrixWorld(true);
    root.userData.headControl=['mixamorigNeck','mixamorigHead'].map(name=>{
      const bone=model.getObjectByName(name);
      return bone?{bone,restWorld:bone.getWorldQuaternion(new THREE.Quaternion()),smoothed:null,limit:name.endsWith('Head')?.20:.30}:null;
    }).filter(Boolean);
  }
  root.position.set(root.userData.homeX,0,root.userData.homeZ);root.rotation.y=root.userData.baseRotationY;playAction(root,'idle');if(root.userData.actions.idle)root.userData.actions.idle.setEffectiveTimeScale(team==='A'?.58:.52);return root;
}
function playAction(actor,name){
  if(!actor?.userData?.real)return;
  const data=actor.userData,actions=data.actions||{},next=actions[name]||actions.idle;
  if(!next)return;
  if(data.activeAction===next&&next.isRunning())return;
  const previous=data.activeAction;
  const contact=DEMO||data.team==='A'?PLAYER_A_TIMING.contact:KICK_CONTACT_MS;
  next.reset().setEffectiveWeight(1).setEffectiveTimeScale(name==='kick'?data.kickContactTime/(contact/1000):1);
  next.enabled=true;
  next.setLoop(name==='idle'||name==='run'?THREE.LoopRepeat:THREE.LoopOnce,name==='idle'||name==='run'?Infinity:1);
  next.clampWhenFinished=name!=='idle'&&name!=='run';
  next.play();
  const blend=data.team==='A'?(name==='kick'?.20:.24):.12;
  if(previous&&previous!==next){next.crossFadeFrom(previous,blend,false)}else{next.fadeIn(blend)}
  for(const action of Object.values(actions)){if(action!==next&&action!==previous)action.stop()}
  data.activeAction=next;
}
function installPlayerA(){
  if(DEMO||animation)return;
  for(const team of ['A','B']){
    const next=team==='A'?pendingPlayerA:pendingPlayerB;if(!next)continue;
    const old=team==='A'?playerA:playerB;scene.remove(old);
    if(old?.userData?.mixer){const i=mixers.indexOf(old.userData.mixer);if(i>=0)mixers.splice(i,1);}
    if(team==='A'){playerA=next;pendingPlayerA=null}else{playerB=next;pendingPlayerB=null}
    scene.add(next);mixers.push(next.userData.mixer);
  }
  realMode=!!(playerA?.userData?.real||playerB?.userData?.real);
  if(realMode)setLabel('3D MAÇ SAHNESİ');
}
async function tryLoadRealModels(){
  if(playerA?.userData?.real&&playerB?.userData?.real&&keeper?.userData?.real)return;
  if(playerALoad)return playerALoad;
  if(!GLTFLoader){setLabel('3D MAÇ SAHNESİ • MODEL BEKLENİYOR');return}
  playerALoad=(async()=>{
    setLabel('OYUNCULAR YÜKLENİYOR…');
    let loader;
    try{
      loader=new GLTFLoader();
      const {MeshoptDecoder}=await import('./assets/vendor/meshopt-decoder.mjs');await MeshoptDecoder.ready;
      loader.setMeshoptDecoder(MeshoptDecoder);
    }catch(e){
      console.warn('Model çözücü yüklenemedi; prosedürel model devam ediyor',e);
      setLabel('3D MAÇ SAHNESİ • BASİT MODEL');playerALoad=null;return
    }
    const loadPlayer=async team=>{
      if((team==='A'?playerA:playerB)?.userData?.real)return;
      try{
        const gltf=await loader.loadAsync(team==='A'?ASSETS.playerA:ASSETS.playerB);
        const actor=prepareActor(gltf,'player',team);
        if(team==='B')recolorKit(actor,'#c91f2c','#ffd21f');
        if(team==='A')pendingPlayerA=actor;else pendingPlayerB=actor;
        installPlayerA();
      }catch(e){console.warn('Oyuncu '+team+' yüklenemedi; prosedürel model devam ediyor',e)}
    };
    const loadKeeper=async()=>{
      if(keeper?.userData?.real)return;
      try{
        const gltf=await loader.loadAsync(ASSETS.keeper);
        const actor=prepareActor(gltf,'keeper','A');
        actor.userData.team='keeper';actor.userData.homeX=3.78;actor.userData.homeZ=GOAL_Z;actor.userData.baseRotationY=-Math.PI/2;
        recolorKit(actor,'#14633f','#2fa66c');
        const old=keeper;scene.remove(old);
        if(old?.userData?.mixer){const i=mixers.indexOf(old.userData.mixer);if(i>=0)mixers.splice(i,1)}
        keeper=actor;keeper.position.set(3.78,0,GOAL_Z);keeper.rotation.set(0,-Math.PI/2,0);
        scene.add(keeper);mixers.push(keeper.userData.mixer);playAction(keeper,'idle');
      }catch(e){console.warn('Kaleci modeli yüklenemedi; basit kaleci devam ediyor',e)}
    };
    try{
      await Promise.all([loadPlayer('A'),loadPlayer('B'),loadKeeper()]);
      if(playerA?.userData?.real||playerB?.userData?.real||keeper?.userData?.real)setLabel('');
      else setLabel('3D MAÇ SAHNESİ • BASİT MODEL');
    }finally{playerALoad=null}
  })();
  return playerALoad;
}
function resize(){if(!renderer||!camera)return;const box=document.getElementById('game3dCanvas')?.getBoundingClientRect();if(!box||!box.width)return;renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.fov=DEMO?49:(camera.aspect<1.25?54:42);camera.updateProjectionMatrix()}
function resetPose(){if(DEMO){resetDemoPose();return;}if(!playerA||!playerB||!keeper||!ball)return;for(const p of [playerA,playerB]){p.visible=true;p.position.set(p.userData.homeX,0,p.userData.homeZ);p.rotation.set(0,p.userData.baseRotationY??Math.PI/2,0);if(p.userData.real)playAction(p,'idle');else{p.userData.ll.rotation.set(0,0,0);p.userData.rl.rotation.set(0,0,0);p.userData.la.rotation.set(0,0,-.18);p.userData.ra.rotation.set(0,0,.18)}}keeper.position.set(keeper.userData.homeX??3.75,0,keeper.userData.homeZ??0);keeper.rotation.set(0,keeper.userData.baseRotationY??-Math.PI/2,0);if(keeper.userData.real)playAction(keeper,'idle');else{keeper.userData.la.rotation.set(0,0,-.4);keeper.userData.ra.rotation.set(0,0,.4)}ball.position.set(-1,.14,0);}
function naturalRealIdle(actor,t,phase=0){
  if(!actor?.userData?.real)return;
  const motion=Math.max(0,Math.min(1.5,(Number(runtimeSettings.idleMotion)||0)/100));
  if(motion<=0)return;
  const slow=Math.sin(t*.00042+phase),look=Math.sin(t*.00027+phase*1.7);
  idleBone(actor,'mixamorigHips','Z',slow*.016*motion);
  idleBone(actor,'mixamorigSpine','Z',-slow*.012*motion);
  idleBone(actor,'mixamorigNeck','Y',look*.15*motion);
  if(slow>0)idleBone(actor,'mixamorigLeftUpLeg','X',slow*.028*motion);
  else idleBone(actor,'mixamorigRightUpLeg','X',-slow*.028*motion);
}
function idleActor(actor,t,phase=0){
  if(!actor||(animation&&(!DEMO||animation.player===actor)))return;
  if(actor.userData.real){
    actor.position.y=0;
    actor.rotation.z=0;
    naturalRealIdle(actor,t,actor.userData.idlePhase??phase);
    return;
  }
  const motion=Math.max(0,Math.min(1.5,(Number(runtimeSettings.idleMotion)||0)/100)),s=Math.sin(t*.00165+phase),s2=Math.sin(t*.00082+phase*.7);
  actor.position.y=.008+s*.006*motion;
  actor.rotation.z=s2*.008*motion;
  if(actor.userData.la&&actor.userData.ra){
    actor.userData.la.rotation.z=-.18+s*.035;
    actor.userData.ra.rotation.z=.18-s*.035;
  }
  if(actor.userData.ll&&actor.userData.rl){
    actor.userData.ll.rotation.x=s2*.018;
    actor.userData.rl.rotation.x=-s2*.018;
  }
}
function restoreIdleBones(actor){
  for(const entry of actor?.userData.idleOffsets||[])entry.bone.quaternion.copy(entry.base);
  if(actor)actor.userData.idleOffsets=[];
}
function idleBone(actor,name,axis,angle){
  const bone=actor.getObjectByName(name);if(!bone)return;
  (actor.userData.idleOffsets ||= []).push({bone,base:bone.quaternion.clone()});bone['rotate'+axis](angle);
}
function demoIdle(actor,t,phase){
  const i=actor.userData.idleIndex||0,cycle=(t/1000+i*4.1)%(13+i*2.7);
  const shift=Math.sin(t*(.00065+i*.00013)+phase),glance=Math.sin(Math.max(0,Math.min(1,(cycle-5)/3))*Math.PI);
  actor.position.y=0;actor.position.x=actor.userData.homeX+shift*.035;
  actor.rotation.y=actor.userData.baseRotationY+Math.sin(t*.0004+phase)*.045;
  idleBone(actor,'mixamorigHips','Z',shift*.026);
  idleBone(actor,'mixamorigSpine','Z',-shift*.025);
  idleBone(actor,'mixamorigNeck','Y',glance*(i%2?-.36:.36));
  idleBone(actor,'mixamorigLeftUpLeg','X',Math.max(0,shift)*.07);
  idleBone(actor,'mixamorigRightUpLeg','X',Math.max(0,-shift)*.07);
  if(i%3===1){idleBone(actor,'mixamorigRightForeArm','X',-glance*.22);}
  else if(i%3===2){idleBone(actor,'mixamorigLeftArm','Z',glance*.12);}
}
function idleKeeper(t){
  if(!keeper||animation)return;
  const s=Math.sin(t*.00105),s2=Math.sin(t*.00068);
  keeper.position.y=0;
  keeper.position.z=(keeper.userData.homeZ??0)+s2*.035;
  keeper.rotation.z=0;
  if(keeper.userData.real){
    idleBone(keeper,'mixamorigHips','X',-.065);
    idleBone(keeper,'mixamorigLeftUpLeg','X',-.10);
    idleBone(keeper,'mixamorigRightUpLeg','X',-.10);
    idleBone(keeper,'mixamorigLeftLeg','X',.14);
    idleBone(keeper,'mixamorigRightLeg','X',.14);
    idleBone(keeper,'mixamorigLeftArm','Z',-.11+s*.018);
    idleBone(keeper,'mixamorigRightArm','Z',.11-s*.018);
  }else if(keeper.userData.la&&keeper.userData.ra){
    keeper.userData.la.rotation.z=-.4+s*.03;
    keeper.userData.ra.rotation.z=.4-s*.03;
  }
}
function animate(){
  requestAnimationFrame(animate);
  if(!renderer||!scene||!camera)return;
  const dt=Math.min(clock?.getDelta?.()||.016,.05),t=performance.now();
  for(const actor of [playerA,playerB,keeper,...demoActors.values()])restoreIdleBones(actor);
  for(const m of mixers)m.update(dt);updateCamera(dt);
  installPlayerA();
  if(animation)runAnimation(t);
  else{
    idleActor(playerA,t,0);
    idleActor(playerB,t,1.7);
    idleKeeper(t);
  }
  if(DEMO){for(const actor of demoActors.values()){if(actor!==animation?.player)idleActor(actor,t,actor.userData.idlePhase||0);stabilizeHead(actor,dt);}stabilizeHead(keeper,dt);demoReactions(t);}else{stabilizeHead(playerA,dt);stabilizeHead(playerB,dt);}
  renderer.render(scene,camera);
}
function stabilizeHead(actor,dt){
  const controls=actor?.userData?.headControl;if(!controls?.length)return;
  actor.updateMatrixWorld(true);
  const facing=actor.getWorldQuaternion(new THREE.Quaternion()),k=1-Math.exp(-dt*12);
  for(const control of controls){
    const {bone,restWorld,limit}=control;
    const upright=facing.clone().multiply(restWorld);
    const animated=bone.getWorldQuaternion(new THREE.Quaternion());
    const angle=upright.angleTo(animated);
    const target=upright.clone().slerp(animated,angle>0?Math.min(.25,limit/angle):0);
    if(!control.smoothed)control.smoothed=target.clone();else control.smoothed.slerp(target,k);
    const offset=upright.angleTo(control.smoothed);
    if(offset>limit)control.smoothed.copy(upright.clone().slerp(control.smoothed,limit/offset));
    const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(parent.multiply(control.smoothed));
    bone.updateWorldMatrix(false,true);
  }
}
function updateCamera(dt){
  const view=animation?VIEW.shot:VIEW.idle,k=1-Math.exp(-dt*4.5),zoom=Math.max(.75,Math.min(1.4,(Number(runtimeSettings.cameraZoom)||100)/100));
  const tx=view.target[0],ty=view.target[1],tz=view.target[2];
  const px=tx+(view.position[0]-tx)*zoom,py=ty+(view.position[1]-ty)*zoom,pz=tz+(view.position[2]-tz)*zoom;
  camera.position.x=lerp(camera.position.x,px,k);camera.position.y=lerp(camera.position.y,py,k);camera.position.z=lerp(camera.position.z,pz,k);
  cameraTarget.x=lerp(cameraTarget.x,tx,k);cameraTarget.y=lerp(cameraTarget.y,ty,k);cameraTarget.z=lerp(cameraTarget.z,tz,k);camera.lookAt(cameraTarget.x,cameraTarget.y,cameraTarget.z);
}
function solveLeg(chain,target,weight){
  if(chain.some(b=>!b))return;const [hip,knee,foot]=chain;
  const h=hip.getWorldPosition(new THREE.Vector3()),k=knee.getWorldPosition(new THREE.Vector3()),f=foot.getWorldPosition(new THREE.Vector3());
  const upper=h.distanceTo(k),lower=k.distanceTo(f),d=target.clone().sub(h),distance=clamp(d.length(),.001,upper+lower-.001);d.normalize();
  const bend=k.clone().sub(h);bend.addScaledVector(d,-bend.dot(d));if(bend.lengthSq()<.00001)bend.set(0,0,1);bend.normalize();
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const desired=h.clone().addScaledVector(d,along).addScaledVector(bend,height);
  const rotate=(bone,from,to)=>{const delta=new THREE.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());const world=bone.getWorldQuaternion(new THREE.Quaternion());const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();const local=parent.multiply(delta.multiply(world));bone.quaternion.slerp(local,weight);bone.updateWorldMatrix(false,true);};
  rotate(hip,k.clone().sub(h),desired.sub(h));const nextK=knee.getWorldPosition(new THREE.Vector3()),nextF=foot.getWorldPosition(new THREE.Vector3());rotate(knee,nextF.sub(nextK),target.clone().sub(nextK));
}
function groundKick(player,weight){
  const rig=player.userData.kickRig;if(!rig?.hips||rig.left.some(b=>!b)||rig.right.some(b=>!b))return;
  player.updateMatrixWorld(true);const planted=rig.left[2].getWorldPosition(new THREE.Vector3());planted.y=.08;
  const hipsWorld=rig.hips.getWorldPosition(new THREE.Vector3()),parentScale=rig.hips.parent.getWorldScale(new THREE.Vector3());
  // Adapt the drop-kick clip to a ball on the grass, keeping the support foot planted.
  rig.hips.position.y-=(Math.max(0,hipsWorld.y-.98)/parentScale.y)*weight;player.updateMatrixWorld(true);
  solveLeg(rig.left,planted,weight);solveLeg(rig.right,new THREE.Vector3(-1.06,.19,SHOT_Z),weight);player.updateMatrixWorld(true);
}
function beginShot(team){
  if(!playerA||!playerB||!keeper||!ball)return;
  if(animation&&animation.team===team&&['turn','run','kick','ball','awaitResult','outcome','net'].includes(animation.phase))return;
  resetPose();const p=team==='A'?playerA:playerB;
  animation={phase:'turn',team,start:performance.now(),player:p,result:null,timing:team==='A'?PLAYER_A_TIMING:{turn:TURN_MS,run:RUN_MS,contact:KICK_CONTACT_MS},runYaw:Math.atan2(-1.9-p.userData.homeX,-p.userData.homeZ)};
}
function finishShot(team,result){
  if(!animation||animation.team!==team)beginShot(team);
  if(!animation||animation.result)return;
  // Store the real result without cutting short the turn or run animation.
  animation.result=result;
}
function enterKick(a,t){a.phase='kick';a.start=t;if(a.player.userData.real)playAction(a.player,'kick');}
function runAnimation(t){
  const a=animation,p=a.player;if(!p)return;let u;const side=shotSide(a.team),targetZ=shotTarget(a.team);
  if(a.phase==='turn'){
    u=clamp((t-a.start)/a.timing.turn,0,1);p.rotation.y=angleLerp(p.userData.baseRotationY,a.runYaw,smooth(u));
    if(u>=1){a.phase='run';a.start=t;if(!DEMO)(a.team==='A'?playerB:playerA).visible=false;if(p.userData.real)playAction(p,'run');}
  }else if(a.phase==='run'){
    u=clamp((t-a.start)/a.timing.run,0,1);
    // A curved approach brings the player into the shot without an idle pause.
    const v=1-u;p.position.x=v*v*p.userData.homeX+2*v*u*(-2.45)+u*u*(-1.9);p.position.z=v*v*p.userData.homeZ+2*v*u*(SHOT_Z+.12)+u*u*SHOT_Z;
    const dx=2*v*(-2.45-p.userData.homeX)+2*u*.55,dz=2*v*(SHOT_Z+.12-p.userData.homeZ)-2*u*.12;
    p.rotation.y=Math.atan2(dx,dz);
    if(!p.userData.real){p.userData.ll.rotation.x=Math.sin(u*Math.PI*8)*.55;p.userData.rl.rotation.x=-p.userData.ll.rotation.x;p.userData.la.rotation.x=-p.userData.ll.rotation.x*.7;p.userData.ra.rotation.x=p.userData.ll.rotation.x*.7;}
    if(u>=1)enterKick(a,t);
  }else if(a.phase==='kick'){
    u=clamp((t-a.start)/a.timing.contact,0,1);p.position.x=lerp(-1.9,-1.65,u);p.position.z=SHOT_Z;p.rotation.y=Math.PI/2;
    if(!p.userData.real){p.userData.rl.rotation.x=-1.0*Math.sin(u*Math.PI*.5);p.userData.la.rotation.z=-.18-.45*Math.sin(u*Math.PI*.5);}
    groundKick(p,smooth(u));if(!a.kickSoundPlayed&&u>=.72){a.kickSoundPlayed=true;try{window.AIFootballAudio?.kick?.(0)}catch(e){}phaseEvent('kick');}if(u>=1){a.phase='ball';a.start=t;phaseEvent('ball');}
  }else if(a.phase==='ball'){
    if(t-a.start<170)groundKick(p,1-smooth(clamp((t-a.start)/170,0,1)));
    u=clamp((t-a.start)/650,0,1);
    // Both outcomes share the approach. Never cross the goal before its result arrives.
    ball.position.set(lerp(-1,3.45,u),lerp(.14,.90,u)+Math.sin(u*Math.PI)*.55,lerp(SHOT_Z,targetZ,u));
    ball.rotation.x+=.25;ball.rotation.z+=.18;
    if(a.result==='save'){
      keeper.position.z=lerp(GOAL_Z,targetZ-side*Math.sin(.85)*(DEMO?.65:1.3),smooth(u));
      if(!keeper.userData.real)keeper.rotation.x=lerp(0,.85*(side>0?1:-1),smooth(u));else{const actionName=side>0?'saveRight':'saveLeft';if(keeper.userData.actions?.[actionName])playAction(keeper,actionName);else keeper.rotation.x=lerp(0,.95*(side>0?1:-1),smooth(u));}
    }
    if(u>=1){a.phase=a.result?'outcome':'awaitResult';a.start=t;if(a.result==='save')phaseEvent('save');}
  }else if(a.phase==='awaitResult'){
    if(a.result){a.phase='outcome';a.start=t;}
  }else if(a.phase==='outcome'){
    u=clamp((t-a.start)/350,0,1);
    if(a.result==='goal'){
      // The goal plane is x=4.42; only a confirmed goal may travel beyond it.
      ball.position.set(lerp(3.45,5.01,u),lerp(.90,.70,u)+Math.sin(u*Math.PI)*.12,targetZ);
      keeper.position.z=lerp(GOAL_Z,GOAL_Z-side*.2,smooth(u));
    }else{
      // A save rebounds away from the net and outside the central shooting lane.
      ball.position.set(lerp(3.45,2.35,u),lerp(.90,.14,u)+Math.sin(u*Math.PI)*.30,lerp(targetZ,GOAL_Z+side*1.4,u));
      keeper.position.z=targetZ-side*Math.sin(.85)*(DEMO?.65:1.3);
      if(!keeper.userData.real)keeper.rotation.x=.85*(side>0?1:-1);
      else if(keeper.userData.actions?.[side>0?'saveRight':'saveLeft']){if(!a.savePlayed){playAction(keeper,side>0?'saveRight':'saveLeft');a.savePlayed=true;}}
      else keeper.rotation.x=.95*(side>0?1:-1);
    }
    ball.rotation.x+=.25;ball.rotation.z+=.18;
    if(u>=1){a.phase=a.result==='goal'?'net':'result';a.start=t;if(a.phase==='net')phaseEvent('net');}
  }else if(a.phase==='net'){
    u=clamp((t-a.start)/420,0,1);
    // Contact with the rear net reverses the ball and drops it inside the goal.
    ball.position.set(lerp(5.01,4.68,smooth(u)),lerp(.70,.14,u)+Math.sin(u*Math.PI)*.08,targetZ);
    ball.rotation.x+=.08;
    if(u>=1){a.phase='result';a.start=t;}
  }else if(a.phase==='result'){
    u=clamp((t-a.start)/(DEMO?1100:850),0,1);
    const bounce=Math.abs(Math.sin(u*Math.PI*4))*(1-u)*.10;
    ball.position.y=.14+bounce;
    if(a.result==='goal'){p.rotation.y=angleLerp(Math.PI/2,p.userData.baseRotationY,smooth(u));if(!p.userData.real)p.position.y=Math.sin(u*Math.PI)*.18;}
    if(u>=1){if(DEMO){a.phase='return';a.start=t;p.userData.reactionWeight=0;if(p.userData.real)playAction(p,'run');}else{resetPose();animation=null;}}
  }else if(DEMO&&a.phase==='return'){
    u=clamp((t-a.start)/1350,0,1);p.position.x=lerp(-1.65,p.userData.homeX,u);p.position.z=lerp(SHOT_Z,p.userData.homeZ,u);p.rotation.y=Math.atan2(p.userData.homeX+1.65,p.userData.homeZ-SHOT_Z);
    if(!p.userData.real){p.userData.ll.rotation.x=Math.sin(u*Math.PI*6)*.5;p.userData.rl.rotation.x=-p.userData.ll.rotation.x;}
    if(u>=1){animation=null;resetPose();}
  }
}

function removeActor(actor){if(!actor)return;scene.remove(actor);const i=mixers.indexOf(actor.userData.mixer);if(i>=0)mixers.splice(i,1);actor.userData.mixer?.stopAllAction();actor.traverse(o=>{if(o.isMesh){for(const material of Array.isArray(o.material)?o.material:[o.material]){if(material?.map?.userData.demoOwned)material.map.dispose();material?.dispose();}}});}
function placeDemoActor(actor,index){
  const count=demoTeams.length;
  const home={x:-2.82,z:-1.85+index*Math.min(.95,2.8/Math.max(1,count-1))};
  actor.userData.homeX=home.x;actor.userData.homeZ=home.z;actor.userData.baseRotationY=facingCamera(home);actor.userData.idlePhase=index*2.13;actor.userData.idleIndex=index;
  actor.position.set(home.x,0,home.z);actor.rotation.set(0,actor.userData.baseRotationY,0);
  if(actor.userData.real){playAction(actor,'idle');const action=actor.userData.actions.idle;action.setEffectiveTimeScale(.78+index*.13);if(!actor.userData.idleStarted){action.time=(index*.83)%action.getClip().duration;actor.userData.idleStarted=true;}}
}
async function demoModel(url){
  if(!modelCache.has(url))modelCache.set(url,(async()=>{const {MeshoptDecoder}=await import('./assets/vendor/meshopt-decoder.mjs');await MeshoptDecoder.ready;const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);return loader.loadAsync(url);})().catch(error=>{modelCache.delete(url);throw error;}));
  return modelCache.get(url);
}
function skinMaterial(material){return /skin|face|hair|eye|teeth|mouth/i.test(material.name||'');}
function recolorKit(actor,main,accent){
  const primary=new THREE.Color(main),secondary=new THREE.Color(accent);
  const rgb=color=>{const hex=color.getHex();return [hex>>16&255,hex>>8&255,hex&255]};
  const mainRGB=rgb(primary),accentRGB=rgb(secondary);
  actor.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){
    if(skinMaterial(material))continue;
    if(material.map?.image){
      const source=material.map.image,canvas=document.createElement('canvas');
      canvas.width=source.width;canvas.height=source.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
      for(let i=0;i<data.length;i+=4){
        const r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b),sat=(max-min)/Math.max(1,max);
        const navy=b>70&&b>r*1.28&&b>g*1.08&&sat>.28;
        const yellow=r>145&&g>105&&b<115&&r>g*.92&&g>b*1.35&&sat>.28;
        if(!navy&&!yellow)continue;
        actor.userData.recoloredPixels=(actor.userData.recoloredPixels||0)+1;
        const color=navy?mainRGB:accentRGB,luma=Math.max(.42,Math.min(1.08,max/215));
        data[i]=Math.min(255,Math.round(color[0]*luma));
        data[i+1]=Math.min(255,Math.round(color[1]*luma));
        data[i+2]=Math.min(255,Math.round(color[2]*luma));
      }
      ctx.putImageData(pixels,0,0);
      const original=material.map,texture=original.clone();texture.source=new THREE.Source(canvas);
      texture.userData={demoOwned:true};texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
      material.map=texture;material.color?.set('#ffffff');
    }
    material.roughness=Math.max(.48,material.roughness??.6);
    material.needsUpdate=true;
  }});
}
async function configureTeams(teams){
  if(!DEMO||!scene)return;const generation=++teamGeneration;demoTeams=teams;animation=null;
  if(playerA){removeActor(playerA);playerA=null;}if(playerB){removeActor(playerB);playerB=null;}
  for(const actor of demoActors.values())removeActor(actor);demoActors.clear();
  for(const [i,team]of teams.entries()){
    const actor=createPlayer(team.id);placeDemoActor(actor,i);actor.userData.torso.material.color.set(team.secondaryColor);demoActors.set(team.id,actor);scene.add(actor);
  }
  if(!SkeletonClone){try{const mod=await import('https://esm.sh/three@0.169.0/examples/jsm/utils/SkeletonUtils.js');SkeletonClone=mod.clone;}catch(error){console.warn('Model kopyalayıcı yüklenemedi',error);setLabel('Yedek oyuncular kullanılıyor');return;}}
  const load=async(team,i)=>{
    if(!team.model)return;
    try{
      const modelUrl=team.model.replace(/player-a\.glb(?:\?[^#]*)?$/, 'player-a.glb?v=6');
      const source=await demoModel(modelUrl);if(generation!==teamGeneration)return;
      const actor=prepareActor({scene:SkeletonClone(source.scene),animations:source.animations},'player',team.id);
      recolorKit(actor,team.id==='A'?team.secondaryColor:team.color,team.id==='A'?team.color:team.secondaryColor);
      if(animation?.player===demoActors.get(team.id)){await waitForDemoIdle(generation);if(generation!==teamGeneration){actor.userData.mixer.stopAllAction();return;}}
      placeDemoActor(actor,i);removeActor(demoActors.get(team.id));demoActors.set(team.id,actor);scene.add(actor);mixers.push(actor.userData.mixer);
      setLabel('');
      if(!demoKeeperReady&&i===0){demoKeeperReady=true;const next=prepareActor({scene:SkeletonClone(source.scene),animations:source.animations},'keeper',team.id);next.userData.team='keeper';next.userData.homeX=3.75;next.userData.homeZ=GOAL_Z;next.userData.baseRotationY=-Math.PI/2;recolorKit(next,'#15583d','#21825b');removeActor(keeper);keeper=next;keeper.position.set(3.75,0,GOAL_Z);keeper.rotation.set(0,-Math.PI/2,0);scene.add(keeper);mixers.push(keeper.userData.mixer);if(!animation)resetDemoPose();}
    }catch(error){console.warn('Demo oyuncusu yüklenemedi; yedek model',error);setLabel('Bazı oyuncular yedek modelle gösteriliyor');}
  };
  await Promise.all(teams.map(load));
}
async function waitForDemoIdle(generation){while(animation&&generation===teamGeneration)await sleep(150);}
function resetDemoPose(){
  animation=null;let i=0;for(const actor of demoActors.values()){actor.visible=true;placeDemoActor(actor,i++);actor.userData.reactionWeight=0;}
  if(keeper){keeper.position.set(3.75,0,GOAL_Z);keeper.rotation.set(0,-Math.PI/2,0);if(keeper.userData.real)playAction(keeper,'idle');}
  ball?.position.set(-1,.14,SHOT_Z);
}
function playDemoShot(shot){
  if(!DEMO||!scene)return;const player=demoActors.get(shot.teamId);if(!player)return;
  resetDemoPose();animation={phase:'turn',team:shot.teamId,start:performance.now(),player,result:shot.result,timing:PLAYER_A_TIMING,runYaw:Math.atan2(-1.9-player.userData.homeX,SHOT_Z-player.userData.homeZ)};
  // Catch up a viewer opened mid-shot without replaying the complete shot from the start.
  const elapsed=Math.max(0,Date.now()-shot.startedAt),start=animation.start;
  for(let delta=16;delta<=Math.min(elapsed,7000)&&animation;delta+=16){runAnimation(start+delta);}
  if(animation)animation.start-=elapsed;
}
function demoReactions(t){
  if(!keeper?.userData.real)return;
  const active=animation,weight=active?.phase==='result'?Math.sin(clamp((t-active.start)/1100,0,1)*Math.PI):0;
  if(active?.player.userData.real&&active.result==='goal'&&weight>0){
    for(const [name,sign]of [['mixamorigLeftArm',1],['mixamorigRightArm',-1]]){const bone=active.player.getObjectByName(name);if(bone)bone.rotateZ(sign*weight*.9);}
  }
  if(!active||['turn','run','kick','return'].includes(active.phase)){
    keeper.rotation.x=0;keeper.position.y=-.075;
    const readiness=.38+Math.sin(t*.0014)*.045;
    idleBone(keeper,'mixamorigLeftUpLeg','X',-readiness);idleBone(keeper,'mixamorigRightUpLeg','X',-readiness);
    idleBone(keeper,'mixamorigLeftLeg','X',readiness*1.7);idleBone(keeper,'mixamorigRightLeg','X',readiness*1.7);
    idleBone(keeper,'mixamorigLeftUpLeg','Z',.10);idleBone(keeper,'mixamorigRightUpLeg','Z',-.10);
    idleBone(keeper,'mixamorigSpine','X',.14);
    idleBone(keeper,'mixamorigLeftArm','Z',.28);idleBone(keeper,'mixamorigRightArm','Z',-.28);
    idleBone(keeper,'mixamorigLeftForeArm','X',-.55);idleBone(keeper,'mixamorigRightForeArm','X',-.55);
    idleBone(keeper,'mixamorigNeck','Y',Math.sin(t*.0009)*.17);
  }else if(active.result==='save'){
    const direction=active.team==='A'?1:-1;
    const progress=active.phase==='ball'?smooth(clamp((t-active.start)/650,0,1)):1;
    keeper.rotation.x=direction*.85*progress;keeper.position.y=-.10*progress;
    for(const name of ['mixamorigLeftArm','mixamorigRightArm']){const bone=keeper.getObjectByName(name);if(bone)bone.rotateZ((name.includes('Left')?1:-1)*.65*progress);}
  }else if(active.phase==='result'){keeper.rotation.x=weight*.10;}
}
function bindStatusAnimation(){
  const ev=document.getElementById('event');
  if(!ev)return;
  let last='';
  const read=()=>{
    const txt=(ev.dataset.matchMessage||ev.textContent||'').trim();
    if(!txt||txt===last)return;
    last=txt;
    let m=txt.match(/^(Sarı-Lacivert|Sarı-Kırmızı)\s+şut çekiyor!/i);
    if(m){beginShot(/^Sarı-Lacivert/i.test(m[1])?'A':'B');return;}
    m=txt.match(/^GOL!\s*(Sarı-Lacivert|Sarı-Kırmızı)/i);
    if(m){finishShot(/^Sarı-Lacivert/i.test(m[1])?'A':'B','goal');return;}
    if(/^Sarı-Kırmızı\s+kalecisi kurtardı!/i.test(txt)){finishShot('A','save');return;}
    if(/^Sarı-Lacivert\s+kalecisi kurtardı!/i.test(txt)){finishShot('B','save');return;}
  };
  new MutationObserver(read).observe(ev,{childList:true,characterData:true,subtree:true});
  read();
}
function hookGame(){if(hooked)return;if(typeof window.resolveShot!=='function'){setTimeout(hookGame,150);return}hooked=true;const old=window.resolveShot;window.resolveShot=async function(team,shot){try{beginShot(team)}catch(e){}await sleep(360);const r=await old.apply(this,arguments);const ev=document.getElementById('event');const txt=(ev?.dataset.matchMessage||ev?.textContent||'').trim();const goal=txt.match(/^GOL!\s*(Sarı-Lacivert|Sarı-Kırmızı)/i);const save=txt.match(/^(Sarı-Lacivert|Sarı-Kırmızı)\s+kalecisi kurtardı!/i);const attacking=goal?(/^Sarı-Lacivert/i.test(goal[1])?'A':'B'):save?(/^Sarı-Lacivert/i.test(save[1])?'B':'A'):null;if(attacking===team){try{finishShot(team,goal?'goal':'save')}catch(e){}}return r};}
async function boot(){if(installed)return;const shell=addStageShell();if(!shell){setTimeout(boot,120);return}installed=true;runtimeSettings={...runtimeSettings,...(window.__AI_FOOTBALL_SETTINGS||{})};try{await loadThree();setupScene();if(DEMO)window.dispatchEvent(new CustomEvent('football-scene-ready'));else{bindStatusAnimation();hookGame()}}catch(e){console.error('3D sahne yüklenemedi',e);setLabel('3D SAHNE YÜKLENEMEDİ')}}
window.addEventListener('ai-football-settings',e=>apply3DSettings(e.detail||{}));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.AIFootball3D={beginShot,finishShot,reset:resetPose,reloadModels:tryLoadRealModels,configureTeams,playDemoShot,applySettings:apply3DSettings,get ready(){return !!scene},get settings(){return {...runtimeSettings}},get modelStatus(){return [...demoActors].map(([team,actor])=>({team,loaded:actor.userData.real,recoloredPixels:actor.userData.recoloredPixels||0}));}};
})();





