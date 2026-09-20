/************************************************
 * clxSerializer.module.js
 * Created at 2026. 9. 20.
 *
 * eX-Canvas(Web Prototyper) - JSON → eXBuilder6 표준 .clx(XML) 문자열 직렬화.
 *
 *  1) serializeXY(ast)      : 캔버스 좌표를 그대로 옮긴다(body = cl:xylayout, 자식 = cl:xylayoutdata).
 *  2) serializePlan(plan)   : /templates 의 화면 뼈대(P1~P7)를 따라 만든다.
 *       body(.content-wrapper, formlayout 4행)
 *         ├ udcComAppHeader
 *         ├ grpHeader(.content-header) > grpSearch(.search-box, formlayout 라벨·컨트롤 쌍)
 *         ├ grpData(.content-body)     > content / division-group / tabfolder / form-base
 *         └ grpFooter(.content-footer) > footer-button-group(좌·우 flow)
 *     plan 은 templatePlanner.resolve() 가 만든 "해석 완료된 화면 계획"이다.
 *
 * 규칙: std:sid 는 파일 안에서 유일(접두-16진수 8자리), 컨테이너의 레이아웃 노드는 마지막 자식,
 *       자식마다 부모 레이아웃에 맞는 데이터 노드, style 속성은 쓰지 않는다(클래스만).
 ************************************************/

var TEMPLATE_VERSION = "1.0.4350";

/* ---------------------------------------------------------------- XML 빌더 */

/**
 * @param {String} psTag
 * @param {Array[]} paAttrs [[이름, 값], ...] - 값이 null/undefined 인 항목은 출력하지 않는다.
 * @param {Object[]} paChildren
 */
function el(psTag, paAttrs, paChildren) {
	return {
		tag : psTag,
		attrs : paAttrs || [],
		children : paChildren || []
	};
}

function escapeAttr(pvValue) {
	return String(pvValue).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\r?\n/g, "&#xD;&#xA;");
}

function render(poNode, pnDepth, paOut) {
	var vsIndent = new Array(pnDepth + 1).join("  ");
	var vsOpen = vsIndent + "<" + poNode.tag;
	poNode.attrs.forEach(function(paAttr) {
		if (paAttr[1] != null) {
			vsOpen += " " + paAttr[0] + "=\"" + escapeAttr(paAttr[1]) + "\"";
		}
	});
	var vaChildren = poNode.children.filter(function(poChild) {
		return poChild != null;
	});
	if (vaChildren.length == 0) {
		paOut.push(vsOpen + "/>");
		return;
	}
	paOut.push(vsOpen + ">");
	vaChildren.forEach(function(poChild) {
		render(poChild, pnDepth + 1, paOut);
	});
	paOut.push(vsIndent + "</" + poNode.tag + ">");
}

/* ---------------------------------------------------------------- 문맥(sid·id 유일성) */

function createContext() {
	return {
		sids : {},
		ids : {},
		seq : {}
	};
}

/** 태그 접두에 맞는 유일한 std:sid 를 만든다. */
function sid(poCtx, psPrefix) {
	var vsSid;
	do {
		var vsHex = "";
		for (var i = 0; i < 8; i++) {
			vsHex += "0123456789abcdef".charAt(Math.floor(Math.random() * 16));
		}
		vsSid = psPrefix + "-" + vsHex;
	} while (poCtx.sids[vsSid]);
	poCtx.sids[vsSid] = true;
	return vsSid;
}

/** 컨트롤 id 를 파일 안에서 유일하게 만든다. XML NCName 에 맞지 않는 문자는 제거한다. */
function uniqueId(poCtx, psId) {
	if (psId == null || psId === "") {
		return null;
	}
	var vsBase = String(psId).replace(/[^A-Za-z0-9_]/g, "");
	if (vsBase.length == 0) {
		return null;
	}
	if (/^[0-9]/.test(vsBase)) {
		vsBase = "c" + vsBase;
	}
	var vsId = vsBase;
	var vnSeq = 1;
	while (poCtx.ids[vsId]) {
		vnSeq++;
		vsId = vsBase + vnSeq;
	}
	poCtx.ids[vsId] = true;
	return vsId;
}

/** udccomgridtitle1, udccomformtitle1 ... 처럼 접두별 일련번호 id */
function seqId(poCtx, psPrefix) {
	poCtx.seq[psPrefix] = (poCtx.seq[psPrefix] || 0) + 1;
	return uniqueId(poCtx, psPrefix + poCtx.seq[psPrefix]);
}

/* ---------------------------------------------------------------- 레이아웃 노드 */

function formData(poCtx, pnRow, pnCol, poOpt) {
	poOpt = poOpt || {};
	return el("cl:formdata", [
		["std:sid", sid(poCtx, "f-data")],
		["halign", poOpt.halign],
		["width", poOpt.width],
		["row", pnRow],
		["col", pnCol],
		["rowspan", poOpt.rowspan > 1 ? poOpt.rowspan : null],
		["colspan", poOpt.colspan > 1 ? poOpt.colspan : null],
		["ignore-layout-spacing", poOpt.ignoreSpacing ? "true" : null]
	]);
}

function verticalData(poCtx, psWidth, psHeight, psAutosize) {
	return el("cl:verticaldata", [["std:sid", sid(poCtx, "v-data")], ["width", psWidth], ["height", psHeight], ["autosize", psAutosize]]);
}

function flowData(poCtx, pnWidth, pnHeight, psAutosize) {
	return el("cl:flowlayoutdata", [["std:sid", sid(poCtx, "f-data")], ["width", pnWidth + "px"], ["height", pnHeight + "px"], ["autosize", psAutosize]]);
}

