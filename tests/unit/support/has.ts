import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { exists } from '../../../src/support/has';

registerSuite({
	name: 'support/has',

	'features defined'() {
		[
			'dom-mutationobserver',
			'es6-array',
			'es6-array-fill',
			'es6-map',
			'es6-math',
			'es6-math-imul',
			'es6-object',
			'es-observable',
			'es6-promise',
			'es6-set',
			'es6-string',
			'es6-string-raw',
			'es6-symbol',
			'es6-weakmap',
			'es7-array',
			'es7-object',
			'es7-string',
			'microtasks',
			'postmessage',
			'raf',
			'setimmediate'
		].forEach((feature) => assert.isTrue(exists(feature)));
	}
});
