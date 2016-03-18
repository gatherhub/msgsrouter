var proto = require('./proto');
var peers = [];

var md5 = require('crypto-js/md5');

var config = require('./config');
var https = require('https');
var wssvr = require('websocket').server;
var httpd = https.createServer(config.options, null);

httpd.listen(config.port, function () {
    console.log(now() + ' (Start) WebSocket server listening on port: ' + config.port);
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

// add geolocation information
var geocoder = require('geocoder');
function location(lat, lon, peer) {
    peer.location.addr = 'unknown';
    peer.location.city = 'unknown';
    peer.location.country = 'unknown';

    if (!isNaN(lat) && !isNaN(lon)) {
        geocoder.reverseGeocode(lat, lon, function(err, data) {
            if (data && data.results && data.results.length) {
                var addr = data.results[0].address_components;
                var city = addr.find(function(e) { return e.types[0] == 'administrative_area_level_1'; });
                var country = addr.find(function(e) { return e.types[0] == 'country'; });

                peer.location.addr = data.results[0].formatted_address || 'unknown';
                peer.location.city = city ? city.long_name : 'unknown';
                peer.location.country =  country ? country.long_name : 'unknown';
            }
        });
    }
}

function now() {
    return (new Date().toString().split(' ').slice(1, 5).join(' '));
}

function validate(peer) {
    if (peer.credential.length && peer.hub.length && peer.name.length && peer.secret.length && peer.connection) {
        if (peer.credential == md5(JSON.stringify({hub: peer.hub, name: peer.name, email: peer.contact.email, secret: peer.secret})).toString()) {
            return true;
        }
    }
    console.log(now() + ' (Reject) Peer Authentication failed: ' + peer.name + '/' + peer.email);
    return false;
}

function dispatch(msg, conn) {
    if (msg instanceof proto.message) {
        if (typeof msg.to == 'string') {
            msg.to = [msg.to];
        }

        if (msg.to instanceof Array && msg.to.length) {
            msg.to.forEach(function(credential) {
                var p = peers.find(function(peer) { return peer.credential == credential; });
                if (p) {
                    if (!p.publish) {
                        msg.contact = '';
                    }
                    p.connection.sendUTF(msg.toString());
                }
            });
        }
        else {
            peers.forEach(function(peer) {
                // send to hub by message field
                // if (p.hub == data.hub && p.connection != connection) {
                // send to hub by peer's belonging
                if (peer.hub == msg.hub && peer.connection != conn) {
                    if (!peer.publish) {
                        msg.contact = '';
                    }
                    peer.connection.sendUTF(msg.toString());
                }
            });
        }
    }
}
 
function originIsAllowed(origin) {
    return true;
    // put logic here to detect whether the specified origin is allowed. 
    if (origin == config.url){ return true; }
    return false;
}

// handle websocket request
ws.on('request', function(request) {
    // Origination checking
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin 
      request.reject();
      console.log(now() + ' (Reject) Source URL: ' + request.origin);
      return;
    }
    
    // var connection = request.accept('echo-protocol', request.origin);
    var connection = request.accept(null, request.origin);
    var overdue = 0;

    // if a connection is not validately added to peers within 1440ms, close the connection.
    var task = setInterval(function() {
        var peer = peers.find(function(peer) { return peer.connection == connection; });
        if (peer) {
            clearInterval(task);
            return;
        }

        overdue++;
        if (overdue > 2) {
            clearInterval(task);
            console.log(now() + ' (Timeout) Peer: ' + connection.remoteAddress);
            connection.close();
        }
    }, 480);
});

// handle websocket connection
ws.on('connect', function(connection) {
    connection.on('message', function(msg) {
        if (msg.type === 'utf8') {
            var peer = peers.find(function(peer) { return peer.connection == connection; });
            var message;

            // filter incorrect message, only accept message data in JSON
            try {
                message = new proto.message(JSON.parse(msg.utf8Data));
            }
            catch (e) {
                return;
            }

            switch (message.subject) {
                case 'hi':
                    if (!peer) {
                        peer = new proto.peer(message.content);
                        coords = message.content.location;
                        location(coords.latitude, coords.longitude, peer);
                        peer.connection = connection;

                        if (validate(peer)) {
                            peers.push(peer);
                            console.log(now() + ' (Join) Peer: ' + peer.name + ' (' + peers.length + ')');
                            message.content = {name: message.content.name};
                            dispatch(message, connection);

                            var reply = new proto.message(peer);
                            reply.subject = 'ho';
                            reply.content = {orgTS: message.timestamp};
                            reply.to = peer.credential;
                            dispatch(reply, connection);
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
                        peers.splice(peers.indexOf(peer), 1);
                        console.log(now() + ' (Left) Peer: ' + peer.name + ' (' + peers.length + ')');
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

ws.on('close', function(connection, reason, description) {
    var peer = peers.find(function(peer) { return peer.connection == connection; });
    if (peer) {
        var msg = new proto.message(peer);
        msg.subject = 'bye';
        dispatch(msg);
        console.log(now() + ' (Disconnect) Peer: ' + peer.name + ' (' + peers.length + ')');
        peers.splice(peers.indexOf(peer), 1);
    }
});