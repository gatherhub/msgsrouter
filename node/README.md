# Message Switch Router (msgsrouter)

Message Switch Router (MSR) is a univeral message exchange application realization built on WebSocket technology. The idea is to provide a simple, easy, and standard method to all kinds of applications to construct a communication network for one-to-one or one-to-many information exchange.

MSR is also designed to be as least dependent on the server as possible. MSR uses MongoDB to keep tracking the user (peer) online state (as registation) and basic user identity information. However, MSR does not provide a strong authentication on the users which keeps the server loading at the minimal and remove all the security risk from the server side attacks. A simple self-integrity validation is designed into MSR to make sure each peer plays the game by the rules, but MSR does not gaurantee any real-world identity validation. Therefore, it is the responsibility of the applications and users to bring in proper authentication if there is any concerns.

# Installation

```shell
npm install msrsrouter
```

# Key Components

- **Base Module** (base.js)

- **Config Module** (config.js)

- **Server Module** (msg_srouter.js)

- **Client Module** (client.js)

## Run MSR Sever

You may configure MSR server through environment variables or config.js file.

* **Configuration:**
```shell
$ export SERVER=<ip_address>		# configure MSR server listening IP address
$ export PORT=<port_number>			# configure MSR server listening port
$ export SRC=<source_url>			# configure accepted source URL (your webpage URL), i.e. http://127.0.0.1, only request from the source URL will be accepted, you can set 'ANY' if you want to accept connection from any sources.
$ export DBSRC=<database_source>	# configure the MongoDB server and datebase source URL, i.e. mongodb://127.0.0.1:27017/msgsrouter
$ export KEY=<ssl_private_key>		# configure the SSL private key if you want to enable secure communication
$ export CERT=<ssl_certificate>		# configure the SSL certificate if you want to enable secure communication, only when both KEY nd CERT are provided with valid files the secure communication can be enabled
```
Once you have the server configuration ready, you may start the server by,

```shell
npm start
```
OR
```shell
node msg_srouter.js
```

## Use MSR Client

A MSR client module is provided to save developers from taking care of some basic details. The client module is implemented to be running in both NodeJS console or a web browser, but it is still under development and not fully tested. There might be a chance you will encounter some bugs.

To use the client module, simply require it in your Javascript. The client module returns MSR client module instance when you require it, so you can use the instance directly. Here is the example,

```javascript
var client = require('msgsrouter/client');

// configure client
client.server = 'ws://127.0.0.1:55688';
client.name = 'Quark Li';
client.email = 'qli@gatherhub.com';
client.secret = 'password';

// You may skip this if you simply want to show message in the console which has been implemented by default
// Replay onmessage function with your own to add your own application logics
client.onmessaage = function(msg) { console.log(msg); }

// connect to the MSR server
client.connect();

// check the connection state, client.STATE = {CLOSED: 0, OPENED: 1, REGISTERED: 2}
console.log(client.state);

// check the time offset if client received registration response from server
// this time offset is to provide a simple time synchronizatioin among all connected clients
// it does not provide high procision but to keep the difference of timestamp used by each client as minimal as possible
// it is automatically set from the server response and user cannot set the value
console.log(client.offset);

// send a message to self, prototype: send([to], subject, content)
client.send(client.credential, 'test', {mydata: 'something'});
```
You may need to add Peer and Message from Base module to help you easily construct peer ane message.

```javascript
var Peer = require('msgsrouter/base').Peer;
var peer = new Peer();

console.log(peer.value());

>>>>>>>>>>>> output example
{ credential: '3ccb7d82bb030d0c902bfac1b6d4eb96',
  name: '',
  email: '',
  secret: 'd41d8cd98f00b204e9800998ecf8427e',
  location: { city: 'unknown', country: 'unknown', addr: 'unknown' },
  publish: false 
}

var Message = require('msgsrouter/base').Message;
var message = new Messaage();

console.log(message.value());

>>>>>>>>>>>> output example
{ checksum: 'beb5e001c6fc99a03467a1b1095c4f28',
  to: [],
  from: '',
  subject: '',
  timestamp: 1459091247561,
  content: {} 
}
```
Please note Peer.credential and Message.checksum is automatically calculated when you set the Peer and Messaage values. You can call validation functions to check if a Peer/Message is valid.

```javascript
var Base = require('msgsrouter/base');

Base.validateCredential(peer);
Base.validateMessage(message);
```

# Peer Object

Peer Object is the representation of a MSR client. Here is the description of its properties,

- Credential: Client's key identity used as the communication destination
- Name: Client's display name/title
- Email: Client's email - Name and Email helps the others to identify who you are
- Secret: Client's secret phrase to keep the integrity
- Location: Client's location information, location information is also help others to identify a peer
- Publish: Whether a client wants to publish its contact informatin so it can be browsed/searched

A peer keeps its integrity by hashing from (name + email + secret). As long as a user keeps using the same (name + email + secret), the same credential will be produced even on different devices. Changing any one of them will produce another credential. There is a very small chance to produce duplicated credential from differnt (name + email + secret), but not very likely in probability. Another risk is someone intentionly to fake the other's identity, so user should not trust the name and email provided by a client unless validated through other method. Since secret and credential as stored in hash value in the memory of user's device and transmitted over secure (strongly recommended) channel, they are not easily to be hacked unless there is a direct access to user's device.

# Message Object

Message Object is designed as a standard mail in the JSON format. It consists To, From, Subject, Timestamp, and Content with an additional Checksum for integrity validation.

- Checksum: Hash value for message integrity check
- To: Message destination which should be one or some peer's credential in an array, (a Hub ID can be used for group communication which is still in development)
- From: Message source identity which should be the credential of the sender client. A message will be blocked if the message's From is not the sender's credential.
- Subject: A brief identification of the content. There are some predefined subjects, such as, 'register', 'bye', 'query'.
- Timestamp: A tag of time of the message so the receive may order messages from differnt clients.
- Content: The actual message content which can be any data user wants to put in.

If there is any question or issue, please feel free to contact with me quarkli@gmail.com


# License


msgsrouter is released and distributed under the permissive MIT License: Copyright (c) Quark Li, quarkli@gmail.com
