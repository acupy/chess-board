import React, { Component } from 'react';
import './style.css'

const PIECES = {
  'R':'♖',
  'N':'♘',
  'B':'♗',
  'Q':'♕',
  'K':'♔',
  'P':'♙',
  'r':'♜',
  'n':'♞',
  'b':'♝',
  'q':'♛',
  'k':'♚',
  'p':'♟',
  '-':''
}

class Board extends Component {
  getFieldColour(rankIndex, columnIndex) {
    if ((rankIndex % 2) === 0) {
      return columnIndex % 2 === 1 ? 'black-field' : 'white-field';
    } else {
      return columnIndex % 2 === 0 ? 'black-field' : 'white-field';
    }
  }
  getBoardStatus() {
    const {position} = this.props;
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
      board.push(rankFields);
    });
    return board;
  }
  render() {
    this.boardStatus = this.getBoardStatus();
    return (
      <div className='board-wrapper'>
        <div className='rank-index-container'>
          {[1,2,3,4,5,6,7,8].reverse().map(ridx=>
            <div className='rank-index' key={`ridx-${ridx}`}>{ridx}</div>)}
        </div>
        <div className='board'>
            {this.boardStatus.map((rank, ridx)=>
              <div className='rank' key={`rank-${ridx}`}>
              {rank.map((cell, cidx)=>
                <div
                  key={`field-${ridx}-${cidx}`}
                  className={this.getFieldColour(ridx,cidx)}>
                  {this.boardStatus[ridx][cidx] !== '-' &&
                    <div className='piece'>{PIECES[this.boardStatus[ridx][cidx]]}</div>}
                </div>)}
            </div>)}
        </div>
        <div className='column-index-container'>
          {['A','B','C','D','E','F','G','H'].map(cidx=>
            <div className='column-index' key={`cidx-${cidx}`}>{cidx}</div>)}
        </div>
    </div>
    );
  }
}

export default Board;
