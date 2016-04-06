var mongoc = require('mongodb').MongoClient;    // MongoDB Client
var oid = require('mongodb').ObjectId;          // MongoDB ObjectID converter
var maxmind = require('maxmind');               // MaxMind GeoIP module
var config = require('./config');               // MSR configurations
var Base = require('./base');                   // base data structures

var Peer = Base.Peer;
var Message = Base.Message;

var conns = [];                                 // Array to store WebSocket connections
var db = null;                                  // MongoDB database object
var hubs = null;                                // HUBS collection
var peers = null;                               // PEERS collection

// Load MaxMind GeoLiteCity databasee
maxmind.init('./GeoLiteCity.dat', {indexCache: true, checkForUpdates: true});

mongoc.connect(config.dbsrc, function(err, database) {
    if (err) {
        console.trace(err);
    }
    else {
        db = database;
        hubs = db.collection('hubs');       // Open/Create HUBS collection
        peers = db.collection('peers');     // Open/Create PEERS collection

        // make sure each peer has logged sign out, in case of server down unexpectedly
        peers.updateMany({signout: {$exists: false}}, {$set: {signout: Date.now()}});
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
                var addr = data.results[0].address_components;
                var addrfull = data.results[0].formatted_address;
                var city = addr.find(function(e) { return e.types[0] == 'administrative_area_level_1'; });
                var country = addr.find(function(e) { return e.types[0] == 'country'; });
                if (city && city.long_name) location.city = city.long_name;
                if (country && country.long_name) location.country = country.long_name;
                location.addr = location.city + ', ' + location.country;
                if (addrfull) location.addrfull = addrfull;

                cb(location);
            }
        });
    }
}

// Message dispatcher
function dispatch(msg) {
    if (msg instanceof Message && msg.to.length) {
        // replicate message to share credential peers
        peers.find({credential: msg.from, connection: {$not: msg.sessid}}).each(function(err, doc) {
            if (doc) {
                var conn = conns.find(function(conn) { return conn.id == doc.connection; });
                if (conn) {
                    conn.sendUTF(msg.toString());
                }
            }
        });

        // dispatch message to receipients
        peers.find({credential: {$in: msg.to}}).each(function(err, doc) {
            if (doc) {
                var conn = conns.find(function(conn) { return conn.id == doc.connection; });
                if (conn) {
                    conn.sendUTF(msg.toString());
                }
            }
        });
    }
}

function response(connection, subject, code, reason, data) {
    var message = new Message();
    message.subject = subject;
    message.timestamp = Date.now();
    if (data) message.content = data;
    message.content.status = code;
    message.content.reason = reason;
    message.from = message.to = connection.credential || '00000000';
    connection.sendUTF(message.toString());
}
 
function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed. 
    if (origin == config.src || config.src == 'ANY'){ return true; }
    return false;
}

function genConnId(connection) {
    return md5(JSON.stringify(connection.socket._peername) + Date.now().toString(16)).toString();
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
            response(connection, 'register', 403, 'Registration Timeout');
            console.log('(Timeout) Peer: ' + connection.remoteAddress);
            connection.close();
        }
    }, 1440);
});

