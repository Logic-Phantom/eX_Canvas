/************************************************
 * imagePlanner.module.js
 * Created at 2026. 9. 22.
 *
 * eX-Canvas(Web Prototyper) - 화면 이미지(캡처 · 디자인 시안 · 손그림) → Gemini 비전 → 캔버스 항목.
 *
 * 흐름
 *   analyzeFile(file, opt) 경로를 정한다 — 서버 업로드(analyzeUpload · 기본) 또는 브라우저 직접(readImage → analyze).
 *   analyzeUpload(file)    이미지 파일을 multipart 로 서버(/canvas/analyzeImage.do)에 올린다(eXConverter-AI 방식).
 *                          키 · 축소 · 호출 · 재시도 · 로그는 서버(CanvasImageAnalyzer)가 맡는다.
 *   readImage(file)        브라우저에서 이미지를 읽어 크기를 줄이고(긴 변 1600px) base64 로 만든다(직접 호출용).
 *   analyze(image, opt)    Gemini 에 이미지를 보내 "보이는 UI 요소 목록(JSON)" 을 받는다(직접 호출용).
 *                          요소 = { type(컨트롤 유형), text, box[ymin,xmin,ymax,xmax](0~1000), style, required }
 *                          + pattern(가장 비슷한 템플릿) · title(화면 제목) · reason
 *   toCanvasItems(plan, image, canvas)
 *                          이미지 좌표를 캔버스 좌표로 옮긴다. 가로는 캔버스 폭에 맞춰 비례로, 세로는 "줄 단위" 로
 *                          다시 잰다(입력·버튼 줄은 24px, 그리드 같은 큰 영역은 남는 높이를 나눠 쓴다).
 *                          → 이미지의 배치(위·아래·좌우)는 그대로 살고, 줄은 캔버스 격자에 맞는 크기가 된다.
 *
 * 설계 원칙
 *  - AI 는 "무엇이 어디에 있는지" 만 말한다. 조회 조건·구획·하단 버튼 같은 해석은 좌표 규칙(templatePlanner.planByRule)이
 *    캔버스에 그린 것과 똑같이 한다 → 손으로 그린 캔버스와 이미지에서 온 캔버스가 같은 길을 간다.
 *  - 스타일은 테마 클래스로만 옮긴다(인라인 스타일 없음). 버튼은 primary / secondary 계열만 구분해 두고
 *    실제 클래스(btn-primary-01 · btn-secondary-03 …)는 내보낼 때 자리(조회 · 제목 줄 · 하단)에 맞춰 정한다.
 *    라벨의 필수 표시는 글자 끝 "*" 로 남겨 규칙 기반 변환이 `label required` 로 읽게 한다.
 ************************************************/

/** 전송 전 이미지의 긴 변 상한(px). 이보다 크면 줄인다(토큰 · 전송량). */
var MAX_EDGE = 1600;
/** PNG 데이터 URL 이 이보다 길면 JPEG 로 바꾼다(약 1.9MB). */
var MAX_DATA_URL = 2500000;
/** 비전 호출 제한 시간 */
var TIMEOUT_MS = 90000;

/** 캔버스 격자와 같은 값(templatePlanner.SK 와 맞춘다) */
var MARGIN = 20;
var ROW_HEIGHT = 24;
var MIN_WIDTH = 40;
var MIN_CANVAS_WIDTH = 640;
var MIN_CANVAS_HEIGHT = 420;

var STYLES = ["primary", "secondary", "default"];

function registry() {
	return cpr.core.Module.require("module/canvas/controlRegistry");
}

/* ---------------------------------------------------------------- 이미지 읽기 */

/**
 * 이미지 파일인가(브라우저가 MIME 을 못 채우는 경우는 확장자로 본다).
 * @param {File} poFile
 */
exports.isImageFile = function(poFile) {
	if (poFile == null) {
		return false;
	}
	if (/^image\/(png|jpeg|jpg|gif|webp|bmp)$/i.test(poFile.type || "")) {
		return true;
	}
	return /\.(png|jpe?g|gif|webp|bmp)$/i.test(poFile.name || "");
};

