var fs = require("fs");

var options = {};
var key = process.env.KEY || '';
var cert = process.env.CERT || '';
var secure = false;

if (fs.existsSync(key) && fs.existsSync(cert)) {
	options.key = fs.readFileSync(key);
    options.cert = fs.readFileSync(cert);
    secure = true;
}

var server = process.env.SERVER || '127.0.0.1';
var port = process.env.PORT || 55688;

var uri = (secure ? 'wss' : 'ws') + '://' + server + ':' + port;
var src = process.env.SRC || 'http://127.0.0.1';
var dbsrc = process.env.DBSRC || 'mongodb://127.0.0.1:27017/msgsrouter';

module.exports = {
    secure: secure,
    options: options,
    server: server,
    port: port,
    uri: uri,
    src: src,
    dbsrc: dbsrc
}
