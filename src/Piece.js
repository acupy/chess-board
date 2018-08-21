import React, { Component } from 'react';
import './style.css';
import { ALT_PIECES, PIECES } from './consts';

class Piece extends Component {
  constructor(props){
    super(props);
    this.clickHandler = this.clickHandler.bind(this);
  }
  clickHandler(event) {
      event.stopPropagation();
      const { selectPiece } = this.props;
      selectPiece();

  }
  render() {
    const { piece, pieceStyle, isSelected } = this.props;
    return (
      <div
        className={isSelected ? 'selected-piece-wrapper':'piece-wrapper'}
        onMouseUp={this.clickHandler}>
        <img
          className='piece'
          src={`img/${pieceStyle}/${PIECES[piece]}`}
          alt={ALT_PIECES[piece]}/>
      </div>
    );
  }
}

export default Piece;
