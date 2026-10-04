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
/** 아웃풋의 문단 종류 : 화면 제목 · 구획 제목 · 설명 문단 · 안내 상자(테두리·배경 안의 문단) · 라벨 */
var VARIANTS = ["title", "heading", "desc", "notice", "label"];
/** 그리드 데이터 행의 셀 컨트롤(열마다). button 은 "button:글자" */
var CELL_KINDS = ["text", "checkbox", "inputbox", "combobox", "numbereditor", "dateinput", "button"];

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
			variant : S("STRING", {
				"enum" : VARIANTS
			}),
			text : S("STRING"),
			box : S("ARRAY", {
				items : S("INTEGER")
			}),
			style : S("STRING", {
				"enum" : STYLES
			}),
			required : S("BOOLEAN"),
			cells : S("STRING"),
			widths : S("STRING")
		},
		required : ["type", "box"],
		propertyOrdering : ["type", "variant", "text", "box", "style", "required", "cells", "widths"]
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
	"XML 이나 코드, 설명 문장은 쓰지 않는다. 주어진 응답 스키마의 JSON 만 돌려준다.",
	"",
	// ↓ 서버 분석기(CanvasImageAnalyzer.BUILTIN_PROMPT)와 같은 내용이어야 한다.
	"[요소] { type, variant, text, box, style, required, cells, widths }",
	"- box : 정수 4개 [ymin, xmin, ymax, xmax]. 이미지의 가로·세로를 각각 0~1000 으로 본 좌표이며 요소가 실제로 차지하는 사각형이다.",
	"- type : output(라벨·제목·안내 글) · button · inputbox(글상자, 읽기 전용 값 표시 포함) · combobox(드롭다운) · dateinput(날짜) · numbereditor(숫자·금액·스핀) ·",
	"  maskeditor(전화·사업자번호처럼 형식 있는 입력) · searchinput(돋보기 검색 상자) · checkbox(체크 1개) · checkboxgroup(체크 여러 개 묶음) · radiobutton(라디오 묶음) ·",
	"  listbox · textarea(여러 줄 글상자 · 코드/로그/결과 표시 상자) · slider · fileinput(파일 선택 한 줄) · img(이미지·로고·사진) · htmlsnippet · progress ·",
	"  grid(표·목록) · tree(트리) · tabfolder(탭) · accordion · group(빈 상자·카드 틀) · pageindexer(페이지 번호 줄) · calendar(달력) ·",
	"  fileupload(파일 목록 업로드 영역) · embeddedpage(외부 페이지·iframe) · embeddedapp · uicontrolshell(차트·지도·에디터 같은 서드파티 영역).",
	"- variant : output 에만. title(화면 맨 위 화면 제목) · heading(구획·영역의 제목, 표 위 제목 — 굵거나 큰 글자) ·",
	"  desc(설명·안내 문단) · notice(테두리·배경색 상자 안에 든 안내 문단) · label(입력 옆 라벨 · 짧은 글자).",
	"- text : 유형별 뜻 — output/button/inputbox/textarea: 보이는 글자 · checkbox: 문구 · combobox/radiobutton/checkboxgroup/listbox: 항목을 쉼표로 ·",
	"  grid: 표 헤더를 왼쪽부터 쉼표로 · tabfolder: 탭 이름을 쉼표로 · accordion: 섹션 제목을 쉼표로 · maskeditor: 마스크 · 그 밖: 빈 문자열.",
	"  글자는 보이는 그대로 적는다(번역·요약·추측하지 않는다). 안 보이면 비운다. 설명이나 이유를 값에 적지 않는다.",
	"- style : button 에만. 채워진 강조색(파랑·진한색) 버튼 = primary, 흰·회색 바탕의 보통 버튼 = secondary, 모르면 default.",
	"- required : output(라벨) 에만. 라벨에 * 나 빨간 필수 표시가 있으면 true 로 하고 text 에서 * 는 뺀다.",
	"- cells : grid 에만. 첫 데이터 행에서 열마다 보이는 컨트롤을 왼쪽부터 쉼표로 — text(글자만) · checkbox · inputbox · combobox · numbereditor · dateinput · button.",
	"  button 은 \"button:버튼글자\" 로 적는다(예: \"text,checkbox,button:실행\"). 데이터 행이 없으면 모두 text.",
	"- widths : grid 에만. 열마다 화면에서 차지하는 폭의 비율을 왼쪽부터 정수로 쉼표로 적는다(합이 100 쯤, 예: \"10,30,60\").",
	"",
	"[규칙]",
	"1. 화면 본문의 요소만 옮긴다. 브라우저 틀 · 상단 메뉴 · 좌측 네비게이션 · 워터마크 · 툴팁 · 마우스 커서 · 즐겨찾기 같은 아이콘은 뺀다.",
	"2. 표(그리드)는 표 전체를 grid 하나로 옮긴다(셀·행을 따로 만들지 않는다). 데이터 행은 요소가 아니다.",
	"   헤더는 왼쪽부터 모든 열을 빠짐없이 적는다. 헤더 글자가 없는 열(번호 · 체크 열)도 빈 칸으로 자리를 남긴다(예: \",이벤트/함수명,설명,동작\").",
	"   표의 맨 윗줄(헤더 줄 · 보통 회색 바탕이고 바로 아래부터 데이터 행)에 있는 글자는 맨 왼쪽 칸까지 모두 헤더다. 헤더 글자를 output 으로 다시 만들지 않는다.",
	"   표의 box 는 헤더 줄부터 시작해 표 테두리의 맨 아래(데이터 행 아래의 빈 영역 · 가로 스크롤 줄까지)에서 끝난다. 헤더 줄과 같은 높이에 있는 글자를 표 위 제목으로 떼어 내지 않는다.",
	"   cells · widths 는 헤더와 같은 개수로 적는다.",
	"3. 표 위에 붙은 제목 글자와 버튼 묶음은 각각 output(variant heading) · button 으로 표 바로 위에 둔다. 표 아래의 페이지 번호 줄은 pageindexer. '총 0건' 같은 건수 표시와 아이콘은 뺀다.",
	"4. 조회 조건은 라벨 output + 입력 컨트롤로 각각 옮기고, 라벨은 입력의 왼쪽(또는 바로 위)에 둔다.",
	"   '시작 ~ 끝' 기간은 입력 2개 사이에 text 가 \"~\" 인 output 을 하나 둔다.",
	"5. 탭폴더는 탭 머리와 내용 영역을 합친 사각형 하나로 두고, 탭 안의 표·입력은 그 사각형 안의 좌표로 따로 적는다.",
	"6. 두 표 사이의 이동 버튼(▶ ◀ ▼ ▲ > <)은 button 으로 두고 text 에는 화살표만 적는다.",
	"7. 요소끼리 겹치지 않게, 이미지의 위치·크기 비율을 그대로 지킨다. 같은 줄의 요소는 ymin 이 거의 같아야 한다.",
	"8. 라벨과 입력이 한 상자로 붙어 있어도 라벨(output)과 입력을 따로 나눈다. 입력 안의 자리 표시 글자(placeholder)는 text 에 넣지 않는다.",
	"9. 여러 줄로 이어진 설명·안내 문단은 output 하나로 옮기고 text 에는 줄마다 줄바꿈(\\n)을 넣어 이미지의 줄 그대로 적는다. box 는 문단 전체다.",
	"   문단을 둘러싼 테두리(실선·점선)나 배경색 상자가 있으면 그 문단의 variant 를 notice 로 하고 box 는 상자 전체로 한다. 빈 줄로 나뉜 문단도 같은 상자 안이면 한 output 이다.",
	"10. 코드·로그·결과를 보여 주는 큰 상자(비어 있어도 · 이미지 아래 끝에서 잘려 있어도)는 textarea 로 옮기고, 그 상자 위·안쪽 모서리의 복사 같은 버튼은 button 으로 따로 둔다.",
	"    복사 · 지우기 버튼이 붙은 테두리 상자(안이 비어 있어도)는 장식이 아니라 textarea 다. 이미지 가장자리에서 잘린 요소도 보이는 만큼 옮긴다.",
	"11. 영역을 감싸기만 하는 장식 테두리·배경 상자는 요소로 만들지 않는다(안의 요소만 옮긴다).",
	"12. pattern 은 [템플릿 카탈로그] 에서 화면 구성이 가장 비슷한 것의 id 를 고르고 reason 에 한 문장으로 이유를 적는다. title 은 화면 제목(보이면).",
	"13. 화면 맨 아래 버튼 줄(저장 · 닫기 등)은 button 으로 맨 아래에 그대로 둔다. 좌·우 위치도 이미지대로.",
	"14. 같은 문장을 두 번 쓰고 있다면 즉시 멈추고 JSON 을 닫는다."
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

