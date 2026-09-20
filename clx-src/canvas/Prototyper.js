/************************************************
 * Prototyper.js
 * Created at 2026. 9. 20.
 *
 * eXBuilder6 Web Prototyper (eX-Canvas)
 *  팔레트 → (DragSource/DropTarget) → 캔버스(XY 그룹)에 cpr.controls.* 동적 생성
 *  → getChildren() 순회로 JSON AST 추출 → 템플릿 뼈대 계획(규칙 또는 Gemini) → .clx 직렬화 → Blob 다운로드
 *
 * 모듈: module/canvas/controlRegistry · canvasAst · templatePlanner · geminiPlanner · clxSerializer · fileDownload
 ************************************************/

var PALETTE_DATA_TYPE = "pt-palette";
var SNAP = 10; // 캔버스 격자(px)
var MIN_SIZE = 20;
var STORAGE_KEY = "eXCanvas.gemini";

/** 선택된 캔버스 항목(래퍼 그룹) */
var mcSelected = null;
/** 유형별 id 일련번호 {btn:2, ipb:1 ...} */
var moIdSeq = {};
/** 캔버스 내부용 런타임 id 일련번호 */
var mnRuntimeSeq = 0;
/** 속성창에 값을 채우는 동안 value-change 를 무시한다. */
var mbSyncing = false;
/** 항목 클릭이 캔버스 클릭(선택 해제)으로 번지는 것을 막는다. */
var mbItemClicked = false;

function mod(psName) {
	return cpr.core.Module.require("module/canvas/" + psName);
}

function snap(pnValue) {
	return Math.max(0, Math.round(pnValue / SNAP) * SNAP);
}

function setStatus(psMessage) {
	var vcStatus = app.lookup("optStatus");
	vcStatus.value = psMessage;
	vcStatus.tooltip = psMessage; // 긴 메시지(AI 오류·참고 사항)는 툴팁으로 전체를 본다.
}

/*
 * 루트 컨테이너에서 load 이벤트 발생 시 호출.
 * 앱이 최초 구성된후 최초 랜더링 직후에 발생하는 이벤트 입니다.
 */
function onBodyLoad(e) {
	initPalette();
	initCanvasDropTarget();
	initPatternCombo();
	restoreSettings();
	refreshPropertyPanel();
	setStatus("팔레트의 컨트롤을 캔버스로 끌어다 놓으세요.");
}

/* ================================================================ 팔레트 */

/** 레지스트리의 유형마다 팔레트 항목(아웃풋)을 만들고 드래그 소스를 건다. */
function initPalette() {
	var vcPalette = app.lookup("grpPaletteItems");
	// 묶음(기본 · 입력 · 데이터 · UDC)마다 머리글 1개 + 유형별 항목. UDC 묶음은 런타임에 등록된 UDC 를 찾아 만든다.
	mod("controlRegistry").getCategories().forEach(function(poCategory) {
		var vcHead = new cpr.controls.Output("optPaletteCat_" + poCategory.id);
		vcHead.value = poCategory.label;
		vcHead.style.setClasses(["pt-palette-category"]);
		vcPalette.addChild(vcHead, {
			"width" : "100%",
			"height" : "22px",
			"autoSize" : "none"
		});
		poCategory.types.forEach(addPaletteItem);
	});
}

function addPaletteItem(poDef) {
	var vcPalette = app.lookup("grpPaletteItems");
	var vcItem = new cpr.controls.Output("optPalette_" + poDef.type.replace(/[^A-Za-z0-9]/g, "_"));
	vcItem.value = poDef.label;
	vcItem.tooltip = poDef.udcType ? poDef.udcType : poDef.tag;
	vcItem.style.setClasses(poDef.udcType ? ["pt-palette-item", "pt-palette-udc"] : ["pt-palette-item"]);
	vcPalette.addChild(vcItem, {
		"width" : "100%",
		"height" : "28px",
		"autoSize" : "none"
	});
	// 더블클릭으로도 추가(터치패드 등 드래그가 불편한 환경)
	vcItem.addEventListener("dblclick", function() {
		var vnCount = app.lookup("canvasGroup").getChildrenCount();
		select(addCanvasItem(poDef.type, 20 + vnCount * SNAP, 20 + vnCount * SNAP));
	});
	createPaletteDragSource(vcItem, poDef);
}

