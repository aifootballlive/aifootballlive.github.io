(()=>{
'use strict';
// RGB and its matte share one H.264 frame: the alpha remains synchronized on Safari too.
window.AIFootballPlayerVideo={async create(THREE,scene){
  const response=await fetch('./assets/players/a/clips.json?v=3');
  if(!response.ok)throw new Error('Player video manifest unavailable');
  const config=await response.json(),clips={},media=[];
  const root=new THREE.Group();root.visible=false;scene.add(root);
  const geometry=new THREE.PlaneGeometry(config.height*1080/1440,config.height);
  async function load(name,info){
    const video=document.createElement('video');video.muted=true;video.defaultMuted=true;
    video.playsInline=true;video.setAttribute('playsinline','');video.preload='auto';video.loop=name==='idle';
    video.src=info.src;video.style.cssText='position:fixed;width:1px;height:1px;left:-10px;bottom:0;pointer-events:none';
    video.setAttribute('aria-hidden','true');document.body.appendChild(video);media.push(video);
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Player video load timed out')),20000);video.addEventListener('loadeddata',()=>{clearTimeout(timer);resolve()},{once:true});video.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Player video failed: '+name))},{once:true});video.load();});
    const texture=new THREE.VideoTexture(video);texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
    const material=new THREE.ShaderMaterial({uniforms:{frame:{value:texture},opacity:{value:0}},transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,
      vertexShader:'varying vec2 uvFrame; void main(){uvFrame=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform sampler2D frame; uniform float opacity; varying vec2 uvFrame; void main(){vec3 rgb=texture2D(frame,vec2(uvFrame.x*.5,uvFrame.y)).rgb;float a=texture2D(frame,vec2(.5+uvFrame.x*.5,uvFrame.y)).r*opacity;if(a<.035)discard;gl_FragColor=vec4(rgb,a);}' });
    const plane=new THREE.Mesh(geometry,material);plane.renderOrder=2;root.add(plane);
    clips[name]={...info,video,texture,material,plane};
  }
  try{await Promise.all(Object.entries(config.clips).map(([name,info])=>load(name,info)));}
  catch(error){for(const video of media){video.pause();video.remove();}for(const c of Object.values(clips)){c.texture.dispose();c.material.dispose();}geometry.dispose();scene.remove(root);throw error;}
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
  const context=shadowCanvas.getContext('2d'),gradient=context.createRadialGradient(32,32,4,32,32,32);
  gradient.addColorStop(0,'rgba(0,0,0,.30)');gradient.addColorStop(1,'rgba(0,0,0,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.65),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  let current=null,previous=null,transitionAt=0,shot=null,failed=false;
  function select(name,t){
    if(current===name)return;
    if(previous&&previous!==current)clips[previous].video.pause();
    previous=current;current=name;transitionAt=t;
    const c=clips[name];c.video.currentTime=0;c.video.loop=name==='idle';
    c.video.play().catch(()=>{failed=true;root.visible=false;});
  }
  // A user gesture can recover a browser that declined muted autoplay.
  document.addEventListener('pointerdown',()=>{if(failed&&current){clips[current].video.play().then(()=>{failed=false}).catch(()=>{});}});
  return {config,update(actor,camera,animation,t){
    if(!actor)return;
    const active=animation?.team==='A'?animation:null;
    if(active!==shot){shot=active;select(active?'shot':'idle',t);}
    if(active){
      if(active.phase==='result'&&active.result==='goal')select('celebrate',t);
      else if(['returnTurn','returnWalk','returnFace'].includes(active.phase))select('return',t);
      else if(current==='shot'&&clips.shot.video.currentTime>=config.followThroughEnd){clips.shot.video.pause();select('idle',t);}
    }else select('idle',t);
    root.visible=actor.visible&&!failed;
    shadow.visible=root.visible;shadow.position.set(actor.position.x,.02,actor.position.z);
    for(const child of actor.children)child.visible=failed;
    actor.userData.videoVisible=!failed;
    root.position.copy(actor.position);root.quaternion.copy(camera.quaternion);
    const blend=Math.min(1,(t-transitionAt)/220);
    for(const [name,c] of Object.entries(clips)){
      const opacity=name===current?blend:name===previous?1-blend:0;
      c.material.uniforms.opacity.value=opacity;c.plane.visible=opacity>0;
      if(name===previous&&blend===1){c.video.pause();previous=null;}
      const frame=Math.min(c.anchors.length-1,c.video.currentTime*config.fps),lo=Math.floor(frame),hi=Math.min(lo+1,c.anchors.length-1);
      const anchor=c.anchors[lo]+(c.anchors[hi]-c.anchors[lo])*(frame-lo);
      const ground=c.groundSamples;
      if(ground){
        const at=Math.min(ground.length-1,c.video.currentTime*config.fps),i=Math.floor(at),j=Math.min(i+1,ground.length-1),fraction=at-i;
        const x=ground[i][0]+(ground[j][0]-ground[i][0])*fraction;
        const sole=ground[i][1]+(ground[j][1]-ground[i][1])*fraction;
        c.plane.position.set((.5-x)*config.height*1080/1440+(c.plantedOffsetX||0),(sole-.5)*config.height+(c.groundHeight||0),0);
      }else c.plane.position.set((.5-anchor)*config.height*1080/1440,config.height/2-(1800-config.floor)/1440*config.height,0);
    }
  },get status(){return{ready:true,clip:current,failed,time:current?clips[current].video.currentTime:0};}};
}};
})();