/** 쉼표 목록 → 배열(빈 칸 유지). 개수가 pnCount 와 다르면 null */
function csvOf(pvValue, pnCount) {
	if (pvValue == null || pvValue === "") {
		return null;
	}
	var vaValues = (pvValue instanceof Array ? pvValue : String(pvValue).split(",")).map(function(pvEach) {
		return String(pvEach == null ? "" : pvEach).replace(/^\s+|\s+$/g, "");
	});
	return vaValues.length == pnCount ? vaValues : null;
}

/**
 * 요소의 모양 정보(문단 종류 · 그리드 셀 컨트롤 · 열 폭)를 정리한다. 없으면 null.
 *  - output : variant(없으면 줄 수·높이로 짐작 — 두 줄 이상이면 desc)
 *  - grid   : cells(열마다 text|checkbox|…|button:글자) · widths(열 폭 비율 정수) — 헤더 수와 맞을 때만
 */
function normalizeMeta(poItem, psText) {
	var voMeta = {};
	if (poItem.type == "output") {
		var vsVariant = VARIANTS.indexOf(poItem.variant) >= 0 ? poItem.variant : null;
		if (vsVariant == null && psText.indexOf("\n") >= 0) {
			vsVariant = "desc";
		}
		if (vsVariant != null && vsVariant != "label") {
			voMeta.variant = vsVariant;
		}
	} else if (poItem.type == "grid") {
		var vnCount = String(poItem.text == null ? "" : poItem.text).split(",").length;
		var vaCells = csvOf(poItem.cells, vnCount);
		if (vaCells != null) {
			vaCells = vaCells.map(function(psCell) {
				var vnColon = psCell.indexOf(":");
				var vsKind = (vnColon >= 0 ? psCell.substring(0, vnColon) : psCell).toLowerCase();
				if (CELL_KINDS.indexOf(vsKind) < 0) {
					return "text";
				}
				return vsKind == "button" ? "button:" + (vnColon >= 0 ? psCell.substring(vnColon + 1) : "") : vsKind;
			});
			if (vaCells.some(function(psCell) {
				return psCell != "text";
			})) {
				voMeta.cells = vaCells;
			}
		}
		var vaWidths = csvOf(poItem.widths, vnCount);
		if (vaWidths != null) {
			vaWidths = vaWidths.map(function(psWidth) {
				var vnWidth = parseInt(psWidth, 10);
				return isNaN(vnWidth) || vnWidth <= 0 ? 10 : vnWidth;
			});
			voMeta.widths = vaWidths;
		}
	}
	for (var vsKey in voMeta) {
		return voMeta;
	}
	return null;
}

