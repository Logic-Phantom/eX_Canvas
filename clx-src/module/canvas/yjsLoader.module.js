/************************************************
 * yjsLoader.module.js
 * Created at 2026. 9. 20.
 *
 * eX-Canvas(Web Prototyper) - CRDT 라이브러리(Yjs · y-protocols/awareness)를
 * "공유" 를 켜는 순간에만 받아 온다(동적 import). 공유를 쓰지 않으면 네트워크를 타지 않는다.
 *
 * 두 패키지를 같은 CDN 에서 같은 yjs 버전(?deps=)으로 받는 것이 핵심이다.
 * 그래야 awareness 가 yjs 를 다시 번들링하지 않고 같은 인스턴스를 쓴다
 * (섞이면 Y.Doc instanceof 검사가 깨져 awareness 가 동작하지 않는다).
 *
 * 사내망처럼 esm.sh 를 못 여는 곳에서는 index.html 보다 먼저
 *   window.EXCANVAS_YJS_URL / window.EXCANVAS_YAWARENESS_URL 에 사본 주소를 넣어 두면 그쪽을 쓴다.
 ************************************************/

var DEFAULT_YJS_URL = "https://esm.sh/yjs@13.6.8";
var DEFAULT_AWARENESS_URL = "https://esm.sh/y-protocols@1.0.6/awareness?deps=yjs@13.6.8";

/** 한 번만 로드한다(두 번째부터는 같은 Promise 를 돌려준다). */
var moLoading = null;

function yjsUrl() {
	return window.EXCANVAS_YJS_URL || DEFAULT_YJS_URL;
}

function awarenessUrl() {
	return window.EXCANVAS_YAWARENESS_URL || DEFAULT_AWARENESS_URL;
}

/** 이미 창에 올라와 있는지(다른 화면이 먼저 올렸을 수도 있다). */
function isReady() {
	return !!(window.Y && window.Y.Doc && window.yProtocols && window.yProtocols.awarenessProtocol);
}

/**
 * Yjs · awareness 를 받아 window.Y · window.yProtocols 에 올린다.
 * @param {function()} pfDone 성공
 * @param {function(String)} pfFail 실패 사유(네트워크 차단 · CDN 오류 등)
 */
exports.load = function(pfDone, pfFail) {
	if (isReady()) {
		pfDone();
		return;
	}
	if (moLoading == null) {
		moLoading = Promise.all([
			import(yjsUrl()),
			import(awarenessUrl())
		]).then(function(paModules) {
			window.Y = paModules[0];
			window.yProtocols = {
				awarenessProtocol : paModules[1]
			};
			if (!isReady()) {
				throw new Error("받은 모듈에 Y.Doc · awarenessProtocol 이 없습니다.");
			}
		});
	}
	moLoading.then(function() {
		pfDone();
	}, function(poError) {
		moLoading = null; // 다음에 다시 시도할 수 있게 둔다.
		pfFail("CRDT 라이브러리를 받지 못했습니다 : " + (poError && poError.message ? poError.message : poError));
	});
};

exports.isReady = isReady;
exports.getSourceUrls = function() {
	return {
		yjs : yjsUrl(),
		awareness : awarenessUrl()
	};
};