function createPaletteDragSource(pcItem, poDef) {
	var vcFeedback = null;

	function removeFeedback() {
		if (vcFeedback != null) {
			app.removeFloatingControl(vcFeedback, true);
			vcFeedback = null;
		}
	}

	function feedbackConstraint(context) {
		// 포인터 위치 = 드래그 시작점 + 총 이동량 (뷰포트 좌표)
		return {
			"left" : (context.dragStartLocation.x + context.dragDelta.width + 4) + "px",
			"top" : (context.dragStartLocation.y + context.dragDelta.height + 4) + "px",
			"width" : poDef.width + "px",
			"height" : poDef.height + "px"
		};
	}

	new cpr.controls.DragSource(pcItem, {
		options : {
			dataType : PALETTE_DATA_TYPE,
			threadhold : 4
		},
		onDragStart : function(context) {
			context.data = {
				type : poDef.type
			};
			vcFeedback = new cpr.controls.Output();
			vcFeedback.value = poDef.label;
			vcFeedback.style.setClasses(["pt-drag-feedback"]);
			app.floatControl(vcFeedback, feedbackConstraint(context));
		},
		onDragMove : function(context) {
			if (vcFeedback != null) {
				app.getContainer().updateConstraint(vcFeedback, feedbackConstraint(context));
			}
		},
		onDragEnd : function(context) {
			removeFeedback();
		},
		onDragCancel : function(context) {
			removeFeedback();
		}
	});
}

/* ================================================================ 캔버스 : 드롭 · 항목 생성 */

function initCanvasDropTarget() {
	var vcCanvas = app.lookup("canvasGroup");
	new cpr.controls.DropTarget(vcCanvas, {
		isImportant : function(source) {
			return source.dataType == PALETTE_DATA_TYPE;
		},
		onDragEnter : function(context) {
			vcCanvas.style.addClass("pt-drop-active");
		},
		onDragLeave : function(context) {
			vcCanvas.style.removeClass("pt-drop-active");
		},
		onDrop : function(context) {
			vcCanvas.style.removeClass("pt-drop-active");
			if (context.data == null || context.data.type == null) {
				return false;
			}
			// 뷰포트 좌표 → 캔버스 상대 좌표(+ 캔버스 스크롤 위치)
			var voRect = vcCanvas.getActualRect();
			var voView = vcCanvas.getViewPortRect();
			var vnLeft = context.pointerLocation.x - voRect.left + (voView ? voView.left : 0);
			var vnTop = context.pointerLocation.y - voRect.top + (voView ? voView.top : 0);
			select(addCanvasItem(context.data.type, snap(vnLeft), snap(vnTop)));
			return true;
		}
	});
}

/** 유형 접두 + 일련번호로 캔버스 안에서 유일한 id 를 만든다(btn1, ipb2 ...). */
function nextControlId(psPrefix) {
	var vsId;
	do {
		moIdSeq[psPrefix] = (moIdSeq[psPrefix] || 0) + 1;
		vsId = psPrefix + moIdSeq[psPrefix];
	} while (findItemById(vsId) != null);
	return vsId;
}

function findItemById(psId) {
	var ast = mod("canvasAst");
	var vaChildren = app.lookup("canvasGroup").getChildren();
	for (var i = 0; i < vaChildren.length; i++) {
		if (vaChildren[i].userAttr(ast.ATTR_ID) == psId) {
			return vaChildren[i];
		}
	}
	return null;
}

/**
 * 캔버스에 항목을 추가한다.
 * 항목 = 래퍼 그룹(XY) [ 실제 컨트롤 | 투명 덮개(선택·이동) | 크기 조절 핸들 ]
 * 실제 컨트롤 위를 덮개가 덮으므로 디자인 중에는 콤보가 열리거나 입력 포커스가 가지 않는다.
 * @return {cpr.controls.Container} 래퍼 그룹
 */
