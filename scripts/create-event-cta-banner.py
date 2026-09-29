from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BASE_OUTPUT = PUBLIC / "banner-eventos-base.webp"
FINAL_OUTPUT = PUBLIC / "banner-eventos-cta.webp"
SOURCE = BASE_OUTPUT

WIDTH, HEIGHT = 1600, 800
WHITE = "#f7f0e5"
GOLD = "#d7b76c"
GOLD_LIGHT = "#f0d897"
INK = "#17130d"
EMBER = "#ff5b42"
MUTED = "#d4cbc1"


def font(path: str, size: int):
    return ImageFont.truetype(path, size=size)


TITLE = r"C:\Windows\Fonts\impact.ttf"
BODY = r"C:\Windows\Fonts\bahnschrift.ttf"
BODY_BOLD = r"C:\Windows\Fonts\arialbd.ttf"


def fit_cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    current_ratio = image.width / image.height
    target_ratio = target_w / target_h
    if current_ratio > target_ratio:
        crop_w = round(image.height * target_ratio)
        left = (image.width - crop_w) // 2
        image = image.crop((left, 0, left + crop_w, image.height))
    else:
        crop_h = round(image.width / target_ratio)
        top = (image.height - crop_h) // 2
        image = image.crop((0, top, image.width, top + crop_h))
    return image.resize(size, Image.Resampling.LANCZOS)


def contain(image: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    image = image.copy()
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    return image


base = fit_cover(Image.open(SOURCE).convert("RGB"), (WIDTH, HEIGHT))

canvas = base.convert("RGBA")
draw = ImageDraw.Draw(canvas)

# A translucent veil keeps the sales copy readable on every screen.
veil = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
veil_draw = ImageDraw.Draw(veil)
for x in range(0, 810):
    alpha = int(90 * (1 - x / 810))
    veil_draw.line((x, 0, x, HEIGHT), fill=(0, 0, 0, alpha))
canvas = Image.alpha_composite(canvas, veil)
draw = ImageDraw.Draw(canvas)

# Official logo.
logo = contain(Image.open(PUBLIC / "logo-cppem.png").convert("RGBA"), (310, 95))
canvas.alpha_composite(logo, (72, 54))

# Eyebrow label.
eyebrow_font = font(BODY_BOLD, 19)
eyebrow = "ISOLADA DE REDAÇÃO"
eyebrow_box = draw.textbbox((0, 0), eyebrow, font=eyebrow_font)
eyebrow_w = eyebrow_box[2] - eyebrow_box[0]
draw.rounded_rectangle((72, 172, 72 + eyebrow_w + 44, 218), radius=5, outline=GOLD, width=2, fill=(9, 8, 7, 185))
draw.ellipse((88, 188, 96, 196), fill=EMBER)
draw.text((108, 183), eyebrow, font=eyebrow_font, fill=GOLD_LIGHT, stroke_width=0)

# Main sales message.
headline_font = font(TITLE, 67)
headline_hot_font = font(TITLE, 77)
draw.text((72, 246), "A SUA VAGA", font=headline_font, fill=WHITE, stroke_width=1, stroke_fill=(0, 0, 0, 180))
draw.text((72, 318), "PODE SER DECIDIDA", font=headline_font, fill=WHITE, stroke_width=1, stroke_fill=(0, 0, 0, 180))
draw.text((72, 390), "NA REDAÇÃO.", font=headline_hot_font, fill=EMBER, stroke_width=1, stroke_fill=(0, 0, 0, 190))

# Supporting copy.
body_font = font(BODY, 25)
body_bold = font(BODY_BOLD, 25)
draw.text((74, 496), "8 encontros ao vivo, 8 temas e correções", font=body_font, fill=MUTED)
draw.text((74, 530), "individuais com a Prof.ª Shayenne.", font=body_bold, fill=WHITE)

# CTA shadow and champagne button.
shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
shadow_draw = ImageDraw.Draw(shadow)
shadow_draw.rounded_rectangle((72, 617, 498, 704), radius=10, fill=(224, 68, 42, 150))
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
canvas = Image.alpha_composite(canvas, shadow)
draw = ImageDraw.Draw(canvas)

button = (72, 603, 498, 690)
draw.rounded_rectangle(button, radius=9, fill=GOLD_LIGHT, outline="#fff0bf", width=2)
draw.polygon(((470, 603), (498, 603), (498, 662), (470, 690), (448, 690)), fill=GOLD)
button_font = font(BODY_BOLD, 27)
draw.text((111, 629), "GARANTA SUA VAGA", font=button_font, fill=INK)
draw.line((441, 645, 461, 645), fill=INK, width=3)
draw.line((454, 637, 462, 645, 454, 653), fill=INK, width=3, joint="curve")

canvas.convert("RGB").save(FINAL_OUTPUT, "WEBP", quality=93, method=6)
print(BASE_OUTPUT)
print(FINAL_OUTPUT)
