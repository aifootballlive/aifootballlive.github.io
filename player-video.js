(()=>{
'use strict';
// Color and matte share a single video frame so mobile playback remains synchronized.
window.AIFootballPlayerVideo={async create(THREE,scene){
  const response=await fetch('./assets/players/a/motion-47bf.json?v=1');
  if(!response.ok)throw new Error('Player video manifest unavailable');
  const config=await response.json(),clips={},media=[],clock=config.motion.timeline;
  const root=new THREE.Group();root.visible=false;scene.add(root);
  const width=config.height*config.frameAspect,geometry=new THREE.PlaneGeometry(width,config.height,36,64);
  async function load(name,info){
    const video=document.createElement('video');video.muted=true;video.defaultMuted=true;
    video.playsInline=true;video.setAttribute('playsinline','');video.preload='auto';video.loop=name==='idle';
    video.src=info.src;video.style.cssText='position:fixed;width:1px;height:1px;left:-10px;bottom:0;pointer-events:none';
    video.setAttribute('aria-hidden','true');document.body.appendChild(video);media.push(video);
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Player video load timed out')),20000);video.addEventListener('loadeddata',()=>{clearTimeout(timer);resolve()},{once:true});video.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Player video failed: '+name))},{once:true});video.load();});
    const texture=new THREE.VideoTexture(video);texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
    const material=new THREE.ShaderMaterial({uniforms:{frame:{value:texture},opacity:{value:0},footShift0:{value:new THREE.Vector3()},footShift1:{value:new THREE.Vector3()},feetSplit:{value:new THREE.Vector2(.5,.06)},legBand:{value:new THREE.Vector2(.08,.3)}},transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,
      vertexShader:'varying vec2 uvFrame; uniform vec3 footShift0; uniform vec3 footShift1; uniform vec2 feetSplit; uniform vec2 legBand; void main(){uvFrame=uv;vec4 world=modelMatrix*vec4(position,1.0);float leg=1.0-smoothstep(legBand.x,legBand.y,uv.y);float side=smoothstep(feetSplit.x-feetSplit.y,feetSplit.x+feetSplit.y,uv.x);world.xyz+=leg*mix(footShift0,footShift1,side);gl_Position=projectionMatrix*viewMatrix*world;}',
      fragmentShader:'uniform sampler2D frame; uniform float opacity; varying vec2 uvFrame; void main(){vec3 rgb=texture2D(frame,vec2(uvFrame.x*.5,uvFrame.y)).rgb;float a=texture2D(frame,vec2(.5+uvFrame.x*.5,uvFrame.y)).r*opacity;if(a<.035)discard;gl_FragColor=vec4(rgb,a);}'});
    const plane=new THREE.Mesh(geometry,material);plane.renderOrder=2;plane.frustumCulled=false;root.add(plane);
    clips[name]={...info,video,texture,material,plane};
  }
  try{await Promise.all(Object.entries(config.clips).map(([name,info])=>load(name,info)));}
  catch(error){for(const video of media){video.pause();video.remove();}for(const c of Object.values(clips)){c.texture.dispose();c.material.dispose();}geometry.dispose();scene.remove(root);throw error;}
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
  const context=shadowCanvas.getContext('2d'),gradient=context.createRadialGradient(32,32,4,32,32,32);
  gradient.addColorStop(0,'rgba(0,0,0,.30)');gradient.addColorStop(1,'rgba(0,0,0,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.65),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  const locks=[{contact:false,anchor:new THREE.Vector3(),shift:new THREE.Vector3()},{contact:false,anchor:new THREE.Vector3(),shift:new THREE.Vector3()}];
  let current=null,shot=null,returning=false,failed=false,lastTime=0,debugFeet=[];
  function select(name,start=0){
    if(current===name)return;
    for(const c of Object.values(clips)){c.video.pause();c.material.uniforms.opacity.value=0;c.plane.visible=false;}
    current=name;const c=clips[name];c.video.currentTime=start;c.video.playbackRate=1;c.video.play().catch(()=>{failed=true;});
    for(const foot of locks){foot.contact=false;foot.shift.set(0,0,0);}
  }
  document.addEventListener('pointerdown',()=>{if(failed&&current)clips[current].video.play().then(()=>{failed=false;}).catch(()=>{});});
  return {config,update(actor,camera,animation,t){
    if(!actor)return;
    const active=animation?.team==='A'?animation:null;
    if(active!==shot){shot=active;returning=false;select(active?'motion':'idle',active?clock.turn[0]:0);}
    if(!current)select('idle');
    const c=clips[current],isReturn=active&&['returnTurn','returnWalk','returnFace'].includes(active.phase);
    if(isReturn&&!returning){returning=true;c.video.currentTime=clock.returnTurn[0];c.video.play().catch(()=>{failed=true;});for(const foot of locks)foot.contact=false;}
    if(active&&!isReturn&&c.video.currentTime>=clock.followThrough[1]){c.video.pause();if(c.video.currentTime>clock.followThrough[1]+.075)c.video.currentTime=clock.followThrough[1];}
    root.visible=actor.visible&&!failed;shadow.visible=root.visible;shadow.position.set(actor.position.x,.015,actor.position.z);
    for(const child of actor.children)child.visible=failed;
    actor.userData.videoVisible=!failed;root.position.copy(actor.position);
    const forward=new THREE.Vector3().subVectors(camera.position,root.position);root.rotation.set(0,Math.atan2(forward.x,forward.z),0);
    c.plane.visible=true;c.material.uniforms.opacity.value=1;
    const index=Math.min(c.frames.length-1,Math.floor(c.video.currentTime*config.fps)),frame=c.frames[index];
    c.plane.position.set((.5-frame.anchor)*width,(frame.floor-.5)*config.height+.015,0);root.updateMatrixWorld(true);
    const dt=Math.min(.05,Math.max(.001,(t-lastTime)/1000));lastTime=t;
    const split=(frame.feet[0][0]+frame.feet[1][0])/2,separation=Math.max(.012,(frame.feet[1][0]-frame.feet[0][0])*.24);
    c.material.uniforms.feetSplit.value.set(split,separation);c.material.uniforms.legBand.value.set(1-frame.floor+.07,1-frame.floor+.29);
    debugFeet=[];
    frame.feet.forEach((f,i)=>{
      const pivot=active&&['turn','returnTurn'].includes(active.phase);
      const foot=locks[i],raw=c.plane.localToWorld(new THREE.Vector3((f[0]-.5)*width,(.5-f[1])*config.height,0)),contact=!!f[2]&&!pivot;
      if(contact&&!foot.contact){foot.anchor.copy(raw);foot.anchor.y=.015;}
      // Keep a planted boot in field coordinates while the upper body advances.
      if(contact){
        foot.shift.subVectors(foot.anchor,raw);
        // Release a missed heel lift instead of stretching the leg unnaturally.
        if(foot.shift.length()>.27){foot.anchor.copy(raw);foot.anchor.y=.015;foot.shift.subVectors(foot.anchor,raw);foot.contact=false;}
        else foot.contact=true;
      }else{foot.contact=false;if(pivot)foot.shift.set(0,0,0);else foot.shift.multiplyScalar(Math.exp(-dt*18));}
      c.material.uniforms[i?'footShift1':'footShift0'].value.copy(foot.shift);
      debugFeet.push({contact:foot.contact,position:raw.clone().add(foot.shift).toArray(),shift:foot.shift.length()});
    });
  },get status(){return {ready:true,clip:current,failed,time:current?clips[current].video.currentTime:0,feet:debugFeet};}};
}};
})();