function addCanvasItem(psType, pnLeft, pnTop) {
	var registry = mod("controlRegistry");
	var ast = mod("canvasAst");
	var voDef = registry.getType(psType);
	var vcCanvas = app.lookup("canvasGroup");
	var vsRuntimeId = "ptItem" + (++mnRuntimeSeq);

	var vcWrapper = new cpr.controls.Container(vsRuntimeId);
	vcWrapper.setLayout(new cpr.controls.layouts.XYLayout());
	vcWrapper.style.setClasses(["pt-item"]);
	vcWrapper.userAttr(ast.ATTR_TYPE, psType);
	vcWrapper.userAttr(ast.ATTR_ID, nextControlId(voDef.idPrefix));
	vcWrapper.userAttr(ast.ATTR_TEXT, voDef.defaultText);

	// ① 실제 eXBuilder6 컨트롤(UDC 포함). 만들다 실패하면 이름표 아웃풋으로 대신한다(배치·내보내기는 그대로 된다).
	var vcControl;
	var vbGhost = voDef.ghost === true;
	try {
		vcControl = registry.createControl(psType, vsRuntimeId + "_ctl", voDef.defaultText);
	} catch (ex) {
		vcControl = new cpr.controls.Output(vsRuntimeId + "_ctl");
		vbGhost = true;
	}
	vcWrapper.addChild(vcControl, fillConstraint());

	// ② 덮개 : 클릭 = 선택, 드래그 = 이동
	var vcOverlay = new cpr.controls.Output(vsRuntimeId + "_ovl");
	if (vbGhost) {
		// 내용이 비어 보이는 유형(이미지 · 빈 그룹 · 임베디드 …)은 덮개에 유형 이름을 보여 준다.
		vcOverlay.value = voDef.label;
		vcOverlay.style.setClasses(["pt-item-overlay", "pt-item-ghost"]);
	} else {
		vcOverlay.style.setClasses(["pt-item-overlay"]);
	}
	vcWrapper.addChild(vcOverlay, fillConstraint());
	vcOverlay.addEventListener("click", function(e) {
		mbItemClicked = true;
		select(vcWrapper);
	});
	createMoveDragSource(vcOverlay, vcWrapper);

	// ③ 핸들 : 드래그 = 크기 조절
	var vcHandle = new cpr.controls.Output(vsRuntimeId + "_hdl");
	vcHandle.style.setClasses(["pt-item-handle"]);
	vcWrapper.addChild(vcHandle, {
		"right" : "0px",
		"bottom" : "0px",
		"width" : "10px",
		"height" : "10px"
	});
	createResizeDragSource(vcHandle, vcWrapper);

	vcCanvas.addChild(vcWrapper, {
		"top" : pnTop + "px",
		"left" : pnLeft + "px",
		"width" : voDef.width + "px",
		"height" : voDef.height + "px"
	});
	setStatus(voDef.label + " 추가 : " + vcWrapper.userAttr(ast.ATTR_ID));
	return vcWrapper;
}

function fillConstraint() {
	return {
		"top" : "0px",
		"right" : "0px",
		"bottom" : "0px",
		"left" : "0px"
	};
}

function getItemRect(pcWrapper) {
	var voConstraint = app.lookup("canvasGroup").getConstraint(pcWrapper) || {};
	return {
		left : Math.round(parseFloat(voConstraint.left) || 0),
		top : Math.round(parseFloat(voConstraint.top) || 0),
		width : Math.round(parseFloat(voConstraint.width) || 0),
		height : Math.round(parseFloat(voConstraint.height) || 0)
	};
}

function setItemRect(pcWrapper, poRect) {
	app.lookup("canvasGroup").updateConstraint(pcWrapper, {
		"left" : Math.max(0, poRect.left) + "px",
		"top" : Math.max(0, poRect.top) + "px",
		"width" : Math.max(MIN_SIZE, poRect.width) + "px",
		"height" : Math.max(MIN_SIZE, poRect.height) + "px"
	});
}

