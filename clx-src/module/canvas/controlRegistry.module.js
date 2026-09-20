/************************************************
 * controlRegistry.module.js
 * Created at 2026. 9. 20.
 *
 * eX-Canvas(Web Prototyper) - 팔레트가 지원하는 컨트롤 유형 정의.
 * 유형마다 ① 런타임 생성 방법(cpr.controls.*) ② CLX 태그·std:sid 접두 ③ 기본 크기·ID 접두를 한곳에 둔다.
 * 팔레트·캔버스·AST 추출·CLX 직렬화가 모두 이 표를 본다(유형 추가 = 여기 한 항목 추가).
 *
 * 사용: var registry = cpr.core.Module.require("module/canvas/controlRegistry");
 ************************************************/

/**
 * 쉼표로 구분한 문자열을 배열로 바꾼다.
 * @param {String} psCsv
 * @param {String[]} paDefault
 * @return {String[]}
 */
function splitCsv(psCsv, paDefault) {
	var vaResult = [];
	if (psCsv != null) {
		String(psCsv).split(",").forEach(function(psEach) {
			var vsTrim = psEach.replace(/^\s+|\s+$/g, "");
			if (vsTrim.length > 0) {
				vaResult.push(vsTrim);
			}
		});
	}
	return vaResult.length > 0 ? vaResult : (paDefault || []);
}

/**
 * 헤더 텍스트 목록으로 그리드 init 구성을 만든다(컴파일러가 만드는 init 형태와 같다).
 * @param {String[]} paHeaders
 */
function makeGridConfig(paHeaders) {
	var vaColumns = [];
	var vaHeaderCells = [];
	var vaDetailCells = [];
	paHeaders.forEach(function(psHeader, pnIdx) {
		vaColumns.push({
			"width" : "100px"
		});
		vaHeaderCells.push({
			"constraint" : {
				"rowIndex" : 0,
				"colIndex" : pnIdx
			},
			"configurator" : function(cell) {
				cell.text = psHeader;
			}
		});
		vaDetailCells.push({
			"constraint" : {
				"rowIndex" : 0,
				"colIndex" : pnIdx
			},
			"configurator" : function(cell) {
			}
		});
	});
	return {
		"columns" : vaColumns,
		"header" : {
			"rows" : [{
				"height" : "25px"
			}],
			"cells" : vaHeaderCells
		},
		"detail" : {
			"rows" : [{
				"height" : "25px"
			}],
			"cells" : vaDetailCells
		}
	};
}

/*
 * 유형 정의.
 *  - category  : 팔레트 묶음. basic | input | data
 *  - ghost     : true 면 내용이 비어 보이는 컨트롤 - 캔버스에서 덮개에 유형 이름을 보여 준다.
 *  - type      : AST·CLX 직렬화에서 쓰는 유형 키(소문자, cl: 태그명과 같다)
 *  - role      : 템플릿 매칭용 역할. label | input | button | data
 *  - textKind  : 속성창 "Text" 입력의 뜻. value | text | items | columns | tabs | none
 *  - create    : function(psRuntimeId, psText) → cpr.controls.UIControl
 */
