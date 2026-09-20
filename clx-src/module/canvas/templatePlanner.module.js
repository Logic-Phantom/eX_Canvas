/************************************************
 * templatePlanner.module.js
 * Created at 2026. 9. 20.
 *
 * eX-Canvas(Web Prototyper) - 캔버스 AST(XY 좌표) → "화면 계획(plan)" 변환.
 * 화면 계획은 /templates 의 뼈대(조회 조건 · 데이터 구획 · 하단 버튼)에 캔버스 컨트롤을 배정한 것이다.
 *
 *   planByRule(ast, opt)  : 좌표 기반 규칙으로 원시 계획(raw plan)을 만든다. (AI 없이 동작 · AI 실패 시 대체)
 *   resolve(raw, ast, opt): 원시 계획의 ref(캔버스 id)를 실제 컨트롤로 풀고, 빠진 컨트롤을 보충해
 *                           clxSerializer.serializePlan() 이 먹는 "해석된 계획"으로 만든다.
 *                           Gemini 가 돌려준 계획도 같은 함수로 검증·정규화한다.
 *
 * 원시 계획(raw plan) - Gemini 응답 스키마와 같다:
 * {
 *   pattern : "P3-1", title : "화면 제목",
 *   search  : { columns : 3, fields : [ { label, labelRef, required, refs : [id..], separator } ], buttons : [ { ref, cls } ] },
 *   sections: [ { row : 0, kind : "grid|tree|tab|form|shuttle", title, ref, gridColumns : [..], columns : 2,
 *                 fields : [..], buttons : [ { ref, cls } ], vertical : false, parentTab : "tab1", tabIndex : 0 } ],
 *   footer  : { left : [ { ref, cls } ], right : [ { ref, cls } ] },
 *   rename  : [ { ref, id } ]
 * }
 ************************************************/

/* ---------------------------------------------------------------- 템플릿 카탈로그 */

/*
 * /templates 폴더 분석 결과. arrange = 구획 배치 힌트(column: 위아래, row: 좌우 division-group).
 * P0(이너)는 후보에서 뺐다.
 */
var CATALOG = [{
	id : "P1-1",
	arrange : "column",
	desc : "단일 목록: 조회 조건 + 그리드 1개(그리드 타이틀)"
}, {
	id : "P1-2",
	arrange : "column",
	desc : "단일 목록: 조회 조건 + 그리드 1개, 그리드 제목 줄에 버튼 묶음"
}, {
	id : "P1-4",
	arrange : "column",
	desc : "단일 목록: 조회 조건 + 그리드 1개 + 아래 페이지 인덱서"
}, {
	id : "P1-6",
	arrange : "column",
	desc : "단일 입력 폼: 조회 조건 + 편집 가능한 form-base(라벨·입력 표)"
}, {
	id : "P2-1",
	arrange : "column",
	desc : "멀티 목록: 그리드 2개를 위아래로"
}, {
	id : "P2-4",
	arrange : "row",
	desc : "멀티 목록: 그리드 2개를 좌우(division-group)로"
}, {
	id : "P2-5",
	arrange : "mixed",
	desc : "멀티 목록: 좌우 그리드 2개 + 아래에 그리드 추가(3개 이상 혼합)"
}, {
	id : "P3-1",
	arrange : "column",
	desc : "목록+상세: 위 그리드, 아래 상세 폼(form-base)"
}, {
	id : "P3-2",
	arrange : "row",
	desc : "목록+상세: 왼쪽 그리드, 오른쪽 상세 폼"
}, {
	id : "P3-4",
	arrange : "column",
	desc : "목록: 카드/아코디언 구성"
}, {
	id : "P4-1",
	arrange : "column",
	desc : "마스터-디테일: 폼 2개를 위아래로"
}, {
	id : "P4-3",
	arrange : "row",
	desc : "마스터-디테일: 왼쪽 폼, 오른쪽 그리드"
}, {
	id : "P4-4",
	arrange : "column",
	desc : "마스터-디테일: 위 폼, 아래 그리드"
}, {
	id : "P5-1",
	arrange : "column",
	desc : "탭: 조회 조건 + 탭폴더(탭마다 그리드)"
}, {
	id : "P5-2",
	arrange : "column",
	desc : "탭: 조회 조건 없이 탭폴더만"
}, {
	id : "P6-1",
	arrange : "row",
	desc : "트리: 왼쪽 트리(250px), 오른쪽 그리드"
}, {
	id : "P6-2",
	arrange : "row",
	desc : "트리: 왼쪽 트리, 오른쪽 상세 폼"
}, {
	id : "P7-1",
	arrange : "row",
	desc : "셔틀: 그리드 | 이동 버튼(▶◀) | 그리드"
}, {
	id : "P7-2",
	arrange : "column",
	desc : "셔틀: 그리드 / 이동 버튼(▼▲) / 그리드"
}, {
	id : "P8-1",
	arrange : "column",
	desc : "서드파티: 폼 타이틀 + UIControlShell"
}, {
	id : "P8-3",
	arrange : "column",
	desc : "서드파티: 폼 타이틀 + EmbeddedPage"
}];

exports.getCatalog = function() {
	return CATALOG;
};

/* ---------------------------------------------------------------- 패턴 미리 배치 (skeleton)
 *
 * 패턴을 고르면 그 패턴이 나오도록 캔버스에 컨트롤을 미리 깔아 준다.
 * 여기서 만든 좌표를 planByRule() 에 다시 넣으면 같은 패턴이 나오도록 맞춰 두었다
 * (조회 조건은 데이터 컨트롤 위, 하단 버튼은 맨 아래 줄, 좌우 배치는 세로로 겹치게).
 */

var SK = {
	/** 캔버스 크기를 모를 때 쓰는 기준값 */
	width : 800,
	height : 600,
	/** 캔버스가 이보다 작아도 이 크기로는 깐다(가로·세로 스크롤로 본다) */
	minWidth : 640,
	minHeight : 420,
	margin : 20,   // 캔버스 바깥 여백
	gap : 20,      // 구획 사이 간격
	rowHeight : 24,
	titleGap : 10  // 구획 제목 줄과 본문 사이
};

function skItem(psType, psText, pnX, pnY, pnWidth, pnHeight) {
	return {
		type : psType,
		text : psText,
		x : pnX,
		y : pnY,
		width : Math.max(40, Math.round(pnWidth)),
		height : Math.max(SK.rowHeight, Math.round(pnHeight))
	};
}

/**
 * 캔버스 크기에서 뼈대가 쓸 격자를 만든다.
 * 오른쪽·아래 여백을 남기지 않도록 모든 폭·높이를 여기서 나눠 쓴다.
 */
function skGrid(poCanvas) {
	var vnWidth = Math.max(SK.minWidth, Math.round((poCanvas && poCanvas.width) || SK.width));
	var vnHeight = Math.max(SK.minHeight, Math.round((poCanvas && poCanvas.height) || SK.height));
	var vnLeft = SK.margin;
	var vnRight = vnWidth - SK.margin;
	var vnFull = vnRight - vnLeft;
	var vnHalf = Math.floor((vnFull - SK.gap) / 2);
	return {
		width : vnWidth,
		height : vnHeight,
		left : vnLeft,
		right : vnRight,
		full : vnFull,
		half : vnHalf,
		halfRight : vnLeft + vnHalf + SK.gap,
		searchTop : SK.margin,
		footerTop : vnHeight - SK.margin - SK.rowHeight
	};
}

