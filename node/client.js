var md5 = require('crypto-js/md5');
var Base = require('./base');
var Hub = Base.Hub;
var Peer = Base.Peer;
var Message = Base.Message;

// makes WebSocket available both in node console and webpage
try {
	Object.getPrototypeOf(process);	// test if process object exists, if not error will be thrown
	var WebSocket = require('websocket').w3cwebsocket;
}
catch (e) {
	// do nothing
	// console.log(e)
}	

function client(argument) {
	var me = this;
	var _peer = new Peer();
	var _ws = null, _state = 0;
	me.server = '';
	me.onmessage = function(msg) { console.dir(msg.value()); };
	me.autoreconnect = true;
	me.offset = 0;

	(function() {
		Object.defineProperty(me, 'STATE', {
			value: {
				CLOSED: 0,
				OPENED: 1,
				REGISTERED: 2
			}
		});
		Object.defineProperty(me, 'state', {
			enumerable: false,
			get: function() { return _state; }
		});
		Object.defineProperty(me, 'peer', {
			enumerable: false,
			get: function() { return _peer; }
		});
		Object.defineProperty(me, 'credential', {
			enumerable: true,
			get: function() { return _peer.credential; },
		});
		Object.defineProperty(me, 'name', {
			enumerable: true,
			get: function() { return _peer.name; },
			set: function(x) { _peer.name = x; }
		});
		Object.defineProperty(me, 'email', {
			enumerable: true,
			get: function() { return _peer.email; },
			set: function(x) { _peer.email = x; }
		});
		Object.defineProperty(me, 'secret', {
			enumerable: true,
			get: function() { return _peer.secret; },
			set: function(x) { _peer.secret = x; }
		});
		Object.defineProperty(me, 'location', {
			enumerable: true,
			get: function() { return _peer.location; },
			set: function(x) { _peer.location = x; }
		});
		Object.defineProperty(me, 'publish', {
			enumerable: true,
			get: function() { return _peer.publish; },
			set: function(x) { _peer.publish = x; }
		});
		Object.defineProperty(me, 'connect', {value: connect});
		Object.defineProperty(me, 'send', {value: send});
		Object.defineProperty(me, 'getTime', {value: getTime});
	})();

	function connect() {
		if (_state != me.STATE.CLOSED) return;

		try {
			_ws = new WebSocket(me.server, null);

			_ws.onerror = function(e) { console.trace(e); };

			_ws.onopen = function() {
				_state = me.STATE.OPENED;
				console.log('WebSocket opened');
				send(me.credential, 'register', _peer.value());
			};
			
			_ws.onclose = function() {
				_ws = null;
				_state = me.STATE.CLOSED;
				console.log('WebSocket closed');
				if (me.autoreconnect) {
					connect();
				}
			};

			_ws.onmessage = function(msg) {
				var recvTime = Date.now();
				if (me.onmessage) {
		            var message;
		            try {
		                message = JSON.parse(msg.data);
		                if (!Base.validateMessage(message)) return;
		                message = new Message(message);
		            }
		            catch (e) {
		            	console.log(e)
		                return;
		            }
		            switch (message.subject) {
		            	case 'register':
		            		if (message.content.status == 1) _state = me.STATE.REGISTERED;
		            		me.offset = recvTime - message.timestamp - (0 | ((recvTime - message.content.orginTime) / 2));
		            		break;
		            	default:
							setTimeout(function() { me.onmessage(message); }, 0);
		            }
				}
			};
		}
		catch (e) {
			console.trace(e);
			me.autoreconnect = false;
		}

	}

	function send(to, subject, content) {
		if (!_ws) return;
		var message = new Message();
		message.to = to || [];
		message.from = me.credential;
		message.subject = subject || '';
		message.content = content || {};
		message.timestamp = getTime();
		_ws.send(message.toString());
	}

	function getTime() {
		return Date.now() - me.offset;
	}
}

module.exports = new client();