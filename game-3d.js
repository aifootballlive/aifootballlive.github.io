(()=>{
'use strict';
let THREE=null,GLTFLoader=null,scene=null,camera=null,renderer=null,clock=null;
let ball=null,keeper=null,playerA=null,playerB=null;
let animation=null,installed=false,hooked=false,realMode=false;
let playerALoad=null,pendingPlayerA=null,pendingPlayerB=null;
const mixers=[];

const ASSETS={
  playerA:'./assets/models/player-a.glb?v=5',
  playerB:'./assets/models/player-b-existing.glb?v=2',
  keeper:'./assets/models/goalkeeper.glb'
};

const HOME={A:{x:-3.25,z:1.75},B:{x:-1.55,z:2.0}};
const VIEW={idle:{position:[-6,2.25,4.4],target:[-.65,1.1,.2]},shot:{position:[-6.5,2.3,4.3],target:[.4,1.05,0]}};
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
  wrap.style.cssText='position:relative;height:clamp(340px,54vw,440px);margin:5px 0;border:1px solid #2b3556;border-radius:12px;overflow:hidden;background:linear-gradient(180deg,#10192a,#112c1b);';
  const label=wrap.firstElementChild;
  label.style.cssText='position:absolute;z-index:3;left:8px;top:7px;padding:4px 7px;border-radius:7px;background:rgba(8,14,26,.72);color:#fff;font-size:8px;font-weight:900;letter-spacing:.4px;pointer-events:none';
  score.insertAdjacentElement('afterend',wrap);
  return wrap;
}
function setLabel(text){const el=document.getElementById('game3dLabel');if(el)el.textContent=text}
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
  root.userData={team,real:false,torso,ll,rl,la,ra,homeX:HOME[team].x,homeZ:HOME[team].z,baseRotationY:facingCamera(HOME[team])};root.position.set(root.userData.homeX,0,root.userData.homeZ);root.rotation.y=root.userData.baseRotationY;return root;
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
  const g=new THREE.Group(),white=mat(0xf5f7fb,.45,.05),post=.055;const add=(geo,x,y,z)=>{const m=mesh(geo,white);m.position.set(x,y,z);g.add(m)};
  add(new THREE.BoxGeometry(post,2.25,post),4.42,1.125,-1.55);add(new THREE.BoxGeometry(post,2.25,post),4.42,1.125,1.55);add(new THREE.BoxGeometry(post,post,3.15),4.42,2.23,0);
  const netMat=new THREE.LineBasicMaterial({color:0xcdd5df,transparent:true,opacity:.62});
  const line=(a,b)=>g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]),netMat));
  // The mouth is open. Mesh panels belong behind, beside and above the goal.
  for(let y=.15;y<=2.23;y+=.20){line([5.15,y,-1.55],[5.15,y,1.55]);for(const z of [-1.55,1.55])line([4.42,y,z],[5.15,y,z]);}
  for(let z=-1.55;z<=1.55;z+=.20){line([5.15,.15,z],[5.15,2.23,z]);line([4.42,2.23,z],[5.15,2.23,z]);}
  for(let x=4.42;x<=5.15;x+=.18){for(const z of [-1.55,1.55])line([x,.15,z],[x,2.23,z]);line([x,2.23,-1.55],[x,2.23,1.55]);}
  return g;
}
function addStadium(){
  const back=new THREE.Group();
  const board=(x,z,color)=>{const m=mesh(new THREE.BoxGeometry(2.5,.7,.12),mat(color));m.position.set(x,.4,z);back.add(m);};
  for(let i=0;i<5;i++)board(-5+i*2.5,-3.25,i<3?0x15387b:0xaf2231);
  for(let row=0;row<4;row++){
    const terrace=mesh(new THREE.BoxGeometry(22,.35,1.1),mat(0x202838));terrace.position.set(0,.8+row*.55,-4.2-row*.95);back.add(terrace);
    const crowd=new THREE.InstancedMesh(new THREE.SphereGeometry(.105,6,5),mat(0xb0a397),64);const matrix=new THREE.Matrix4();
    for(let i=0;i<64;i++){matrix.makeTranslation(-10.2+i*.32,.98+row*.55,-4.15-row*.95);crowd.setMatrixAt(i,matrix);crowd.setColorAt(i,new THREE.Color([0x183f9b,0xffce21,0xbe2539,0x8b7771][(i+row)%4]));}back.add(crowd);
  }
  for(const x of [-6,6]){const post=mesh(new THREE.CylinderGeometry(.05,.07,6,8),mat(0x596779));post.position.set(x,3,-4);back.add(post);const lamp=mesh(new THREE.BoxGeometry(1.3,.18,.2),new THREE.MeshStandardMaterial({color:0xe9f3ff,emissive:0x94baff,emissiveIntensity:2}));lamp.position.set(x,6,-4);back.add(lamp);}
  scene.add(back);
}
function setupScene(){
  const holder=document.getElementById('game3dCanvas');if(!holder)return;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x0a1424);camera=new THREE.PerspectiveCamera(40,1,.1,100);camera.position.set(...VIEW.idle.position);camera.lookAt(...VIEW.idle.target);scene.fog=new THREE.Fog(0x0a1424,13,35);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;if('outputColorSpace' in renderer)renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  holder.appendChild(renderer.domElement);renderer.domElement.style.cssText='display:block;width:100%;height:100%';holder.style.cssText='width:100%;height:100%';
  scene.add(new THREE.HemisphereLight(0xdcecff,0x18331d,2.0));const sun=new THREE.DirectionalLight(0xffffff,2.8);sun.position.set(-3,8,4);sun.castShadow=true;scene.add(sun);const fill=new THREE.DirectionalLight(0x86a7ff,1.1);fill.position.set(4,4,5);scene.add(fill);
  const pitch=mesh(new THREE.PlaneGeometry(12,6),mat(0x1f7438,.94,0));pitch.rotation.x=-Math.PI/2;pitch.receiveShadow=true;scene.add(pitch);
  const lineMat=new THREE.LineBasicMaterial({color:0xf5f7fa,transparent:true,opacity:.7});const pts=[new THREE.Vector3(-5.7,.012,-2.8),new THREE.Vector3(5.7,.012,-2.8),new THREE.Vector3(5.7,.012,2.8),new THREE.Vector3(-5.7,.012,2.8),new THREE.Vector3(-5.7,.012,-2.8)];scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMat));
  addStadium();scene.add(createGoal());keeper=createKeeper();playerA=createPlayer('A');playerB=createPlayer('B');scene.add(keeper,playerA,playerB);
  ball=mesh(new THREE.SphereGeometry(.14,24,18),mat(0xf7f7f7,.45,.02));ball.position.set(-1.0,.14,0);scene.add(ball);const spot=mesh(new THREE.CircleGeometry(.04,16),mat(0xffffff,.8,0));spot.rotation.x=-Math.PI/2;spot.position.set(-1,.013,0);scene.add(spot);
  clock=new THREE.Clock();resize();window.addEventListener('resize',resize);animate();tryLoadRealModels();
}
function normalizeModel(root,targetHeight=2.15){root.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(root);const size=new THREE.Vector3();box.getSize(size);if(size.y>0){const s=targetHeight/size.y;root.scale.multiplyScalar(s)}root.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(root);root.position.y-=box.min.y;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){if(Array.isArray(o.material))o.material=o.material.map(m=>m.clone());else o.material=o.material.clone()}}});}
function tintTeamModel(root,team){const main=team==='A'?0x173f9b:0xc91f2c;const yellow=0xffd21f;const skirt=team==='A'?0x152b59:0x6d1821;root.traverse(o=>{if(!o.isMesh||!o.material)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){const n=((o.name||'')+' '+(m.name||'')).toLowerCase();if(/skin|face|head|hair|eye|teeth|mouth/.test(n))continue;if(/sock/.test(n)){if(m.color)m.color.setHex(skirt);continue}if(/skirt|short|bottom|pants/.test(n)){if(m.color)m.color.setHex(skirt);continue}if(/stripe|trim|line|accent/.test(n)){if(m.color)m.color.setHex(yellow);continue}if(/shirt|jersey|top|cloth|uniform|body|torso/.test(n)){if(m.color)m.color.setHex(main);continue}if(/stripe|trim|line|accent/.test(n)){if(m.color)m.color.setHex(yellow)}}});}
function clipsFor(gltf){const clips=gltf.animations||[];const pick=(...re)=>clips.find(c=>re.some(r=>r.test(c.name.toLowerCase())))||null;return{idle:pick(/idle/,/stand/,/breath/),run:pick(/run/,/jog/,/sprint/),kick:pick(/kick/,/shoot/,/soccer/),celebrate:pick(/celebr/,/victory/,/cheer/),saveLeft:pick(/save.*left/,/dive.*left/,/left.*dive/),saveRight:pick(/save.*right/,/dive.*right/,/right.*dive/),miss:pick(/miss/,/defeat/,/fall/)}};
function prepareActor(gltf,type,team){
  // Keep normalization on the visual child; match movement belongs to the wrapper.
  const model=gltf.scene;normalizeModel(model,2.30);tintTeamModel(model,team);
  const root=new THREE.Group();root.add(model);
  const mixer=new THREE.AnimationMixer(model),clips=clipsFor(gltf),actions={};
  for(const name of ['idle','run','kick']){
    if(!clips[name])throw new Error('Player A animation missing: '+name);
    actions[name]=mixer.clipAction(clips[name]);
  }
  root.userData={real:true,type,team,actions,mixer,homeX:HOME[team].x,homeZ:HOME[team].z,baseRotationY:facingCamera(HOME[team]),kickContactTime:model.userData.kickContactTime??7/30};
  root.userData.kickRig={hips:model.getObjectByName('mixamorigHips'),right:[model.getObjectByName('mixamorigRightUpLeg'),model.getObjectByName('mixamorigRightLeg'),model.getObjectByName('mixamorigRightFoot')],left:[model.getObjectByName('mixamorigLeftUpLeg'),model.getObjectByName('mixamorigLeftLeg'),model.getObjectByName('mixamorigLeftFoot')]};
  if(team==='A'){
    model.updateMatrixWorld(true);
    root.userData.headControl=['mixamorigNeck','mixamorigHead'].map(name=>{
      const bone=model.getObjectByName(name);
      return bone?{bone,restWorld:bone.getWorldQuaternion(new THREE.Quaternion()),smoothed:null,limit:name.endsWith('Head')?.20:.30}:null;
    }).filter(Boolean);
  }
  root.position.set(HOME[team].x,0,HOME[team].z);root.rotation.y=root.userData.baseRotationY;playAction(root,'idle');return root;
}
function playAction(actor,name){
  if(!actor?.userData?.real)return;
  const data=actor.userData,actions=data.actions||{},next=actions[name]||actions.idle;
  if(!next)return;
  if(data.activeAction===next&&next.isRunning())return;
  const previous=data.activeAction;
  const contact=data.team==='A'?PLAYER_A_TIMING.contact:KICK_CONTACT_MS;
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
  if(animation)return;
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
  if(playerA?.userData?.real&&playerB?.userData?.real)return;
  if(playerALoad)return playerALoad;
  if(!GLTFLoader){setLabel('3D MAÇ SAHNESİ • MODEL BEKLENİYOR');return}
  playerALoad=(async()=>{
    setLabel('OYUNCULAR YÜKLENİYOR…');
    let loader;
    try{loader=new GLTFLoader();const {MeshoptDecoder}=await import('./assets/vendor/meshopt-decoder.mjs');await MeshoptDecoder.ready;loader.setMeshoptDecoder(MeshoptDecoder)}
    catch(e){console.warn('Model çözücü yüklenemedi; prosedürel model devam ediyor',e);setLabel('3D MAÇ SAHNESİ • BASİT MODEL');playerALoad=null;return}
    const load=async team=>{
      if((team==='A'?playerA:playerB)?.userData?.real)return;
      try{
        const gltf=await loader.loadAsync(team==='A'?ASSETS.playerA:ASSETS.playerB);
        const actor=prepareActor(gltf,'player',team);
        if(team==='A')pendingPlayerA=actor;else pendingPlayerB=actor;
        // Show each completed model immediately, or after the active shot finishes.
        installPlayerA();
      }catch(e){console.warn('Oyuncu '+team+' yüklenemedi; prosedürel model devam ediyor',e)}
    };
    try{await Promise.all([load('A'),load('B')]);if(!realMode&&!pendingPlayerA&&!pendingPlayerB)setLabel('3D MAÇ SAHNESİ • BASİT MODEL')}
    finally{playerALoad=null}
  })();
  return playerALoad;
}
function resize(){if(!renderer||!camera)return;const box=document.getElementById('game3dCanvas')?.getBoundingClientRect();if(!box||!box.width)return;renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.fov=camera.aspect<1.25?55:40;camera.updateProjectionMatrix()}
function resetPose(){if(!playerA||!playerB||!keeper||!ball)return;for(const p of [playerA,playerB]){p.visible=true;p.position.set(p.userData.homeX,0,p.userData.homeZ);p.rotation.set(0,p.userData.baseRotationY??Math.PI/2,0);if(p.userData.real)playAction(p,'idle');else{p.userData.ll.rotation.set(0,0,0);p.userData.rl.rotation.set(0,0,0);p.userData.la.rotation.set(0,0,-.18);p.userData.ra.rotation.set(0,0,.18)}}keeper.position.set(keeper.userData.homeX??3.75,0,keeper.userData.homeZ??0);keeper.rotation.set(0,keeper.userData.baseRotationY??-Math.PI/2,0);if(keeper.userData.real)playAction(keeper,'idle');else{keeper.userData.la.rotation.set(0,0,-.4);keeper.userData.ra.rotation.set(0,0,.4)}ball.position.set(-1,.14,0);}
function idleActor(actor,t,phase=0){
  if(!actor||animation)return;
  const s=Math.sin(t*.0024+phase),s2=Math.sin(t*.00125+phase*.7);
  actor.position.y=.018+s*.018;
  actor.rotation.z=actor.userData.real&&actor.userData.team==='A'?0:s2*.022;
  if(actor.userData.real){
    const hasIdle=!!actor.userData.actions?.idle;
    if(!hasIdle)actor.rotation.x=Math.sin(t*.0017+phase)*.012;
    return;
  }
  if(actor.userData.la&&actor.userData.ra){
    actor.userData.la.rotation.z=-.18+s*.08;
    actor.userData.ra.rotation.z=.18-s*.08;
  }
  if(actor.userData.ll&&actor.userData.rl){
    actor.userData.ll.rotation.x=s2*.035;
    actor.userData.rl.rotation.x=-s2*.035;
  }
}
function idleKeeper(t){
  if(!keeper||animation)return;
  const s=Math.sin(t*.0021),s2=Math.sin(t*.0012);
  keeper.position.y=.012+Math.abs(s)*.012;
  keeper.position.z=(keeper.userData.homeZ??0)+s2*.06;
  keeper.rotation.z=s*.012;
  if(!keeper.userData.real&&keeper.userData.la&&keeper.userData.ra){
    keeper.userData.la.rotation.z=-.4+s*.07;
    keeper.userData.ra.rotation.z=.4-s*.07;
  }
}
function animate(){
  requestAnimationFrame(animate);
  if(!renderer||!scene||!camera)return;
  const dt=Math.min(clock?.getDelta?.()||.016,.05),t=performance.now();
  for(const m of mixers)m.update(dt);updateCamera(dt);
  installPlayerA();
  if(animation)runAnimation(t);
  else{
    idleActor(playerA,t,0);
    idleActor(playerB,t,1.7);
    idleKeeper(t);
  }
  stabilizeHead(playerA,dt);
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
  const view=animation?VIEW.shot:VIEW.idle,k=1-Math.exp(-dt*4.5);
  camera.position.x=lerp(camera.position.x,view.position[0],k);camera.position.y=lerp(camera.position.y,view.position[1],k);camera.position.z=lerp(camera.position.z,view.position[2],k);
  cameraTarget.x=lerp(cameraTarget.x,view.target[0],k);cameraTarget.y=lerp(cameraTarget.y,view.target[1],k);cameraTarget.z=lerp(cameraTarget.z,view.target[2],k);camera.lookAt(cameraTarget.x,cameraTarget.y,cameraTarget.z);
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
  solveLeg(rig.left,planted,weight);solveLeg(rig.right,new THREE.Vector3(-1.06,.19,0),weight);player.updateMatrixWorld(true);
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
  const a=animation,p=a.player;if(!p)return;let u;
  if(a.phase==='turn'){
    u=clamp((t-a.start)/a.timing.turn,0,1);p.rotation.y=angleLerp(p.userData.baseRotationY,a.runYaw,smooth(u));
    if(u>=1){a.phase='run';a.start=t;(a.team==='A'?playerB:playerA).visible=false;if(p.userData.real)playAction(p,'run');}
  }else if(a.phase==='run'){
    u=clamp((t-a.start)/a.timing.run,0,1);
    // A curved approach brings the player into the shot without an idle pause.
    const v=1-u;p.position.x=v*v*p.userData.homeX+2*v*u*(-2.45)+u*u*(-1.9);p.position.z=v*v*p.userData.homeZ+2*v*u*.12;
    const dx=2*v*(-2.45-p.userData.homeX)+2*u*.55,dz=2*v*(.12-p.userData.homeZ)-2*u*.12;
    p.rotation.y=Math.atan2(dx,dz);
    if(!p.userData.real){p.userData.ll.rotation.x=Math.sin(u*Math.PI*8)*.55;p.userData.rl.rotation.x=-p.userData.ll.rotation.x;p.userData.la.rotation.x=-p.userData.ll.rotation.x*.7;p.userData.ra.rotation.x=p.userData.ll.rotation.x*.7;}
    if(u>=1)enterKick(a,t);
  }else if(a.phase==='kick'){
    u=clamp((t-a.start)/a.timing.contact,0,1);p.position.x=lerp(-1.9,-1.65,u);p.position.z=0;p.rotation.y=Math.PI/2;
    if(!p.userData.real){p.userData.rl.rotation.x=-1.0*Math.sin(u*Math.PI*.5);p.userData.la.rotation.z=-.18-.45*Math.sin(u*Math.PI*.5);}
    groundKick(p,smooth(u));if(u>=1){a.phase='ball';a.start=t;}
  }else if(a.phase==='ball'){
    if(t-a.start<170)groundKick(p,1-smooth(clamp((t-a.start)/170,0,1)));
    u=clamp((t-a.start)/650,0,1);
    const targetZ=a.team==='A'?.78:-.78;
    // Both outcomes share the approach. Never cross the goal before its result arrives.
    ball.position.set(lerp(-1,3.45,u),lerp(.14,.90,u)+Math.sin(u*Math.PI)*.55,lerp(0,targetZ,u));
    ball.rotation.x+=.25;ball.rotation.z+=.18;
    if(a.result==='save'){
      keeper.position.z=lerp(0,targetZ-Math.sign(targetZ)*Math.sin(.85)*1.3,smooth(u));
      if(!keeper.userData.real)keeper.rotation.x=lerp(0,.85*(targetZ>0?1:-1),smooth(u));
    }
    if(u>=1){a.phase=a.result?'outcome':'awaitResult';a.start=t;}
  }else if(a.phase==='awaitResult'){
    if(a.result){a.phase='outcome';a.start=t;}
  }else if(a.phase==='outcome'){
    u=clamp((t-a.start)/350,0,1);
    const targetZ=a.team==='A'?.78:-.78;
    if(a.result==='goal'){
      // The goal plane is x=4.42; only a confirmed goal may travel beyond it.
      ball.position.set(lerp(3.45,5.01,u),lerp(.90,.70,u)+Math.sin(u*Math.PI)*.12,targetZ);
      keeper.position.z=lerp(0,-targetZ*.25,smooth(u));
    }else{
      // A save rebounds away from the net and outside the central shooting lane.
      ball.position.set(lerp(3.45,2.35,u),lerp(.90,.14,u)+Math.sin(u*Math.PI)*.30,lerp(targetZ,Math.sign(targetZ)*1.85,u));
      keeper.position.z=targetZ-Math.sign(targetZ)*Math.sin(.85)*1.3;
      if(!keeper.userData.real)keeper.rotation.x=.85*(targetZ>0?1:-1);
      else if(!a.savePlayed){playAction(keeper,targetZ>0?'saveRight':'saveLeft');a.savePlayed=true;}
    }
    ball.rotation.x+=.25;ball.rotation.z+=.18;
    if(u>=1){a.phase=a.result==='goal'?'net':'result';a.start=t;}
  }else if(a.phase==='net'){
    u=clamp((t-a.start)/420,0,1);
    // Contact with the rear net reverses the ball and drops it inside the goal.
    ball.position.set(lerp(5.01,4.68,smooth(u)),lerp(.70,.14,u)+Math.sin(u*Math.PI)*.08,a.team==='A'?.78:-.78);
    ball.rotation.x+=.08;
    if(u>=1){a.phase='result';a.start=t;}
  }else if(a.phase==='result'){
    u=clamp((t-a.start)/850,0,1);
    if(a.result==='goal'){p.rotation.y=angleLerp(Math.PI/2,p.userData.baseRotationY,smooth(u));if(!p.userData.real)p.position.y=Math.sin(u*Math.PI)*.18;}
    if(u>=1){resetPose();animation=null;}
  }
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
async function boot(){if(installed)return;const shell=addStageShell();if(!shell){setTimeout(boot,120);return}installed=true;try{await loadThree();setupScene();bindStatusAnimation();hookGame()}catch(e){console.error('3D sahne yüklenemedi',e);setLabel('3D SAHNE YÜKLENEMEDİ')}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.AIFootball3D={beginShot,finishShot,reset:resetPose,reloadModels:tryLoadRealModels};
})();




