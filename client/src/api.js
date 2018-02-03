import openSocket from 'socket.io-client';
require('dotenv').load();
const socket = openSocket();

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