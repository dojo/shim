import { Iterable, forOf } from './iterator';
import { hasClass } from './support/decorators';
import global from './support/global';
import { queueMicroTask } from './support/queue';
import './Symbol';

/**
 * Handles an individual subscription to an Observable.
 */
export interface Subscription {
	/**
	 * Whether or not the subscription is closed. Closed subscriptions will not emit values.
	 */
	closed: boolean;

	/**
	 * A function to call to close the subscription. Calling this will call any associated tear down methods.
	 */
	unsubscribe: (() => void);
}

/**
 * Handles events emitted from the subscription
 */
export interface Observer<T> {
	/**
	 * Called to handle a single emitted event.
	 *
	 * @param {T} value    The value that was emitted.
	 */
	next(value: T): void;

	/**
	 * An optional method to be called when the subscription starts (before any events are emitted).
	 * @param observer
	 */
	start?(observer: SubscriptionObserver<T>): void;

	/**
	 * An optional method to be called if an error occurs during subscription or handling.
	 *
	 * @param errorValue    The error
	 */
	error?(errorValue: any): void;

	/**
	 * An optional method to be called when the subscription is completed (unless an error occurred and the error method was specified)
	 *
	 * @param completeValue    The value passed to the completion method.
	 */
	complete?(completeValue?: any): void;
}

/**
 * An object used to control a single subscription and an observer.
 */
export interface SubscriptionObserver<T> {
	/**
	 * Whether or not the subscription is closed.
	 */
	readonly closed: boolean;

	/**
	 * Emit an event to the observer.
	 *
	 * @param value    The value to be emitted.
	 */
	next(value: T): void;

	/**
	 * Report an error. The subscription will be closed after an error has occurred.
	 *
	 * @param errorValue    The error to be reported.
	 */
	error(errorValue: any): void;

	/**
	 * Report completion of the subscription. The subscription will be closed, and no new values will be emitted,
	 * after completion.
	 *
	 * @param completeValue?    A value to pass to the completion handler.
	 */
	complete(completeValue?: any): void;
}

export interface Subscriber<T> {
	(observer: SubscriptionObserver<T>): (() => void) | void;
}

/**
 * An object that implements a Symbol.observerable method.
 */
export interface ObservableObject {
	[Symbol.observable]: () => any;
}

/**
 * Determine if an object is Observable
 * @param item    The item to check
 *
 * @return {boolean}    true if the item is Observable
 */
export function isObservable(item: any): item is ObservableObject {
	return item && typeof item[ Symbol.observable ] === 'function';
}

namespace Shim {
	export class ShimSubscriptionObserver<T> implements SubscriptionObserver<T> {
		private _closed: boolean;
		private _observer: Observer<T>;
		private _closer: any;

		constructor(observer: Observer<T>) {
			this._observer = observer;
			this._closer = null;
		}

		get closed() {
			return this._closed;
		}

		start(executor: Subscriber<T>) {
			if (this._observer.start) {
				this._observer.start(this);
			}

			try {
				this._closer = executor(this);
			}
			catch (e) {
				this.error(e);
				return;
			}
		}

		next(value: T): void {
			if (this.closed) {
				return;
			}

			try {
				this._observer.next(value);
			}
			catch (e) {
				this.error(e);
			}
		}

		unsubscribe() {
			this._closed = true;
			if (this._closer) {
				this._closer();
			}
		}

		complete(completeValue?: any) {
			if (!this._closed) {
				this._closed = true;

				this.unsubscribe();

				if (this._observer.complete) {
					this._observer.complete(completeValue);
				}
			}
		}

		error(errorValue?: any) {
			this.unsubscribe();

			if (this._observer.error) {
				this._observer.error(errorValue);
			} else if (this._observer.complete) {
				this._observer.complete(errorValue);
			}
			else {
				throw errorValue;
			}
		}

		get subscription(): Subscription {
			const self = this;

			return {
				get closed() {
					return self.closed;
				},

				unsubscribe() {
					self.unsubscribe();
				}
			};
		}
	}

	export class ShimObservable<T> implements Observable<T> {
		private _executor: Subscriber<T>;

		[Symbol.observable](): Observable<T> {
			return this;
		}

		constructor(subscriber: Subscriber<T>) {
			if (typeof subscriber !== 'function') {
				throw new TypeError('subscriber is not a function');
			}

			this._executor = subscriber;
		}

