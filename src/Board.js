import React, { Component } from 'react';
import './style.css';

import Piece from './Piece';
import { COLUMNS, RANKS } from './consts';

class Board extends Component {
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

  render() {
    const { position, pieceStyle } = this.props;
    const boardStatus = this.getBoardFromFEN(position);

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
                  className={this.getFieldColour(ridx,cidx)}>
                  {boardStatus[ridx][cidx] !== '-' &&
                    <Piece piece={boardStatus[ridx][cidx]} pieceStyle={pieceStyle} />
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