/** 항목 이동 : 드래그 시작 시점의 위치 + 총 이동량. 드롭 타겟과 무관한 독립 드래그다. */
function createMoveDragSource(pcOverlay, pcWrapper) {
	var voStart = null;
	new cpr.controls.DragSource(pcOverlay, {
		options : {
			ignoreDropTargets : true,
			threadhold : 3
		},
		onDragStart : function(context) {
			select(pcWrapper);
			voStart = getItemRect(pcWrapper);
		},
		onDragMove : function(context) {
			if (voStart == null) {
				return;
			}
			setItemRect(pcWrapper, {
				left : snap(voStart.left + context.dragDelta.width),
				top : snap(voStart.top + context.dragDelta.height),
				width : voStart.width,
				height : voStart.height
			});
		},
		onDragEnd : function(context) {
			voStart = null;
			refreshPropertyPanel();
		},
		onDragCancel : function(context) {
			if (voStart != null) {
				setItemRect(pcWrapper, voStart);
				voStart = null;
			}
		}
	});
}

function createResizeDragSource(pcHandle, pcWrapper) {
	var voStart = null;
	new cpr.controls.DragSource(pcHandle, {
		options : {
			ignoreDropTargets : true,
			threadhold : 1
		},
		onDragStart : function(context) {
			context.cursor = "nwse-resize";
			voStart = getItemRect(pcWrapper);
		},
		onDragMove : function(context) {
			if (voStart == null) {
				return;
			}
			setItemRect(pcWrapper, {
				left : voStart.left,
				top : voStart.top,
				width : snap(voStart.width + context.dragDelta.width),
				height : Math.max(MIN_SIZE, Math.round(voStart.height + context.dragDelta.height))
			});
		},
		onDragEnd : function(context) {
			voStart = null;
			refreshPropertyPanel();
		},
		onDragCancel : function(context) {
			if (voStart != null) {
				setItemRect(pcWrapper, voStart);
				voStart = null;
			}
		}
	});
}

/* ================================================================ 선택 · 속성창 */

function select(pcWrapper) {
	if (mcSelected != null && !mcSelected.disposed) {
		mcSelected.style.removeClass("pt-selected");
	}
	mcSelected = pcWrapper;
	if (mcSelected != null) {
		mcSelected.style.addClass("pt-selected");
	}
	refreshPropertyPanel();
}

var TEXT_HINT = {
	"value" : "Text = 표시 값(value)",
	"text" : "Text = 체크박스 문구(text)",
	"items" : "Text = 아이템 목록(쉼표로 구분)",
	"columns" : "Text = 그리드 헤더 목록(쉼표로 구분)",
	"tabs" : "Text = 탭 이름 목록(쉼표로 구분)",
	"sections" : "Text = 아코디언 섹션 제목 목록(쉼표로 구분)",
	"mask" : "Text = 입력 마스크(mask)",
	"src" : "Text = 경로(src)",
	"udctitle" : "Text = UDC 의 title 속성",
	"none" : "이 유형은 Text 를 쓰지 않습니다."
};

/** 선택 항목의 값을 속성창에 채운다. 선택이 없으면 비우고 잠근다. */
function refreshPropertyPanel() {
	var ast = mod("canvasAst");
	var vbHas = mcSelected != null && !mcSelected.disposed;
	var voDef = vbHas ? mod("controlRegistry").getType(mcSelected.userAttr(ast.ATTR_TYPE)) : null;
	var voRect = vbHas ? getItemRect(mcSelected) : null;

	mbSyncing = true;
	app.lookup("optPropType").value = vbHas ? voDef.label : "(선택 없음)";
	app.lookup("optPropHint").value = vbHas ? TEXT_HINT[voDef.textKind] : "";
	app.lookup("ipbPropId").value = vbHas ? mcSelected.userAttr(ast.ATTR_ID) : "";
	app.lookup("ipbPropText").value = vbHas ? mcSelected.userAttr(ast.ATTR_TEXT) : "";
	app.lookup("ipbPropLeft").value = vbHas ? String(voRect.left) : "";
	app.lookup("ipbPropTop").value = vbHas ? String(voRect.top) : "";
	app.lookup("ipbPropWidth").value = vbHas ? String(voRect.width) : "";
	app.lookup("ipbPropHeight").value = vbHas ? String(voRect.height) : "";
	mbSyncing = false;

	["ipbPropId", "ipbPropLeft", "ipbPropTop", "ipbPropWidth", "ipbPropHeight", "btnPropDelete"].forEach(function(psId) {
		app.lookup(psId).enabled = vbHas;
	});
	app.lookup("ipbPropText").enabled = vbHas && voDef.textKind != "none";
}

