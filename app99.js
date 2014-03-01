/* jslint node: true */
/* global describe, it, before, beforeEach, after, afterEach */
var dgram = require('dgram');

var socket = dgram.createSocket("udp4");

socket
	.on('listening', function()
	{
		var address = socket.address();
		console.log('socket listening ' +
			address.address + ':' + address.port);


		var msg = new Buffer('hi');
		socket.send(msg, 0, msg.length, 15000, "127.0.0.1",
			function(err, bytes)
			{
				//socket.close();
			});
	})
	.on('error', function(err)
	{
		console.log('server error:\n' + err.stack);
		socket.close();
	})
	.on('message', function(msg1, rinfo)
	{
		var msg1S = '' + msg1;
		console.log(msg1S);

		var msg2S = 'yay';
		if (msg1S !== msg2S)
		{
			console.log('sending to 39000');
			var msg = new Buffer(msg2S);
			socket.send(msg, 0, msg.length, 39000, "54.241.77.9",
				function(err, bytes)
				{
					//socket.close();
				});
		}
	})
	.bind(39000);