/**
 * 그리드 · 트리는 보통 아래 요소 바로 앞까지 영역을 채운다. AI 가 사각형을 마지막 데이터 행에서 끊어(빈 영역을 빼고) 주는 일이 잦아,
 * 바로 아래(가로로 겹치는) 요소까지 빈 틈이 크면(3% 넘게) 그 앞까지 늘린다. 아래에 아무것도 없으면 그대로 둔다.
 * @param {Object[]} paItems normalize() 의 요소(0~1000 좌표) — 제자리에서 고친다.
 */
function extendDataAreas(paItems) {
	paItems.forEach(function(poItem) {
		if (poItem.type != "grid" && poItem.type != "tree") {
			return;
		}
		var vnNextTop = null;
		paItems.forEach(function(poOther) {
			if (poOther === poItem || poOther.top < poItem.bottom || Math.min(poOther.right, poItem.right) - Math.max(poOther.left, poItem.left) <= 0) {
				return;
			}
			vnNextTop = vnNextTop == null ? poOther.top : Math.min(vnNextTop, poOther.top);
		});
		if (vnNextTop != null && vnNextTop - poItem.bottom > 30) {
			poItem.bottom = vnNextTop - 12;
		}
	});
}

/**
 * AI 응답을 검증·정리한다. 모르는 유형 · 깨진 box 는 버린다.
 * @param {Object} poPlan
 * @return {Object} { pattern, title, reason, items, dropped, absorbed(장식 틀로 보고 뺀 group 수) }
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
		var voDef = reg.getType(poItem.type);
		// 문단은 줄바꿈을 살린다(줄마다 앞뒤 공백만 걷고 빈 줄은 뺀다). 그 밖은 한 줄로.
		var vsText = poItem.text == null ? "" : String(poItem.text).replace(/\r/g, "").split("\n").map(function(psLine) {
			return psLine.replace(/^\s+|\s+$/g, "");
		}).filter(function(psLine) {
			return psLine !== "";
		}).join(poItem.type == "output" || poItem.type == "textarea" ? "\n" : " ");
		// 라벨의 필수 표시는 글자 끝 "*" 로 남긴다(규칙 기반 변환이 label required 로 읽는다).
		if (poItem.required === true && voDef.role == "label" && vsText !== "" && !/\*$/.test(vsText)) {
			vsText += "*";
		}
		var voMeta = normalizeMeta(poItem, vsText);
		vaItems.push({
			type : poItem.type,
			text : vsText,
			top : vnTop,
			left : vnLeft,
			bottom : vnBottom,
			right : vnRight,
			style : voDef.role == "button" && STYLES.indexOf(poItem.style) >= 0 && poItem.style != "default" ? poItem.style : null,
			meta : voMeta
		});
	});
	// 다른 요소를 감싸는 빈 상자(group)는 장식 틀이다(조회 영역 배경 · 구획 테두리) — 템플릿의 search-box · content 가 그 역할을 하므로 뺀다.
	var vnBefore = vaItems.length;
	vaItems = vaItems.filter(function(poItem) {
		return poItem.type != "group" || !vaItems.some(function(poOther) {
			var vnCx = (poOther.left + poOther.right) / 2;
			var vnCy = (poOther.top + poOther.bottom) / 2;
			return poOther !== poItem && vnCx > poItem.left && vnCx < poItem.right && vnCy > poItem.top && vnCy < poItem.bottom;
		});
	});
	var vnAbsorbed = vnBefore - vaItems.length;
	extendDataAreas(vaItems);
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
		dropped : vnDropped,
		absorbed : vnAbsorbed
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

/* ---------------------------------------------------------------- 원본 이미지 ↔ 생성 CLX 비교(반영률)
 *
 * 이미지 분석이 찾은 요소(원본)가 생성한 CLX 에 들어갔는지 하나씩 맞춰 본다.
 *  - 글(라벨 · 제목 · 문단) : 줄마다 같은 글자가 아웃풋 값 · 타이틀 UDC 제목 · 화면 제목에 있는가
 *  - 버튼 : 같은 글자의 버튼(그리드 셀 버튼 포함)
 *  - 그리드 : 헤더 글자가 80% 이상 같고 열 수가 같은 그리드
 *  - 그 밖(입력 · 글상자 …) : 같은 유형의 컨트롤(값이 있으면 값까지)
 * 순서 : 맞춘 요소들의 CLX 문서 순서가 이미지의 위→아래(같은 줄은 왼→오른) 순서와 얼마나 같은가(쌍 비교).
 */

