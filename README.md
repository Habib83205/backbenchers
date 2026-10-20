# BACKBENCHERS — Table No. 21

A playable, nostalgic 2.5D pen-fighting web game built with React, PixiJS, and Planck.js rigid-body physics.

Classroom and tabletop art are crafted from layered canvas graphics and warm afternoon sunlight; supplied reference screenshots remain documentation only.

## Getting Started

```sh
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Testing & Building

```sh
# Run unit tests
npm test

# Run production build
npm run build

# Run Playwright E2E verification
node tests/e2e-match.cjs
```

## How to Play

- **Aim & Flick**: Click/tap your pen, pull backward to aim and set power, then release to launch.
- **Turn Alternation**: Turns alternate after both pens come to a complete rest.
- **Scoring**: Knock the rival pen over the desk edge to score points. First student to 3 points wins the match!
- **Controls**: Pause/resume via `Escape` or the topbar button, restart match, toggle sound effects, choose custom pens, and set difficulty (Easy, Normal, Hard).
- **Diagnostics**: Press `Ctrl+D` / `Alt+D` or click `[DEV]` in the footer to inspect real-time physics velocities, coordinates, state transitions, and collision states.
