# Battlefield sounds: cut the source recordings into short mono OGG files for www/field/sfx.
# python3 tools/sfx/build_sfx.py <folder with the source recordings>   (needs ffmpeg and numpy)
# Sources (Freesound): see CREDITS in the game; the file names below are the ones the recordings were saved under.
import sys, subprocess, pathlib, numpy as np
SRC = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(__file__).resolve().parents[2]/"www"/"field"/"sfx"; OUT.mkdir(parents=True, exist_ok=True)
SR = 32000
def load(name):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(SRC/name), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()
def save(name, x, peak=0.89):
    x = x/max(1e-6, np.abs(x).max())*peak
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "libvorbis", "-q:a", "3", str(OUT/(name + ".ogg"))], input=x.astype(np.float32).tobytes(), check=True)
    print(name, round(len(x)/SR, 2), "s", (OUT/(name + ".ogg")).stat().st_size, "B")
def cut(x, t0, dur, fade=0.35, pre=0.04):
    a = int(max(0, t0 - pre)*SR); y = x[a:a + int(dur*SR)].copy(); f = int(fade*SR)
    y[:int(0.004*SR)] *= np.linspace(0, 1, int(0.004*SR)); y[-f:] *= np.linspace(1, 0, f)**2; return y
def loop(x, t0, dur, xf=0.4):
    # seamless loop: the start is cross-faded with what follows the end
    a, n, f = int(t0*SR), int(dur*SR), int(xf*SR); y = x[a:a + n].copy(); w = np.linspace(0, 1, f)
    y[:f] = x[a:a + f]*w + x[a + n:a + n + f]*(1 - w); return y
# tank guns: shots from two recordings
ts = load("tanks_shooting.flac")
for i, t in enumerate([0.3, 8.4, 14.6]): save(f"tank{i + 1}", cut(ts, t, 2.6))
tk = load("tank_shots.flac")
for i, t in enumerate([0.0, 3.4]): save(f"tank{i + 4}", cut(tk, t, 2.6))
save("autocannon", cut(load("autocannon_burst.wav"), 0.0, 1.9, fade=0.3, pre=0))
save("arty", cut(load("cannon.mp3"), 0.3, 3.2, fade=0.8))
save("boom", cut(load("railgun_shot_6.wav"), 0.0, 2.6, fade=0.9, pre=0))
save("heli_loop", loop(load("helicopter_raw_30sec.wav"), 6.0, 6.0))
eng = load("engine4_loop.wav"); save("engine_loop", loop(eng, 1.0, 8.0))
