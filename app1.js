/* jslint node: true */
/* global describe, it, before, beforeEach, after, afterEach */
'use strict';

// this server(app1) is on the same machine of app3(3000)

var port = 11111; //IDkey checker

//BaseDB server(app0) URL
var dbServerURL = 'http://localhost:11110';

var log = function(msg)
{
    var util = require('util');
    console.log(util.inspect(msg,
    {
        depth: 99,
        colors: true
    }));
};

log('peerDBHolderServer Started ' + port);

var _ = require('lazy.js');

var WebSocket = require('ws');
var WebSocketStream = require('WebSocketStreamPlus');

//id : 123412341234    <-    1234-1234-1234
/*
  DB1.user[id] = {
                            key: dsfgdsgdsfg453h4h4sdfgsdf,
                            email: name@email.com,
                            egion: 'japan',
                            nickname: 'ken'
                         };
  DB1.indexEmail[email] = id;
*/

var DB1;

var rpc = require('rpc-stream');

var ws;
var c;

var dDB;

var connectDBbase = function()
{
    var reConnect = function()
    {
        log('reconnecting to baseDB after 1000ms');
        setTimeout(connectDBbase, 1000);
    };

    ws = new WebSocket(dbServerURL);
    c = new WebSocketStream(ws);

    dDB = rpc();
    c
        .pipe(dDB)
        .pipe(c)
        .on('close', function()
        {
            ws.close();
            console.log('peer dbHolder Server c close');
            reConnect();
        })
        .on('error', function()
        {
            ws.close();
            console.log('peer dbHolder Server c error');
            reConnect();
        })
        .on('finish', function()
        {
            ws.close();
            console.log('peer dbHolder Server c finish');
            reConnect();
        });

    return true;

};


if (connectDBbase())
{
    dDB.rpc('getDB',
        true,
        function(db)
        {
            log(db);
            DB1 = db;

            log('Started with the base DB');

            var main = function()
            {
                log(Object
                    .keys(DB1.user)
                    .length);

                var dbHolder =
                    new WebSocket.Server(
                    {
                        port: port
                    })
                    .on('connection',
                        function(ws)
                        {
                            console.log('====dbHolder====');
                            var c = new WebSocketStream(ws);
                            var rpc = require('rpc-stream');

                            c
                                .pipe(
                                    rpc(
                                    {
                                        getDB: function(val, f)
                                        {
                                            f(DB1);
                                        },
                                        dbUser: function(id, f)
                                        {
                                            f(DB1.user[id]);
                                        },
                                        dbIndexEmail: function(email, f)
                                        {
                                            f(DB1.indexEmail[email]);
                                        },
                                        setDbUser: function(obj, f)
                                        {
                                            DB1.user[obj.id] = obj.user;

                                            dDB.rpc('setDbUser',
                                                obj,
                                                function() {

                                                });
                                        },
                                        setDbIndexEmail: function(obj, f)
                                        {
                                            DB1.indexEmail[obj.email] = obj.id;

                                            dDB.rpc('setDbIndexEmail',
                                                obj,
                                                function() {

                                                });

                                        },
                                        check: function(val, f)
                                        {
                                            if (!DB1.user[val.id])
                                            {
                                                f(false);
                                            }
                                            else if (DB1.user[val.id].key === val.key)
                                            {
                                                f(true);
                                            }
                                            else
                                            {
                                                f(false);
                                            }
                                        }
                                    }))
                                .pipe(c)
                                .on('close', function()
                                {
                                    ws.close();
                                    console.log('c close');

                                })
                                .on('error', function()
                                {
                                    ws.close();
                                    console.log('c error');


                                })
                                .on('finish', function()
                                {
                                    ws.close();
                                    console.log('DBHolder  stream finished');

                                });
                        });
            };

            main();
        });
}
else
{
    log('something wrong');
    process.exit(1);
}