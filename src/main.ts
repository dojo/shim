// import TS helpers
import './tslib';

// import our polyfills
`!has('es6-promise')`;
import './Promise';

`!has('es6-symbol')`;
import './Symbol';

`!has('es6-map')`;
import './Map';

`!has('es6-weakmap')`;
import './WeakMap';

`!has('es6-set')`;
import './Set';

`!has('es6-math')`;
import './math';

`!has('es6-array', 'es6-array-fill')`;
import './array';

`!has('es6-string', 'es6-string-raw')`;
import './string';

`!has('es6-object')`;
import './object';

// import 3rd party polyfills
`!has('pointer-events')`;
import 'pepjs';

`!has('intersection-observer')`;
import 'intersection-observer';
