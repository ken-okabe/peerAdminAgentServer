/* jslint node: true */
/* global describe, it, before, beforeEach, after, afterEach */
'use strict';

// this server is on the same machine of app3(3000)

var port = 11110; //IDkey checker

console.log('peer dbHolderBase Server Started ' + port);

var WebSocket = require('ws');
var WebSocketStream = require('WebSocketStreamPlus');

//id : 123412341234    <-    1234-1234-1234
/*
  DB1.user[id] = {
                    key: dsfgdsgdsfg453h4h4sdfgsdf,
                    email: name@email.com,
                    region: 'japan',
                    nickname: 'ken'
                 };
  DB1.indexEmail[email] = id;
*/
var log = function(msg)
{
    var util = require('util');
    console.log(util.inspect(msg,
    {
        depth: 99,
        colors: true
    }));
};

var DB1 = {
    user:
    {},
    indexEmail:
    {}
};

var readline = require('readline');
var rl = readline.createInterface(process.stdin, process.stdout);

rl.setPrompt('DB clone http://URL:port? ');
rl.prompt();

rl.on('line', function(line)
{
    rl.close();
    var val = line.trim();
    console.log(val);
    if (val !== '')
    {
        var dbServerURL = val;

        try
        {
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
                    console.log('peer dbHolderBase Server c close');

                })
                .on('error', function()
                {
                    ws.close();
                    console.log('peer dbHolderBase Server c error');
                    process.exit(1);
                })
                .on('finish', function()
                {
                    ws.close();
                    console.log('peer dbHolderBase Server c finish');

                });

            dDB.rpc('getDB',
                true,
                function(db)
                {
                    log(db);
                    DB1 = db;

                    log('Started with cloned DB');
                    main();
                });

        }
        catch (e)
        {
            process.exit(1);
        }
    }
    else
    {
        log('Started with clean DB');
        main();
    }

});

var main = function()
{

    log(Object
        .keys(DB1.user)
        .length);
    //================================= 
    var dbHolderBase =
        new WebSocket
        .Server(
        {
            port: port
        })
        .on('connection',
            function(ws)
            {
                console.log('====dbHolderBase====');
                var c = new WebSocketStream(ws);
                var rpc = require('rpc-stream');

                c
                    .pipe(
                        rpc(
                        {
                            setDbUser: function(obj, f)
                            {
                                DB1.user[obj.id] = obj.user;
                            },
                            setDbIndexEmail: function(obj, f)
                            {
                                DB1.indexEmail[obj.email] = obj.id;
                            },
                            getDB: function(val, f)
                            {
                                f(DB1);
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
                        console.log('DBHolderBase  stream finished');

                    });
            });
    //=================================
};