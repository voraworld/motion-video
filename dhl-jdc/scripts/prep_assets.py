"""Asset preparation: originals stay untouched in public/assets/originals.
Processed copies: trimmed to their visible bounds, faint glow halos removed from the alpha channel
(alpha below ~16% dropped, 16-50% ramped), colour un-premultiplied edges kept, downscaled to a working size.
Writes public/assets/processed/<name>.png and src/content/assets.json (sizes)."""
import json, os, sys
import numpy as np
from PIL import Image
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src = os.path.join(root, 'public/assets/originals'); dst = os.path.join(root, 'public/assets/processed')
os.makedirs(dst, exist_ok=True)
MAXW = {'dhl_logo': 1800, 'dhl_plane': 1800, 'dhl_xray-scanner': 1700, 'dhl_tag': 1600}
GLOW = {'dhl_box-open', 'dhl_box-closed-label-left', 'dhl_box-closed-label-right', 'dhl_phone', 'dhl_ribbon-s-curve'}
meta = {}
for f in sorted(os.listdir(src)):
    if not f.endswith('.png'): continue
    name = f[:-4]
    im = Image.open(os.path.join(src, f)).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    al = a[..., 3] / 255.0
    if name in GLOW:
        al = np.clip((al - 0.16) / (0.5 - 0.16), 0, 1) ** 1.2 * (al >= 0.5) + np.clip((al - 0.16) / (0.5 - 0.16), 0, 1) * 0.0 * (al < 0.5) + al * (al >= 0.5) * 0
        # keep solid object (>=0.5) at its own alpha, drop everything softer
        al = np.where(a[..., 3] / 255.0 >= 0.5, a[..., 3] / 255.0, 0)
        # 1px feather so the cut edge is not aliased
        from PIL import ImageFilter
        m = Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
        al = np.asarray(m).astype(np.float32) / 255.0
    else:
        al = np.where(al < 0.04, 0, al)
    a[..., 3] = al * 255
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
    bbox = out.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    out = out.crop(bbox)
    mw = MAXW.get(name, 1400)
    if out.width > mw:
        out = out.resize((mw, round(out.height * mw / out.width)), Image.LANCZOS)
    out.save(os.path.join(dst, f), optimize=True)
    meta[name] = {'w': out.width, 'h': out.height, 'src': f'assets/processed/{f}', 'original': list(Image.open(os.path.join(src, f)).size)}
    print(name, im.size, '->', out.size)
json.dump(meta, open(os.path.join(root, 'src/content/assets.json'), 'w'), indent=2)
