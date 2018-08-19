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
      console.log(event.currentTarget);
      event.currentTarget.style = 'background-color:#55770055;';
  }
  render() {
    const { piece, pieceStyle } = this.props;
    return (
      <div className='pieceWrapper' onMouseUp={this.clickHandler}>
        <img
          className='piece'
          src={`img/${pieceStyle}/${PIECES[piece]}`}
          alt={ALT_PIECES[piece]}/>
      </div>
    );
  }
}

export default Piece;
