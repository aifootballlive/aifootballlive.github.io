import * as T from '../vendor/three.module.mjs';
export function photoMapping(model){
 model.updateMatrixWorld(true);
 const coords={};for(const name of ['Hips','Spine','Spine1','Spine2','Neck','Head','HeadTop_End','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase']){const b=model.getObjectByName('mixamorig'+name);if(b)coords[name]=b.getWorldPosition(new T.Vector3());}
 const targets={LeftArm:[680,292],LeftForeArm:[705,523],LeftHand:[723,757],RightArm:[404,289],RightForeArm:[365,523],RightHand:[344,748],LeftUpLeg:[616,714],RightUpLeg:[468,714],LeftLeg:[652,973],RightLeg:[461,973],LeftFoot:[717,1240],RightFoot:[455,1233],LeftToeBase:[734,1317],RightToeBase:[449,1313]};
 const end={LeftArm:'LeftForeArm',LeftForeArm:'LeftHand',LeftHand:null,RightArm:'RightForeArm',RightForeArm:'RightHand',RightHand:null,LeftUpLeg:'LeftLeg',RightUpLeg:'RightLeg',LeftLeg:'LeftFoot',RightLeg:'RightFoot',LeftFoot:'LeftToeBase',RightFoot:'RightToeBase'};
 function body(p){const keys=[[0,1380],[.18,1240],[.77,973],[1.17,714],[1.28,660],[1.47,550],[1.66,435],[1.84,315],[1.95,235],[2.09,201],[2.4,21]];let k=0;while(k<keys.length-2&&p.y>keys[k+1][0])k++;const [a,b]=[keys[k],keys[k+1]],v=(p.y-a[0])/(b[0]-a[0]),y=a[1]+(b[1]-a[1])*v;return[542+p.x*550,y];}
 function region(n,p){
  n=n.replace('mixamorig','');
  if(/Hand/.test(n))n=n.includes('Left')?'LeftHand':'RightHand';
  if(n==='Head'||/^Bone_|headfront/.test(n))return[535+(p.x-coords.Head.x)*630,201-(p.y-coords.Head.y)*565];
  const a=coords[n],target=targets[n];if(!a||!target)return body(p);
  const e=end[n],b=e&&coords[e],tb=e&&targets[e];
  if(!b||!tb)return[target[0]+(p.x-a.x)*560,target[1]-(p.y-a.y)*560];
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),tx=tb[0]-target[0],ty=tb[1]-target[1],tl=Math.hypot(tx,ty),u=((p.x-a.x)*dx+(p.y-a.y)*dy)/(len*len),perp=((p.x-a.x)*-dy+(p.y-a.y)*dx)/len;
  // Preserve limb width while transferring its centre line to the reference photograph.
  return[target[0]+u*tx-perp*ty/tl*550,target[1]+u*ty+perp*tx/tl*550];
 }
 return (p,obj,index)=>{
  if(/Hair/i.test(obj.material.name))return[0,0];
  const ids=obj.geometry.attributes.skinIndex,weights=obj.geometry.attributes.skinWeight;let x=0,y=0,total=0;
  if(ids&&weights)for(let j=0;j<4;j++){const id=ids.getComponent(index,j),w=weights.getComponent(index,j);if(w<.001)continue;const name=obj.skeleton.bones[id].name,t=region(name,p);x+=t[0]*w;y+=t[1]*w;total+=w;}
  if(!total)[x,y]=body(p);return[x/1086,1-y/1448];
 };
}
