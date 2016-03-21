var fs = require("fs");

var secure = process.env.SECURE == 'yes' ? true : false;
var server = process.env.SERVER || 'localhost';	// URL for connection validation, this is the webpage URL where the client connected from
var port = process.env.MSRPORT || 55688;				// WebSocket listening port
var key = process.env.KEY || null;
var cert = process.env.CERT || null;
var weburl = (secure ? 'https' : 'http') + '://' + server;
var wsurl = (secure ? 'wss' : 'ws') + '://' + server + ':' + port;

var options = {};

if (secure && fs.existsSync(key) && fs.existsSync(cert)) {
	options.key = fs.readFileSync(key);
    options.cert = fs.readFileSync(cert);
}

module.exports = {
    secure: secure,
    server: server,
    port: port,
    options: options,
    weburl: weburl,
    wsurl: wsurl
}
