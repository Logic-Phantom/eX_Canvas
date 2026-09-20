/************************************************
 * templateBuilder.module.js
 * Created at 2026. 9. 20.
 *
 * eX-Canvas(Web Prototyper) - UI 템플릿(스튜디오 상용구) 카탈로그 노드를 다룬다.
 *
 *  - build(node)   : 실제 cpr.controls.* 트리로 만든다 → 캔버스에서 테마 스타일 그대로 보인다.
 *  - summary(tpl)  : 팔레트·속성창에 보여 줄 한 줄 설명.
 *  - roleOf(group) : 템플릿 묶음 이름으로 화면 계획에서의 역할을 추정한다.
 * CLX 직렬화는 clxSerializer.catalogNodeEl() 이 같은 노드를 보고 한다(한 노드, 두 출력).
 *
 * 카탈로그는 tools/SyncCatalog.java 가 만드는 uiTemplateCatalog.module.js 다.
 * 노드 = { type, cls, id, props, layout, rows, columns, ld, items, gridCols, children }
 ************************************************/

/** 카탈로그 노드의 type → 컨트롤 생성자. 없는 유형은 이름표 아웃풋으로 대신한다. */
var FACTORY = {
	output : function() {
		return new cpr.controls.Output();
	},
	inputbox : function() {
		return new cpr.controls.InputBox();
	},
	button : function() {
		return new cpr.controls.Button();
	},
	combobox : function() {
		return new cpr.controls.ComboBox();
	},
	dateinput : function() {
		return new cpr.controls.DateInput();
	},
	numbereditor : function() {
		return new cpr.controls.NumberEditor();
	},
	searchinput : function() {
		return new cpr.controls.SearchInput();
	},
	maskeditor : function() {
		return new cpr.controls.MaskEditor();
	},
	checkbox : function() {
		return new cpr.controls.CheckBox();
	},
	checkboxgroup : function() {
		return new cpr.controls.CheckBoxGroup();
	},
	radiobutton : function() {
		return new cpr.controls.RadioButton();
	},
	listbox : function() {
		return new cpr.controls.ListBox();
	},
	textarea : function() {
		return new cpr.controls.TextArea();
	},
	fileinput : function() {
		return new cpr.controls.FileInput();
	},
	slider : function() {
		return new cpr.controls.Slider();
	},
	progress : function() {
		return new cpr.controls.Progress();
	},
	img : function() {
		return new cpr.controls.Image();
	},
	grid : function() {
		return new cpr.controls.Grid();
	},
	tree : function() {
		return new cpr.controls.Tree();
	},
	tabfolder : function() {
		return new cpr.controls.TabFolder();
	},
	group : function() {
		return new cpr.controls.Container();
	}
};

/** props 중에서 실제 컨트롤에 그대로 옮기는 것(보이는 모양에 영향을 주는 것만). */
var PROP_MAP = {
	"value" : "value",
	"text" : "text",
	"placeholder" : "placeholder",
	"format" : "format",
	"mask" : "mask",
	"maxlength" : "maxLength",
	"inputfilter" : "inputFilter",
	"colcount" : "colCount",
	"fixedwidth" : "fixedWidth",
	"tooltip" : "tooltip",
	"iconalign" : "iconAlign",
	"secret" : "secret"
};

/** 템플릿 묶음 이름 → 화면 계획에서의 역할(템플릿 변환이 어느 자리에 둘지 정할 때 본다). */
var GROUP_ROLE = {
	"버튼" : "button",
	"아웃풋" : "label",
	"폼" : "input",
	"인풋박스" : "input",
	"서치인풋" : "input",
	"넘버에디터" : "input",
	"데이트인풋" : "input",
	"파일인풋" : "input",
	"콤보박스" : "input",
	"체크박스" : "input",
	"체크박스그룹" : "input",
	"라디오버튼" : "input",
	"텍스트에리어" : "input",
	"콘텐츠" : "data",
	"카드" : "data",
	"탭폴더" : "data",
	"프레임" : "data"
};

/**
 * "110" + "PIXEL" → "110px", "1" + "FRACTION" → "1fr"
 * @param {Object} poTrack { length, unit }
 * @return {String}
 */
function trackSize(poTrack) {
	var vsLength = poTrack.length == null ? "1" : String(poTrack.length);
	return poTrack.unit == "FRACTION" ? vsLength + "fr" : vsLength + "px";
}

function toNumber(pvValue, pnDefault) {
	var vnValue = parseFloat(pvValue);
	return isNaN(vnValue) ? pnDefault : vnValue;
}

/** "0px" 처럼 단위가 붙은 값을 그대로, 숫자만 있으면 px 를 붙여 돌려준다. */
function toSize(pvValue, psDefault) {
	if (pvValue == null || pvValue === "") {
		return psDefault;
	}
	return /^-?[0-9.]+$/.test(String(pvValue)) ? pvValue + "px" : String(pvValue);
}

