(function(global, Object, String, Error, TypeError) {

	'use strict';

	var create = Object.create,
		keys = Object.keys,
		getOwnPropertyNames = Object.getOwnPropertyNames,
		getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
		getPrototypeOf = Object.getPrototypeOf,
		isExtensible = Object.isExtensible,

		lazyBind = Function.prototype.bind.bind(Function.prototype.call),

		slice = lazyBind(Array.prototype.slice),
		push = lazyBind(Array.prototype.push),
		forEach = lazyBind(Array.prototype.forEach),
		some = lazyBind(Array.prototype.some),
		reverse = lazyBind(Array.prototype.reverse),
		contact = lazyBind(Array.prototype.concat),
		join = lazyBind(Array.prototype.join),
		filter = lazyBind(Array.prototype.filter),

		call = lazyBind(Function.prototype.call),
		apply = lazyBind(Function.prototype.apply),

		isPrototypeOf = lazyBind(Object.prototype.isPrototypeOf),
		hasOwn = lazyBind(Object.prototype.hasOwnProperty),
		getTagOf = lazyBind(Object.prototype.toString),

		replace = lazyBind(String.prototype.replace),

	 	// `eval` is reserved in strict mode.
	 	// Also, we want to use indirect eval so that implementations can take advantage
	 	// of memory & performance enhancements which are possible without direct eval.
		_eval = eval,

		// We only want to define with own properties of the descriptor.
		define = (function(defineProperty) {
			return function define(obj, name, desc) {
				if ('value' in desc && !hasOwn(desc, 'value')
					|| 'get' in desc && !hasOwn(desc, 'get')
					|| 'set' in desc && !hasOwn(desc, 'set')
					|| 'enumerable' in desc && !hasOwn(desc, 'enumerable')
					|| 'writable' in desc && !hasOwn(desc, 'writable')
					|| 'configurable' in desc && !hasOwn(desc, 'configurable'))
					desc = createSafeDescriptor(desc);
				return defineProperty(obj, name, desc);
			};
			function createSafeDescriptor(obj) {
				if (obj == null) {
					locked = true;
					throw new TypeError('Argument cannot be null or undefined.');
				}
				obj = Object(obj);
				var O = create(null),
					k = keys(obj);
				for (var i = 0, key = k[i]; key = k[i], i < k.length; i++)
					O[key] = obj[key];
				return O;
			}
		})(Object.defineProperty),

		// Returns a clone of an object's own properties without a [[Prototype]].
		own = function own(obj) {
			if (obj == null || getPrototypeOf(obj) == null)
				return obj;
			var O = create(null);
			forEach(getOwnPropertyNames(obj), function(key) {
				define(O, key,
					getOwnPropertyDescriptor(obj, key));
			});
			return O;
		},

		like = function like(/* proto, props */) {

			var proto = arguments[0] != null ? Object(arguments[0]) : null,
				props = arguments[1] != null ? Object(arguments[1]) : null;

			return create(proto, props != null ? propsToDescriptors(own(props), proto) : undefined);

		},

		forge = function forge(obj/*, ...args */) {
			// forge is like + init.

			var O = create(obj),
				init = O.init;

			// TODO: Only pass own() versions of the objects to the initializer?
			if (typeof init == 'function')
				apply(init, O, slice(arguments, 1));

			return O;

		},

		isLike = function isLike(obj, proto) {
			return isPrototypeOf(proto, obj);
		},

		propsToDescriptors = function propsToDescriptors(props, base) {

			var desc = create(null);

			forEach(getUncommonPropertyNames(props, base), function(name) {
				var d = own(getOwnPropertyDescriptor(props, name));
				if (isLike(d.value, Descriptor))
					d = d.value;
				else
					d.enumerable = false;
				desc[name] = d;
			});

			return desc;

		},

		getUncommonPropertyNames = (function() {
			return function getUncommonPropertyNames(from, compareWith) {
				var namesMap = create(null);
				return filter(
					concatUncommonNames(from, compareWith),
					function(u) {
						if (namesMap[u]) return false;
						namesMap[u] = true;
						return true;
					}
				);
			};
			function concatUncommonNames(from, compareWith) {
				if (Object(from) != from
					|| from === compareWith
					|| isLike(compareWith, from)) return [ ];
				return contact(getOwnPropertyNames(from),
					concatUncommonNames(getPrototypeOf(from), compareWith));
			}
		})(),

		getPropertyDescriptor = function getPropertyDescriptor(obj, name) {
			if (Object(obj) !== obj) return undefined;
			return getOwnPropertyDescriptor(obj, name)
				|| getPropertyDescriptor(getPrototypeOf(obj), name);
		},

		Descriptor = create(null),

		sealed = function sealed(value) {
			return like(Descriptor, {
				value: value,
				enumerable: false,
				writable: true,
				configurable: false
			});
		},

		frozen = function frozen(value) {
			return like(Descriptor, {
				value: value,
				enumerable: false,
				writable: false,
				configurable: false
			});
		},

		mixin = function mixin(mixinWhat/*, ...mixinWith */) {

			var mixinWith;

			if (Object(mixinWhat) != mixinWhat)
				throw new TypeError('Cannot mixin a non-object: ' + mixinWhat);

			if (!isExtensible(mixinWhat))
				throw new Error('Cannot mixin on non-exensible object');

			for (var i = 1; i < arguments.length; i++) {

				mixinWith = Object(arguments[i]);

				forEach(getUncommonPropertyNames(mixinWith, mixinWhat), function(name) {

					var whatDesc = own(getPropertyDescriptor(mixinWhat, name)),
						withDesc = own(getPropertyDescriptor(mixinWith, name));

					if (!whatDesc || whatDesc.configurable)
						// If mixinWhat does not already have the property, or if mixinWhat
						// has the property and it's configurable, add it as is.
						define(mixinWhat, name, withDesc);
					else if (whatDesc.writable && 'value' in withDesc)
						// If the property is writable and the withDesc has a value, write the value.
						mixinWhat[name] = withDesc.value;

				});
			}

			return mixinWhat;

		},

		extend = function extend(extendWhat/*, ...extendWith */) {

			var extendWith, descriptors;

			if (Object(extendWhat) != extendWhat)
				throw new TypeError('Cannot call extend on a non-object: ' + extendWhat);

			if (!isExtensible(extendWhat))
				throw new Error('Cannot extend non-exensible object');

			for (var i = 1; i < arguments.length; i++) {

				extendWith = Object(arguments[i]);

				descriptors = propsToDescriptors(own(extendWith), extendWhat);

				// We define these one at a time in case a property on extendWhat is non-configurable.
				forEach(keys(descriptors), function(name) {

					var whatDesc = own(getOwnPropertyDescriptor(extendWhat, name)),
						withDesc = descriptors[name];

					if (!whatDesc || whatDesc.configurable)
						define(extendWhat, name, withDesc);
					else if (whatDesc.writable && 'value' in withDesc)
						extendWhat[name] = withDesc.value;

				});

			}

			return extendWhat;

		},

		// Creates a wrapper function with the same length as the original.
		createWrapper = (function() {

			// Let's memoize wrapper generators to avoid using eval too often.
			var generators = { },

				numGenerators = 0,

				// Let's limit length to 512 for now. If someone wants to up it, they can.
				MAX_WRAPPER_LENGTH = 512,

				// Limit the number of generators which are cached to preserve memory in the unusual case that
				// someone creates many generators. We don't go to lengths to make the cache drop old, unused
				// values as there really shouldn't be a need for so many generators in the first place.
				MAX_CACHED_GENERATORS = 64;

			return function createWrapper(/* original, length, f */$0, $1) {

				var original = arguments[0];

				if (typeof original != 'function')
					throw new TypeError('Function expected: ' + original);

				var length = typeof arguments[2] != 'undefined' ? arguments[1] : original.length,
					f = typeof arguments[2] != 'undefined' ? arguments[2] : arguments[1];

				if (length < 0) length = 0;
				length = length >>> 0;
				if (length > MAX_WRAPPER_LENGTH)
					throw new Error('Maximum length allowed is ' + MAX_WRAPPER_LENGTH + ': ' + length);

				var args = create(null),
					generator = generators[length];

				args.length = 0;

				if (typeof f != 'function')
					throw new TypeError('Function expected: ' + f);

				if (!generator) {

					for (var i = 0; i < length; i++)
						push(args, '$' + i);

					generator = _eval(
						'(function(wrapF, original, name, apply, _eval) {'
							+ '"use strict";'
							+ 'var wrapper = _eval("(function(wrapF, original, name, apply) {'
								+ 'return (function " + name + "_(' + join(args, ',') + ') {'
									+ 'return apply(wrapF, this, arguments);'
								+ '});'
							+ '})")(wrapF, original, name, apply);'
							+ 'wrapper.original = original;'
							+ 'return wrapper;'
						+ '})'
					);

					if (numGenerators < MAX_CACHED_GENERATORS) {
						generators[length] = generator;
						numGenerators++;
					}

				}

				var name = original.name;
				if (name === undefined)
					name = 'anonymous';
				else
					name = String(name);

				return generator(f, original, replace(name, /\W/g, '_'), apply, _eval);

			};

		})(),

		// Convert a regular JS constructor to a simile-style prototype
		// Please note: In order for adapt to work 100% correctly on built-ins, ES6 @@create is needed.
		// It is still pretty much possible to use adapt on Array, but it probably shouldn't be used
		// on any other built-ins (outside of an ES6 environment with an updated adapt to use @@create).
		adapt = function adapt(constructor) {

			if (typeof constructor != 'function'
				|| !hasOwn(constructor, 'prototype'))
				throw new TypeError('Constructor expected');

			var proto = like(constructor.prototype);

			define(proto, 'init', {
				value: createWrapper(constructor, function init() {
					apply(constructor, this, arguments);
				}),
				writable: true,
				enumerable: false,
				configurable: true
			});

			return proto;

		},

		// Convert a simile-style prototype to a regular JS constructor
		toConstructor = function toConstructor(proto) {

			var I = proto.init,
				constructor;

			if (typeof I == 'function')
				constructor = createWrapper(I, function() {
					apply(I, this, arguments);
				});
			else if (I === undefined)
				constructor = function() { };
			else
				throw new TypeError('Function expected');

			constructor.prototype = like(proto, { init: undefined });

			return constructor;

		},

		simile = like(null, {

			like: like,
			forge: forge,

			frozen: frozen,
			sealed: sealed,

			isLike: isLike,
			extend: extend,
			mixin: mixin,

			adapt: adapt,
			toConstructor: toConstructor

		});

	// Export for Node.
	if (typeof module == 'object' && typeof module.exports == 'object')
		module.exports = simile;

	// Export for AMD
	else if (typeof global.define == 'function' && global.define.amd)
		global.define(function() { return simile; });

	// Export as a global
	else
		global.simile = simile;

})(typeof global != 'undefined' && Object(global) === global ? global : typeof window != 'undefined' ? window : this, Object, String, Error, TypeError);