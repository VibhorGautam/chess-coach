# Chess Coach

Move suggestions that meet you where you are.

Chess engines suggest moves that are 100% optimal, but as a human player you can't understand *why* the engine chose that move. Chess Coach takes a different approach: it shows you what players at **500, 1000, 1500, and 2000 ELO** would play in your exact position, then suggests a **growth move** that's ~30% better than your current level, not 100% engine-best.

A move you can actually understand and learn from.

## How It Works

1. **Set up a position** - Drag pieces on the board, paste a FEN string, or pick an example opening
2. **Set your rating** - Use the slider to tell it your approximate skill level (500-2000)
3. **Hit Analyze** - See how each rating band would play, and get a personalized growth move with an explanation calibrated to your level

Under the hood:
- **Boltzmann probability modeling** (inspired by MAIA Chess research) simulates realistic human move selection at each rating level
- **Stockfish 18 WASM** runs entirely in your browser for real engine analysis (no server, no API keys)
- **Three-tier explanations** use vocabulary you already understand at your rating level

## Quick Start

```bash
git clone https://github.com/VibhorGautam/chess-coach.git
cd chess-coach
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Build

```bash
npm run build
npm start
```

## Requirements

- Node.js 18+
- npm 9+

No API keys or external services needed. Everything runs locally in your browser.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- react-chessboard + chess.js
- Stockfish 18 WASM (lite single-threaded, ~7MB)

## Project Structure

```
src/
  app/           - Next.js pages and layout
  components/    - React components (board, cards, inputs)
  engine/        - Stockfish WASM integration and UCI parsing
  models/        - Rating profiles, probability model, growth engine
  lib/           - Types, constants, explanations, FEN utilities
public/
  stockfish/     - Stockfish WASM binary and web worker
```

## Contact

Questions or feedback: vibhorgautam907@gmail.com
