import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Observable from '../../src/Observable';
import Map from '../../src/Map';
import { queueMicroTask } from '../../src/support/queue';
import '../../src/Symbol';

registerSuite({
	name: 'Observable',

	'subscribe': {
		'observer'(this: any) {
			let dfd = this.async();

			let source = Observable.of(1, 2, 3);
			let startCalled = false;
			let nextCalled = false;
			let completeCalled = false;

			source.subscribe({
				start: () => {
					startCalled = true;
				},
				next: () => {
					nextCalled = true;
				},
				complete: () => {
					completeCalled = true;
				}
			});

			setTimeout(dfd.callback(() => {
				assert.isTrue(startCalled);
				assert.isTrue(nextCalled);
				assert.isTrue(completeCalled);
			}), 100);
		},
		'functions'(this: any) {
			let dfd = this.async();

			let source = Observable.of(1, 2, 3);
			let nextCalled = false;
			let completeCalled = false;

			source.subscribe(() => {
					nextCalled = true;
				},
				undefined,
				() => {
					completeCalled = true;
				}
			);

			setTimeout(dfd.callback(() => {
				assert.isTrue(nextCalled);
				assert.isTrue(completeCalled);
			}), 100);
		}
	},

	'creation': {
		'constructor': {
			'constructor'(this: any) {
				let dfd = this.async();

				let source = new Observable((observer) => {
					observer.next(1);
				});

				source.subscribe(dfd.callback((value: any) => {
					assert.strictEqual(value, 1);
				}));
			},
			'errors for bad subscriber function'() {
				assert.throws(() => {
					new Observable(<any> undefined);
				});

				assert.throws(() => {
					new Observable(<any> 'test');
				});
			},
			'thrown error during subscription'(this: any) {
				const dfd = this.async();
				const source = new Observable((observer) => {
					observer.next(1);
					throw new Error('error');
				});

				let values: any[] = [];

				source.subscribe((value: any) => {
					values.push(value);
				}, dfd.callback((error: Error) => {
					assert.deepEqual(values, [ 1 ]);
					assert.strictEqual(error.message, 'error');
				}), dfd.rejectOnError(() => {
					assert.fail('Should not have completed');
				}));
			},
			'manual error during subscription w/ error handler'(this: any) {
				const dfd = this.async();
				const source = new Observable((observer) => {
					observer.error(new Error('error'));
				});

				source.subscribe(dfd.rejectOnError(() => {
					assert.fail('should not have called next');
				}), dfd.callback((error: Error) => {
					assert.strictEqual(error.message, 'error');
				}), dfd.rejectOnError(() => {
					assert.fail('Should not have completed');
				}));
			},
			'manual error during subscription w/ completion handler'(this: any) {
				const dfd = this.async();
				const source = new Observable((observer) => {
					observer.error(new Error('error'));
				});

				source.subscribe(dfd.rejectOnError(() => {
					assert.fail('should not have called next');
				}), undefined, dfd.callback((error: Error) => {
					assert.strictEqual(error.message, 'error');
				}));
			}
		},
		'of': {
			'multiple values'(this: any) {
				let dfd = this.async();

				let source = Observable.of(1, 2, 3, 4);
				let allValues: any[] = [];

				let subscription = source.subscribe((value: any) => {
					allValues.push(value);
				}, undefined, dfd.callback(() => {
					assert.deepEqual(allValues, [ 1, 2, 3, 4 ]);
					assert.isTrue(subscription.closed);
				}));
			},

			'single value'(this: any) {
				let dfd = this.async();

				let source = Observable.of('test');
				let allValues: any[] = [];

				let subscription = source.subscribe((value: any) => {
					allValues.push(value);
				}, undefined, dfd.callback(() => {
					assert.deepEqual(allValues, [ 'test' ]);
					assert.isTrue(subscription.closed);
				}));
			}
		},

		'from': {
			'array'(this: any) {
				let dfd = this.async();

				let source = Observable.from([ 1, 2, 3 ]);
				let expectedValues = [ 1, 2, 3 ];
				let i = 0;

				let subscription = source.subscribe((value: any) => {
					assert.strictEqual(value, expectedValues[ i++ ]);
				}, undefined, dfd.callback(() => {
					assert.equal(i, 3);
					assert.isTrue(subscription.closed);
				}));
			},
			'iterable'(this: any) {
				let dfd = this.async();

				let map = new Map([
					[ 1, 'one' ],
					[ 2, 'two' ]
				]);

				let source = Observable.from(map.keys());
				let values: any[] = [];

				let subscription = source.subscribe((value: any) => {
					values.push(value);
				}, undefined, dfd.callback(() => {
					assert.deepEqual(values, [ 1, 2 ]);
					assert.isTrue(subscription.closed);
				}));
			},
			'Symbol.observable of Observable'(this: any) {
				let dfd = this.async();

				let original = Observable.of(1, 2, 3);
				let source = Observable.from(original);
				let values: any[] = [];

				source.subscribe((value: any) => {
					values.push(value);
				}, undefined, dfd.callback(() => {
					assert.deepEqual(values, [ 1, 2, 3 ]);
				}));
			},
			'Symbol.observable of something else'(this: any) {
				let dfd = this.async();

				let obj = {
					[Symbol.observable]: function () {
						return 'test';
					}
				};

				let source = Observable.from(obj);
				let values: any[] = [];

				source.subscribe((value: any) => {
					values.push(value);
				}, undefined, dfd.callback(() => {
					assert.deepEqual(values, [ 'test' ]);
				}));
			}
		},
		'next': {
			'normal'(this: any) {
				const dfd = this.async();
				const source = new Observable((observer) => {
					observer.next(1);
					observer.next(2);
				});

				let values: any[] = [];

				source.subscribe((value: any) => {
					values.push(value);
				}, dfd.rejectOnError(() => {
					assert.fail('Should not have errored');
				}), dfd.rejectOnError(() => {
					assert.fail('Should not have completed');
				}));

				setTimeout(dfd.callback(() => {
					assert.deepEqual(values, [ 1, 2 ]);
				}), 100);
			},

			'closed'(this: any) {
				const dfd = this.async();
				const source = new Observable((observer) => {
					observer.next(1);
					observer.complete();
					observer.next(2);
				});

				let values: any[] = [];

				source.subscribe((value: any) => {
					values.push(value);
				});

				setTimeout(dfd.callback(() => {
					assert.deepEqual(values, [ 1 ]);
				}), 100);
			},
			'thrown error in subscriber'(this: any) {
				const dfd = this.async();
				const source = Observable.of(1, 2, 3);

				source.subscribe(() => {
					throw new Error('error');
				}, dfd.callback((error: Error) => {
					assert.strictEqual(error.message, 'error');
				}), dfd.rejectOnError(() => {
					assert.fail('Should not have completed');
				}));
			}
		},
		'unsubscribe': {
			'with unsubscribe handler'(this: any) {
				let unsubscribed = false;
				const dfd = this.async();
				const source = new Observable((observer) => {
					queueMicroTask(() => {
						observer.next(0);

						queueMicroTask(() => {
							observer.next(1);

							queueMicroTask(() => {
								observer.next(2);
							});
						});
					});
					return () => {
						unsubscribed = true;
					};
				});

				let values: any[] = [];

				const subscription = source.subscribe((value: any) => {
					values.push(value);

					if (value === 1) {
						subscription.unsubscribe();
					}
				});

				setTimeout(dfd.callback(() => {
					assert.deepEqual(values, [ 0, 1 ]);
					assert.isTrue(unsubscribed);
				}), 100);
			},
			'without unsubscribe handler'(this: any) {
				const dfd = this.async();
				const source = new Observable((observer) => {
					queueMicroTask(() => {
						observer.next(0);

						queueMicroTask(() => {
							observer.next(1);

							queueMicroTask(() => {
								observer.next(2);
							});
						});
					});
				});

				let values: any[] = [];

				const subscription = source.subscribe((value: any) => {
					values.push(value);

					if (value === 1) {
						subscription.unsubscribe();
					}
				});

				setTimeout(dfd.callback(() => {
					assert.deepEqual(values, [ 0, 1 ]);
				}), 100);
			}
		},
		'subscribe': {
			'invalid observer'() {
				let source = Observable.of(1, 2);

				assert.throws(() => {
					source.subscribe(<any> undefined);
				});

				assert.throws(() => {
					source.subscribe(<any> 'test');
				});
			}
		}
	}
});
