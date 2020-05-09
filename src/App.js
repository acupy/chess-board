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
    this.onChessRuleEnforcementChanged = this.onChessRuleEnforcementChanged.bind(this);
    this.onToggleConfig = this.onToggleConfig.bind(this);

    // Forsyth–Edwards Notation
    const startPosition = 'r1bqkbnr/pppp1ppp/8/1B2p3/3nP3/5N2/PPPP1PPP/RNBQK2R';
    this.state = {
      textInput: startPosition,
      position: startPosition,
      pieceStyle: 'alpha',
      chessRulesEnforced: true,
      showConfig: false,
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

  onChessRuleEnforcementChanged(event) {
    this.setState({chessRulesEnforced: event.target.checked});
  }

  onToggleConfig(event) {
    this.setState({showConfig:!this.state.showConfig});
  }

  render() {
    return <div>
      <header>
        <h1>chess analyzer</h1>
        <div className='select-container'>
          <select onChange={this.onThemeChanged}>
            <option value='gray'>gray</option>
            <option value='purple'>purple</option>
          </select>
        </div>
        <div className='config-button' onClick={this.onToggleConfig}>⚙️</div>
      </header>
      <div className='content-container'>
        <Board
          position={this.state.position}
          pieceStyle={this.state.pieceStyle}
          chessRulesEnforced={this.state.chessRulesEnforced}
          onBoardUpdated={this.updateFEN} />
        {this.state.showConfig &&
        <div className='config-panel'>
          <div className='config-panel-header'>
            <div>Config</div>
            <div className='close-btn' onClick={this.onToggleConfig}>✖️</div>
          </div>
          <div className='config-panel-body'>
            <label>FEN 
              <input type='text' value={this.state.textInput} onChange={this.onFENChanged} />
            </label>
            <label>Board style
              <select onChange={this.onStyleChanged}>
                <option value='alpha'>alpha</option>
                <option value='cheq'>cheq</option>
                <option value='leipzig'>leipzig</option>
              </select>
            </label>
            <label style={{flexFlow: 'row'}}>Enforce chess rules: 
              <input 
                type='checkbox' 
                defaultChecked={this.state.chessRulesEnforced} 
                onChange={this.onChessRuleEnforcementChanged}/>
            </label>
          </div>
        </div>}
      </div>
      <footer>2018</footer>
    </div>
  }
}

export default App;
