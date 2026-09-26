import { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquare } from '@fortawesome/free-solid-svg-icons';
import Piece from './Piece';
import { COLUMNS, EMPTY, FIELD_AVAILABILITY, RANKS } from './consts';
import {
  battleMotion,
  diffCapture,
  FANTASY_ROSTER,
  FANTASY_STRIKE_MS,
  fantasyLabel,
  fantasyMotionEnabled,
} from './fantasy/roster';
import {
  canSelectPiece,
  clearSquare,
  coordsToUci,
  createEmptyAvailabilityMatrix,
  findKing,
  GAME_RESULT,
  getGameResult,
  getLegalMoveMatrix,
  getWinner,
  isInCheck,
  isWhiteToMove,
  parseFEN,
  serializeFEN,
  tryMove,
} from './chess';
import { fenPieceCount, vibrateForMove, vibrateMove, vibrateSelect } from './haptics';

const getFieldColour = (rankIndex, columnIndex) => {
  if (rankIndex % 2 === 0) {
    return columnIndex % 2 === 1 ? 'black-field' : 'white-field';
  }
  return columnIndex % 2 === 0 ? 'black-field' : 'white-field';
};

/**
 * @param {object} props
 * @param {string} props.position - FEN (source of truth from parent)
 * @param {(payload: { fen: string, from: number[], to: number[], uci: string, game: object }) => void} [props.onPlayerMove]
 * @param {(fen: string) => void} [props.onBoardUpdated] - sandbox / FEN edits when not coaching
 * @param {boolean} [props.interactionDisabled]
 * @param {boolean} [props.coachMode] - when true, rules always on and only report moves via onPlayerMove
 * @param {[number, number]|null} [props.hintFrom]
 * @param {[number, number]|null} [props.hintTo]
 * @param {{ coords: [number, number], kind: string }[]} [props.dangerMarks]
 */
