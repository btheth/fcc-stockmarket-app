var debug = require('debug')('stock-market-chart:server');
var http = require('http');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var io = require('socket.io')(http);
let fetch = require('node-fetch');
require('dotenv').load();

//a bunch of API constants
const apiKey = process.env.APIKEY;

const OPENKEY = "1. open";
const HIGHKEY = "2. high";
const LOWKEY = "3. low";
const CLOSEKEY = "4. close";
const VOLUMEKEY = "5. volume";

const FIVEMINS = "5min"
const INTRADAY = "TIME_SERIES_INTRADAY";

const baseUrl = "https://www.alphavantage.co/query?function=";
const intervalUrl = "&interval="
const midUrl = "&symbol="
const endUrl = "&apikey=" + apiKey;

//add stock then end url to use
const baseIntraDayUrl = baseUrl + INTRADAY + intervalUrl + FIVEMINS + midUrl;

//stocks and data will be sent to client to render
var stocks = [];
var data = [];

//queue is what is waiting to be run - initialized to a couple of random stocks
let queue = ['SEDG','KRO'];
//running is what is currently being fetched from the API
let running = [];
//failed is where stocks that failed their promises go
let failed = [];

//booleans to track if queue is currently draining or stock data is currently resetting
let draining = false;
let resetting = false;

//min time between re-pulling data for stocks already on chart
var latest = new Date().getTime();
const rePullMs = 300000;

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

//this api is not very reliable and it's sort of slow, but I couldn't find a better free one so I set this up in a sort of queue structure
//this is the function that gets data from the API, returning a promise to be used when complete - returns array of objects with stock data
function getData(stock) {
  return new Promise((resolve, reject) => {
  	const apiUrl = baseIntraDayUrl + stock + endUrl;
  	//console.log(apiUrl);
    fetch(apiUrl)
      .then(res => {return res.json();})
      .then(data => 
        {
        	let newData = [];
        	if (data["Time Series (5min)"]) {
        		//console.log('good data recieved')
        		newData = Object.keys(data["Time Series (5min)"]).map(key => 
            		({
	            	    name: stock,
	                	date: key.split(' ')[0],
	               		time: key.split(' ')[1],
	                	epoch: new Date(key).valueOf(),
	                	openPrice: Number(data["Time Series (5min)"][key][OPENKEY]),
	                	closePrice: Number(data["Time Series (5min)"][key][CLOSEKEY]),
	                	highPrice: Number(data["Time Series (5min)"][key][HIGHKEY]),
	                	lowPrice: Number(data["Time Series (5min)"][key][LOWKEY]),
	                	volume: Number(data["Time Series (5min)"][key][VOLUMEKEY])
              		})
              	)
              	resolve(newData);
        	} 
        }
      )
      .catch(err => {
      	//on failure for whatever reason (not uncommon) push stock to failure queue
    	//console.log('promise failed');
    	failed.push(stock);
    	console.log(failed);
      })
    })
}


//process.on('unhandledRejection', (reason) => {
//   console.log('Unhandled Rejection: ' + reason);
//});

