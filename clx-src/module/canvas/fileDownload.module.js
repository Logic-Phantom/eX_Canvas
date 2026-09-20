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

exports.downloadText = downloadText;
exports.sanitizeFileName = sanitizeFileName;
