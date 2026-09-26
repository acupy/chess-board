# Chess board + coach

A React chess board with **coach mode**: play against a strength-limited [Stockfish](https://stockfishchess.org/) opponent, get move feedback in plain language, and track your Elo.

Built with **Vite**, **React 19**, and a small in-browser chess rules engine. Coaching lines are **rule-based templates** (no cloud LLM) — grounded in Stockfish scores plus simple board facts (captures, checks, development, etc.).

![Chess board](public/img/readme/chessboard.png)

## Features

- Click-to-move board with legal-move highlighting
- **Coach mode**: Stockfish replies at ~your Elo + 80 (UCI_Elo above 1320; Skill 0 plus extra weaker moves below that floor); games update your Elo (standard K-factor)
- Move classification (excellent → blunder), friendly coach comments, move history with undo
- Check / checkmate indicators (banner + king animations)
- Themes and piece styles (persisted in `localStorage`)

## Prerequisites

| Tool | Notes |
| --- | --- |
| **Node.js** | 18+ recommended (20+ ideal) |
| **npm** | Comes with Node |

Stockfish WASM is installed via npm and copied into `public/stockfish/` on `npm install`.

## Setup

```bash
git clone https://github.com/acupy/chess-board.git
cd chess-board
npm install
```

`postinstall` copies the Stockfish lite build into `public/stockfish/`. If that folder is missing after install, run:

```bash
node scripts/copy-stockfish.js
```

## Run locally (Vite)

```bash
npm start
# or: npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

| Script | Purpose |
| --- | --- |
| `npm start` / `npm run dev` | Vite dev server (port **3000**) |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |
| `npm run deploy` | Build and deploy to Firebase Hosting (`chess-savvy`) |

## Deploy (Firebase Hosting)

Requires the [Firebase CLI](https://firebase.google.com/docs/cli) and login (`firebase login`).

```bash
npm run deploy
```

This builds the Vite app into `dist/` and deploys that folder (see `firebase.json`). Live site: project **chess-savvy**.

GitHub Actions also deploy on push to `master` (see `.github/workflows/`).

1. Open **Config** (gear) and enable **Coach mode** (on by default).
2. Set your starting Elo if you like (opponent strength tracks it).
3. Play as White; after each move you get a verdict, a short why, and a reply.
4. Use **Hint**, **Undo**, **Resign**, and **New game** in the coach panel.

Everything runs in the browser — no separate AI server required.

## Project layout

```
src/
  chess/          Rules, FEN, UCI helpers, move “why” facts
  engine/         Stockfish worker client + move classification
  coach/          Elo, localStorage profile, template coach voice
  App.jsx         App shell + coach game loop
  Board.jsx       Board UI
  CoachPanel.jsx  Side panel
public/
  stockfish/      WASM engine (generated on install)
  img/            Piece sets + coach avatars
```

## Forsyth–Edwards Notation (FEN)

Positions are stored as FEN, e.g.:

`r1bqkbnr/pppp1ppp/8/1B2p3/3nP3/5N2/PPPP1PPP/RNBQK2R`

|   | A | B | C | D | E | F | G | H |
| - | - | - | - | - | - | - | - | - |
| 8 | r | - | b | q | k | b | n | r |
| 7 | p | p | p | p | - | p | p | p |
| 6 | - | - | - | - | - | - | - | - |
| 5 | - | B | - | - | p | - | - | - |
| 4 | - | - | - | n | P | - | - | - |
| 3 | - | - | - | - | - | N | - | - |
| 2 | P | P | P | P | - | P | P | P |
| 1 | R | N | B | Q | K | - | - | R |

## License

See repository for license details.