function xyData(poCtx, poRect) {
	return el("cl:xylayoutdata", [
		["std:sid", sid(poCtx, "xyl-data")],
		["top", poRect.y + "px"],
		["left", poRect.x + "px"],
		["width", poRect.width + "px"],
		["height", poRect.height + "px"]
	]);
}

/** 길이 명세: {length, unit, autoSizing, syncminlength, minlength, hidden} */
function lengthEl(psTag, poSpec) {
	return el(psTag, [
		["length", poSpec.length],
		["unit", poSpec.unit],
		["autoSizing", poSpec.autoSizing ? "true" : null],
		["syncminlength", poSpec.syncminlength == null ? null : String(poSpec.syncminlength)],
		["minlength", poSpec.minlength],
		["hidden", poSpec.hidden ? "true" : null]
	]);
}

function PX(pnLength, poMore) {
	var voSpec = {
		length : pnLength,
		unit : "PIXEL"
	};
	for (var vsKey in (poMore || {})) {
		voSpec[vsKey] = poMore[vsKey];
	}
	return voSpec;
}

function FR(pnLength) {
	return {
		length : pnLength == null ? 1 : pnLength,
		unit : "FRACTION"
	};
}

var AUTO = {
	autoSizing : true,
	syncminlength : false
};

/** 여백 값: 숫자는 px, 문자열("1fr")은 그대로(템플릿 셔틀 버튼 그룹의 가운데 정렬) */
function marginValue(pvMargin) {
	return typeof pvMargin == "number" ? pvMargin + "px" : pvMargin;
}

/**
 * @param {Object} poCtx
 * @param {{hspace:Number, vspace:Number, margin:Array, ruled:Boolean}} poOpt margin = [top, right, bottom, left]
 */
function formLayout(poCtx, poOpt, paRows, paCols) {
	var vaMargin = poOpt.margin || [0, 0, 0, 0];
	var vaAttrs = [
		["std:sid", sid(poCtx, "f-layout")],
		["scrollable", "false"],
		["hspace", poOpt.hspace + "px"],
		["vspace", poOpt.vspace + "px"],
		["top-margin", marginValue(vaMargin[0])],
		["right-margin", marginValue(vaMargin[1])],
		["bottom-margin", marginValue(vaMargin[2])],
		["left-margin", marginValue(vaMargin[3])]
	];
	if (poOpt.ruled) {
		// form-base 의 표 형태 구분선(템플릿 P1-6 · P4-1)
		vaAttrs.push(["hseparatorwidth", "1"], ["hseparatortype", "BY_CLASS"], ["vseparatorwidth", "1"], ["vseparatortype", "BY_CLASS"]);
	}
	var vaChildren = [];
	paRows.forEach(function(poRow) {
		vaChildren.push(lengthEl("cl:rows", poRow));
	});
	paCols.forEach(function(poCol) {
		vaChildren.push(lengthEl("cl:columns", poCol));
	});
	return el("cl:formlayout", vaAttrs, vaChildren);
}

function flowLayout(poCtx, psHalign, pnHspacing, pnVspacing) {
	return el("cl:flowlayout", [
		["std:sid", sid(poCtx, "f-layout")],
		["scrollable", "false"],
		["hspacing", pnHspacing == null ? 6 : pnHspacing],
		["vspacing", pnVspacing == null ? 6 : pnVspacing],
		["halign", psHalign]
	]);
}

function verticalLayout(poCtx, pnSpacing) {
	return el("cl:verticallayout", [["std:sid", sid(poCtx, "v-layout")], ["scrollable", "false"], ["spacing", pnSpacing]]);
}

/* ---------------------------------------------------------------- 컨트롤 노드 */

var TAG_INFO = {
	output : ["cl:output", "output"],
	inputbox : ["cl:inputbox", "i-box"],
	button : ["cl:button", "button"],
	combobox : ["cl:combobox", "c-box"],
	dateinput : ["cl:dateinput", "d-input"],
	numbereditor : ["cl:numbereditor", "n-editor"],
	searchinput : ["cl:searchinput", "s-input"],
	checkbox : ["cl:checkbox", "c-box"],
	radiobutton : ["cl:radiobutton", "r-button"],
	textarea : ["cl:textarea", "t-area"],
	grid : ["cl:grid", "grid"],
	tree : ["cl:tree", "tree"],
	tabfolder : ["cl:tabfolder", "t-folder"],
	img : ["cl:img", "image"],
	htmlsnippet : ["cl:htmlsnippet", "htmlsnippet"],
	maskeditor : ["cl:maskeditor", "m-editor"],
	checkboxgroup : ["cl:checkboxgroup", "cb-group"],
	listbox : ["cl:listbox", "l-box"],
	slider : ["cl:slider", "slider"],
	fileinput : ["cl:fileinput", "f-input"],
	progress : ["cl:progress", "progress"],
	group : ["cl:group", "group"],
	accordion : ["cl:accordion", "accordion"],
	calendar : ["cl:calendar", "calendar"],
	pageindexer : ["cl:pageindexer", "p-indexer"],
	fileupload : ["cl:fileupload", "f-upload"],
	embeddedpage : ["cl:embeddedpage", "e-page"],
	embeddedapp : ["cl:embeddedapp", "e-app"],
	uicontrolshell : ["cl:uicontrolshell", "uic-shell"],
	udc : ["cl:udc", "ud-control"]
};

function itemEls(poCtx, paItems) {
	return (paItems || []).map(function(psLabel, pnIdx) {
		return el("cl:item", [["std:sid", sid(poCtx, "item")], ["label", psLabel], ["value", "value" + (pnIdx + 1)]]);
	});
}

