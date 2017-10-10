const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import pollUntil from '@theintern/leadfoot/helpers/pollUntil';

registerSuite('AMD Util', {
	'Utility injects dependencies if they are not present'() {
		return this.remote
			.get('/_build/tests/functional/amd.html?q=' + encodeURIComponent(JSON.stringify({})))
			.then(pollUntil(function () {
				return (<any> window).config;
			}, undefined, 5000), undefined)
			.then((config: any) => {
				assert.lengthOf(config.packages, 5);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'pepjs'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'tslib'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'intersection-observer'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === '@dojo'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'existingPackage'), 1);
			});
	},
	'Utility does not inject dependency if it already exists'() {
		return this.remote
			.get('/_build/tests/functional/amd.html?q=' + encodeURIComponent(JSON.stringify({
				packages: [
					{ name: 'existingPackage' }
				]
			})))
			.then(pollUntil(function () {
				return (<any> window).config;
			}, undefined, 5000), undefined)
			.then((config: any) => {
				const pepjs = config.packages.filter((p: any) => p.name === 'pepjs');

				assert.lengthOf(pepjs, 1);
				assert.equal(pepjs[ 0 ].location, 'some-location');
			});
	}
});
