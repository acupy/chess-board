import React, { Component } from 'react';
import './styles/style.css';

import { validateFEN } from './utils';
import Board from './Board';

class App extends Component {
  constructor(props) {
    super(props);

    this.onFENChanged = this.onFENChanged.bind(this);
    this.updateFEN = this.updateFEN.bind(this);
    this.onStyleChanged = this.onStyleChanged.bind(this);
    this.onThemeChanged = this.onThemeChanged.bind(this);

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

  updateFEN(fen) {
    this.setState({textInput: fen});
  }

  onStyleChanged(event) {
    this.setState({pieceStyle: event.target.value});
  }

  onThemeChanged(event) {
    let root = document.querySelector(':root');
    root.className = event.target.value;
  }

  render() {
    return <div>
      <header>
        <h1>chess analyzer</h1>
        <select onChange={this.onStyleChanged}>
          <option value='alpha'>alpha</option>
          <option value='cheq'>cheq</option>
          <option value='leipzig'>leipzig</option>
        </select>
        <select onChange={this.onThemeChanged}>
          <option value='purple'>purple</option>
          <option value='gray'>gray</option>
        </select>
      </header>
      <div className='content-container'>
        <input type='text' value={this.state.textInput} onChange={this.onFENChanged} />
        <Board
          position={this.state.position}
          pieceStyle={this.state.pieceStyle}
          onUpdateBoard={this.updateFEN} />
      </div>
      <footer>2018</footer>
    </div>
  }
}

export default App;
