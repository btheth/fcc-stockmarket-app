import openSocket from 'socket.io-client';
require('dotenv').load();
const socket = openSocket('https://fcc-stock-chart-btheth.herokuapp.com:' + process.env.PORT);

function subscribeToStocks(cb) {
	socket.on('returnStocks', stocks => {
		cb(null,stocks);
	});
	socket.emit('subscribeToStocks');
}

function addStock(stock) {
	socket.emit('stockAdded', stock);
}

function removeStock(stock) {
	socket.emit('stockRemoved', stock);
}

export { subscribeToStocks, addStock, removeStock };