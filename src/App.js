import React, { Component } from 'react';
import './style.css';

import { validateFEN } from './utils';
import Board from './Board';

class App extends Component {
  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);

    // Forsyth–Edwards Notation
    const startPosition = 'r1bqkbnr/pppp1ppp/8/1B2p3/3nP3/5N2/PPPP1PPP/RNBQK2R';
    this.state = {
      textInput: startPosition,
      position: startPosition,
    };
  }

  handleChange(event) {
      this.setState({textInput: event.target.value});
      if (validateFEN(event.target.value)){
        this.setState({position: event.target.value});
      }
  }

  render() {
    return <div>
      <header>
        <h1>chess analyzer</h1>
      </header>
      <div className='content-container'>
        <input type='text' value={this.state.textInput} onChange={this.handleChange} />
        <Board position={this.state.position} />
      </div>
      <footer>2018</footer>
    </div>
  }
}

export default App;
