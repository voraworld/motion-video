"""Contact sheet from rendered stills: python3 scripts/sheet.py out/stills/a.jpg ... -o out.png [--cols 6 --w 300]"""
import argparse, os
from PIL import Image, ImageDraw
ap = argparse.ArgumentParser(); ap.add_argument('files', nargs='+'); ap.add_argument('-o', required=True)
ap.add_argument('--cols', type=int, default=6); ap.add_argument('--w', type=int, default=300)
a = ap.parse_args()
w = a.w; h = int(w * 1920 / 1080); rows = (len(a.files) + a.cols - 1) // a.cols
sheet = Image.new('RGB', (a.cols * w, rows * (h + 26)), (25, 25, 25)); d = ImageDraw.Draw(sheet)
for i, f in enumerate(a.files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    x, y = (i % a.cols) * w, (i // a.cols) * (h + 26)
    sheet.paste(im, (x, y)); d.text((x + 6, y + h + 6), os.path.basename(f), fill=(255, 255, 255))
sheet.save(a.o); print(a.o, sheet.size)