//websocket handling
io.on('connection', function(socket){
  //console.log('a user connected');
  //console.log(stocks);
  //console.log(queue);
  //console.log(running);

  	//check every second to see if we need to perform an action
	setInterval(function(){ 
		const time = new Date().getTime();

		//see if we need to reset current stocks
		if(!draining && !resetting && (time >= latest + rePullMs)) {
			//console.log('resetting');
			resetting = true;
			latest = time;

			let promises = []

			//get promise for each stock currently in stock array
      		for (let i = 0; i < stocks.length; i++) {
       			promises.push(getData(stocks[i]));
      		}

			//once promises complete, handle return values
			Promise.all(promises).then((results) => {
				const collapse = [];

				//collapse arrays in to structure required by client
        		for (let i = 0; i < results.length; i++) {
          			for (let j = 0; j < results[i].length; j++) {
           				collapse.push(results[i][j]);
         			}
       			}
	       		
	       		//set data array to collapse array
	       		data = collapse;

	       		//if any promises failed, there will be stocks in the failure queue - splice them all out of the stocks array and put them back into the queue to retry
				if (failed.length > 0) {
					for (let i = 0; i < failed.length; i++) {
						const index = stocks.indexOf(failed[i]);
  						stocks.splice(index,1);
  						queue.push(failed[i]);
					}
					//set failed array back to empty
					failed = [];
				}

				//resetting complete
				resetting  = false;

				//emit updated stocks and data to all clients
				socket.emit('returnStocks', {stocks:stocks, data:data});
	       		socket.broadcast.emit('returnStocks', {stocks:stocks, data:data});
			});
		}

		//check for stocks in queue - if there are some and we aren't currently draining queue or resetting stocks, drain queue
		if (!draining && !resetting && queue.length > 0) {
			//set draining to true and put queue into running, then empty queue
			draining = true;
			running = queue;
			queue = [];
			
			let promises = []

			//get promise for all queued up stocks
      		for (let i = 0; i < running.length; i++) {
       			promises.push(getData(running[i]));
      		}
			
			//handle promises all finishing
			Promise.all(promises).then((results) => {
				const collapse = [];

				//collapse arrays in to structure necessary for client
        		for (let i = 0; i < results.length; i++) {
          			for (let j = 0; j < results[i].length; j++) {
           				collapse.push(results[i][j]);
         			}
       			}
	       		
	       		//concatenate new data on to existing data, add finished stocks to stocks array, empty out running array
	       		data = data.concat(collapse);
	       		stocks = stocks.concat(running);
	       		running = [];
				//console.log(stocks);
				//console.log(queue);
				//console.log(running);

				//handle any failed promises by taking them out of the stock array and putting them back in to the queue
				if (failed.length > 0) {
					for (let i = 0; i < failed.length; i++) {
						const index = stocks.indexOf(failed[i]);
  						stocks.splice(index,1);
  						queue.push(failed[i]);
					}
					//empty failure array
					failed = [];
				}

				//draining has finished
				draining  = false;

				//send stocks and data to all clients
				socket.emit('returnStocks', {stocks:stocks, data:data});
	       		socket.broadcast.emit('returnStocks', {stocks:stocks, data:data});
			});
		}
	}, 1000); 

	//when new client connects, send it the current array of stocks and the current dataset
	socket.on('subscribeToStocks', () => {
    	//console.log('client requesting stocks');
   		socket.emit('returnStocks', {stocks:stocks, data:data});
  	});

	//handle client trying to add a new stock
  	socket.on('stockAdded', (stock) => {
  		//console.log('client attemptimg to add stock ' + stock);
  		//check if the stock is in any of our arrays - if not then put it in the queue
  		if (stocks.indexOf(stock) == -1 && queue.indexOf(stock) == -1 && running.indexOf(stock) == -1) {
  			//console.log("stock added");
  			 queue.push(stock);
  		} else {
  			//otherwise do nothing
  			//console.log("stock already in stocks, queue, or running")
  		}
  	});

  	//handle client removing stock
  	socket.on('stockRemoved', (stock) => {
  		//console.log('client removed stock ' + stock);

  		//splice stock out of stock array
  		const index = stocks.indexOf(stock);
  		stocks.splice(index,1);

  		//remove all instances of stock from dataset
    	for (let i = 0; i < data.length; i++) {
   			if (stocks.indexOf(data[i].name) === -1) {
    			data.splice(i,1);
   				i--;
    		}
   		}

   		//emit updated stocks array and dataset to clients
    	socket.emit('returnStocks', {stocks:stocks, data:data});
  		socket.broadcast.emit('returnStocks', {stocks:stocks, data:data});
  	})

});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/client/build/index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



server.listen(port);
//io.listen(server);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

module.exports = app;
