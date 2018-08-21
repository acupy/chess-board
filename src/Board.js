import React, { Component } from 'react';
import './style.css';

import Piece from './Piece';
import { COLUMNS, RANKS } from './consts';

class Board extends Component {
  constructor(props) {
    super(props);

    this.onClickMoveField = this.onClickMoveField.bind(this);

    const { position } = this.props;

    this.state = {
      selected: [-1,-1], // Invalid initial selection
      boardStatus: this.getBoardFromFEN(position),
    };
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // Update when FEN is changed
    if (prevProps.position !== this.props.position) {
      this.setState({boardStatus: this.getBoardFromFEN(this.props.position)});
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

  selectPiece(rankIdx, columnIdx) {
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
    this.setState((prevState, props)=>{
      const { selected, boardStatus } = prevState;
      if (
        (selected[0] === rankIdx && selected[1] === columnIdx) ||
        (selected[0] === -1 || selected[1] === -1)
      ) {
        return {};
      }
      // Move piece
      boardStatus[rankIdx][columnIdx] = boardStatus[selected[0]][selected[1]];
      boardStatus[selected[0]][selected[1]] = '-';

      return { boardStatus: boardStatus, selected: [-1, -1] };
    });
  }

  render() {
    const { pieceStyle } = this.props;
    const { selected, boardStatus } = this.state;

    return (
      <div className='board-wrapper'>
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
        <div className='column-index-container'>
          {COLUMNS.map(cidx=>
            <div className='column-index' key={`cidx-${cidx}`}>{cidx}</div>)}
        </div>
    </div>
    );
  }
}

export default Board;