function gridParts(poCtx, paHeaders) {
	var vaHeaders = paHeaders && paHeaders.length > 0 ? paHeaders : ["", "", "", "", ""];
	var vaParts = [];
	vaHeaders.forEach(function() {
		vaParts.push(el("cl:gridcolumn", [["std:sid", sid(poCtx, "g-column")], ["width", "80px"]]));
	});
	var vaHeaderCells = [el("cl:gridrow", [["std:sid", sid(poCtx, "g-row")], ["height", "25px"]])];
	var vaDetailCells = [el("cl:gridrow", [["std:sid", sid(poCtx, "g-row")], ["height", "25px"]])];
	vaHeaders.forEach(function(psHeader, pnIdx) {
		vaHeaderCells.push(el("cl:gridcell", [
			["std:sid", sid(poCtx, "gh-cell")],
			["rowindex", 0],
			["colindex", pnIdx],
			["text", psHeader === "" ? null : psHeader]
		]));
		vaDetailCells.push(el("cl:gridcell", [["std:sid", sid(poCtx, "gd-cell")], ["rowindex", 0], ["colindex", pnIdx]]));
	});
	vaParts.push(el("cl:gridheader", [["std:sid", sid(poCtx, "gh-band")]], vaHeaderCells));
	vaParts.push(el("cl:griddetail", [["std:sid", sid(poCtx, "gd-band")]], vaDetailCells));
	return vaParts;
}

/**
 * 컨트롤 1개의 XML 노드. 자식 순서: 레이아웃 데이터 → 고유 자식(아이템·그리드 밴드·탭).
 * @param {Object} poCtx
 * @param {{type:String, id:String, text:String, items:String[], cls:String}} poCtrl
 * @param {Object} poLayoutData 부모 레이아웃에 맞는 데이터 노드
 * @param {Object[]} paExtraChildren 탭 아이템처럼 호출자가 만든 고유 자식
 */
function controlEl(poCtx, poCtrl, poLayoutData, paExtraChildren) {
	if (poCtrl.type == "uitpl" && poCtrl.tpl != null) {
		// UI 템플릿은 카탈로그의 컨트롤 트리를 그대로 옮긴다(자리에 맞는 레이아웃 데이터만 갈아 끼운다).
		return catalogNodeEl(poCtx, poCtrl.tpl.node, poLayoutData);
	}
	var vaInfo = TAG_INFO[poCtrl.type];
	if (vaInfo == null) {
		throw new Error("직렬화를 지원하지 않는 유형: " + poCtrl.type);
	}
	var vaAttrs = [["std:sid", sid(poCtx, vaInfo[1])], ["id", uniqueId(poCtx, poCtrl.id)], ["class", poCtrl.cls || null]];
	var vaChildren = [poLayoutData];
	var vsText = poCtrl.text == null ? "" : poCtrl.text;
	var voLayoutNode = null; // 컨테이너 유형의 레이아웃 노드(마지막 자식)

	switch (poCtrl.type) {
		case "output":
			vaAttrs.push(["value", vsText]);
			break;
		case "button":
			// 아이콘 버튼(btn-right 등)은 템플릿처럼 value 없이 클래스만 둔다.
			vaAttrs.push(["value", vsText === "" ? null : vsText]);
			break;
		case "inputbox":
		case "textarea":
			vaAttrs.push(["value", vsText === "" ? null : vsText]);
			break;
		case "checkbox":
			vaAttrs.push(["text", vsText]);
			break;
		case "combobox":
		case "radiobutton":
		case "checkboxgroup":
		case "listbox":
			vaChildren = vaChildren.concat(itemEls(poCtx, poCtrl.items));
			break;
		case "grid":
			vaChildren = vaChildren.concat(gridParts(poCtx, poCtrl.items));
			break;
		case "htmlsnippet":
			vaAttrs.push(["value", vsText === "" ? null : vsText]);
			break;
		case "maskeditor":
			vaAttrs.push(["mask", vsText === "" ? null : vsText]);
			break;
		case "img":
		case "embeddedpage":
			vaAttrs.push(["src", vsText === "" ? null : vsText]);
			break;
		case "group":
			voLayoutNode = el("cl:xylayout", [["std:sid", sid(poCtx, "xylayout")]]);
			break;
		case "accordion":
			// 템플릿 P3-4 : sectionitem > 잠금 그룹
			vaChildren = vaChildren.concat((poCtrl.items && poCtrl.items.length > 0 ? poCtrl.items : ["아이템"]).map(function(psTitle) {
				return el("cl:sectionitem", [["std:sid", sid(poCtx, "s-item")], ["title", psTitle]], [
					el("cl:group", [["std:sid", sid(poCtx, "group")]], [
						el("std:metadata", [], [el("std:property", [["key", "locked"], ["value", "true"]])]),
						el("cl:xylayout", [["std:sid", sid(poCtx, "xylayout")]])
					])
				]);
			}));
			break;
		case "udc":
			vaAttrs.push(["type", poCtrl.udcType]);
			if (vsText !== "") {
				vaChildren.push(el("cl:property", [["name", "title"], ["value", vsText], ["type", "string"]]));
			}
			break;
		default:
			break;
	}
	return el(vaInfo[0], vaAttrs, vaChildren.concat(paExtraChildren || []).concat([voLayoutNode]));
}

/* ---------------------------------------------------------------- UI 템플릿(스튜디오 상용구) 트리 */

/** 레이아웃 종류별 CLX 태그. kind 는 SyncCatalog 가 붙인다. */
var LAYOUT_TAG = {
	form : "cl:formlayout",
	flow : "cl:flowlayout",
	vertical : "cl:verticallayout",
	xy : "cl:xylayout"
};
var LAYOUT_SID = {
	form : "f-layout",
	flow : "f-layout",
	vertical : "v-layout",
	xy : "xylayout"
};
var LAYOUT_DATA_TAG = {
	form : "cl:formdata",
	flow : "cl:flowlayoutdata",
	vertical : "cl:verticaldata",
	xy : "cl:xylayoutdata"
};
var LAYOUT_DATA_SID = {
	form : "f-data",
	flow : "f-data",
	vertical : "v-data",
	xy : "xy-data"
};

