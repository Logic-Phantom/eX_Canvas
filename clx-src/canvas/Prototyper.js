/************************************************
 * Prototyper.js
 * Created at 2026. 9. 20.
 *
 * eXBuilder6 Web Prototyper (eX-Canvas)
 *  팔레트 → (DragSource/DropTarget) → 캔버스(XY 그룹)에 cpr.controls.* 동적 생성
 *  → getChildren() 순회로 JSON AST 추출 → 템플릿 뼈대 계획(규칙 또는 Gemini) → .clx 직렬화 → Blob 다운로드
 *
 * 모듈: module/canvas/controlRegistry · canvasAst · templatePlanner · geminiPlanner · clxSerializer · fileDownload
 *       module/canvas/collabSession · yjsLoader (공유 체크박스를 켰을 때만 쓴다)
 ************************************************/

var PALETTE_DATA_TYPE = "pt-palette";
var SNAP = 10; // 캔버스 격자(px)
var MIN_SIZE = 20;
var STORAGE_KEY = "eXCanvas.gemini";
var COLLAB_STORAGE_KEY = "eXCanvas.collab";
/** 래퍼의 사용자 속성 : 공유 문서에서 이 항목을 가리키는 전역 고유 키 */
var ATTR_UID = "pt-uid";

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
/** 저장 서버(/canvas/saveResult.do)가 쓸 수 있는 상태인지 — 앱 로드 때 1회 확인 */
var mbServerSave = false;
/** 저장 서버가 알려준 경로(상태 표시용) */
var msServerSaveDir = "";
/** 항목 uid 일련번호(만든 시각·난수와 합쳐 전역 고유 키를 만든다) */
var mnUidSeq = 0;
/** 공유 체크박스를 코드가 바꾸는 동안 value-change 를 무시한다. */
var mbShareSyncing = false;
/** 화면이 뜰 때 찾아 둔 공유 서버 주소 */
var msCollabBaseUrl = "";
/** 접속자 표시용 컨트롤 : clientId → { box : 선택 상자, chip : 이름표 } */
var moPeerMarkers = {};
/** 드래그 중 좌표 전송을 묶는 예약 : uid → timeout id */
var moRectTimer = {};
/** 마우스 좌표 전송 간격 제한 */
var mbCursorBusy = false;
/** 공유를 켠 순간 내 캔버스에 있던 항목의 uid(공유본과 합칠지 정할 때 쓴다) */
var maPreShareUids = [];

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
	initSaveTarget();
	initCollab();
	setStatus("팔레트의 컨트롤을 캔버스로 끌어다 놓으세요.");
}

/* ================================================================ 팔레트 */

/** 팔레트에 만든 컨트롤 : [{ control, kind : "category"|"item", text }] - 찾기 상자가 이 목록을 보고 숨긴다. */
var maPaletteRows = [];

/** 레지스트리의 유형마다 팔레트 항목(아웃풋)을 만들고 드래그 소스를 건다. */
function initPalette() {
	var vcPalette = app.lookup("grpPaletteItems");
	maPaletteRows = [];
	// 묶음(기본 · 입력 · 데이터 · UDC · UI 템플릿)마다 머리글 1개 + 유형별 항목.
	// UDC 는 런타임에 등록된 것을, UI 템플릿은 uiTemplateCatalog(자동 생성)를 훑어 만든다.
	mod("controlRegistry").getCategories().forEach(function(poCategory) {
		var vcHead = new cpr.controls.Output("optPaletteCat_" + poCategory.id.replace(/[^A-Za-z0-9]/g, "_"));
		vcHead.value = poCategory.label;
		vcHead.style.setClasses(["pt-palette-category"]);
		vcPalette.addChild(vcHead, {
			"width" : "100%",
			"height" : "22px",
			"autoSize" : "none"
		});
		maPaletteRows.push({
			control : vcHead,
			kind : "category",
			text : poCategory.label.toLowerCase(),
			hits : 0
		});
		poCategory.types.forEach(addPaletteItem);
	});
}

function addPaletteItem(poDef) {
	var vcPalette = app.lookup("grpPaletteItems");
	var vcItem = new cpr.controls.Output("optPalette_" + poDef.type.replace(/[^A-Za-z0-9]/g, "_"));
	vcItem.value = poDef.label;
	vcItem.tooltip = poDef.tooltip || (poDef.udcType ? poDef.udcType : poDef.tag);
	var vaClasses = ["pt-palette-item"];
	if (poDef.udcType) {
		vaClasses.push("pt-palette-udc");
	}
	if (poDef.uiTemplate) {
		vaClasses.push("pt-palette-tpl");
	}
	vcItem.style.setClasses(vaClasses);
	vcPalette.addChild(vcItem, {
		"width" : "100%",
		"height" : "28px",
		"autoSize" : "none"
	});
	maPaletteRows.push({
		control : vcItem,
		kind : "item",
		text : (poDef.label + " " + (poDef.tooltip || "")).toLowerCase()
	});
	// 더블클릭으로도 추가(터치패드 등 드래그가 불편한 환경)
	vcItem.addEventListener("dblclick", function() {
		var vnCount = countItems();
		select(addCanvasItem(poDef.type, 20 + vnCount * SNAP, 20 + vnCount * SNAP));
	});
	createPaletteDragSource(vcItem, poDef);
}

