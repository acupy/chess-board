import React, { Component } from 'react';
import './styles/style.css';

import Piece from './Piece';
import { COLUMNS, RANKS, FIELD_AVAILABILITY } from './consts';
import { getEmptyAvailabilityMatrix } from './utils';

class Board extends Component {
  constructor(props) {
    super(props);

    this.onClickMoveField = this.onClickMoveField.bind(this);
    this.onRemoveSelectedPiece = this.onRemoveSelectedPiece.bind(this);
    this.onLoseFocus = this.onLoseFocus.bind(this);

    const { position } = this.props;

    this.state = {
      selected: [-1,-1], // Invalid initial selection
      allowedFieldsForSelected: getEmptyAvailabilityMatrix(),
      boardStatus: this.getBoardFromFEN(position),
    };
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // Update when FEN is changed
    if (prevProps.position !== this.props.position) {
      this.setState({boardStatus: this.getBoardFromFEN(this.props.position)});
    }

    if (
      prevState.selected[0] !== this.state.selected[0] || 
      prevState.selected[1] !== this.state.selected[1]
      ){
        this.setState({
          allowedFieldsForSelected: getEmptyAvailabilityMatrix()
        }, this.setAllowedFieldsForSelectedPiece);
        
    }
  }

  getFieldColour(rankIndex, columnIndex) {
    if ((rankIndex % 2) === 0) {
      return columnIndex % 2 === 1 ? 'black-field' : 'white-field';
    } else {
      return columnIndex % 2 === 0 ? 'black-field' : 'white-field';
    }
  }

  getBoardFromFEN(fen) {
    for (let num=1; num<=8; num++) {
      fen = fen.replace(RegExp(num, 'g'), '-'.repeat(num));
    }
    return fen.split('/').map(item=>item.split(''));
  }

  getFENFromBoard(boardStatus) {
    let fen = '';

    boardStatus.forEach((rank, rankIdx)=>{
      let cnt = 0;
      rank.forEach((field, fidx)=>{

        if (cnt && field !== '-'){
          fen += `${cnt}${field}`;
          cnt = 0;
        } else if(field === '-'){
          cnt++;
        } else {
          fen += field;
        }

        if (fidx === 7 && cnt){
          fen += `${cnt}`;
        }

      });
      fen += rankIdx < 7 ? '/' : '';
    });
    return fen;
  }

  selectPiece(rankIdx, columnIdx) {
    const {allowedFieldsForSelected} = this.state;
    const {chessRulesEnforced} = this.props;
    if (chessRulesEnforced && allowedFieldsForSelected[rankIdx][columnIdx] === FIELD_AVAILABILITY.HIT) {
      this.onClickMoveField(rankIdx, columnIdx);
      return;
    }

    this.setState((prevState, props)=>{
      let newState = {};
      const { selected } = prevState;
      if (selected[0] === rankIdx && selected[1] === columnIdx ) {
        newState = {selected:[-1, -1]}; // unselect
      } else {
        newState = {selected:[rankIdx, columnIdx]}; //select
      }
      return newState;
    });
  }

  onClickMoveField(rankIdx, columnIdx) {
    const {allowedFieldsForSelected} = this.state;
    const {chessRulesEnforced} = this.props;

    if (chessRulesEnforced && allowedFieldsForSelected[rankIdx][columnIdx] === FIELD_AVAILABILITY.UNAVAILABLE) {
      return;
    }
    this.setState((prevState, props)=>{
      const { selected, boardStatus } = prevState;
   
      if (selected[0] === -1 || selected[1] === -1) return;

      // Move piece
      boardStatus[rankIdx][columnIdx] = boardStatus[selected[0]][selected[1]];
      boardStatus[selected[0]][selected[1]] = '-';
      
      props.onBoardUpdated(this.getFENFromBoard(boardStatus));

      return { boardStatus: boardStatus, selected: [-1, -1] };
    });
  }

  onRemoveSelectedPiece(event) {
    const {chessRulesEnforced} = this.props;
    if(chessRulesEnforced || event.key !== 'Backspace') {
      return;
    }

    this.setState((prevState, props)=>{
      let newState = {};
      const { selected, boardStatus } = prevState;
      if (selected[0] !== -1 && selected[1] !== -1){
        boardStatus[selected[0]][selected[1]] = '-';
        newState = {
          selected:[-1,-1],
          boardStatus:boardStatus
        };
      }
      props.onBoardUpdated(this.getFENFromBoard(boardStatus));
      return newState;
    });
  }

  onLoseFocus(event) {
    this.setState({selected:[-1,-1]});
  }

