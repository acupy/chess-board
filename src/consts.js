export const ALT_PIECES = {
  R: '♖',
  N: '♘',
  B: '♗',
  Q: '♕',
  K: '♔',
  P: '♙',
  r: '♜',
  n: '♞',
  b: '♝',
  q: '♛',
  k: '♚',
  p: '♟',
  '-': '',
};

/** Classic PNG sets (alpha, cheq, leipzig) */
export const PIECES = {
  R: 'WhiteRook.png',
  N: 'WhiteKnight.png',
  B: 'WhiteBishop.png',
  Q: 'WhiteQueen.png',
  K: 'WhiteKing.png',
  P: 'WhitePawn.png',
  r: 'BlackRook.png',
  n: 'BlackKnight.png',
  b: 'BlackBishop.png',
  q: 'BlackQueen.png',
  k: 'BlackKing.png',
  p: 'BlackPawn.png',
  '-': '',
};

/** Lichess-style SVG filenames: wK.svg / bP.svg */
export const LICHESS_PIECES = {
  K: 'wK.svg',
  Q: 'wQ.svg',
  R: 'wR.svg',
  B: 'wB.svg',
  N: 'wN.svg',
  P: 'wP.svg',
  k: 'bK.svg',
  q: 'bQ.svg',
  r: 'bR.svg',
  b: 'bB.svg',
  n: 'bN.svg',
  p: 'bP.svg',
  '-': '',
};

export const PIECE_STYLES = [
  { id: 'fontAwesome', label: 'Font Awesome', kind: 'fontawesome' },
  { id: 'unicode', label: 'Unicode', kind: 'unicode' },
  { id: 'cburnett', label: 'Cburnett (Lichess)', kind: 'lichess' },
  { id: 'merida', label: 'Merida (Lichess)', kind: 'lichess' },
  { id: 'california', label: 'California (Lichess)', kind: 'lichess' },
  { id: 'alpha', label: 'Alpha', kind: 'png' },
  { id: 'cheq', label: 'Cheq', kind: 'png' },
  { id: 'leipzig', label: 'Leipzig', kind: 'png' },
];

export const getPieceStyleMeta = (id) =>
  PIECE_STYLES.find((style) => style.id === id) || PIECE_STYLES[0];

export const FIELD_AVAILABILITY = {
  UNAVAILABLE: 0,
  AVAILABLE: 1,
  HIT: 2,
  DEFEND: 3,
};

export const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
export const EMPTY = '-';
