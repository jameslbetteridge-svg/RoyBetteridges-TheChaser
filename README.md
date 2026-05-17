# Roy's Chase (Host Voice Lines)

## Add your own host voice lines (MP3)
Put MP3s in `assets/audio/host/` using the filenames in `assets/audio/host/README.txt`.

The game will:
- Play a fanfare (uses `assets/audio/host/fanfare.mp3` if present, otherwise a built-in synth fanfare)
- Pick a random host line based on Cash Builder score (bad/avg/good/great)

## Cache busting
This build appends a `?v=...` query string to JS/CSS to reduce GitHub Pages caching.

