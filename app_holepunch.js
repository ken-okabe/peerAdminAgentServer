var dgram = require('dgram');

var socket =
	dgram.createSocket('udp4');

socket
	.on('listening', function()
	{
		var address = socket.address();
		console.log('socket listening ' +
			address.address + ':' + address.port);
	})
	.on('error', function(err)
	{
		console.log('socket error:\n' + err.stack);
		socket.close();
	})
	.on('message', function(message, rinfo)
	{
		console.log('message: ' + message + ' from ' +
			rinfo.address + ':' + rinfo.port);

		var msg = new Buffer(rinfo.address + ':' + rinfo.port);
		socket
			.send(msg, 0, msg.length,
				rinfo.port, rinfo.address,
				function(err, bytes)
				{
					//socket.close();
				});
	})
	.bind(15000);