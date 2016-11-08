import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

registerSuite({
	'Async/Await with Bluebird'(this: any) {
		return this.remote
			.get((<any> require).toUrl('./bluebird.html'))
			.sleep(1000)
			.execute(() => {
				return (<any> window).callbackValue;
			})
			.then((callbackValue: number) => {
				assert.equal(callbackValue, 42);
			});
	},

	'Async/Await with Dojo'(this: any) {
		return this.remote
			.get((<any> require).toUrl('./asyncAwait.html'))
			.sleep(1000)
			.execute(() => {
				return (<any> window).callbackValue;
			})
			.then((callbackValue: number) => {
				assert.equal(callbackValue, 42);
			});
	},

	'Async/Await with Bluebird and Dojo'(this: any) {
		return this.remote
			.get((<any> require).toUrl('./bluebirdAndDojo.html'))
			.sleep(1000)
			.execute(() => {
				return (<any> window).callbackValue;
			})
			.then((callbackValue: number) => {
				assert.equal(callbackValue, 42);
			});
	}
});