/* ---------------------------------------------------------------- 레이아웃 */

function makeLayout(poNode) {
	var voDef = poNode.layout;
	if (voDef == null) {
		return null;
	}
	if (voDef.kind == "form") {
		var voForm = new cpr.controls.layouts.FormLayout();
		voForm.scrollable = voDef.scrollable == "true";
		voForm.topMargin = toSize(voDef["top-margin"], "0px");
		voForm.rightMargin = toSize(voDef["right-margin"], "0px");
		voForm.bottomMargin = toSize(voDef["bottom-margin"], "0px");
		voForm.leftMargin = toSize(voDef["left-margin"], "0px");
		voForm.horizontalSpacing = toSize(voDef.hspace, "8px");
		voForm.verticalSpacing = toSize(voDef.vspace, "8px");
		voForm.setRows((poNode.rows || [{
			length : "1",
			unit : "FRACTION"
		}]).map(trackSize));
		voForm.setColumns((poNode.columns || [{
			length : "1",
			unit : "FRACTION"
		}]).map(trackSize));
		return voForm;
	}
	if (voDef.kind == "flow") {
		var voFlow = new cpr.controls.layouts.FlowLayout();
		voFlow.scrollable = voDef.scrollable == "true";
		voFlow.horizontalSpacing = toNumber(voDef.hspacing, 4);
		voFlow.verticalSpacing = toNumber(voDef.vspacing, 0);
		if (voDef.halign != null) {
			voFlow.horizontalAlign = voDef.halign;
		}
		if (voDef.valign != null) {
			voFlow.verticalAlign = voDef.valign;
		}
		voFlow.lineWrap = voDef.linewrap != "false";
		return voFlow;
	}
	if (voDef.kind == "vertical") {
		var voVertical = new cpr.controls.layouts.VerticalLayout();
		voVertical.scrollable = voDef.scrollable == "true";
		voVertical.spacing = toNumber(voDef.spacing, 0);
		return voVertical;
	}
	return new cpr.controls.layouts.XYLayout();
}

/**
 * 자식이 부모 레이아웃에 붙을 때 쓰는 제약.
 * 확인된 키만 넘긴다(폼 셀의 width·halign·간격 무시는 미리보기에서 생략, 내보내는 CLX 에는 그대로 들어간다).
 */
function makeConstraint(poChild, psParentKind) {
	var voLd = poChild.ld || {};
	if (psParentKind == "form") {
		var voConstraint = {
			"rowIndex" : toNumber(voLd.row, 0),
			"colIndex" : toNumber(voLd.col, 0)
		};
		if (voLd.rowspan != null) {
			voConstraint.rowSpan = toNumber(voLd.rowspan, 1);
		}
		if (voLd.colspan != null) {
			voConstraint.colSpan = toNumber(voLd.colspan, 1);
		}
		return voConstraint;
	}
	if (psParentKind == "flow" || psParentKind == "vertical") {
		return {
			"width" : toSize(voLd.width, "100%"),
			"height" : toSize(voLd.height, "26px"),
			"autoSize" : voLd.autosize || "none"
		};
	}
	// XY : 카탈로그에는 좌표가 없으므로 세로로 쌓는다.
	return null;
}

/* ---------------------------------------------------------------- 컨트롤 */

function applyProps(pcControl, poNode) {
	if (poNode.cls != null) {
		pcControl.style.setClasses(poNode.cls.split(/\s+/));
	}
	var voProps = poNode.props || {};
	Object.keys(voProps).forEach(function(psKey) {
		var vsTarget = PROP_MAP[psKey];
		if (vsTarget == null) {
			return; // 데이터셋·표현식에 달린 속성(datatype · displayexp …)은 초안에서 쓰지 않는다.
		}
		try {
			pcControl[vsTarget] = psKey == "secret" || psKey == "fixedwidth" ? voProps[psKey] == "true" : voProps[psKey];
		} catch (ex) {
			// 컨트롤이 갖지 않는 속성은 넘어간다(미리보기 품질 문제일 뿐이다).
		}
	});
	if (poNode.items != null && typeof pcControl.addItem == "function") {
		poNode.items.forEach(function(poItem) {
			pcControl.addItem(new cpr.controls.Item(poItem.label, poItem.value));
		});
	}
}

/** 상용구의 그리드는 컬럼 수만 의미가 있다. 머리글·본문 1행씩 표준으로 만든다. */
function fillGrid(pcGrid, pnColumns) {
	var vnCount = pnColumns > 0 ? pnColumns : 5;
	var vaColumns = [];
	var vaHeaderCells = [];
	var vaDetailCells = [];
	for (var i = 0; i < vnCount; i++) {
		vaColumns.push({
			"width" : "100px"
		});
		vaHeaderCells.push({
			"constraint" : {
				"rowIndex" : 0,
				"colIndex" : i
			},
			"configurator" : function(cell) {
			}
		});
		vaDetailCells.push({
			"constraint" : {
				"rowIndex" : 0,
				"colIndex" : i
			},
			"configurator" : function(cell) {
			}
		});
	}
	pcGrid.init({
		"columns" : vaColumns,
		"header" : {
			"rows" : [{
				"height" : "30px"
			}],
			"cells" : vaHeaderCells
		},
		"detail" : {
			"rows" : [{
				"height" : "30px"
			}],
			"cells" : vaDetailCells
		}
	});
}

