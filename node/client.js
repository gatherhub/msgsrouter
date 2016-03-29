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
	me.autoreconnect = false;
	me.offset = 0;
	me.sessid = 0;

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
		Object.defineProperty(me, 'contact', {
			enumerable: true,
			get: function() { return _peer.contact; },
			set: function(x) { _peer.contact = x; }
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
		Object.defineProperty(me, 'hidden', {
			enumerable: true,
			get: function() { return _peer.hidden; },
			set: function(x) { _peer.hidden = x; }
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
				if (Base.validateCredential(_peer)) {
					send(me.credential, 'register', {peer: _peer.value(), sessid: me.sessid});
				}
				else if (me.sessid) {
					send('', 'register', {sessid: me.sessid});
				}
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
	            var message, ot, pt;
	            try {
	                message = JSON.parse(msg.data);
	                if (!Base.validateMessage(message)) return;
	                message = new Message(message);
	            }
	            catch (e) {
	            	console.trace(e)
	                return;
	            }
	            switch (message.subject) {
	            	case 'register':
	            		if (message.content.status == 200) {
	            			_state = me.STATE.REGISTERED;

	            			ot = message.content.originTime || 0;
	            			pt = message.content.processTime || 0;
		            		me.offset = recvTime - message.timestamp - (0 | ((recvTime - ot - pt) / 2));

		            		if (message.content.peer) {
			            		me.sessid = message.content.peer.connection || 0;
			            		if (!Base.validateCredential(me.peer)) {
			            			_peer = new Peer(message.content.peer);
			            		}
		            		}
	            		}
	            	default:
						if (me.onmessage) {
							setTimeout(function() { me.onmessage(message); }, 0);
						}
						break;
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