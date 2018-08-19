import React, { Component } from 'react';
import './style.css';

import { validateFEN } from './utils';
import Board from './Board';

class App extends Component {
  constructor(props) {
    super(props);

    this.onFENChanged = this.onFENChanged.bind(this);
    this.onStyleChanged = this.onStyleChanged.bind(this);

    // Forsyth–Edwards Notation
    const startPosition = 'r1bqkbnr/pppp1ppp/8/1B2p3/3nP3/5N2/PPPP1PPP/RNBQK2R';
    this.state = {
      textInput: startPosition,
      position: startPosition,
      pieceStyle: 'alpha',
    };
  }

  onFENChanged(event) {
      this.setState({textInput: event.target.value});
      if (validateFEN(event.target.value)){
        this.setState({position: event.target.value});
      }
  }

  onStyleChanged(event) {
    this.setState({pieceStyle: event.target.value});
  }

  render() {
    return <div>
      <header>
        <h1>chess analyzer</h1>
        <select onChange={this.onStyleChanged}>
          <option value='alpha'>Alpha</option>
          <option value='cheq'>Cheq</option>
          <option value='leipzig'>Leipzig</option>
        </select>
      </header>
      <div className='content-container'>
        <input type='text' value={this.state.textInput} onChange={this.onFENChanged} />
        <Board position={this.state.position} pieceStyle={this.state.pieceStyle} />
      </div>
      <footer>2018</footer>
    </div>
  }
}

export default App;
