import sys, glob
from PIL import Image, ImageDraw, ImageFont
d0, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
f = None
for p in glob.glob('/usr/share/fonts/**/DejaVuSans.ttf', recursive=True): f = ImageFont.truetype(p, 15)
C = int(sys.argv[4]) if len(sys.argv) > 4 else 4; S = 280; rows = (len(names)+C-1)//C
c = Image.new('RGB', (C*S, rows*S), (30,38,51)); d = ImageDraw.Draw(c)
for k, n in enumerate(names):
    try: im = Image.open(f"{d0}/{n}.png").convert('RGBA')
    except Exception: continue
    im = im.crop(im.getbbox()); im.thumbnail((S-24, S-46))
    x = (k%C)*S; y = (k//C)*S; c.paste(im, (x+(S-im.size[0])//2, y+8+(S-46-im.size[1])//2), im)
    d.text((x+10, y+S-28), n, fill=(200,205,215), font=f)
c.save(out)