var CLX_NS = "http://tomatosystem.co.kr/cleopatra";

function squash(psText) {
	return String(psText == null ? "" : psText).replace(/\s+/g, "").toLowerCase();
}

/** CLX 를 문서 순서대로 훑어 비교에 쓸 항목 목록을 만든다. */
function clxEntries(psXml) {
	var voDoc = new DOMParser().parseFromString(psXml, "application/xml");
	var vaEntries = [];
	var vaAll = voDoc.getElementsByTagName("*");
	for (var i = 0; i < vaAll.length; i++) {
		var voEl = vaAll[i];
		if (voEl.namespaceURI != CLX_NS) {
			continue;
		}
		var vsTag = voEl.localName;
		var vbInCell = voEl.parentNode != null && voEl.parentNode.localName == "gridcell";
		if (vsTag == "appspec" && voEl.getAttribute("title")) {
			vaEntries.push({
				kind : "text",
				text : voEl.getAttribute("title"),
				order : i
			});
		} else if (vsTag == "property" && voEl.getAttribute("name") == "title") {
			vaEntries.push({
				kind : "text",
				text : voEl.getAttribute("value"),
				order : i
			});
		} else if (vsTag == "output") {
			vaEntries.push({
				kind : "text",
				text : voEl.getAttribute("value"),
				order : i
			});
		} else if (vsTag == "button") {
			vaEntries.push({
				kind : "button",
				text : voEl.getAttribute("value"),
				order : i
			});
		} else if (vsTag == "grid") {
			var vaHeaders = [];
			var vaHeaderCells = voEl.getElementsByTagNameNS(CLX_NS, "gridheader");
			if (vaHeaderCells.length > 0) {
				var vaCells = vaHeaderCells[0].getElementsByTagNameNS(CLX_NS, "gridcell");
				for (var j = 0; j < vaCells.length; j++) {
					vaHeaders.push(vaCells[j].getAttribute("text") || "");
				}
			}
			vaEntries.push({
				kind : "grid",
				headers : vaHeaders,
				order : i
			});
		} else if (!vbInCell && TYPE_TAGS[vsTag]) {
			vaEntries.push({
				kind : vsTag,
				text : voEl.getAttribute("value") || voEl.getAttribute("text") || "",
				order : i
			});
		}
	}
	return vaEntries;
}