/** 오른쪽 끝에 붙는 버튼 묶음(가장 오른쪽 버튼이 캔버스 오른쪽 여백에 딱 닿는다) */
function skRightButtons(paOut, poGrid, pnY, paTexts) {
	var vnButtonWidth = 70;
	var vnSpacing = 8;
	var vnX = poGrid.right - paTexts.length * vnButtonWidth - (paTexts.length - 1) * vnSpacing;
	paTexts.forEach(function(psText, pnIdx) {
		paOut.push(skItem("button", psText, vnX + pnIdx * (vnButtonWidth + vnSpacing), pnY, vnButtonWidth, SK.rowHeight));
	});
}

/** 조회 조건 한 줄 : [라벨 입력] × 2 + 오른쪽 끝 조회 · 초기화 */
function skSearchRow(paOut, poGrid) {
	var vnY = poGrid.searchTop;
	// 조회 조건 영역은 버튼 묶음(148px)을 뺀 나머지를 반씩 나눠 쓴다.
	var vnFieldArea = poGrid.full - 148 - SK.gap;
	var vnField = Math.floor((vnFieldArea - SK.gap) / 2);
	var vnLabel = 70;
	paOut.push(skItem("output", "조회 조건", poGrid.left, vnY, vnLabel, SK.rowHeight));
	paOut.push(skItem("inputbox", "", poGrid.left + vnLabel + 10, vnY, vnField - vnLabel - 10, SK.rowHeight));
	var vnSecond = poGrid.left + vnField + SK.gap;
	paOut.push(skItem("output", "기간", vnSecond, vnY, 50, SK.rowHeight));
	paOut.push(skItem("dateinput", "", vnSecond + 60, vnY, vnField - 60, SK.rowHeight));
	skRightButtons(paOut, poGrid, vnY, ["조회", "초기화"]);
}

/** 하단 버튼 줄 : 오른쪽 끝 저장 · 닫기 */
function skFooter(paOut, poGrid) {
	skRightButtons(paOut, poGrid, poGrid.footerTop, ["저장", "닫기"]);
}

/**
 * 라벨·입력 표(form-base) 한 구획. 주어진 높이를 행으로 꽉 채운다.
 * @param {Number} pnHeight 이 구획이 차지할 높이
 * @param {Number} pnCols 한 행에 놓을 [라벨 입력] 쌍 수
 */
function skForm(paOut, pnX, pnY, pnWidth, pnHeight, pnCols) {
	var vnCols = pnCols || 2;
	var vnRowPitch = SK.rowHeight + 10;
	var vnRows = Math.max(2, Math.floor((pnHeight + 10) / vnRowPitch));
	// 남는 높이는 행 간격에 나눠 줘서 아래쪽이 비지 않게 한다.
	var vnPitch = vnRows > 1 ? Math.floor((pnHeight - SK.rowHeight) / (vnRows - 1)) : vnRowPitch;
	var vnColWidth = Math.floor((pnWidth - (vnCols - 1) * SK.gap) / vnCols);
	var vnLabel = Math.min(80, Math.floor(vnColWidth * 0.35));
	for (var vnRow = 0; vnRow < vnRows; vnRow++) {
		for (var vnCol = 0; vnCol < vnCols; vnCol++) {
			var vnLeft = pnX + vnCol * (vnColWidth + SK.gap);
			var vnTop = pnY + vnRow * vnPitch;
			paOut.push(skItem("output", "항목", vnLeft, vnTop, vnLabel, SK.rowHeight));
			paOut.push(skItem("inputbox", "", vnLeft + vnLabel + 10, vnTop, vnColWidth - vnLabel - 10, SK.rowHeight));
		}
	}
}

/**
 * 패턴 뼈대를 캔버스 좌표로 만든다. 캔버스 폭·높이를 꽉 채운다.
 * @param {String} psPatternId "P1-1" …
 * @param {{width:Number, height:Number}} poCanvas 캔버스 크기(없으면 800×600 기준)
 * @return {Object[]} [{ type, text, x, y, width, height }]
 */
