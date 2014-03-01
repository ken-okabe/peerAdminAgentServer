/* jslint node: true */
/* global describe, it, before, beforeEach, after, afterEach */
'use strict';
var port1 = 3000; // RSA
var port2 = 3001; //emailPIN
console.log('peerAdminServer Started ' + port1 + ":" + port2);

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


//=====================================
var rand = function(n, f)
{
    var randHex = [0];
    var asyncSequence = _.range(n)
        .async(0)
        .each(function(e)
        {
            var i = new Date()
                .getMilliseconds();

            if (i % 2 === 0)
            {}
            else
            {
                randHex[randHex.length] = randHex[randHex.length - 1] + Math.pow(2, e);
            }
            if (e * 1 == (n - 1))
            {
                f(randHex[randHex.length - 1]);
            }
        });
};



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

var RSA =
    new WebSocket.Server(
    {
        port: port1
    })
    .on('connection',
        function(ws)
        {
            console.log('===RSAserver===');
            var c = new WebSocketStream(ws);
            var rpc1 = require('rpc-stream');

            c
                .pipe(
                    rpc1(
                    {
                        RSApublicKey: function(val, f)
                        {
                            console.log('RSApublicKey ' + RSApublicKey);
                            f(RSApublicKey);
                        }
                    }))
                .pipe(c)
                .on('close', function()
                {
                    ws.close();

                    console.log('-----RSA stream c close');
                })
                .on('error', function()
                {
                    ws.close();

                    console.log('-----RSA stream c error');

                })
                .on('finish', function()
                {
                    ws.close();
                    console.log('------------RSA stream finished ');

                });
        });



