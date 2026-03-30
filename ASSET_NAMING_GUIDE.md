# Asset Naming Guide

VIZR uses a smart naming system to automatically assign roles and behaviors to uploaded images. You can control how your visuals behave by using specific tags in the filenames of your images, or by using the built-in **Asset Editor**.

## The Naming System Structure

Tags are separated by double underscores (`__`) in the filename. The exact format is:
`[type]__[aspect]__[color]__[behavior].ext`

### 1. Type (Required)
Determines which layer the image is displayed on.
- `bg`: Full screen background images.
- `poster`: Large visual elements (foreground visuals, posters, main subjects).
- `overlay`: Floating graphics, logos, or textures (scaled smaller).
- `logo`: Clean, often transparent graphics.
- `flash`: Short, event-based visuals.

### 2. Aspect Ratio (Auto-detected)
Helps the system understand the image proportions.
- `landscape`: Wider than tall.
- `portrait`: Taller than wide.
- `square`: Equal width and height.

### 3. Color Profile
Gives the system hints about the color palette.
- `mono`: Black and white or grayscale.
- `accent`: Mostly monochrome with one strong accent color.
- `color`: Full color.

### 4. Behavior
Controls how often and when the image is displayed.
- `frequent`: The image is selected often.
- `rare`: The image is selected occasionally.
- `peak`: The image appears preferentially during strong audio events (kicks, bass drops).

## Examples

- `bg__landscape__color__frequent.jpg`: A full-color background image in landscape format that appears frequently.
- `poster__portrait__mono__peak.png`: A black-and-white poster image in portrait format that appears during audio peaks.
- `overlay__square__accent__rare.png`: A square overlay with an accent color that appears rarely.

## Asset Editor (Smart Naming)

VIZR includes a built-in **Asset Editor** that helps you prepare your images and automatically generates these filenames without manual renaming.

### Features of the Asset Editor:
- **Preview:** View your uploaded images in a large, clear view.
- **Original Filename:** Keep track of the origin of your files.
- **Smart Tagging:** Easily select the `Type`, `Aspect`, `Color`, and `Behavior` using a clean UI.
- **Auto-Analysis:** The system automatically detects the aspect ratio (`landscape`, `portrait`, `square`) of your images.
- **Filename Generator:** The editor automatically generates an optimized filename based on your selections.

### Workflow:
1. Click on **ASSET EDITOR** on the start screen.
2. Select an image from the list on the left.
3. Adjust the tags (Type, Aspect, Color, Behavior) on the right.
4. Click **USE IN VISUALIZER** to jump directly into the visualizer with the configured assets.

The Asset Editor is the fastest way to ensure your assets work exactly as you want them to in the visualizer.
