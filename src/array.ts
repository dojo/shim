import has from './support/has';
import { wrapNative } from './support/util';
import { forOf, isArrayLike, isIterable, Iterable } from './iterator';
import { MAX_SAFE_INTEGER as maxSafeInteger } from './number';

export interface MapCallback<T, U> {
	/**
	 * A callback function when mapping
	 *
	 * @param element The element that is currently being mapped
	 * @param index The current index of the element
	 */
	(element: T, index: number): U;
}

export interface FindCallback<T> {
	/**
	 * A callback function when using find
	 *
	 * @param element The element that is currenty being analysed
	 * @param index The current index of the element that is being analysed
	 * @param array The source array
	 */
	(element: T, index: number, array: ArrayLike<T>): boolean;
}

interface WritableArrayLike<T> {
	readonly length: number;
	[n: number]: T;
}

/**
 * Ensures a non-negative, non-infinite, safe integer.
 *
 * @param length The number to validate
 * @return A proper length
 */
function toLength(length: number): number {
	length = Number(length);
	if (isNaN(length)) {
		return 0;
	}
	if (isFinite(length)) {
		length = Math.floor(length);
	}
	// Ensure a non-negative, real, safe integer
	return Math.min(Math.max(length, 0), maxSafeInteger);
}

/**
 * From ES6 7.1.4 ToInteger()
 *
 * @param value A value to convert
 * @return An integer
 */
function toInteger(value: any): number {
	value = Number(value);
	if (isNaN(value)) {
		return 0;
	}
	if (value === 0 || !isFinite(value)) {
		return value;
	}

	return (value > 0 ? 1 : -1) * Math.floor(Math.abs(value));
}

/**
 * Normalizes an offset against a given length, wrapping it if negative.
 *
 * @param value The original offset
 * @param length The total length to normalize against
 * @return If negative, provide a distance from the end (length); otherwise provide a distance from 0
 */
function normalizeOffset(value: number, length: number): number {
	return value < 0 ? Math.max(length + value, 0) : Math.min(value, length);
}

/**
 * A namespace that contains the polyfilled functionality that is then exported below, depending on if
 * the functionality is required or not.
 */
export namespace Shim {
	export function from(this: ArrayConstructor, arrayLike: Iterable<any> | ArrayLike<any>, mapFunction?: MapCallback<any, any>, thisArg?: any): Array<any> {
		if (arrayLike == null) {
			throw new TypeError('from: requires an array-like object');
		}

		if (mapFunction && thisArg) {
			mapFunction = mapFunction.bind(thisArg);
		}

		/* tslint:disable-next-line:variable-name */
		const Constructor = this;
		const length: number = toLength((<any> arrayLike).length);
		// Support extension
		const array: any[] = (typeof Constructor === 'function') ? <any[]> Object(new Constructor(length)) : new Array(length);

		if (!isArrayLike(arrayLike) && !isIterable(arrayLike)) {
			return array;
		}

		let i = 0;
		forOf(arrayLike, function (value): void {
			array[i] = mapFunction ? mapFunction(value, i) : value;
			i++;
		});

		if ((<any> arrayLike).length !== undefined) {
			array.length = length;
		}

		return array;
	}

	export function of<T>(...items: T[]): Array<T> {
		return Array.prototype.slice.call(items);
	}

	export function copyWithin<T>(target: ArrayLike<T>, offset: number, start: number, end?: number): ArrayLike<T> {
		if (target == null) {
			throw new TypeError('copyWithin: target must be an array-like object');
		}

		const length = toLength(target.length);
		offset = normalizeOffset(toInteger(offset), length);
		start = normalizeOffset(toInteger(start), length);
		end = normalizeOffset(end === undefined ? length : toInteger(end), length);
		let count = Math.min(end - start, length - offset);

		let direction = 1;
		if (offset > start && offset < (start + count)) {
			direction = -1;
			start += count - 1;
			offset += count - 1;
		}

		while (count > 0) {
			if (start in target) {
				(target as WritableArrayLike<T>)[offset] = target[start];
			}
			else {
				delete (target as WritableArrayLike<T>)[offset];
			}

			offset += direction;
			start += direction;
			count--;
		}

		return target;
	}

	export function fill<T>(target: ArrayLike<T>, value: any, start?: number, end?: number): ArrayLike<T> {
		const length = toLength(target.length);
		let i = normalizeOffset(toInteger(start), length);
		end = normalizeOffset(end === undefined ? length : toInteger(end), length);

		while (i < end) {
			(target as WritableArrayLike<T>)[i++] = value;
		}

		return target;
	}

	export function find<T>(target: ArrayLike<T>, callback: FindCallback<T>, thisArg?: {}): T | undefined {
		const index = findIndex<T>(target, callback, thisArg);
		return index !== -1 ? target[index] : undefined;
	}