/** {kind, …} → [[이름, 값], …] (kind 는 빼고 나머지를 CLX 속성 그대로 쓴다) */
function catalogAttrs(poValues) {
	var vaAttrs = [];
	Object.keys(poValues || {}).forEach(function(psKey) {
		if (psKey != "kind") {
			vaAttrs.push([psKey, poValues[psKey]]);
		}
	});
	return vaAttrs;
}

/** 카탈로그 노드의 ld → 레이아웃 데이터 XML 노드 */
function catalogLayoutData(poCtx, poLd) {
	if (poLd == null) {
		return null;
	}
	var vsKind = poLd.kind || "form";
	return el(LAYOUT_DATA_TAG[vsKind] || "cl:formdata", [["std:sid", sid(poCtx, LAYOUT_DATA_SID[vsKind] || "f-data")]].concat(catalogAttrs(poLd)));
}

/** 카탈로그 노드의 layout/rows/columns → 레이아웃 XML 노드(컨테이너의 마지막 자식) */
function catalogLayout(poCtx, poNode) {
	var voLayout = poNode.layout;
	if (voLayout == null) {
		return el("cl:xylayout", [["std:sid", sid(poCtx, "xylayout")]]);
	}
	var vsKind = voLayout.kind || "xy";
	var vaTracks = [];
	(poNode.rows || []).forEach(function(poRow) {
		vaTracks.push(el("cl:rows", catalogAttrs(poRow)));
	});
	(poNode.columns || []).forEach(function(poColumn) {
		vaTracks.push(el("cl:columns", catalogAttrs(poColumn)));
	});
	return el(LAYOUT_TAG[vsKind] || "cl:xylayout", [["std:sid", sid(poCtx, LAYOUT_SID[vsKind] || "xylayout")]].concat(catalogAttrs(voLayout)), vaTracks);
}

/** 컨테이너 유형(자식과 레이아웃을 갖는 것) */
function isCatalogContainer(psType) {
	return psType == "group" || psType == "uicontrolshell";
}

/**
 * 카탈로그 노드 하나를 CLX 요소로 만든다(자식까지 재귀).
 * @param {Object} poCtx
 * @param {Object} poNode 카탈로그 노드 { type, cls, id, props, layout, rows, columns, ld, items, gridCols, children }
 * @param {Object} poLayoutDataOverride 이 노드가 놓일 자리의 레이아웃 데이터(최상위에서만 쓴다)
 */
function catalogNodeEl(poCtx, poNode, poLayoutDataOverride) {
	if (poNode.type == "tabitem") {
		var voContent = (poNode.children || [])[0];
		return el("cl:tabitem", [["std:sid", sid(poCtx, "t-item")]].concat(catalogAttrs(poNode.props)),
				[voContent == null ? null : catalogNodeEl(poCtx, voContent, null)]);
	}

	var vaInfo = TAG_INFO[poNode.type];
	var vsTag = vaInfo != null ? vaInfo[0] : "cl:" + poNode.type;
	var vsSidPrefix = vaInfo != null ? vaInfo[1] : poNode.type;

	var vaAttrs = [["std:sid", sid(poCtx, vsSidPrefix)], ["id", uniqueId(poCtx, poNode.id)], ["class", poNode.cls || null]];
	vaAttrs = vaAttrs.concat(catalogAttrs(poNode.props));

	var voLayoutData = poLayoutDataOverride != null ? poLayoutDataOverride : catalogLayoutData(poCtx, poNode.ld);
	var vaChildren = [voLayoutData];

	if (poNode.items != null) {
		poNode.items.forEach(function(poItem) {
			vaChildren.push(el("cl:item", [["std:sid", sid(poCtx, "item")], ["label", poItem.label], ["value", poItem.value]]));
		});
	}
	if (poNode.type == "grid") {
		var vaHeaders = [];
		for (var i = 0; i < (poNode.gridCols > 0 ? poNode.gridCols : 5); i++) {
			vaHeaders.push("");
		}
		vaChildren = vaChildren.concat(gridParts(poCtx, vaHeaders));
	}
	(poNode.children || []).forEach(function(poChild) {
		vaChildren.push(catalogNodeEl(poCtx, poChild, null));
	});
	if (isCatalogContainer(poNode.type)) {
		vaChildren.push(catalogLayout(poCtx, poNode));
	}
	return el(vsTag, vaAttrs, vaChildren);
}

function groupEl(poCtx, psId, psClass, poLayoutData, paChildren, poLayout) {
	return el("cl:group", [["std:sid", sid(poCtx, "group")], ["id", uniqueId(poCtx, psId)], ["class", psClass || null]], [poLayoutData].concat(paChildren).concat([poLayout]));
}

function udcEl(poCtx, psId, psType, poLayoutData, psTitle, pbHidden) {
	var vaChildren = [];
	if (pbHidden) {
		vaChildren.push(el("std:metadata", [], [el("std:property", [["key", "hidden"], ["value", "true"]])]));
	}
	vaChildren.push(poLayoutData);
	if (psTitle != null && psTitle !== "") {
		vaChildren.push(el("cl:property", [["name", "title"], ["value", psTitle], ["type", "string"]]));
	}
	return el("cl:udc", [["std:sid", sid(poCtx, "ud-control")], ["id", psId], ["visible", pbHidden ? "false" : null], ["type", psType]], vaChildren);
}

