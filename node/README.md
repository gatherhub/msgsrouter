# Installation

```shell
npm install msrsrouter
```

## Configure MSR

Open config.js and edit the following lines with your server configurations,

```javascript
var url = 'https://localhost';	// URL for connection validation, this is the webpage URL where the client connected from
var port = 55688;				// WebSocket listening port
var options = {					// SSL configuration
    key: fs.readFileSync('./privateKey.key'),		// SSL private key
    cert: fs.readFileSync('./certificate.crt')		// SSL certificate
};
```

## Running MSR

When the Runy runtime environment and dependent Gems are installed, you may run MSR as the following,

```shell
$ node msg_srouter.js
```

MSR can be run in Linux or Windows OS. To run MSR as a system service, please refer to the OS guide.

# License

msgsrouter is released and distributed under the permissive MIT License: Copyright (c) Quark Li, quarkli@gmail.com