function Board({
  position,
  pieceStyle,
  chessRulesEnforced = true,
  onBoardUpdated,
  onPlayerMove,
  interactionDisabled = false,
  busy = false,
  coachMode = false,
  hintFrom = null,
  hintTo = null,
  dangerMarks = [],
}) {
  const rulesOn = coachMode || chessRulesEnforced;
  const [game, setGame] = useState(() => parseFEN(position));
  const [selected, setSelected] = useState([-1, -1]);
  const [battle, setBattle] = useState(null);
  const skipExternalHapticRef = useRef(false);
  const prevPositionRef = useRef(position);
  const strikeTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(strikeTimerRef.current), []);

  useEffect(() => {
    const prev = prevPositionRef.current;

    if (skipExternalHapticRef.current) {
      skipExternalHapticRef.current = false;
      prevPositionRef.current = position;
      return undefined;
    }

    if (!prev || prev === position) {
      prevPositionRef.current = position;
      return undefined;
    }

    const before = fenPieceCount(prev);
    const after = fenPieceCount(position);
    if (after < before) vibrateForMove(true);
    else if (after === before && after > 0) vibrateMove();

    const capture =
      (pieceStyle === 'fantasy' || pieceStyle === 'military') &&
      after < before &&
      fantasyMotionEnabled()
        ? diffCapture(parseFEN(prev).board, parseFEN(position).board)
        : null;

    if (capture) {
      setSelected([-1, -1]);
      setBattle(capture);
      const timer = setTimeout(() => {
        prevPositionRef.current = position;
        setGame(parseFEN(position));
        setBattle(null);
      }, FANTASY_STRIKE_MS);
      return () => clearTimeout(timer);
    }

    prevPositionRef.current = position;
    setGame(parseFEN(position));
    setSelected([-1, -1]);
    setBattle(null);
    return undefined;
  }, [position, pieceStyle]);

  const allowedFieldsForSelected = useMemo(() => {
    if (selected[0] === -1 || selected[1] === -1) {
      return createEmptyAvailabilityMatrix();
    }
    return getLegalMoveMatrix(game, selected);
  }, [game, selected]);

  const commitGame = (next, moveMeta = null, { isCapture = false, skipHaptic = false } = {}) => {
    if (!skipHaptic) vibrateForMove(isCapture);
    skipExternalHapticRef.current = true;
    setGame(next);
    setSelected([-1, -1]);
    const fen = serializeFEN(next);

    if (coachMode && moveMeta && onPlayerMove) {
      onPlayerMove({
        fen,
        from: moveMeta.from,
        to: moveMeta.to,
        uci: moveMeta.uci,
        game: next,
      });
      return;
    }

    if (onBoardUpdated) onBoardUpdated(fen);
  };

  const moveSelectedTo = (rankIdx, columnIdx) => {
    if (interactionDisabled || battle) return;
    if (selected[0] === -1 || selected[1] === -1) return;

    if (
      rulesOn &&
      allowedFieldsForSelected[rankIdx][columnIdx] === FIELD_AVAILABILITY.UNAVAILABLE
    ) {
      return;
    }

    const from = [...selected];
    const to = [rankIdx, columnIdx];
    const next = tryMove(game, from, to, rulesOn);
    if (!next) return;

    const isCapture = rulesOn
      ? allowedFieldsForSelected[rankIdx][columnIdx] === FIELD_AVAILABILITY.HIT
      : game.board[to[0]][to[1]] !== EMPTY;

    const mover = game.board[from[0]][from[1]];
    const promotes = mover?.toUpperCase() === 'P' && (to[0] === 0 || to[0] === 7);
    const promo = promotes ? 'q' : null;
    const uci = coordsToUci(from, to, promo);

    let defender = game.board[to[0]][to[1]];
    let victimAt = to;
    if ((defender === EMPTY || !defender) && mover?.toUpperCase() === 'P' && from[1] !== to[1]) {
      defender = game.board[from[0]][to[1]];
      victimAt = [from[0], to[1]];
    }

    if (
      (pieceStyle === 'fantasy' || pieceStyle === 'military') &&
      isCapture &&
      defender &&
      defender !== EMPTY &&
      fantasyMotionEnabled()
    ) {
      vibrateForMove(true);
      setBattle({
        attacker: promotes ? (mover === 'P' ? 'Q' : 'q') : mover,
        defender,
        from,
        to,
        victimAt,
      });
      setSelected([-1, -1]);
      clearTimeout(strikeTimerRef.current);
      strikeTimerRef.current = setTimeout(() => {
        setBattle(null);
        commitGame(next, { from, to, uci }, { isCapture: true, skipHaptic: true });
      }, FANTASY_STRIKE_MS);
      return;
    }

    commitGame(next, { from, to, uci }, { isCapture });
  };

  const selectPiece = (rankIdx, columnIdx) => {
    if (interactionDisabled || battle) return;

    if (rulesOn && allowedFieldsForSelected[rankIdx][columnIdx] === FIELD_AVAILABILITY.HIT) {
      moveSelectedTo(rankIdx, columnIdx);
      return;
    }

    if (!canSelectPiece(game, [rankIdx, columnIdx], rulesOn)) {
      return;
    }

    setSelected((current) => {
      const deselecting = current[0] === rankIdx && current[1] === columnIdx;
      if (!deselecting) vibrateSelect();
      return deselecting ? [-1, -1] : [rankIdx, columnIdx];
    });
  };

  const onRemoveSelectedPiece = (event) => {
    if (coachMode || rulesOn || event.key !== 'Backspace') return;
    if (selected[0] === -1 || selected[1] === -1) return;
    commitGame(clearSquare(game, selected), null, { isCapture: true });
  };

  const whiteToMove = isWhiteToMove(game);
  const inCheck = rulesOn && isInCheck(game.board, whiteToMove);
  const gameResult = rulesOn ? getGameResult(game) : GAME_RESULT.PLAYING;
  const isCheckmate = gameResult === GAME_RESULT.CHECKMATE;
  const isStalemate = gameResult === GAME_RESULT.STALEMATE;
  const checkedKing = inCheck ? findKing(game.board, whiteToMove) : null;
  const winner = isCheckmate ? getWinner(game) : null;

  const dangerBySquare = useMemo(() => {
    const map = new Map();
    for (const mark of dangerMarks) {
      if (!mark?.coords) continue;
      const key = `${mark.coords[0]},${mark.coords[1]}`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, mark.kind);
      } else if (mark.kind === 'hanging' || prev === 'hanging') {
        map.set(key, 'hanging');
      } else {
        map.set(key, mark.kind);
      }
    }
    return map;
  }, [dangerMarks]);

  const motion = battle ? battleMotion(battle) : null;
  const fightingPiece = battle ? game.board[battle.from[0]]?.[battle.from[1]] : null;
  const fightLine =
    battle && pieceStyle === 'military'
      ? 'Contact'
      : battle && FANTASY_ROSTER[fightingPiece] && FANTASY_ROSTER[battle.defender]
        ? `${FANTASY_ROSTER[fightingPiece].plate} strikes ${FANTASY_ROSTER[battle.defender].plate}`
        : null;
  const selectedPiece = selected[0] !== -1 ? game.board[selected[0]][selected[1]] : null;
  const selectedLine =
    pieceStyle === 'fantasy' && selectedPiece && selectedPiece !== EMPTY
      ? fantasyLabel(selectedPiece)
      : null;

  const mateAlert =
    isCheckmate && winner === 'white'
      ? 'Checkmate — White wins'
      : isCheckmate && winner === 'black'
        ? 'Checkmate — Black wins'
        : isStalemate
          ? 'Stalemate — Draw'
          : null;

  return (
    <div
      className={`board-wrapper board-theme-${pieceStyle || 'cburnett'}${interactionDisabled ? ' board-disabled' : ''}${battle ? ' board-battling' : ''}${inCheck && !isCheckmate ? ' in-check' : ''}${isCheckmate ? ' in-checkmate' : ''}`}
      onKeyDown={onRemoveSelectedPiece}
      onBlur={() => setSelected([-1, -1])}
      tabIndex="0"
    >
      {mateAlert && (
        <div
          className={`board-alert ${isCheckmate ? 'alert-mate' : 'alert-stale'}`}
          role="status"
          aria-live="polite"
        >
          {mateAlert}
        </div>
      )}
      <div className="column-index-container">
        {COLUMNS.map((cidx) => (
          <div className="column-index" key={`cidx-${cidx}`}>
            {cidx}
          </div>
        ))}
      </div>
      <div className="sub-board-wrapper">
        <div className="rank-index-container">
          {RANKS.map((ridx) => (
            <div className="rank-index" key={`ridx-${ridx}`}>
              {ridx}
            </div>
          ))}
        </div>
        <div className="board">
          {game.board.map((rank, ridx) => (
            <div className="rank" key={`rank-${ridx}`} style={{ '--rank': ridx }}>
              {rank.map((cell, cidx) => {
                const isKingChecked =
                  checkedKing && checkedKing[0] === ridx && checkedKing[1] === cidx;
                const isHintFrom =
                  hintFrom && hintFrom[0] === ridx && hintFrom[1] === cidx;
                const isHintTo = hintTo && hintTo[0] === ridx && hintTo[1] === cidx;
                const dangerKind = dangerBySquare.get(`${ridx},${cidx}`);
                return (
                  <div
                    key={`field-${ridx}-${cidx}`}
                    className={[
                      getFieldColour(ridx, cidx),
                      isKingChecked ? 'check-field' : '',
                      isHintFrom ? 'hint-from-field' : '',
                      isHintTo ? 'hint-to-field' : '',
                      dangerKind === 'hanging' ? 'danger-hanging-field' : '',
                      dangerKind === 'pin' ? 'danger-pin-field' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={cell === EMPTY ? () => moveSelectedTo(ridx, cidx) : undefined}
                  >
                    {selected[0] !== -1 &&
                      selected[1] !== -1 &&
                      allowedFieldsForSelected[ridx][cidx] === FIELD_AVAILABILITY.AVAILABLE && (
                        <div className="allowed-field"></div>
                      )}
                    {selected[0] !== -1 &&
                      selected[1] !== -1 &&
                      allowedFieldsForSelected[ridx][cidx] === FIELD_AVAILABILITY.HIT && (
                        <div className="hit-field"></div>
                      )}
                    {cell !== EMPTY && (
                      <Piece
                        piece={cell}
                        pieceStyle={pieceStyle}
                        isSelected={ridx === selected[0] && cidx === selected[1]}
                        inCheck={Boolean(isKingChecked) && !isCheckmate}
                        isCheckmated={Boolean(isKingChecked) && isCheckmate}
                        battleRole={
                          battle && battle.from[0] === ridx && battle.from[1] === cidx
                            ? 'lunge'
                            : battle && battle.victimAt[0] === ridx && battle.victimAt[1] === cidx
                              ? 'struck'
                              : null
                        }
                        battleStyle={
                          motion && battle?.from[0] === ridx && battle?.from[1] === cidx
                            ? motion.lunge
                            : motion && battle?.victimAt[0] === ridx && battle?.victimAt[1] === cidx
                              ? motion.struck
                              : null
                        }
                        selectPiece={() => selectPiece(ridx, cidx)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="rank-index-container"></div>
      </div>
      {rulesOn && (
        <div className="board-bottom-status">
          <div className="board-status-line" style={{ marginLeft: 'auto' }}>
            {fightLine ? (
              <span className={pieceStyle === 'military' ? 'military-contact' : 'fantasy-clash'}>
                {fightLine} ·{' '}
              </span>
            ) : selectedLine ? (
              <span className="fantasy-selected">{selectedLine} · </span>
            ) : pieceStyle === 'fantasy' ? (
              <span className="fantasy-side">{whiteToMove ? 'Haven' : 'Inferno'} · </span>
            ) : null}
            {busy ? 'thinking · ' : ''}
            {isCheckmate ? (
              <span className="status-checkmate">
                checkmate · {winner === 'white' ? 'White' : 'Black'} wins ·{' '}
              </span>
            ) : inCheck ? (
              <span className="status-check">check · </span>
            ) : null}
            turn:
            <FontAwesomeIcon
              style={{ color: whiteToMove ? '#bfb3a2' : '#444a54', marginLeft: '10px' }}
              icon={faSquare}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Board;