/** 비교 대상 컨트롤 태그(유형 키와 같다) */
var TYPE_TAGS = {
	group : true,
	inputbox : true,
	combobox : true,
	dateinput : true,
	numbereditor : true,
	maskeditor : true,
	searchinput : true,
	checkbox : true,
	checkboxgroup : true,
	radiobutton : true,
	listbox : true,
	textarea : true,
	slider : true,
	fileinput : true,
	img : true,
	htmlsnippet : true,
	progress : true,
	tree : true,
	tabfolder : true,
	accordion : true,
	pageindexer : true,
	calendar : true,
	fileupload : true,
	embeddedpage : true,
	embeddedapp : true,
	uicontrolshell : true
};

/**
 * 원본 이미지의 요소가 생성한 CLX 에 얼마나 반영됐는지 비교한다.
 * @param {Object} poPlan normalize() 결과(이미지 분석 원본)
 * @param {String} psXml 생성한 .clx
 * @return {{total:Number, matched:Number, score:Number, orderScore:Number, missing:Object[], partial:Object[], lines:String[]}}
 */
exports.coverage = function(poPlan, psXml) {
	var vaEntries = clxEntries(psXml);
	var voTaken = {};
	var vaItems = (poPlan.items || []).slice().sort(function(a, b) {
		return Math.abs(a.top - b.top) > 8 ? a.top - b.top : a.left - b.left;
	});
	var vnUnits = 0;
	var vnMatchedUnits = 0;
	var vaMissing = [];
	var vaPartial = [];
	var vaOrders = []; // 맞춘 요소의 CLX 문서 순서(이미지 순서대로)

	function takeEntry(pfTest) {
		for (var i = 0; i < vaEntries.length; i++) {
			if (!voTaken[i] && pfTest(vaEntries[i])) {
				voTaken[i] = true;
				return vaEntries[i];
			}
		}
		return null;
	}

	vaItems.forEach(function(poItem) {
		var voEntry = null;
		var vnScore = 0;
		if (poItem.type == "output") {
			var vaLines = String(poItem.text || "").replace(/\*$/, "").split("\n").filter(function(psLine) {
				return squash(psLine) !== "";
			});
			if (vaLines.length == 0) {
				return; // 빈 라벨은 세지 않는다.
			}
			var vnHit = 0;
			var vnFirstOrder = null;
			vaLines.forEach(function(psLine) {
				var vsKey = squash(psLine);
				var voHit = takeEntry(function(poEntry) {
					return poEntry.kind == "text" && squash(poEntry.text) == vsKey;
				}) || takeEntry(function(poEntry) {
					return (poEntry.kind == "text" || poEntry.kind == "button") && squash(poEntry.text) !== "" && (squash(poEntry.text).indexOf(vsKey) >= 0 || vsKey.indexOf(squash(poEntry.text)) >= 0);
				});
				if (voHit != null) {
					vnHit++;
					if (vnFirstOrder == null) {
						vnFirstOrder = voHit.order;
					}
				}
			});
			vnScore = vnHit / vaLines.length;
			voEntry = vnFirstOrder == null ? null : {
				order : vnFirstOrder
			};
		} else if (poItem.type == "button") {
			voEntry = takeEntry(function(poEntry) {
				return poEntry.kind == "button" && squash(poEntry.text) == squash(poItem.text);
			});
			vnScore = voEntry != null ? 1 : 0;
		} else if (poItem.type == "grid") {
			var vaHeaders = String(poItem.text || "").split(",");
			var vnBest = 0;
			var vnBestIdx = -1;
			vaEntries.forEach(function(poEntry, pnIdx) {
				if (voTaken[pnIdx] || poEntry.kind != "grid") {
					return;
				}
				var voHas = {};
				poEntry.headers.forEach(function(psHeader) {
					voHas[squash(psHeader)] = true;
				});
				var vaNamed = vaHeaders.filter(function(psHeader) {
					return squash(psHeader) !== "";
				});
				var vnSame = vaNamed.filter(function(psHeader) {
					return voHas[squash(psHeader)];
				}).length;
				var vnEach = (vaNamed.length == 0 ? 1 : vnSame / vaNamed.length) * (poEntry.headers.length == vaHeaders.length ? 1 : 0.8);
				if (vnEach > vnBest) {
					vnBest = vnEach;
					vnBestIdx = pnIdx;
				}
			});
			if (vnBestIdx >= 0) {
				voTaken[vnBestIdx] = true;
				voEntry = vaEntries[vnBestIdx];
			}
			vnScore = vnBest;
		} else {
			var vsKey = squash(poItem.text);
			voEntry = takeEntry(function(poEntry) {
				return poEntry.kind == poItem.type && vsKey !== "" && squash(poEntry.text) == vsKey;
			}) || takeEntry(function(poEntry) {
				return poEntry.kind == poItem.type;
			});
			vnScore = voEntry != null ? 1 : 0;
		}
		vnUnits++;
		vnMatchedUnits += vnScore;
		var voLabel = {
			type : poItem.type,
			text : String(poItem.text || "").split("\n")[0]
		};
		if (vnScore <= 0) {
			vaMissing.push(voLabel);
		} else if (vnScore < 0.999) {
			voLabel.score = Math.round(vnScore * 100);
			vaPartial.push(voLabel);
		}
		if (voEntry != null) {
			vaOrders.push(voEntry.order);
		}
	});

	// 순서 일치 : 이미지 순서로 늘어놓은 CLX 순번이 커지는 쌍의 비율
	var vnPairs = 0;
	var vnInOrder = 0;
	for (var i = 0; i < vaOrders.length; i++) {
		for (var j = i + 1; j < vaOrders.length; j++) {
			vnPairs++;
			if (vaOrders[i] < vaOrders[j]) {
				vnInOrder++;
			}
		}
	}
	var vnScorePct = vnUnits == 0 ? 100 : Math.round(vnMatchedUnits / vnUnits * 100);
	var vnOrderPct = vnPairs == 0 ? 100 : Math.round(vnInOrder / vnPairs * 100);
	var vaLines = ["원본 이미지 요소 " + vnUnits + "개 중 반영 " + (Math.round(vnMatchedUnits * 10) / 10) + "개 (반영률 " + vnScorePct + "%) · 위→아래 순서 일치 " + vnOrderPct + "%"];
	vaMissing.forEach(function(poEach) {
		vaLines.push("  - 빠짐 : " + poEach.type + (poEach.text ? " \"" + poEach.text + "\"" : ""));
	});
	vaPartial.forEach(function(poEach) {
		vaLines.push("  - 일부만 : " + poEach.type + (poEach.text ? " \"" + poEach.text + "\"" : "") + " (" + poEach.score + "%)");
	});
	return {
		total : vnUnits,
		matched : vnMatchedUnits,
		score : vnScorePct,
		orderScore : vnOrderPct,
		missing : vaMissing,
		partial : vaPartial,
		lines : vaLines
	};
};

