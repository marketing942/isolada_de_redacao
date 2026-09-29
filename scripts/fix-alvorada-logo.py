from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


SOURCE = Path(r"C:\Users\mathe\Downloads\ChatGPT Image 24 de set. de 2026, 16_15_22.png")
LOGO_SOURCE = Path(r"C:\Users\mathe\Downloads\ALVORADA.jpg")
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "renato-barbosa-confirmado-logo-corrigida.png"
DOWNLOAD_OUTPUT = SOURCE.with_name("ChatGPT Image 24 de set. de 2026, 16_15_22 - corrigida.png")


def remove_connected_black_background(image: Image.Image, threshold: int = 28) -> Image.Image:
    """Remove only dark pixels connected to the outside edge.

    Internal black areas of the logo remain untouched, so the logo artwork and
    colors are preserved exactly.
    """
    rgba = image.convert("RGBA")
    rgb = np.asarray(rgba)[..., :3]
    dark = np.max(rgb, axis=2) <= threshold
    height, width = dark.shape
    outside = np.zeros((height, width), dtype=bool)
    queue = deque()

    for x in range(width):
        if dark[0, x]:
            outside[0, x] = True
            queue.append((0, x))
        if dark[height - 1, x] and not outside[height - 1, x]:
            outside[height - 1, x] = True
            queue.append((height - 1, x))
    for y in range(height):
        if dark[y, 0] and not outside[y, 0]:
            outside[y, 0] = True
            queue.append((y, 0))
        if dark[y, width - 1] and not outside[y, width - 1]:
            outside[y, width - 1] = True
            queue.append((y, width - 1))

    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < height and 0 <= nx < width and dark[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                queue.append((ny, nx))

    pixels = np.array(rgba)
    pixels[outside, 3] = 0
    return Image.fromarray(pixels, "RGBA")


def contain(image: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    resized = image.copy()
    resized.thumbnail(max_size, Image.Resampling.LANCZOS)
    return resized


original = Image.open(SOURCE).convert("RGBA")
canvas = original.copy()
logo = remove_connected_black_background(Image.open(LOGO_SOURCE))

# Large exact logo behind the guest.
back_logo = contain(logo, (760, 760))
back_x = (canvas.width - back_logo.width) // 2
back_y = 185
canvas.alpha_composite(back_logo, (back_x, back_y))

# Restore the guest from the original artwork so the logo sits behind him.
guest_mask = Image.new("L", original.size, 0)
mask_draw = ImageDraw.Draw(guest_mask)
mask_draw.ellipse((493, 168, 773, 474), fill=255)
mask_draw.polygon(
    [
        (360, 446),
        (432, 391),
        (520, 365),
        (735, 367),
        (830, 403),
        (913, 506),
        (894, 663),
        (370, 663),
    ],
    fill=255,
)
mask_draw.polygon([(390, 373), (477, 405), (633, 756), (536, 779)], fill=255)
guest_mask = guest_mask.filter(ImageFilter.GaussianBlur(2.0))
canvas = Image.composite(original, canvas, guest_mask)

# Restore the original name lettering in front of the background logo.
name_mask = Image.new("L", original.size, 0)
name_draw = ImageDraw.Draw(name_mask)
name_draw.rounded_rectangle((254, 568, 1007, 814), radius=18, fill=255)
name_mask = name_mask.filter(ImageFilter.GaussianBlur(1.2))
canvas = Image.composite(original, canvas, name_mask)

# Remove the lower spill from the background copy and restore the source art.
lower_restore = Image.new("L", original.size, 0)
ImageDraw.Draw(lower_restore).rectangle((0, 650, canvas.width, canvas.height), fill=255)
canvas = Image.composite(original, canvas, lower_restore)

# Quietly cover the previously baked-in emblem before adding the exact logo.
footer_cover = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
footer_draw = ImageDraw.Draw(footer_cover)
footer_draw.ellipse((300, 755, 954, 1245), fill=(0, 0, 0, 238))
footer_cover = footer_cover.filter(ImageFilter.GaussianBlur(44))
canvas = Image.alpha_composite(canvas, footer_cover)

# Second unmodified logo in the lower area, above the smoke.
bottom_logo = contain(logo, (420, 420))
bottom_x = (canvas.width - bottom_logo.width) // 2
bottom_y = 810
canvas.alpha_composite(bottom_logo, (bottom_x, bottom_y))

final = canvas.convert("RGB")
final.save(OUTPUT, "PNG", optimize=True)
final.save(DOWNLOAD_OUTPUT, "PNG", optimize=True)
print(OUTPUT)
print(DOWNLOAD_OUTPUT)