/*
 * 속성창 인풋박스에서 value-change 이벤트 발생 시 호출.
 * 변경된 값을 선택 항목(래퍼의 사용자 속성 · 레이아웃 제약 · 실제 컨트롤)에 반영한다.
 */
function onPropValueChange(e) {
	var vcInput = e.control;
	if (mbSyncing || mcSelected == null || mcSelected.disposed) {
		return;
	}
	var ast = mod("canvasAst");
	var vsValue = vcInput.value == null ? "" : String(vcInput.value);

	switch (vcInput.id) {
		case "ipbPropId":
			applyId(vsValue);
			break;
		case "ipbPropText":
			mcSelected.userAttr(ast.ATTR_TEXT, vsValue);
			rebuildInnerControl(mcSelected);
			break;
		default:
			var voRect = getItemRect(mcSelected);
			var vnNumber = parseInt(vsValue, 10);
			if (!isNaN(vnNumber)) {
				var voKeyOf = {
					"ipbPropLeft" : "left",
					"ipbPropTop" : "top",
					"ipbPropWidth" : "width",
					"ipbPropHeight" : "height"
				};
				voRect[voKeyOf[vcInput.id]] = vnNumber;
				setItemRect(mcSelected, voRect);
			}
			break;
	}
	refreshPropertyPanel();
}

/** id 는 XML/스크립트 식별자 규칙을 지키고 캔버스 안에서 유일해야 한다. */
function applyId(psNewId) {
	var ast = mod("canvasAst");
	if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(psNewId)) {
		setStatus("ID 는 영문자로 시작하고 영문·숫자·밑줄만 쓸 수 있습니다.");
		return;
	}
	var vcSame = findItemById(psNewId);
	if (vcSame != null && vcSame !== mcSelected) {
		setStatus("이미 쓰고 있는 ID 입니다 : " + psNewId);
		return;
	}
	mcSelected.userAttr(ast.ATTR_ID, psNewId);
	setStatus("ID 변경 : " + psNewId);
}

/** Text 가 바뀌면 실제 컨트롤을 새로 만든다(그리드 컬럼·콤보 아이템·탭처럼 구조가 바뀌는 유형까지 한 경로로 처리). */
function rebuildInnerControl(pcWrapper) {
	var ast = mod("canvasAst");
	var vcOld = pcWrapper.getFirstChild();
	var vsRuntimeId = vcOld.id;
	pcWrapper.removeChild(vcOld, true);
	var vcNew;
	try {
		vcNew = mod("controlRegistry").createControl(pcWrapper.userAttr(ast.ATTR_TYPE), vsRuntimeId, pcWrapper.userAttr(ast.ATTR_TEXT));
	} catch (ex) {
		vcNew = new cpr.controls.Output(vsRuntimeId);
	}
	pcWrapper.insertChild(0, vcNew, fillConstraint());
}

/*
 * 캔버스 그룹에서 click 이벤트 발생 시 호출. 빈 곳을 누르면 선택을 푼다.
 */
function onCanvasGroupClick(e) {
	if (mbItemClicked) {
		mbItemClicked = false;
		return;
	}
	select(null);
}

/*
 * "선택 삭제" 버튼에서 click 이벤트 발생 시 호출.
 */
function onBtnPropDeleteClick(e) {
	if (mcSelected == null) {
		return;
	}
	app.lookup("canvasGroup").removeChild(mcSelected, true);
	mcSelected = null;
	refreshPropertyPanel();
	setStatus("선택한 항목을 삭제했습니다.");
}

