/**
 * Browser Stockfish client (UCI over Web Worker).
 * Uses the lite single-threaded WASM build from /stockfish/.
 */

import { parseFEN } from '../chess';
import { pickHumanMove } from './humanPlay';
import { strengthOptionsForElo } from './strength';

const ENGINE_URL = '/stockfish/stockfish-19-lite-single.js';

const DEFAULT_MOVETIME_MS = 500;
const ANALYZE_MOVETIME_MS = 400;

export { strengthOptionsForElo } from './strength';

let worker = null;
let ready = false;
let queue = Promise.resolve();

const waitFor = (predicate, timeoutMs = 30000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const onMessage = (event) => {
      const line = typeof event.data === 'string' ? event.data : '';
      if (predicate(line, event.data)) {
        worker.removeEventListener('message', onMessage);
        resolve(line);
      } else if (Date.now() - start > timeoutMs) {
        worker.removeEventListener('message', onMessage);
        reject(new Error('Stockfish timeout'));
      }
    };
    worker.addEventListener('message', onMessage);
  });

const send = (cmd) => {
  worker.postMessage(cmd);
};

const runExclusive = (fn) => {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
};

export const initEngine = () =>
  runExclusive(async () => {
    if (ready && worker) return true;

    if (worker) {
      try {
        worker.terminate();
      } catch {
        /* ignore */
      }
      worker = null;
      ready = false;
    }

    worker = new Worker(ENGINE_URL);
    send('uci');
    await waitFor((line) => line === 'uciok');
    send('isready');
    await waitFor((line) => line === 'readyok');
    ready = true;
    return true;
  });

const ensureReady = async () => {
  if (!ready) await initEngine();
};

const applyStrength = async (opts) => {
  if (opts.limitStrength) {
    send('setoption name UCI_LimitStrength value true');
    send(`setoption name UCI_Elo value ${opts.uciElo}`);
    send('setoption name Skill Level value 20');
    send('setoption name MultiPV value 1');
  } else {
    // Full-strength MultiPV so eval losses are real; the human model picks among them.
    send('setoption name UCI_LimitStrength value false');
    send('setoption name Skill Level value 20');
    send(`setoption name MultiPV value ${opts.multiPv || 1}`);
  }
  send('isready');
  await waitFor((line) => line === 'readyok');
};

const parseScore = (infoLine) => {
  const mateMatch = infoLine.match(/\bscore mate (-?\d+)/);
  if (mateMatch) {
    const mate = Number(mateMatch[1]);
    return { type: 'mate', value: mate, cp: mate > 0 ? 100000 - mate * 100 : -100000 - mate * 100 };
  }
  const cpMatch = infoLine.match(/\bscore cp (-?\d+)/);
  if (cpMatch) {
    return { type: 'cp', value: Number(cpMatch[1]), cp: Number(cpMatch[1]) };
  }
  return null;
};

const parseBestMove = (line) => {
  const match = line.match(/^bestmove\s+(\S+)/);
  return match ? match[1] : null;
};

/**
 * Analyze a position. Returns { bestMove, score, pv }.
 * Score is from the side-to-move perspective (Stockfish convention).
 */
export const analyze = (fen, movetimeMs = ANALYZE_MOVETIME_MS) =>
  runExclusive(async () => {
    await ensureReady();
    // Full strength for analysis
    send('setoption name UCI_LimitStrength value false');
    send('setoption name Skill Level value 20');
    send('setoption name MultiPV value 1');
    send('isready');
    await waitFor((line) => line === 'readyok');
    send('ucinewgame');
    send(`position fen ${fen}`);

    let lastScore = { type: 'cp', value: 0, cp: 0 };
    let lastPv = '';

    const resultPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.removeEventListener('message', onMessage);
        reject(new Error('Stockfish analyze timeout'));
      }, movetimeMs + 10000);

      const onMessage = (event) => {
        const line = typeof event.data === 'string' ? event.data : '';
        if (line.startsWith('info ') && line.includes(' score ')) {
          const score = parseScore(line);
          if (score) lastScore = score;
          const pvMatch = line.match(/\bpv (.+)$/);
          if (pvMatch) lastPv = pvMatch[1].trim().split(/\s+/)[0] || lastPv;
        }
        if (line.startsWith('bestmove ')) {
          clearTimeout(timeout);
          worker.removeEventListener('message', onMessage);
          resolve({
            bestMove: parseBestMove(line),
            score: lastScore,
            pv: lastPv,
          });
        }
      };
      worker.addEventListener('message', onMessage);
    });

    send(`go movetime ${movetimeMs}`);
    return resultPromise;
  });