/** 버튼 자리의 flowlayoutdata : 버튼은 글자 수 어림 + autosize, 버튼 묶음 UDC 는 캔버스에서 그린 너비 그대로 */
function buttonFlowData(poCtx, poBtn, pnHeight) {
	if (poBtn.type == "udc") {
		return flowData(poCtx, poBtn.width || 260, pnHeight, "none");
	}
	return flowData(poCtx, buttonWidth(poBtn.text), pnHeight, "width");
}

/** 버튼 글자 수로 flowlayoutdata 초기 너비를 어림한다(실제 너비는 autosize="width"). */
function buttonWidth(psText) {
	return Math.max(36, (psText || "").length * 12 + 16);
}

/* ---------------------------------------------------------------- 문서 뼈대 */

function headEl(poCtx, pbPopup, psTitle) {
	var vaScreens;
	if (pbPopup) {
		vaScreens = [
			el("screen", [["std:sid", sid(poCtx, "screen")], ["id", "EXB-FULL"], ["name", "EXB-FULL"], ["minwidth", "1440px"], ["width", "1440px"], ["height", "860px"], ["active", "false"]]),
			el("screen", [["std:sid", sid(poCtx, "screen")], ["id", "EXB-DIV"], ["name", "EXB-DIV"], ["minwidth", "1024px"], ["maxwidth", "1439px"], ["width", "1024px"], ["height", "860px"]]),
			el("screen", [["std:sid", sid(poCtx, "screen")], ["id", "EXB-PART"], ["name", "EXB-PART"], ["minwidth", "768px"], ["maxwidth", "1023px"], ["width", "768px"], ["height", "860px"]]),
			el("screen", [["std:sid", sid(poCtx, "screen")], ["id", "EXB-POP"], ["name", "EXB-POP"], ["maxwidth", "767px"], ["width", "480px"], ["height", "580px"], ["useCustomWidth", "true"], ["customHeight", "600"], ["customWidth", "768"], ["active", "true"]])
		];
	} else {
		vaScreens = [
			el("screen", [["std:sid", sid(poCtx, "screen")], ["id", "EXB-FULL"], ["name", "EXB-FULL"], ["minwidth", "1440px"], ["width", "1440px"], ["height", "860px"]]),
			el("screen", [["std:sid", sid(poCtx, "screen")], ["id", "EXB-DIV"], ["name", "EXB-DIV"], ["minwidth", "1024px"], ["maxwidth", "1439px"], ["width", "1024px"], ["height", "860px"]]),
			el("screen", [["std:sid", sid(poCtx, "screen")], ["id", "EXB-PART"], ["name", "EXB-PART"], ["minwidth", "768px"], ["maxwidth", "1023px"], ["width", "768px"], ["height", "860px"]]),
			el("screen", [["std:sid", sid(poCtx, "screen")], ["id", "EXB-POP"], ["name", "EXB-POP"], ["maxwidth", "767px"], ["width", "480px"], ["height", "580px"]])
		];
	}
	return el("head", [["std:sid", sid(poCtx, "head")]], vaScreens.concat([
		el("cl:model", [["std:sid", sid(poCtx, "model")]]),
		el("cl:appspec", [["title", psTitle ? psTitle : null]])
	]));
}

function documentString(poCtx, poHead, poBody, psComment) {
	var voHtml = el("html", [
		["xmlns", "http://www.w3.org/1999/xhtml"],
		["xmlns:cl", "http://tomatosystem.co.kr/cleopatra"],
		["xmlns:std", "http://tomatosystem.co.kr/cleopatra/studio"],
		["std:sid", sid(poCtx, "html")],
		["version", TEMPLATE_VERSION]
	], [poHead, poBody, el("std:studiosetting", [], [el("std:hruler"), el("std:vruler")])]);

	var vaOut = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>"];
	if (psComment) {
		vaOut.push("<!-- " + String(psComment).replace(/--/g, "- -") + " -->");
	}
	render(voHtml, 0, vaOut);
	return vaOut.join("\n") + "\n";
}

/* ---------------------------------------------------------------- 1) XY 그대로 */

/**
 * 캔버스 AST 를 XY 레이아웃 화면으로 직렬화한다.
 * @param {Object} poAst canvasAst.extract() 결과
 * @return {String} .clx XML
 */
exports.serializeXY = function(poAst) {
	var voCtx = createContext();
	var voHead = headEl(voCtx, poAst.app.popup, poAst.app.title);

	var vaChildren = poAst.children.map(function(poNode) {
		var vaExtra = null;
		if (poNode.type == "tabfolder") {
			vaExtra = (poNode.items || []).map(function(psTab, pnIdx) {
				return el("cl:tabitem", [["std:sid", sid(voCtx, "t-item")], ["selected", pnIdx == 0 ? "true" : null], ["text", psTab]], [
					el("cl:group", [["std:sid", sid(voCtx, "group")]], [el("cl:xylayout", [["std:sid", sid(voCtx, "xylayout")]])])
				]);
			});
		}
		return controlEl(voCtx, poNode, xyData(voCtx, poNode.layoutData), vaExtra);
	});
	vaChildren.push(el("cl:xylayout", [["std:sid", sid(voCtx, "xylayout")]]));

	var voBody = el("body", [["std:sid", sid(voCtx, "body")]], vaChildren);
	return documentString(voCtx, voHead, voBody, "generated by eX-Canvas Web Prototyper (mode: xy)");
};

/* ---------------------------------------------------------------- 2) 템플릿 뼈대 */

/** 라벨 아웃풋 */
function labelEl(poCtx, poField, poLayoutData) {
	return controlEl(poCtx, {
		type : "output",
		id : poField.labelId,
		text : poField.label,
		cls : poField.required ? "label required" : "label"
	}, poLayoutData);
}

