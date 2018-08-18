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
  getBoardStatus() {
    const { position } = this.props;
    const ranks = position.split(' ')[0].split('/');
    let board = [];
    ranks.forEach((rank, ridx)=>{
      let rankFields = [];
      rank.split('').forEach((field, fidx)=>{
          if (isNaN(field)){
            rankFields.push(field);
          } else {
            rankFields = rankFields.concat(Array(parseInt(field, 10)).fill('-'));
          }
      });

      // TODO :: 8 columns and 8 ranks should be enforced by design
      const emptyFields = 8 - rankFields.length;
      if (emptyFields) {
        rankFields = rankFields.concat(Array(emptyFields).fill('-'));
      }

      board.push(rankFields);
    });
    return board;
  }
  render() {
    const boardStatus = this.getBoardStatus();
    const pieceStyle = 'cheq';
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