const parseMultiPv = (line) => {
  if (!line.startsWith('info ') || !line.includes(' score ') || !line.includes(' pv ')) return null;
  const rankMatch = line.match(/\bmultipv (\d+)/);
  const pvMatch = line.match(/\bpv (\S+)/);
  const score = parseScore(line);
  if (!pvMatch || !score) return null;
  return {
    rank: rankMatch ? Number(rankMatch[1]) : 1,
    uci: pvMatch[1],
    cp: score.cp,
  };
};

/**
 * Pick a move at approximately the given Elo strength.
 * @param {string} fen
 * @param {number} elo
 * @param {number} [movetimeMs]
 * @param {{ lastOpponentUci?: string | null, lastOwnUci?: string | null }} [context]
 */
export const pickMove = (fen, elo, movetimeMs = DEFAULT_MOVETIME_MS, context = {}) =>
  runExclusive(async () => {
    await ensureReady();
    const opts = strengthOptionsForElo(elo);
    await applyStrength(opts);
    send('ucinewgame');
    send(`position fen ${fen}`);

    const linesByRank = new Map();
    const resultPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.removeEventListener('message', onMessage);
        reject(new Error('Stockfish pickMove timeout'));
      }, movetimeMs + 10000);

      const onMessage = (event) => {
        const line = typeof event.data === 'string' ? event.data : '';
        const parsed = parseMultiPv(line);
        if (parsed) linesByRank.set(parsed.rank, parsed);
        if (line.startsWith('bestmove ')) {
          clearTimeout(timeout);
          worker.removeEventListener('message', onMessage);
          resolve(parseBestMove(line));
        }
      };
      worker.addEventListener('message', onMessage);
    });

    send(`go movetime ${movetimeMs}`);
    const engineMove = await resultPromise;

    if (opts.mode !== 'human') return engineMove;

    try {
      const game = parseFEN(fen);
      const engineLines = [...linesByRank.values()].sort((a, b) => a.rank - b.rank);
      if (engineMove && !engineLines.some((line) => line.uci === engineMove)) {
        engineLines.unshift({ rank: 0, uci: engineMove, cp: engineLines[0]?.cp ?? 0 });
      }
      return (
        pickHumanMove({
          game,
          engineLines,
          elo,
          lastOpponentUci: context.lastOpponentUci,
          lastOwnUci: context.lastOwnUci,
        }) || engineMove
      );
    } catch {
      return engineMove;
    }
  });

/**
 * Classify a player move by comparing eval before vs after (from White's POV),
 * relative to the engine's best move.
 *
 * @param {object} beforeAnalysis - from analyze() on position before the move
 * @param {object} afterAnalysis - from analyze() on position after the move
 * @param {string} playedUci - the move the player played
 * @param {boolean} playerIsWhite
 */
export const classifyMove = (beforeAnalysis, afterAnalysis, playedUci, playerIsWhite) => {
  const best = beforeAnalysis?.bestMove || null;
  const isBest = best && playedUci && best === playedUci;

  // Convert scores to White's perspective
  const beforeCp = beforeAnalysis?.score?.cp ?? 0;
  // After move, side to move flipped — Stockfish score is from STM, so negate
  const afterCpRaw = afterAnalysis?.score?.cp ?? 0;
  const afterCpWhite = -afterCpRaw;

  const beforeWhite = beforeCp;
  const lossForPlayer = playerIsWhite
    ? beforeWhite - afterCpWhite
    : afterCpWhite - beforeWhite;

  let verdict = 'good';
  if (isBest || lossForPlayer <= 15) verdict = 'excellent';
  else if (lossForPlayer <= 50) verdict = 'good';
  else if (lossForPlayer <= 100) verdict = 'inaccuracy';
  else if (lossForPlayer <= 300) verdict = 'mistake';
  else verdict = 'blunder';

  return {
    verdict,
    lossCp: Math.round(lossForPlayer),
    bestMove: best,
    playedMove: playedUci,
    isBest: Boolean(isBest),
    evalBefore: beforeWhite,
    evalAfter: afterCpWhite,
  };
};

export const terminateEngine = () => {
  if (worker) {
    try {
      send('quit');
      worker.terminate();
    } catch {
      /* ignore */
    }
  }
  worker = null;
  ready = false;
  queue = Promise.resolve();
};