/** 필드의 컨트롤 부분: 1개면 그대로, 여러 개면 form-control 그룹(예: 날짜 ~ 날짜) */
function fieldControlEl(poCtx, poField, poLayoutData) {
	var vaControls = poField.controls;
	if (vaControls.length == 1) {
		return controlEl(poCtx, vaControls[0], poLayoutData);
	}
	var vaChildren = [];
	var vaCols = [];
	var vnCol = 0;
	vaControls.forEach(function(poCtrl, pnIdx) {
		if (pnIdx > 0 && poField.separator) {
			vaChildren.push(controlEl(poCtx, {
				type : "output",
				text : poField.separator
			}, formData(poCtx, 0, vnCol++)));
			vaCols.push(PX(10, AUTO));
		}
		vaChildren.push(controlEl(poCtx, poCtrl, formData(poCtx, 0, vnCol++)));
		vaCols.push(FR());
	});
	return groupEl(poCtx, null, "form-control", poLayoutData, vaChildren, formLayout(poCtx, {
		hspace : 6,
		vspace : 6
	}, [FR()], vaCols));
}

/**
 * 라벨·컨트롤 쌍을 폼 격자에 놓는다. wide 필드(텍스트에리어 등)는 그 줄의 끝까지 차지한다.
 * @return {{children:Object[], rows:Object[], rowCount:Number}}
 */
function placeFields(poCtx, paFields, pnPairs, pbIgnoreSpacing) {
	var vaChildren = [];
	var vaRows = [];
	var vnRow = 0;
	var vnPair = 0;

	function closeRow(pnHeight) {
		vaRows.push(PX(pnHeight));
		vnRow++;
		vnPair = 0;
	}

	paFields.forEach(function(poField) {
		if (poField.wide && vnPair > 0) {
			closeRow(24);
		}
		var vnCol = vnPair * 2;
		vaChildren.push(labelEl(poCtx, poField, formData(poCtx, vnRow, vnCol, {
			ignoreSpacing : pbIgnoreSpacing
		})));
		if (poField.wide) {
			vaChildren.push(fieldControlEl(poCtx, poField, formData(poCtx, vnRow, vnCol + 1, {
				colspan : pnPairs * 2 - 1
			})));
			closeRow(Math.max(24, poField.height || 24));
			return;
		}
		vaChildren.push(fieldControlEl(poCtx, poField, formData(poCtx, vnRow, vnCol + 1)));
		vnPair++;
		if (vnPair >= pnPairs) {
			closeRow(24);
		}
	});
	if (vnPair > 0) {
		closeRow(24);
	}
	if (vaRows.length == 0) {
		vaRows.push(PX(24));
	}
	return {
		children : vaChildren,
		rows : vaRows
	};
}

function sumRowHeight(paRows, pnVspace, pnPadding) {
	var vnSum = pnPadding;
	paRows.forEach(function(poRow, pnIdx) {
		vnSum += poRow.length + (pnIdx > 0 ? pnVspace : 0);
	});
	return vnSum;
}

/** 조회 조건 영역: grpHeader(.content-header) > grpSearch(.search-box) */
function searchHeaderEl(poCtx, poPlan, pnBodyRow) {
	var voSearch = poPlan.search;
	var vnPairs = Math.max(1, Math.min(4, voSearch.columns || 3));
	var voPlaced = placeFields(poCtx, voSearch.fields, vnPairs, false);
	var vaChildren = voPlaced.children;

	var vaCols = [];
	for (var i = 0; i < vnPairs; i++) {
		vaCols.push(PX(80, AUTO));
		vaCols.push(FR());
	}

	if (voSearch.buttons.length > 0) {
		var vaButtons = voSearch.buttons.map(function(poBtn) {
			return controlEl(poCtx, poBtn, buttonFlowData(poCtx, poBtn, 24));
		});
		var voFlow = flowLayout(poCtx, "right", 6, 0);
		voFlow.attrs.push(["linewrap", "false"]);
		vaChildren.push(groupEl(poCtx, "grpBtnSearch", "search-button-group", formData(poCtx, voPlaced.rows.length - 1, vnPairs * 2), vaButtons, voFlow));
		vaCols.push(PX(97, AUTO));
	}

	var vnHeight = sumRowHeight(voPlaced.rows, 6, 20);
	var voSearchGroup = groupEl(poCtx, "grpSearch", "search-box", verticalData(poCtx, "1408px", vnHeight + "px", "height"), vaChildren, formLayout(poCtx, {
		hspace : 6,
		vspace : 6
	}, voPlaced.rows, vaCols));

	return {
		height : vnHeight,
		node : groupEl(poCtx, "grpHeader", poPlan.popup ? "pop-content-header" : "content-header", formData(poCtx, pnBodyRow, 0), [voSearchGroup], verticalLayout(poCtx, 12))
	};
}

/** 구획 제목: 버튼이 없으면 타이틀 UDC 하나, 있으면 content-title-box(UDC + title-button-group) */
function sectionTitleEl(poCtx, poSection) {
	var vbGridTitle = poSection.kind == "grid";
	var vsUdcType = vbGridTitle ? "udc.com.udcComGridTitle" : "udc.com.udcComFormTitle";
	var vsUdcId = seqId(poCtx, vbGridTitle ? "udccomgridtitle" : "udccomformtitle");
	var vaButtons = poSection.buttons || [];

	if (vaButtons.length == 0) {
		return udcEl(poCtx, vsUdcId, vsUdcType, formData(poCtx, 0, 0), poSection.title);
	}
	var vaButtonEls = vaButtons.map(function(poBtn) {
		return controlEl(poCtx, poBtn, buttonFlowData(poCtx, poBtn, 24));
	});
	return groupEl(poCtx, null, "content-title-box", formData(poCtx, 0, 0), [
		udcEl(poCtx, vsUdcId, vsUdcType, formData(poCtx, 0, 0), poSection.title),
		groupEl(poCtx, null, "title-button-group", formData(poCtx, 0, 1), vaButtonEls, flowLayout(poCtx, "right", 6, 0))
	], formLayout(poCtx, {
		hspace : 32,
		vspace : 0
	}, [FR()], [PX(200, {
		autoSizing : true,
		syncminlength : true
	}), FR()]));
}

