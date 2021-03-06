const ALT_PIECES = {
  'R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔','P':'♙',
  'r':'♜','n':'♞','b':'♝','q':'♛','k':'♚','p':'♟','-':''
}
const PIECES = {
  'R':'WhiteRook.png',
  'N':'WhiteKnight.png',
  'B':'WhiteBishop.png',
  'Q':'WhiteQueen.png',
  'K':'WhiteKing.png',
  'P':'WhitePawn.png',
  'r':'BlackRook.png',
  'n':'BlackKnight.png',
  'b':'BlackBishop.png',
  'q':'BlackQueen.png',
  'k':'BlackKing.png',
  'p':'BlackPawn.png',
  '-':''
}

const FIELD_AVAILABILITY = {
  UNAVAILABLE: 0, AVAILABLE: 1, HIT: 2, DEFEND: 3
};

const COLUMNS = ['A','B','C','D','E','F','G','H'];

const RANKS = [1,2,3,4,5,6,7,8].reverse();

export { PIECES, RANKS, COLUMNS, ALT_PIECES, FIELD_AVAILABILITY };
