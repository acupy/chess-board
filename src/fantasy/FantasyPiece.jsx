import { FANTASY_ROSTER } from './roster';

const FILES = {
  P: 'wP',
  N: 'wN',
  B: 'wB',
  R: 'wR',
  Q: 'wQ',
  K: 'wK',
  p: 'bP',
  n: 'bN',
  b: 'bB',
  r: 'bR',
  q: 'bQ',
  k: 'bK',
};

function FantasyPiece({ piece }) {
  const meta = FANTASY_ROSTER[piece];
  const file = FILES[piece];
  if (!meta || !file) return null;

  return (
    <div
      className={`fantasy-creature faction-${meta.faction === 'Haven' ? 'good' : 'evil'}`}
      role="img"
      aria-label={`${meta.name}, ${meta.creature} of ${meta.faction}`}
      title={`${meta.name} — ${meta.creature} of ${meta.faction}`}
    >
      <span className={`fantasy-sprite size-${meta.size}`}>
        <img
          className="fantasy-img fantasy-shade"
          src={`img/pieceStyles/fantasy/${file}.png`}
          alt=""
          draggable={false}
        />
      </span>
      <span className="fantasy-nameplate">{meta.plate}</span>
    </div>
  );
}

export default FantasyPiece;
