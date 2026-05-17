try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillow library not found. Please install it to generate the icon:")
    print("pip install Pillow")
    exit()

# Configuration matching style.css
SIZE = (192, 192)
ACCENT_COLOR = (0, 191, 165)  # #00bfa5
TEXT_COLOR = (255, 255, 255)

# Create the icon
img = Image.new('RGBA', SIZE, color=ACCENT_COLOR)
draw = ImageDraw.Draw(img)

# Add a simple placeholder 'T' logo (or you can paste your own logo logic)
# Note: This uses a default font; for a specific font, provide a path to a .ttf file
try:
    draw.text((65, 45), "TTS", fill=TEXT_COLOR, size=80)
except:
    draw.text((75, 75), "T", fill=TEXT_COLOR)

img.save('icon-192.png')
print("Successfully created icon-192.png in the root directory.")
