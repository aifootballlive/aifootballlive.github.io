import cv2, numpy as np, os, subprocess

src=os.environ.get("SOURCE_VIDEO","/tmp/source.mp4")
work="/tmp/idlepack"
os.makedirs(work,exist_ok=True)
src24=os.path.join(work,"source24.mp4")
raw=os.path.join(work,"packed_raw.mp4")
out="assets/players/a/idle-moving-packed.mp4"

subprocess.run([
    "ffmpeg","-y","-i",src,"-an","-vf","fps=24",
    "-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p",src24
],check=True)

cap=cv2.VideoCapture(src24)
fps=cap.get(cv2.CAP_PROP_FPS) or 24
w=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
wr=cv2.VideoWriter(raw,cv2.VideoWriter_fourcc(*"mp4v"),fps,(w*2,h))

target_cx=None
target_bottom=None
smooth_dx=smooth_dy=0.0
idx=0
edge=max(18,int(w*.065))

while True:
    ok,fr=cap.read()
    if not ok: break

    lab=cv2.cvtColor(fr,cv2.COLOR_BGR2LAB).astype(np.float32)
    hsv=cv2.cvtColor(fr,cv2.COLOR_BGR2HSV)
    sat=hsv[:,:,1].astype(np.float32)

    # Row-wise studio background model from the clean left/right strips.
    bg_rows=np.empty((h,3),np.float32)
    for y in range(h):
        sample=np.concatenate([lab[y,:edge],lab[y,-edge:]],axis=0)
        bg_rows[y]=np.median(sample,axis=0)
    for ch in range(3):
        bg_rows[:,ch]=cv2.GaussianBlur(bg_rows[:,ch].reshape(-1,1),(1,31),0).ravel()

    dist=np.linalg.norm(lab-bg_rows[:,None,:],axis=2)
    yy=np.arange(h)[:,None]
    threshold=np.where(yy < h*.74,24.0,18.0)
    fg=((dist>threshold)|(sat>50)).astype(np.uint8)*255

    # Never allow the studio edges/floor to become part of the player.
    fg[:,:edge]=0; fg[:,-edge:]=0
    fg[int(h*.74):,:int(w*.24)]=0
    fg[int(h*.74):,int(w*.76):]=0
    fg[int(h*.958):,:]=0

    fg=cv2.morphologyEx(fg,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)),iterations=2)
    fg=cv2.morphologyEx(fg,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2,2)),iterations=1)

    # Keep only the main human component; this removes floor scraps near the shoes.
    n,labels,stats,cent=cv2.connectedComponentsWithStats(fg,8)
    if n<=1:
        keep=np.zeros_like(fg)
    else:
        candidates=[]
        for i in range(1,n):
            x,y,ww,hh,area=stats[i]
            cx,cy=cent[i]
            if area>500 and abs(cx-w/2)<w*.30 and hh>h*.55:
                candidates.append((area,i))
        if not candidates:
            i=1+np.argmax(stats[1:,cv2.CC_STAT_AREA])
        else:
            i=max(candidates)[1]
        keep=np.where(labels==i,255,0).astype(np.uint8)

    keep=cv2.morphologyEx(keep,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)),iterations=1)

    # Stabilize the person against the pitch: feet stay on one ground line and
    # horizontal drift is heavily damped while pose changes inside the body remain.
    ys,xs=np.where(keep>0)
    if len(xs):
        cx=float((xs.min()+xs.max())*.5)
        bottom=float(ys.max())
        if target_cx is None:
            target_cx=cx
            target_bottom=bottom
        desired_dx=np.clip((target_cx-cx)*.82,-42,42)
        desired_dy=np.clip(target_bottom-bottom,-70,70)
        smooth_dx=smooth_dx*.72+desired_dx*.28
        smooth_dy=smooth_dy*.62+desired_dy*.38
    else:
        smooth_dx*=.8; smooth_dy*=.8

    M=np.float32([[1,0,smooth_dx],[0,1,smooth_dy]])
    fr=cv2.warpAffine(fr,M,(w,h),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,0,0))
    keep=cv2.warpAffine(keep,M,(w,h),flags=cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT,borderValue=0)

    # Erode one pixel then feather only the true silhouette edge.
    keep=cv2.erode(keep,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)),iterations=1)
    alpha=cv2.GaussianBlur(keep,(3,3),.45)
    alpha=np.where(alpha<46,0,alpha)
    alpha=np.where(alpha>220,255,alpha).astype(np.uint8)

    mask_bgr=cv2.cvtColor(alpha,cv2.COLOR_GRAY2BGR)
    wr.write(np.hstack([fr,mask_bgr]))
    idx+=1

cap.release(); wr.release()

subprocess.run([
    "ffmpeg","-y","-i",raw,"-an","-c:v","libx264","-preset","veryfast",
    "-crf","19","-pix_fmt","yuv420p","-movflags","+faststart",out
],check=True)
print(f"built {out}: {idx} frames at {fps} fps; stabilized feet and cleaned matte")
