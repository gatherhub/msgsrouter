var mongoc = require('mongodb').MongoClient;    // MongoDB Client
var oid = require('mongodb').ObjectID;          // MongoDB ObjectID converter
var config = require('./config');               // MSR configurations
var Base = require('./base');                   // base data structures

var Peer = Base.Peer;
var Message = Base.Message;

var conns = [];                                 // Array to store WebSocket connections
var db = null;                                  // MongoDB database object
var hubs = null;                                // HUBS collection
var peers = null;                               // PEERS collection

mongoc.connect(config.dbsrc, function(err, database) {
    if (err) {
        console.trace(err);
    }
    else {
        db = database;
        hubs = db.collection('hubs');       // Open/Create HUBS collection
        peers = db.collection('peers');     // Open/Create PEERS collection
        console.log('(Start) Database connected.');
    }
});

var md5 = require('crypto-js/md5');         // MD5 hash method
var wssvr = require('websocket').server;    // WebSocket Server
var httpd = null;                           // HTTP server

if (config.secure) {
    var https = require('https');
    httpd = https.createServer(config.options, null);
    console.log('(Start) Create HTTPS server.');
}
else {
    var http = require('http');
    httpd = http.createServer();
    console.log('(Start) Create HTTP server.');
}

httpd.listen(config.port, function () {
    console.log('(Start) WebSocket listening on: ' + config.uri);
    console.log('(Start) Accept request from: ' + config.src);
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

var geocoder = require('geocoder');     // GeoCoder decodes location infomration from latitude and longitude through Google service
// GeoCoder performs asynchronous query, result will be provided to callback function when results comes back
function location(lat, lon, cb) {
    var location = {};
    location.addr = 'unknown';
    location.city = 'unknown';
    location.country = 'unknown';

    if (!isNaN(lat) && !isNaN(lon)) {
        geocoder.reverseGeocode(lat, lon, function(err, data) {
            if (data && data.results && data.results.length) {
                location.addr = data.results[0].address_components;
                location.city = addr.find(function(e) { return e.types[0] == 'administrative_area_level_1'; });
                location.country = addr.find(function(e) { return e.types[0] == 'country'; });

                cb(location);
            }
        });
    }
}

// Message dispatcher
function dispatch(msg, connection) {
    // Avoid fraud source message
    if (connection.credential != msg.from) return;

    if (msg instanceof Message && msg.to.length) {
        peers.find({credential: {$in: msg.to}}, function(err, cursor) {
            if (cursor) {
                cursor.each(function(err, doc) {
                    if (doc) {
                        var conn = conns.find(function(conn) { return conn.id == doc.connection; });
                        if (conn) {
                            conn.sendUTF(msg.toString());
                        }
                    }
                });
            }
            else {
                console.trace(err);
            }
        });
    }
}
 
function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed. 
    if (origin == config.src || config.src == 'ANY'){ return true; }
    return false;
}

// handle websocket request
ws.on('request', function(request) {
    // Origination checking
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin 
      request.reject();
      console.log('(Reject) Request from unexpected URL: ' + request.origin);
      return;
    }
    
    // var connection = request.accept('echo-protocol', request.origin);
    var connection = request.accept(null, request.origin);
    var overdue = 0;

    // if a connection is not validately added to peers within 1440ms, close the connection.
    var task = setInterval(function() {
        if (conns.indexOf(connection) > -1) {
            clearInterval(task);
            return;
        }

        overdue++;
        if (overdue > 2) {
            clearInterval(task);
            console.log('(Timeout) Peer: ' + connection.remoteAddress);
            connection.close();
        }
    }, 1440);
});

// handle websocket connection
ws.on('connect', function(connection) {
    connection.on('message', function(msg) {
        var recvTime = Date.now();
        if (db && hubs && peers && msg.type === 'utf8') {
            if (!Base.validateMessage(JSON.parse(msg.utf8Data))) return;

            var conn = conns.find(function(conn) { return conn == connection; });
            var message;

            // filter incorrect message, only accept message data in JSON
            try {
                message = new Message(JSON.parse(msg.utf8Data));
            }
            catch (e) {
                return;
            }

            switch (message.subject) {
                case 'register':
                    if (!conn) {
                        if (Base.validateCredential(message.content)) {
                            var orgTime = message.timestamp;
                            peer = new Peer(message.content);
                            peer.setSecret(message.content.secret);
                            if (!peer.name.length || !peer.email.length || !peer.secret.length) return;
                            peer.connection = connection.id = md5(JSON.stringify(connection.socket._peername)).toString();
                            connection.credential = peer.credential;
                            conns.push(connection);
                            peers.insert(peer.value());

                            var coords = peer.location.coords;
                            if (coords) {
                                location(coords.latitude, coords.longitude, function(loc) {
                                    peer.location = loc;
                                    peers.update({credential: peer.credential, connection: peer.connection}, peer);
                                });
                            }

                            peers.find({credential: peer.credential, connection: peer.connection}, function(err, cursor) {
                                if (cursor) {
                                    cursor.count().then(function(count) {
                                        if (count == 1) {
                                            console.log('(Join) Peer: ' + peer.name + ' / ' + peer.email + ' (' + conns.length + ')');

                                            var reply = new Message(peer);
                                            reply.subject = 'register';
                                            reply.timestamp = recvTime;
                                            reply.content = {status: 1, originTime: orgTime};
                                            reply.from = reply.to = peer.credential;
                                            dispatch(reply, connection);
                                        }
                                    });
                                }
                                else {
                                    console.trace(e);
                                }
                            });
                        }
                        else {
                            connection.close();
                        }
                    }
                    else {
                        // connection exists
                    }
                    break;
                case 'bye':
                    if (peer) {
                        connection.close();
                    }
                    break;
                default:
                    dispatch(message, connection);
                    break;
            }

        }
        // else if (msg.type === 'binary') {
        //     console.log('Received Binary msg of ' + msg.binaryData.length + ' bytes');
        //     connection.sendBytes(msg.binaryData);
        // }
    });
});

ws.on('close', function(connection) {
    peers.find({credential: connection.credential, connection: connection.id}, function(err, cursor) {
        if (cursor) {
            cursor.each(function(err, doc) {
                if (doc) console.log('(Disconnect) Peer: ' + doc.name + ' / ' + doc.email + ' (' + conns.length + ')');
            });
        }
    });
    peers.deleteMany({credential: connection.credential, connection: connection.id});
    var id = conns.indexOf(connection);
    if (id > -1) conns.splice(id, 1);
});
