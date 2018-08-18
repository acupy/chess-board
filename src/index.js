import React from 'react';
import ReactDOM from 'react-dom';
import Board from './Board';

const startingPosition = 'r1bqkbnr/pppp1ppp/8/1B2p3/3nP3/5N2/PPPP1PPP/RNBQK2R'
ReactDOM.render(
  <Board position={startingPosition} />,
  document.getElementById('root')
);