/** UDC 는 공통 모듈(createCommonUtil)을 요구하는 것이 있어 실패할 수 있다 → 이름표로 대신한다. */
function makeUdc(poNode) {
	var vsType = poNode.props && poNode.props.type ? poNode.props.type : "";
	var vaPath = vsType.split(".");
	var voNamespace = window;
	for (var i = 0; i < vaPath.length && voNamespace != null; i++) {
		voNamespace = voNamespace[vaPath[i]];
	}
	if (typeof voNamespace == "function") {
		try {
			return new voNamespace();
		} catch (ex) {
			// 아래 이름표로 대신한다.
		}
	}
	var vcGhost = new cpr.controls.Output();
	vcGhost.value = vaPath.length > 0 ? vaPath[vaPath.length - 1] : "UDC";
	vcGhost.style.setClasses(["pt-tpl-ghost"]);
	return vcGhost;
}

/**
 * 카탈로그 노드 하나를 실제 컨트롤로 만든다(자식까지 재귀).
 * @param {Object} poNode 카탈로그 노드
 * @return {cpr.controls.UIControl}
 */
function buildNode(poNode) {
	if (poNode.type == "udc") {
		var vcUdc = makeUdc(poNode);
		applyProps(vcUdc, poNode);
		return vcUdc;
	}

	var vfFactory = FACTORY[poNode.type];
	var vcControl;
	if (vfFactory == null) {
		// 모르는 유형은 이름표로 자리만 잡는다(내보내는 CLX 에는 원래 유형 그대로 들어간다).
		vcControl = new cpr.controls.Output();
		vcControl.value = poNode.type;
		vcControl.style.setClasses(["pt-tpl-ghost"]);
		return vcControl;
	}
	vcControl = vfFactory();
	applyProps(vcControl, poNode);

	if (poNode.type == "grid") {
		fillGrid(vcControl, poNode.gridCols);
		return vcControl;
	}
	if (poNode.type == "tabfolder") {
		buildTabItems(vcControl, poNode);
		return vcControl;
	}
	if (poNode.type == "group") {
		var voLayout = makeLayout(poNode);
		var vsKind = poNode.layout != null ? poNode.layout.kind : "xy";
		if (voLayout == null) {
			voLayout = new cpr.controls.layouts.VerticalLayout();
			vsKind = "vertical";
		}
		vcControl.setLayout(voLayout);
		(poNode.children || []).forEach(function(poChild) {
			var vcChild = buildNode(poChild);
			var voConstraint = makeConstraint(poChild, vsKind);
			if (voConstraint == null) {
				vcControl.addChild(vcChild);
			} else {
				vcControl.addChild(vcChild, voConstraint);
			}
		});
	}
	return vcControl;
}

function buildTabItems(pcTabFolder, poNode) {
	var vcFirst = null;
	(poNode.children || []).forEach(function(poItem) {
		var voTabItem = new cpr.controls.TabItem();
		voTabItem.text = poItem.props && poItem.props.text ? poItem.props.text : "아이템";
		var poContent = (poItem.children || [])[0];
		var vcContent;
		if (poContent != null) {
			vcContent = buildNode(poContent);
		} else {
			vcContent = new cpr.controls.Container();
			vcContent.setLayout(new cpr.controls.layouts.XYLayout());
		}
		voTabItem.content = vcContent;
		pcTabFolder.addTabItem(voTabItem);
		if (vcFirst == null) {
			vcFirst = voTabItem;
		}
	});
	if (vcFirst != null && typeof pcTabFolder.setSelectedTabItem == "function") {
		pcTabFolder.setSelectedTabItem(vcFirst);
	}
}

/* ---------------------------------------------------------------- 공개 */

/**
 * 템플릿을 캔버스에 놓을 컨트롤로 만든다.
 * 최상위가 컨테이너가 아니면(버튼 한 개 등) 그대로 돌려준다.
 * @param {Object} poTemplate 카탈로그 항목
 * @return {cpr.controls.UIControl}
 */
exports.build = function(poTemplate) {
	return buildNode(poTemplate.node);
};

/** 팔레트 항목·툴팁에 쓰는 설명 */
exports.summary = function(poTemplate) {
	var vsDesc = poTemplate.desc || "";
	return poTemplate.name + (vsDesc === "" ? "" : "\n" + vsDesc);
};

/** 템플릿 묶음 이름 → 화면 계획에서의 역할 */
exports.roleOf = function(psGroup) {
	return GROUP_ROLE[psGroup] || "input";
};
