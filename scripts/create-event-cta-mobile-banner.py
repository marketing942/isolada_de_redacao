from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "banner-eventos-mobile-base.webp"
OUTPUT = PUBLIC / "banner-eventos-mobile-cta.webp"

WIDTH, HEIGHT = 1080, 1350
WHITE = "#f7f0e5"
GOLD = "#d7b76c"
GOLD_LIGHT = "#f0d897"
INK = "#17130d"
EMBER = "#ff5b42"
MUTED = "#d4cbc1"

TITLE = r"C:\Windows\Fonts\impact.ttf"
BODY = r"C:\Windows\Fonts\bahnschrift.ttf"
BODY_BOLD = r"C:\Windows\Fonts\arialbd.ttf"


def font(path: str, size: int):
    return ImageFont.truetype(path, size=size)


def contain(image: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    image = image.copy()
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    return image


canvas = Image.open(SOURCE).convert("RGBA")

# Reinforce the copy zone while retaining the generated texture.
veil = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
veil_draw = ImageDraw.Draw(veil)
for y in range(610, HEIGHT):
    progress = min(1.0, (y - 610) / 260)
    alpha = int(25 + 105 * progress)
    veil_draw.line((0, y, WIDTH, y), fill=(0, 0, 0, alpha))
canvas = Image.alpha_composite(canvas, veil)
draw = ImageDraw.Draw(canvas)

# Official logo, kept clear of both faces.
logo = contain(Image.open(PUBLIC / "logo-cppem.png").convert("RGBA"), (300, 92))
canvas.alpha_composite(logo, (58, 45))
draw = ImageDraw.Draw(canvas)

# Event label.
eyebrow_font = font(BODY_BOLD, 23)
eyebrow = "ISOLADA DE REDAÇÃO"
box = draw.textbbox((0, 0), eyebrow, font=eyebrow_font)
eyebrow_w = box[2] - box[0]
draw.rounded_rectangle((70, 720, 70 + eyebrow_w + 54, 774), radius=6, outline=GOLD, width=2, fill=(9, 8, 7, 205))
draw.ellipse((89, 740, 99, 750), fill=EMBER)
draw.text((116, 733), eyebrow, font=eyebrow_font, fill=GOLD_LIGHT)

# Mobile headline.
headline = font(TITLE, 82)
headline_hot = font(TITLE, 99)
draw.text((70, 798), "A SUA VAGA", font=headline, fill=WHITE, stroke_width=1, stroke_fill=(0, 0, 0, 190))
draw.text((70, 882), "PODE SER DECIDIDA", font=headline, fill=WHITE, stroke_width=1, stroke_fill=(0, 0, 0, 190))
draw.text((70, 966), "NA REDAÇÃO.", font=headline_hot, fill=EMBER, stroke_width=1, stroke_fill=(0, 0, 0, 200))

# Supporting copy.
body = font(BODY, 30)
body_bold = font(BODY_BOLD, 30)
draw.text((72, 1073), "8 encontros ao vivo, 8 temas e correções", font=body, fill=MUTED)
draw.text((72, 1115), "individuais com a Prof.ª Shayenne.", font=body_bold, fill=WHITE)

# Full-width mobile CTA.
shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
shadow_draw = ImageDraw.Draw(shadow)
shadow_draw.rounded_rectangle((70, 1194, 1010, 1290), radius=12, fill=(224, 68, 42, 150))
shadow = shadow.filter(ImageFilter.GaussianBlur(20))
canvas = Image.alpha_composite(canvas, shadow)
draw = ImageDraw.Draw(canvas)

button = (70, 1178, 1010, 1278)
draw.rounded_rectangle(button, radius=12, fill=GOLD_LIGHT, outline="#fff0bf", width=3)
draw.polygon(((935, 1178), (1010, 1178), (1010, 1248), (980, 1278), (905, 1278)), fill=GOLD)
button_font = font(BODY_BOLD, 34)
button_text = "GARANTA SUA VAGA"
button_box = draw.textbbox((0, 0), button_text, font=button_font)
button_w = button_box[2] - button_box[0]
draw.text((470 - button_w / 2, 1209), button_text, font=button_font, fill=INK)
draw.line((930, 1228, 966, 1228), fill=INK, width=4)
draw.line((954, 1216, 967, 1228, 954, 1240), fill=INK, width=4, joint="curve")

canvas.convert("RGB").save(OUTPUT, "WEBP", quality=93, method=6)
print(OUTPUT)