exports.skeleton = function(psPatternId, poCanvas) {
	var vaOut = [];
	var g = skGrid(poCanvas);
	var vnLeft = g.left;
	var vnFull = g.full;
	var vnHalf = g.half;
	var vnRight = g.halfRight;
	var vnTop;

	// P5-2(탭만)를 뺀 나머지는 조회 조건 줄로 시작한다.
	if (psPatternId != "P5-2") {
		skSearchRow(vaOut, g);
		vnTop = g.searchTop + SK.rowHeight + SK.gap;
	} else {
		vnTop = g.searchTop;
	}

	// 데이터 영역 : 조회 조건 아래 ~ 하단 버튼 위. 이 높이를 남김없이 나눠 쓴다.
	var vnDataHeight = g.footerTop - SK.gap - vnTop;
	var vnTitleRow = SK.rowHeight + SK.titleGap;   // 구획 제목 줄이 먹는 높이
	var vnBodyTop = vnTop + vnTitleRow;            // 제목 줄이 있는 패턴의 본문 시작
	var vnBodyHeight = vnDataHeight - vnTitleRow;
	var vnUpper = Math.floor((vnDataHeight - SK.gap) / 2);           // 위아래 반반
	var vnLower = vnDataHeight - SK.gap - vnUpper;

	switch (psPatternId) {
		case "P1-2":
			// 구획 제목 줄(제목 + 버튼 묶음) → 그 아래 그리드
			vaOut.push(skItem("output", "목록", vnLeft, vnTop, 100, SK.rowHeight));
			skRightButtons(vaOut, g, vnTop, ["등록", "삭제"]);
			vaOut.push(skItem("grid", "사번,성명,부서,직급,입사일", vnLeft, vnBodyTop, vnFull, vnBodyHeight));
			break;
		case "P1-4":
			vaOut.push(skItem("grid", "사번,성명,부서,직급,입사일", vnLeft, vnTop, vnFull, vnDataHeight - 40));
			vaOut.push(skItem("pageindexer", "", vnLeft, vnTop + vnDataHeight - 30, vnFull, 30));
			break;
		case "P1-6":
			skForm(vaOut, vnLeft, vnTop, vnFull, vnDataHeight, 2);
			break;
		case "P2-1":
			vaOut.push(skItem("grid", "구분,명칭,값", vnLeft, vnTop, vnFull, vnUpper));
			vaOut.push(skItem("grid", "구분,명칭,값", vnLeft, vnTop + vnUpper + SK.gap, vnFull, vnLower));
			break;
		case "P2-4":
			vaOut.push(skItem("grid", "구분,명칭", vnLeft, vnTop, vnHalf, vnDataHeight));
			vaOut.push(skItem("grid", "구분,명칭", vnRight, vnTop, vnHalf, vnDataHeight));
			break;
		case "P2-5":
			vaOut.push(skItem("grid", "구분,명칭", vnLeft, vnTop, vnHalf, vnUpper));
			vaOut.push(skItem("grid", "구분,명칭", vnRight, vnTop, vnHalf, vnUpper));
			vaOut.push(skItem("grid", "구분,명칭,값", vnLeft, vnTop + vnUpper + SK.gap, vnFull, vnLower));
			break;
		case "P3-1":
		case "P4-4":
			// 목록이 상세보다 넓게 : 위 55% / 아래 45%
			var vnListHeight = Math.floor((vnDataHeight - SK.gap) * 0.55);
			vaOut.push(skItem("grid", "사번,성명,부서", vnLeft, vnTop, vnFull, vnListHeight));
			skForm(vaOut, vnLeft, vnTop + vnListHeight + SK.gap, vnFull, vnDataHeight - vnListHeight - SK.gap, 2);
			break;
		case "P3-2":
		case "P4-3":
			vaOut.push(skItem("grid", "사번,성명", vnLeft, vnTop, vnHalf, vnDataHeight));
			skForm(vaOut, vnRight, vnTop, vnHalf, vnDataHeight, 1);
			break;
		case "P3-4":
			vaOut.push(skItem("accordion", "기본 정보,상세 정보", vnLeft, vnTop, vnFull, vnDataHeight));
			break;
		case "P4-1":
			skForm(vaOut, vnLeft, vnTop, vnFull, vnUpper, 2);
			skForm(vaOut, vnLeft, vnTop + vnUpper + SK.gap, vnFull, vnLower, 2);
			break;
		case "P5-1":
		case "P5-2":
			vaOut.push(skItem("tabfolder", "기본,상세,이력", vnLeft, vnTop, vnFull, vnDataHeight));
			break;
		case "P6-1":
		case "P6-2":
			// 왼쪽 트리는 폭의 1/4(최소 200 · 최대 300), 오른쪽이 나머지를 다 쓴다.
			var vnTreeWidth = Math.min(300, Math.max(200, Math.floor(vnFull * 0.25)));
			var vnRestX = vnLeft + vnTreeWidth + SK.gap;
			var vnRestWidth = g.right - vnRestX;
			vaOut.push(skItem("tree", "", vnLeft, vnTop, vnTreeWidth, vnDataHeight));
			if (psPatternId == "P6-1") {
				vaOut.push(skItem("grid", "사번,성명,부서", vnRestX, vnTop, vnRestWidth, vnDataHeight));
			} else {
				skForm(vaOut, vnRestX, vnTop, vnRestWidth, vnDataHeight, 2);
			}
			break;
		case "P7-1":
			// 그리드 | 이동 버튼(가운데) | 그리드
			var vnShuttleWidth = 40;
			var vnSideWidth = Math.floor((vnFull - vnShuttleWidth - SK.gap * 2) / 2);
			var vnShuttleX = vnLeft + vnSideWidth + SK.gap;
			var vnMiddle = vnTop + Math.floor(vnDataHeight / 2) - SK.rowHeight - 5;
			vaOut.push(skItem("grid", "선택 가능", vnLeft, vnTop, vnSideWidth, vnDataHeight));
			vaOut.push(skItem("button", "▶", vnShuttleX, vnMiddle, vnShuttleWidth, SK.rowHeight));
			vaOut.push(skItem("button", "◀", vnShuttleX, vnMiddle + SK.rowHeight + 10, vnShuttleWidth, SK.rowHeight));
			vaOut.push(skItem("grid", "선택됨", vnShuttleX + vnShuttleWidth + SK.gap, vnTop, g.right - (vnShuttleX + vnShuttleWidth + SK.gap), vnDataHeight));
			break;
		case "P7-2":
			// 그리드 / 이동 버튼(가운데 줄) / 그리드
			var vnShuttleRow = SK.rowHeight + SK.gap * 2;
			var vnPane = Math.floor((vnDataHeight - vnShuttleRow) / 2);
			var vnShuttleY = vnTop + vnPane + SK.gap;
			var vnCenterX = vnLeft + Math.floor(vnFull / 2);
			vaOut.push(skItem("grid", "선택 가능", vnLeft, vnTop, vnFull, vnPane));
			vaOut.push(skItem("button", "▼", vnCenterX - 45, vnShuttleY, 40, SK.rowHeight));
			vaOut.push(skItem("button", "▲", vnCenterX + 5, vnShuttleY, 40, SK.rowHeight));
			vaOut.push(skItem("grid", "선택됨", vnLeft, vnTop + vnPane + vnShuttleRow, vnFull, vnDataHeight - vnPane - vnShuttleRow));
			break;
		case "P8-1":
		case "P8-3":
			vaOut.push(skItem("output", psPatternId == "P8-1" ? "차트 영역" : "외부 화면", vnLeft, vnTop, 100, SK.rowHeight));
			vaOut.push(skItem(psPatternId == "P8-1" ? "uicontrolshell" : "embeddedpage", "", vnLeft, vnBodyTop, vnFull, vnBodyHeight));
			break;
		default: // P1-1 · 그 밖
			vaOut.push(skItem("grid", "사번,성명,부서,직급,입사일", vnLeft, vnTop, vnFull, vnDataHeight));
			break;
	}

	skFooter(vaOut, g);
	return vaOut;
};

function findCatalog(psId) {
	for (var i = 0; i < CATALOG.length; i++) {
		if (CATALOG[i].id == psId) {
			return CATALOG[i];
		}
	}
	return null;
}

/* ---------------------------------------------------------------- 기하 도우미 */

function rectOf(poNode) {
	var vo = poNode.layoutData;
	return {
		x : vo.x,
		y : vo.y,
		w : vo.width,
		h : vo.height,
		right : vo.x + vo.width,
		bottom : vo.y + vo.height,
		cx : vo.x + vo.width / 2,
		cy : vo.y + vo.height / 2
	};
}

function bbox(paNodes) {
	var voBox = null;
	paNodes.forEach(function(poNode) {
		var r = rectOf(poNode);
		if (voBox == null) {
			voBox = {
				x : r.x,
				y : r.y,
				right : r.right,
				bottom : r.bottom
			};
		} else {
			voBox.x = Math.min(voBox.x, r.x);
			voBox.y = Math.min(voBox.y, r.y);
			voBox.right = Math.max(voBox.right, r.right);
			voBox.bottom = Math.max(voBox.bottom, r.bottom);
		}
	});
	if (voBox != null) {
		voBox.w = voBox.right - voBox.x;
		voBox.h = voBox.bottom - voBox.y;
		voBox.cx = voBox.x + voBox.w / 2;
		voBox.cy = voBox.y + voBox.h / 2;
	}
	return voBox;
}

function overlap(pnA1, pnA2, pnB1, pnB2) {
	return Math.max(0, Math.min(pnA2, pnB2) - Math.max(pnA1, pnB1));
}

