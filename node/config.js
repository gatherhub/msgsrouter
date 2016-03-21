var fs = require("fs");

var secure = process.env.SECURE == 'yes' ? true : false;
var server = process.env.SERVER || 'localhost';

var webport = process.env.PORT || null;
var weburl = (secure ? 'https' : 'http') + '://' + server + (webport ? ':' + webport : '');

var wsport = process.env.WSPORT || 55688;
var wsurl = (secure ? 'wss' : 'ws') + '://' + server + ':' + wsport;

var key = process.env.KEY || null;
var cert = process.env.CERT || null;

var options = {};

if (secure && fs.existsSync(key) && fs.existsSync(cert)) {
	options.key = fs.readFileSync(key);
    options.cert = fs.readFileSync(cert);
}

module.exports = {
    secure: secure,
    server: server,
    webport: webport,
    wsport: wsport,
    options: options,
    weburl: weburl,
    wsurl: wsurl
}