/*
 * 팔레트 찾기 상자에서 value-change · search · input 이벤트 발생 시 호출.
 * 이름·설명에 글자가 들어간 항목만 남기고, 남은 항목이 없는 묶음 머리글도 함께 숨긴다.
 */
function onPaletteFilterChange(e) {
	var vsKeyword = (app.lookup("sipPaletteFilter").value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
	var voCategory = null;
	var vnShown = 0;

	maPaletteRows.forEach(function(poRow) {
		if (poRow.kind == "category") {
			poRow.hits = 0;
			voCategory = poRow;
			return;
		}
		var vbMatch = vsKeyword === "" || poRow.text.indexOf(vsKeyword) >= 0;
		poRow.control.visible = vbMatch;
		if (vbMatch) {
			vnShown++;
			if (voCategory != null) {
				voCategory.hits++;
			}
		}
	});
	maPaletteRows.forEach(function(poRow) {
		if (poRow.kind == "category") {
			poRow.control.visible = vsKeyword === "" || poRow.hits > 0;
		}
	});
	if (vsKeyword !== "") {
		setStatus("팔레트 찾기 : \"" + vsKeyword + "\" 에 맞는 항목 " + vnShown + "개");
	}
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
 * 사용자 속성을 읽는다. 붙인 적이 없으면 빈 문자열이 오므로 null 로 통일한다
 * (접속자 표시용 컨트롤과 캔버스 항목을 가르는 기준이다).
 * @return {String} 값 또는 null
 */
function attrOf(pcControl, psName) {
	var vsValue = pcControl.userAttr(psName);
	return vsValue == null || vsValue === "" ? null : vsValue;
}

/** 캔버스에 놓인 "항목"(접속자 표시용 컨트롤 제외) */
function canvasItems() {
	var ast = mod("canvasAst");
	return app.lookup("canvasGroup").getChildren().filter(function(pcChild) {
		return attrOf(pcChild, ast.ATTR_TYPE) != null;
	});
}

/** 공유 문서의 키(uid)로 캔버스 항목을 찾는다. */
function findItemByUid(psUid) {
	if (psUid == null || psUid === "") {
		return null;
	}
	var vaItems = canvasItems();
	for (var i = 0; i < vaItems.length; i++) {
		if (attrOf(vaItems[i], ATTR_UID) == psUid) {
			return vaItems[i];
		}
	}
	return null;
}

/** 캔버스에 놓인 "항목" 의 수(접속자 표시용 컨트롤은 세지 않는다). */
function countItems() {
	return canvasItems().length;
}

/** 다른 사람 것과 겹치지 않는 항목 키(만든 시각 + 일련번호 + 난수). */
function nextUid() {
	return "i" + Date.now().toString(36) + "_" + (++mnUidSeq).toString(36) + "_" + Math.floor(Math.random() * 1679616).toString(36);
}

/**
 * 캔버스에 항목을 추가한다.
 * 항목 = 래퍼 그룹(XY) [ 실제 컨트롤 | 투명 덮개(선택·이동) | 크기 조절 핸들 ]
 * 실제 컨트롤 위를 덮개가 덮으므로 디자인 중에는 콤보가 열리거나 입력 포커스가 가지 않는다.
 * @return {cpr.controls.Container} 래퍼 그룹
 */
function addCanvasItem(psType, pnLeft, pnTop, poOpt) {
	poOpt = poOpt || {};
	var registry = mod("controlRegistry");
	var ast = mod("canvasAst");
	var voDef = registry.getType(psType);
	if (voDef == null) {
		// 이 프로젝트에 없는 유형(다른 워크스페이스의 UDC·UI 템플릿을 공유받은 경우)
		setStatus("이 프로젝트에 없는 컨트롤 유형이라 놓을 수 없습니다 : " + psType);
		return null;
	}
	var vcCanvas = app.lookup("canvasGroup");
	var vsRuntimeId = "ptItem" + (++mnRuntimeSeq);
	var vsText = poOpt.text == null ? voDef.defaultText : poOpt.text;

	var vcWrapper = new cpr.controls.Container(vsRuntimeId);
	vcWrapper.setLayout(new cpr.controls.layouts.XYLayout());
	vcWrapper.style.setClasses(["pt-item"]);
	vcWrapper.userAttr(ast.ATTR_TYPE, psType);
	// 공유할 때 "어느 컨트롤이 어느 컨트롤인지" 를 맞추는 키. 공유를 켜지 않아도 늘 붙여 둔다.
	vcWrapper.userAttr(ATTR_UID, poOpt.uid || nextUid());
	vcWrapper.userAttr(ast.ATTR_ID, poOpt.id || nextControlId(voDef.idPrefix));
	vcWrapper.userAttr(ast.ATTR_TEXT, vsText);

	// ① 실제 eXBuilder6 컨트롤(UDC 포함). 만들다 실패하면 이름표 아웃풋으로 대신한다(배치·내보내기는 그대로 된다).
	var vcControl;
	var vbGhost = voDef.ghost === true;
	try {
		vcControl = registry.createControl(psType, vsRuntimeId + "_ctl", vsText);
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
		"width" : (poOpt.width || voDef.width) + "px",
		"height" : (poOpt.height || voDef.height) + "px"
	});
	if (!poOpt.quiet) {
		setStatus(voDef.label + " 추가 : " + vcWrapper.userAttr(ast.ATTR_ID));
	}
	// 공유 중이면 같은 방 사람들에게도 새 항목을 알린다(원격에서 받아 만드는 중이면 무시된다).
	mod("collabSession").publishAdd(itemRecord(vcWrapper));
	return vcWrapper;
}

/**
 * 캔버스 항목 하나를 공유 문서에 넣을 형태로 만든다.
 * @param {cpr.controls.Container} pcWrapper
 * @return {Object} {uid, type, id, text, x, y, w, h}
 */
function itemRecord(pcWrapper) {
	var ast = mod("canvasAst");
	var voRect = getItemRect(pcWrapper);
	var vsText = pcWrapper.userAttr(ast.ATTR_TEXT);
	return {
		uid : attrOf(pcWrapper, ATTR_UID),
		type : pcWrapper.userAttr(ast.ATTR_TYPE),
		id : pcWrapper.userAttr(ast.ATTR_ID),
		text : vsText == null ? "" : vsText,
		x : voRect.left,
		y : voRect.top,
		w : voRect.width,
		h : voRect.height
	};
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
	publishRect(pcWrapper);
}

/**
 * 옮기거나 크기를 바꾼 결과를 공유한다.
 * 드래그 중에는 1초에 수십 번 불리므로 60ms 에 한 번만, 그 시점의 최종 좌표를 보낸다.
 * @param {cpr.controls.Container} pcWrapper
 */
function publishRect(pcWrapper) {
	var collab = mod("collabSession");
	if (!collab.isConnected() || collab.isApplyingRemote()) {
		return;
	}
	var vsUid = attrOf(pcWrapper, ATTR_UID);
	if (vsUid == null || moRectTimer[vsUid]) {
		return; // 이미 예약돼 있으면 그 때 한 번에 나간다.
	}
	moRectTimer[vsUid] = window.setTimeout(function() {
		delete moRectTimer[vsUid];
		if (pcWrapper.disposed) {
			return;
		}
		var voRect = getItemRect(pcWrapper);
		mod("collabSession").publishUpdate(vsUid, {
			x : voRect.left,
			y : voRect.top,
			w : voRect.width,
			h : voRect.height
		});
	}, 60);
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
	// 내가 무엇을 보고 있는지 같은 방 사람들에게 알린다(문서가 아니라 "지금 상태").
	mod("collabSession").setSelection(mcSelected == null ? null : attrOf(mcSelected, ATTR_UID));
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
			mod("collabSession").publishUpdate(attrOf(mcSelected, ATTR_UID), {
				text : vsValue
			});
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
	mod("collabSession").publishUpdate(attrOf(mcSelected, ATTR_UID), {
		id : psNewId
	});
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
	var vcTarget = mcSelected;
	mod("collabSession").publishDelete(attrOf(vcTarget, ATTR_UID));
	select(null); // 남들 화면에서 내 선택 표시도 함께 걷는다.
	app.lookup("canvasGroup").removeChild(vcTarget, true);
	setStatus("선택한 항목을 삭제했습니다.");
}

/*
 * "전체 삭제" 버튼에서 click 이벤트 발생 시 호출.
 */
function onBtnClearClick(e) {
	if (!confirm("캔버스의 모든 항목을 삭제할까요?")) {
		return;
	}
	clearCanvas();
	app.lookup("txaPreview").value = "";
	setStatus("캔버스를 비웠습니다.");
}

/** 캔버스를 비우고 선택·id 일련번호를 초기화한다. */
function clearCanvas() {
	mod("collabSession").publishClear();
	app.lookup("canvasGroup").removeAllChildren(true);
	mcSelected = null;
	moIdSeq = {};
	// 접속자 표시 컨트롤도 함께 사라졌다 — 다음 awareness 알림에서 다시 만든다.
	moPeerMarkers = {};
	refreshPropertyPanel();
	renderPresence(mod("collabSession").getPeers());
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

/*
 * 패턴 콤보에서 selection-change 이벤트 발생 시 호출.
 * "미리 배치" 를 켜 두었으면 고른 패턴의 뼈대를 캔버스에 깔아 준다.
 * 깔아 준 좌표는 규칙 기반 변환이 같은 패턴으로 다시 읽도록 맞춰져 있다(조회 조건 위 · 하단 버튼 맨 아래).
 */
function onCmbPatternSelectionChange(e) {
	if (app.lookup("cbxPrefill").value != "Y") {
		return;
	}
	var vsPattern = app.lookup("cmbPattern").value;
	if (vsPattern == null || vsPattern == "auto") {
		return;
	}
	prefillPattern(vsPattern);
}

/*
 * "미리 배치" 체크박스에서 value-change 이벤트 발생 시 호출.
 * 켜는 순간 이미 고른 패턴이 있으면 바로 깔아 준다.
 */
function onCbxPrefillValueChange(e) {
	var vsPattern = app.lookup("cmbPattern").value;
	if (app.lookup("cbxPrefill").value == "Y" && vsPattern != null && vsPattern != "auto") {
		prefillPattern(vsPattern);
	}
}

/**
 * 지금 보이는 캔버스 크기(스크롤바가 생기지 않을 만큼 빼 둔다).
 * 뼈대를 이 크기에 맞춰 깔아야 오른쪽·아래가 비지 않는다.
 * @return {{width:Number, height:Number}}
 */
function canvasRect() {
	var voRect = app.lookup("canvasGroup").getActualRect();
	var vnScrollbar = 18;
	return {
		width : Math.round(voRect.width) - vnScrollbar,
		height : Math.round(voRect.height) - vnScrollbar
	};
}

/**
 * 패턴 뼈대를 캔버스에 깐다. 이미 그린 것이 있으면 물어보고 지운다.
 * @param {String} psPattern "P1-1" …
 */
function prefillPattern(psPattern) {
	if (countItems() > 0) {
		if (!confirm(psPattern + " 뼈대를 깔기 위해 캔버스의 기존 항목을 지웁니다. 계속할까요?")) {
			return;
		}
		clearCanvas();
	}
	var vaItems = mod("templatePlanner").skeleton(psPattern, canvasRect());
	// 공유 중이면 뼈대 전체를 한 번의 변경으로 묶어 보낸다(항목마다 따로 보내지 않는다).
	mod("collabSession").transact(function() {
		vaItems.forEach(function(poItem) {
			addCanvasItem(poItem.type, poItem.x, poItem.y, {
				text : poItem.text,
				width : poItem.width,
				height : poItem.height,
				quiet : true
			});
		});
	});
	select(null);
	setStatus(psPattern + " 뼈대를 캔버스에 깔았습니다(" + vaItems.length + "개). 라벨·버튼 글자를 고쳐 쓰세요.");
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

/* ================================================================ result 저장
 *
 * 저장 경로는 세 갈래다(위에서부터 먼저 쓴다).
 *  1) 저장 서버  : POST /canvas/saveResult.do → clx-src/result/<yyyyMMdd>/ (DevServer · Tomcat)
 *  2) 저장 폴더  : 사용자가 한 번 지정한 clx-src/result 아래 <yyyyMMdd>/ 에 브라우저가 직접 쓴다
 *  3) 브라우저 다운로드(둘 다 안 되는 경우)
 */

/** 앱 로드 때 저장 서버 · 지난번 저장 폴더를 확인해 두고 안내 문구를 만든다. */
function initSaveTarget() {
	var download = mod("fileDownload");
	setSaveTargetText("저장 위치 확인 중...");
	download.probeServer(function(poResult) {
		if (poResult != null) {
			mbServerSave = true;
			msServerSaveDir = poResult.dir || "clx-src/result";
			setSaveTargetText("저장 서버 : " + msServerSaveDir + " (날짜 폴더 자동 생성)");
			return;
		}
		if (!download.hasDirectoryPicker()) {
			setSaveTargetText("저장 서버 없음 · 이 브라우저는 폴더 저장을 지원하지 않아 다운로드로 대체합니다.");
			return;
		}
		download.preloadSaveDirectory(function(poDir) {
			if (poDir == null) {
				setSaveTargetText("저장 폴더가 지정되지 않았습니다. [폴더 지정] 으로 clx-src/result 를 고르세요.");
			} else {
				setSaveTargetText("저장 폴더 : " + poDir.name + "/<날짜>" + (poDir.granted ? "" : " (저장할 때 권한을 다시 묻습니다)"));
			}
		});
	});
}

function setSaveTargetText(psText) {
	var vcTarget = app.lookup("optSaveTarget");
	vcTarget.value = psText;
	vcTarget.tooltip = psText;
}

/*
 * "result 저장" 버튼에서 click 이벤트 발생 시 호출.
 * result/<실행 날짜>/<화면명>.clx · .js 로 저장한다.
 */
function onBtnSaveResultClick(e) {
	var download = mod("fileDownload");
	if (mbServerSave || !download.hasDirectoryPicker()) {
		saveResult(null);
		return;
	}
	// 폴더 선택·권한 요청은 클릭(사용자 제스처) 안에서만 열린다 → CLX 생성(비동기)보다 먼저 확보한다.
	download.ensureSaveDirectory(false, function(poDir) {
		saveResult(poDir);
	}, function(psError) {
		setStatus("[저장 폴더 없음 → 브라우저 다운로드로 대체] " + psError);
		saveResult(false);
	});
}

/*
 * "폴더 지정" 버튼에서 click 이벤트 발생 시 호출.
 * 브라우저가 직접 쓸 저장 폴더(clx-src/result)를 고른다. 선택은 다음 실행에도 남는다.
 */
function onBtnPickSaveDirClick(e) {
	var download = mod("fileDownload");
	if (!download.hasDirectoryPicker()) {
		setStatus("이 브라우저는 폴더에 바로 저장하는 기능을 지원하지 않습니다(Chrome · Edge 에서 됩니다).");
		return;
	}
	download.ensureSaveDirectory(true, function(poDir) {
		setSaveTargetText("저장 폴더 : " + poDir.name + "/<날짜>");
		setStatus("저장 폴더를 " + poDir.name + " 으로 지정했습니다. [result 저장] 을 누르면 " + poDir.name + "/<날짜>/ 에 .clx · .js 가 만들어집니다.");
	}, function(psError) {
		setStatus(psError);
	});
}

/**
 * CLX 를 만들고 정해진 곳에 저장한다.
 * @param {Object} poDir 폴더 핸들 · null(저장 서버 사용) · false(브라우저 다운로드)
 */
function saveResult(poDir) {
	generateClx(function(psXml, poPlan) {
		var download = mod("fileDownload");
		var vsName = getAppName();
		var vsScript = mod("clxSerializer").makeScriptSkeleton(vsName);
		var vsPlanNote = app.lookup("optStatus").value;
		app.lookup("optPreviewTitle").value = "출력 미리보기 - " + vsName + ".clx";
		app.lookup("txaPreview").value = psXml;

		function done(poResult) {
			setStatus("저장 완료 : " + poResult.dir + "/" + poResult.name + ".clx · .js  (" + vsPlanNote + ")");
		}

		function fallback(psError) {
			setStatus("[result 저장 실패 → 브라우저 다운로드로 대체] " + psError);
			download.downloadClx(vsName, psXml);
			// 스튜디오는 같은 이름의 .js 를 짝으로 본다. 브라우저가 연속 다운로드를 막지 않도록 조금 늦춘다.
			window.setTimeout(function() {
				download.downloadJs(vsName, vsScript);
			}, 400);
		}

		if (poDir === false) {
			fallback("저장할 곳이 없습니다.");
			return;
		}
		if (poDir == null) {
			download.saveToProject(vsName, psXml, vsScript, done, fallback);
			return;
		}
		download.saveToDirectory(poDir, vsName, psXml, vsScript, done, fallback);
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

/* ================================================================ 공유 (CRDT 실시간 협업)
 *
 * 툴바 [공유] 를 켜면 같은 "방"(= 화면명)에 접속한 사람과 캔버스를 함께 고친다.
 *  - 문서(누가 무엇을 어디에 놓았는지)는 CRDT(Yjs)가 합친다 → 동시에 고쳐도 충돌 나지 않는다.
 *  - 커서·선택 같은 "지금 상태"는 awareness 로 주고받고 문서에는 남기지 않는다.
 *  - 끄면 웹소켓을 닫고 그때까지의 캔버스를 각자 자기 것으로 이어서 쓴다(내용은 지우지 않는다).
 * 자세한 구조는 module/canvas/collabSession.module.js 머리말 참고.
 */

function collab() {
	return mod("collabSession");
}

/** 화면이 뜰 때 : 지난 설정을 되살리고 공유 서버 주소를 찾아 둔다(접속은 하지 않는다). */
function initCollab() {
	restoreCollabSettings();
	if (!app.lookup("ipbShareName").value) {
		app.lookup("ipbShareName").value = "사용자_" + (100 + Math.floor(Math.random() * 900));
	}
	setShareState("공유 꺼짐 — 켜면 같은 화면명(방)에 접속한 사람과 함께 고칩니다.");
	updateSharePeerText([]);
	initCursorTracking();
	collab().probeServerUrl(function(psUrl, pbFromServer) {
		msCollabBaseUrl = psUrl;
		var vcUrl = app.lookup("ipbShareUrl");
		vcUrl.placeholder = psUrl;
		vcUrl.tooltip = (pbFromServer ? "개발 서버가 알려 준 공유 서버 주소입니다 : " : "이 화면을 내려준 서버를 그대로 씁니다 : ") + psUrl;
	});
}

/*
 * 툴바 "공유" 체크박스에서 value-change 이벤트 발생 시 호출.
 */
function onCbxShareValueChange(e) {
	if (mbShareSyncing) {
		return;
	}
	if (app.lookup("cbxShare").value == "Y") {
		startShare();
	} else {
		stopShare();
	}
}

/*
 * 속성창 "내 이름" 에서 value-change 이벤트 발생 시 호출. 접속 중이면 바로 반영된다.
 */
function onIpbShareNameValueChange(e) {
	collab().setName(app.lookup("ipbShareName").value);
	saveCollabSettings();
}

function startShare() {
	var vsRoom = getAppName();
	var vcUrl = app.lookup("ipbShareUrl");
	if (vcUrl.value && !collab().normalizeUrl(vcUrl.value)) {
		// ws:// 주소가 아닌 값(이름을 잘못 적은 것 등)은 지우고 자동으로 찾은 주소를 쓴다.
		console.warn("[공유] 서버 주소가 아니어서 무시합니다 : " + vcUrl.value);
		vcUrl.value = "";
	}
	saveCollabSettings();
	// 붙는 사이에 공유본이 먼저 들어오므로, "켜기 직전에 내가 갖고 있던 것" 을 따로 적어 둔다.
	maPreShareUids = canvasItems().map(function(pcItem) {
		return attrOf(pcItem, ATTR_UID);
	});
	app.lookup("canvasGroup").style.addClass("pt-shared");
	collab().connect({
		url : collab().buildUrl(app.lookup("ipbShareUrl").value || msCollabBaseUrl, vsRoom),
		room : vsRoom,
		name : app.lookup("ipbShareName").value
	}, {
		onStatus : onCollabStatus,
		onSynced : onCollabSynced,
		onItemAdd : applyRemoteAdd,
		onItemUpdate : applyRemoteUpdate,
		onItemDelete : applyRemoteDelete,
		onPresence : renderPresence
	});
}

function stopShare() {
	collab().disconnect();
	clearPeerMarkers();
	app.lookup("canvasGroup").style.removeClass("pt-shared");
	setShareState("공유 꺼짐 — 캔버스 내용은 그대로입니다.");
}

/** 체크박스를 코드가 켜고 끌 때(접속 실패 등) value-change 가 다시 돌지 않게 한다. */
function setShareCheck(pbOn) {
	mbShareSyncing = true;
	app.lookup("cbxShare").value = pbOn ? "Y" : "";
	mbShareSyncing = false;
}

function onCollabStatus(psState, psMessage) {
	setShareState(psMessage);
	setStatus("[공유] " + psMessage);
	if (psState == "error") {
		setShareCheck(false);
		clearPeerMarkers();
		app.lookup("canvasGroup").style.removeClass("pt-shared");
	}
}

function setShareState(psText) {
	var vcState = app.lookup("optShareState");
	vcState.value = psText;
	vcState.tooltip = psText;
}

function updateSharePeerText(paPeers) {
	var vsText = paPeers.length == 0 ? "접속자 : 나 혼자" : "접속자 " + (paPeers.length + 1) + "명 · " + paPeers.map(function(poPeer) {
		return poPeer.name;
	}).join(", ");
	var vcPeers = app.lookup("optSharePeers");
	vcPeers.value = vsText;
	vcPeers.tooltip = vsText;
}

/**
 * 접속 직후(방에 있던 내용을 다 받은 뒤) 한 번 불린다.
 * 공유본은 이미 캔버스에 그려져 있으므로, 여기서 정하는 것은 "켜기 직전의 내 항목" 을 어떻게 할지다.
 *  - 방이 비어 있었으면 → 내 것을 올린다(내가 첫 사람).
 *  - 내가 빈 캔버스였으면 → 받은 것만 쓴다(물어볼 것 없음).
 *  - 둘 다 있으면 → 합칠지(내 것도 올린다) 버릴지(공유본만 남긴다) 물어본다.
 * @param {Array} paRemoteItems 공유 문서에 들어 있는 항목
 */
function onCollabSynced(paRemoteItems) {
	var vaMine = [];
	maPreShareUids.forEach(function(psUid) {
		// 공유본에 이미 같은 항목이 있으면(껐다 다시 켠 경우) "나만 가진 것" 이 아니다.
		if (collab().hasItem(psUid)) {
			return;
		}
		var vcItem = findItemByUid(psUid);
		if (vcItem != null) {
			vaMine.push(itemRecord(vcItem));
		}
	});
	maPreShareUids = [];

	if (paRemoteItems.length == 0) {
		publishRecords(vaMine);
		setStatus("[공유] 방 \"" + collab().getRoom() + "\" 을 열고 내 캔버스 " + vaMine.length + "개를 올렸습니다.");
		return;
	}
	if (vaMine.length == 0) {
		setStatus("[공유] 방 \"" + collab().getRoom() + "\" 의 항목 " + paRemoteItems.length + "개를 받았습니다.");
		return;
	}
	if (confirm("공유방 \"" + collab().getRoom() + "\" 에 이미 " + paRemoteItems.length + "개의 항목이 있어 내 캔버스와 합쳐 두었습니다.\n\n[확인] 내가 그린 " + vaMine.length + "개도 공유방에 올립니다.\n[취소] 내가 그린 " + vaMine.length + "개는 지우고 공유본만 씁니다.")) {
		publishRecords(vaMine);
		setStatus("[공유] 내가 그린 " + vaMine.length + "개를 공유방에 올렸습니다.");
		return;
	}
	dropMyItems(vaMine);
	setStatus("[공유] 공유방의 항목 " + paRemoteItems.length + "개만 남겼습니다.");
}

/** 항목 여러 개를 한 번의 변경으로 묶어 올린다. */
function publishRecords(paRecords) {
	collab().transact(function() {
		paRecords.forEach(function(poRecord) {
			collab().publishAdd(poRecord);
		});
	});
}

/** 공유방에 올리지 않기로 한 내 항목을 캔버스에서 지운다(공유 문서는 건드리지 않는다). */
function dropMyItems(paRecords) {
	var vcCanvas = app.lookup("canvasGroup");
	collab().withRemote(function() {
		paRecords.forEach(function(poRecord) {
			var vcItem = findItemByUid(poRecord.uid);
			if (vcItem != null) {
				if (vcItem === mcSelected) {
					mcSelected = null;
				}
				vcCanvas.removeChild(vcItem, true);
			}
		});
	});
	refreshPropertyPanel();
}

/**
 * 공유 문서의 항목 하나를 캔버스에 만든다.
 * @param {Object} poRecord {uid, type, id, text, x, y, w, h}
 */
function createItemFromRecord(poRecord) {
	return addCanvasItem(poRecord.type, poRecord.x || 0, poRecord.y || 0, {
		text : poRecord.text,
		width : poRecord.w,
		height : poRecord.h,
		uid : poRecord.uid,
		id : poRecord.id,
		quiet : true
	});
}

/* ---------------------------------------------------------------- 남이 고친 것을 내 캔버스에 */

function applyRemoteAdd(psUid, poRecord) {
	if (findItemByUid(psUid) != null) {
		applyRemoteUpdate(psUid, poRecord);
		return;
	}
	createItemFromRecord(poRecord);
}

function applyRemoteUpdate(psUid, poPatch) {
	var vcWrapper = findItemByUid(psUid);
	if (vcWrapper == null) {
		return;
	}
	var ast = mod("canvasAst");
	if (poPatch.id != null) {
		vcWrapper.userAttr(ast.ATTR_ID, poPatch.id);
	}
	if (poPatch.text != null && poPatch.text !== vcWrapper.userAttr(ast.ATTR_TEXT)) {
		vcWrapper.userAttr(ast.ATTR_TEXT, poPatch.text);
		rebuildInnerControl(vcWrapper);
	}
	if (poPatch.x != null || poPatch.y != null || poPatch.w != null || poPatch.h != null) {
		var voRect = getItemRect(vcWrapper);
		setItemRect(vcWrapper, {
			left : poPatch.x == null ? voRect.left : poPatch.x,
			top : poPatch.y == null ? voRect.top : poPatch.y,
			width : poPatch.w == null ? voRect.width : poPatch.w,
			height : poPatch.h == null ? voRect.height : poPatch.h
		});
		renderPresence(collab().getPeers()); // 남의 선택 상자가 따라 움직이도록
	}
	if (vcWrapper === mcSelected) {
		refreshPropertyPanel();
	}
}

function applyRemoteDelete(psUid) {
	var vcWrapper = findItemByUid(psUid);
	if (vcWrapper == null) {
		return;
	}
	if (vcWrapper === mcSelected) {
		select(null);
	}
	app.lookup("canvasGroup").removeChild(vcWrapper, true);
	// 사라진 항목을 가리키던 남의 선택 표시를 걷는다.
	renderPresence(collab().getPeers());
}

/* ---------------------------------------------------------------- 누가 어디를 보고 있는지
 *
 * 남의 커서·선택은 캔버스 안에 만든 아웃풋 2개(선택 상자 · 이름표)로 그린다.
 * 컨트롤의 DOM 을 건드리지 않고, 색도 인라인 스타일 대신 클래스(pt-peer-0 ~ 7)로만 준다.
 */

function renderPresence(paPeers) {
	var vcCanvas = app.lookup("canvasGroup");
	var voAlive = {};

	paPeers.forEach(function(poPeer) {
		voAlive[poPeer.clientId] = true;
		var voMarker = moPeerMarkers[poPeer.clientId];
		if (voMarker == null) {
			voMarker = {
				box : new cpr.controls.Output("ptPeerBox" + poPeer.clientId),
				chip : new cpr.controls.Output("ptPeerChip" + poPeer.clientId)
			};
			vcCanvas.addChild(voMarker.box, hiddenConstraint());
			vcCanvas.addChild(voMarker.chip, hiddenConstraint());
			moPeerMarkers[poPeer.clientId] = voMarker;
		}
		voMarker.box.style.setClasses(["pt-remote-sel", "pt-peer-" + poPeer.colorIndex]);
		voMarker.chip.style.setClasses(["pt-remote-chip", "pt-peer-" + poPeer.colorIndex]);
		voMarker.chip.value = poPeer.name;

		var vcTarget = poPeer.sel == null ? null : findItemByUid(poPeer.sel);
		var voRect = vcTarget == null ? null : getItemRect(vcTarget);
		voMarker.box.visible = voRect != null;
		if (voRect != null) {
			vcCanvas.updateConstraint(voMarker.box, {
				"left" : (voRect.left - 2) + "px",
				"top" : (voRect.top - 2) + "px",
				"width" : (voRect.width + 4) + "px",
				"height" : (voRect.height + 4) + "px"
			});
		}

		// 커서 + 이름표. 컨트롤의 왼쪽 위 모서리가 그 사람의 커서 끝이다(화살표를 그 자리에 그린다).
		// 커서가 캔버스 밖이면 고른 항목 위에 붙여 둬 "누가 무엇을 보고 있는지" 는 그대로 보인다.
		var voChipAt = poPeer.cursor != null ? {
			left : poPeer.cursor.x,
			top : poPeer.cursor.y
		} : (voRect != null ? {
			left : voRect.left - 2,
			top : Math.max(0, voRect.top - 22)
		} : null);
		voMarker.chip.visible = voChipAt != null;
		if (voChipAt != null) {
			vcCanvas.updateConstraint(voMarker.chip, {
				"left" : voChipAt.left + "px",
				"top" : voChipAt.top + "px",
				"width" : (poPeer.name.length * 12 + 26) + "px",
				"height" : "18px"
			});
		}
	});

	Object.keys(moPeerMarkers).forEach(function(psClientId) {
		if (!voAlive[psClientId]) {
			disposeMarker(moPeerMarkers[psClientId]);
			delete moPeerMarkers[psClientId];
		}
	});
	updateSharePeerText(paPeers);
}

function hiddenConstraint() {
	return {
		"left" : "0px",
		"top" : "0px",
		"width" : "1px",
		"height" : "1px"
	};
}

function disposeMarker(poMarker) {
	var vcCanvas = app.lookup("canvasGroup");
	[poMarker.box, poMarker.chip].forEach(function(pcControl) {
		if (pcControl != null && !pcControl.disposed) {
			try {
				vcCanvas.removeChild(pcControl, true);
			} catch (ex) {
				// 캔버스를 비우면서 이미 사라진 경우
			}
		}
	});
}

function clearPeerMarkers() {
	Object.keys(moPeerMarkers).forEach(function(psClientId) {
		disposeMarker(moPeerMarkers[psClientId]);
	});
	moPeerMarkers = {};
	updateSharePeerText([]);
}

/**
 * 내 마우스 위치를 캔버스 기준 좌표로 알린다(60ms 에 한 번).
 * 컨트롤마다 이벤트를 걸지 않고 document 에서 한 번만 듣고 캔버스 영역인지 계산한다.
 */
function initCursorTracking() {
	document.addEventListener("mousemove", function(poEvent) {
		if (!collab().isConnected() || mbCursorBusy) {
			return;
		}
		mbCursorBusy = true;
		window.setTimeout(function() {
			mbCursorBusy = false;
		}, 60);
		collab().setCursor(canvasPoint(poEvent.clientX, poEvent.clientY));
	});
	document.addEventListener("mouseleave", function() {
		if (collab().isConnected()) {
			collab().setCursor(null);
		}
	});
}

/**
 * 뷰포트 좌표 → 캔버스 좌표(스크롤 반영). 캔버스 밖이면 null.
 * @return {{x:Number, y:Number}}
 */
function canvasPoint(pnClientX, pnClientY) {
	var vcCanvas = app.lookup("canvasGroup");
	var voRect = vcCanvas.getActualRect();
	if (voRect == null || pnClientX < voRect.left || pnClientY < voRect.top
			|| pnClientX > voRect.left + voRect.width || pnClientY > voRect.top + voRect.height) {
		return null;
	}
	var voView = vcCanvas.getViewPortRect();
	return {
		x : Math.round(pnClientX - voRect.left + (voView ? voView.left : 0)),
		y : Math.round(pnClientY - voRect.top + (voView ? voView.top : 0))
	};
}

/* ---------------------------------------------------------------- 공유 설정 저장(이름 · 서버) */

function saveCollabSettings() {
	try {
		window.localStorage.setItem(COLLAB_STORAGE_KEY, JSON.stringify({
			name : app.lookup("ipbShareName").value,
			url : app.lookup("ipbShareUrl").value
		}));
	} catch (ex) {
		// 저장소를 쓸 수 없는 환경에서는 저장하지 않는다.
	}
}

function restoreCollabSettings() {
	try {
		var vsSaved = window.localStorage.getItem(COLLAB_STORAGE_KEY);
		if (vsSaved) {
			var voSaved = JSON.parse(vsSaved);
			app.lookup("ipbShareName").value = voSaved.name || "";
			app.lookup("ipbShareUrl").value = voSaved.url || "";
		}
	} catch (ex) {
		// 무시
	}
}