/**
 * 파일을 읽어 전송용 이미지로 만든다(긴 변 1600px 이하 · PNG, 크면 JPEG).
 * @param {File} poFile
 * @param {function(Object)} pfDone { mimeType, data(base64), width, height, name }
 * @param {function(String)} pfError
 */
exports.readImage = function(poFile, pfDone, pfError) {
	var vsUrl;
	try {
		vsUrl = window.URL.createObjectURL(poFile);
	} catch (e) {
		pfError("이미지를 열지 못했습니다 : " + e.message);
		return;
	}
	var voImg = new Image();
	voImg.onload = function() {
		window.URL.revokeObjectURL(vsUrl);
		try {
			var vnScale = Math.min(1, MAX_EDGE / Math.max(1, voImg.naturalWidth, voImg.naturalHeight));
			var vnWidth = Math.max(1, Math.round(voImg.naturalWidth * vnScale));
			var vnHeight = Math.max(1, Math.round(voImg.naturalHeight * vnScale));
			var voCanvas = document.createElement("canvas");
			voCanvas.width = vnWidth;
			voCanvas.height = vnHeight;
			var voCtx = voCanvas.getContext("2d");
			voCtx.fillStyle = "#ffffff"; // 투명 PNG 는 흰 바탕에 올린다(JPEG 로 바꿀 때 검게 되지 않도록).
			voCtx.fillRect(0, 0, vnWidth, vnHeight);
			voCtx.drawImage(voImg, 0, 0, vnWidth, vnHeight);
			var vsMime = "image/png";
			var vsData = voCanvas.toDataURL(vsMime);
			if (vsData.length > MAX_DATA_URL) {
				vsMime = "image/jpeg";
				vsData = voCanvas.toDataURL(vsMime, 0.9);
			}
			pfDone({
				mimeType : vsMime,
				data : vsData.substring(vsData.indexOf(",") + 1),
				width : vnWidth,
				height : vnHeight,
				originalWidth : voImg.naturalWidth,
				originalHeight : voImg.naturalHeight,
				name : poFile.name || "image"
			});
		} catch (e) {
			pfError("이미지를 변환하지 못했습니다 : " + e.message);
		}
	};
	voImg.onerror = function() {
		window.URL.revokeObjectURL(vsUrl);
		pfError("이미지를 읽지 못했습니다(지원하지 않는 형식) : " + (poFile.name || ""));
	};
	voImg.src = vsUrl;
};

/* ---------------------------------------------------------------- 응답 스키마 · 프롬프트 */

function S(psType, poMore) {
	var vo = {
		type : psType
	};
	for (var vsKey in (poMore || {})) {
		vo[vsKey] = poMore[vsKey];
	}
	return vo;
}

function buildResponseSchema(paPatternIds, paTypeIds) {
	var voItem = S("OBJECT", {
		properties : {
			type : S("STRING", {
				"enum" : paTypeIds
			}),
			text : S("STRING"),
			box : S("ARRAY", {
				items : S("INTEGER")
			}),
			style : S("STRING", {
				"enum" : STYLES
			}),
			required : S("BOOLEAN")
		},
		required : ["type", "box"],
		propertyOrdering : ["type", "text", "box", "style", "required"]
	});
	return S("OBJECT", {
		properties : {
			pattern : S("STRING", {
				"enum" : paPatternIds
			}),
			reason : S("STRING"),
			title : S("STRING"),
			items : S("ARRAY", {
				items : voItem
			})
		},
		required : ["pattern", "items"],
		propertyOrdering : ["pattern", "reason", "title", "items"]
	});
}