/*
 * "전체 삭제" 버튼에서 click 이벤트 발생 시 호출.
 */
function onBtnClearClick(e) {
	if (!confirm("캔버스의 모든 항목을 삭제할까요?")) {
		return;
	}
	app.lookup("canvasGroup").removeAllChildren(true);
	mcSelected = null;
	moIdSeq = {};
	refreshPropertyPanel();
	app.lookup("txaPreview").value = "";
	setStatus("캔버스를 비웠습니다.");
}

/* ================================================================ 내보내기 : AST → 계획 → CLX */

function initPatternCombo() {
	var vcPattern = app.lookup("cmbPattern");
	vcPattern.addItem(new cpr.controls.Item("자동 선택", "auto"));
	mod("templatePlanner").getCatalog().forEach(function(poEach) {
		vcPattern.addItem(new cpr.controls.Item(poEach.id + " " + poEach.desc, poEach.id));
	});
	vcPattern.value = "auto";
}

function getAppName() {
	return mod("fileDownload").sanitizeFileName(app.lookup("ipbAppName").value, "prototype");
}

/** 캔버스 상태 → JSON AST */
function extractAst() {
	return mod("canvasAst").extract(app.lookup("canvasGroup"), {
		name : getAppName(),
		title : "",
		popup : app.lookup("cbxPopup").value == "Y"
	});
}

/**
 * 현재 변환 방식에 따라 CLX 문자열을 만든다(비동기 : Gemini 호출이 끼어들 수 있다).
 * @param {function(String, Object)} pfDone (xml, 해석된 계획 또는 null)
 */
function generateClx(pfDone) {
	var voAst = extractAst();
	if (voAst.children.length == 0) {
		setStatus("캔버스가 비어 있습니다. 먼저 컨트롤을 놓으세요.");
		return;
	}
	var serializer = mod("clxSerializer");
	var planner = mod("templatePlanner");
	var vsMode = app.lookup("cmbMode").value;
	var voOpt = {
		pattern : app.lookup("cmbPattern").value || "auto",
		popup : voAst.app.popup
	};

	function finish(poRawPlan, psPlanner, psNote) {
		voOpt.planner = psPlanner;
		var voPlan = planner.resolve(poRawPlan, voAst, voOpt);
		var vsMessage = (psNote ? psNote + " " : "") + "기준 템플릿 " + voPlan.pattern + " (" + psPlanner + ")";
		if (voPlan.warnings.length > 0) {
			vsMessage += " · 참고 " + voPlan.warnings.length + "건 : " + voPlan.warnings[0];
		}
		setStatus(vsMessage);
		pfDone(serializer.serializePlan(voPlan), voPlan);
	}

	if (vsMode == "xy") {
		setStatus("XY 좌표 그대로 직렬화했습니다.");
		pfDone(serializer.serializeXY(voAst), null);
		return;
	}
	if (vsMode == "gemini") {
		saveSettings();
		setStatus("Gemini 에 화면 계획을 요청하는 중...");
		app.lookup("btnDownload").enabled = false;
		app.lookup("btnSaveResult").enabled = false;
		app.lookup("btnPreview").enabled = false;
		mod("geminiPlanner").plan(voAst, {
			apiKey : app.lookup("ipbApiKey").value,
			model : app.lookup("ipbModel").value,
			route : app.lookup("cmbAiRoute").value,
			memo : app.lookup("txaMemo").value,
			pattern : voOpt.pattern
		}, function(poRawPlan) {
			enableExportButtons();
			finish(poRawPlan, "gemini", "");
		}, function(psError) {
			// AI 실패 시에도 결과물은 나온다 : 규칙 기반으로 대체
			enableExportButtons();
			finish(planner.planByRule(voAst), "rule", "[AI 실패 → 규칙 기반 대체] " + psError);
		});
		return;
	}
	finish(planner.planByRule(voAst), "rule", "");
}

function enableExportButtons() {
	app.lookup("btnDownload").enabled = true;
	app.lookup("btnSaveResult").enabled = true;
	app.lookup("btnPreview").enabled = true;
}

