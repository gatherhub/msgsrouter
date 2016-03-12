module.exports = function() {
	var me = this;
	var size =0;
	var items = [];
	var props = [];

    (function() {
        // read-only properties
        Object.defineProperty(me, 'items', {get: function() { return items; }});
        Object.defineProperty(me, 'props', {get: function() { return props; }});
        Object.defineProperty(me, 'size', {get: function() { return size; }});
        // Methods declaration, read-only
        Object.defineProperty(me, 'append', { value: append });
        Object.defineProperty(me, 'remove', { value: remove });
        Object.defineProperty(me, 'setProp', { value: setProp });
        Object.defineProperty(me, 'getProp', { value: getProp });
        Object.defineProperty(me, 'each', { value: each });
    })();

    // Methods implementation
    function append(item, prop) {
        if (item) {
            items.push(item);
            props.push(prop ? prop : null);
            size++;
        }
    }

    function remove(item) {
    	var i = items.indexOf(item);
    	if (i > -1) {
    		items.splice(i, 1);
    		props.splice(i, 1);
	    	size--;
	    	return true;
    	}
    	return false;
    }

    function getProp(item) {
    	var i = items.indexOf(item);
    	if (i > -1) {
    		return props[i];
    	}
    	return null;
    }

    function setProp(item, prop) {
    	var i = items.indexOf(item);
    	if (i > -1) {
    		props[i] = prop ? prop : null;
    		return true;
    	}
    	return false;
    }

    function each(func) {
    	if (func instanceof Function) {
    		for (var i = 0; i < size; i++) {
    			func(items[i], props[i]);
    		}
    	}
    }
};