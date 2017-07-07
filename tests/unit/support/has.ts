import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { exists } from '../../../src/support/has';

registerSuite({
	name: 'support/has',

	'features defined'() {
		[
			'dom-mutationobserver',
			'es6-array',
			'es6-object',
			'es6-array-fill',
			'es6-string',
			'es6-string-raw',
			'es6-promise',
			'es6-set',
			'es6-map',
			'es6-weakmap',
			'es6-symbol',
			'es7-array',
			'es7-object',
			'es7-string',
			'microtasks',
			'postmessage',
			'setimmediate'
		].forEach((feature) => assert.isTrue(exists(feature)));
	}
});
