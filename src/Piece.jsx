import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChessBishop,
  faChessKing,
  faChessKnight,
  faChessPawn,
  faChessQueen,
  faChessRook,
} from '@fortawesome/free-solid-svg-icons';
import { ALT_PIECES, getPieceStyleMeta, LICHESS_PIECES, PIECES } from './consts';
import FantasyPiece from './fantasy/FantasyPiece';

const FONT_AWESOME_PIECES = {
  P: faChessPawn,
  R: faChessRook,
  B: faChessBishop,
  N: faChessKnight,
  Q: faChessQueen,
  K: faChessKing,
};

function Piece({
  piece,
  pieceStyle,
  isSelected,
  inCheck = false,
  isCheckmated = false,
  selectPiece,
  battleRole = null,
  battleStyle = null,
}) {
  const meta = getPieceStyleMeta(pieceStyle);
  const pieceIcon = FONT_AWESOME_PIECES[piece.toUpperCase()];
  const isWhite = piece === piece.toUpperCase();

  let content = null;
  if (meta.kind === 'fantasy') {
    content = <FantasyPiece piece={piece} />;
  } else if (meta.kind === 'military') {
    const file = `${isWhite ? 'w' : 'b'}${piece.toUpperCase()}.png`;
    content = (
      <img
        className="piece military-piece"
        src={`img/pieceStyles/military/${file}`}
        alt={ALT_PIECES[piece]}
        draggable={false}
      />
    );
  } else if (meta.kind === 'fontawesome') {
    content = (
      <FontAwesomeIcon
        icon={pieceIcon}
        className="font-awesome-icon"
        style={{ color: isWhite ? '#bfb3a2' : '#444a54' }}
      />
    );
  } else if (meta.kind === 'unicode') {
    content = (
      <span
        className={`unicode-piece ${isWhite ? 'unicode-white' : 'unicode-black'}`}
        aria-label={ALT_PIECES[piece]}
      >
        {ALT_PIECES[piece]}
      </span>
    );
  } else if (meta.kind === 'lichess') {
    content = (
      <img
        className="piece"
        src={`img/pieceStyles/${pieceStyle}/${LICHESS_PIECES[piece]}`}
        alt={ALT_PIECES[piece]}
        draggable={false}
      />
    );
  } else {
    content = (
      <img
        className="piece"
        src={`img/pieceStyles/${pieceStyle}/${PIECES[piece]}`}
        alt={ALT_PIECES[piece]}
        draggable={false}
      />
    );
  }

  const baseClass = isSelected ? 'selected-piece-wrapper' : 'piece-wrapper';
  const stateClass = isCheckmated ? ' king-checkmated' : inCheck ? ' king-in-check' : '';
  const militaryBattle = meta.kind === 'military';
  const battleClass =
    battleRole === 'lunge'
      ? militaryBattle
        ? ' military-advance'
        : ' fantasy-lunge'
      : battleRole === 'struck'
        ? militaryBattle
          ? ' military-hit'
          : ' fantasy-struck'
        : '';
  return (
    <div
      className={`${baseClass}${stateClass}${battleClass}`}
      style={battleStyle || undefined}
      onMouseUp={(event) => {
        event.stopPropagation();
        selectPiece();
      }}
    >
      {content}
      {battleRole === 'struck' && (
        <span
          className={militaryBattle ? 'military-burst' : 'fantasy-spark'}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default Piece;
