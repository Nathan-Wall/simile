Spawn
=====

A small, experimental library which attempts to push prototypal inheritance to its natural conclusions in JavaScript (for ECMAScript 5).

This library provides a single object named `Spawn` (unless `SpawnExports` is enabled).
`Spawn` should be considered a prototype object, an object from which other objects inherit.
All objects which inherit from `Spawn` are referred to as spawns.

Inheritance (`beget`)
---------------------

To create an object which inherits from `Spawn` use `Spawn.beget`.

	var Pizza = Spawn.beget();
	// Pizza is an object which inherits from Spawn

To create an object which inherits from another spawn, use `beget` again.

	var CheesePizza = Pizza.beget();
	// CheesePizza inherits from Pizza and Spawn

The `beget` method accepts one optional argument, a map of properties to add to the new object.

	var PepperoniPizza = Pizza.beget({
		toppings: [ 'pepperoni' ]
	});
	PepperoniPizza.toppings; // => [ 'pepperoni' ]

	var MediumPepperoniPizza = PepperoniPizza.beget({
		diameter: '22cm'
	});
	MediumPepperoniPizza.diameter; // => '22cm'
	MediumPepperoniPizza.toppings; // => [ 'pepperoni' ]

These properties are, by default, non-enumerable.

	MediumPepperoniPizza.slices = 8;

	for(var key in MediumPepperoniPizza) {
		console.log(key);
	}
	// Only logs 'slices'. The other properties ('diameter', 'toppings') are not logged because
	// they are non-enumerable.

These properties are, however, writable and configurable.

	MediumPepperoniPizza.diameter = '20cm';
	delete MediumPepperoniPizza.toppings;

	MediumPepperoniPizza.diameter; // => '20cm'
	MediumPepperoniPizza.toppings; // => undefined

Using `beget` as a Generic Function
------------------------------------

`beget` is generic and can be used on any object, not just spawns.

	var Person = {
		getName: function() {
			return this.firstName + ' ' + this.lastName;
		}
	};

	var Mike = Spawn.beget.call(Person, {
		firstName: 'Mike',
		lastName: 'Campbell'
	});

	Mike.getName(); // => 'Mike Campbell'

If used this way, the object won't inherit the `beget` method because it
doesn't inherit from `Spawn`.

	var John = Mike.beget(); // => Error, beget is not a function
	// should be: var John = Spawn.beget.call(Mike);

To make `beget` easier to access as a function it can be uncontextualized.
This allows `beget` to function very similarly to `Object.create`, except it has an easier, cleaner
syntax with (we feel) reasonable defaults for the property descriptors.

	var beget = Function.prototype.call.bind(Spawn.beget);

	var John = beget(Mike, {
		firstName: 'John'
	});
	John.getName(); // => 'John Campbell'

Like `Object.create`, `beget` can be used on `null` to create an object with no inheritance.

	var x = beget(null);
	'hasOwnProperty' in x; // => false
	// x does not inherit from Object (or anything)

base
----

Methods which are overridden using `beget` are magically wrapped such that `this.base()` can be called
in order to call the overridden method.

	var A = Spawn.beget({
		hi: function() { return 'This is A'; }
	});
	var B = A.beget({
		hi: function() {
			// Use this.base to call A.hi in the context of B.
			this.base();
			return 'This is B';
		}
	});

	B.hi(); // => 'This is A'
	        // => 'This is B'

hatch
-----

`hatch` is identical to `beget` except that it doesn't accept any arguments.
The purpose of `hatch` is to allow overriding so that other arguments can be passed in.

	var Person = Spawn.beget({
		hatch: function(firstName, lastName) {
			var obj = this.base();
			obj.firstName = firstName;
			obj.lastName = lastName;
			return obj;
		},
		getName: function() {
			return this.firstName + ' ' + this.lastName;
		}
	});
	var Mike = Person.hatch('Mike', 'Campbell');
	Mike.getName(); // => 'Mike Campbell'

extend
------

Objects which inherit from `Spawn` also inherit the `extend` method.

	var Santa = Spawn.beget();
	Santa.extend({
		speak: function() {
			return 'Ho ho ho!';
		}
	});
	Santa.speak(); // => 'Ho ho ho!'

Properties added with `extend` are added with the same property descriptors used in the object
passed as the property map argument.

	var descriptor = Object.getOwnPropertyDescriptor(Santa, 'speak');
	descriptor.enumerable;   // => true
	descriptor.writable;     // => true
	descriptor.configurable; // => true

	Santa.extend(Object.freeze({
		shout: function() {
			return 'Merry Christmas!';
		}
	}));
	descriptor = Object.getOwnPropertyDescriptor(Santa, 'shout');
	descriptor.enumerable;   // => true
	descriptor.writable;     // => false
	descriptor.configurable; // => false

Note that the above `Object.freeze` doesn't freeze `Santa`; it only freezes the object which is passed
to `extend`, meaning that when the properties are copied over to `Santa`, they are copied as
non-writable and non-configurable.

`extend` can also be made into a general purpose function.

	var extend = Function.prototype.call.bind(Spawn.extend);
	var x = { a: 4 };
	extend(x, { b: 7 });
	x.a + x.b; // => 11

isA
---

Finally, `Spawn` also provides the `isA` method for checking inheritance
(`instanceof` will not work because there are no constructors).

	PepperoniPizza.isA(Pizza);            // => true
	MediumPepperoniPizza.isA(Pizza);      // => true
	PepperoniPizza.isA(Spawn);            // => true
	PepperoniPizza.isA(Object.prototype); // => true
	PepperoniPizza.isA(Santa);            // => false

`isA` can also be made into a generic function in the same way as `beget` and `extend`.

Example
-------

	var Vehicle = Spawn.beget({
		speed: 0,
		acceleration: 10,
		start: function() {
			this.speed = this.acceleration;
			console.log(this.name, 'started', this.speed);
		},
		stop: function() {
			this.speed = 0;
			console.log(this.name, 'stopped', this.speed);
		},
		accelerate: function() {
			this.speed += this.acceleration;
			console.log(this.name, this.speed);
		}
	});

	// MiniVan inherits all of Vehicle's properties
	var MiniVan = Vehicle.beget({
		acceleration: 6
	});

	// Racecar also inherits all of Vehicles properties, but it overrides the beget method.
	var Racecar = Vehicle.beget({
		hatch: function(name) {
			// Use this.base to call Vehicle's hatch method (which is inherited from Spawn).
			var obj = this.base({ name: name });
			obj.acceleration = Math.floor(Math.random() * 20 + 40);
			return obj;
		}
	});

	// peacockVan inherits from MiniVan
	var peacockVan = MiniVan.beget({
		name: 'peacock'
	});

	peacockVan.start();       // => peacock started 6
	peacockVan.accelerate();  // => peacock 12
	peacockVan.accelerate();  // => peacock 18
	peacockVan.stop();        // => peacock stopped 0

	// wallaceCar inherits from Racecar
	var wallaceCar = Racecar.beget('wallace');
	// andyCar also inherits from Racecar
	var andyCar = Racecar.beget('andy');

	wallaceCar.start();       // => wallace started [random number]
	andyCar.start();          // => andy started [random number]

	wallaceCar.accelerate();  // => wallace [random number]
	andyCar.accelerate();     // => andy [random number]

	wallaceCar.accelerate();  // => wallace [random number]
	andyCar.accelerate();     // => andy [random number]

	wallaceCar.stop();        // => wallace [random number]
	andyCar.stop();           // => andy [random number]