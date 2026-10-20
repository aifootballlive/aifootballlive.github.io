"""Create smaller mobile derivatives preserving originals, frame timing and shot audio."""
import concurrent.futures, hashlib, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = sys.argv[1]
source = (ROOT / 'shot-cache-v195.js').read_text(encoding='utf-8')
items = json.loads(re.search(r'const (?:manifest|originals)=(\{.*?\}),CACHE=', source).group(1))
items['waiting'] = {'src': './assets/scene-v111/waiting.mp4'}
folder = ROOT / 'assets/mobile-v274'
folder.mkdir(exist_ok=True)

def run(args):
    return subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', *args], check=True, capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)

def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def timeline(file):
    text = run(['-i', str(file), '-map', '0:v:0', '-f', 'framemd5', '-']).stdout.decode()
    return [','.join(line.split(',')[:4]) for line in text.splitlines() if not line.startswith('#')], next(line for line in text.splitlines() if line.startswith('#tb'))

def build(entry):
    key, info = entry
    original = ROOT / info['src']
    before = sha(original)
    target = folder / (key.lower().replace('_', '-') + '.mp4')
    if '--reuse-verified-shots' not in sys.argv or not target.exists() or key == 'waiting':
        audio_args = ['-an'] if key == 'waiting' else ['-map', '0:a?', '-c:a', 'copy']
        run(['-y', '-i', str(original), '-map', '0:v:0', *audio_args, '-vf', 'scale=540:960', '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '23', '-profile:v', 'main', '-level:v', '3.1', '-pix_fmt', 'yuv420p', '-maxrate', '1000k', '-bufsize', '1000k', '-x264-params', 'vbv-init=0.25', '-g', '24', '-movflags', '+faststart', str(target)])
    original_timeline = timeline(original)
    assert timeline(target) == original_timeline, f'{key}: video frame timing changed'
    assert sha(original) == before, f'{key}: original changed'
    # Audio packets are copied rather than re-encoded, preserving native contacts.
    for file in (() if key == 'waiting' else (original, target)):
        audio = run(['-i', str(file), '-map', '0:a:0?', '-c:a', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).stdout
        if file == original:
            original_audio = audio
        else:
            assert audio == original_audio, f'{key}: audio changed'
    result = {'src': './assets/mobile-v274/' + target.name, 'originalSrc': info['src'], 'bytes': target.stat().st_size, 'originalBytes': original.stat().st_size, 'frames': len(original_timeline[0]), 'width': 540, 'height': 960, 'audio': 'omitted-always-muted' if key == 'waiting' else 'packet-copy', 'sha256': sha(target), 'originalSha256': before}
    if 'seconds' in info:
        result['seconds'] = info['seconds']
    print(f'{key}: {result["originalBytes"]} -> {result["bytes"]} bytes; frame timing preserved; audio {result["audio"]}', flush=True)
    return key, result

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    result = dict(pool.map(build, items.items()))
(folder / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('PASS: original hashes and all frame timestamps/counts preserved; shot audio packets copied and always-muted idle audio omitted.', flush=True)
