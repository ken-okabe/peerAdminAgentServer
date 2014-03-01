/* jslint node: true */
/* global describe, it, before, beforeEach, after, afterEach */
'use strict';
var port = 9999;
console.log('peerAgentServer ' + port);

require('watchjs');

var _ = require('lazy.js');

var WebSocketStream = require('WebSocketStreamPlus');

var dbServerURL = 'http://localhost:11111';

var WebSocket = require('ws');
var ws = new WebSocket(dbServerURL);
var c = new WebSocketStream(ws);

var rpc = require('rpc-stream');
var dDB = rpc();

c
    .pipe(dDB)
    .pipe(c)
    .on('close', function()
    {
        ws.close();
        console.log('http://localhost:11111 c close');
        process.exit(1);
    })
    .on('error', function()
    {
        ws.close();
        console.log('http://localhost:11111 c error');
        process.exit(1);
    })
    .on('finish', function()
    {
        ws.close();
        console.log('http://localhost:11111 c finish');
        process.exit(1);
    });


var PassPhrase = 'The Moon is a Harsh Mistress. SF';
var cryptico = require('cryptico');
var RSAprivateKey = cryptico.generateRSAKey(PassPhrase, 1024);
var RSApublicKey = cryptico.publicKeyString(RSAprivateKey);

var ecrpt = function(str)
{
    return cryptico
        .encrypt(str,
            RSApublicKey)
        .cipher;
};
var dcrpt = function(str)
{
    return cryptico
        .decrypt(str,
            RSAprivateKey)
        .plaintext;
};

var GibberishAES = require('gibberish-aes');
var getEcr = function(key)
{
    var ecr = function(obj)
    {
        var str = JSON.stringify(obj);
        var strE = GibberishAES.enc(str, key);
        return strE;
    };

    return ecr;

};
var getDcr = function(key)
{
    var dcr = function(str)
    {
        return JSON.parse(GibberishAES.dec(str, key));
    };

    return dcr;

};


var connectedIDs = {};


var agentConnector =
    new WebSocket.Server(
    {
        port: port
    })
    .on('connection',
        function(ws)
        {
            var id;
            var key;

            var rpc1 = require('rpc-stream');
            var c = new WebSocketStream(ws);
            c
                .pipe(
                    rpc1(
                    {
                        connect: function(val, f)
                        {
                            console.log('agentConnector connected!!');

                            id = dcrpt(val.id);
                            key = dcrpt(val.key);
                            console.log(id);
                            console.log(key);
                            var val1 = {
                                id: id,
                                key: key
                            };
                            //11111
                            dDB.rpc('check',
                                val1,
                                function(match) // this is passed to
                                {
                                    if (match) //established, return msgF
                                    {
                                        console.log(id + ' matched key confirmed by DBholder :11111');

                                        var ecr = getEcr(key);
                                        var dcr = getDcr(key);


                                        //-------
                                        connectedIDs[id] = {
                                            signal: false,
                                            orgIDmsg: null
                                        };
                                        //------

                                        console.log(connectedIDs);
                                        var len = _(connectedIDs)
                                            .keys()
                                            .toArray()
                                            .length;

                                        console.log('connections # ' + len);


                                        f(true);

                                        //waitMsg
                                        console.log(connectedIDs[id]);
                                        connectedIDs[id].watch(
                                            'signal',
                                            function()
                                            {
                                                console.log(id + ': ' + '<==' +
                                                    connectedIDs[id].orgIDmsg.msg +
                                                    '<==' + connectedIDs[id].orgIDmsg.originID);

                                                console.log(connectedIDs[id].orgIDmsg);

                                                f(ecr(connectedIDs[id].orgIDmsg));


                                            });


                                    }
                                    else //not established , return false
                                    {
                                        f(false);
                                        //?????????????????????    d.end(); //also does on client side

                                    }
                                });

                        },
                        msgSend: function(otherIDmsgE, f)
                        {
                            console.log('msgSend');


                            var ecr = getEcr(key);
                            var dcr = getDcr(key);


                            var msg;

                            if (!connectedIDs[id])
                            {
                                msg = 'your id is not logged in';
                                console.log(msg);
                                f(ecr(msg));
                            }
                            else //make sure connected
                            {
                                var otherIDmsg = dcr(otherIDmsgE);
                                console.log(otherIDmsg);
                                var otherID = otherIDmsg.otherID;

                                console.log(id +
                                    '  sending msg to ' + otherID);
                                // check if the otherID  is online first
                                console.log(connectedIDs[otherID]);

                                if (!connectedIDs[otherID])
                                {
                                    msg = otherID + ' does not exist, so otherID is offline';
                                    console.log(msg);
                                    f(ecr(msg));

                                }
                                else
                                {
                                    console.log(id);
                                    console.log(otherIDmsg.ip);
                                    console.log(otherIDmsg.msg);
                                    connectedIDs[otherID].orgIDmsg = {
                                        originID: id,
                                        ip: otherIDmsg.ip,
                                        msg: otherIDmsg.msg
                                    };

                                    console.log(connectedIDs[otherID].orgIDmsg);
                                    connectedIDs[otherID].signal = !connectedIDs[otherID].signal;

                                    msg = id + '  sent msg to ' + otherID;

                                    console.log(msg);
                                    f(ecr(msg));

                                }
                            }
                        }
                    }))
                .pipe(c)
                .on('close', function()
                {
                    console.log(id + ' disconnected');

                    delete connectedIDs[id];

                    console.log(connectedIDs);
                    var len = _(connectedIDs)
                        .keys()
                        .toArray()
                        .length;

                    console.log('connections # ' + len);

                    ws.close();
                })
                .on('error', function()
                {
                    console.log('agentConnector  stream c error');
                    ws.close();
                })
                .on('agentConnector  stream finish', function()
                {
                    console.log('agentConnector  stream finished');
                    ws.close();
                });
        });