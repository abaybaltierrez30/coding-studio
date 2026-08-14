# Unsafe Safety

Simple browser minigame inspired by Mushroom Mix-Up.

You can play completely offline by opening the `index.html` file directly in your browser (no server required).

How to run (offline):

- Double-click `index.html` in Finder/Explorer to open it in your default browser.
- Or open it from your browser using the `file://` URL (e.g. `file:///path/to/coding-2/index.html`).

If your browser blocks local files for security reasons, either allow local file access for that browser or run a tiny local server as a fallback:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Controls:
- Move: `WASD` or arrow keys
- Jump: `Space` or `W`
- Punch: Left-click
- Pause: `P` (Quit to title with `Q`)