/** 입력 폼: group.form-base (표 구분선 formlayout, 라벨 80px + 컨트롤 1fr 쌍) */
function formBaseEl(poCtx, poSection, poLayoutData) {
	var vnPairs = Math.max(1, Math.min(4, poSection.columns || 2));
	var voPlaced = placeFields(poCtx, poSection.fields, vnPairs, true);
	var vaCols = [];
	for (var i = 0; i < vnPairs; i++) {
		vaCols.push(PX(80, {
			autoSizing : true
		}));
		vaCols.push(FR());
	}
	return {
		height : sumRowHeight(voPlaced.rows, 5, 4),
		node : groupEl(poCtx, null, "form-base", poLayoutData, voPlaced.children, formLayout(poCtx, {
			hspace : 9,
			vspace : 5,
			margin : [2, 4, 2, 4],
			ruled : true
		}, voPlaced.rows, vaCols))
	};
}

/**
 * 구획 1개 → XML 노드.
 * @return {{node:Object, fixedHeight:Number}} fixedHeight 가 있으면 내용 높이를 따르는 구획(폼·셔틀)
 */
function sectionEl(poCtx, poSection, poLayoutData) {
	var vnFixed = null;
	var voNode;

	switch (poSection.kind) {
		case "tab":
			voNode = tabFolderEl(poCtx, poSection, poLayoutData);
			break;
		case "shuttle":
			// 템플릿 P7-1(좌우 이동: 버튼 세로 나열) · P7-2(상하 이동: 버튼 가로 나열) 의 formlayout 그대로
			var vaLengths = [];
			var vaShuttle = poSection.buttons.map(function(poBtn, pnIdx) {
				vaLengths.push(PX(24));
				return controlEl(poCtx, poBtn, poSection.vertical ? formData(poCtx, 0, pnIdx) : formData(poCtx, pnIdx, 0));
			});
			voNode = groupEl(poCtx, null, "shuttle-button-group", poLayoutData, vaShuttle, poSection.vertical ? formLayout(poCtx, {
				hspace : 6,
				vspace : 6,
				margin : [0, "1fr", 0, "1fr"]
			}, [FR()], vaLengths) : formLayout(poCtx, {
				hspace : 6,
				vspace : 6,
				margin : ["1fr", 0, "1fr", 0]
			}, vaLengths, [FR()]));
			vnFixed = 24;
			break;
		case "form":
			var voForm = formBaseEl(poCtx, poSection, formData(poCtx, 1, 0));
			voNode = groupEl(poCtx, null, "content", poLayoutData, [sectionTitleEl(poCtx, poSection), voForm.node], formLayout(poCtx, {
				hspace : 4,
				vspace : 4
			}, [PX(24, {
				autoSizing : true
			}), PX(voForm.height, AUTO)], [FR()]));
			vnFixed = 24 + 4 + voForm.height;
			break;
		default:
			// grid · tree · 그 밖의 데이터 컨트롤 : 제목 UDC(0행) + 컨트롤(1행, 1fr) (+ 페이지 인덱서 2행, 템플릿 P1-4)
			var vaContent = [sectionTitleEl(poCtx, poSection), controlEl(poCtx, poSection.control, formData(poCtx, 1, 0))];
			var vaContentRows = [PX(24, {
				autoSizing : true
			}), FR()];
			if (poSection.pager != null) {
				vaContent.push(controlEl(poCtx, poSection.pager, formData(poCtx, 2, 0)));
				vaContentRows.push(PX(24));
			}
			voNode = groupEl(poCtx, null, "content", poLayoutData, vaContent, formLayout(poCtx, {
				hspace : 4,
				vspace : 4
			}, vaContentRows, [FR()]));
			break;
	}
	return {
		node : voNode,
		fixedHeight : vnFixed
	};
}

/**
 * 구획 행렬(rows[행][열])을 컨테이너 자식 + formlayout 으로 만든다.
 * 한 행에 구획이 둘 이상이면 division-group 으로 나란히 놓는다(P2-4 · P3-2 · P6-1 · P7-1).
 */
function dataAreaParts(poCtx, paRows) {
	var vaChildren = [];
	var vaRowSpecs = [];

	paRows.forEach(function(paSections, pnRow) {
		if (paSections.length == 1) {
			var voOne = sectionEl(poCtx, paSections[0], formData(poCtx, pnRow, 0));
			vaChildren.push(voOne.node);
			vaRowSpecs.push(voOne.fixedHeight == null ? FR() : PX(voOne.fixedHeight, AUTO));
			return;
		}
		var vaCols = [];
		var vbAllFixed = true;
		var vnMaxFixed = 0;
		var vaDivChildren = paSections.map(function(poSection, pnCol) {
			var voEach = sectionEl(poCtx, poSection, formData(poCtx, 0, pnCol));
			if (poSection.kind == "tree") {
				vaCols.push(PX(250, {
					minlength : 250
				}));
			} else if (poSection.kind == "shuttle") {
				vaCols.push(PX(24));
			} else {
				vaCols.push(FR(poSection.weight));
			}
			if (poSection.kind != "shuttle") {
				if (voEach.fixedHeight == null) {
					vbAllFixed = false;
				} else {
					vnMaxFixed = Math.max(vnMaxFixed, voEach.fixedHeight);
				}
			}
			return voEach.node;
		});
		vaChildren.push(groupEl(poCtx, null, "division-group", formData(poCtx, pnRow, 0), vaDivChildren, formLayout(poCtx, {
			hspace : 16,
			vspace : 12
		}, [FR()], vaCols)));
		vaRowSpecs.push(vbAllFixed ? PX(vnMaxFixed, AUTO) : FR());
	});

	if (vaRowSpecs.length == 0) {
		vaRowSpecs.push(FR());
	}
	return {
		children : vaChildren,
		layout : formLayout(poCtx, {
			hspace : 12,
			vspace : 12
		}, vaRowSpecs, [FR()])
	};
}

