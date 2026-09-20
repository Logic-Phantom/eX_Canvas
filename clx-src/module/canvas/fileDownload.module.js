/************************************************
 * fileDownload.module.js
 * Created at 2026. 9. 20.
 *
 * eX-Canvas(Web Prototyper) - 서버 통신 없이 문자열을 파일로 내려받는 유틸리티.
 * 사용: var dl = cpr.core.Module.require("module/canvas/fileDownload");
 *       dl.downloadClx("sample", xmlString);
 ************************************************/

/**
 * 파일명으로 쓸 수 없는 문자를 제거한다.
 * @param {String} psName
 * @param {String} psFallback
 * @return {String}
 */
function sanitizeFileName(psName, psFallback) {
	var vsName = (psName == null ? "" : String(psName)).replace(/[\\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "");
	return vsName.length > 0 ? vsName : psFallback;
}

/**
 * 문자열을 Blob으로 만들어 브라우저 다운로드를 일으킨다.
 * @param {String} psFileName 확장자를 포함한 파일명
 * @param {String} psContent 파일 내용
 * @param {String} psMimeType 예: "application/xml;charset=utf-8"
 */
function downloadText(psFileName, psContent, psMimeType) {
	var voBlob = new Blob([psContent], {
		type : psMimeType || "text/plain;charset=utf-8"
	});

	// IE / 구 Edge
	if (window.navigator && window.navigator.msSaveOrOpenBlob) {
		window.navigator.msSaveOrOpenBlob(voBlob, psFileName);
		return;
	}

	var vsUrl = window.URL.createObjectURL(voBlob);
	var voAnchor = document.createElement("a");
	voAnchor.href = vsUrl;
	voAnchor.download = psFileName;
	voAnchor.style.display = "none";
	document.body.appendChild(voAnchor);
	voAnchor.click();

	// 클릭 직후 해제하면 일부 브라우저에서 다운로드가 취소되므로 지연 해제한다.
	window.setTimeout(function() {
		document.body.removeChild(voAnchor);
		window.URL.revokeObjectURL(vsUrl);
	}, 1000);
}

/**
 * CLX(XML) 문자열을 .clx 파일로 내려받는다.
 * @param {String} psAppName 확장자 없는 화면명
 * @param {String} psXml
 */
exports.downloadClx = function(psAppName, psXml) {
	downloadText(sanitizeFileName(psAppName, "prototype") + ".clx", psXml, "application/xml;charset=utf-8");
};

/**
 * 화면 스크립트(.js) 뼈대를 내려받는다.
 * @param {String} psAppName
 * @param {String} psScript
 */
exports.downloadJs = function(psAppName, psScript) {
	downloadText(sanitizeFileName(psAppName, "prototype") + ".js", psScript, "text/javascript;charset=utf-8");
};

/**
 * JSON AST를 내려받는다(디버깅·재현용).
 * @param {String} psAppName
 * @param {Object} poJson
 */
exports.downloadJson = function(psAppName, poJson) {
	downloadText(sanitizeFileName(psAppName, "prototype") + ".json", JSON.stringify(poJson, null, 2), "application/json;charset=utf-8");
};

/* 서버 저장 규약 : 본문 = clx + 구분선 + js (tools/DevServer.java · CanvasResultController 와 같다) */
var SAVE_SEPARATOR = "\n=====eX-Canvas-JS=====\n";

function contextPath() {
	var vsPath = window.location.pathname;
	var vnIdx = vsPath.indexOf("/ui/");
	return vnIdx > 0 ? vsPath.substring(0, vnIdx) : "";
}

function pad2(pnValue) {
	return (pnValue < 10 ? "0" : "") + pnValue;
}

/** 오늘 날짜 폴더명(yyyyMMdd) — 서버 저장과 같은 규칙. */
function dateFolder(poNow) {
	return "" + poNow.getFullYear() + pad2(poNow.getMonth() + 1) + pad2(poNow.getDate());
}

/** 같은 이름이 있을 때 붙이는 꼬리(_HHmmss) — 서버 저장과 같은 규칙. */
function timeSuffix(poNow) {
	return "_" + pad2(poNow.getHours()) + pad2(poNow.getMinutes()) + pad2(poNow.getSeconds());
}

/**
 * 저장 서버(/canvas/saveResult.do)가 살아 있고 소스 경로를 찾았는지 확인한다.
 * 파일을 쓰지 않는 GET 조회이므로 앱 로드 때 1회 부르면 된다.
 * @param {function(Object)} pfDone 가능하면 {dir, path}, 아니면 null
 */
exports.probeServer = function(pfDone) {
	var voXhr = new XMLHttpRequest();
	try {
		voXhr.open("GET", contextPath() + "/canvas/saveResult.do?probe=1", true);
		voXhr.setRequestHeader("X-Requested-With", "eX-Canvas");
	} catch (ex) {
		pfDone(null);
		return;
	}
	voXhr.timeout = 5000;
	voXhr.onreadystatechange = function() {
		if (voXhr.readyState != 4) {
			return;
		}
		var voResult = null;
		try {
			voResult = JSON.parse(voXhr.responseText);
		} catch (e) {
			voResult = null;
		}
		pfDone(voXhr.status >= 200 && voXhr.status < 300 && voResult != null && voResult.ok ? voResult : null);
	};
	try {
		voXhr.send();
	} catch (ex2) {
		pfDone(null);
	}
};

/**
 * 생성물을 프로젝트 소스 경로 아래 result/<실행 날짜>/ 에 저장한다(서버가 파일을 쓴다).
 * 브라우저는 디스크의 임의 경로에 쓸 수 없으므로 서버 엔드포인트가 필요하다.
 * @param {String} psAppName 확장자 없는 화면명
 * @param {String} psXml .clx 내용
 * @param {String} psScript .js 내용
 * @param {function({dir:String, name:String})} pfSuccess
 * @param {function(String)} pfError 서버가 없거나 저장 경로가 설정되지 않은 경우 등
 */
exports.saveToProject = function(psAppName, psXml, psScript, pfSuccess, pfError) {
	var voXhr = new XMLHttpRequest();
	voXhr.open("POST", contextPath() + "/canvas/saveResult.do?name=" + encodeURIComponent(sanitizeFileName(psAppName, "prototype")), true);
	voXhr.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
	voXhr.setRequestHeader("X-Requested-With", "eX-Canvas");
	voXhr.timeout = 15000;
	voXhr.onreadystatechange = function() {
		if (voXhr.readyState != 4) {
			return;
		}
		var voResult = null;
		try {
			voResult = JSON.parse(voXhr.responseText);
		} catch (e) {
			voResult = null;
		}
		if (voXhr.status >= 200 && voXhr.status < 300 && voResult != null && voResult.ok) {
			pfSuccess(voResult);
		} else {
			pfError(voResult != null && voResult.message ? voResult.message : "저장 서버에 연결하지 못했습니다(" + voXhr.status + ").");
		}
	};
	voXhr.send(psXml + SAVE_SEPARATOR + psScript);
};

/* ================================================================ 폴더에 직접 저장(File System Access API)
 *
 * 저장 서버가 없는 환경(스튜디오 내장 미리보기 · -Dexcanvas.src.dir 미설정 Tomcat)에서도
 * clx-src/result 를 한 번 지정해 두면 그 아래 <yyyyMMdd>/ 로 바로 쓴다.
 * 폴더 핸들은 IndexedDB 에 남겨 다음 실행에서도 다시 고르지 않는다(권한 확인만 다시 받는다).
 * Chrome · Edge 에서 동작하며, 안 되는 브라우저는 호출부가 브라우저 다운로드로 대체한다.
 */

var DB_NAME = "eX-Canvas";
var DB_STORE = "handle";
var DIR_KEY = "resultDir";

/** 이번 세션에서 확인한 폴더 핸들(권한은 별도) */
var moDirHandle = null;

function hasDirectoryPicker() {
	return typeof window.showDirectoryPicker == "function" && !!window.indexedDB;
}

function openDb(pfDone, pfFail) {
	var voReq;
	try {
		voReq = window.indexedDB.open(DB_NAME, 1);
	} catch (ex) {
		pfFail();
		return;
	}
	voReq.onupgradeneeded = function() {
		if (!voReq.result.objectStoreNames.contains(DB_STORE)) {
			voReq.result.createObjectStore(DB_STORE);
		}
	};
	voReq.onerror = pfFail;
	voReq.onblocked = pfFail;
	voReq.onsuccess = function() {
		pfDone(voReq.result);
	};
}

function readStoredHandle(pfDone) {
	openDb(function(poDb) {
		var voReq;
		try {
			voReq = poDb.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(DIR_KEY);
		} catch (ex) {
			poDb.close();
			pfDone(null);
			return;
		}
		voReq.onsuccess = function() {
			poDb.close();
			pfDone(voReq.result || null);
		};
		voReq.onerror = function() {
			poDb.close();
			pfDone(null);
		};
	}, function() {
		pfDone(null);
	});
}

function writeStoredHandle(poHandle) {
	openDb(function(poDb) {
		try {
			var voTx = poDb.transaction(DB_STORE, "readwrite");
			voTx.objectStore(DB_STORE).put(poHandle, DIR_KEY);
			voTx.oncomplete = function() {
				poDb.close();
			};
			voTx.onerror = function() {
				poDb.close();
			};
		} catch (ex) {
			poDb.close();
		}
	}, function() {
		// 저장소를 쓸 수 없으면 이번 세션에만 기억한다.
	});
}

function pickDirectory(pfSuccess, pfError) {
	var voPromise;
	try {
		voPromise = window.showDirectoryPicker({
			id : "excanvas-result",
			mode : "readwrite"
		});
	} catch (ex) {
		pfError("폴더 선택 창을 열지 못했습니다 : " + ex);
		return;
	}
	voPromise.then(function(poHandle) {
		moDirHandle = poHandle;
		writeStoredHandle(poHandle);
		pfSuccess(poHandle);
	}, function(poError) {
		pfError(poError && poError.name == "AbortError" ? "폴더 선택을 취소했습니다." : "폴더를 열지 못했습니다 : " + poError);
	});
}

exports.hasDirectoryPicker = hasDirectoryPicker;

/** 지금 지정된 저장 폴더 이름(없으면 빈 문자열) */
exports.savedDirectoryName = function() {
	return moDirHandle != null ? moDirHandle.name : "";
};

/**
 * 지난 실행에서 고른 폴더를 불러온다(클릭 없이 조회만 한다).
 * @param {function(Object)} pfDone {name, granted} 또는 null
 */
exports.preloadSaveDirectory = function(pfDone) {
	if (!hasDirectoryPicker()) {
		pfDone(null);
		return;
	}
	readStoredHandle(function(poHandle) {
		if (poHandle == null) {
			pfDone(null);
			return;
		}
		moDirHandle = poHandle;
		if (typeof poHandle.queryPermission != "function") {
			pfDone({
				name : poHandle.name,
				granted : false
			});
			return;
		}
		poHandle.queryPermission({
			mode : "readwrite"
		}).then(function(psState) {
			// 권한이 "prompt" 면 저장 버튼(사용자 제스처) 안에서 다시 요청한다.
			pfDone({
				name : poHandle.name,
				granted : psState == "granted"
			});
		}, function() {
			pfDone({
				name : poHandle.name,
				granted : false
			});
		});
	});
};

/**
 * 저장 폴더를 확보한다. 폴더 선택·권한 요청은 브라우저가 사용자 제스처를 요구하므로
 * 반드시 click 핸들러 안에서(비동기 작업보다 먼저) 호출해야 한다.
 * @param {boolean} pbForcePick 이미 지정돼 있어도 다시 고르게 한다
 * @param {function(Object)} pfSuccess 폴더 핸들
 * @param {function(String)} pfError
 */
exports.ensureSaveDirectory = function(pbForcePick, pfSuccess, pfError) {
	if (!hasDirectoryPicker()) {
		pfError("이 브라우저는 폴더에 바로 저장하는 기능을 지원하지 않습니다(Chrome · Edge 에서 됩니다).");
		return;
	}
	if (pbForcePick || moDirHandle == null || typeof moDirHandle.requestPermission != "function") {
		pickDirectory(pfSuccess, pfError);
		return;
	}
	var voHandle = moDirHandle;
	voHandle.requestPermission({
		mode : "readwrite"
	}).then(function(psState) {
		if (psState == "granted") {
			pfSuccess(voHandle);
		} else {
			// 권한을 거절했거나 폴더가 사라진 경우 → 다시 고르게 한다.
			pickDirectory(pfSuccess, pfError);
		}
	}, function() {
		pickDirectory(pfSuccess, pfError);
	});
};

function writeFileTo(poDir, psFileName, psContent) {
	return poDir.getFileHandle(psFileName, {
		create : true
	}).then(function(poFile) {
		return poFile.createWritable().then(function(poWritable) {
			return poWritable.write(psContent).then(function() {
				return poWritable.close();
			});
		});
	});
}

/**
 * 지정한 폴더 아래 <yyyyMMdd>/<화면명>.clx · .js 로 쓴다(서버 저장과 같은 규칙).
 * @param {Object} poDir ensureSaveDirectory 로 얻은 폴더 핸들
 * @param {String} psAppName 확장자 없는 화면명
 * @param {String} psXml
 * @param {String} psScript
 * @param {function({dir:String, name:String})} pfSuccess
 * @param {function(String)} pfError
 */
exports.saveToDirectory = function(poDir, psAppName, psXml, psScript, pfSuccess, pfError) {
	var vsName = sanitizeFileName(psAppName, "prototype");
	var voNow = new Date();
	var vsDate = dateFolder(voNow);

	poDir.getDirectoryHandle(vsDate, {
		create : true
	}).then(function(poDay) {
		// 같은 이름이 있으면 덮어쓰지 않고 _HHmmss 를 붙인다.
		return poDay.getFileHandle(vsName + ".clx", {
			create : false
		}).then(function() {
			return {
				day : poDay,
				name : vsName + timeSuffix(voNow)
			};
		}, function() {
			return {
				day : poDay,
				name : vsName
			};
		});
	}).then(function(voTarget) {
		return writeFileTo(voTarget.day, voTarget.name + ".clx", psXml).then(function() {
			return writeFileTo(voTarget.day, voTarget.name + ".js", psScript);
		}).then(function() {
			return voTarget;
		});
	}).then(function(voTarget) {
		pfSuccess({
			dir : poDir.name + "/" + vsDate,
			name : voTarget.name
		});
	}, function(poError) {
		pfError("폴더에 쓰지 못했습니다 : " + (poError && poError.message ? poError.message : poError));
	});
};

exports.downloadText = downloadText;
exports.sanitizeFileName = sanitizeFileName;
