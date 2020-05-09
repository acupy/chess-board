import React, { Component } from 'react';
import './styles/style.css';
import { ALT_PIECES, PIECES } from './consts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChessPawn, 
  faChessRook, 
  faChessBishop, 
  faChessKnight, 
  faChessQueen, 
  faChessKing 
} from '@fortawesome/free-solid-svg-icons';

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

    let pieceIcon;
    if (pieceStyle === 'fontAwesome') {
      if (piece.toUpperCase() === 'P') {
        pieceIcon = faChessPawn;
      } else if (piece.toUpperCase() === 'R') {
        pieceIcon = faChessRook;
      } else if (piece.toUpperCase() === 'B') {
        pieceIcon = faChessBishop;
      } else if (piece.toUpperCase() === 'N') {
        pieceIcon = faChessKnight;
      } else if (piece.toUpperCase() === 'Q') {
        pieceIcon = faChessQueen;
      } else if (piece.toUpperCase() === 'K') {
        pieceIcon = faChessKing;
      }
    }

    console.log(pieceStyle);

    return (
      <div
        className={isSelected ? 'selected-piece-wrapper':'piece-wrapper'}
        onMouseUp={this.clickHandler}>
        {pieceStyle !== 'fontAwesome' && <img
          className='piece'
          src={`img/${pieceStyle}/${PIECES[piece]}`}
          alt={ALT_PIECES[piece]}/>}
        {pieceStyle === 'fontAwesome' && 
          <FontAwesomeIcon 
            icon={pieceIcon}
            className='font-awesome-icon'
            style={{
              color: piece.toUpperCase() === piece ? '#bfb3a2' : '#444a54', 
            }}   
          />}
      </div>
    );
  }
}

export default Piece;