/** 세로 위치가 겹치는 노드끼리 한 줄로 묶는다. 줄은 위→아래, 줄 안은 왼쪽→오른쪽. */
function clusterRows(paNodes) {
	var vaSorted = paNodes.slice().sort(function(a, b) {
		return a.layoutData.y - b.layoutData.y;
	});
	var vaRows = [];
	vaSorted.forEach(function(poNode) {
		var r = rectOf(poNode);
		var voLast = vaRows.length > 0 ? vaRows[vaRows.length - 1] : null;
		// 세로 범위가 (작은 쪽 높이의) 절반 이상 겹치면 같은 줄 - 키 큰 텍스트에리어와 그 라벨도 한 줄이 된다.
		if (voLast != null && overlap(r.y, r.bottom, voLast.top, voLast.bottom) >= Math.min(r.h, voLast.bottom - voLast.top) * 0.5) {
			voLast.nodes.push(poNode);
			voLast.top = Math.min(voLast.top, r.y);
			voLast.bottom = Math.max(voLast.bottom, r.bottom);
		} else {
			vaRows.push({
				top : r.y,
				bottom : r.bottom,
				nodes : [poNode]
			});
		}
	});
	vaRows.forEach(function(poRow) {
		poRow.nodes.sort(function(a, b) {
			return a.layoutData.x - b.layoutData.x;
		});
	});
	return vaRows;
}

function countRole(paNodes, psRole) {
	return paNodes.filter(function(poNode) {
		return poNode.role == psRole;
	}).length;
}

/* ---------------------------------------------------------------- 버튼 클래스 · 셔틀 판단 */

var ARROW_TEXT = /^(|[<>▶◀▲▼∧∨→←↑↓]{1,2}|>>|<<)$/;

function isArrowButton(poNode) {
	return poNode.type == "button" && ARROW_TEXT.test((poNode.text || "").replace(/\s/g, ""));
}

/**
 * 템플릿의 버튼 클래스 관례.
 * @param {String} psText
 * @param {String} psPlace search | title | footer-left | footer-right
 */
function buttonClass(psText, psPlace) {
	var vsText = psText || "";
	if (psPlace == "search") {
		return /조회|검색|search/i.test(vsText) ? "btn-primary-02" : "btn-secondary-03 btn-md";
	}
	if (psPlace == "footer-right") {
		return /저장|확인|등록|적용|신규|추가|save|ok/i.test(vsText) ? "btn-primary-01" : "btn-secondary-01";
	}
	return "btn-secondary-03";
}

/* ---------------------------------------------------------------- 라벨·입력 짝짓기 */

var SEPARATOR_TEXT = /^[~\-–—]$/;

/**
 * 한 영역의 라벨(output)·입력 컨트롤을 필드 목록으로 만든다.
 * 같은 줄에서 입력 왼쪽의 라벨을 짝으로 삼고, "~" "-" 아웃풋은 앞뒤 입력을 한 필드(범위)로 묶는다.
 */
function buildFields(paNodes, paWarnings) {
	var vaFields = [];
	var voUsedLabel = {};
	var vaRows = clusterRows(paNodes.filter(function(poNode) {
		return poNode.role == "label" || poNode.role == "input";
	}));

	vaRows.forEach(function(poRow) {
		var voPending = null;
		var vbJoinNext = false;
		var voLastField = null;

		poRow.nodes.forEach(function(poNode, pnIdx) {
			if (poNode.role == "label") {
				var voNext = poRow.nodes[pnIdx + 1];
				var vsTrim = (poNode.text || "").replace(/\s/g, "");
				if (SEPARATOR_TEXT.test(vsTrim) && voLastField != null && voNext != null && voNext.role == "input") {
					voLastField.separator = vsTrim;
					vbJoinNext = true;
					voUsedLabel[poNode.id] = true;
				} else {
					voPending = poNode;
				}
				return;
			}
			if (vbJoinNext && voLastField != null) {
				voLastField.refs.push(poNode.id);
				vbJoinNext = false;
				return;
			}
			var voField = {
				label : "",
				refs : [poNode.id],
				_node : poNode
			};
			if (voPending != null) {
				applyLabel(voField, voPending);
				voUsedLabel[voPending.id] = true;
				voPending = null;
			}
			vaFields.push(voField);
			voLastField = voField;
		});
	});

	// 라벨이 입력 "위"에 있는 배치: 짝 없는 필드에 바로 위의 미사용 라벨을 붙인다.
	var vaLabels = paNodes.filter(function(poNode) {
		return poNode.role == "label" && !voUsedLabel[poNode.id];
	});
	vaFields.forEach(function(poField) {
		if (poField.labelRef != null) {
			return;
		}
		var r = rectOf(poField._node);
		for (var i = 0; i < vaLabels.length; i++) {
			var l = rectOf(vaLabels[i]);
			var vnGap = r.y - l.bottom;
			if (!voUsedLabel[vaLabels[i].id] && vnGap >= -4 && vnGap <= 16 && overlap(r.x, r.right, l.x, l.right) > 0) {
				applyLabel(poField, vaLabels[i]);
				voUsedLabel[vaLabels[i].id] = true;
				break;
			}
		}
	});

	vaLabels.forEach(function(poLabel) {
		if (!voUsedLabel[poLabel.id]) {
			paWarnings.push("짝이 없는 라벨 '" + poLabel.text + "'(" + poLabel.id + ")은 제외했습니다.");
			voUsedLabel[poLabel.id] = true;
		}
	});

	vaFields.forEach(function(poField) {
		delete poField._node;
	});
	return vaFields;
}

function applyLabel(poField, poLabelNode) {
	var vsText = (poLabelNode.text || "").replace(/^\s+|\s+$/g, "");
	if (/\*$/.test(vsText) || /^\*/.test(vsText)) {
		poField.required = true;
		vsText = vsText.replace(/^\*\s*|\s*\*$/g, "");
	}
	poField.label = vsText;
	poField.labelRef = poLabelNode.id;
}

function maxFieldsPerRow(paNodes) {
	var vnMax = 1;
	clusterRows(paNodes.filter(function(poNode) {
		return poNode.role == "input";
	})).forEach(function(poRow) {
		vnMax = Math.max(vnMax, poRow.nodes.length);
	});
	return vnMax;
}

/* ---------------------------------------------------------------- 규칙 기반 계획 */

/**
 * 한 영역(최상위 또는 탭 안)의 노드들을 구획으로 나눈다.
 * @return {{sections:Object[], search:Object, footer:Object, title:String}}
 */
