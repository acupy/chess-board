import React, { Component } from 'react';
import './styles/style.css';

import Piece from './Piece';
import { COLUMNS, RANKS, FIELD_AVAILABILITY } from './consts';
import { getEmptyAvailabilityMatrix } from './utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquare } from '@fortawesome/free-solid-svg-icons';

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
      turn: true, // true - white / false - black 
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

    if ((prevProps.heatmapEnabled !== this.props.heatmapEnabled) && this.props.heatmapEnabled) {
      this.setState({
        heatmap: this.getHeatmap(this.getAvailabilityMatricies())
      });
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
    const {allowedFieldsForSelected, boardStatus, turn} = this.state;
    const {chessRulesEnforced} = this.props;

    if (chessRulesEnforced && allowedFieldsForSelected[rankIdx][columnIdx] === FIELD_AVAILABILITY.HIT) {
      this.onClickMoveField(rankIdx, columnIdx);
      return;
    }

    if (chessRulesEnforced &&
      ((boardStatus[rankIdx][columnIdx].toUpperCase() === boardStatus[rankIdx][columnIdx] && !turn) ||
      (boardStatus[rankIdx][columnIdx].toUpperCase() !== boardStatus[rankIdx][columnIdx] && turn))
    ){
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

      return { boardStatus: boardStatus, selected: [-1, -1], turn:!this.state.turn };
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

  setAllowedFieldsForSelectedPiece(){
    const {selected, boardStatus} = this.state;

    if (selected[0] === -1 || selected[1] === -1) return;
    
    let selectedPieceType = boardStatus[selected[0]][selected[1]];

    switch (selectedPieceType.toUpperCase()) {
      case 'R':
        this.applyRookRules();
        break;
      case 'B':
        this.applyBishopRules();
        break
      case 'Q':
        this.applyBishopRules();
        this.applyRookRules();
        break;
      case 'N':
        this.applyKnightRules();
        break;
      case 'P':
        this.applyPawnRules();
        break;
      case 'K':
        this.applyKingRules();
        break;
      default:
        break;
    }
  }

  getFieldAvailabilityForSelected(rankCnt, columnCnt){
    const {boardStatus, selected} = this.state;
    if (boardStatus[rankCnt][columnCnt] === '-') {
      return FIELD_AVAILABILITY.AVAILABLE;
    } else if (this.isOpponentPiece(boardStatus[selected[0]][selected[1]], boardStatus[rankCnt][columnCnt])) {
      return FIELD_AVAILABILITY.HIT;
    }
    return FIELD_AVAILABILITY.DEFEND;
  }

  traverseHelper(rankCnt, columnCnt, rankIncrement, columnIncrement, tmpAllowedMtrx) {
    rankCnt+=rankIncrement;
    columnCnt+=columnIncrement; 
    while((-1<rankCnt && rankCnt<8) && (-1<columnCnt && columnCnt<8)) { // within the board
      let fieldAvailability = this.getFieldAvailabilityForSelected(rankCnt, columnCnt);
      tmpAllowedMtrx[rankCnt][columnCnt] = fieldAvailability;
      if (fieldAvailability !== FIELD_AVAILABILITY.AVAILABLE) break; // break if we cannot go further

      rankCnt+=rankIncrement;
      columnCnt+=columnIncrement;
    }
  }

  applyRookRules() {
    const {selected, allowedFieldsForSelected} = this.state;
    let tmpAllowedMtrx = allowedFieldsForSelected;

    for(let i=-1; i<=1; i++) {
      for(let j=-1; j<=1; j++) {
        if (Math.abs(i) === Math.abs(j)) continue;
        this.traverseHelper(selected[0], selected[1], i, j, tmpAllowedMtrx);
      }
    }

    this.setState({
      allowedFieldsForSelected: tmpAllowedMtrx
    })

  }

  applyBishopRules() {
    const {selected, allowedFieldsForSelected} = this.state;
    let tmpAllowedMtrx = allowedFieldsForSelected;

    for(let i=-1; i<=1; i++) {
      for(let j=-1; j<=1; j++) {
        if (Math.abs(i) !== Math.abs(j) || i === 0 || j === 0) continue;
        this.traverseHelper(selected[0], selected[1], i, j, tmpAllowedMtrx);
      }
    }

    this.setState({
      allowedFieldsForSelected: tmpAllowedMtrx
    })

  }

  applyKnightRules() {
    const {selected, allowedFieldsForSelected} = this.state;
    let tmpAllowedMtrx = allowedFieldsForSelected;

    const rankIdx = selected[0];
    const columnIdx = selected[1];

    for(let i=-2; i<=2; i++) {
      for(let j=-2; j<=2; j++) {
        if (Math.abs(i) === Math.abs(j) || i === 0 || j === 0) continue;
        if((-1<rankIdx+i && rankIdx+i<8) && (-1<columnIdx+j && columnIdx+j<8)) {
          tmpAllowedMtrx[rankIdx+i][columnIdx+j] = this.getFieldAvailabilityForSelected(rankIdx+i, columnIdx+j);
        }
      }
    }
    
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
      if (rankIdx > 0 && columnIdx > 0 && boardStatus[rankIdx-1][columnIdx-1] !== '-') {
        if (this.isOpponentPiece(boardStatus[rankIdx-1][columnIdx-1], boardStatus[rankIdx][columnIdx])) {
          tmpAllowedMtrx[rankIdx-1][columnIdx-1] = FIELD_AVAILABILITY.HIT;
        } else {
          tmpAllowedMtrx[rankIdx-1][columnIdx-1] = FIELD_AVAILABILITY.DEFEND;
        }
        
      }

      if (rankIdx > 0 && columnIdx < 7 && boardStatus[rankIdx-1][columnIdx+1] !== '-') {
        if (this.isOpponentPiece(boardStatus[rankIdx-1][columnIdx+1], boardStatus[rankIdx][columnIdx])) {
          tmpAllowedMtrx[rankIdx-1][columnIdx+1] = FIELD_AVAILABILITY.HIT;
        } else {
          tmpAllowedMtrx[rankIdx-1][columnIdx+1] = FIELD_AVAILABILITY.DEFEND;
        }
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
      if (rankIdx < 7 && columnIdx < 7 && boardStatus[rankIdx+1][columnIdx+1] !== '-') {
        if (this.isOpponentPiece(boardStatus[rankIdx+1][columnIdx+1], boardStatus[rankIdx][columnIdx])) {
          tmpAllowedMtrx[rankIdx+1][columnIdx+1] = FIELD_AVAILABILITY.HIT;
        } else {
          tmpAllowedMtrx[rankIdx+1][columnIdx+1] = FIELD_AVAILABILITY.DEFEND;
        }
      }

      if (rankIdx < 7 && columnIdx > 0 && boardStatus[rankIdx+1][columnIdx-1] !== '-') {
        if (this.isOpponentPiece(boardStatus[rankIdx+1][columnIdx-1], boardStatus[rankIdx][columnIdx])) {
          tmpAllowedMtrx[rankIdx+1][columnIdx-1] = FIELD_AVAILABILITY.HIT;
        } else {
          tmpAllowedMtrx[rankIdx+1][columnIdx-1] = FIELD_AVAILABILITY.DEFEND;
        }
        
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
        } else {
          tmpAllowedMtrx[rankIdx+i][columnIdx+j] = FIELD_AVAILABILITY.DEFEND;
        }
      }
    }

    this.setState({
      allowedFieldsForSelected: tmpAllowedMtrx
    });
    
  }

  isOpponentPiece(piece1, piece2) {
    return (
      (piece1 === piece1.toUpperCase() && piece2 !== piece2.toUpperCase()) || 
      (piece1 !== piece1.toUpperCase() && piece2 === piece2.toUpperCase())
    );
  }

  getAvailabilityMatricies() {
    const {boardStatus} = this.state;
    let resultMatricies = [];
    for(let i=0; i<8; i++) {
      for(let j=0; j<8; j++) {
        // this.setState
      }
    }
  }

  getHeatmap(arrayOfMatricies) {
    let resultHeatmap = getEmptyAvailabilityMatrix();

    arrayOfMatricies.forEach(item => {
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          let matrix = item[0];
          let piece = item[1];
          if(matrix[i][j] > 0) {
            if (piece.toUpperCase() === piece) {
              resultHeatmap[i][j] += 1
            } else {
              resultHeatmap[i][j] -= 1
            }
          }
        }
      }
    });

    return resultHeatmap;
  }

  render() {
    const { pieceStyle, chessRulesEnforced } = this.props;
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
                    {(selected[0] !== -1 && selected[1] !== -1) &&
                    (allowedFieldsForSelected[ridx][cidx] === FIELD_AVAILABILITY.AVAILABLE &&
                    <div className={'allowed-field'}></div>) ||
                    (allowedFieldsForSelected[ridx][cidx] === FIELD_AVAILABILITY.HIT && 
                    <div className='hit-field'></div>) ||
                    (this.props.heatmapEnabled && <div className='heatmap-field'></div>)
                    }
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
          <div className='rank-index-container'></div>
        </div>
        {chessRulesEnforced &&
        <div className='board-bottom-status'>
          <div style={{marginLeft:'auto'}}>turn:
          <FontAwesomeIcon 
            style={{color:this.state.turn ? '#bfb3a2' : '#444a54', marginLeft: '10px'}} 
            icon={faSquare} />
          </div>
        </div>}
      </div>
    );
  }
}

export default Board;