var SYSTEM_TEXT = [
	"너는 토마토시스템 eXBuilder6 화면 설계 보조자다.",
	"사용자가 준 화면 이미지(캡처 · 디자인 시안 · 손그림)를 보고, 화면 본문에 보이는 UI 요소를 eXBuilder6 컨트롤 목록(JSON)으로 옮긴다.",
	"XML 이나 코드는 쓰지 않는다. 주어진 응답 스키마의 JSON 만 돌려준다.",
	"",
	"[요소] { type, text, box, style, required }",
	"- box : 정수 4개 [ymin, xmin, ymax, xmax]. 이미지의 가로·세로를 각각 0~1000 으로 본 좌표이며 요소가 실제로 차지하는 사각형이다.",
	"- type : output(라벨·제목·안내 글) · button · inputbox(글상자, 읽기 전용 값 표시 포함) · combobox(드롭다운) · dateinput(날짜) · numbereditor(숫자·금액) ·",
	"  maskeditor(전화·사업자번호처럼 형식 있는 입력) · searchinput(돋보기 검색 상자) · checkbox(체크 1개) · checkboxgroup(체크 여러 개 묶음) · radiobutton(라디오 묶음) ·",
	"  listbox · textarea(여러 줄 글상자) · slider · fileinput(파일 선택 한 줄) · img(이미지·로고·사진) · htmlsnippet · progress ·",
	"  grid(표·목록) · tree(트리) · tabfolder(탭) · accordion · group(빈 상자·카드 틀) · pageindexer(페이지 번호 줄) · calendar(달력) ·",
	"  fileupload(파일 목록 업로드 영역) · embeddedpage(외부 페이지·iframe) · embeddedapp · uicontrolshell(차트·지도·에디터 같은 서드파티 영역).",
	"- text : 유형별 뜻 — output/button/inputbox/textarea: 보이는 글자 · checkbox: 문구 · combobox/radiobutton/checkboxgroup/listbox: 항목을 쉼표로 ·",
	"  grid: 표 헤더를 왼쪽부터 쉼표로 · tabfolder: 탭 이름을 쉼표로 · accordion: 섹션 제목을 쉼표로 · maskeditor: 마스크 · 그 밖: 빈 문자열.",
	"  글자는 보이는 그대로 적는다(번역·요약·추측하지 않는다). 안 보이면 비운다.",
	"- style : button 에만. 채워진 강조색(파랑·진한색) 버튼 = primary, 흰·회색 바탕의 보통 버튼 = secondary, 모르면 default.",
	"- required : output(라벨) 에만. 라벨에 * 나 빨간 필수 표시가 있으면 true 로 하고 text 에서 * 는 뺀다.",
	"",
	"[규칙]",
	"1. 화면 본문의 요소만 옮긴다. 브라우저 틀 · 상단 메뉴 · 좌측 네비게이션 · 워터마크 · 툴팁 · 마우스 커서는 뺀다.",
	"2. 표(그리드)는 표 전체를 grid 하나로 옮긴다(셀·행을 따로 만들지 않는다). 헤더 글자를 text 에 쉼표로 적는다.",
	"3. 표 위에 붙은 제목 글자와 버튼 묶음은 각각 output · button 으로 표 바로 위에 둔다. 표 아래의 페이지 번호 줄은 pageindexer.",
	"4. 조회 조건은 라벨 output + 입력 컨트롤로 각각 옮기고, 라벨은 입력의 왼쪽(또는 바로 위)에 둔다.",
	"   '시작 ~ 끝' 기간은 입력 2개 사이에 text 가 \"~\" 인 output 을 하나 둔다.",
	"5. 탭폴더는 탭 머리와 내용 영역을 합친 사각형 하나로 두고, 탭 안의 표·입력은 그 사각형 안의 좌표로 따로 적는다.",
	"6. 두 표 사이의 이동 버튼(▶ ◀ ▼ ▲ > <)은 button 으로 두고 text 에는 화살표만 적는다.",
	"7. 요소끼리 겹치지 않게, 이미지의 위치·크기 비율을 그대로 지킨다. 같은 줄의 요소는 ymin 이 거의 같아야 한다.",
	"8. 라벨과 입력이 한 상자로 붙어 있어도 라벨(output)과 입력을 따로 나눈다. 입력 안의 자리 표시 글자(placeholder)는 text 에 넣지 않는다.",
	"9. pattern 은 [템플릿 카탈로그] 에서 화면 구성이 가장 비슷한 것을 고르고 reason 에 한 문장으로 이유를 적는다. title 은 화면 제목(보이면).",
	"10. 화면 맨 아래 버튼 줄(저장 · 닫기 등)은 button 으로 맨 아래에 그대로 둔다. 좌·우 위치도 이미지대로."
].join("\n");

