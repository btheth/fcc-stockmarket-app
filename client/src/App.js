import React, { Component } from 'react';
import Graph from './Graph';
import Body from './Body';
import './App.css';
import { subscribeToStocks } from './api';

class App extends Component {
  constructor(props) {
    super(props);
    this.state ={
      stocks: []
    }
    subscribeToStocks((err, response) => {
      this.setState({ 
        stocks: response.stocks, 
        data: response.data});
    });
  }

  render() {
    return (
      <div className="App">
        <h1>Real Time Stock Chart</h1>
        <h2>Powered by socket.io and <a href="https://www.alphavantage.co/" target="_blank" rel="noopener noreferrer">alphavantage</a>*</h2>
        <h3>*API can be a little slow...give it a minute</h3>
        <Graph stocks={this.state.stocks} data={this.state.data} />
        <Body stocks={this.state.stocks} />
      </div>
    );
  }
}

export default App;