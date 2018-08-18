import React, { Component } from 'react';
import './style.css';
import { ALT_PIECES, PIECES } from './consts';

class Piece extends Component {
  render() {
    const { piece, pieceStyle } = this.props;
    return (
      <div className='pieceWrapper'>
        <img
          className='piece'
          src={`img/${pieceStyle}/${PIECES[piece]}`}
          alt={ALT_PIECES[piece]}/>
      </div>
    );
  }
}

export default Piece;
