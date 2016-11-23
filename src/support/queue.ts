import { Handle } from 'dojo-interfaces/core';
import global from './global';
import has from './has';

export interface QueueItem {
	isActive: boolean;
	readonly callback: (...args: any[]) => any;
}

interface PostMessageEvent extends Event {
	readonly source: any;
	readonly data: string;
}

/**
 * Executes a task
 * @param item The task to execute
 */
function executeTask(item: QueueItem | undefined): void {
	if (item && item.isActive) {
		item.callback();
	}
}

/**
 * Get a handle to be able to remove an item from the queue
 */
function getQueueHandle(item: QueueItem | undefined, destructor?: (...args: any[]) => any): Handle {
	return {
		destroy: function (this: any) {
			this.destroy = function () {};
			if (item) {
				item.isActive = false;
			}
			if (destructor) {
				destructor();
			}
		}
	};
}

const microTasks: QueueItem[] = [];
let microTaskQueued = false;
let checkMicroTaskQueue: () => void = function () {};

/**
 * Schedules a callback to the macrotask queue.
 *
 * @param callback the function to be queued and later executed.
 * @returns An object with a `destroy` method that, when called, prevents the registered callback from executing.
 */
export const queueTask = (function() {
	let destructor: (...args: any[]) => any;
	let enqueue: (item: QueueItem) => void;

	/* IE and Edge's setImmediate does not always resolve as a macro task, sometimes as a microtask */
	if (has('postmessage')) {
		const queue: QueueItem[] = [];

		addEventListener('message', function (event: PostMessageEvent): void {
			// Confirm that the event was triggered by the current window and by this particular implementation.
			if (event.source === global && event.data === 'dojo-queue-message') {
				event.stopPropagation();

				if (queue.length) {
					executeTask(queue.shift());
				}
			}
		});

		enqueue = function (item: QueueItem): void {
			queue.push(item);
			postMessage('dojo-queue-message', '*');
		};
	}
	else if (has('setimmediate')) {
		destructor = clearImmediate;
		enqueue = function (item: QueueItem): any {
			return setImmediate(executeTask.bind(null, item));
		};
	}
	else {
		destructor = clearTimeout;
		enqueue = function (item: QueueItem): any {
			return setTimeout(executeTask.bind(null, item), 0);
		};
	}

	function queueTask(callback: (...args: any[]) => any): Handle {
		const item: QueueItem = {
			isActive: true,
			callback: callback
		};
		const id: any = enqueue(item);

		return getQueueHandle(item, destructor && function () {
			destructor(id);
		});
	};

	// TODO: Use aspect.before when it is available.
	return has('microtasks') ? queueTask : function (callback: (...args: any[]) => any): Handle {
		checkMicroTaskQueue();
		return queueTask(callback);
	};
})();

checkMicroTaskQueue = !has('microtasks')
	? function () {
		if (!microTaskQueued) {
			microTaskQueued = true;
			queueTask(function () {
				microTaskQueued = false;

				if (microTasks.length) {
					let item: QueueItem | undefined;
					while (item = microTasks.shift()) {
						executeTask(item);
					}
				}
			});
		}
	} : checkMicroTaskQueue;

/**
 * Schedules a callback to the microtask queue.
 *
 * Any callbacks registered with `queueMicroTask` will be executed before the next macrotask. If no native
 * mechanism for scheduling macrotasks is exposed, then any callbacks will be fired before any macrotask
 * registered with `queueTask` or `queueAnimationTask`.
 *
 * @param callback the function to be queued and later executed.
 * @returns An object with a `destroy` method that, when called, prevents the registered callback from executing.
 */
export const queueMicroTask = (function () {
	let enqueue: (item: QueueItem) => void;

	if (has('host-node')) {
		enqueue = function (item: QueueItem): void {
			process.nextTick(executeTask.bind(null, item));
		};
	}
	/* Edge's Promise does not consitently resolve as a microtask, therefore not using Promise */
	else if (has('es6-promise') && !has('setimmediate') && !has('host-node')) {
		enqueue = function (item: QueueItem): void {
			global.Promise.resolve(item).then(executeTask);
		};
	}
	else if (has('dom-mutationobserver')) {
		/* tslint:disable-next-line:variable-name */
		const HostMutationObserver = global.MutationObserver || global.WebKitMutationObserver;
		const node = document.createElement('div');
		const queue: QueueItem[] = [];
		const observer = new HostMutationObserver(function (): void {
			while (queue.length > 0) {
				const item = queue.shift();
				if (item && item.isActive) {
					item.callback();
				}
			}
		});

		observer.observe(node, { attributes: true });

		enqueue = function (item: QueueItem): void {
			queue.push(item);
			node.setAttribute('queueStatus', '1');
		};
	}
	else {
		enqueue = function (item: QueueItem): void {
			checkMicroTaskQueue();
			microTasks.push(item);
		};
	}

	return function (callback: (...args: any[]) => any): Handle {
		const item: QueueItem = {
			isActive: true,
			callback: callback
		};

		enqueue(item);

		return getQueueHandle(item);
	};
})();