var TYPES = [{
	type : "output",
	label : "Output (라벨)",
	role : "label",
	tag : "cl:output",
	sidPrefix : "output",
	idPrefix : "opt",
	width : 80,
	height : 24,
	defaultText : "항목",
	textKind : "value",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.Output(psId);
		vcCtrl.value = psText;
		return vcCtrl;
	}
}, {
	type : "inputbox",
	label : "InputBox",
	role : "input",
	tag : "cl:inputbox",
	sidPrefix : "i-box",
	idPrefix : "ipb",
	width : 160,
	height : 24,
	defaultText : "",
	textKind : "value",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.InputBox(psId);
		vcCtrl.value = psText;
		return vcCtrl;
	}
}, {
	type : "button",
	label : "Button",
	role : "button",
	tag : "cl:button",
	sidPrefix : "button",
	idPrefix : "btn",
	width : 60,
	height : 28,
	defaultText : "버튼",
	textKind : "value",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.Button(psId);
		vcCtrl.value = psText;
		return vcCtrl;
	}
}, {
	type : "combobox",
	label : "ComboBox",
	role : "input",
	tag : "cl:combobox",
	sidPrefix : "c-box",
	idPrefix : "cmb",
	width : 160,
	height : 24,
	defaultText : "",
	textKind : "items",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.ComboBox(psId);
		splitCsv(psText).forEach(function(psLabel, pnIdx) {
			vcCtrl.addItem(new cpr.controls.Item(psLabel, String(pnIdx + 1)));
		});
		return vcCtrl;
	}
}, {
	type : "dateinput",
	label : "DateInput",
	role : "input",
	tag : "cl:dateinput",
	sidPrefix : "d-input",
	idPrefix : "dti",
	width : 130,
	height : 24,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		return new cpr.controls.DateInput(psId);
	}
}, {
	type : "numbereditor",
	label : "NumberEditor",
	role : "input",
	tag : "cl:numbereditor",
	sidPrefix : "n-editor",
	idPrefix : "nbe",
	width : 130,
	height : 24,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		return new cpr.controls.NumberEditor(psId);
	}
}, {
	type : "searchinput",
	label : "SearchInput",
	role : "input",
	tag : "cl:searchinput",
	sidPrefix : "s-input",
	idPrefix : "sch",
	width : 160,
	height : 24,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		return new cpr.controls.SearchInput(psId);
	}
}, {
	type : "checkbox",
	label : "CheckBox",
	role : "input",
	tag : "cl:checkbox",
	sidPrefix : "c-box",
	idPrefix : "cbx",
	width : 100,
	height : 24,
	defaultText : "체크",
	textKind : "text",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.CheckBox(psId);
		vcCtrl.text = psText;
		return vcCtrl;
	}
}, {
	type : "radiobutton",
	label : "RadioButton",
	role : "input",
	tag : "cl:radiobutton",
	sidPrefix : "r-button",
	idPrefix : "rdb",
	width : 180,
	height : 24,
	defaultText : "예,아니오",
	textKind : "items",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.RadioButton(psId);
		splitCsv(psText).forEach(function(psLabel, pnIdx) {
			vcCtrl.addItem(new cpr.controls.Item(psLabel, String(pnIdx + 1)));
		});
		return vcCtrl;
	}
}, {
	type : "textarea",
	label : "TextArea",
	role : "input",
	tag : "cl:textarea",
	sidPrefix : "t-area",
	idPrefix : "txa",
	width : 240,
	height : 72,
	defaultText : "",
	textKind : "value",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.TextArea(psId);
		vcCtrl.value = psText;
		return vcCtrl;
	}
}, {
	type : "grid",
	label : "Grid",
	role : "data",
	tag : "cl:grid",
	sidPrefix : "grid",
	idPrefix : "grd",
	width : 560,
	height : 220,
	defaultText : "컬럼1,컬럼2,컬럼3,컬럼4,컬럼5",
	textKind : "columns",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.Grid(psId);
		vcCtrl.init(makeGridConfig(splitCsv(psText, ["컬럼1"])));
		return vcCtrl;
	}
}, {
	type : "tree",
	label : "Tree",
	role : "data",
	tag : "cl:tree",
	sidPrefix : "tree",
	idPrefix : "tre",
	width : 200,
	height : 220,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.Tree(psId);
		vcCtrl.addItem(new cpr.controls.TreeItem("트리 항목 1", "1", ""));
		vcCtrl.addItem(new cpr.controls.TreeItem("트리 항목 1-1", "11", "1"));
		vcCtrl.addItem(new cpr.controls.TreeItem("트리 항목 2", "2", ""));
		return vcCtrl;
	}
}, {
	type : "tabfolder",
	label : "TabFolder",
	role : "data",
	tag : "cl:tabfolder",
	sidPrefix : "t-folder",
	idPrefix : "tab",
	width : 560,
	height : 220,
	defaultText : "탭1,탭2",
	textKind : "tabs",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.TabFolder(psId);
		var vcFirst = null;
		splitCsv(psText, ["탭1"]).forEach(function(psTab) {
			var voTabItem = new cpr.controls.TabItem();
			voTabItem.text = psTab;
			var vcContent = new cpr.controls.Container();
			vcContent.setLayout(new cpr.controls.layouts.XYLayout());
			voTabItem.content = vcContent;
			vcCtrl.addTabItem(voTabItem);
			if (vcFirst == null) {
				vcFirst = voTabItem;
			}
		});
		if (vcFirst != null) {
			vcCtrl.setSelectedTabItem(vcFirst);
		}
		return vcCtrl;
	}
}, {
	type : "img",
	label : "Image",
	role : "input",
	ghost : true,
	tag : "cl:img",
	sidPrefix : "image",
	idPrefix : "img",
	width : 120,
	height : 90,
	defaultText : "",
	textKind : "src",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.Image(psId);
		if (psText) {
			vcCtrl.src = psText;
		}
		return vcCtrl;
	}
}, {
	type : "htmlsnippet",
	label : "HTMLSnippet",
	role : "input",
	tag : "cl:htmlsnippet",
	sidPrefix : "htmlsnippet",
	idPrefix : "htm",
	width : 200,
	height : 40,
	defaultText : "<b>HTML</b> 스니펫",
	textKind : "value",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.HTMLSnippet(psId);
		vcCtrl.value = psText;
		return vcCtrl;
	}
}, {
	type : "maskeditor",
	label : "MaskEditor",
	role : "input",
	tag : "cl:maskeditor",
	sidPrefix : "m-editor",
	idPrefix : "mse",
	width : 130,
	height : 24,
	defaultText : "XXX-XXXX",
	textKind : "mask",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.MaskEditor(psId);
		if (psText) {
			vcCtrl.mask = psText;
		}
		return vcCtrl;
	}
}, {
	type : "checkboxgroup",
	label : "CheckBoxGroup",
	role : "input",
	tag : "cl:checkboxgroup",
	sidPrefix : "cb-group",
	idPrefix : "cbg",
	width : 240,
	height : 24,
	defaultText : "항목1,항목2,항목3",
	textKind : "items",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.CheckBoxGroup(psId);
		splitCsv(psText).forEach(function(psLabel, pnIdx) {
			vcCtrl.addItem(new cpr.controls.Item(psLabel, String(pnIdx + 1)));
		});
		return vcCtrl;
	}
}, {
	type : "listbox",
	label : "ListBox",
	role : "input",
	tag : "cl:listbox",
	sidPrefix : "l-box",
	idPrefix : "lbx",
	width : 160,
	height : 96,
	defaultText : "항목1,항목2,항목3",
	textKind : "items",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.ListBox(psId);
		splitCsv(psText).forEach(function(psLabel, pnIdx) {
			vcCtrl.addItem(new cpr.controls.Item(psLabel, String(pnIdx + 1)));
		});
		return vcCtrl;
	}
}, {
	type : "slider",
	label : "Slider",
	role : "input",
	tag : "cl:slider",
	sidPrefix : "slider",
	idPrefix : "sld",
	width : 160,
	height : 24,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		return new cpr.controls.Slider(psId);
	}
}, {
	type : "fileinput",
	label : "FileInput",
	role : "input",
	tag : "cl:fileinput",
	sidPrefix : "f-input",
	idPrefix : "fi",
	width : 240,
	height : 24,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		return new cpr.controls.FileInput(psId);
	}
}, {
	type : "progress",
	label : "Progress",
	role : "input",
	tag : "cl:progress",
	sidPrefix : "progress",
	idPrefix : "prg",
	width : 200,
	height : 20,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.Progress(psId);
		vcCtrl.value = 40; // 캔버스에서 모양이 보이도록(CLX 에는 넣지 않는다)
		return vcCtrl;
	}
}, {
	type : "group",
	label : "Group (빈 그룹)",
	role : "data",
	ghost : true,
	tag : "cl:group",
	sidPrefix : "group",
	idPrefix : "grp",
	width : 300,
	height : 160,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.Container(psId);
		vcCtrl.setLayout(new cpr.controls.layouts.XYLayout());
		return vcCtrl;
	}
}, {
	type : "accordion",
	label : "Accordion",
	role : "data",
	tag : "cl:accordion",
	sidPrefix : "accordion",
	idPrefix : "acd",
	width : 300,
	height : 200,
	defaultText : "섹션1,섹션2",
	textKind : "sections",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.Accordion(psId);
		splitCsv(psText, ["섹션1"]).forEach(function(psTitle) {
			var voSection = new cpr.controls.SectionItem();
			voSection.title = psTitle;
			var vcContent = new cpr.controls.Container();
			vcContent.setLayout(new cpr.controls.layouts.XYLayout());
			voSection.content = vcContent;
			vcCtrl.addSection(voSection);
		});
		return vcCtrl;
	}
}, {
	type : "calendar",
	label : "Calendar",
	role : "data",
	tag : "cl:calendar",
	sidPrefix : "calendar",
	idPrefix : "cal",
	width : 260,
	height : 240,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		return new cpr.controls.Calendar(psId);
	}
}, {
	type : "pageindexer",
	label : "PageIndexer",
	role : "pager",
	tag : "cl:pageindexer",
	sidPrefix : "p-indexer",
	idPrefix : "pix",
	width : 300,
	height : 24,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		var vcCtrl = new cpr.controls.PageIndexer(psId);
		vcCtrl.totalRowCount = 100; // 캔버스에서 페이지 번호가 보이도록(CLX 에는 넣지 않는다)
		return vcCtrl;
	}
}, {
	type : "fileupload",
	label : "FileUpload",
	role : "data",
	tag : "cl:fileupload",
	sidPrefix : "f-upload",
	idPrefix : "fud",
	width : 360,
	height : 160,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		return new cpr.controls.FileUpload(psId);
	}
}, {
	type : "embeddedpage",
	label : "EmbeddedPage",
	role : "data",
	ghost : true,
	tag : "cl:embeddedpage",
	sidPrefix : "e-page",
	idPrefix : "ep",
	width : 360,
	height : 200,
	defaultText : "",
	textKind : "src",
	create : function(psId, psText) {
		return new cpr.controls.EmbeddedPage(psId); // 디자인 중에는 외부 페이지를 불러오지 않는다.
	}
}, {
	type : "embeddedapp",
	label : "EmbeddedApp",
	role : "data",
	ghost : true,
	tag : "cl:embeddedapp",
	sidPrefix : "e-app",
	idPrefix : "ea",
	width : 360,
	height : 200,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		return new cpr.controls.EmbeddedApp(psId);
	}
}, {
	type : "uicontrolshell",
	label : "UIControlShell",
	role : "data",
	ghost : true,
	tag : "cl:uicontrolshell",
	sidPrefix : "uic-shell",
	idPrefix : "shl",
	width : 360,
	height : 200,
	defaultText : "",
	textKind : "none",
	create : function(psId, psText) {
		return new cpr.controls.UIControlShell(psId);
	}
}];

