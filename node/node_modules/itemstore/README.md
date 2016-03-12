# itemstore
A composite array data structure to store items (number, string, object, etc.) and additional properties.

## Installation

```shell
npm install itemstore
```

## Usage example:
```javascript
var store = require('itemstore');
var collection = new store();

var items = ['item', {id: 1, name: 'Adam'}, 123];
var props = [{bag: ['organge', 'apple', 'strawberry']}, {id: 1, name: 'Adam'}, 'test'];

// append item and its properties, item and properties can be any type
var i = 0;
while (i < items.length) {
	collection.append(items[i], props[i]);
	i++;
}

// check itemstore size
console.log(collection.size);

// traverse items and properties
collection.each(function(item, prop) {
  console.log(item, prop);
});

// set certain item's properties
collection.setProp(items[0], props[1]);

// get certain item's properties
console.log(collection.getProp(items[0]))；

// remove item and its properties
collection.remove(items[0]);
```
