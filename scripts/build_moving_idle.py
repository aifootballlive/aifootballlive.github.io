import cv2, numpy as np, os, subprocess, sys

src=os.environ.get("SOURCE_VIDEO","/tmp/source.mp4")
work="/tmp/idlepack"
os.makedirs(work,exist_ok=True)
src24=os.path.join(work,"source24.mp4")
raw=os.path.join(work,"packed_raw.mp4")
out="assets/players/a/idle-moving-packed.mp4"

subprocess.run(["ffmpeg","-y","-i",src,"-an","-vf","fps=24","-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p",src24],check=True)

cap=cv2.VideoCapture(src24)
fps=cap.get(cv2.CAP_PROP_FPS) or 24
w=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
sw,sh=max(2,w//2),max(2,h//2)
wr=cv2.VideoWriter(raw,cv2.VideoWriter_fourcc(*"mp4v"),fps,(w*2,h))
prev=None; idx=0
while True:
    ok,fr=cap.read()
    if not ok: break
    sm=cv2.resize(fr,(sw,sh),interpolation=cv2.INTER_AREA)
    if prev is None or idx%24==0:
        mask=np.full((sh,sw),cv2.GC_BGD,np.uint8)
        rect=(int(sw*.16),int(sh*.005),int(sw*.68),int(sh*.99))
        bgd=np.zeros((1,65),np.float64); fgd=np.zeros((1,65),np.float64)
        cv2.grabCut(sm,mask,rect,bgd,fgd,5,cv2.GC_INIT_WITH_RECT)
    else:
        mask=np.where(prev>200,cv2.GC_PR_FGD,cv2.GC_PR_BGD).astype(np.uint8)
        b=max(2,int(sw*.035))
        mask[:,:b]=cv2.GC_BGD; mask[:,-b:]=cv2.GC_BGD; mask[:2,:]=cv2.GC_BGD; mask[-2:,:]=cv2.GC_BGD
        bgd=np.zeros((1,65),np.float64); fgd=np.zeros((1,65),np.float64)
        cv2.grabCut(sm,mask,None,bgd,fgd,2,cv2.GC_INIT_WITH_MASK)
    fg=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
    n,lab,stats,cent=cv2.connectedComponentsWithStats(fg,8)
    keep=np.zeros_like(fg)
    cand=[]
    for i in range(1,n):
        x,y,ww,hh,area=stats[i]; cx,cy=cent[i]
        if area>80 and abs(cx-sw/2)<sw*.36 and hh>sh*.035:
            score=area*(1.0-max(0,abs(cx-sw/2)/(sw*.5))*.25)
            cand.append((score,i))
    for _,i in sorted(cand,reverse=True)[:6]:
        keep[lab==i]=255
    keep=cv2.morphologyEx(keep,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)),iterations=1)
    keep=cv2.morphologyEx(keep,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2,2)),iterations=1)
    prev=keep.copy()
    alpha=cv2.resize(keep,(w,h),interpolation=cv2.INTER_LINEAR)
    alpha=cv2.GaussianBlur(alpha,(3,3),.55)
    alpha=np.where(alpha<32,0,alpha)
    alpha=np.where(alpha>224,255,alpha).astype(np.uint8)
    mask_bgr=cv2.cvtColor(alpha,cv2.COLOR_GRAY2BGR)
    wr.write(np.hstack([fr,mask_bgr]))
    idx+=1
cap.release(); wr.release()

subprocess.run(["ffmpeg","-y","-i",raw,"-an","-c:v","libx264","-preset","veryfast","-crf","21","-pix_fmt","yuv420p","-movflags","+faststart",out],check=True)
print(f"built {out}: {idx} frames at {fps} fps")
