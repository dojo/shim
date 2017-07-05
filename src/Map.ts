import has from './support/has';
import { ArrayLike } from './interfaces';
import global from './global';
import { forOf, Iterable, IterableIterator, ShimIterator } from './iterator';
import { is as objectIs } from './object';
import './Symbol';

export interface MapConstructor {
	new (): Map<any, any>;
	new <K, V>(entries?: [K, V][]): Map<K, V>;
	new <K, V>(iterable: Iterable<[K, V]>): Map<K, V>;
	readonly prototype: Map<any, any>;

	[Symbol.species]: MapConstructor;
}

export default interface Map<K, V> {
	/** Returns an iterable of entries in the map. */
	[Symbol.iterator](): IterableIterator<[K, V]>;
	[Symbol.toStringTag]: 'Map';

	/**
	 * Returns an iterable of key, value pairs for every entry in the map.
	 */
	entries(): IterableIterator<[K, V]>;

	clear(): void;
	delete(key: K): boolean;
	forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
	get(key: K): V | undefined;

	/**
	 * Returns an iterable of keys in the map
	 */
	keys(): IterableIterator<K>;

	has(key: K): boolean;
	set(key: K, value: V): this;
	readonly size: number;

	/**
	 * Returns an iterable of values in the map
	 */
	values(): IterableIterator<V>;
}

let ShimMap: MapConstructor;

if (!has('es6-map')) {
	ShimMap = class Map<K, V> {
		protected readonly _keys: K[] = [];
		protected readonly _values: V[] = [];

		/**
		 * An alternative to Array.prototype.indexOf using Object.is
		 * to check for equality. See http://mzl.la/1zuKO2V
		 */
		protected _indexOfKey(keys: K[], key: K): number {
			for (let i = 0, length = keys.length; i < length; i++) {
				if (objectIs(keys[i], key)) {
					return i;
				}
			}
			return -1;
		}

		static [Symbol.species] = ShimMap;

		/**
		 * Creates a new Map
		 *
		 * @constructor
		 *
		 * @param iterator
		 * Array or iterator containing two-item tuples used to initially populate the map.
		 * The first item in each tuple corresponds to the key of the map entry.
		 * The second item corresponds to the value of the map entry.
		 */
		constructor(iterable?: ArrayLike<[K, V]> | Iterable<[K, V]>) {
			if (iterable) {
				forOf(iterable, (value: [K, V]) => {
					this.set(value[0], value[1]);
				});
			}
		}

		/**
		 * Returns the number of key / value pairs in the Map.
		 *
		 * @return the number of key / value pairs in the Map
		 */
		get size(): number {
			return this._keys.length;
		}

		/**
		 * Deletes all keys and their associated values.
		 */
		clear(): void {
			this._keys.length = this._values.length = 0;
		}

		/**
		 * Deletes a given key and its associated value.
		 *
		 * @param key The key to delete
		 * @return true if the key exists, false if it does not
		 */
		delete(key: K): boolean {
			const index = this._indexOfKey(this._keys, key);
			if (index < 0) {
				return false;
			}
			this._keys.splice(index, 1);
			this._values.splice(index, 1);
			return true;
		}

		/**
		 * Returns an iterator that yields each key/value pair as an array.
		 *
		 * @return An iterator for each key/value pair in the instance.
		 */
		entries(): IterableIterator<[K, V]> {
			const values = this._keys.map((key: K, i: number): [K, V] => {
				return [ key, this._values[i] ];
			});

			return new ShimIterator<[K, V]>(values);
		}

		/**
		 * Executes a given function for each map entry. The function
		 * is invoked with three arguments: the element value, the
		 * element key, and the associated Map instance.
		 *
		 * @param callback The function to execute for each map entry,
		 * @param context The value to use for `this` for each execution of the calback
		 */
		forEach(callback: (value: V, key: K, mapInstance: Map<K, V>) => any, context?: {}) {
			const keys = this._keys;
			const values = this._values;
			for (let i = 0, length = keys.length; i < length; i++) {
				callback.call(context, values[i], keys[i], this);
			}
		}

		/**
		 * Returns the value associated with a given key.
		 *
		 * @param key The key to look up
		 * @return The value if one exists or undefined
		 */
		get(key: K): V | undefined {
			const index = this._indexOfKey(this._keys, key);
			return index < 0 ? undefined : this._values[index];
		}

		/**
		 * Checks for the presence of a given key.
		 *
		 * @param key The key to check for
		 * @return true if the key exists, false if it does not
		 */
		has(key: K): boolean {
			return this._indexOfKey(this._keys, key) > -1;
		}

		/**
		 * Returns an iterator that yields each key in the map.
		 *
		 * @return An iterator containing the instance's keys.
		 */
		keys(): IterableIterator<K> {
			return new ShimIterator<K>(this._keys);
		}

		/**
		 * Sets the value associated with a given key.
		 *
		 * @param key The key to define a value to
		 * @param value The value to assign
		 * @return The Map instance
		 */
		set(key: K, value: V): Map<K, V> {
			let index = this._indexOfKey(this._keys, key);
			index = index < 0 ? this._keys.length : index;
			this._keys[index] = key;
			this._values[index] = value;
			return this;
		}

		/**
		 * Returns an iterator that yields each value in the map.
		 *
		 * @return An iterator containing the instance's values.
		 */
		values(): IterableIterator<V> {
			return new ShimIterator<V>(this._values);
		}

		[Symbol.iterator](): IterableIterator<[K, V]> {
			return this.entries();
		}

		[Symbol.toStringTag]: 'Map' = 'Map';
	};
}

export default (has('es6-map') ? global.Map : ShimMap!) as MapConstructor;