/* 팔레트 묶음 : 묶음별로 나눠 보여 준다. 마지막 묶음(UDC)은 런타임에 찾는다. */
var CATEGORIES = [{
	id : "basic",
	label : "기본",
	types : ["output", "button", "img", "htmlsnippet", "progress"]
}, {
	id : "input",
	label : "입력",
	types : ["inputbox", "combobox", "dateinput", "numbereditor", "maskeditor", "searchinput", "checkbox", "checkboxgroup", "radiobutton", "listbox", "textarea", "slider", "fileinput"]
}, {
	id : "data",
	label : "데이터 · 컨테이너",
	types : ["grid", "tree", "tabfolder", "accordion", "group", "pageindexer", "calendar", "fileupload", "embeddedpage", "embeddedapp", "uicontrolshell"]
}];

var TYPE_MAP = {};
TYPES.forEach(function(poDef) {
	TYPE_MAP[poDef.type] = poDef;
});

/* ---------------------------------------------------------------- UDC */

var UDC_PREFIX = "udc:";

/**
 * 런타임에 등록된 UDC 를 찾는다.
 * 빌드 산출물 cpr-lib/udc.js 가 window.udc.<패키지>.<이름> 에 생성자를 등록하므로(예: udc.com.udcComGridTitle)
 * 그 네임스페이스를 훑어 cpr.controls.UDCBase 를 상속한 생성자만 모은다.
 * @return {String[]} UDC 정규 이름 목록(정렬)
 */
