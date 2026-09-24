import sys
from PIL import Image, ImageDraw

def apply_gradient(image_path, output_path):
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size

    gradient = Image.new('RGBA', (width, height), color=0)
    draw = ImageDraw.Draw(gradient)

    for y in range(height):
        r = int(59 + (168 - 59) * (y / height))
        g = int(130 + (85 - 130) * (y / height))
        b = int(246 + (247 - 246) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    r, g, b, a = img.split()
    
    gradient.putalpha(a)
    gradient.save(output_path)

if __name__ == "__main__":
    apply_gradient("apps/web/public/logo.png", "apps/web/public/favicon.png")
    apply_gradient("apps/web/public/logo.png", "apps/web/public/logo-gradient.png")
    # Also update icon.png for the manifest
    apply_gradient("apps/web/public/logo.png", "apps/web/public/icon.png")