		subscribe(onNext: (value: T) => void, onError?: (error: any) => void, onComplete?: () => void): Subscription;
		subscribe(observer: Observer<T>): Subscription;
		subscribe(observerOrNext: any, onError?: (error: any) => void, onComplete?: () => void): Subscription {
			let observer: Observer<T> = <Observer<T>> observerOrNext;

			if (!observerOrNext) {
				throw new TypeError('parameter must be a function or an observer');
			}

			if (typeof observerOrNext === 'function') {
				observer = {
					next: observerOrNext,
					error: onError,
					complete: onComplete
				};
			} else if (!observer.next && !observer.error && !observer.start && !observer.complete) {
				throw new TypeError('observer must implement at least next, error, start, or complete handler');
			}

			const subscriptionObserver = new ShimSubscriptionObserver(observer);

			queueMicroTask(() => {
				subscriptionObserver.start(this._executor);
			});

			return subscriptionObserver.subscription;
		}

		static of<U>(...items: U[]): ShimObservable<U> {
			return new this((observer: SubscriptionObserver<U>) => {
				forOf(items, (o: any) => {
					observer.next(o);
				});
				observer.complete();
			});
		}

		static from<U>(item: Iterable<U> | ArrayLike<U> | Observable<U>): ShimObservable<U> {
			if (isObservable(item)) {
				const result: any = item[ Symbol.observable ]();

				if (result instanceof ShimObservable) {
					return result;
				} else {
					return this.of<U>(result);
				}
			}
			else {
				return new this((observer: SubscriptionObserver<U>) => {
					forOf(item, (o: any) => {
						observer.next(o);
					});
					observer.complete();
				});
			}
		}
	}
}

@hasClass('es-observable', global.Observable, Shim.ShimObservable)
export default class Observable<T> implements ObservableObject {

	/* istanbul ignore next */
	/**
	 * Create a new observerable with a subscriber function. The subscriber function will get called with a
	 * SubscriptionObserver parameter for controlling the subscription.  I a function is returned, it will be
	 * run when the subscription is complete.
	 *
	 * @param {Subscriber<T>} subscriber    The subscription function to be called when observers are subscribed
	 *
	 * @example
	 * const source = new Observer<number>((observer) => {
	 *     observer.next(1);
	 *     observer.next(2);
	 *     observer.next(3);
	 * });
	 */
	constructor(subscriber: Subscriber<T>) {
	}

	/**
	 * Registers handlers for handling emitted values, error and completions from the observable, and
	 * executes the observable's subscriber function, which will take action to set up the underlying data stream.
	 *
	 * @param {Observer<T>} observer    The observer object that will handle events
	 *
	 * @return {Subscription} A Subscription object that can be used to manage the subscription.
	 */
	subscribe(observer: Observer<T>): Subscription;

	/**
	 * Registers handlers for handling emitted values, error and completions from the observable, and
	 * executes the observable's subscriber function, which will take action to set up the underlying data stream.
	 *
	 * @param onNext        A function to handle an emitted value. Value is passed in as the first parameter to the function.
	 * @param onError?        A function to handle errors that occur during onNext, or during subscription.
	 * @param onComplete?    A function that gets called when the subscription is complete, and will not send any more values. This function will also get called if an error occurs and onError is not defined.
	 *
	 * @return {Subscription} A Subscription object that can be used to manage the subscription.
	 */
	subscribe(onNext: (value: T) => void, onError?: (error: any) => void, onComplete?: () => void): Subscription;
	/* istanbul ignore next */
	subscribe(observerOrNext: any, onError?: (error: any) => void, onComplete?: () => void): Subscription {
		throw new Error();
	}

	/* istanbul ignore next */
	/**
	 * Create an Observable from a list of values.
	 *
	 * @param {...T} items The values to be emitted
	 *
	 * @return {Observable<T>}    An Observable that will emit the specified values
	 *
	 * @example
	 *
	 * let source = Observable.of(1, 2, 3);
	 *
	 * // will emit three separate values, 1, 2, and 3.
	 */
	static of<T>(...items: T[]): Observable<T> {
		throw new Error();
	}

	/* istanbul ignore next */
	/**
	 * Create an Observable from another object. If the object is in itself Observable, the object will be returned.
	 * Otherwise, the value will be wrapped in an Observable. If the object is iterable, an Observable will be created
	 * that emits each item of the iterable.
	 *
	 * @param {Iterable<T> | ArrayLike<T> | ObservableObject} item The item to be turned into an Observable
	 *
	 * @return {Observable<T>}    An observable for the item you passed in
	 */
	static from<T>(item: Iterable<T> | ArrayLike<T> | ObservableObject): Observable<T> {
		throw new Error();
	}

	/* istanbul ignore next */
	[Symbol.observable](): any {
		throw new Error();
	}
}