function analyzeRegion(paNodes, pnCanvasWidth, pbTopLevel, paWarnings) {
	var voResult = {
		sections : [],
		search : null,
		footer : {
			left : [],
			right : []
		},
		title : "",
		consumed : []
	};
	var vaData = paNodes.filter(function(poNode) {
		return poNode.role == "data";
	});
	var vaPagers = paNodes.filter(function(poNode) {
		return poNode.role == "pager";
	});
	var vaOthers = paNodes.filter(function(poNode) {
		if (poNode.role == "header") {
			// 앱 헤더 UDC : 직렬화기가 0행에 직접 넣는다. 제목만 가져오고 소비한다.
			if (poNode.text) {
				voResult.title = poNode.text;
			}
			voResult.consumed.push(poNode.id);
			return false;
		}
		return poNode.role != "data" && poNode.role != "pager";
	});

	// 데이터 컨트롤마다 구획 1개
	var voSectionOf = {};
	vaData.forEach(function(poNode) {
		var voSection = {
			kind : poNode.type == "tabfolder" ? "tab" : poNode.type,
			title : "",
			ref : poNode.id,
			buttons : [],
			_rect : rectOf(poNode)
		};
		voSectionOf[poNode.id] = voSection;
		voResult.sections.push(voSection);
	});

	var vaAbove = [];
	var vaBelow = [];
	var vaMiddle = [];
	if (vaData.length == 0) {
		vaBelow = vaOthers;
	} else {
		var voDataBox = bbox(vaData);
		vaOthers.forEach(function(poNode) {
			var r = rectOf(poNode);
			if (r.cy < voDataBox.y) {
				vaAbove.push(poNode);
			} else if (r.cy > voDataBox.bottom) {
				vaBelow.push(poNode);
			} else {
				vaMiddle.push(poNode);
			}
		});
	}

	/** 데이터 구획 바로 위(40px 이내)에 가로로 겹쳐 있는 구획을 찾는다. */
	function sectionBelow(poNode) {
		var r = rectOf(poNode);
		var voBest = null;
		var vnBestGap = 49;
		voResult.sections.forEach(function(poSection) {
			if (poSection._rect == null || poSection.kind == "shuttle") {
				return;
			}
			var vnGap = poSection._rect.y - r.bottom;
			if (vnGap >= -4 && vnGap < vnBestGap && overlap(r.x, r.right, poSection._rect.x, poSection._rect.right) > 0) {
				voBest = poSection;
				vnBestGap = vnGap;
			}
		});
		return voBest;
	}

	/** 제목 줄 처리: 입력이 없는 줄의 버튼 → 구획 버튼, 라벨 → 구획 제목. 처리하지 못한 노드를 돌려준다. */
	function attachTitleRow(paRowNodes) {
		var vaRest = [];
		paRowNodes.forEach(function(poNode) {
			var voSection = sectionBelow(poNode);
			if (voSection == null) {
				vaRest.push(poNode);
			} else if (poNode.role == "button") {
				voSection.buttons.push({
					ref : poNode.id,
					cls : buttonClass(poNode.text, "title")
				});
			} else if ((poNode.role == "label" || poNode.role == "title") && voSection.title == "") {
				voSection.title = poNode.text;
				voSection.titleRef = poNode.id;
			} else {
				vaRest.push(poNode);
			}
		});
		return vaRest;
	}

	// ── 가운데(데이터 컨트롤과 같은 높이대): 셔틀 버튼 · 제목 줄 · 옆 폼
	var vaShuttle = vaMiddle.filter(isArrowButton);
	if (vaShuttle.length > 0 && vaData.length >= 2) {
		var voShuttleBox = bbox(vaShuttle);
		// 버튼들이 세로로 쌓여 있으면 좌우 이동(P7-1), 가로로 나란하면 상하 이동(P7-2)
		var vbVertical = voShuttleBox.w > voShuttleBox.h;
		var vaClasses = vbVertical ? ["btn-down", "btn-up"] : ["btn-right", "btn-left"];
		vaShuttle.sort(function(a, b) {
			return vbVertical ? a.layoutData.x - b.layoutData.x : a.layoutData.y - b.layoutData.y;
		});
		voResult.sections.push({
			kind : "shuttle",
			vertical : vbVertical,
			buttons : vaShuttle.map(function(poNode, pnIdx) {
				return {
					ref : poNode.id,
					cls : vaClasses[pnIdx % 2],
					clearText : true
				};
			}),
			_rect : voShuttleBox
		});
		vaMiddle = vaMiddle.filter(function(poNode) {
			return !isArrowButton(poNode);
		});
	}
	var vaMiddleRest = [];
	clusterRows(vaMiddle).forEach(function(poRow) {
		if (countRole(poRow.nodes, "input") == 0) {
			vaMiddleRest = vaMiddleRest.concat(attachTitleRow(poRow.nodes));
		} else {
			vaMiddleRest = vaMiddleRest.concat(poRow.nodes);
		}
	});
	if (countRole(vaMiddleRest, "input") > 0) {
		voResult.sections.push(makeFormSection(vaMiddleRest, paWarnings));
	} else {
		vaBelow = vaBelow.concat(vaMiddleRest);
	}

	// ── 위쪽: (화면 제목) → 조회 조건 → (데이터 구획의 제목 줄)
	var vaAboveRows = clusterRows(vaAbove);
	if (vaAboveRows.length > 0 && vaData.length > 0) {
		var voLastRow = vaAboveRows[vaAboveRows.length - 1];
		if (countRole(voLastRow.nodes, "input") == 0) {
			var vaRest = attachTitleRow(voLastRow.nodes);
			if (vaRest.length < voLastRow.nodes.length) {
				voLastRow.nodes = vaRest;
			}
		}
	}
	var vaSearchNodes = [];
	vaAboveRows.forEach(function(poRow, pnIdx) {
		if (pbTopLevel && pnIdx == 0 && vaAboveRows.length > 1 && poRow.nodes.length == 1 && poRow.nodes[0].role == "label") {
			voResult.title = poRow.nodes[0].text; // 맨 위에 홀로 있는 라벨 = 화면 제목
			return;
		}
		vaSearchNodes = vaSearchNodes.concat(poRow.nodes);
	});
	if (countRole(vaSearchNodes, "input") > 0) {
		voResult.search = {
			columns : Math.max(1, Math.min(4, maxFieldsPerRow(vaSearchNodes))),
			fields : buildFields(vaSearchNodes, paWarnings),
			buttons : vaSearchNodes.filter(function(poNode) {
				return poNode.role == "button";
			}).map(function(poNode) {
				return {
					ref : poNode.id,
					cls : buttonClass(poNode.text, "search")
				};
			})
		};
	} else {
		vaBelow = vaBelow.concat(vaSearchNodes);
	}

	// ── 아래쪽: 입력이 있으면 폼 구획, 끝의 버튼 줄은 하단 버튼
	var vaBelowRows = clusterRows(vaBelow);
	var vaFooterNodes = [];
	while (vaBelowRows.length > 0) {
		var voTail = vaBelowRows[vaBelowRows.length - 1];
		if (countRole(voTail.nodes, "input") > 0 || countRole(voTail.nodes, "button") == 0) {
			break;
		}
		vaFooterNodes = voTail.nodes.concat(vaFooterNodes);
		vaBelowRows.pop();
	}
	var vaFormNodes = [];
	vaBelowRows.forEach(function(poRow) {
		vaFormNodes = vaFormNodes.concat(poRow.nodes);
	});
	if (countRole(vaFormNodes, "input") > 0) {
		voResult.sections.push(makeFormSection(vaFormNodes, paWarnings));
	} else {
		vaFormNodes.forEach(function(poNode) {
			if (poNode.role == "button") {
				vaFooterNodes.push(poNode);
			} else {
				paWarnings.push("배치할 곳을 찾지 못한 라벨 '" + poNode.text + "'(" + poNode.id + ")은 제외했습니다.");
			}
		});
	}
	vaFooterNodes.forEach(function(poNode) {
		if (poNode.role != "button") {
			return;
		}
		var vbLeft = rectOf(poNode).cx < pnCanvasWidth / 2;
		voResult.footer[vbLeft ? "left" : "right"].push({
			ref : poNode.id,
			cls : buttonClass(poNode.text, vbLeft ? "footer-left" : "footer-right")
		});
	});

	// ── 페이지 인덱서 : 바로 위(60px 이내)에 있는 데이터 구획의 아래 줄로(템플릿 P1-4)
	vaPagers.forEach(function(poPager) {
		var p = rectOf(poPager);
		var voBest = null;
		var vnBestGap = 61;
		voResult.sections.forEach(function(poSection) {
			if (poSection._rect == null || poSection.ref == null || poSection.pagerRef != null) {
				return;
			}
			var vnGap = p.y - poSection._rect.bottom;
			if (vnGap >= -10 && vnGap < vnBestGap && overlap(p.x, p.right, poSection._rect.x, poSection._rect.right) > 0) {
				voBest = poSection;
				vnBestGap = vnGap;
			}
		});
		if (voBest != null) {
			voBest.pagerRef = poPager.id;
		}
	});

	return voResult;
}