function buildUserText(paCatalog, poImage, psMemo, psForcedPattern) {
	var vaLines = [];
	vaLines.push("[템플릿 카탈로그]");
	paCatalog.forEach(function(poEach) {
		vaLines.push("- " + poEach.id + " (" + poEach.arrange + "): " + poEach.desc);
	});
	if (psForcedPattern != null && psForcedPattern != "auto") {
		vaLines.push("");
		vaLines.push("[사용자 지정 패턴] " + psForcedPattern + " - pattern 은 이 값으로 한다.");
	}
	vaLines.push("");
	vaLines.push("[요구사항 메모] " + (psMemo ? psMemo : "(없음)"));
	vaLines.push("");
	vaLines.push("[이미지] " + poImage.width + "×" + poImage.height + "px. 이 이미지의 화면 본문에 보이는 UI 요소를 모두 옮겨라.");
	return vaLines.join("\n");
}

/* ---------------------------------------------------------------- Gemini 호출 */

/**
 * 이미지를 Gemini 에 보내 요소 목록을 받는다(비동기).
 * @param {Object} poImage readImage() 결과
 * @param {{apiKey:String, model:String, route:String, memo:String, pattern:String}} poOpt geminiPlanner 와 같다
 * @param {function(Object)} pfSuccess 정규화된 계획 { pattern, title, reason, items:[{type,text,box,style,required}] }
 * @param {function(String)} pfError
 */
exports.analyze = function(poImage, poOpt, pfSuccess, pfError) {
	var gemini = cpr.core.Module.require("module/canvas/geminiPlanner");
	var planner = cpr.core.Module.require("module/canvas/templatePlanner");
	var vaCatalog = planner.getCatalog();
	var vaTypeIds = registry().getTypes().map(function(poDef) {
		return poDef.type;
	});
	var voBody = {
		systemInstruction : {
			parts : [{
				text : SYSTEM_TEXT
			}]
		},
		contents : [{
			role : "user",
			parts : [{
				inline_data : {
					mime_type : poImage.mimeType,
					data : poImage.data
				}
			}, {
				text : buildUserText(vaCatalog, poImage, poOpt.memo, poOpt.pattern)
			}]
		}],
		generationConfig : {
			temperature : 0.1,
			responseMimeType : "application/json",
			responseSchema : buildResponseSchema(vaCatalog.map(function(poEach) {
				return poEach.id;
			}), vaTypeIds)
		}
	};
	gemini.request(voBody, {
		apiKey : poOpt.apiKey,
		model : poOpt.model,
		route : poOpt.route,
		timeout : TIMEOUT_MS
	}, function(psText) {
		var voPlan;
		try {
			voPlan = JSON.parse(psText);
		} catch (e) {
			pfError("Gemini 응답을 해석하지 못했습니다: " + e.message);
			return;
		}
		pfSuccess(exports.normalize(voPlan));
	}, pfError);
};

/* ---------------------------------------------------------------- 서버 분석(업로드) — eXConverter-AI 방식
 *
 * 이미지 파일을 multipart 로 서버(/canvas/analyzeImage.do)에 올리면 서버가 키 · 축소 · 호출 · 재시도 · 로그를 맡는다.
 * 브라우저에는 키가 없고 원본 파일만 나간다. 서버가 돌려준 plan 은 direct 경로와 같은 모양이라 normalize() 를 그대로 쓴다.
 */

/** 서버 분석 상태(화면이 뜰 때 한 번 확인) : null = 아직 모름 */
var moServerStatus = null;

function contextPath() {
	var vsPath = window.location.pathname;
	var vnIdx = vsPath.indexOf("/ui/");
	return vnIdx > 0 ? vsPath.substring(0, vnIdx) : "";
}

/**
 * 서버가 이미지를 분석할 수 있는지 묻는다(GET /canvas/imageStatus.do). 키 값은 오지 않는다.
 * @param {function(Object)} pfDone { ok, configured, model, ... } 또는 null(엔드포인트 없음)
 */
