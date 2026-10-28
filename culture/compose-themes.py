"""Original procedural celebration themes. No samples or copied anthem melodies.
Requires numpy. Writes only the project's original *-theme.wav files.
"""
import hashlib
import wave
from pathlib import Path
import numpy as np

COUNTRIES = 'ID BR US MX VN PK PH TH BD NG TR JP DE FR IT GB CA ES AR ZA'.split()
OUTPUT = Path(__file__).resolve().parent.parent / 'assets/culture-v1/audio'
SAMPLE_RATE = 22050
for index, country in enumerate(COUNTRIES):
    seed = int.from_bytes(hashlib.sha256(('culture-theme-' + country).encode()).digest()[:4], 'big')
    rng = np.random.default_rng(seed)
    audio = np.zeros(16 * SAMPLE_RATE)
    tonic = [48, 50, 52, 55][index % 4]
    for beat in range(32):
        start = int(beat * .5 * SAMPLE_RATE)
        t = np.arange(int(.5 * SAMPLE_RATE)) / SAMPLE_RATE
        note = tonic + 12 + int(rng.choice([0, 2, 4, 7, 9, 12]))
        frequency = 440 * 2 ** ((note - 69) / 12)
        tone = np.sin(2*np.pi*frequency*t) + .28*np.sin(4*np.pi*frequency*t) + .1*np.sin(6*np.pi*frequency*t)
        envelope = np.minimum(t / .03, 1) * np.exp(-t*4)
        audio[start:start+len(t)] += .13 * tone * envelope
        if beat % 4 == 0:
            t = np.arange(2 * SAMPLE_RATE) / SAMPLE_RATE
            chord = sum(np.sin(2*np.pi*(440*2**((tonic+interval-69)/12))*t) for interval in [0,4,7])
            audio[start:start+len(t)] += .025 * chord * np.sin(np.pi*t/2)**2
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT / (country.lower() + '-theme.wav')), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes((np.clip(audio, -.7, .7) * 32767).astype('<i2').tobytes())