var emailPin =
    new WebSocket.Server(
    {
        port: port2
    })
    .on('connection',
        function(ws)
        {
            console.log('===emailPinServer===');


            var ecr;
            var dcr;

            var user = {
                key: null,
                email: null,
                region: null,
                nickname: null
            };

            var Pin;
            var fail;

            var c = new WebSocketStream(ws);
            var rpc1 = require('rpc-stream');

            c
                .pipe(
                    rpc1(
                    {
                        sendEmailPIN: function(val, f)
                        {

                            user.email = dcrpt(val.email);
                            user.key = dcrpt(val.key);
                            console.log('email ' + user.email);
                            console.log('key ' + user.key);

                            var GibberishAES = require('gibberish-aes');
                            ecr = function(obj)
                            {
                                var str = JSON.stringify(obj);
                                var strE = GibberishAES.enc(str, user.key);
                                return strE;
                            };
                            dcr = function(str)
                            {
                                return JSON.parse(GibberishAES.dec(str, user.key));
                            };


                            rand(19, function(i)
                            {
                                Pin = ('000000' + i)
                                    .slice(-6);
                                Pin = '9';
                                console.log('Pin:' + Pin);

                                var mailOptions = {
                                    from: 'peer Administration <noreply@gmail.com>', // sender address
                                    to: user.email, // list of receivers
                                    subject: 'Your PIN to Login peer', // Subject line

                                    html: 'Your PIN:<br><br>' + Pin + '<br><br>this PIN is expired once you logout peer App' // html body
                                };

                                // create reusable transport method (opens pool of SMTP connections)
                                var smtpTransport = require('nodemailer')
                                    .createTransport('SMTP',
                                    {
                                        service: 'Gmail',
                                        auth:
                                        {
                                            user: 'noreply.peer@gmail.com',
                                            pass: 'Swimming123'
                                        }
                                    })
                                    .sendMail(mailOptions,
                                        function(error, response)
                                        {
                                            var obj = {
                                                result: null,
                                                text: null
                                            };

                                            if (error)
                                            {
                                                console.log(error);

                                                obj.result = false;
                                                obj.text = 'PIN email submission failed ' + user.email;
                                                console.log(obj.text);

                                                f(ecr(obj));
                                            }
                                            else
                                            {
                                                console.log('Message sent: ' + response.message);

                                                fail = 0;
                                                console.log('ok----------------');

                                                obj.result = true;
                                                obj.text = 'Your PIN to Login peer has been emailed to ' + user.email;
                                                console.log(obj.text);
                                                f(ecr(obj));
                                            }

                                        });
                            });
                        },
                        checkPIN: function(eobj, f)
                        {
                            var obj = dcr(eobj);

                            var pin = obj.pin;
                            console.log('Pin: ' + Pin);
                            console.log('pin: ' + pin);
                            if (pin * 1 === Pin * 1)
                            {

                                dDB.rpc('dbIndexEmail',
                                    user.email,
                                    function(id)
                                    {
                                        var msg;
                                        if (!id)
                                        {
                                            msg = 'PIN confirmed. Welcome new member!' + 'asking info for ' + user.email;
                                            console.log(msg);

                                            f(ecr(
                                            {
                                                result: 99,
                                                msg: msg,
                                                user: user
                                            }));
                                        }
                                        else
                                        {
                                            msg = 'PIN confirmed. Welcome back existing member!' + '  key refreshed for ' + user.email;
                                            console.log(msg);


                                            dDB.rpc('dbUser',
                                                id,
                                                function(DBuser)
                                                {
                                                    DBuser.key = user.key;

                                                    dDB.rpc('setDbUser',
                                                        {
                                                            id: id,
                                                            user: DBuser
                                                        }, 　
                                                        function() {});

                                                    f(ecr(
                                                    {
                                                        result: 100,
                                                        msg: msg,
                                                        id: id,
                                                        user: DBuser
                                                    }));

                                                });

                                        }
                                    });

                            }
                            else
                            {
                                var msg;
                                fail++;
                                if (fail >= 5)
                                {
                                    Pin = null; //discard
                                    msg = 'PIN entry failed too many times, and this PIN is expired. Get a new PIN.';
                                    console.log(msg);
                                    f(ecr(
                                    {
                                        result: -1,
                                        msg: msg
                                    }));
                                }
                                else //try again
                                {
                                    msg = 'PIN failed Try again';
                                    console.log(msg);
                                    f(ecr(
                                    {
                                        result: 0,
                                        msg: msg
                                    }));
                                }
                            }


                        },
                        regionNick: function(eobj, f)
                        {
                            var obj = dcr(eobj);
                            var user = obj.user;

                            console.log(user);

                            console.log(user.key);
                            console.log(user.email);
                            console.log(user.region);
                            console.log(user.nickname);

                            console.log('generateNewUser for ' + user.email);

                            var tid = 0;
                            var generateID = function()
                            {
                                console.log('generatingID...');
                                rand(39, function(rID)
                                {
                                    tid++;
                                    rID = tid;

                                    console.log(rID);

                                    var tryingID = ('000000000000' + rID)
                                        .slice(-12);


                                    dDB.rpc('dbUser',
                                        tryingID,
                                        function(DBuser)
                                        {
                                            if (!DBuser)
                                            {
                                                var id = tryingID;

                                                dDB.rpc('setDbIndexEmail',
                                                    {
                                                        id: id,
                                                        email: user.email
                                                    }, 　
                                                    function() {});

                                                dDB.rpc('setDbUser',
                                                    {
                                                        id: id,
                                                        user: user
                                                    }, 　
                                                    function() {});


                                                console.log('key ' + user.key);
                                                console.log('email ' + user.email);
                                                console.log('region ' + user.region);
                                                console.log('nickname ' + user.nickname);

                                                var msg = 'new member is created!';
                                                console.log(msg);

                                                f(ecr(
                                                {
                                                    msg: msg,
                                                    id: id,
                                                    user: user
                                                }));

                                            }
                                            else
                                            {
                                                generateID();
                                            }

                                        });

                                });
                            };
                            generateID();

                        }

                    }))
                .pipe(c)
                .on('close', function()
                {
                    ws.close();
                    console.log('---EmailPin stream c close');

                })
                .on('error', function()
                {
                    ws.close();
                    console.log('---EmailPin streamc error');


                })
                .on('finish', function()
                {
                    ws.close();
                    console.log('---------EmailPin stream finished ');

                });
        });