function findUdcNames() {
	var vaNames = [];

	function walk(poPackage, psPath, pnDepth) {
		if (poPackage == null || pnDepth > 6) {
			return;
		}
		Object.keys(poPackage).forEach(function(psKey) {
			var vvEach = poPackage[psKey];
			var vsName = psPath + "." + psKey;
			if (typeof vvEach == "function" && vvEach.prototype instanceof cpr.controls.UDCBase) {
				vaNames.push(vsName);
			} else if (vvEach != null && typeof vvEach == "object") {
				walk(vvEach, vsName, pnDepth + 1);
			}
		});
	}
	walk(window.udc, "udc", 0);
	return vaNames.sort();
}

function lookupUdcConstructor(psQualifiedName) {
	var vvCurrent = window;
	psQualifiedName.split(".").forEach(function(psPart) {
		vvCurrent = vvCurrent == null ? null : vvCurrent[psPart];
	});
	return typeof vvCurrent == "function" ? vvCurrent : null;
}

/**
 * UDC 이름으로 템플릿 매칭용 역할을 어림한다.
 *  header : 앱 헤더(직렬화기가 0행에 직접 넣으므로 계획에서는 제목만 가져오고 소비한다)
 *  title  : 그리드/폼 타이틀(아래 구획의 제목으로 쓴다)
 *  button : 버튼 묶음 UDC(구획 제목 줄 · 조회 · 하단 버튼 자리에 놓인다)
 *  input  : 그 밖 - 입력 컨트롤처럼 필드 자리에 놓인다
 */
