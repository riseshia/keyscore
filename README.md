# keyscore

Piano practice web app with real-time grading and review.

Load a MusicXML score, practice with falling notes, get graded (Perfect/Good/Miss/Error), and review your performance on the sheet music.

## Features (Planned)

- **Practice mode**: Falling notes + real-time grading via MIDI keyboard
- **Review mode**: Sheet music with color-coded grading results
- **MusicXML input**: Load scores exported from MuseScore
- **Web MIDI**: Connect your MIDI keyboard via USB

## Tech Stack

- React + TypeScript + Vite
- OSMD (OpenSheetMusicDisplay) for sheet music rendering
- Canvas 2D for falling notes
- Web MIDI API for keyboard input

## Development

```bash
npm install
npm run dev
npm run test
```

## License

MIT
