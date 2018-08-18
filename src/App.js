import React, { Component } from 'react';
import './style.css'

import Board from './Board';

// Forsyth–Edwards Notation
const startingPosition = 'r1bqkbnr/pppp1ppp/8/1B2p3/3nP3/5N2/PPPP1PPP/RNBQK2R';

class App extends Component {
  render() {
    return <div>
      <header>
        <h1>chess analyzer</h1>
      </header>
      <div className='content-container'>
        <Board position={startingPosition} />
      </div>
      <footer>2018</footer>
    </div>
  }
}

export default App;
