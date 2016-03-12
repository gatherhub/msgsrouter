var fs = require("fs");

var url = 'https://localhost';	// URL for connection validation, this is the webpage URL where the client connected from
var port = 55688;				// WebSocket listening port
var options = {					// SSL configuration
    key: fs.readFileSync('./privateKey.key'),		// SSL private key
    cert: fs.readFileSync('./certificate.crt')		// SSL certificate
};

exports.url = url;
exports.port = port;
exports.options = options;