exports.probeServer = function(pfDone) {
	var voXhr = new XMLHttpRequest();
	voXhr.open("GET", contextPath() + "/canvas/imageStatus.do", true);
	voXhr.setRequestHeader("X-Requested-With", "eX-Canvas");
	voXhr.timeout = 5000;
	voXhr.onreadystatechange = function() {
		if (voXhr.readyState != 4) {
			return;
		}
		var voStatus = null;
		try {
			voStatus = JSON.parse(voXhr.responseText);
		} catch (e) {
			voStatus = null;
		}
		if (voXhr.status != 200 || voStatus == null) {
			voStatus = voStatus && voStatus.message ? {
				ok : false,
				configured : false,
				message : voStatus.message
			} : null;
		}
		moServerStatus = voStatus;
		pfDone(voStatus);
	};
	try {
		voXhr.send();
	} catch (e) {
		pfDone(null);
	}
};

exports.getServerStatus = function() {
	return moServerStatus;
};

/**
 * 이미지 파일을 서버에 올려 분석한다(비동기).
 * @param {File} poFile
 * @param {{memo:String, pattern:String}} poOpt
 * @param {function(Object, Object)} pfSuccess (정규화된 계획, { width, height })
 * @param {function(String)} pfError
 */
exports.analyzeUpload = function(poFile, poOpt, pfSuccess, pfError) {
	var planner = cpr.core.Module.require("module/canvas/templatePlanner");
	var voForm = new FormData();
	voForm.append("image", poFile, poFile.name || "image.png");
	voForm.append("memo", poOpt.memo || "");
	voForm.append("pattern", poOpt.pattern || "auto");
	// 카탈로그 · 유형 목록은 브라우저 것이 원본이다(서버에 따로 두지 않는다).
	voForm.append("catalog", planner.getCatalog().map(function(poEach) {
		return "- " + poEach.id + " (" + poEach.arrange + "): " + poEach.desc;
	}).join("\n"));
	voForm.append("types", registry().getTypes().map(function(poDef) {
		return poDef.type;
	}).join(","));

	var voXhr = new XMLHttpRequest();
	voXhr.open("POST", contextPath() + "/canvas/analyzeImage.do", true);
	voXhr.setRequestHeader("X-Requested-With", "eX-Canvas");
	voXhr.timeout = TIMEOUT_MS * 2; // 서버가 재시도까지 하므로 넉넉히
	voXhr.onreadystatechange = function() {
		if (voXhr.readyState != 4) {
			return;
		}
		var voJson = null;
		try {
			voJson = JSON.parse(voXhr.responseText);
		} catch (e) {
			voJson = null;
		}
		if (voXhr.status == 0) {
			pfError("서버에 연결하지 못했습니다(네트워크 · 시간 초과).");
			return;
		}
		if (voXhr.status < 200 || voXhr.status >= 300 || voJson == null || voJson.ok !== true) {
			var vsMessage = voJson && voJson.message ? voJson.message : ("서버 분석 실패(" + voXhr.status + ")");
			if (voXhr.status == 404) {
				vsMessage = "서버에 이미지 분석 엔드포인트(/canvas/analyzeImage.do)가 없습니다. 최신 코드를 배포했는지 확인하거나 호출을 '브라우저 직접 호출' 로 바꾸세요.";
			}
			pfError(vsMessage);
			return;
		}
		var voPlan = exports.normalize(voJson.plan);
		voPlan.server = {
			model : voJson.model,
			usage : voJson.usage,
			elapsedSeconds : voJson.elapsedSeconds
		};
		pfSuccess(voPlan, voJson.image || {
			width : 1000,
			height : 1000
		});
	};
	voXhr.send(voForm);
};

/**
 * 경로를 정해 이미지를 분석한다.
 *  - 호출 = 서버 프록시 → 서버 업로드
 *  - 호출 = 브라우저 직접 호출인데 키가 비어 있고 서버에 키가 있으면 → 서버 업로드(키를 브라우저에 두지 않는 쪽을 택한다)
 *  - 그 밖 → 브라우저에서 줄여 Gemini 에 직접
 * @param {File} poFile
 * @param {{apiKey:String, model:String, route:String, memo:String, pattern:String}} poOpt
 * @param {function(Object, Object, String)} pfSuccess (정규화된 계획, 이미지 크기, 쓴 경로 "server"|"direct")
 * @param {function(String)} pfError
 */
