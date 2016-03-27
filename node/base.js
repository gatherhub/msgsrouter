var md5 = require('crypto-js/md5');

function toString() {
	try {
		return JSON.stringify(this);
	}
	catch (e) {
		console.trace(e);
		return '';
	}
}

function value() {
	try {
    	return JSON.parse(this.toString());
	}
	catch (e) {
		console.trace(e);
		return {};
	}
}

function validateCredential(peer) {
	try {
		return peer.credential == md5(toString.call({name: peer.name, email: peer.email, secret: peer.secret})).toString();
	}
	catch (e) {
		console.trace(e);
		return false;
	}
}

function validateMessage(message) {
	try {
		return message.checksum == md5(toString.call({to: message.to, from: message.from, subject: message.subject, timestamp: message.timestamp, content: message.content})).toString();
	}
	catch (e) {
		console.trace(e);
		return false;
	}
}

function Hub() {
	var me = this;

	(function() {
	    Object.defineProperty(me, 'toString', {
	    	value: function() { return toString.call(me); }
	    });
	    Object.defineProperty(me, 'value', {
	    	value: function() { return value.call(me); }
	    });
	})();

	me.id = '';
	me.name = '';
	me.topic = '';
	me.secret = null;
	me.public = false;
}

function Peer(arg) {
	var me = this;
	var _credential, _name, _email, _secret;

	(function() {
		Object.defineProperty(me, 'credential', {
			enumerable: true,
			get: function() { return _credential; }
		});		
		Object.defineProperty(me, 'name', {
			enumerable: true,
			get: function() { return _name; },
			set: function(x) {
				_name = x;
				_updateCredential();
			}
		});
		Object.defineProperty(me, 'email', {
			enumerable: true,
			get: function() { return _email; },
			set: function(x) {
				_email = x;
				_updateCredential();
			}
		});
		Object.defineProperty(me, 'secret', {
			enumerable: true,
	    	get: function() { return _secret; },
	    	set: function(x) {
	    		_secret = md5(x).toString();
	    		_updateCredential();
	    	}
	    });
	    Object.defineProperty(me, 'setSecret', { value: setSecret });
	    Object.defineProperty(me, 'toString', {
	    	value: function() {	return toString.call(me); }
	    });
	    Object.defineProperty(me, 'value', {
	    	value: function() { return value.call(me); }
	    });
	})();

	function _updateCredential() {
		_credential = md5(JSON.stringify({name: _name, email: _email, secret: _secret})).toString();
	}

	function setSecret(secret) {
		_secret = secret;
		_updateCredential();
	}

	var _peer = arg || {};
	me.name = _peer.name || '';
	me.email = _peer.email || '';
	me.secret = _peer.secret || '';
	me.location = _peer.location || {city: 'unknown', country: 'unknown', addr: 'unknown'};
	me.publish = _peer.publish || false;
}

function Message(arg) {
	var me = this;
	var _to, _from, _subject, _timestamp, _content, _checksum;

	(function() {
		Object.defineProperty(me, 'checksum', {
			enumerable: true,
			get: function() { return _checksum; }
		}),
		Object.defineProperty(me, 'to', {
			enumerable: true,
			get: function() { return _to; },
			set: function(x) {
				if (typeof x == 'string') x = [x];
				if (x instanceof Array) _to = x;
				_updateChecksum();
			}
		});
		Object.defineProperty(me, 'from', {
			enumerable: true,
			get: function() { return _from; },
			set: function(x) {
				_from = x;
				_updateChecksum();
			}
		}),
		Object.defineProperty(me, 'subject', {
			enumerable: true,
			get: function() { return _subject; },
			set: function(x) {
				_subject = x;
				_updateChecksum();
			}
		}),
		Object.defineProperty(me, 'timestamp', {
			enumerable: true,
			get: function() { return _timestamp; },
			set: function(x) {
				_timestamp = x;
				_updateChecksum();
			}
		}),
		Object.defineProperty(me, 'content', {
			enumerable: true,
			get: function() { return _content; },
			set: function(x) {
				_content = x;
				_updateChecksum();
			}
		}),
	    Object.defineProperty(me, 'toString', {
	    	value: function() { return toString.call(me); }
	    });
	    Object.defineProperty(me, 'value', {
	    	value: function() { return value.call(me); }
	    });
	})();

	function _updateChecksum() {
		_checksum = md5(toString.call({to: _to, from: _from, subject: _subject, timestamp: _timestamp, content: _content})).toString();
	}

	var _msg = arg || {};
	me.to = _msg.to || [];
	me.from = _msg.from || '';
	me.subject = _msg.subject || '';
	me.timestamp = _msg.timestamp || Date.now();
	me.content = _msg.content || {};
}

module.exports = {
	Message: Message,
	Peer: Peer,
	Hub: Hub,
	validateCredential: validateCredential,
	validateMessage: validateMessage
};