function udcRole(psName) {
	if (/AppHeader$/i.test(psName)) {
		return "header";
	}
	if (/Title$/i.test(psName)) {
		return "title";
	}
	if (/Btn|Button/i.test(psName)) {
		return "button";
	}
	return "input";
}

/** UDC 유형 정의를 만든다(유형 키 = "udc:" + 정규 이름). */
function makeUdcDef(psQualifiedName) {
	var vsSimple = psQualifiedName.substring(psQualifiedName.lastIndexOf(".") + 1);
	var vfConstructor = lookupUdcConstructor(psQualifiedName);
	var vbHasTitle = vfConstructor != null && "title" in vfConstructor.prototype;
	var vsRole = udcRole(vsSimple);
	return {
		type : UDC_PREFIX + psQualifiedName,
		udcType : psQualifiedName,
		ghost : true, // 공통 모듈이 없는 프로젝트에서는 UDC 가 비어 보일 수 있어 항상 이름표를 함께 보여 준다.
		label : vsSimple,
		role : vsRole,
		tag : "cl:udc",
		sidPrefix : "ud-control",
		idPrefix : vsSimple.charAt(0).toLowerCase() + vsSimple.substring(1),
		width : vsRole == "button" ? 260 : 400,
		height : vsRole == "header" ? 30 : 24,
		defaultText : vbHasTitle ? "제목" : "",
		textKind : vbHasTitle ? "udctitle" : "none",
		create : function(psId, psText) {
			if (vfConstructor == null) {
				throw new Error("등록되지 않은 UDC: " + psQualifiedName);
			}
			var vcCtrl = new vfConstructor(psId);
			if (vbHasTitle && psText) {
				vcCtrl.title = psText;
			}
			return vcCtrl;
		}
	};
}

/* ---------------------------------------------------------------- UI 템플릿(스튜디오 상용구) */

var UITPL_PREFIX = "uitpl:";

/** 캔버스에 처음 놓을 때의 최대 크기. 상용구는 1580px 기준이 많아 그대로 놓으면 캔버스를 벗어난다. */
var UITPL_MAX_WIDTH = 880;
var UITPL_MAX_HEIGHT = 420;

function uiTemplateCatalog() {
	return cpr.core.Module.require("module/canvas/uiTemplateCatalog");
}

function templateBuilder() {
	return cpr.core.Module.require("module/canvas/templateBuilder");
}

/**
 * UI 템플릿 유형 정의를 만든다(유형 키 = "uitpl:" + uuid).
 * 컨트롤 한 개짜리 템플릿도 있고 그룹·탭폴더처럼 트리를 가진 것도 있다 - 만드는 일은 templateBuilder 가 한다.
 */
function makeUiTemplateDef(poTemplate) {
	var builder = templateBuilder();
	return {
		type : UITPL_PREFIX + poTemplate.uuid,
		uiTemplate : poTemplate,
		// 빈 프레임·카드처럼 안이 비어 보이는 템플릿은 캔버스에서 이름표를 함께 보여 준다.
		ghost : poTemplate.node.type == "group" && (poTemplate.node.children == null || poTemplate.node.children.length == 0),
		label : poTemplate.label,
		tooltip : builder.summary(poTemplate),
		role : builder.roleOf(poTemplate.group),
		tag : "cl:group", // 실제 태그는 노드마다 다르다(직렬화는 clxSerializer.catalogNodeEl 이 한다).
		sidPrefix : "group",
		idPrefix : "tpl",
		width : Math.min(poTemplate.width, UITPL_MAX_WIDTH),
		height : Math.min(poTemplate.height, UITPL_MAX_HEIGHT),
		defaultText : "",
		textKind : "none",
		create : function(psRuntimeId, psText) {
			return builder.build(poTemplate);
		}
	};
}