exports.analyzeFile = function(poFile, poOpt, pfSuccess, pfError) {
	var vbServer = poOpt.route == "proxy"
			|| (!(poOpt.apiKey || "").replace(/\s/g, "") && moServerStatus != null && moServerStatus.configured === true);
	if (vbServer) {
		exports.analyzeUpload(poFile, poOpt, function(poPlan, poImage) {
			pfSuccess(poPlan, poImage, "server");
		}, pfError);
		return;
	}
	exports.readImage(poFile, function(poImage) {
		exports.analyze(poImage, poOpt, function(poPlan) {
			pfSuccess(poPlan, poImage, "direct");
		}, pfError);
	}, pfError);
};

/* ---------------------------------------------------------------- 정규화 · 좌표 변환 */

function clampInt(pvValue, pnMin, pnMax) {
	var vnValue = Math.round(Number(pvValue));
	if (isNaN(vnValue)) {
		return null;
	}
	return Math.max(pnMin, Math.min(pnMax, vnValue));
}

/**
 * AI 응답을 검증·정리한다. 모르는 유형 · 깨진 box 는 버린다.
 * @param {Object} poPlan
 * @return {Object} { pattern, title, reason, items, dropped }
 */
exports.normalize = function(poPlan) {
	poPlan = poPlan || {};
	var planner = cpr.core.Module.require("module/canvas/templatePlanner");
	var reg = registry();
	var vnDropped = 0;
	var vaItems = [];
	(poPlan.items || []).forEach(function(poItem) {
		if (poItem == null || reg.getType(poItem.type) == null || !(poItem.box instanceof Array) || poItem.box.length != 4) {
			vnDropped++;
			return;
		}
		var vaBox = poItem.box.map(function(pvEach) {
			return clampInt(pvEach, 0, 1000);
		});
		if (vaBox.some(function(pnEach) {
			return pnEach == null;
		})) {
			vnDropped++;
			return;
		}
		var vnTop = Math.min(vaBox[0], vaBox[2]);
		var vnBottom = Math.max(vaBox[0], vaBox[2]);
		var vnLeft = Math.min(vaBox[1], vaBox[3]);
		var vnRight = Math.max(vaBox[1], vaBox[3]);
		if (vnBottom - vnTop < 2 || vnRight - vnLeft < 2) {
			vnDropped++;
			return;
		}
		var vsText = poItem.text == null ? "" : String(poItem.text).replace(/^\s+|\s+$/g, "");
		var voDef = reg.getType(poItem.type);
		// 라벨의 필수 표시는 글자 끝 "*" 로 남긴다(규칙 기반 변환이 label required 로 읽는다).
		if (poItem.required === true && voDef.role == "label" && vsText !== "" && !/\*$/.test(vsText)) {
			vsText += "*";
		}
		vaItems.push({
			type : poItem.type,
			text : vsText,
			top : vnTop,
			left : vnLeft,
			bottom : vnBottom,
			right : vnRight,
			style : voDef.role == "button" && STYLES.indexOf(poItem.style) >= 0 && poItem.style != "default" ? poItem.style : null
		});
	});
	var vsPattern = null;
	planner.getCatalog().forEach(function(poEach) {
		if (poEach.id == poPlan.pattern) {
			vsPattern = poEach.id;
		}
	});
	return {
		pattern : vsPattern,
		title : poPlan.title == null ? "" : String(poPlan.title),
		reason : poPlan.reason == null ? "" : String(poPlan.reason),
		items : vaItems,
		dropped : vnDropped
	};
};

/** 한 줄짜리 컨트롤인가(줄 높이를 24px 로 다시 재는 대상) */
function isShortType(poDef) {
	if (poDef.role == "data") {
		return false;
	}
	return ["textarea", "listbox", "img", "htmlsnippet", "fileupload"].indexOf(poDef.type) < 0;
}

/** 유형별 최소 폭(캔버스 px). "~" 같은 짧은 라벨이 옆 입력을 덮지 않게 라벨은 좁게 둔다. */
function minWidthOf(poDef) {
	return poDef.role == "label" ? 16 : MIN_WIDTH;
}

