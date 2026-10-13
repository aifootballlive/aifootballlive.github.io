(()=>{
'use strict';
// Color and matte share a single video frame so mobile playback remains synchronized.
window.AIFootballPlayerVideo={async create(THREE,scene){
  const response=await fetch('./assets/players/a/clips-v103.json?v=103');
  if(!response.ok)throw new Error('Player video manifest unavailable');
  const config=await response.json(),clips={},media=[],clock=config.motion.timeline;
  const rates={turn:1,run:1.15,kick:1,return:1.15,idle:1,...config.motion.rates};
  const root=new THREE.Group();root.visible=false;scene.add(root);
  const width=config.height*config.frameAspect,geometry=new THREE.PlaneGeometry(width,config.height,60,128);
  let poster=null;
  function load(name,info){
    const video=document.createElement('video');video.muted=true;video.defaultMuted=true;
    video.playsInline=true;video.setAttribute('playsinline','');video.preload='none';video.loop=name==='idle';
    video.src=info.src;video.style.cssText='position:fixed;width:1px;height:1px;left:0;bottom:0;opacity:.001;pointer-events:none';
    video.setAttribute('aria-hidden','true');document.body.appendChild(video);media.push(video);

    const texture=new THREE.VideoTexture(video);texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
    const material=new THREE.ShaderMaterial({uniforms:{frame:{value:texture},previousFrame:{value:texture},transition:{value:1},previousOffset:{value:new THREE.Vector2()},matteTexel:{value:new THREE.Vector2(1/2880,1/1920)},opacity:{value:0},footShift0:{value:new THREE.Vector3()},footShift1:{value:new THREE.Vector3()},feetSplit:{value:new THREE.Vector2(.5,.06)},legBand:{value:new THREE.Vector2(.08,.3)},idleLock:{value:0},footUV0:{value:new THREE.Vector2()},footUV1:{value:new THREE.Vector2()}},transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,
      vertexShader:"varying vec2 uvFrame;uniform vec3 footShift0;uniform vec3 footShift1;uniform vec2 feetSplit;uniform vec2 legBand;uniform float idleLock;uniform vec2 footUV0;uniform vec2 footUV1;void main(){uvFrame=uv;vec4 world=modelMatrix*vec4(position,1.0);if(idleLock>.5){}else{float leg=1.0-smoothstep(legBand.x,legBand.y,uv.y);vec2 q=uv*vec2(.75,1.);float side=smoothstep(-.0005,.0005,length(q-footUV0*vec2(.75,1.))-length(q-footUV1*vec2(.75,1.)));world.xyz+=leg*mix(footShift0,footShift1,side);}gl_Position=projectionMatrix*viewMatrix*world;}",
      fragmentShader:"uniform sampler2D frame;uniform sampler2D previousFrame;uniform float transition;uniform vec2 previousOffset;uniform float opacity;uniform float idleLock;varying vec2 uvFrame;uniform vec2 matteTexel;vec4 samplePackedFrame(sampler2D tex,vec2 uv){vec2 p=vec2(.5+uv.x*.5,uv.y),d=matteTexel*2.5;float a=texture2D(tex,p).r;a=min(a,texture2D(tex,p+vec2(d.x,0.)).r);a=min(a,texture2D(tex,p-vec2(d.x,0.)).r);a=min(a,texture2D(tex,p+vec2(0.,d.y)).r);a=min(a,texture2D(tex,p-vec2(0.,d.y)).r);a=min(a,texture2D(tex,p+d).r);a=min(a,texture2D(tex,p-d).r);a=min(a,texture2D(tex,p+vec2(d.x,-d.y)).r);a=min(a,texture2D(tex,p+vec2(-d.x,d.y)).r);a=smoothstep(.86,.995,a);return vec4(texture2D(tex,vec2(uv.x*.5,uv.y)).rgb,a);}void main(){vec4 next=samplePackedFrame(frame,uvFrame);vec4 prev=next;if(transition<.999)prev=samplePackedFrame(previousFrame,uvFrame+previousOffset);float a=mix(prev.a,next.a,transition);vec3 rgb=mix(prev.rgb*prev.a,next.rgb*next.a,transition)/max(a,.0001);a*=opacity;if(a<.05)discard;float l=dot(rgb,vec3(.2126,.7152,.0722));rgb=(mix(vec3(l),rgb,1.025)-.5)*1.015+.5;rgb=clamp(rgb,0.0,.97);gl_FragColor=vec4(rgb,a);}"});
    const plane=new THREE.Mesh(geometry,material);plane.renderOrder=2;plane.frustumCulled=false;root.add(plane);
    const c=clips[name]={...info,video,texture,material,plane,ready:false,blocked:false,error:null};
    c.readyPromise=new Promise((resolve,reject)=>{
      video.addEventListener('loadeddata',()=>{c.ready=true;resolve();},{once:true});
      video.addEventListener('error',()=>{c.error=new Error('Player video failed: '+name);reject(c.error);},{once:true});
    });
    c.readyPromise.catch(()=>{});if(video.requestVideoFrameCallback){const presented=(_,metadata)=>{c.presentedTime=metadata.mediaTime;video.requestVideoFrameCallback(presented);};video.requestVideoFrameCallback(presented);}
    video.addEventListener('playing',()=>{c.blocked=false;if(current!==name&&!(name==='motion'&&current==='return'&&clips.return===clips.motion))video.pause();});
  }
  let current=null,shot=null,returning=false,returnDone=false,failed=false,lastTime=0,debugFeet=[],fade=null,returnSettling=0;const returnRootLock={foot:-1,anchor:new THREE.Vector3(),shift:new THREE.Vector3()};
  for(const [name,info] of Object.entries(config.clips)){if(name==='return'&&info.src===config.clips.motion.src){clips.return=clips.motion;clips.return.start=info.start||0;clips.return.duration=info.duration;}else load(name,info);}
  const clamp01=v=>Math.max(0,Math.min(1,v));
  function play(c){c.video.play().catch(error=>{if(error.name==='NotAllowedError')c.blocked=true;});}
  function warm(name,gesture=false){const c=clips[name];if(!c.started){c.started=true;c.video.preload='auto';c.video.load();}if(!c.ready||gesture||current===name)play(c);return c.readyPromise;}
  warm('idle');
  try{poster=await new THREE.TextureLoader().loadAsync(config.poster||'./assets/players/a/idle-47bf-poster.webp?v=1');poster.minFilter=THREE.LinearFilter;poster.magFilter=THREE.LinearFilter;}
  catch(error){console.warn('Player first image unavailable',error);await clips.idle.readyPromise;}
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
  const context=shadowCanvas.getContext('2d'),gradient=context.createRadialGradient(32,32,4,32,32,32);
  gradient.addColorStop(0,'rgba(0,0,0,.30)');gradient.addColorStop(1,'rgba(0,0,0,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.65),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  const footShadowMaterial=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.20,depthWrite:false});
  const footShadows=[0,1].map(()=>{const s=new THREE.Mesh(new THREE.CircleGeometry(.13,20),footShadowMaterial.clone());s.scale.set(1.45,.72,1);s.rotation.x=-Math.PI/2;s.position.y=.018;s.visible=false;scene.add(s);return s;});
  const locks=[{contact:false,anchor:new THREE.Vector3(),shift:new THREE.Vector3()},{contact:false,anchor:new THREE.Vector3(),shift:new THREE.Vector3()}];
  const MAX_PLANT_SHIFT=.88;const idleAnchors=[null,null];

  function select(name,start=0){
    if(current===name)return;
    if(fade){clips[fade.from].plane.visible=false;clips[fade.from].material.uniforms.opacity.value=0;}
    const previous=current;
    for(const c of Object.values(clips)){c.video.pause();c.material.uniforms.opacity.value=0;c.plane.visible=false;}
    if(previous&&clips[previous]!==clips[name]){clips[previous].plane.visible=false;clips[previous].material.uniforms.opacity.value=1;fade={from:previous,start:performance.now()};}
    current=name;const c=clips[name];if(!previous||clips[previous]!==c)c.video.currentTime=start;c.video.playbackRate=name==='idle'?rates.idle:1;play(c);
    if(!previous||clips[previous]!==clips[name])for(const foot of locks){foot.contact=false;foot.shift.set(0,0,0);}
  }
  // A gesture warms both clips, including phones that restrict automatic playback.
  document.addEventListener('pointerdown',()=>{warm('idle',true);warm('motion',true);warm('return',true);});
  setTimeout(()=>{warm('motion');warm('return');},250);
  return {config,resetIdleAnchors(){idleAnchors.fill(null);for(const foot of locks){foot.contact=false;foot.shift.set(0,0,0);}},ensureMotionReady(){const c=clips.motion;return Promise.all([warm('motion'),warm('return')]).then(()=>{if(!c.blocked)return;return new Promise(resolve=>c.video.addEventListener('playing',resolve,{once:true}));});},disableMotion(){failed=true;},update(actor,camera,animation,t){
    if(!actor)return;
    const active=animation?.team==='A'&&animation.phase!=='loading'&&!animation.returnComplete?animation:null;
    if(active!==shot){shot=active;returning=false;returnDone=false;returnSettling=0;returnRootLock.foot=-1;returnRootLock.shift.set(0,0,0);select(active?'motion':'idle',active?clock.turn[0]:0);}
    if(!current)select('idle');
    const sharedClock=window.AIFootballTikTok?.getClock?.();if(current==='idle'&&sharedClock&&clips.idle.ready){const idle=clips.idle,expected=(((Date.now()-sharedClock.epoch)*rates.idle/1000)%idle.duration+idle.duration)%idle.duration;if(Math.abs(idle.video.currentTime-expected)>.45)idle.video.currentTime=expected;}
    if(active?.returnNow&&!returning){returning=true;}
    if(active&&current==='motion'){
      const c=clips.motion;
      if(returning){
        c.video.playbackRate=1;
        if(active.syncStartedAt){const lead=(clock.turn[1]-clock.turn[0])/rates.turn+(clock.run[1]-clock.run[0])/rates.run+(clock.kick[1]-clock.kick[0])/rates.kick,expected=Math.min(clock.returnWalk[0],clock.kick[1]+Math.max(0,(Date.now()-active.syncStartedAt)/1000-lead));if(Math.abs(c.video.currentTime-expected)>.50)c.video.currentTime=expected;if(c.video.paused)play(c);}
        if(c.video.currentTime>=clock.returnWalk[0]-.015)select('return',clips.return.start||0);
      }else{
        const rate=active.phase==='run'?rates.run:active.phase==='kick'?rates.kick:active.phase==='turn'?rates.turn:1;
        if(active.syncStartedAt){const elapsed=Math.max(0,(Date.now()-active.syncStartedAt)/1000),turn=(clock.turn[1]-clock.turn[0])/rates.turn,run=(clock.run[1]-clock.run[0])/rates.run;const expected=elapsed<turn?clock.turn[0]+elapsed*rates.turn:elapsed<turn+run?clock.run[0]+(elapsed-turn)*rates.run:elapsed<turn+run+(clock.kick[1]-clock.kick[0])/rates.kick?clock.kick[0]+(elapsed-turn-run)*rates.kick:clock.kick[1]+elapsed-turn-run-(clock.kick[1]-clock.kick[0])/rates.kick;if(Math.abs(c.video.currentTime-Math.min(expected,clock.returnWalk[0]))>.50)c.video.currentTime=Math.min(expected,clock.returnWalk[0]);if(c.video.paused)play(c);}
        c.video.playbackRate=rate;
        if(!active.syncStartedAt&&c.video.currentTime>=clock.followThrough[1])c.video.pause();
      }
    }
    if(returning&&current==='return')clips.return.video.playbackRate=rates.return;
    if(returning&&current==='return'&&active?.syncStartedAt){const lead=(clock.turn[1]-clock.turn[0])/rates.turn+(clock.run[1]-clock.run[0])/rates.run+(clock.kick[1]-clock.kick[0])/rates.kick+(clock.returnWalk[0]-clock.kick[1]),expected=(clips.return.start||0)+Math.max(0,(Date.now()-active.syncStartedAt)/1000-lead)*rates.return;const target=Math.min(expected,clips.return.duration-1/config.fps);if(Math.abs(clips.return.video.currentTime-target)>.50)clips.return.video.currentTime=target;}
    if(returning&&current==='return'&&clips.return.video.currentTime>=clips.return.duration-1/config.fps-.001){
      returnSettling=t;select('idle');returnRootLock.foot=-1;returnRootLock.shift.set(0,0,0);
    }
    if(returnSettling&&t-returnSettling>=180)returnDone=true;
    const c=clips[current];
    root.visible=actor.visible&&!failed;shadow.visible=root.visible;shadow.position.set(actor.position.x,.015,actor.position.z);if(!root.visible)for(const s of footShadows)s.visible=false;
    for(const child of actor.children)child.visible=failed;
    actor.userData.videoVisible=!failed;root.position.copy(actor.position);root.scale.copy(actor.scale);shadow.scale.setScalar(actor.scale.x);
    const forward=new THREE.Vector3().subVectors(camera.position,root.position);root.rotation.set(0,Math.atan2(forward.x,forward.z),0);
    c.plane.visible=true;c.material.uniforms.opacity.value=1;
    c.material.uniforms.transition.value=1;if(fade){const u=clamp01((t-fade.start)/140),prev=clips[fade.from];c.material.uniforms.transition.value=u;c.material.uniforms.previousFrame.value=prev.ready?prev.texture:poster;prev.plane.visible=false;if(u>=1)fade=null;}
    const usingVideo=c.ready&&!c.blocked&&!c.error;
    c.material.uniforms.frame.value=usingVideo?c.texture:poster;
    const frames=usingVideo?c.frames:clips.idle.frames,index=usingVideo?Math.min(frames.length-1,Math.round((c.presentedTime??c.video.currentTime)*config.fps)):0,frame=frames[index],reference=frame;
    c.plane.position.set((.5-reference.anchor)*width,(reference.floor-.5)*config.height+.015,0);if(fade){const p=clips[fade.from].plane.position;c.material.uniforms.previousOffset.value.set((c.plane.position.x-p.x)/width,(c.plane.position.y-p.y)/config.height);}else c.material.uniforms.previousOffset.value.set(0,0);c.material.uniforms.idleLock.value=current==='idle'?1:0;root.updateMatrixWorld(true);
    const dt=Math.min(.05,Math.max(.001,(t-lastTime)/1000));lastTime=t;
    const split=(frame.feet[0][0]+frame.feet[1][0])/2,separation=Math.max(.012,(frame.feet[1][0]-frame.feet[0][0])*.24);
    c.material.uniforms.feetSplit.value.set(split,separation);c.material.uniforms.legBand.value.set(1-frame.floor+.035,1-frame.floor+.48);
    debugFeet=[];
    const returningWalk=current==='return';
    frame.feet.forEach((f,i)=>{
      const pivot=active&&(['turn','returnTurn'].includes(active.phase)||(returning&&c.video.currentTime<config.motion.walkRange[0]));
      const foot=locks[i],raw=c.plane.localToWorld(new THREE.Vector3((f[0]-.5)*width,(.5-f[1])*config.height,0)),contact=!!f[2]&&!pivot;
      if(current==='idle'){foot.contact=contact;foot.anchor.copy(raw);foot.shift.set(0,0,0);}
      else if(contact&&!foot.contact){
        // Plant at the boot's currently rendered location so a new step never snaps.
        if(current==='idle'){if(!idleAnchors[i]){const boot=clips.idle.frames[0].feet[i];idleAnchors[i]=c.plane.localToWorld(new THREE.Vector3((boot[0]-.5)*width,(.5-boot[1])*config.height,0));idleAnchors[i].y=.015;}foot.anchor.copy(idleAnchors[i]);}else foot.anchor.copy(raw).add(foot.shift);foot.anchor.y=.015;
      }
      // Hard-lock every planted boot to the turf. The larger allowance covers a full
      // running/walking stance instead of releasing mid-step and creating skating.
      if(current==='idle'){}else if(contact){
        foot.shift.subVectors(foot.anchor,raw);
        if(current!=='idle'&&foot.shift.length()>MAX_PLANT_SHIFT){
          const excess=foot.shift.length()-MAX_PLANT_SHIFT;
          foot.anchor.addScaledVector(foot.shift.clone().normalize(),-excess);
          foot.shift.subVectors(foot.anchor,raw);
        }
        foot.contact=true;
      }else{
        foot.contact=false;
        if(pivot)foot.shift.set(0,0,0);
        else if(foot.shift.length()<.003)foot.shift.set(0,0,0);
        else foot.shift.multiplyScalar(Math.exp(-dt*28));
      }
      foot.shift.y=Math.max(foot.shift.y,.015-raw.y);c.material.uniforms[i?'footShift1':'footShift0'].value.copy(foot.shift);c.material.uniforms[i?'footUV1':'footUV0'].value.set(f[0],1-f[1]);
      const fixed=raw.clone().add(foot.shift);
      const fs=footShadows[i];fs.scale.set(1.45*actor.scale.x,.72*actor.scale.x,1);fs.position.set(fixed.x,.018,fixed.z);fs.visible=root.visible&&foot.contact;fs.material.opacity=foot.contact?.20:.06;
      debugFeet.push({contact:foot.contact,position:fixed.toArray(),raw:raw.toArray(),uv:[f[0],1-f[1]],anchor:foot.anchor.toArray(),shift:foot.shift.length()});
    });
  },get status(){
    const vt=current?clips[current].video.currentTime:0;const u=current?clips[current].material.uniforms:null;const smooth=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};const actualFeet=debugFeet.map(f=>{if(!u||u.idleLock.value>.5)return f.raw;const q=new THREE.Vector2(f.uv[0]*.75,f.uv[1]),v0=u.footUV0.value.clone().multiply(new THREE.Vector2(.75,1)),v1=u.footUV1.value.clone().multiply(new THREE.Vector2(.75,1)),side=smooth(-.0005,.0005,q.distanceTo(v0)-q.distanceTo(v1)),leg=1-smooth(u.legBand.value.x,u.legBand.value.y,f.uv[1]),shift=u.footShift0.value.clone().lerp(u.footShift1.value,side).multiplyScalar(leg);return new THREE.Vector3(...f.raw).add(shift).toArray();});
    let returnProgress=0;
    if(returning){
      if(current==='motion')returnProgress=.10*clamp01((vt-clock.returnTurn[0])/(clock.returnWalk[0]-clock.returnTurn[0]));
      else if(current==='return')returnProgress=.10+.80*clamp01((vt-config.motion.walkRange[0])/(config.motion.walkRange[1]-config.motion.walkRange[0]));
      else returnProgress=.90+.10*clamp01((performance.now()-returnSettling)/180);
      if(returnDone)returnProgress=1;
    }
    return {ready:true,clip:current,failed,motionReady:clips.motion.ready&&clips.return.ready&&!clips.motion.blocked&&!clips.return.blocked&&!clips.motion.error&&!clips.return.error,usingPoster:!current||!clips[current].ready||clips[current].blocked||!!clips[current].error,time:vt,paused:current?clips[current].video.paused:true,feet:debugFeet,actualFeet,returnProgress,returnDone};
  }};
}};
})();
