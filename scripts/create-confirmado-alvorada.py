from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BASE = PUBLIC / "convidado-alvorada-base.webp"
OUTPUT_WEBP = PUBLIC / "convidado-confirmado-alvorada.webp"
OUTPUT_JPG = PUBLIC / "convidado-confirmado-alvorada.jpg"
BRASAO = Path(r"C:\Projetos\cppem\lp de Eventos\operacao-alvorada\public\brasao-alvorada.png")
CPPEM = PUBLIC / "logo-cppem.png"

W = H = 1254
IMPACT = r"C:\Windows\Fonts\impact.ttf"
ARIAL_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
BAHNSCHRIFT = r"C:\Windows\Fonts\bahnschrift.ttf"


def font(path: str, size: int):
    return ImageFont.truetype(path, size=size)


def contain(image: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    image = image.copy()
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    return image


def centered_x(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont) -> int:
    box = draw.textbbox((0, 0), text, font=text_font, stroke_width=0)
    return (W - (box[2] - box[0])) // 2


def gold_text(
    canvas: Image.Image,
    text: str,
    xy: tuple[int, int],
    text_font: ImageFont.FreeTypeFont,
    stroke: int = 7,
    extrusion: int = 8,
):
    x, y = xy
    draw = ImageDraw.Draw(canvas)
    for offset in range(extrusion, 0, -1):
        draw.text(
            (x + offset, y + offset),
            text,
            font=text_font,
            fill="#4b2b0c",
            stroke_width=stroke + 2,
            stroke_fill="#100a04",
        )
    draw.text(
        (x, y),
        text,
        font=text_font,
        fill="#d79a32",
        stroke_width=stroke,
        stroke_fill="#2a1606",
    )
    draw.text(
        (x, y - 2),
        text,
        font=text_font,
        fill="#f1c66a",
        stroke_width=2,
        stroke_fill="#fff0ad",
    )


canvas = Image.open(BASE).convert("RGBA")

# Darken the text and logo zones without losing the original cinematic light.
shade = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
shade_draw = ImageDraw.Draw(shade)
shade_draw.rectangle((0, 0, W, 205), fill=(0, 0, 0, 55))
shade_draw.rectangle((0, 565, W, H), fill=(0, 0, 0, 38))
shade = shade.filter(ImageFilter.GaussianBlur(24))
canvas = Image.alpha_composite(canvas, shade)
draw = ImageDraw.Draw(canvas)

# Header.
header_font = font(IMPACT, 138)
header = "CONFIRMADOS"
gold_text(canvas, header, (centered_x(draw, header, header_font), 18), header_font, stroke=8, extrusion=9)

subtitle_font = font(BAHNSCHRIFT, 48)
subtitle = "P A R A   O   E V E N T O"
subtitle_x = centered_x(draw, subtitle, subtitle_font)
draw.text((subtitle_x + 4, 158 + 5), subtitle, font=subtitle_font, fill="#3a210a", stroke_width=3, stroke_fill="#130b03")
draw.text((subtitle_x, 158), subtitle, font=subtitle_font, fill="#efbd5c", stroke_width=1, stroke_fill="#fff0ad")
draw.line((202, 206, 405, 184), fill="#d9a644", width=4)
draw.line((849, 184, 1052, 206), fill="#d9a644", width=4)

# Neutral name plate. Replace these two strings when the guest name is known.
name_font = font(IMPACT, 116)
name_top = "CONVIDADO"
gold_text(canvas, name_top, (centered_x(draw, name_top, name_font), 575), name_font, stroke=7, extrusion=8)

name_bottom_font = font(IMPACT, 76)
name_bottom = "CONFIRMADO"
gold_text(canvas, name_bottom, (centered_x(draw, name_bottom, name_bottom_font), 686), name_bottom_font, stroke=6, extrusion=6)

# Official event emblem.
brasao = contain(Image.open(BRASAO).convert("RGBA"), (410, 365))
brasao_shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
bx = (W - brasao.width) // 2
by = 748
shadow_layer = Image.new("RGBA", brasao.size, (0, 0, 0, 0))
shadow_layer.alpha_composite(brasao)
shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(15))
brasao_shadow.alpha_composite(shadow_layer, (bx, by + 10))
canvas = Image.alpha_composite(canvas, brasao_shadow)
canvas.alpha_composite(brasao, (bx, by))

# CPPEM footer and tagline.
cppem = contain(Image.open(CPPEM).convert("RGBA"), (315, 88))
cx = (W - cppem.width) // 2
cy = 1110
canvas.alpha_composite(cppem, (cx, cy))
draw = ImageDraw.Draw(canvas)
draw.line((240, cy + cppem.height // 2, cx - 28, cy + cppem.height // 2), fill="#d8a84b", width=3)
draw.line((cx + cppem.width + 28, cy + cppem.height // 2, 1014, cy + cppem.height // 2), fill="#d8a84b", width=3)

tagline_font = font(ARIAL_BOLD, 20)
tagline = "F O R Ç A   A T R A V É S   D O   C O N H E C I M E N T O"
tx = centered_x(draw, tagline, tagline_font)
draw.text((tx, 1198), tagline, font=tagline_font, fill="#e9dfcf", stroke_width=1, stroke_fill="#1a1007")

final = canvas.convert("RGB")
final.save(OUTPUT_WEBP, "WEBP", quality=94, method=6)
final.save(OUTPUT_JPG, "JPEG", quality=95, subsampling=0, optimize=True)
print(OUTPUT_WEBP)
print(OUTPUT_JPG)