	export function findIndex<T>(target: ArrayLike<T>, callback: FindCallback<T>, thisArg?: {}): number {
		const length = toLength(target.length);

		if (!callback) {
			throw new TypeError('find: second argument must be a function');
		}

		if (thisArg) {
			callback = callback.bind(thisArg);
		}

		for (let i = 0; i < length; i++) {
			if (callback(target[i], i, target)) {
				return i;
			}
		}

		return -1;
	}

	export function includes<T>(target: ArrayLike<T>, searchElement: T, fromIndex: number = 0): boolean {
		let len = toLength(target.length);

		for (let i = fromIndex; i < len; ++i) {
			const currentElement = target[i];
			if (searchElement === currentElement ||
				(searchElement !== searchElement && currentElement !== currentElement)) {
				return true;
			}
		}

		return false;
	}
}

/* ES6 Array static methods */

export interface From {
	/**
	 * The Array.from() method creates a new Array instance from an array-like or iterable object.
	 *
	 * @param source An array-like or iterable object to convert to an array
	 * @param mapFunction A map function to call on each element in the array
	 * @param thisArg The execution context for the map function
	 * @return The new Array
	 */
	<T, U>(source: ArrayLike<T> | Iterable<T>, mapFunction: MapCallback<T, U>, thisArg?: any): Array<U>;

	/**
	 * The Array.from() method creates a new Array instance from an array-like or iterable object.
	 *
	 * @param source An array-like or iterable object to convert to an array
	 * @return The new Array
	 */
	<T>(source: ArrayLike<T> | Iterable<T>): Array<T>;
}

export const from: From = has('es6-array-from')
	? (<any> Array).from
	: Shim.from;

/**
 * Creates a new array from the function parameters.
 *
 * @param arguments Any number of arguments for the array
 * @return An array from the given arguments
 */
export const of: <T>(...items: T[]) => Array<T> = has('es6-array-of')
	? (<any> Array).of
	: Shim.of;

/* ES6 Array instance methods */

/**
 * Copies data internally within an array or array-like object.
 *
 * @param target The target array-like object
 * @param offset The index to start copying values to; if negative, it counts backwards from length
 * @param start The first (inclusive) index to copy; if negative, it counts backwards from length
 * @param end The last (exclusive) index to copy; if negative, it counts backwards from length
 * @return The target
 */
export const copyWithin: <T>(target: ArrayLike<T>, offset: number, start: number, end?: number) => ArrayLike<T> = has('es6-array-copywithin')
	? wrapNative((<any> Array.prototype).copyWithin)
	: Shim.copyWithin;

/**
 * Fills elements of an array-like object with the specified value.
 *
 * @param target The target to fill
 * @param value The value to fill each element of the target with
 * @param start The first index to fill
 * @param end The (exclusive) index at which to stop filling
 * @return The filled target
 */
export const fill: <T>(target: ArrayLike<T>, value: T, start?: number, end?: number) => ArrayLike<T> = has('es6-array-fill')
	? wrapNative((<any> Array.prototype).fill)
	: Shim.fill;

/**
 * Finds and returns the first instance matching the callback or undefined if one is not found.
 *
 * @param target An array-like object
 * @param callback A function returning if the current value matches a criteria
 * @param [thisArg] The execution context for the find function
 * @return The first element matching the callback, or undefined if one does not exist
 */
export const find: <T>(target: ArrayLike<T>, callback: FindCallback<T>, thisArg?: {}) => T = has('es6-array-find')
	? wrapNative((<any> Array.prototype).find)
	: Shim.find;

/**
 * Performs a linear search and returns the first index whose value satisfies the passed callback,
 * or -1 if no values satisfy it.
 *
 * @param target An array-like object
 * @param callback A function returning true if the current value satisfies its criteria
 * @param [thisArg] The execution context for the find function
 * @return The first index whose value satisfies the passed callback, or -1 if no values satisfy it
 */
export const findIndex: <T>(target: ArrayLike<T>, callback: FindCallback<T>, thisArg?: {}) => number = has('es6-array-findindex')
	? wrapNative((<any> Array.prototype).findIndex)
	: Shim.findIndex;

/* ES7 Array instance methods */

/**
 * Determines whether an array includes a given value
 *
 * @param target the target array-like object
 * @param searchElement the item to search for
 * @param fromIndex the starting index to search from
 * @return `true` if the array includes the element, otherwise `false`
 */
export const includes: <T>(target: ArrayLike<T>, searchElement: T, fromIndex?: number) => boolean = has('es7-array-includes')
	? wrapNative((<any> Array.prototype).includes)
	: Shim.includes;