/** 입력·라벨·버튼 묶음 → 폼 구획. 입력 없는 첫 줄의 라벨은 제목, 버튼은 제목 줄 버튼. */
function makeFormSection(paNodes, paWarnings) {
	var voSection = {
		kind : "form",
		title : "",
		buttons : [],
		_rect : bbox(paNodes)
	};
	var vaFieldNodes = [];
	clusterRows(paNodes).forEach(function(poRow, pnIdx) {
		var vbNoInput = countRole(poRow.nodes, "input") == 0;
		poRow.nodes.forEach(function(poNode) {
			if (poNode.role == "button") {
				voSection.buttons.push({
					ref : poNode.id,
					cls : buttonClass(poNode.text, "title")
				});
			} else if (vbNoInput && pnIdx == 0 && (poNode.role == "label" || poNode.role == "title") && voSection.title == "") {
				voSection.title = poNode.text;
				voSection.titleRef = poNode.id;
			} else {
				vaFieldNodes.push(poNode);
			}
		});
	});
	voSection.columns = Math.max(1, Math.min(3, maxFieldsPerRow(vaFieldNodes)));
	voSection.fields = buildFields(vaFieldNodes, paWarnings);
	return voSection;
}

/** 구획을 세로 겹침 기준으로 행에 배정한다(같은 행 = 좌우 나란히). */
function assignRows(paSections) {
	var vaSorted = paSections.slice().sort(function(a, b) {
		return a._rect.y - b._rect.y;
	});
	var vaRowBoxes = [];
	vaSorted.forEach(function(poSection) {
		var r = poSection._rect;
		var vnRow = -1;
		for (var i = 0; i < vaRowBoxes.length; i++) {
			var vnShare = overlap(r.y, r.bottom, vaRowBoxes[i].top, vaRowBoxes[i].bottom);
			if (vnShare >= Math.min(r.h, vaRowBoxes[i].bottom - vaRowBoxes[i].top) * 0.5) {
				vnRow = i;
				break;
			}
		}
		if (vnRow < 0) {
			vaRowBoxes.push({
				top : r.y,
				bottom : r.bottom
			});
			vnRow = vaRowBoxes.length - 1;
		} else {
			vaRowBoxes[vnRow].top = Math.min(vaRowBoxes[vnRow].top, r.y);
			vaRowBoxes[vnRow].bottom = Math.max(vaRowBoxes[vnRow].bottom, r.bottom);
		}
		poSection.row = vnRow;
	});
	// 행 안에서는 왼쪽→오른쪽 순서가 되도록 배열 자체를 정렬
	paSections.sort(function(a, b) {
		return a.row != b.row ? a.row - b.row : a._rect.x - b._rect.x;
	});
}

/** 구획 구성으로 가장 비슷한 템플릿 id 를 고른다. */
function decidePattern(paSections, pbHasSearch) {
	var vaMain = paSections.filter(function(poSection) {
		return poSection.kind != "shuttle" && poSection.parentTab == null;
	});
	var vaKinds = vaMain.map(function(poSection) {
		return poSection.kind;
	});
	var vbShuttle = paSections.some(function(poSection) {
		return poSection.kind == "shuttle";
	});
	var vbSideBySide = vaMain.length >= 2 && vaMain[0].row == vaMain[1].row;

	function has(psKind) {
		return vaKinds.indexOf(psKind) >= 0;
	}
	if (has("uicontrolshell")) {
		return "P8-1";
	}
	if (has("embeddedpage")) {
		return "P8-3";
	}
	if (has("accordion")) {
		return "P3-4";
	}
	if (vaMain.length == 1 && vaMain[0].kind == "grid" && (vaMain[0].pagerRef != null || vaMain[0].pager != null)) {
		return "P1-4";
	}
	if (has("tab")) {
		return pbHasSearch ? "P5-1" : "P5-2";
	}
	if (has("tree")) {
		return has("grid") ? "P6-1" : "P6-2";
	}
	if (vbShuttle) {
		return vbSideBySide ? "P7-1" : "P7-2";
	}
	var vnGrid = countKind("grid");
	var vnForm = countKind("form");
	function countKind(psKind) {
		return vaKinds.filter(function(psEach) {
			return psEach == psKind;
		}).length;
	}
	if (vnGrid >= 3) {
		return "P2-5";
	}
	if (vnGrid == 2 && vnForm == 0) {
		return vbSideBySide ? "P2-4" : "P2-1";
	}
	if (vnGrid >= 1 && vnForm >= 1) {
		var vbGridFirst = vaKinds[0] == "grid";
		if (vbSideBySide) {
			return vbGridFirst ? "P3-2" : "P4-3";
		}
		return vbGridFirst ? "P3-1" : "P4-4";
	}
	if (vnForm >= 2) {
		return "P4-1";
	}
	if (vnForm == 1) {
		return "P1-6";
	}
	return vaMain.length == 1 && vaMain[0].buttons.length > 0 ? "P1-2" : "P1-1";
}

/**
 * 좌표 기반 규칙으로 원시 계획을 만든다.
 * @param {Object} poAst canvasAst.extract() 결과
 * @return {Object} raw plan
 */
exports.planByRule = function(poAst) {
	var vaWarnings = [];
	var vaNodes = poAst.children;

	// 탭폴더 영역 안에 놓인 컨트롤은 그 탭(첫 번째 탭)의 내용으로 본다.
	var vaTabs = vaNodes.filter(function(poNode) {
		return poNode.type == "tabfolder";
	});
	var voInTab = {};
	vaNodes.forEach(function(poNode) {
		if (poNode.type == "tabfolder") {
			return;
		}
		var r = rectOf(poNode);
		vaTabs.forEach(function(poTab) {
			var t = rectOf(poTab);
			if (voInTab[poNode.id] == null && r.cx > t.x && r.cx < t.right && r.cy > t.y && r.cy < t.bottom) {
				voInTab[poNode.id] = poTab.id;
			}
		});
	});

	var voTop = analyzeRegion(vaNodes.filter(function(poNode) {
		return voInTab[poNode.id] == null;
	}), poAst.app.canvas.width, true, vaWarnings);
	assignRows(voTop.sections);

	var vaSections = voTop.sections;
	vaTabs.forEach(function(poTab) {
		var vaInner = vaNodes.filter(function(poNode) {
			return voInTab[poNode.id] == poTab.id;
		});
		if (vaInner.length == 0) {
			return;
		}
		var voInner = analyzeRegion(vaInner, poAst.app.canvas.width, false, vaWarnings);
		assignRows(voInner.sections);
		voInner.sections.forEach(function(poSection) {
			poSection.parentTab = poTab.id;
			poSection.tabIndex = 0;
			vaSections.push(poSection);
		});
		// 탭 안의 조회 조건·하단 버튼은 최상위로 올린다(템플릿의 탭 안에는 구획만 있다).
		if (voInner.search != null && voTop.search == null) {
			voTop.search = voInner.search;
		}
		voTop.footer.left = voTop.footer.left.concat(voInner.footer.left);
		voTop.footer.right = voTop.footer.right.concat(voInner.footer.right);
		voTop.consumed = voTop.consumed.concat(voInner.consumed);
	});

	vaSections.forEach(function(poSection) {
		delete poSection._rect;
	});

	return {
		pattern : decidePattern(vaSections, voTop.search != null),
		title : voTop.title || poAst.app.title || "",
		search : voTop.search,
		sections : vaSections,
		footer : voTop.footer,
		rename : [],
		consumed : voTop.consumed,
		warnings : vaWarnings
	};
};