/** 글 줄 수(문단은 줄바꿈으로 나뉜다) */
function lineCount(poItem) {
	return poItem.type == "output" && poItem.text ? poItem.text.split("\n").length : 1;
}

/**
 * 제목 · 문단이 캔버스에서 잘리지 않을 폭(px) 어림 : 가장 긴 줄의 글자 수 × 글자 폭(한글 12 · 그 밖 7, 제목은 굵고 커서 더 넓게).
 * 한 줄 라벨은 옆 입력과 겹치지 않게 늘리지 않는다(0).
 */
function textWidthOf(poItem) {
	var vsVariant = poItem.meta && poItem.meta.variant;
	if (poItem.type != "output" || !(vsVariant == "title" || vsVariant == "heading" || vsVariant == "desc" || vsVariant == "notice")) {
		return 0;
	}
	var vnFactor = vsVariant == "title" ? 1.35 : (vsVariant == "heading" ? 1.2 : 1);
	var vnMax = 0;
	String(poItem.text || "").split("\n").forEach(function(psLine) {
		var vnWidth = 0;
		for (var i = 0; i < psLine.length; i++) {
			vnWidth += psLine.charCodeAt(i) >= 0x2E80 ? 12 : 7;
		}
		vnMax = Math.max(vnMax, vnWidth);
	});
	return Math.round(vnMax * vnFactor) + (vsVariant == "notice" ? 24 : 8);
}