  setAllowedFieldsForSelectedPiece(rankIndex, columnIndex){
    const {selected, boardStatus} = this.state;

    if (selected[0] === -1 || selected[1] === -1) return;
    
    let selectedPieceType = boardStatus[selected[0]][selected[1]];

    if (['R','r'].includes(selectedPieceType)) {
      this.applyRookRules();
    } else if (['B','b'].includes(selectedPieceType)) {
      this.applyBishopRules();
    } else if (['Q','q'].includes(selectedPieceType)) {
      this.applyBishopRules();
      this.applyRookRules();
    } else if (['N','n'].includes(selectedPieceType)) {
      this.applyKnightRules();
    } else if (['P', 'p'].includes(selectedPieceType)) {
      this.applyPawnRules();
    } else if (['K', 'k'].includes(selectedPieceType)) {
      this.applyKingRules();
    }
  }

  getFieldAvailabilityForSelected(rankCnt, columnCnt){
    const {boardStatus, selected} = this.state;
    if (boardStatus[rankCnt][columnCnt] === '-') {
      return FIELD_AVAILABILITY.AVAILABLE;
    } 
    else if (this.isOpponentPiece(boardStatus[selected[0]][selected[1]], boardStatus[rankCnt][columnCnt])) {
      return FIELD_AVAILABILITY.HIT;
    }
    return FIELD_AVAILABILITY.UNAVAILABLE;
  }

  traverseHelper(wileCondition, rankCnt, columnCnt, rankIncrement, columnIncrement, tmpAllowedMtrx) {
    while(wileCondition(rankCnt, columnCnt)) { 
      let fieldAvailability = this.getFieldAvailabilityForSelected(rankCnt, columnCnt);
      if (fieldAvailability === FIELD_AVAILABILITY.UNAVAILABLE) break;
      tmpAllowedMtrx[rankCnt][columnCnt] = fieldAvailability
      if (fieldAvailability === FIELD_AVAILABILITY.HIT) break;

      rankCnt+=rankIncrement;
      columnCnt+=columnIncrement;
    }
  }

  traverseKnightHelper(rankCnt, columnCnt, rankIdx, columnIdx, tmpAllowedMtrx) {
    const {boardStatus} = this.state;
    if((-1<rankCnt && rankCnt<8) && (-1<columnCnt && columnCnt<8)) { // within the board
      if (boardStatus[rankCnt][columnCnt] === '-') { // Available field
        tmpAllowedMtrx[rankCnt][columnCnt] = FIELD_AVAILABILITY.AVAILABLE;
      } else if (this.isOpponentPiece(boardStatus[rankCnt][columnCnt], boardStatus[rankIdx][columnIdx])) { // opponent piece
        tmpAllowedMtrx[rankCnt][columnCnt] = FIELD_AVAILABILITY.HIT;
      }
    }
    return tmpAllowedMtrx;
  }

  applyRookRules() {
    const {selected, allowedFieldsForSelected, boardStatus} = this.state;
    let tmpAllowedMtrx = allowedFieldsForSelected;

    //Up
    this.traverseHelper((rankCnt, _)=>rankCnt > -1, selected[0]-1, selected[1], -1, 0, tmpAllowedMtrx);

    //Down
    this.traverseHelper((rankCnt, _)=>rankCnt < 8, selected[0]+1, selected[1], 1, 0, tmpAllowedMtrx);

    //Left
    this.traverseHelper((_, columnCnt)=>columnCnt > -1, selected[0], selected[1]-1, 0, -1, tmpAllowedMtrx);

    //Right
    this.traverseHelper((_, columnCnt)=>columnCnt < 8, selected[0], selected[1]+1, 0, 1, tmpAllowedMtrx);

    this.setState({
      allowedFieldsForSelected: tmpAllowedMtrx
    })

  }

  applyBishopRules() {
    const {selected, allowedFieldsForSelected, boardStatus} = this.state;
    let tmpAllowedMtrx = allowedFieldsForSelected;

    //Up-Left
    this.traverseHelper((rankCnt, columnCnt)=>rankCnt > -1 && columnCnt > -1, selected[0]-1, selected[1]-1, -1, -1, tmpAllowedMtrx);


    //Up-Right
    this.traverseHelper((rankCnt, columnCnt)=>rankCnt > -1 && columnCnt < 8, selected[0]-1, selected[1]+1, -1, +1, tmpAllowedMtrx);

    //Down-Left
    this.traverseHelper((rankCnt, columnCnt)=>columnCnt > -1 && rankCnt < 8, selected[0]+1, selected[1]-1, 1, -1, tmpAllowedMtrx);


    //Down-Right
    this.traverseHelper((rankCnt, columnCnt)=>columnCnt < 8 && rankCnt < 8, selected[0]+1, selected[1]+1, 1, 1, tmpAllowedMtrx);

    this.setState({
      allowedFieldsForSelected: tmpAllowedMtrx
    })

  }

