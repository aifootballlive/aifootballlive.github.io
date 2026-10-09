(()=>{
'use strict';
let THREE=null,GLTFLoader=null,scene=null,camera=null,renderer=null,clock=null;
let ball=null,keeper=null,playerA=null,playerB=null,goalObject=null;
let runtimeSettings={cameraZoom:100,stadiumExposure:116,idleMotion:100,ballSize:100,goalSize:100,sceneLabel:true};
let animation=null,installed=false,hooked=false,realMode=false;
let saveSequence=0;
let playerALoad=null,pendingPlayerA=null,pendingPlayerB=null;
const mixers=[];
const DEMO=!!window.AIFootballDemoMode;
const demoActors=new Map(),modelCache=new Map();
let demoTeams=[],teamGeneration=0,demoKeeperReady=false,SkeletonClone=null;
const phaseEvent=phase=>window.dispatchEvent(new CustomEvent('football-scene-phase',{detail:{phase}}));

const ASSETS={
  playerA:'./assets/models/player-a-refined.glb?v=1',
  playerB:'./assets/models/player-a.glb?v=6',
  keeper:'./assets/models/player-a.glb?v=6'
};

const HOME={A:{x:-4.50,z:1.50},B:{x:-4.20,z:2.50}};
const VIEW={idle:{position:[-7.35,2.45,5.65],target:[.45,1.05,.05]},shot:{position:[-6.15,2.22,4.35],target:[1.15,.98,0]}};
if(DEMO){VIEW.idle={position:[-12,4.6,0],target:[1,1.05,0]};VIEW.shot=VIEW.idle;}
const GOAL_Z=DEMO?2.35:-.28,SHOT_Z=DEMO?.25:0;
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
  if(DEMO)document.querySelector('.scene-anchor').replaceWith(wrap);else{score.insertAdjacentElement('afterend',wrap);const sound=document.getElementById('soundEnable');if(sound)score.parentElement.appendChild(sound);}
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
  root.userData={real:false,la,ra,ll,rl,homeX:2.95,homeZ:GOAL_Z};root.position.set(2.95,0,GOAL_Z);root.rotation.y=-Math.PI/2;return root;
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
  const netMat=new THREE.LineBasicMaterial({color:0xeef3f8,transparent:true,opacity:.88});
  const line=(a,b)=>g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]),netMat));
  for(let y=.10;y<=height;y+=.18){
    line([backX,y,-halfW],[backX,y,halfW]);
    for(const z of [-halfW,halfW])line([goalX,y,z],[backX,y,z]);
  }
  for(let z=-halfW;z<=halfW;z+=.20){
    line([backX,.10,z],[backX,height,z]);
    line([goalX,height,z],[backX,height,z]);

  }
  for(let x=goalX;x<=backX;x+=.16){
    for(const z of [-halfW,halfW])line([x,.08,z],[x,height,z]);
  }
  if(!DEMO){for(const child of g.children)child.position.x-=goalX;g.position.set(goalX-1.55,0,GOAL_Z);g.rotation.y=THREE.MathUtils.degToRad(12);}
  return g;
}
function addStadium(){
  const back=new THREE.Group();
  const dark=mat(0x161d2b,.88,0),stepMat=mat(0x252d3d,.9,0);
  const leftCrowd=[0x102f73,0x173f9b,0xf0c52f,0xf6d84a,0x1b2b55,0xe8e4dc];
  const rightCrowd=[0xb5222d,0xd12b38,0xf0c52f,0xf6d84a,0x5e1b25,0xe8e4dc];
  const neutralCrowd=[0x202733,0x343b48,0x5b4a42,0xe8e4dc];
  const skinTones=[0xd7ad8b,0xb98264,0x8c5b45,0xe2bea0,0x6f4435];
  const addCrowdRow=(x,y,zStart,count,spacing,axis='z',seed=0)=>{
    const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.09,7,6),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,vertexColors:true}),count);
    const torsos=new THREE.InstancedMesh(new THREE.BoxGeometry(.21,.30,.12),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,vertexColors:true}),count);
    const mh=new THREE.Matrix4(),mt=new THREE.Matrix4();
    for(let i=0;i<count;i++){
      const pos=axis==='z'?[x,y,zStart+i*spacing]:[zStart+i*spacing,y,x];
      const jitter=((i*17+seed*13)%11-5)*.008;
      mh.makeTranslation(pos[0],pos[1]+.20+jitter,pos[2]);heads.setMatrixAt(i,mh);
      mt.makeTranslation(pos[0],pos[1]+.03,pos[2]);torsos.setMatrixAt(i,mt);
      const side=pos[2] < -.28 ? 'left' : pos[2] > .28 ? 'right' : 'neutral';
      const palette=side==='left'?leftCrowd:side==='right'?rightCrowd:neutralCrowd;
      const colorIndex=(i*7+seed*3)%palette.length;
      heads.setColorAt(i,new THREE.Color(skinTones[(i+seed*2)%skinTones.length]));
      torsos.setColorAt(i,new THREE.Color(palette[colorIndex]));
    }
    heads.instanceMatrix.needsUpdate=true;torsos.instanceMatrix.needsUpdate=true;
    if(heads.instanceColor)heads.instanceColor.needsUpdate=true;
    if(torsos.instanceColor)torsos.instanceColor.needsUpdate=true;
    back.add(torsos,heads);
  };

  // Main stand directly behind the goal.
  for(let row=0;row<11;row++){
    const step=mesh(new THREE.BoxGeometry(.72,.30,11.2),row%2?dark:stepMat);
    step.position.set(6.05+row*.46,.58+row*.39,0);back.add(step);
    addCrowdRow(5.93+row*.46,.86+row*.39,-5.25,118,.089,'z',row);
  }
  // Upper deck / dark roof gives the same packed-stadium framing as the reference.
  const roof=mesh(new THREE.BoxGeometry(5.8,.32,12.6),mat(0x0c111a,.82,.03));roof.position.set(8.6,5.35,0);
  // Reference crowd panels cover the stepped stands, leaving the live goal in 3D.
  const crowdTexture=new THREE.TextureLoader().load('./assets/backgrounds/continuous-stands-v2.png?v=1');
  crowdTexture.colorSpace=THREE.SRGBColorSpace;
  crowdTexture.repeat.set(1,1);crowdTexture.offset.set(0,0);
  crowdTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const crowdMaterial=new THREE.MeshBasicMaterial({map:crowdTexture,side:THREE.DoubleSide,toneMapped:false});
  // Soften the top of the stand into the night sky without a hard photo edge.
  crowdMaterial.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      #include <map_fragment>
      #ifdef USE_MAP
        float upperBlend=smoothstep(0.72,0.995,vMapUv.y);
        vec2 spread=vec2(0.012,0.018)*upperBlend;
        vec3 softCrowd=texture2D(map,vMapUv).rgb*0.20;
        softCrowd+=texture2D(map,vMapUv+vec2(spread.x,0.0)).rgb*0.15;
        softCrowd+=texture2D(map,vMapUv-vec2(spread.x,0.0)).rgb*0.15;
        softCrowd+=texture2D(map,vMapUv+vec2(0.0,spread.y)).rgb*0.15;
        softCrowd+=texture2D(map,vMapUv-vec2(0.0,spread.y)).rgb*0.15;
        softCrowd+=texture2D(map,vMapUv+spread).rgb*0.10;
        softCrowd+=texture2D(map,vMapUv-spread).rgb*0.10;
        diffuseColor.rgb=mix(diffuseColor.rgb,softCrowd,upperBlend);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.00273,0.00561,0.01298),upperBlend);
      #endif
    `);
  };
  crowdMaterial.customProgramCacheKey=()=> 'soft-stand-top-v1';
  // One continuous UV strip follows the side stand around the stadium bend.
  const outline=[[-14,-4.4],[4.25,-4.4],[5.0,-4.15],[5.55,-3.6],[5.75,-2.9],[5.75,14]];
  const lengths=[0];for(let i=1;i<outline.length;i++)lengths.push(lengths[i-1]+Math.hypot(outline[i][0]-outline[i-1][0],outline[i][1]-outline[i-1][1]));
  const vertices=[],uvs=[],indices=[],total=lengths[lengths.length-1];
  for(let i=0;i<outline.length;i++){const [x,z]=outline[i];vertices.push(x,.35,z,x,6.35,z);uvs.push(lengths[i]/total,0,lengths[i]/total,1);if(i<outline.length-1){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const crowdGeometry=new THREE.BufferGeometry();crowdGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));crowdGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));crowdGeometry.setIndex(indices);crowdGeometry.computeVertexNormals();
  back.add(new THREE.Mesh(crowdGeometry,crowdMaterial));

  // Rails and pitch-side LED boards.
  const railMat=mat(0x8993a2,.45,.22);
  for(const y of [1.02,2.58,4.10]){
    const rail=mesh(new THREE.BoxGeometry(.055,.055,11.0),railMat);rail.position.set(5.62,y,0);back.add(rail);
  }
  const led=(x,z,w,label,bg,fg='#ffffff')=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=220;
    const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,220);
    ctx.fillStyle=fg;ctx.font='900 82px Arial';ctx.textAlign='center';ctx.textBaseline='middle';if(label==='jersey'){ctx.save();ctx.translate(412,20);ctx.beginPath();ctx.moveTo(35,0);ctx.lineTo(75,15);ctx.lineTo(125,15);ctx.lineTo(165,0);ctx.lineTo(200,45);ctx.lineTo(170,75);ctx.lineTo(155,60);ctx.lineTo(155,180);ctx.lineTo(45,180);ctx.lineTo(45,60);ctx.lineTo(30,75);ctx.lineTo(0,45);ctx.closePath();ctx.clip();for(let i=0;i<200;i+=25){ctx.fillStyle=i%50===0?fg:bg;ctx.fillRect(i,0,25,180)}ctx.restore()}else ctx.fillText(label,512,112);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const board=mesh(new THREE.BoxGeometry(w,.62,.10),new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:.18,roughness:.55}));
    board.position.set(x,.34,z);back.add(board);
  };
  led(.0,-4.24,4.0,'jersey','#102f73','#f8d437');
  led(3.15,-4.24,2.1,'AI FOOTBALL','#1f2945','#ffffff');
  const sideA=mesh(new THREE.BoxGeometry(.11,.62,2.2),new THREE.MeshStandardMaterial({color:0x143b86,emissive:0x0d2453,emissiveIntensity:.25,roughness:.55}));sideA.position.set(5.72,.34,-5.05);back.add(sideA);
  const sideB=mesh(new THREE.BoxGeometry(.11,.62,2.2),new THREE.MeshStandardMaterial({color:0xc72a35,emissive:0x5f1218,emissiveIntensity:.25,roughness:.55}));sideB.position.set(5.72,.34,5.05);back.add(sideB);

  // Stadium light wash.
  const flood1=new THREE.PointLight(0xdceaff,2.4,28,2);flood1.position.set(3.8,6.2,-4.8);back.add(flood1);
  const flood2=new THREE.PointLight(0xfff3d4,1.8,24,2);flood2.position.set(1.5,5.6,4.6);back.add(flood2);
  scene.add(back);
}
function grassMaterial(){
  const texture=new THREE.TextureLoader().load('./assets/textures/natural-grass-v3.png?v=1');
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(18,12);texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const bump=texture.clone();bump.colorSpace=THREE.NoColorSpace;
  const material=new THREE.MeshStandardMaterial({map:texture,bumpMap:bump,color:0xb2bd9c,bumpScale:.012,roughness:1,metalness:0});
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
    #include <map_fragment>
    #ifdef USE_MAP
      float mowing=sin(vMapUv.x*3.14159265/1.5);
      diffuseColor.rgb*=1.0+0.045*mowing;
    #endif
  `);};material.customProgramCacheKey=()=> 'reference-grass-v3';return material;
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
  // Keep the turf clear of markings that do not match the rotated goal.
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
function clipsFor(gltf){const clips=gltf.animations||[];const pick=(...re)=>clips.find(c=>re.some(r=>r.test(c.name.toLowerCase())))||null;return{idle:pick(/idle/,/stand/,/breath/),run:pick(/run/,/jog/,/sprint/),walk:pick(/walk/),kick:pick(/kick/,/shoot/,/soccer/),celebrate:pick(/celebr/,/victory/,/cheer/),saveLeft:pick(/save.*left/,/dive.*left/,/left.*dive/),saveRight:pick(/save.*right/,/dive.*right/,/right.*dive/),miss:pick(/miss/,/defeat/,/fall/)}};
function prepareActor(gltf,type,team){
  // Keep normalization on the visual child; match movement belongs to the wrapper.
  const model=gltf.scene;normalizeModel(model,2.42);tintTeamModel(model,team);
  if(!DEMO&&type==='player'&&team==='A')refinePlayerASurface(model);
  
  const root=new THREE.Group();root.add(model);
  const mixer=new THREE.AnimationMixer(model),clips=clipsFor(gltf),actions={};
  for(const name of ['idle','run','kick','walk']){
    if(!clips[name]){if(name==='walk')continue;throw new Error('Player A animation missing: '+name);}
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
function refinePlayerASurface(model){
  model.traverse(object=>{
    if(!object.isMesh)return;
    const refine=source=>{
      const material=new THREE.MeshPhysicalMaterial();
      THREE.MeshStandardMaterial.prototype.copy.call(material,source);
      const skin=/skin/i.test(source.name),hair=/hair/i.test(source.name);
      material.metalness=0;material.clearcoat=0;
      material.roughness=skin?.52:hair?.57:.86;
      material.ior=skin?1.4:1.46;material.specularIntensity=skin?.38:hair?.55:.30;
      material.sheen=skin||hair?0:.08;material.sheenRoughness=.85;
      if(!skin){
        const motion={time:{value:0},strength:{value:0},kick:{value:0}};
        material.userData.secondaryMotion=motion;
        material.onBeforeCompile=shader=>{
          shader.uniforms.secondaryTime=motion.time;shader.uniforms.secondaryStrength=motion.strength;shader.uniforms.secondaryKick=motion.kick;
          shader.vertexShader='uniform float secondaryTime; uniform float secondaryStrength; uniform float secondaryKick;\n'+shader.vertexShader;
          const displacement=hair?`
            float loose=clamp((.98-position.y)/.30,0.,1.)*smoothstep(.035,.12,-position.z);
            transformed.x+=sin(secondaryTime*8.0+position.y*4.0)*.022*loose*secondaryStrength;
            transformed.z+=sin(secondaryTime*6.0)*.015*loose*secondaryStrength;
          `:`
            float hem=(1.-smoothstep(-.20,.20,position.y))*smoothstep(-.30,-.16,position.y);
            vec2 outward=normalize(vec2(position.x,position.z+.02)+vec2(.0001));
            float flutter=sin(secondaryTime*9.0+position.x*17.0)*.010*secondaryStrength;
            transformed.xz+=outward*hem*(flutter+secondaryKick*.030);
            transformed.y+=sin(secondaryTime*10.0+position.z*24.0)*.005*hem*secondaryStrength;
          `;
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+displacement);
        };
        material.customProgramCacheKey=()=>hair?'player-a-hair-motion-v1':'player-a-cloth-motion-v1';
      }
      if(material.normalScale)material.normalScale.multiplyScalar(skin?1.18:1.12);
      for(const key of ['map','normalMap'])if(material[key]){
        material[key]=material[key].clone();
        material[key].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
        material[key].generateMipmaps=true;material[key].minFilter=THREE.LinearMipmapLinearFilter;
        material[key].needsUpdate=true;
      }
      material.needsUpdate=true;return material;
    };
    object.material=Array.isArray(object.material)?object.material.map(refine):refine(object.material);
  });
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
  next.setLoop(['idle','run','walk'].includes(name)?THREE.LoopRepeat:THREE.LoopOnce,['idle','run','walk'].includes(name)?Infinity:1);
  next.clampWhenFinished=!['idle','run','walk'].includes(name);
  next.play();
  next.paused=name==='idle'&&data.type==='player';
  const blend=data.team==='A'?(name==='kick'?.14:name==='idle'?.32:.24):.12;
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
        actor.userData.team='keeper';actor.userData.homeX=2.95;actor.userData.homeZ=GOAL_Z;actor.userData.baseRotationY=-Math.PI/2;
        recolorKit(actor,'#14633f','#2fa66c');
        const old=keeper;scene.remove(old);
        if(old?.userData?.mixer){const i=mixers.indexOf(old.userData.mixer);if(i>=0)mixers.splice(i,1)}
        keeper=actor;keeper.position.set(2.95,0,GOAL_Z);keeper.rotation.set(0,-Math.PI/2,0);
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
function resize(){if(!renderer||!camera)return;const box=document.getElementById('game3dCanvas')?.getBoundingClientRect();if(!box||!box.width)return;renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.fov=DEMO?49:THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(52)/2)/Math.min(1,camera.aspect)));camera.updateProjectionMatrix()}
function resetPose(){if(DEMO){resetDemoPose();return;}if(!playerA||!playerB||!keeper||!ball)return;for(const p of [playerA,playerB]){p.visible=true;p.position.set(p.userData.homeX,0,p.userData.homeZ);p.rotation.set(0,p.userData.baseRotationY??Math.PI/2,0);if(p.userData.real)playAction(p,'idle');else{p.userData.ll.rotation.set(0,0,0);p.userData.rl.rotation.set(0,0,0);p.userData.la.rotation.set(0,0,-.18);p.userData.ra.rotation.set(0,0,.18)}}keeper.position.set(keeper.userData.homeX??3.75,0,keeper.userData.homeZ??0);keeper.rotation.set(0,keeper.userData.baseRotationY??-Math.PI/2,0);if(keeper.userData.real)playAction(keeper,'idle');else{keeper.userData.la.rotation.set(0,0,-.4);keeper.userData.ra.rotation.set(0,0,.4)}ball.position.set(-1,.14,0);}
function naturalRealIdle(actor,t,phase=0){
  return; // Waiting poses will be authored separately; remove the current swaying.
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
  for(const m of mixers)m.update(dt);
  installPlayerA();
  if(animation)runAnimation(t);
  else{
    idleActor(playerA,t,0);
    idleActor(playerB,t,1.7);
    idleKeeper(t);
  }
  if(DEMO){for(const actor of demoActors.values()){if(actor!==animation?.player)idleActor(actor,t,actor.userData.idlePhase||0);stabilizeHead(actor,dt);}stabilizeHead(keeper,dt);demoReactions(t);}else{stabilizeHead(playerA,dt);stabilizeHead(playerB,dt);}
  updatePlayerASecondaryMotion(dt,t);
  updateCamera(dt);if(animation&&!DEMO&&['outcome','net','result'].includes(animation.phase))fitWholeGoal();renderer.render(scene,camera);
}
function updatePlayerASecondaryMotion(dt,t){
  if(DEMO||!playerA?.userData.real)return;
  const active=animation?.team==='A',phase=active?animation.phase:null;
  const wanted=phase==='run'?1:phase==='returnWalk'?.48:phase==='kick'?.9:0;
  const data=playerA.userData;data.secondaryStrength=lerp(data.secondaryStrength||0,wanted,1-Math.exp(-dt*5));
  const kick=phase==='kick'?smooth(clamp((t-animation.start)/animation.timing.contact,0,1)):0;
  data.secondaryKick=lerp(data.secondaryKick||0,kick,1-Math.exp(-dt*10));
  playerA.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
    const uniforms=m.userData.secondaryMotion;if(!uniforms)continue;
    uniforms.time.value=t/1000;uniforms.strength.value=data.secondaryStrength;uniforms.kick.value=data.secondaryKick;
  }});
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
  let view=VIEW.idle;
  if(animation&&!DEMO){
    const phase=animation.phase;
    if(['returnTurn','returnWalk','returnFace'].includes(phase))view=VIEW.idle;else if(['turn','run','kick'].includes(phase))view={position:[-6.8,2.6,2.6],target:[1.6,1,.35]};
    else if(['ball','awaitResult','outcome','net','result'].includes(phase)){
      // Track the ball into the goal from a fixed position beside the shooter.
      const follow=animation.cameraFollow=Math.max(animation.cameraFollow||0,smooth(clamp((ball.position.x+1)/4.45,0,1)));
      view={position:[lerp(-6,-4.45,follow),lerp(2.1,1.5,follow),2.02],target:[lerp(1.6,4.42,follow),lerp(1.0,1.12,follow),GOAL_Z+ball.position.z*.08]};
    }else view=VIEW.shot;
  }else if(animation)view=VIEW.shot;
  const closeView=animation&&!DEMO&&['outcome','net','result'].includes(animation.phase);
  const baseFov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(52)/2)/Math.min(1,camera.aspect)));
  camera.fov=lerp(camera.fov,DEMO?49:baseFov,1-Math.exp(-dt*3.1));camera.updateProjectionMatrix();
  const k=1-Math.exp(-dt*(3.1)),zoom=Math.max(.75,Math.min(1.4,(Number(runtimeSettings.cameraZoom)||100)/100));
  const [tx,ty,tz]=view.target;
  const px=tx+(view.position[0]-tx)*zoom,py=ty+(view.position[1]-ty)*zoom,pz=tz+(view.position[2]-tz)*zoom;
  camera.position.x=lerp(camera.position.x,px,k);camera.position.y=lerp(camera.position.y,py,k);camera.position.z=lerp(camera.position.z,pz,k);
  cameraTarget.x=lerp(cameraTarget.x,tx,k);cameraTarget.y=lerp(cameraTarget.y,ty,k);cameraTarget.z=lerp(cameraTarget.z,tz,k);camera.lookAt(cameraTarget.x,cameraTarget.y,cameraTarget.z);
  // Leave space around the shooting player's hips at the portrait frame's left edge.
  if(animation&&!DEMO&&['turn','run','kick'].includes(animation.phase)){
    const actor=animation.team==='B'?playerB:playerA;
    if(actor?.visible){
      camera.updateMatrixWorld();actor.updateWorldMatrix(true,true);
      const hip=actor.userData.kickRig?.hips;
      const center=hip?hip.getWorldPosition(new THREE.Vector3()):actor.position.clone().add(new THREE.Vector3(0,1.2,0));
      const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
      const edge=center.clone().addScaledVector(right,closeView?-.30:-.42),projected=edge.clone().project(camera);
      const depth=-edge.clone().applyMatrix4(camera.matrixWorldInverse).z;
      if(depth>0&&projected.x<-.84){
        const shift=(projected.x+(closeView?.68:.84))*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect;
        camera.position.addScaledVector(right,shift);
        if(!closeView){cameraTarget.x+=right.x*shift;cameraTarget.y+=right.y*shift;cameraTarget.z+=right.z*shift;}
        camera.lookAt(cameraTarget.x,cameraTarget.y,cameraTarget.z);
      }
    }
  }
}
function fitWholeGoal(){
  camera.updateMatrixWorld();goalObject.updateWorldMatrix(true,true);
  let needed=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  for(const z of [-3.72,3.72])for(const y of [0,2.50]){
    const corner=goalObject.localToWorld(new THREE.Vector3(0,y,z)).applyMatrix4(camera.matrixWorldInverse);
    const depth=-corner.z;if(depth<=0)continue;
    needed=Math.max(needed,Math.abs(corner.x)/(depth*camera.aspect*.90),Math.abs(corner.y)/(depth*.82));
  }
  camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(needed));camera.updateProjectionMatrix();
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
  let hipDrop=Math.max(0,hipsWorld.y-.98);
  if(player.userData.team==='A'&&animation?.supportFoot){
    const h=rig.left[0].getWorldPosition(new THREE.Vector3()),k=rig.left[1].getWorldPosition(new THREE.Vector3());
    const reach=h.distanceTo(k)+k.distanceTo(rig.left[2].getWorldPosition(new THREE.Vector3())),support=animation.supportFoot;
    const horizontal=Math.hypot(h.x-support.x,h.z-support.z);
    const vertical=Math.sqrt(Math.max(.04,reach*reach-horizontal*horizontal));
    hipDrop=Math.max(0,h.y-support.y-vertical+.025);
  }
  rig.hips.position.y-=(hipDrop/parentScale.y)*weight;player.updateMatrixWorld(true);
  const support=player.userData.team==='A'&&animation?.supportFoot?animation.supportFoot:planted;
  solveLeg(rig.left,support,weight);solveLeg(rig.right,new THREE.Vector3(-1.06,.19,SHOT_Z),weight);player.updateMatrixWorld(true);
}
function beginShot(team){
  if(!playerA||!playerB||!keeper||!ball)return;
  if(animation&&animation.team===team&&['turn','run','kick','ball','awaitResult','outcome','net'].includes(animation.phase))return;
  resetPose();const p=team==='A'?playerA:playerB;
  animation={phase:'turn',team,start:performance.now(),player:p,result:null,timing:team==='A'?PLAYER_A_TIMING:{turn:TURN_MS,run:RUN_MS,contact:KICK_CONTACT_MS},runYaw:Math.atan2(-1.9-p.userData.homeX,-p.userData.homeZ)};
  const variation=saveSequence++;
  animation.saveStyle=['parry','catch','foot'][variation%3];
  animation.saveSide=variation%2?1:-1;
  animation.targetZ=GOAL_Z+animation.saveSide*(.45+(variation%3)*.30);
  animation.shotHeight=animation.saveStyle==='foot'?.32:animation.saveStyle==='catch'?1.12:1.32;
}
function finishShot(team,result){
  if(!animation||animation.team!==team)beginShot(team);
  if(!animation||animation.result)return;
  // Store the real result without cutting short the turn or run animation.
  animation.result=result;
}
function enterKick(a,t){a.phase='kick';a.start=t;if(a.team==='A'&&a.player.userData.kickRig?.left[2]){a.supportFoot=new THREE.Vector3(a.player.position.x-.10,.08,SHOT_Z+.18);}if(a.player.userData.real){playAction(a.player,'kick');a.kickEnd=t+a.player.userData.actions.kick.getClip().duration/a.player.userData.actions.kick.getEffectiveTimeScale()*1000;}setTimeout(()=>{try{window.AIFootballAudio?.kick?.(0)}catch(e){}},Math.max(0,(a.timing?.contact||KICK_CONTACT_MS)*(a.team==='A'?1:.72)));}
function keeperSavePose(a,u){
  const side=a.saveSide??shotSide(a.team),style=a.saveStyle||'parry',weight=smooth(u);
  keeper.position.set(3.78,style==='parry'?Math.sin(u*Math.PI)*.22:0,lerp(GOAL_Z,a.targetZ??shotTarget(a.team),weight));
  keeper.rotation.x=style==='parry'?side*.32*weight:0;
  if(!keeper.userData.real)return;
  idleBone(keeper,'mixamorigHips','X',-.14*weight);
  idleBone(keeper,'mixamorigSpine','X',-.10*weight);
  for(const leg of ['Left','Right']){
    idleBone(keeper,'mixamorig'+leg+'UpLeg','X',-.32*weight);
    idleBone(keeper,'mixamorig'+leg+'Leg','X',.48*weight);
  }
  if(style==='foot'){
    const leg=side>0?'Left':'Right';
    idleBone(keeper,'mixamorig'+leg+'UpLeg','Z',side*.55*weight);
    idleBone(keeper,'mixamorig'+leg+'Leg','X',-.35*weight);
    const chain=['UpLeg','Leg','Foot'].map(n=>keeper.getObjectByName('mixamorig'+leg+n));
    if(chain.every(Boolean)){
      for(const bone of chain)if(!keeper.userData.idleOffsets.some(entry=>entry.bone===bone))keeper.userData.idleOffsets.push({bone,base:bone.quaternion.clone()});
      keeper.updateWorldMatrix(true,true);solveLeg(chain,new THREE.Vector3(3.45,.22,a.targetZ),weight);
    }
  }else{
    const target=new THREE.Vector3(3.45,a.shotHeight||1.12,a.targetZ??shotTarget(a.team));
    for(const arm of style==='catch'?['Left','Right']:[side>0?'Left':'Right']){
      const chain=['Arm','ForeArm','Hand'].map(n=>keeper.getObjectByName('mixamorig'+arm+n));
      if(chain.some(b=>!b))continue;
      for(const bone of chain)(keeper.userData.idleOffsets ||= []).push({bone,base:bone.quaternion.clone()});
      keeper.updateWorldMatrix(true,true);solveLeg(chain,target.clone().add(new THREE.Vector3(0,0,style==='catch'?(arm==='Left'?.10:-.10):0)),weight);
    }
  }
}
function runAnimation(t){
  const a=animation,p=a.player;if(!p)return;let u;const side=a.saveSide??shotSide(a.team),targetZ=a.targetZ??shotTarget(a.team);
  if(a.team==='A'&&a.kickEnd&&t>=a.kickEnd&&!a.followThroughComplete){a.followThroughComplete=true;playAction(p,'idle');}
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
    groundKick(p,smooth(u));if(!a.kickSoundPlayed&&u>=(a.team==='A'?1:.72)){a.kickSoundPlayed=true;try{window.AIFootballAudio?.kick?.(0)}catch(e){}phaseEvent('kick');}if(u>=1){a.phase='ball';a.start=t;phaseEvent('ball');}
  }else if(a.phase==='ball'){
    if(t-a.start<(a.team==='A'?240:170))groundKick(p,1-smooth(clamp((t-a.start)/(a.team==='A'?240:170),0,1)));else if(a.team!=='A'&&t-a.start>=450&&!a.playerPoseLocked){a.playerPoseLocked=true;if(p.userData.activeAction)p.userData.activeAction.paused=true;}
    u=clamp((t-a.start)/650,0,1);
    // Both outcomes share the approach. Never cross the goal before its result arrives.
    ball.position.set(lerp(-1,3.45,u),lerp(.14,a.shotHeight||.90,u)+Math.sin(u*Math.PI)*(a.saveStyle==='foot'?.12:.55),lerp(SHOT_Z,targetZ,u));
    ball.rotation.x+=.25;ball.rotation.z+=.18;
    if(a.result==='goal'){const dive=smooth(u);keeper.position.z=GOAL_Z-side*1.05*dive;keeper.position.y=Math.sin(u*Math.PI)*.20;keeper.rotation.x=-side*.95*dive;}
    if(a.result==='save'){
      keeperSavePose(a,u);
    }
    if(u>=1){a.phase=a.result?'outcome':'awaitResult';a.start=t;if(a.result==='save')phaseEvent('save');}
  }else if(a.phase==='awaitResult'){
    if(a.result){a.phase='outcome';a.start=t;}
  }else if(a.phase==='outcome'){
    u=clamp((t-a.start)/350,0,1);
    if(a.result==='goal'){
      // The goal plane is x=4.42; only a confirmed goal may travel beyond it.
      const end=DEMO?new THREE.Vector3(5.01,.70,targetZ):goalObject.localToWorld(new THREE.Vector3(.82,.70,targetZ-goalObject.position.z));
      ball.position.set(lerp(3.45,end.x,u),lerp(.90,end.y,u)+Math.sin(u*Math.PI)*.12,lerp(targetZ,end.z,u));
      keeper.position.z=GOAL_Z-side*1.05;keeper.position.y=0;keeper.rotation.x=-side*.95;
      const local=goalObject.worldToLocal(ball.position.clone());if(!a.goalSoundPlayed&&local.x>=0){a.goalSoundPlayed=true;phaseEvent('net');}
    }else{
      keeperSavePose(a,1);
      if(a.saveStyle==='catch')ball.position.set(3.45,a.shotHeight,targetZ);
      else ball.position.set(lerp(3.45,a.saveStyle==='foot'?1.75:2.35,u),lerp(a.shotHeight||.9,.14,u)+Math.sin(u*Math.PI)*.30,lerp(targetZ,GOAL_Z+side*1.65,u));
    }
    ball.rotation.x+=.25;ball.rotation.z+=.18;
    if(u>=1){a.phase=a.result==='goal'?'net':'result';a.start=t;if(a.phase==='net'&&!a.goalSoundPlayed){a.goalSoundPlayed=true;phaseEvent('net');}}
  }else if(a.phase==='net'){
    u=clamp((t-a.start)/420,0,1);
    // Contact with the rear net reverses the ball and drops it inside the goal.
    if(!a.netEnd)a.netEnd=ball.position.clone();ball.position.set(a.netEnd.x-.25*smooth(u),lerp(.70,.14,u)+Math.sin(u*Math.PI)*.08,a.netEnd.z);
    ball.rotation.x+=.08;
    if(u>=1){a.phase='result';a.start=t;}
  }else if(a.phase==='result'){
    u=clamp((t-a.start)/(DEMO?1100:850),0,1);
    const bounce=Math.abs(Math.sin(u*Math.PI*4))*(1-u)*.10;
    if(a.result==='save'&&a.saveStyle==='catch'){keeperSavePose(a,1);ball.position.set(3.45,a.shotHeight,targetZ);}
    else ball.position.y=.14+bounce;
    if(a.result==='goal'){p.rotation.y=Math.PI/2;if(!p.userData.real)p.position.y=Math.sin(u*Math.PI)*.18;}
    if(u>=1){if(!DEMO&&a.team==='A'){
      a.phase='returnTurn';a.start=t;a.returnFrom=p.position.clone();a.returnYaw=Math.atan2(p.userData.homeX-p.position.x,p.userData.homeZ-p.position.z);a.returnStartYaw=p.rotation.y;playAction(p,'idle');
    }else if(DEMO){a.phase='return';a.start=t;p.userData.reactionWeight=0;if(p.userData.real)playAction(p,'run');}else{resetPose();animation=null;}}
  }else if(a.phase==='returnTurn'){
    u=clamp((t-a.start)/420,0,1);p.rotation.y=angleLerp(a.returnStartYaw,a.returnYaw,smooth(u));
    if(u>=1){a.phase='returnWalk';a.start=t;a.returnDuration=1000*a.returnFrom.distanceTo(new THREE.Vector3(p.userData.homeX,0,p.userData.homeZ))/1.05;playAction(p,'walk');}
  }else if(a.phase==='returnWalk'){
    u=clamp((t-a.start)/a.returnDuration,0,1);
    p.position.set(lerp(a.returnFrom.x,p.userData.homeX,u),0,lerp(a.returnFrom.z,p.userData.homeZ,u));p.rotation.y=a.returnYaw;
    if(u>.90&&!a.arriving){a.arriving=true;playAction(p,'idle');}
    if(u>=1){a.phase='returnFace';a.start=t;}
  }else if(a.phase==='returnFace'){
    u=clamp((t-a.start)/420,0,1);p.rotation.y=angleLerp(a.returnYaw,p.userData.baseRotationY,smooth(u));
    if(u>=1){resetPose();animation=null;}
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
        const navy=b>12&&b>r*1.15&&b>g*1.03&&sat>.28;
        const yellow=r>145&&g>105&&b<115&&r>g*.92&&g>b*1.35&&sat>.28;
        if(!navy&&!yellow)continue;
        actor.userData.recoloredPixels=(actor.userData.recoloredPixels||0)+1;
        const color=navy?mainRGB:accentRGB,luma=Math.max(navy&&mainRGB[0]>mainRGB[1]*2?.72:.42,Math.min(1.08,max/215));
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
  last=(ev.dataset.matchMessage||ev.textContent||'').trim();
  new MutationObserver(read).observe(ev,{childList:true,characterData:true,subtree:true});
}
function hookGame(){if(hooked)return;if(typeof window.resolveShot!=='function'){setTimeout(hookGame,150);return}hooked=true;const old=window.resolveShot;window.resolveShot=async function(team,shot){try{beginShot(team)}catch(e){}await sleep(360);const r=await old.apply(this,arguments);const ev=document.getElementById('event');const txt=(ev?.dataset.matchMessage||ev?.textContent||'').trim();const goal=txt.match(/^GOL!\s*(Sarı-Lacivert|Sarı-Kırmızı)/i);const save=txt.match(/^(Sarı-Lacivert|Sarı-Kırmızı)\s+kalecisi kurtardı!/i);const attacking=goal?(/^Sarı-Lacivert/i.test(goal[1])?'A':'B'):save?(/^Sarı-Lacivert/i.test(save[1])?'B':'A'):null;if(attacking===team){try{finishShot(team,goal?'goal':'save')}catch(e){}}return r};}
async function boot(){if(installed)return;const shell=addStageShell();if(!shell){setTimeout(boot,120);return}installed=true;runtimeSettings={...runtimeSettings,...(window.__AI_FOOTBALL_SETTINGS||{})};try{await loadThree();setupScene();if(DEMO)window.dispatchEvent(new CustomEvent('football-scene-ready'));else{hookGame()}}catch(e){console.error('3D sahne yüklenemedi',e);setLabel('3D SAHNE YÜKLENEMEDİ')}}
window.addEventListener('ai-football-settings',e=>apply3DSettings(e.detail||{}));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.AIFootball3D={beginShot,finishShot,reset:resetPose,reloadModels:tryLoadRealModels,configureTeams,playDemoShot,applySettings:apply3DSettings,get ready(){return !!scene},get settings(){return {...runtimeSettings}},get modelStatus(){return [...demoActors].map(([team,actor])=>({team,loaded:actor.userData.real,recoloredPixels:actor.userData.recoloredPixels||0}));}};
})();