/* ---------------------------------------------------------------- 계획 해석(검증·정규화) */

/**
 * 원시 계획의 ref 를 실제 컨트롤로 풀어 직렬화용 계획을 만든다.
 * - 없는 ref · 두 번 쓰인 ref 는 버린다(AI 응답 방어).
 * - 계획에 빠진 캔버스 컨트롤은 역할에 맞는 곳에 보충한다(사용자가 그린 것을 잃지 않는다).
 * @param {Object} poRaw 원시 계획(규칙 또는 Gemini)
 * @param {Object} poAst
 * @param {{pattern:String, popup:Boolean, planner:String}} poOpt pattern = 사용자가 고른 패턴("auto" 면 계획의 값)
 * @return {Object} 해석된 계획
 */
exports.resolve = function(poRaw, poAst, poOpt) {
	poOpt = poOpt || {};
	poRaw = poRaw || {};
	var vaWarnings = (poRaw.warnings || []).slice();
	var voNodeOf = {};
	var voUsed = {};
	poAst.children.forEach(function(poNode) {
		voNodeOf[poNode.id] = poNode;
	});

	// id 바꾸기(AI 가 의미 있는 id 를 제안한 경우)
	var voNewId = {};
	var voTaken = {};
	var voAlias = {}; // 새 id → 원래 id (AI 가 ref 에 새 id 를 쓴 경우를 받아 준다)
	(poRaw.consumed || []).forEach(function(psRef) {
		if (voNodeOf[psRef] != null && voNodeOf[psRef].role == "header") {
			voUsed[psRef] = true; // 앱 헤더 UDC 는 직렬화기가 직접 넣는다.
		}
	});
	(poRaw.rename || []).forEach(function(poEach) {
		if (poEach != null && voNodeOf[poEach.ref] != null && /^[A-Za-z][A-Za-z0-9_]*$/.test(poEach.id || "") && !voTaken[poEach.id] && voNodeOf[poEach.id] == null) {
			voNewId[poEach.ref] = poEach.id;
			voTaken[poEach.id] = true;
			voAlias[poEach.id] = poEach.ref;
		}
	});

	/** ref 정규화 : 캔버스 id 그대로면 그대로, rename 의 새 id 면 원래 id 로 */
	function R(psRef) {
		return voNodeOf[psRef] != null ? psRef : (voAlias[psRef] || psRef);
	}

	function take(psRef, psCls, pbClearText) {
		psRef = R(psRef);
		var voNode = voNodeOf[psRef];
		if (voNode == null || voUsed[psRef]) {
			return null;
		}
		voUsed[psRef] = true;
		return {
			type : voNode.type,
			id : voNewId[psRef] || voNode.id,
			text : pbClearText ? "" : voNode.text,
			items : voNode.items,
			// UI 템플릿은 자기 클래스를 이미 갖고 있으므로 계획이 클래스를 덮어쓰지 않는다.
			cls : voNode.type == "uitpl" ? null : (psCls || null),
			udcType : voNode.udcType,
			tpl : voNode.tpl,
			width : voNode.layoutData.width,
			height : voNode.layoutData.height
		};
	}

	function takeButtons(paButtons, psPlace) {
		var vaResult = [];
		(paButtons || []).forEach(function(poBtn) {
			var vsRef = R(typeof poBtn == "string" ? poBtn : (poBtn || {}).ref);
			var voNode = voNodeOf[vsRef];
			if (voNode == null || voNode.role != "button") {
				return;
			}
			var vsCls = voNode.type == "udc" || voNode.type == "uitpl" ? null : ((poBtn || {}).cls || buttonClass(voNode.text, psPlace));
			var voCtrl = take(vsRef, vsCls, (poBtn || {}).clearText === true);
			if (voCtrl != null) {
				vaResult.push(voCtrl);
			}
		});
		return vaResult;
	}

	function takeFields(paFields) {
		var vaResult = [];
		(paFields || []).forEach(function(poField) {
			if (poField == null) {
				return;
			}
			var vaControls = [];
			(poField.refs || []).forEach(function(psRef) {
				psRef = R(psRef);
				var voNode = voNodeOf[psRef];
				if (voNode != null && voNode.role == "input") {
					var voCtrl = take(psRef, null);
					if (voCtrl != null) {
						vaControls.push(voCtrl);
					}
				}
			});
			if (vaControls.length == 0) {
				return;
			}
			var vsLabelRef = R(poField.labelRef);
			var voLabelNode = voNodeOf[vsLabelRef];
			var vsLabelId = null;
			if (voLabelNode != null && voLabelNode.role == "label" && !voUsed[vsLabelRef]) {
				voUsed[vsLabelRef] = true;
				vsLabelId = voNewId[vsLabelRef] || voLabelNode.id;
			}
			var vbWide = vaControls.length == 1 && vaControls[0].type == "textarea";
			vaResult.push({
				label : poField.label != null && poField.label !== "" ? poField.label : (voLabelNode != null ? voLabelNode.text : ""),
				labelId : vsLabelId,
				required : poField.required === true,
				separator : vaControls.length > 1 ? (poField.separator || "~") : null,
				controls : vaControls,
				wide : vbWide,
				height : vbWide ? vaControls[0].height : 24
			});
		});
		return vaResult;
	}

	// ── 조회 조건
	var voSearch = null;
	if (poRaw.search != null) {
		voSearch = {
			columns : poRaw.search.columns,
			fields : takeFields(poRaw.search.fields),
			buttons : takeButtons(poRaw.search.buttons, "search")
		};
	}

	// ── 구획
	var vaTopSections = [];
	var voTabChildren = {};
	(poRaw.sections || []).forEach(function(poSection) {
		if (poSection == null) {
			return;
		}
		var voResolved = {
			kind : poSection.kind,
			title : poSection.title || "",
			row : typeof poSection.row == "number" ? poSection.row : 999,
			weight : poSection.weight
		};
		var vsTitleRef = R(poSection.titleRef);
		if (voNodeOf[vsTitleRef] != null && (voNodeOf[vsTitleRef].role == "label" || voNodeOf[vsTitleRef].role == "title")) {
			voUsed[vsTitleRef] = true;
		}

		if (poSection.kind == "shuttle") {
			voResolved.vertical = poSection.vertical === true;
			voResolved.buttons = takeButtons(poSection.buttons, "title");
			if (voResolved.buttons.length == 0) {
				return;
			}
		} else if (poSection.kind == "form") {
			voResolved.columns = poSection.columns;
			voResolved.fields = takeFields(poSection.fields);
			voResolved.buttons = takeButtons(poSection.buttons, "title");
			if (voResolved.fields.length == 0) {
				return;
			}
		} else {
			// grid · tree · tab : 캔버스의 데이터 컨트롤과 1:1
			var vsDataRef = R(poSection.ref);
			var voNode = voNodeOf[vsDataRef];
			if (voNode == null || voNode.role != "data") {
				return;
			}
			voResolved.kind = voNode.type == "tabfolder" ? "tab" : voNode.type;
			voResolved.control = take(vsDataRef, null);
			if (voResolved.control == null) {
				return;
			}
			var vsPagerRef = R(poSection.pagerRef);
			if (voNodeOf[vsPagerRef] != null && voNodeOf[vsPagerRef].role == "pager") {
				voResolved.pager = take(vsPagerRef, null);
			}
			if (voResolved.kind == "grid" && poSection.gridColumns != null && poSection.gridColumns.length > 0) {
				voResolved.control.items = poSection.gridColumns.map(String);
			}
			voResolved.buttons = takeButtons(poSection.buttons, "title");
			if (voResolved.kind == "tab") {
				voResolved.tabs = (voNode.items && voNode.items.length > 0 ? voNode.items : ["탭1"]).map(function(psText) {
					return {
						text : psText,
						sections : []
					};
				});
				voTabChildren[vsDataRef] = voResolved;
			}
		}

		if (poSection.parentTab != null) {
			voResolved._parentTab = R(poSection.parentTab);
			voResolved._tabIndex = poSection.tabIndex || 0;
		}
		vaTopSections.push(voResolved);
	});

	// 탭 안 구획을 탭으로 옮긴다.
	vaTopSections = vaTopSections.filter(function(poSection) {
		if (poSection._parentTab == null) {
			return true;
		}
		var voTab = voTabChildren[poSection._parentTab];
		if (voTab == null || voTab === poSection) {
			return true;
		}
		var vnIdx = Math.max(0, Math.min(voTab.tabs.length - 1, poSection._tabIndex));
		voTab.tabs[vnIdx].sections.push(poSection);
		return false;
	});

	// ── 하단 버튼
	var voFooter = {
		left : takeButtons((poRaw.footer || {}).left, "footer-left"),
		right : takeButtons((poRaw.footer || {}).right, "footer-right")
	};

	// ── 계획에서 빠진 컨트롤 보충
	var vaLeftInputs = [];
	poAst.children.forEach(function(poNode) {
		if (voUsed[poNode.id]) {
			return;
		}
		if (poNode.role == "data") {
			var voCtrl = take(poNode.id, null);
			var voExtra = {
				kind : poNode.type == "tabfolder" ? "tab" : poNode.type,
				title : "",
				row : 1000 + vaTopSections.length,
				control : voCtrl,
				buttons : []
			};
			if (voExtra.kind == "tab") {
				voExtra.tabs = (poNode.items && poNode.items.length > 0 ? poNode.items : ["탭1"]).map(function(psText) {
					return {
						text : psText,
						sections : []
					};
				});
			}
			vaTopSections.push(voExtra);
			vaWarnings.push("계획에 없던 " + poNode.type + "(" + poNode.id + ")을 구획으로 추가했습니다.");
		} else if (poNode.role == "button") {
			voFooter.right = voFooter.right.concat(takeButtons([poNode.id], "footer-right"));
			vaWarnings.push("계획에 없던 버튼(" + poNode.id + ")을 하단 버튼에 추가했습니다.");
		} else if (poNode.role == "header") {
			voUsed[poNode.id] = true; // 앱 헤더 UDC 는 직렬화기가 직접 넣는다.
		} else if (poNode.role == "pager") {
			var vaGridSections = vaTopSections.filter(function(poSection) {
				return poSection.kind == "grid" && poSection.pager == null;
			});
			if (vaGridSections.length > 0) {
				vaGridSections[0].pager = take(poNode.id, null);
			} else {
				vaWarnings.push("붙일 그리드가 없어 페이지 인덱서(" + poNode.id + ")는 제외했습니다.");
			}
		} else if (poNode.role == "title") {
			vaWarnings.push("타이틀 UDC(" + poNode.id + ")는 구획 제목으로 대체되어 따로 넣지 않았습니다.");
		} else if (poNode.role == "input") {
			vaLeftInputs.push({
				label : "항목",
				refs : [poNode.id]
			});
		}
	});
	if (vaLeftInputs.length > 0) {
		var vaExtraFields = takeFields(vaLeftInputs);
		var vaForms = vaTopSections.filter(function(poSection) {
			return poSection.kind == "form";
		});
		if (vaForms.length > 0) {
			vaForms[vaForms.length - 1].fields = vaForms[vaForms.length - 1].fields.concat(vaExtraFields);
		} else if (voSearch != null && voSearch.fields.length > 0) {
			voSearch.fields = voSearch.fields.concat(vaExtraFields);
		} else {
			vaTopSections.push({
				kind : "form",
				title : "",
				row : 2000,
				columns : 2,
				fields : vaExtraFields,
				buttons : []
			});
		}
		vaWarnings.push("계획에 없던 입력 컨트롤 " + vaLeftInputs.length + "개를 보충했습니다.");
	}

	// ── 패턴 · 배치
	var vsPattern = poOpt.pattern != null && poOpt.pattern != "auto" ? poOpt.pattern : poRaw.pattern;
	var voCatalog = findCatalog(vsPattern);
	if (voCatalog == null) {
		vsPattern = decidePattern(vaTopSections, voSearch != null && voSearch.fields.length > 0);
		voCatalog = findCatalog(vsPattern);
	}
	var vbForced = poOpt.pattern != null && poOpt.pattern != "auto";

	function toRows(paSections, psArrange) {
		var vaSorted = paSections.slice().sort(function(a, b) {
			return a.row - b.row;
		});
		var vaRows = [];
		if (psArrange == "row") {
			// 좌우 배치 강제: 전부 한 행
			if (vaSorted.length > 0) {
				vaRows.push(vaSorted);
			}
			return vaRows;
		}
		var vnLastRow = null;
		vaSorted.forEach(function(poSection) {
			if (psArrange == "column" || vnLastRow !== poSection.row || vaRows.length == 0) {
				vaRows.push([poSection]);
			} else {
				vaRows[vaRows.length - 1].push(poSection);
			}
			vnLastRow = poSection.row;
		});
		return vaRows;
	}

	vaTopSections.forEach(function(poSection) {
		if (poSection.kind == "tab") {
			poSection.tabs.forEach(function(poTab) {
				poTab.rows = toRows(poTab.sections, null);
			});
		}
	});

	var vsPopupSuffix = poOpt.popup ? "_P" : "";
	return {
		pattern : vsPattern + vsPopupSuffix,
		planner : poOpt.planner || "rule",
		popup : poOpt.popup === true,
		title : poRaw.title || poAst.app.title || "",
		search : voSearch,
		rows : toRows(vaTopSections, vbForced && voCatalog != null && voCatalog.arrange != "mixed" ? voCatalog.arrange : null),
		footer : voFooter,
		warnings : vaWarnings
	};
};

exports.buttonClass = buttonClass;