/** 탭폴더(P5): 탭 아이템 > 잠금 그룹 > 구획들 */
function tabFolderEl(poCtx, poSection, poLayoutData) {
	var vaTabItems = poSection.tabs.map(function(poTab, pnIdx) {
		var voArea = dataAreaParts(poCtx, poTab.rows || []);
		var voLocked = el("cl:group", [["std:sid", sid(poCtx, "group")]], [
			el("std:metadata", [], [el("std:property", [["key", "locked"], ["value", "true"]])])
		].concat(voArea.children).concat([voArea.layout]));
		return el("cl:tabitem", [["std:sid", sid(poCtx, "t-item")], ["selected", pnIdx == 0 ? "true" : null], ["text", poTab.text]], [voLocked]);
	});
	return controlEl(poCtx, {
		type : "tabfolder",
		id : poSection.control ? poSection.control.id : null
	}, poLayoutData, vaTabItems);
}

/** 하단 버튼 영역: grpFooter(.content-footer) > footer-button-group(왼쪽 묶음 | 오른쪽 묶음) */
function footerEl(poCtx, poPlan, pnBodyRow) {
	var vnBtnHeight = poPlan.popup ? 24 : 28;

	function side(paButtons, pnCol, psHalign) {
		var vaEls = paButtons.map(function(poBtn) {
			return controlEl(poCtx, poBtn, buttonFlowData(poCtx, poBtn, vnBtnHeight));
		});
		return groupEl(poCtx, null, null, formData(poCtx, 0, pnCol), vaEls, flowLayout(poCtx, psHalign, 6, 6));
	}

	var voButtonGroup = groupEl(poCtx, null, "footer-button-group", verticalData(poCtx, "1408px", vnBtnHeight + "px", "height"), [
		side(poPlan.footer.left, 0, null),
		side(poPlan.footer.right, 1, "right")
	], formLayout(poCtx, {
		hspace : 32,
		vspace : 0
	}, [FR()], [PX(200, AUTO), FR()]));

	return groupEl(poCtx, "grpFooter", poPlan.popup ? "pop-content-footer" : "content-footer", formData(poCtx, pnBodyRow, 0), [voButtonGroup], verticalLayout(poCtx, 12));
}

/**
 * 해석된 화면 계획을 템플릿 뼈대 CLX 로 직렬화한다.
 * @param {Object} poPlan templatePlanner.resolve() 결과
 * @return {String} .clx XML
 */
exports.serializePlan = function(poPlan) {
	var voCtx = createContext();
	var vbPopup = poPlan.popup === true;
	var voHead = headEl(voCtx, vbPopup, poPlan.title);

	var vaBodyChildren = [];
	var vaBodyRows = [];
	var vnRow = 0;

	// 0행: 앱 헤더 UDC (팝업은 숨김 - 템플릿 _P 와 같다)
	voCtx.ids["udcComAppHeader"] = true;
	vaBodyChildren.push(udcEl(voCtx, "udcComAppHeader", "udc.com.udcComAppHeader", formData(voCtx, vnRow, 0), poPlan.title, vbPopup));
	vaBodyRows.push(PX(30, vbPopup ? {
		hidden : true
	} : null));
	vnRow++;

	// 조회 조건
	if (poPlan.search != null && poPlan.search.fields.length > 0) {
		var voHeader = searchHeaderEl(voCtx, poPlan, vnRow);
		vaBodyChildren.push(voHeader.node);
		vaBodyRows.push(PX(voHeader.height, AUTO));
		vnRow++;
	}

	// 데이터 영역
	var voArea = dataAreaParts(voCtx, poPlan.rows || []);
	vaBodyChildren.push(groupEl(voCtx, "grpData", vbPopup ? "pop-content-body" : "content-body", formData(voCtx, vnRow, 0), voArea.children, voArea.layout));
	vaBodyRows.push(FR());
	vnRow++;

	// 하단 버튼
	if (poPlan.footer != null && (poPlan.footer.left.length > 0 || poPlan.footer.right.length > 0)) {
		vaBodyChildren.push(footerEl(voCtx, poPlan, vnRow));
		vaBodyRows.push(PX(vbPopup ? 45 : 50, AUTO));
		vnRow++;
	}

	vaBodyChildren.push(formLayout(voCtx, {
		hspace : 12,
		vspace : 12,
		margin : [10, 16, 10, 16]
	}, vaBodyRows, [FR()]));

	var voBody = el("body", [["std:sid", sid(voCtx, "body")], ["class", vbPopup ? "pop-content-wrapper" : "content-wrapper"]], vaBodyChildren);
	return documentString(voCtx, voHead, voBody, "generated by eX-Canvas Web Prototyper (base template: " + poPlan.pattern + ", planner: " + (poPlan.planner || "rule") + ")");
};

/**
 * 화면 스크립트(.js) 뼈대 - 템플릿의 .js 와 같은 머리 주석.
 * @param {String} psAppName
 */
exports.makeScriptSkeleton = function(psAppName) {
	var vdNow = new Date();
	return ["/************************************************", " * " + psAppName + ".js", " * Created at " + vdNow.getFullYear() + ". " + (vdNow.getMonth() + 1) + ". " + vdNow.getDate() + ".", " *", " * @author eX-Canvas Web Prototyper", " ************************************************/", ""].join("\n");
};
