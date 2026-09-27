const ARCHIVE_KEY = 'chess-coach-archive';
export const MAX_ARCHIVED_GAMES = 30;

/** Fallback when localStorage is missing (e.g. Vitest node env). */
let memoryArchive = null;

const readArchiveRaw = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(ARCHIVE_KEY);
    }
  } catch {
    /* ignore */
  }
  return memoryArchive;
};

const writeArchiveRaw = (json) => {
  memoryArchive = json;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ARCHIVE_KEY, json);
    }
  } catch {
    /* quota / private mode — memory still holds it */
  }
};

const isResult = (value) => value === 'win' || value === 'loss' || value === 'draw';

const sanitizeMove = (move) => {
  if (!move || typeof move !== 'object' || typeof move.uci !== 'string') return null;
  const by = move.by === 'engine' ? 'engine' : 'player';
  const next = {
    uci: move.uci,
    by,
  };
  if (typeof move.fenAfter === 'string') next.fenAfter = move.fenAfter;
  if (typeof move.verdict === 'string') next.verdict = move.verdict;
  if (typeof move.lossCp === 'number' && Number.isFinite(move.lossCp)) {
    next.lossCp = Math.round(move.lossCp);
  }
  if (typeof move.bestUci === 'string') next.bestUci = move.bestUci;
  return next;
};

const sanitizeGame = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.startFen !== 'string' || !Array.isArray(raw.moves)) return null;
  if (!isResult(raw.result)) return null;
  const moves = raw.moves.map(sanitizeMove).filter(Boolean);
  return {
    id: typeof raw.id === 'string' ? raw.id : `game-${raw.savedAt || Date.now()}`,
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : Date.now(),
    result: raw.result,
    reason: typeof raw.reason === 'string' ? raw.reason : '',
    playerElo: typeof raw.playerElo === 'number' ? raw.playerElo : null,
    eloDelta: typeof raw.eloDelta === 'number' ? raw.eloDelta : 0,
    engineElo: typeof raw.engineElo === 'number' ? raw.engineElo : null,
    startFen: raw.startFen,
    moves,
  };
};

export const loadArchivedGames = () => {
  try {
    const raw = readArchiveRaw();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeGame).filter(Boolean);
  } catch {
    return [];
  }
};

const writeArchive = (games) => {
  writeArchiveRaw(JSON.stringify(games));
  return games;
};

/**
 * Prepend a finished game and trim to MAX_ARCHIVED_GAMES.
 */
export const saveArchivedGame = (partial) => {
  const game = sanitizeGame({
    ...partial,
    id: partial.id || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `game-${Date.now()}`),
    savedAt: partial.savedAt || Date.now(),
  });
  if (!game) return null;

  const existing = loadArchivedGames().filter((g) => g.id !== game.id);
  const next = [game, ...existing].slice(0, MAX_ARCHIVED_GAMES);
  writeArchive(next);
  return game;
};

export const deleteArchivedGame = (id) => {
  const next = loadArchivedGames().filter((g) => g.id !== id);
  writeArchive(next);
  return next;
};

export const clearArchivedGames = () => {
  memoryArchive = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ARCHIVE_KEY);
    }
  } catch {
    /* ignore */
  }
  return [];
};

/** FEN before any moves (ply 0) or after `ply` moves. */
export const fenAtPly = (game, ply) => {
  if (!game?.startFen) return null;
  if (ply <= 0) return game.startFen;
  const move = game.moves?.[ply - 1];
  return move?.fenAfter || game.startFen;
};

export const fenBeforePly = (game, ply) => {
  if (!game?.startFen || ply <= 0) return game?.startFen || null;
  if (ply === 1) return game.startFen;
  return game.moves?.[ply - 2]?.fenAfter || game.startFen;
};

export const formatArchiveDate = (savedAt) => {
  try {
    return new Date(savedAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export const formatArchiveResult = (result) => {
  if (result === 'win') return 'Win';
  if (result === 'draw') return 'Draw';
  return 'Loss';
};
