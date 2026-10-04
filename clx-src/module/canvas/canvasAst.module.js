/************************************************
 * canvasAst.module.js
 * Created at 2026. 9. 20.
 *
 * eX-Canvas(Web Prototyper) - 캔버스 그룹의 자식 컨트롤을 순회해 JSON AST로 뽑는다.
 *
 * 캔버스의 직계 자식은 "항목 래퍼 그룹"이고, 래퍼의 사용자 속성에 메타 정보가 있다.
 *   pt-type : 컨트롤 유형(controlRegistry의 type)
 *   pt-id   : 사용자가 정한 CLX id
 *   pt-text : 속성창 Text 값(유형에 따라 value/text/아이템/컬럼/탭)
 *   pt-style: 스타일 계열(버튼의 primary | secondary, 없으면 자동)
 *   pt-bind : 데이터 바인딩(ds:데이터셋 · dm:데이터맵.컬럼 · sub:서브미션 · clear:데이터 — openApiPlanner 참고)
 *   pt-meta : 이미지 분석이 붙인 모양 정보(JSON) — { variant : title|heading|desc|notice|label, cells : [열마다 셀 컨트롤], widths : [열 폭 비율] }
 * 위치·크기는 캔버스(XY 레이아웃)의 제약(getConstraint)에서 읽는다 - DOM을 읽지 않는다.
 *
 * AST 형태:
 * {
 *   app : { name, title, popup, canvas : { width, height }, model? },   model = API 연동으로 붙인 데이터 모델(DataSet · DataMap · Submission)
 *   children : [ { type, role, id, text, items?, style?, bind?, meta?, layoutData : { x, y, width, height } } ]
 * }
 ************************************************/

var ATTR_TYPE = "pt-type";
var ATTR_ID = "pt-id";
var ATTR_TEXT = "pt-text";
/** 스타일 계열(버튼 : primary | secondary). 비어 있으면 내보낼 때 자리·글자로 정한다. */
var ATTR_STYLE = "pt-style";
/** 데이터 바인딩 표기(openApiPlanner.parseBind 가 해석한다). 비어 있으면 바인딩 없음. */
var ATTR_BIND = "pt-bind";
/** 모양 정보(JSON 문자열). 비어 있으면 없음. 이미지 분석이 채운다(문단 종류 · 그리드 셀 컨트롤 · 열 폭). */
var ATTR_META = "pt-meta";

/**
 * pt-meta 문자열 → 객체(깨졌거나 비었으면 null)
 * @param {String} psMeta
 */
function parseMeta(psMeta) {
	if (psMeta == null || psMeta === "") {
		return null;
	}
	try {
		var voMeta = JSON.parse(psMeta);
		return voMeta != null && typeof voMeta == "object" ? voMeta : null;
	} catch (e) {
		return null;
	}
}

/**
 * "120px" · 120 · "120.0px" → 120
 * @param {any} pvValue
 * @return {Number}
 */
function toPixel(pvValue) {
	var vnValue = parseFloat(pvValue);
	return isNaN(vnValue) ? 0 : Math.round(vnValue);
}

/**
 * 캔버스 그룹에서 AST를 추출한다.
 * @param {cpr.controls.Container} pcCanvas XY 레이아웃 캔버스 그룹
 * @param {{name:String, title:String, popup:Boolean}} poAppInfo
 * @return {Object} AST
 */
exports.extract = function(pcCanvas, poAppInfo) {
	var registry = cpr.core.Module.require("module/canvas/controlRegistry");
	var vaChildren = [];
	var vnMaxRight = 0;
	var vnMaxBottom = 0;

	pcCanvas.getChildren().forEach(function(pcWrapper) {
		var vsType = pcWrapper.userAttr(ATTR_TYPE);
		var voDef = registry.getType(vsType);
		if (voDef == null) {
			return; // 캔버스 항목이 아닌 자식(있다면)은 건너뛴다.
		}

		var voConstraint = pcCanvas.getConstraint(pcWrapper) || {};
		var voLayoutData = {
			x : toPixel(voConstraint.left),
			y : toPixel(voConstraint.top),
			width : toPixel(voConstraint.width),
			height : toPixel(voConstraint.height)
		};
		vnMaxRight = Math.max(vnMaxRight, voLayoutData.x + voLayoutData.width);
		vnMaxBottom = Math.max(vnMaxBottom, voLayoutData.y + voLayoutData.height);

		var vsText = pcWrapper.userAttr(ATTR_TEXT);
		var voNode = {
			type : voDef.udcType ? "udc" : vsType,
			role : voDef.role,
			id : pcWrapper.userAttr(ATTR_ID),
			text : vsText == null ? "" : vsText,
			layoutData : voLayoutData
		};
		var vsStyle = pcWrapper.userAttr(ATTR_STYLE);
		if (vsStyle != null && vsStyle !== "") {
			voNode.style = vsStyle; // 이미지 분석·속성창에서 정한 스타일 계열(primary | secondary)
		}
		var vsBind = pcWrapper.userAttr(ATTR_BIND);
		if (vsBind != null && vsBind !== "") {
			voNode.bind = vsBind; // API 연동·속성창에서 정한 데이터 바인딩
		}
		var voMeta = parseMeta(pcWrapper.userAttr(ATTR_META));
		if (voMeta != null) {
			voNode.meta = voMeta; // 이미지 분석이 붙인 모양 정보(문단 종류 · 그리드 셀 · 열 폭)
		}
		if (voDef.udcType) {
			voNode.udcType = voDef.udcType; // 예: udc.com.udcComGridTitle
		}
		if (voDef.uiTemplate) {
			// UI 템플릿(스튜디오 상용구)은 컨트롤 트리를 통째로 들고 다닌다. 직렬화는 clxSerializer 가 트리대로 한다.
			voNode.type = "uitpl";
			voNode.tpl = voDef.uiTemplate;
			voNode.text = voDef.uiTemplate.name;
		}
		if (voDef.textKind == "items" || voDef.textKind == "columns" || voDef.textKind == "tabs" || voDef.textKind == "sections") {
			// 그리드 헤더는 빈 칸(번호 · 체크 열)도 열이므로 자리를 남긴다.
			voNode.items = registry.splitCsv(vsText, null, voDef.textKind == "columns");
		}
		vaChildren.push(voNode);
	});

	// 읽기 순서(위→아래, 왼쪽→오른쪽)로 정렬해 둔다. 직렬화·AI 프롬프트가 같은 순서를 본다.
	vaChildren.sort(function(a, b) {
		if (Math.abs(a.layoutData.y - b.layoutData.y) > 8) {
			return a.layoutData.y - b.layoutData.y;
		}
		return a.layoutData.x - b.layoutData.x;
	});

	var voRect = pcCanvas.getActualRect();
	return {
		app : {
			name : poAppInfo.name,
			title : poAppInfo.title || "",
			popup : poAppInfo.popup === true,
			canvas : {
				width : Math.max(Math.round(voRect.width), vnMaxRight),
				height : Math.max(Math.round(voRect.height), vnMaxBottom)
			},
			// API 연동으로 붙인 데이터 모델. 직렬화기가 <cl:model> 에 넣고 바인딩(bind)을 여기 id 로 잇는다.
			model : poAppInfo.model || null
		},
		children : vaChildren
	};
};

exports.ATTR_TYPE = ATTR_TYPE;
exports.ATTR_ID = ATTR_ID;
exports.ATTR_TEXT = ATTR_TEXT;
exports.ATTR_STYLE = ATTR_STYLE;
exports.ATTR_BIND = ATTR_BIND;
exports.ATTR_META = ATTR_META;
exports.parseMeta = parseMeta;
