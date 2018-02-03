import React, { Component } from 'react';
import './App.css';
import { addStock, removeStock } from './api';
const cts = require('check-ticker-symbol');
require('dotenv').load();

//todo: hide this api check on server and serve messages from server
//for now, add API key here to make this work
const apiKey = 'X9CPF2V0QM0ACD5M';

const baseUrl = "https://www.alphavantage.co/query?function=BATCH_STOCK_QUOTES&symbols=";
const endUrl = "&apikey=" + apiKey;

class Body extends Component {
    constructor(props) {
    super(props);
    this.state = {
    	input: "",
    	message: "",
    	stocks: this.props.stocks
    }
    this.handleDelete = this.handleDelete.bind(this);
    this.handleChange = this.handleChange.bind(this);
  	this.submitStock = this.submitStock.bind(this);
  }

  handleDelete(event) {
  	if (this.props.stocks.length === 1) {
  		this.setState({
  			message: "Must keep at least one stock"
  		})
  	} else {
  		const stock = event.currentTarget.dataset.id;
  		this.setState({
  			message:stock + " removed"
  		}, removeStock(stock));
  	}
  }

  handleChange(event) {
  	this.setState({
  		input: event.target.value
  	})
  }

  submitStock() {
  	const stock = this.state.input.toUpperCase();
  	fetch(baseUrl + stock + endUrl)
      .then(res => res.json())
      .then(data => {
      	if (cts.valid(stock)) {
			if (data["Stock Quotes"][0]) {
      			if (this.props.stocks.indexOf(stock) === -1) {
      				this.setState({
      					message: "Adding " + stock + " to chart...",
      					input: ""
      				}, addStock(stock));
      			} else {
      				this.setState({
      					message: "Stock already on chart",
      					input: ""
      				});
      			}
      		} else {
      			this.setState({
      				message: "Stock symbol not found",
      				input: ""
      			});
      		}
      	} else {
      		this.setState({
      			message: "Invalid stock symbol",
      			input: ""
      		});
      	}
      })
  }

  render() {
    return (
      <div className="Body">
      	<div className="add-stock">Add new stock: <input type="text" value={this.state.input} onChange={this.handleChange} placeholder="Enter symbol..."/><button className="input-submit" onClick={this.submitStock}>Submit</button></div>
      	<br/>  
      	{this.props.stocks.map ? this.props.stocks.map(stock =>
        <span key={stock} className="stock-box">{stock}<button onClick={this.handleDelete} data-id={stock} className="x-button">&#10005;</button></span>
        ) : <div></div>}
        <div className="message-display">{this.state.message}</div>
      </div>
    );
  }
}

export default Body;