import global from '@dojo/shim/global';

`!has('dom-pointer-events')`;
import 'pepjs';

`!has('dom-intersection-observer')`;
import 'intersection-observer';

`!has('dom-webanimation')`;
import 'web-animations-js/web-animations-next-lite.min';

`!has('dom-resize-observer')`;
import ResizeObserver from 'resize-observer-polyfill';

if (ResizeObserver && !('ResizeObserver' in global)) {
	global.ResizeObserver = ResizeObserver;
}
