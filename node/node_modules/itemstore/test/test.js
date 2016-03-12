var chai = require('chai');
var store = require('../itemstore');

var assert = chai.assert;
var expect = chai.expect;

var collection = new store();
var items = ['item', {id: 1, name: 'Adam'}, 123];
var props = [{bag: ['organge', 'apple', 'strawberry']}, {id: 1, name: 'Adam'}, 'test'];

describe('comboarray unit test', function() {
	// test append function
	it('should append two items', function() {
		var i = 0;
		while (i < items.length) {
			collection.append(items[i], props[i]);
			assert.equal(collection.size, ++i);
		}
	});

	// test traveral function
	it("should traverse through each item", function() {
		var i = 0;
		collection.each(function(item, prop) {
			assert.equal(item, items[i]);
			assert.equal(prop, props[i]);
			i++;
		});
	});

	// test getProp function
	it("should get an item's properties", function() {
		// add item without properties
		collection.append(items[0]);

		// duplicated items[0], first should be get
		assert.equal(collection.getProp(items[0]), props[0]);
		assert.equal(collection.getProp(items[2]), props[2]);

		// get unexists 
		assert.equal(collection.getProp('test'), null);
	});

	// test setProp function
	it("should set an item's properties", function() {
		collection.setProp(items[0], props[1]);
		assert.equal(collection.getProp(items[0]), props[1]);

		// set unexists
		collection.setProp('test', props[0]);
		assert.equal(collection.getProp('test'), null);		
	});

	// test remove function
	it('should remove two items', function() {
		var size = collection.size;

		collection.remove(items[0]);
		assert.equal(collection.size, --size);

		collection.remove(items[2]);
		assert.equal(collection.size, --size);

		// remove unexisting item which should be no effect
		collection.remove(items[2]);
		assert.equal(collection.size, size);

		// items[0] was inserted twice, it should be able to remove twice
		collection.remove(items[0]);
		assert.equal(collection.size, --size);
		// items[0] was inserted twice, it should be able to remove twice

		collection.remove(items[0]);
		assert.equal(collection.size, size);
	});
});