/**
 * 팔레트에 보여 줄 UI 템플릿 목록(카탈로그 순서 = 묶음 → 이름).
 * @return {Object[]}
 */
exports.getUiTemplates = function() {
	var voCatalog = uiTemplateCatalog();
	if (voCatalog == null || voCatalog.TEMPLATES == null) {
		return [];
	}
	return voCatalog.TEMPLATES.map(function(poTemplate) {
		var vsType = UITPL_PREFIX + poTemplate.uuid;
		if (TYPE_MAP[vsType] == null) {
			TYPE_MAP[vsType] = makeUiTemplateDef(poTemplate);
		}
		return TYPE_MAP[vsType];
	});
};

/**
 * 팔레트에 보여 줄 UDC 유형 목록.
 * @return {Object[]}
 */
exports.getUdcTypes = function() {
	return findUdcNames().map(function(psName) {
		var vsType = UDC_PREFIX + psName;
		if (TYPE_MAP[vsType] == null) {
			TYPE_MAP[vsType] = makeUdcDef(psName);
		}
		return TYPE_MAP[vsType];
	});
};

/**
 * 팔레트 묶음 목록 : [{ id, label, types : [유형 정의] }]. 마지막 묶음은 프로젝트의 UDC.
 */
exports.getCategories = function() {
	var vaResult = CATEGORIES.map(function(poCategory) {
		return {
			id : poCategory.id,
			label : poCategory.label,
			types : poCategory.types.map(function(psType) {
				return TYPE_MAP[psType];
			})
		};
	});
	var vaUdc = exports.getUdcTypes();
	if (vaUdc.length > 0) {
		vaResult.push({
			id : "udc",
			label : "UDC (프로젝트 공통)",
			types : vaUdc
		});
	}
	// UI 템플릿은 상용구 묶음("[버튼]", "[폼]" …)을 그대로 팔레트 묶음으로 쓴다.
	var voGroups = {};
	exports.getUiTemplates().forEach(function(poDef) {
		var vsGroup = poDef.uiTemplate.group;
		if (voGroups[vsGroup] == null) {
			voGroups[vsGroup] = [];
			vaResult.push({
				id : "uitpl_" + vsGroup,
				label : "UI 템플릿 · " + vsGroup,
				types : voGroups[vsGroup]
			});
		}
		voGroups[vsGroup].push(poDef);
	});
	return vaResult;
};

/**
 * 기본 컨트롤 유형 목록(정의 순서). UDC 는 getUdcTypes().
 * @return {Object[]}
 */
exports.getTypes = function() {
	return TYPES;
};

/**
 * 유형 정의를 얻는다. 없는 유형이면 null. "udc:<정규 이름>" 은 등록된 UDC 면 즉석에서 만든다.
 * @param {String} psType
 */
exports.getType = function(psType) {
	if (psType != null && TYPE_MAP[psType] == null && String(psType).indexOf(UDC_PREFIX) == 0) {
		var vsName = String(psType).substring(UDC_PREFIX.length);
		if (lookupUdcConstructor(vsName) != null) {
			TYPE_MAP[psType] = makeUdcDef(vsName);
		}
	}
	if (psType != null && TYPE_MAP[psType] == null && String(psType).indexOf(UITPL_PREFIX) == 0) {
		exports.getUiTemplates(); // 카탈로그를 한 번 훑으면 TYPE_MAP 에 들어온다.
	}
	return TYPE_MAP[psType] || null;
};

/**
 * 유형에 맞는 런타임 컨트롤을 만든다.
 * @param {String} psType
 * @param {String} psRuntimeId 캔버스 안에서만 쓰는 내부 ID(사용자가 정하는 CLX id와 별개)
 * @param {String} psText 속성창 Text 값
 * @return {cpr.controls.UIControl}
 */
exports.createControl = function(psType, psRuntimeId, psText) {
	var voDef = exports.getType(psType);
	if (voDef == null) {
		throw new Error("지원하지 않는 컨트롤 유형: " + psType);
	}
	return voDef.create(psRuntimeId, psText == null ? voDef.defaultText : psText);
};

exports.splitCsv = splitCsv;
