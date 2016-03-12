#!/usr/bin/env node
var config = require('./config');
var store = require('itemstore');
var https = require('https');
var wssvr = require('websocket').server;
var gip = require('geoip-native');
var peers = new store();

var httpd = https.createServer(config.options, function(request, response) {
    console.log(new Date().toString().split(' ').slice(1, 6).join(' ') + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

httpd.listen(config.port, function () {
    console.log('Https server listening on port: ' + config.port);
});

 
var ws = new wssvr({
    httpServer: httpd,
    // You should not use autoAcceptConnections for production 
    // applications, as it defeats all standard cross-origin protection 
    // facilities built into the protocol and the browssvrer.  You should 
    // *always* verify the connection's origin and decide whether or not 
    // to accept it. 
    autoAcceptConnections: false
});
 
function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed. 
    if (origin == config.url){ return true; }
    return false;
}

ws.on('request', function(request) {
    // Origination checking
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin 
      request.reject();
      console.log(new Date().toString().split(' ').slice(1, 6).join(' ') + ' Connection from ' + request.origin + ' rejected.');
      return;
    }
    
    // var connection = request.accept('echo-protocol', request.origin);
    var connection = request.accept(null, request.origin);
    var overdue = 0;
    var task = setInterval(function() {
        if (peers.getProp(connection)) {
            clearInterval(task);
            return;
        }

        overdue++;
        if (overdue > 2) {
            clearInterval(task);
            connection.close();
        }
    }, 4000);
    console.log(new Date().toString().split(' ').slice(1, 6).join(' ') + ' Connection from ' + country(connection.remoteAddress) + ' accepted.');

    connection.on('message', function(msg) {
        if (msg.type === 'utf8') {
            var content;

            try {
                content = JSON.parse(msg.utf8Data);
            }
            catch (e) {
                return;
            }

            switch (content.type) {
                case 'hi':
                    if (!peers.getProp(connection)) {
                        peers.append(connection, content.data);
                        console.log('Peers = ', peers.size);
                    }
                    break;
                case 'bye':
                    if (peers.remove(connection)) {
                        console.log('Peer left ');
                        console.log('Peers = ', peers.size);
                        connection.close();
                    }
                    break;
            }
            // console.log('Received msg: ' + msg.utf8Data);
            // connection.sendUTF(msg.utf8Data);
        }
        // else if (msg.type === 'binary') {
        //     console.log('Received Binary msg of ' + msg.binaryData.length + ' bytes');
        //     connection.sendBytes(msg.binaryData);
        // }
    });

    connection.on('close', function(reasonCode, description) {
        if (peers.getProp(connection)) {
            console.log(new Date().toString().split(' ').slice(1, 6).join(' ') + ' Peer ' + connection.remoteAddress + ' disconnected.');
            peers.remove(connection);
            console.log('Peers = ', peers.size);
        }
    });
});

function country(ip) {
    return gip.lookup(ip).name ? gip.lookup(ip).name : '(' + ip + ')';
}