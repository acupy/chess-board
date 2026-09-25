import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquare } from '@fortawesome/free-solid-svg-icons';
import Piece from './Piece';
import { COLUMNS, EMPTY, FIELD_AVAILABILITY, RANKS } from './consts';
import {
  canSelectPiece,
  clearSquare,
  coordsToUci,
  createEmptyAvailabilityMatrix,
  findKing,
  GAME_RESULT,
  getGameResult,
  getLegalMoveMatrix,
  isInCheck,
  isWhiteToMove,
  parseFEN,
  serializeFEN,
  tryMove,
} from './chess';

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
}) {
  const rulesOn = coachMode || chessRulesEnforced;
  const [game, setGame] = useState(() => parseFEN(position));
  const [selected, setSelected] = useState([-1, -1]);

  useEffect(() => {
    setGame(parseFEN(position));
    setSelected([-1, -1]);
  }, [position]);

  const allowedFieldsForSelected = useMemo(() => {
    if (selected[0] === -1 || selected[1] === -1) {
      return createEmptyAvailabilityMatrix();
    }
    return getLegalMoveMatrix(game, selected);
  }, [game, selected]);

  const commitGame = (next, moveMeta = null) => {
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
    if (interactionDisabled) return;
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

    const promo =
      game.board[from[0]][from[1]]?.toUpperCase() === 'P' && (to[0] === 0 || to[0] === 7)
        ? 'q'
        : null;
    const uci = coordsToUci(from, to, promo);
    commitGame(next, { from, to, uci });
  };

  const selectPiece = (rankIdx, columnIdx) => {
    if (interactionDisabled) return;

    if (rulesOn && allowedFieldsForSelected[rankIdx][columnIdx] === FIELD_AVAILABILITY.HIT) {
      moveSelectedTo(rankIdx, columnIdx);
      return;
    }

    if (!canSelectPiece(game, [rankIdx, columnIdx], rulesOn)) {
      return;
    }

    setSelected((current) =>
      current[0] === rankIdx && current[1] === columnIdx ? [-1, -1] : [rankIdx, columnIdx]
    );
  };

  const onRemoveSelectedPiece = (event) => {
    if (coachMode || rulesOn || event.key !== 'Backspace') return;
    if (selected[0] === -1 || selected[1] === -1) return;
    commitGame(clearSquare(game, selected));
  };

  const whiteToMove = isWhiteToMove(game);
  const inCheck = rulesOn && isInCheck(game.board, whiteToMove);
  const gameResult = rulesOn ? getGameResult(game) : GAME_RESULT.PLAYING;
  const isCheckmate = gameResult === GAME_RESULT.CHECKMATE;
  const isStalemate = gameResult === GAME_RESULT.STALEMATE;
  const checkedKing = inCheck ? findKing(game.board, whiteToMove) : null;

  const statusLabel = isCheckmate
    ? 'Checkmate!'
    : isStalemate
      ? 'Stalemate'
      : inCheck
        ? 'Check!'
        : null;

  return (
    <div
      className={`board-wrapper board-theme-${pieceStyle || 'cburnett'}${interactionDisabled ? ' board-disabled' : ''}${inCheck ? ' in-check' : ''}${isCheckmate ? ' in-checkmate' : ''}`}
      onKeyDown={onRemoveSelectedPiece}
      onBlur={() => setSelected([-1, -1])}
      tabIndex="0"
    >
      {statusLabel && (
        <div
          className={`board-alert ${isCheckmate ? 'alert-mate' : isStalemate ? 'alert-stale' : 'alert-check'}`}
          role="status"
          aria-live="polite"
        >
          {statusLabel}
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
            <div className="rank" key={`rank-${ridx}`}>
              {rank.map((cell, cidx) => {
                const isKingChecked =
                  checkedKing && checkedKing[0] === ridx && checkedKing[1] === cidx;
                const isHintFrom =
                  hintFrom && hintFrom[0] === ridx && hintFrom[1] === cidx;
                const isHintTo = hintTo && hintTo[0] === ridx && hintTo[1] === cidx;
                return (
                  <div
                    key={`field-${ridx}-${cidx}`}
                    className={[
                      getFieldColour(ridx, cidx),
                      isKingChecked ? 'check-field' : '',
                      isHintFrom ? 'hint-from-field' : '',
                      isHintTo ? 'hint-to-field' : '',
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
                        inCheck={Boolean(isKingChecked)}
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
          <div style={{ marginLeft: 'auto' }}>
            {busy ? 'thinking · ' : ''}
            {isCheckmate ? (
              <span className="status-checkmate">checkmate · </span>
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