  applyKnightRules() {
    const {selected, allowedFieldsForSelected, boardStatus} = this.state;
    let tmpAllowedMtrx = allowedFieldsForSelected;

    const rankIdx = selected[0];
    const columnIdx = selected[1];

    // Up-Left
    let rankCnt = rankIdx-2;
    let columnCnt = columnIdx-1;
    tmpAllowedMtrx = this.traverseKnightHelper(rankCnt, columnCnt, rankIdx, columnIdx, tmpAllowedMtrx);
    
    // Up-Right
    rankCnt = rankIdx-2;
    columnCnt = columnIdx+1;
    tmpAllowedMtrx = this.traverseKnightHelper(rankCnt, columnCnt, rankIdx, columnIdx, tmpAllowedMtrx);

    // Down-Left
    rankCnt = rankIdx+2;
    columnCnt = columnIdx-1;
    tmpAllowedMtrx = this.traverseKnightHelper(rankCnt, columnCnt, rankIdx, columnIdx, tmpAllowedMtrx);
    // Down-Right
    rankCnt = rankIdx+2;
    columnCnt = columnIdx+1;
    tmpAllowedMtrx = this.traverseKnightHelper(rankCnt, columnCnt, rankIdx, columnIdx, tmpAllowedMtrx);

    // Left-Up
    rankCnt = rankIdx-1;
    columnCnt = columnIdx-2;
    tmpAllowedMtrx = this.traverseKnightHelper(rankCnt, columnCnt, rankIdx, columnIdx, tmpAllowedMtrx);
    // Left-Down
    rankCnt = rankIdx+1;
    columnCnt = columnIdx-2;
    tmpAllowedMtrx = this.traverseKnightHelper(rankCnt, columnCnt, rankIdx, columnIdx, tmpAllowedMtrx);

    // Right-Up
    rankCnt = rankIdx-1;
    columnCnt = columnIdx+2;
    tmpAllowedMtrx = this.traverseKnightHelper(rankCnt, columnCnt, rankIdx, columnIdx, tmpAllowedMtrx);
    // Right-Down
    rankCnt = rankIdx+1;
    columnCnt = columnIdx+2;
    tmpAllowedMtrx = this.traverseKnightHelper(rankCnt, columnCnt, rankIdx, columnIdx, tmpAllowedMtrx);
    
    this.setState({
      allowedFieldsForSelected: tmpAllowedMtrx
    });
  }

  applyPawnRules() {
    const {selected, allowedFieldsForSelected, boardStatus} = this.state;
    let tmpAllowedMtrx = allowedFieldsForSelected;

    const rankIdx = selected[0];
    const columnIdx = selected[1];

    // WHITE
    if (boardStatus[rankIdx][columnIdx].toUpperCase() === boardStatus[rankIdx][columnIdx]) {
      // White - step
      if(rankIdx === 6) {
        if (boardStatus[rankIdx-1][columnIdx] === '-') {
          tmpAllowedMtrx[rankIdx-1][columnIdx] = FIELD_AVAILABILITY.AVAILABLE;
          if (boardStatus[rankIdx-2][columnIdx] === '-') {
            tmpAllowedMtrx[rankIdx-2][columnIdx] = FIELD_AVAILABILITY.AVAILABLE;
          }
        }
      } else if(rankIdx < 6 && rankIdx > 0) {
        if (boardStatus[rankIdx-1][columnIdx] === '-') {
          tmpAllowedMtrx[rankIdx-1][columnIdx] = FIELD_AVAILABILITY.AVAILABLE;
        }
      }

      // White - hit
      if (
        rankIdx > 0 && columnIdx > 0 &&
        boardStatus[rankIdx-1][columnIdx-1] !== '-' &&
        this.isOpponentPiece(boardStatus[rankIdx-1][columnIdx-1], boardStatus[rankIdx][columnIdx])
      ) {
        tmpAllowedMtrx[rankIdx-1][columnIdx-1] = FIELD_AVAILABILITY.HIT;
      }

      if (
        rankIdx > 0 && columnIdx < 7 &&
        boardStatus[rankIdx-1][columnIdx+1] !== '-' &&
        this.isOpponentPiece(boardStatus[rankIdx-1][columnIdx+1], boardStatus[rankIdx][columnIdx])
      ) {
        tmpAllowedMtrx[rankIdx-1][columnIdx+1] = FIELD_AVAILABILITY.HIT;
      }

    } else { // BLACK
    
      // Black - step
      if(rankIdx === 1) {
        if (boardStatus[rankIdx+1][columnIdx] === '-') {
          tmpAllowedMtrx[rankIdx+1][columnIdx] = FIELD_AVAILABILITY.AVAILABLE;
          if (boardStatus[rankIdx+2][columnIdx] === '-') {
            tmpAllowedMtrx[rankIdx+2][columnIdx] = FIELD_AVAILABILITY.AVAILABLE;
          }
        }
      } else if(rankIdx > 1 && rankIdx < 7) {
        if (boardStatus[rankIdx+1][columnIdx] === '-') {
          tmpAllowedMtrx[rankIdx+1][columnIdx] = FIELD_AVAILABILITY.AVAILABLE;
        }
      }

      // Black - hit
      if (
        rankIdx < 7 && columnIdx < 7 &&
        boardStatus[rankIdx+1][columnIdx+1] !== '-' &&
        this.isOpponentPiece(boardStatus[rankIdx+1][columnIdx+1], boardStatus[rankIdx][columnIdx])
      ) {
        tmpAllowedMtrx[rankIdx+1][columnIdx+1] = FIELD_AVAILABILITY.HIT;
      }

      if (
        rankIdx < 7 && columnIdx > 0 &&
        boardStatus[rankIdx+1][columnIdx-1] !== '-' &&
        this.isOpponentPiece(boardStatus[rankIdx+1][columnIdx-1], boardStatus[rankIdx][columnIdx])
      ) {
        tmpAllowedMtrx[rankIdx+1][columnIdx-1] = FIELD_AVAILABILITY.HIT;
      }
    }
    this.setState({
      allowedFieldsForSelected: tmpAllowedMtrx
    });
  }