/*
 * "미리보기" 버튼에서 click 이벤트 발생 시 호출.
 */
function onBtnPreviewClick(e) {
	generateClx(function(psXml, poPlan) {
		app.lookup("optPreviewTitle").value = "출력 미리보기 - " + getAppName() + ".clx";
		app.lookup("txaPreview").value = psXml;
	});
}

/*
 * "AST(JSON)" 버튼에서 click 이벤트 발생 시 호출.
 */
function onBtnJsonClick(e) {
	var voAst = extractAst();
	app.lookup("optPreviewTitle").value = "출력 미리보기 - 캔버스 AST(JSON) + 규칙 기반 계획";
	app.lookup("txaPreview").value = JSON.stringify({
		ast : voAst,
		rulePlan : voAst.children.length > 0 ? mod("templatePlanner").planByRule(voAst) : null
	}, null, 2);
}

/*
 * "CLX 다운로드" 버튼에서 click 이벤트 발생 시 호출.
 */
function onBtnDownloadClick(e) {
	generateClx(function(psXml, poPlan) {
		var download = mod("fileDownload");
		var vsName = getAppName();
		app.lookup("optPreviewTitle").value = "출력 미리보기 - " + vsName + ".clx";
		app.lookup("txaPreview").value = psXml;
		download.downloadClx(vsName, psXml);
		// 스튜디오는 같은 이름의 .js 를 짝으로 본다. 브라우저가 연속 다운로드를 막지 않도록 조금 늦춘다.
		window.setTimeout(function() {
			download.downloadJs(vsName, mod("clxSerializer").makeScriptSkeleton(vsName));
		}, 400);
	});
}

/*
 * "result 저장" 버튼에서 click 이벤트 발생 시 호출.
 * 소스 경로 아래 result/<실행 날짜>/<화면명>.clx · .js 로 저장한다(서버가 파일을 쓴다).
 * 저장 서버가 없거나 경로가 설정되지 않았으면 브라우저 다운로드로 대신한다.
 */
function onBtnSaveResultClick(e) {
	generateClx(function(psXml, poPlan) {
		var download = mod("fileDownload");
		var vsName = getAppName();
		var vsScript = mod("clxSerializer").makeScriptSkeleton(vsName);
		var vsPlanNote = app.lookup("optStatus").value;
		app.lookup("optPreviewTitle").value = "출력 미리보기 - " + vsName + ".clx";
		app.lookup("txaPreview").value = psXml;

		download.saveToProject(vsName, psXml, vsScript, function(poResult) {
			setStatus("저장 완료 : " + poResult.dir + "/" + poResult.name + ".clx · .js  (" + vsPlanNote + ")");
		}, function(psError) {
			setStatus("[result 저장 실패 → 브라우저 다운로드로 대체] " + psError);
			download.downloadClx(vsName, psXml);
			window.setTimeout(function() {
				download.downloadJs(vsName, vsScript);
			}, 400);
		});
	});
}

/* ================================================================ Gemini 설정 저장(선택) */

function saveSettings() {
	try {
		if (app.lookup("cbxRememberKey").value == "Y") {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
				apiKey : app.lookup("ipbApiKey").value,
				model : app.lookup("ipbModel").value,
				route : app.lookup("cmbAiRoute").value
			}));
		} else {
			window.localStorage.removeItem(STORAGE_KEY);
		}
	} catch (ex) {
		// 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 저장하지 않는다.
	}
}

function restoreSettings() {
	try {
		var vsSaved = window.localStorage.getItem(STORAGE_KEY);
		if (vsSaved) {
			var voSaved = JSON.parse(vsSaved);
			app.lookup("ipbApiKey").value = voSaved.apiKey || "";
			app.lookup("ipbModel").value = voSaved.model || mod("geminiPlanner").DEFAULT_MODEL;
			app.lookup("cmbAiRoute").value = voSaved.route || "direct";
			app.lookup("cbxRememberKey").value = "Y";
		}
	} catch (ex) {
		// 무시
	}
}