// handle websocket connection
ws.on('connect', function(connection) {
    connection.on('message', function(msg) {
        var peer = null;
        var message = null;
        var sessid = 0;
        var orgTime, recvTime;
        var conn = conns.find(function(conn) { return conn == connection; });

        // Process messages only after database is ready
        if (db && hubs && peers && msg.type === 'utf8') {
            // skip malicious message
            if (!Base.validateMessage(JSON.parse(msg.utf8Data))) return;

            // reconstrut messaage into a Message object
            try {
                message = new Message(JSON.parse(msg.utf8Data));
                orgTime = message.timestamp;
                recvTime = Date.now();
            }
            catch (e) {
                return;
            }

            switch (message.subject) {
                case 'register':
                    if (!conn) {
                        sessid = message.content.sessid || 0;

                        if (message.content.peer && Base.validateCredential(message.content.peer)) {
                            peer = new Peer(message.content.peer);
                            var coords = peer.location.coords;
                        }

                        // check if the sessid has already been used, 
                        // if so, there might be a security leakage, return error to the request peer 
                        // and close the acive sessid connection, everyone needs a proper login
                        peers.find({sessid: sessid}).next(function(err, doc) {
                            if (doc) {
                                console.log('(Warning) SessID violation:' + doc.name + ' / ' + doc.contact);
                                var conn = conns.find(function(conn) { return conn.id == doc.connection; });
                                if (conn) {
                                    response(conn, 'register', 405, 'Session Resume Violation');
                                    setTimeout(function(){ conn.close(); }, 100);
                                }
                                peers.deleteOne({sessid: sessid});
                     
                                response(connection, 'register', 405, 'Session Resume Violation');
                                setTimeout(function(){ connection.close(); }, 100);
                            }
                            else {
                                if (peer) {
                                    connection.credential = peer.credential;
                                    peer.connection = connection.id = genConnId(connection); 
                                    var doc = peer.value();
                                    doc.signin = Date.now();
                                    delete doc.secret;
                                    peers.insert(doc, function(err, res) {
                                        if (res && res.insertedCount) {
                                            conns.push(connection);
                                            console.log('(SignIn) Peer: ' + doc.name + ' / ' + doc.contact + ' (' + conns.length + ')');
                                            message.content.peer = doc;
                                            message.content.originTime = orgTime;
                                            message.content.processTime = Date.now() - recvTime;
                                            response(connection, 'register', 200, 'Registration Succeed', message.content);
                                            peers.deleteOne({connection: sessid});
                                            if (coords) {
                                                location(coords.latitude, coords.longitude, function(loc) {
                                                    peers.update({credential: peer.credential, connection: peer.connection}, {$set: {location: loc}});
                                                    console.log('(Update) Peer:' + peer.name + ' from ' + loc.addr);
                                                });
                                            }
                                            else {
                                                var geoinfo = maxmind.getLocation(connection.remoteAddress);
                                                if (geoinfo) {
                                                    var loc = {};
                                                    loc.city = geoinfo.city;
                                                    loc.country = geoinfo.countryName;
                                                    loc.addr = loc.city + ', ' + loc.country;
                                                    peers.update({credential: peer.credential, connection: peer.connection}, {$set: {location: loc}});
                                                    console.log('(Update) Peer:' + peer.name + ' from ' + loc.addr);
                                                }
                                            }
                                        }
                                        else {
                                            console.trace(err);
                                        }
                                    });
                                }
                                else if (sessid) {
                                    peers.find({connection: sessid}).next(function(err, doc) {
                                        if (doc && doc.signout > doc.signin) {
                                            peer = new Peer(doc);
                                            peer.connection = connection.id = genConnId(connection);
                                            connection.credential = peer.credential;

                                            var newdoc = peer.value();
                                            newdoc.sessid = message.content.sessid;
                                            newdoc.signin = Date.now();
                                            delete newdoc.secret;
                                            peers.insert(newdoc, function(err, res) {
                                                if (res && res.insertedCount) {
                                                    conns.push(connection);
                                                    console.log('(SignIn) Peer: ' + doc.name + ' / ' + doc.contact + ' (' + conns.length + ')');
                                                    message.content.peer = newdoc;
                                                    message.content.originTime = orgTime;
                                                    message.content.processTime = Date.now() - recvTime;
                                                    response(connection, 'register', 200, 'Registration Succeed', message.content);
                                                    peers.deleteOne({connection: sessid});
                                                }
                                                else {
                                                    console.trace(err);
                                                }
                                            });
                                        }
                                        else {
                                            response(connection, 'register', 404, 'Invalid Session Resume');
                                            setTimeout(function(){ connection.close(); }, 100);                                
                                        }
                                    });
                                }
                                else {
                                    response(connection, 'register', 401, 'Invalid Registration Request');
                                    setTimeout(function(){ connection.close(); }, 100);                                
                                }
                            }
                        });
                    }
                    else {
                            response(peer, 'register', 402, 'Duplicated Registration');
                    }
                    break;
                case 'bye':
                    if (conn) {
                        conn.close();
                    }
                    break;
                case 'find':
                    if (conn) {
                        var count = 0;
                        var result = [];
                        if (message.content.target == 'peer') {
                            var exp = new RegExp(message.content.keyword, 'i');
                            peers.find({signout: {$exists: false}, hidden: false, $or: [{name: exp}, {contact: exp}]}).limit(20).each(function(err, doc) {
                                if (doc) {
                                    if (result.indexOf(doc.credential) < 0) {
                                        result.push(doc.credential);
                                        delete doc._id;
                                        delete doc.hidden;
                                        delete doc.connection;
                                        delete doc.signin;
                                        delete doc.location.addrfull;
                                        message.content.result = doc;
                                        response(conn, 'find', 200, 'Found Matched Target', message.content);
                                        count++;
                                    }
                                }
                                else if (count == 0) {
                                    message.content.result = null;
                                    response(conn, 'find', 201, 'No Matched Target', message.content);
                                }
                            });
                        }
                    }
                    break;
                default:
                    // refuse to disptach message with a fraud from field
                    if (conn && message.from == connection.credential) dispatch(message);
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
    peers.find({credential: connection.credential, connection: connection.id}).next(function(err, doc) {
        if (doc) console.log('(SignOut) Peer: ' + doc.name + ' / ' + doc.contact + ' (' + conns.length + ')');
    });
    peers.update({credential: connection.credential, connection: connection.id}, {$set: {signout: Date.now()}});
    var id = conns.indexOf(connection);
    if (id > -1) conns.splice(id, 1);
});