  applyKingRules() {
    const {selected, allowedFieldsForSelected, boardStatus} = this.state;
    let tmpAllowedMtrx = allowedFieldsForSelected;

    const rankIdx = selected[0];
    const columnIdx = selected[1];

    for(let i=-1; i<=1; i++) {
      for(let j=-1; j<=1; j++) {
        if (
          (i===0 && j===0) || 
          (rankIdx+i > 7 || rankIdx+i < 0 || columnIdx+j > 7 || columnIdx+j < 0)
        ) continue;
        if(boardStatus[rankIdx+i][columnIdx+j] === '-') {
          tmpAllowedMtrx[rankIdx+i][columnIdx+j] = FIELD_AVAILABILITY.AVAILABLE;
        } else if (this.isOpponentPiece(boardStatus[rankIdx+i][columnIdx+j], boardStatus[rankIdx][columnIdx])) {
          tmpAllowedMtrx[rankIdx+i][columnIdx+j] = FIELD_AVAILABILITY.HIT;
        }
      }
    }

    this.setState({
      allowedFieldsForSelected: tmpAllowedMtrx
    });
    
  }

  isOpponentPiece(piece1, piece2) {
    return (
      piece1 === piece1.toUpperCase() && piece2 !== piece2.toUpperCase() || 
      piece1 !== piece1.toUpperCase() && piece2 === piece2.toUpperCase()
    );
  }

  render() {
    const { pieceStyle } = this.props;
    const { selected, boardStatus, allowedFieldsForSelected } = this.state;

    return (
      <div
        className='board-wrapper'
        onKeyDown={this.onRemoveSelectedPiece}
        onBlur={this.onLoseFocus}
        tabIndex='0'>
        <div className='column-index-container'>
          {COLUMNS.map(cidx=>
            <div className='column-index' key={`cidx-${cidx}`}>{cidx}</div>)}
        </div>
        <div className='sub-board-wrapper'>
          <div className='rank-index-container'>
            {RANKS.map(ridx=>
              <div className='rank-index' key={`ridx-${ridx}`}>{ridx}</div>)}
          </div>
          <div className='board'>
              {boardStatus.map((rank, ridx)=>
                <div className='rank' key={`rank-${ridx}`}>
                {rank.map((cell, cidx)=>
                  <div
                    key={`field-${ridx}-${cidx}`}
                    className={this.getFieldColour(ridx,cidx)}
                    onClick={boardStatus[ridx][cidx] === '-' ?
                      ()=>this.onClickMoveField(ridx, cidx) : null}>
                    {((selected[0] !== -1 && selected[1] !== -1) && allowedFieldsForSelected[ridx][cidx] === FIELD_AVAILABILITY.AVAILABLE) && 
                    <div className='allowed-field'></div>}
                    {((selected[0] !== -1 && selected[1] !== -1) && allowedFieldsForSelected[ridx][cidx] === FIELD_AVAILABILITY.HIT) && 
                    <div className='hit-field'></div>}
                    {boardStatus[ridx][cidx] !== '-' &&
                      <Piece
                        piece={boardStatus[ridx][cidx]}
                        pieceStyle={pieceStyle}
                        isSelected={ridx === selected[0] && cidx === selected[1]}
                        selectPiece={()=>this.selectPiece(ridx, cidx)}
                      />
                    }
                  </div>)}
              </div>)}
          </div>
        </div>
    </div>
    );
  }
}

export default Board;