/** 유형별 최소 높이(캔버스 px) */
function minHeightOf(poDef) {
	if (isShortType(poDef)) {
		return ROW_HEIGHT;
	}
	if (poDef.type == "textarea" || poDef.type == "htmlsnippet") {
		return 48;
	}
	return 40;
}

function median(paValues) {
	if (paValues.length == 0) {
		return 0;
	}
	var vaSorted = paValues.slice().sort(function(a, b) {
		return a - b;
	});
	var vnMid = Math.floor(vaSorted.length / 2);
	return vaSorted.length % 2 == 1 ? vaSorted[vnMid] : (vaSorted[vnMid - 1] + vaSorted[vnMid]) / 2;
}

/**
 * 이미지 좌표(0~1000)의 요소들을 캔버스 좌표로 옮긴다.
 *
 * 가로 : 캔버스 폭(여백 20px 제외)에 비례. 이미지의 좌우 배치·폭 비율이 그대로 산다.
 * 세로 : 줄 단위로 다시 잰다. 요소들의 위·아래 경계로 이미지를 띠(segment)로 자르고,
 *        - 한 줄짜리 컨트롤이 지나는 띠는 "줄 높이가 24px 이 되는 배율" 로
 *        - 그리드·트리·탭처럼 큰 영역만 지나는 띠와 빈 띠는 "남는 높이를 채우는 배율" 로 늘이거나 줄인다.
 *        위→아래 순서와 겹침은 그대로 유지되므로(단조 변환) 규칙 기반 변환이 이미지와 같은 구조로 읽는다.
 *
 * @param {Object} poPlan normalize() 결과
 * @param {{width:Number, height:Number}} poImage 이미지 크기(px)
 * @param {{width:Number, height:Number}} poCanvas 캔버스 크기
 * @return {Object[]} [{ type, text, x, y, width, height, style }]
 */