/** 글 영역인가(라벨 · 제목 · 문단) — 세로는 줄 배율로 잰다(그리드처럼 늘이지 않는다). */
function isTextItem(poItem) {
	return poItem.type == "output";
}

/** 유형별 최소 높이(캔버스 px) */
function minHeightOf(poDef, poItem) {
	if (poItem != null && isTextItem(poItem) && lineCount(poItem) > 1) {
		// 여러 줄 문단 : 줄마다 18px + 안내 상자면 안쪽 여백
		return lineCount(poItem) * 18 + (poItem.meta && poItem.meta.variant == "notice" ? 16 : 4);
	}
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
			// 여러 줄 문단은 "한 줄짜리" 가 아니다(줄 높이 중간값을 흐리지 않게) — 대신 isText 로 줄 배율을 쓴다.
			isShort : isShortType(voDef) && lineCount(poItem) == 1,
			isText : isTextItem(poItem),
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
		// 글 영역(라벨 · 문단 · 안내 상자)이 지나는 띠는 줄 배율로 잰다 — 글이 그리드처럼 늘어나지 않는다.
		b.isRowLike = b.isShort || b.isText;
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
				if (b.isRowLike) {
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

	// 남는 높이를 큰 영역·빈 띠가 나눠 쓴다. 너무 늘지(가로 배율·줄 배율 중 큰 값) 않게,
	// 그리고 이미지의 가로세로 비율보다는 줄지 않게(캔버스가 짧으면 아래로 스크롤된다) — 그리드·글상자가 납작해지면 내보낸 화면도 납작해진다.
	var vnAvailable = vnCanvasHeight - MARGIN * 2 - vnRowLength * vnScaleRow;
	var vnScaleFree = vnFreeLength > 0 ? vnAvailable / vnFreeLength : vnScaleRow;
	vnScaleFree = Math.max(Math.min(vnScaleX, vnScaleRow) * 0.9, Math.min(Math.max(vnScaleX, vnScaleRow), vnScaleFree));

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

	// 최소 높이로 늘어난 요소(여러 줄 문단 등)가 아래 요소를 덮지 않게, 늘어난 만큼 그 아래를 모두 내린다(순서는 그대로).
	vaBoxes.forEach(function(b) {
		b.mappedTop = mapY(b.y);
		b.mappedBottom = mapY(b.bottom);
		b.excess = Math.max(0, minHeightOf(b.def, b.item) - (b.mappedBottom - b.mappedTop));
	});
	function shiftAt(pnY) {
		var vnShift = 0;
		vaBoxes.forEach(function(b) {
			if (b.excess > 0 && b.mappedBottom <= pnY + 0.5) {
				vnShift += b.excess;
			}
		});
		return vnShift;
	}

	return vaBoxes.map(function(b) {
		var vnTop = Math.round(b.mappedTop + shiftAt(b.mappedTop));
		var vnBottom = Math.round(b.mappedBottom + shiftAt(b.mappedBottom) - (b.excess > 0 ? b.excess : 0));
		var vnLeft = Math.round(MARGIN + (b.x - vnMinX) * vnScaleX);
		// 제목 · 문단은 글이 잘리지 않을 만큼(캔버스 오른쪽 여백 안에서) 넓힌다.
		var vnWidth = Math.max(Math.round((b.right - b.x) * vnScaleX), Math.min(textWidthOf(b.item), vnCanvasWidth - MARGIN - vnLeft));
		return {
			type : b.item.type,
			text : b.item.text,
			style : b.item.style,
			meta : b.item.meta || null,
			x : Math.max(0, vnLeft),
			y : Math.max(0, vnTop),
			width : Math.max(minWidthOf(b.def), vnWidth),
			height : Math.max(minHeightOf(b.def, b.item), vnBottom - vnTop)
		};
	});
};
