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
 * 위치·크기는 캔버스(XY 레이아웃)의 제약(getConstraint)에서 읽는다 - DOM을 읽지 않는다.
 *
 * AST 형태:
 * {
 *   app : { name, title, popup, canvas : { width, height } },
 *   children : [ { type, role, id, text, items?, style?, layoutData : { x, y, width, height } } ]
 * }
 ************************************************/

var ATTR_TYPE = "pt-type";
var ATTR_ID = "pt-id";
var ATTR_TEXT = "pt-text";
/** 스타일 계열(버튼 : primary | secondary). 비어 있으면 내보낼 때 자리·글자로 정한다. */
var ATTR_STYLE = "pt-style";

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
			voNode.items = registry.splitCsv(vsText);
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
			}
		},
		children : vaChildren
	};
};

exports.ATTR_TYPE = ATTR_TYPE;
exports.ATTR_ID = ATTR_ID;
exports.ATTR_TEXT = ATTR_TEXT;
exports.ATTR_STYLE = ATTR_STYLE;
