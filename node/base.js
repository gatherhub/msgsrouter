function toString() {
	try {
		return JSON.stringify(this);
	}
	catch (e) {
		console.error(e);
		return '';
	}
}

function value() {
	try {
    	return JSON.parse(this.toString());
	}
	catch (e) {
		console.error(e);
		return {};
	}
}

function hub() {
	var me = this;

	(function() {
	    Object.defineProperty(me, 'toString', {
	    	value: function() { return toString.call(me); }
	    });
	    Object.defineProperty(me, 'value', {
	    	value: function() { return value.call(me); }
	    });
	})();

	this.id = '';
	this.topic = '';
	this.secret = null;
	this.public = false;
	this.peers = [];
}

function peer(arg) {
	var me = this;

	(function() {
	    Object.defineProperty(me, 'toString', {
	    	value: function() {
	    		// connection contains cirular structure and we dont want to dump it
	    		var conn = me.connection;
	    		me.connection = {};
	    		var val = toString.call(me);
	    		me.connection = conn;
	    		return val;
	    	}
	    });
	    Object.defineProperty(me, 'value', {
	    	value: function() { return value.call(me); }
	    });
	})();

	this.credential = '';
	this.hub = '';
	this.name = '';
	this.secret = '';
	this.location = {};
	this.contact = {};
	this.connection = {};
	this.publish = false;

	if (arg) {
		this.credential = arg.credential || this.credential;
		this.hub = arg.hub || this.hub;
		this.name = arg.name || this.name;
		this.secret = arg.secret || this.secret;
		this.location = arg.location || this.location;
		this.contact = arg.contact || this.contact;
		this.connection = arg.connection || this.connection;
		this.publish = arg.publish || this.publish;
	}
}

function message(arg) {
	var me = this;

	(function() {
	    Object.defineProperty(me, 'toString', {
	    	value: function() { return toString.call(me); }
	    });
	    Object.defineProperty(me, 'value', {
	    	value: function() { return value.call(me); }
	    });
	})();

	this.hub = '';
	this.from = '';
	this.to = [];
	this.subject = '';
	this.timestamp = Date.now();
	this.contact = {};
	this.content = {};

	if (arg) {
		if (arg instanceof message) {
			try {
				var obj = arg.value();
				this.hub = obj.hub;
				this.from = obj.from;
				this.to = obj.to;
				this.subject = obj.subject;
				this.timestamp = obj.timestamp;
				this.contact = obj.contact;
				this.content = obj.content;
			}
			catch (e) {
				console.log(e.message);
			}
		}
		else {
			this.hub = arg.hub || this.hub;
			this.from = arg.from || arg.credential || this.from;		// arg.credential is for new message(peer)
			this.to = arg.to || this.to;
			this.subject = arg.subject || this.subject;
			this.timestamp = arg.timestamp || this.timestamp;
			this.contact = arg.contact || this.contact;
			this.content = arg.content || this.content;
		}
	} 

}

module.exports = {
	message: message,
	peer: peer,
	hub: hub
};