exports.toCanvasItems = function(poPlan, poImage, poCanvas) {
	var reg = registry();
	var vnImageWidth = Math.max(1, poImage.width);
	var vnImageHeight = Math.max(1, poImage.height);
	var vnCanvasWidth = Math.max(MIN_CANVAS_WIDTH, Math.round((poCanvas && poCanvas.width) || 800));
	var vnCanvasHeight = Math.max(MIN_CANVAS_HEIGHT, Math.round((poCanvas && poCanvas.height) || 600));

	// 0~1000 → 이미지 px
	var vaBoxes = poPlan.items.map(function(poItem) {
		var voDef = reg.getType(poItem.type);
		return {
			item : poItem,
			def : voDef,
			isShort : isShortType(voDef),
			x : poItem.left / 1000 * vnImageWidth,
			right : poItem.right / 1000 * vnImageWidth,
			y : poItem.top / 1000 * vnImageHeight,
			bottom : poItem.bottom / 1000 * vnImageHeight
		};
	});
	if (vaBoxes.length == 0) {
		return [];
	}

	var vnMinX = Math.min.apply(null, vaBoxes.map(function(b) {
		return b.x;
	}));
	var vnMaxX = Math.max.apply(null, vaBoxes.map(function(b) {
		return b.right;
	}));

	// 가로 배율 : 요소가 차지하는 폭이 캔버스 폭을 채우도록
	var vnScaleX = (vnCanvasWidth - MARGIN * 2) / Math.max(1, vnMaxX - vnMinX);

	// 줄 배율 : 한 줄짜리 컨트롤의 중간 높이가 24px 이 되도록(이미지가 작으면 키우고, 크면 줄인다)
	var vnRowHeightInImage = median(vaBoxes.filter(function(b) {
		return b.isShort;
	}).map(function(b) {
		return b.bottom - b.y;
	}));
	var vnScaleRow = vnRowHeightInImage > 0 ? ROW_HEIGHT / vnRowHeightInImage : vnScaleX;
	vnScaleRow = Math.max(0.2, Math.min(1.5, vnScaleRow));
	// 큰 요소의 기준 : 줄 높이의 1.8배를 넘으면 "큰 영역" 으로 본다(유형과 무관하게 실제 높이로도 판단).
	var vnShortLimit = vnRowHeightInImage > 0 ? vnRowHeightInImage * 1.8 : Infinity;
	vaBoxes.forEach(function(b) {
		b.isShort = b.isShort && (b.bottom - b.y) <= vnShortLimit;
	});

	// 띠 나누기 : 모든 요소의 위·아래 경계
	var vaEdges = [];
	vaBoxes.forEach(function(b) {
		vaEdges.push(b.y, b.bottom);
	});
	vaEdges = vaEdges.map(function(v) {
		return Math.round(v * 10) / 10;
	}).sort(function(a, b) {
		return a - b;
	}).filter(function(v, i, arr) {
		return i == 0 || v > arr[i - 1];
	});

	var vaSegments = [];
	var vnRowLength = 0;
	var vnFreeLength = 0;
	for (var i = 0; i < vaEdges.length - 1; i++) {
		var vnA = vaEdges[i];
		var vnB = vaEdges[i + 1];
		var vbRow = false;
		var vbCovered = false;
		vaBoxes.forEach(function(b) {
			if (b.y <= vnA + 0.05 && b.bottom >= vnB - 0.05) {
				vbCovered = true;
				if (b.isShort) {
					vbRow = true;
				}
			}
		});
		var voSegment = {
			from : vnA,
			to : vnB,
			kind : vbRow ? "row" : (vbCovered ? "tall" : "empty")
		};
		vaSegments.push(voSegment);
		if (vbRow) {
			vnRowLength += vnB - vnA;
		} else {
			vnFreeLength += vnB - vnA;
		}
	}

	// 남는 높이를 큰 영역·빈 띠가 나눠 쓴다. 너무 줄지도(0.25) 너무 늘지도(가로 배율·줄 배율 중 큰 값) 않게.
	var vnAvailable = vnCanvasHeight - MARGIN * 2 - vnRowLength * vnScaleRow;
	var vnScaleFree = vnFreeLength > 0 ? vnAvailable / vnFreeLength : vnScaleRow;
	vnScaleFree = Math.max(0.25, Math.min(Math.max(vnScaleX, vnScaleRow), vnScaleFree));

	// 누적 높이표 : 이미지 y → 캔버스 y
	var vaMapped = [];
	var vnCursor = MARGIN;
	vaSegments.forEach(function(poSegment) {
		var vnLength = poSegment.to - poSegment.from;
		var vnMapped;
		if (poSegment.kind == "row") {
			vnMapped = vnLength * vnScaleRow;
		} else if (poSegment.kind == "tall") {
			vnMapped = vnLength * vnScaleFree;
		} else {
			// 빈 띠(줄 사이 간격)는 아주 좁아지지 않게 한다(줄이 붙어 보이지 않도록).
			vnMapped = Math.max(vnLength * vnScaleFree, Math.min(10, vnLength * vnScaleRow));
		}
		vaMapped.push({
			from : poSegment.from,
			start : vnCursor,
			scale : vnMapped / Math.max(0.0001, vnLength)
		});
		vnCursor += vnMapped;
	});

	function mapY(pnY) {
		var voLast = vaMapped[0];
		for (var j = 0; j < vaMapped.length; j++) {
			if (vaMapped[j].from <= pnY + 0.05) {
				voLast = vaMapped[j];
			} else {
				break;
			}
		}
		return voLast.start + (pnY - voLast.from) * voLast.scale;
	}

	return vaBoxes.map(function(b) {
		var vnTop = Math.round(mapY(b.y));
		var vnBottom = Math.round(mapY(b.bottom));
		var vnLeft = Math.round(MARGIN + (b.x - vnMinX) * vnScaleX);
		var vnWidth = Math.round((b.right - b.x) * vnScaleX);
		return {
			type : b.item.type,
			text : b.item.text,
			style : b.item.style,
			x : Math.max(0, vnLeft),
			y : Math.max(0, vnTop),
			width : Math.max(minWidthOf(b.def), vnWidth),
			height : Math.max(minHeightOf(b.def), vnBottom - vnTop)
		};
	});
};
