/************************************************
 * openApiPlanner.module.js
 * Created at 2026. 9. 23.
 *
 * eX-Canvas(Web Prototyper) - Swagger/OpenAPI 명세(JSON) → eXBuilder6 데이터 모델 → 캔버스 뼈대(바인딩 포함).
 *
 * 흐름
 *   parse(text)                 JSON 문자열 → 명세 객체(OpenAPI 3.x · Swagger 2.0) 또는 응답 샘플 JSON(객체 · 배열). JSON 이 아니면 이유를 담은 Error 를 던진다.
 *   analyze(spec)               경로 × 메서드마다 "API 1개" 로 정리한다 — 파라미터 · 요청 본문 · 응답 스키마($ref 를 푼다) · 역할(list/detail/create/update/remove).
 *   analyze(sample)             명세가 아닌 "응답 샘플 JSON"({dsList:[…], dmPageInfo:{…}})이면 키마다 항목 1개 — 배열 = DataSet · 객체 = DataMap(페이지/부가 정보는 모델에만).
 *   mapModel(ops, opt)          고른 API 를 DataSet(목록 응답) · DataMap(조회 조건 · 상세/저장 본문 · 키) · Submission(API 1개 = 1개) 으로 옮긴다.
 *                               응답 샘플 항목이면 DataSet · DataMap 만 만든다(주소·메서드가 없어 Submission 은 없다).
 *   skeleton(model, canvas)     모델에 맞는 캔버스 항목(라벨 · 입력 · 그리드 · 버튼)을 바인딩(pt-bind)과 함께 좌표로 만든다.
 *   describe(model)             사람이 읽는 요약(출력 미리보기 칸).
 *   fetchSpec(url, opt, ok, err) URL 에서 명세를 받아온다 — 서버 프록시(/canvas/fetchOpenApi.do) 우선, 없으면 브라우저 직접(CORS 허용 서버만).
 *                               Swagger UI 화면 주소를 주면 문서 주소(/v3/api-docs · /v2/api-docs …)를 추정해 차례로 시도한다.
 *
 * 바인딩 표기(래퍼의 pt-bind · 속성창 Bind) — clxSerializer 가 CLX 로 옮긴다
 *   ds:<데이터셋 id>            그리드 → datasetid + 헤더/디테일 셀의 targetcolumnname/columnname(헤더 글자 ↔ 컬럼 이름·설명으로 맞춘다)
 *   dm:<데이터맵 id>.<컬럼>      입력 컨트롤 → <cl:datamapbind property="value" datacontrolid=… columnname=…/>
 *   sub:<서브미션 id>           버튼 → click 리스너 + .js 에 send() 핸들러(경로 변수 {id} 치환 포함)
 *   clear:<데이터 id>           버튼 → click 리스너 + .js 에 clear() 핸들러
 *
 * 설계 원칙
 *  - AI 를 쓰지 않는다. 명세는 이미 구조화된 데이터라 결정적으로 옮길 수 있다(같은 명세 → 같은 결과).
 *  - 역할 판정은 "응답이 목록이면 list, GET+경로변수면 detail, POST/PUT 본문이면 create/update, DELETE 면 remove".
 *    한국 사내 API 가 흔히 쓰는 "POST 로 조회" 도 응답이 목록이면 list 로 본다.
 *  - 상세 조회 응답 · 등록/수정 본문이 같은 스키마(또는 컬럼이 절반 이상 겹침)면 DataMap 하나(dmDetail)를 함께 쓴다 —
 *    폼 하나에 바인딩해 "선택 → 상세 → 고쳐서 저장" 이 그대로 이어지게.
 *  - 그 밖의 해석(조회 조건 · 구획 · 하단 버튼)은 손으로 그린 캔버스와 똑같이 templatePlanner.planByRule 이 좌표로 한다.
 ************************************************/

/** 역할 → 사람이 읽는 이름 (list~other 는 API, table·form·info 는 응답 샘플의 DataSet/DataMap) */
var ROLE_LABEL = {
	list : "목록 조회",
	detail : "상세 조회",
	create : "등록",
	update : "수정",
	remove : "삭제",
	other : "기타",
	table : "목록(그리드)",
	form : "폼(입력)",
	info : "페이지/부가 정보(모델만)"
};

/** 응답 샘플의 DataMap 컬럼이 대부분 이런 이름이면 "페이지/부가 정보" 로 보고 캔버스에는 놓지 않는다(모델에는 넣는다). */
var INFO_COLUMN = /(page|paging|total|count|success|ok|message|msg|status|code|error|timestamp|resultkey)/i;
/** 응답 샘플(계층형 JSON)을 따라 들어가는 최대 깊이 */
var MAX_DEPTH = 8;

/** 응답 객체 안에서 "목록" 을 찾을 때 먼저 보는 속성 이름(래퍼 관례 : {success, data:[…]} · Spring Page {content:[…]} …) */
var LIST_KEYS = ["data", "content", "list", "items", "rows", "result", "results", "records", "body", "payload"];
/** 래퍼 객체에 흔히 같이 있는 스칼라 속성(성공 여부 · 메시지 · 페이지 정보). 이런 것만 남으면 그 객체는 "목록 래퍼" 다. */
var WRAPPER_KEYS = /^(success|ok|status|code|message|msg|error|errors|timestamp|total|totalElements|totalCount|totalPages|count|page|pageNo|pageNum|pageNumber|number|size|pageSize|numberOfElements|first|last|empty|hasNext|hasPrev|hasPrevious|offset|limit|resultCode|resultMsg|resultMessage|sorted|unsorted)$/i;
/** 래퍼 안에서 한 단계 더 들어가 볼 속성(객체면 그 안의 목록을 찾는다) */
var WRAPPER_INNER = ["data", "result", "body", "payload", "response", "content"];
/** 페이징용 요청 파라미터 — DataMap 컬럼에는 두되 캔버스 조회 조건에는 놓지 않는다. */
var PAGING_PARAM = /^(page|pageNo|pageNum|pageNumber|size|pageSize|limit|offset|sort|sortBy|order|orderBy)$/i;

/** 역할이 화면에 하나뿐일 때 쓰는 읽기 쉬운 id */
var ROLE_IDS = {
	list : {
		sub : "subList",
		req : "dmSearch",
		res : "dsList"
	},
	detail : {
		sub : "subDetail",
		key : "dmDetailKey",
		res : "dmDetail"
	},
	create : {
		sub : "subSave",
		req : "dmDetail"
	},
	update : {
		sub : "subUpdate",
		req : "dmDetail"
	},
	remove : {
		sub : "subDelete",
		key : "dmDeleteKey"
	}
};

var METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

/** 캔버스 격자(templatePlanner.SK · imagePlanner 와 같은 값) */
var LAYOUT = {
	margin : 20,
	gap : 20,
	rowHeight : 24,
	rowPitch : 34,
	titleGap : 10,
	minWidth : 640,
	minHeight : 420,
	buttonWidth : 70,
	buttonSpacing : 8,
	maxSearchFields : 8
};

/* ---------------------------------------------------------------- 문자열 도움 */

function trim(psText) {
	return String(psText == null ? "" : psText).replace(/^\s+|\s+$/g, "");
}

function capitalize(psText) {
	return psText.length == 0 ? psText : psText.charAt(0).toUpperCase() + psText.substring(1);
}

/** "get-employee_list" · "employees/{id}" → "GetEmployeeList" · "EmployeesId" */
function pascal(psText) {
	var vaWords = String(psText == null ? "" : psText).replace(/\{([^}]*)\}/g, " $1 ").split(/[^A-Za-z0-9가-힣]+/);
	var vsOut = "";
	vaWords.forEach(function(psWord) {
		if (psWord.length > 0) {
			vsOut += capitalize(psWord);
		}
	});
	return vsOut;
}

/** XML NCName · 스크립트 식별자로 쓸 수 있는 id 만 남긴다. */
function identifier(psText, psFallback) {
	var vsId = String(psText == null ? "" : psText).replace(/[^A-Za-z0-9_]/g, "");
	if (vsId.length == 0) {
		return psFallback;
	}
	if (/^[0-9]/.test(vsId)) {
		vsId = "c" + vsId;
	}
	return vsId;
}

/** 설명 글에서 라벨로 쓸 만한 앞부분만(첫 문장 · 20자). */
function shortLabel(psText, pnMax) {
	var vsText = trim(psText).split(/\r?\n/)[0].replace(/\s+/g, " ");
	vsText = vsText.split(/[.。(:：]/)[0];
	var vnMax = pnMax || 20;
	if (vsText.length > vnMax) {
		vsText = vsText.substring(0, vnMax);
	}
	return trim(vsText);
}

/* ---------------------------------------------------------------- 1) 명세 읽기 */

function isArray(pvValue) {
	return Object.prototype.toString.call(pvValue) == "[object Array]";
}

function isPlainObject(pvValue) {
	return pvValue != null && typeof pvValue == "object" && !isArray(pvValue);
}

/** OpenAPI/Swagger 명세인가(openapi · swagger 필드). 아니면 응답 샘플 JSON 으로 본다. */
function isSpec(poJson) {
	return isPlainObject(poJson) && (poJson.openapi != null || poJson.swagger != null);
}
exports.isSpec = isSpec;

/**
 * JSON 문자열을 읽는다. OpenAPI/Swagger 명세면 명세 객체를, 그 밖의 JSON(객체 · 배열)이면 "응답 샘플" 로 그대로 돌려준다.
 * JSON 이 아니거나(YAML · HTML) 명세에 paths 가 없으면 이유를 담은 Error 를 던진다. 어느 쪽인지는 isSpec() 으로 본다.
 * @param {String} psText
 * @return {Object} 명세 또는 응답 샘플
 */
exports.parse = function(psText) {
	var vsText = String(psText == null ? "" : psText).replace(/^﻿/, "");
	vsText = trim(vsText);
	if (vsText === "") {
		throw new Error("내용이 비어 있습니다. OpenAPI/Swagger JSON 이나 응답 샘플 JSON 을 넣어 주세요.");
	}
	if (vsText.charAt(0) != "{" && vsText.charAt(0) != "[") {
		if (/^(openapi|swagger)\s*:/.test(vsText)) {
			throw new Error("YAML 형식입니다. JSON 으로 받은 명세(/v3/api-docs · swagger.json)를 넣어 주세요.");
		}
		if (vsText.charAt(0) == "<") {
			throw new Error("HTML/XML 이 들어왔습니다. Swagger UI 화면이 아니라 JSON 문서 주소(/v3/api-docs 등)를 넣어 주세요.");
		}
		throw new Error("JSON 객체({ … }) 또는 배열([ … ])이 아닙니다.");
	}
	var voJson;
	try {
		voJson = JSON.parse(vsText);
	} catch (e) {
		throw new Error("JSON 을 읽지 못했습니다 : " + e.message);
	}
	if (voJson == null || typeof voJson != "object") {
		throw new Error("JSON 객체가 아닙니다.");
	}
	if (isSpec(voJson)) {
		if (voJson.paths == null || typeof voJson.paths != "object") {
			throw new Error("명세에 paths 가 없습니다.");
		}
		return voJson;
	}
	// openapi · swagger 필드가 없으면 실제 응답 모양(응답 샘플)으로 본다 — 배열 키는 DataSet, 객체 키는 DataMap 이 된다.
	return voJson;
};

/* ---------------------------------------------------------------- $ref 풀기 */

function refName(psRef) {
	var vaParts = String(psRef).split("/");
	return decodeURIComponent(vaParts[vaParts.length - 1].replace(/~1/g, "/").replace(/~0/g, "~"));
}

function refTarget(poSpec, psRef) {
	if (typeof psRef != "string" || psRef.indexOf("#/") != 0) {
		return null; // 외부 파일 참조는 지원하지 않는다.
	}
	var vaPath = psRef.substring(2).split("/");
	var voNode = poSpec;
	for (var i = 0; i < vaPath.length; i++) {
		var vsKey;
		try {
			vsKey = decodeURIComponent(vaPath[i]).replace(/~1/g, "/").replace(/~0/g, "~");
		} catch (e) {
			vsKey = vaPath[i];
		}
		if (voNode == null || typeof voNode != "object") {
			return null;
		}
		voNode = voNode[vsKey];
	}
	return voNode == null ? null : voNode;
}

function cloneSeen(poSeen) {
	var voOut = {};
	for (var vsKey in poSeen) {
		voOut[vsKey] = true;
	}
	return voOut;
}

/** OpenAPI 3.1 의 type: ["string","null"] · nullable 을 단일 type 으로 */
function singleType(pvType) {
	if (pvType == null) {
		return null;
	}
	if (Object.prototype.toString.call(pvType) == "[object Array]") {
		for (var i = 0; i < pvType.length; i++) {
			if (pvType[i] != "null") {
				return pvType[i];
			}
		}
		return null;
	}
	return pvType;
}

function mergeInto(poOut, poPart) {
	if (poPart == null) {
		return;
	}
	Object.keys(poPart).forEach(function(psKey) {
		if (psKey == "properties") {
			poOut.properties = poOut.properties || {};
			Object.keys(poPart.properties).forEach(function(psProp) {
				if (poOut.properties[psProp] == null) {
					poOut.properties[psProp] = poPart.properties[psProp];
				}
			});
		} else if (psKey == "required") {
			poOut.required = (poOut.required || []).concat(poPart.required || []);
		} else if (poOut[psKey] == null) {
			poOut[psKey] = poPart[psKey];
		}
	});
}

/**
 * $ref · allOf · oneOf/anyOf 를 풀어 평범한 스키마 객체로 만든다(자식까지 재귀).
 * 순환 참조는 x-cycle 로 끊고, 참조 이름은 x-name 에 남긴다(같은 스키마인지 볼 때 쓴다).
 */
function resolveSchema(poSpec, poSchema, pnDepth, poSeen) {
	if (poSchema == null || typeof poSchema != "object") {
		return null;
	}
	pnDepth = pnDepth || 0;
	poSeen = poSeen || {};
	if (pnDepth > 8) {
		return {
			type : "object",
			"x-truncated" : true
		};
	}
	if (poSchema.$ref != null) {
		var vsName = refName(poSchema.$ref);
		if (poSeen[poSchema.$ref]) {
			return {
				type : "object",
				"x-name" : vsName,
				"x-cycle" : true
			};
		}
		var voTarget = refTarget(poSpec, poSchema.$ref);
		if (voTarget == null) {
			return {
				type : "object",
				"x-name" : vsName,
				"x-missing" : true
			};
		}
		var voSeen2 = cloneSeen(poSeen);
		voSeen2[poSchema.$ref] = true;
		var voResolved = resolveSchema(poSpec, voTarget, pnDepth + 1, voSeen2) || {};
		if (voResolved["x-name"] == null) {
			voResolved["x-name"] = vsName;
		}
		return voResolved;
	}

	var voOut = {};
	Object.keys(poSchema).forEach(function(psKey) {
		if (psKey != "allOf" && psKey != "oneOf" && psKey != "anyOf" && psKey != "properties" && psKey != "items" && psKey != "type") {
			voOut[psKey] = poSchema[psKey];
		}
	});
	voOut.type = singleType(poSchema.type);
	(poSchema.allOf || []).forEach(function(poPart) {
		mergeInto(voOut, resolveSchema(poSpec, poPart, pnDepth + 1, poSeen));
	});
	var vaChoice = poSchema.oneOf || poSchema.anyOf;
	if (vaChoice && vaChoice.length > 0) {
		mergeInto(voOut, resolveSchema(poSpec, vaChoice[0], pnDepth + 1, poSeen)); // 첫 번째 선택지로 본다.
	}
	if (poSchema.properties != null) {
		voOut.properties = voOut.properties || {};
		Object.keys(poSchema.properties).forEach(function(psProp) {
			voOut.properties[psProp] = resolveSchema(poSpec, poSchema.properties[psProp], pnDepth + 1, poSeen) || {};
		});
	}
	if (poSchema.items != null) {
		voOut.items = resolveSchema(poSpec, poSchema.items, pnDepth + 1, poSeen) || {};
	}
	if (voOut.type == null) {
		if (voOut.properties != null) {
			voOut.type = "object";
		} else if (voOut.items != null) {
			voOut.type = "array";
		}
	}
	return voOut;
}

function isObjectSchema(poSchema) {
	return poSchema != null && (poSchema.type == "object" || poSchema.properties != null) && poSchema.properties != null;
}

function isArrayOfObjects(poSchema) {
	return poSchema != null && poSchema.type == "array" && isObjectSchema(poSchema.items);
}

function isScalarSchema(poSchema) {
	if (poSchema == null) {
		return false;
	}
	var vsType = poSchema.type;
	if (vsType == "string" || vsType == "integer" || vsType == "number" || vsType == "boolean") {
		return true;
	}
	// type 이 없어도 enum · format 이 있으면 값으로 본다.
	return vsType == null && (poSchema["enum"] != null || poSchema.format != null) && poSchema.properties == null && poSchema.items == null;
}

/* ---------------------------------------------------------------- 스키마 → 컬럼 */

/** OpenAPI 자료형 → eXBuilder6 datacolumn datatype(string · number · decimal · expression 만 있다) */
function dataType(poSchema) {
	if (poSchema == null) {
		return "string";
	}
	if (poSchema.type == "integer") {
		return "number";
	}
	if (poSchema.type == "number") {
		return poSchema.format == "float" || poSchema.format == "double" ? "decimal" : "number";
	}
	return "string";
}

/** 컬럼 하나. label 은 title → description 앞부분 → 이름 순. */
function makeColumn(psName, poSchema, pbRequired) {
	poSchema = poSchema || {};
	var vsLabel = trim(poSchema.title) || shortLabel(poSchema.description) || psName;
	return {
		name : psName,
		datatype : dataType(poSchema),
		label : vsLabel,
		type : poSchema.type || (poSchema["enum"] != null ? "string" : "string"),
		format : poSchema.format || null,
		"enum" : poSchema["enum"] != null ? poSchema["enum"].map(String) : null,
		required : pbRequired === true,
		maxLength : poSchema.maxLength || null,
		readOnly : poSchema.readOnly === true
	};
}

/**
 * 객체 스키마의 1단계 속성을 컬럼으로 만든다. 중첩 객체 · 배열은 컬럼이 되지 않는다(참고에 남긴다).
 * @return {{columns:Object[], children:Object[], notes:String[]}} children = 객체 배열 속성(자식 DataSet 후보)
 */
function columnsOf(poSchema, psWhere) {
	var vaColumns = [];
	var vaChildren = [];
	var vaNotes = [];
	if (!isObjectSchema(poSchema)) {
		return {
			columns : vaColumns,
			children : vaChildren,
			notes : vaNotes
		};
	}
	var vaRequired = poSchema.required || [];
	Object.keys(poSchema.properties).forEach(function(psName) {
		var voProp = poSchema.properties[psName] || {};
		if (isScalarSchema(voProp)) {
			vaColumns.push(makeColumn(psName, voProp, vaRequired.indexOf(psName) >= 0));
		} else if (isArrayOfObjects(voProp)) {
			vaChildren.push({
				name : psName,
				schema : voProp.items
			});
			vaNotes.push(psWhere + " 의 객체 배열 '" + psName + "' 은 컬럼으로 옮기지 않았습니다(자식 DataSet 이 필요하면 따로 만드세요).");
		} else if (voProp.type == "array") {
			vaNotes.push(psWhere + " 의 배열 '" + psName + "' 은 컬럼으로 옮기지 않았습니다.");
		} else if (isObjectSchema(voProp)) {
			// 중첩 객체 : 스칼라 자식만 "부모.자식" 이 아니라 자식 이름 그대로 올린다(겹치면 건너뛴다) — JSON 키가 달라지므로 참고로 남긴다.
			vaNotes.push(psWhere + " 의 중첩 객체 '" + psName + "' 은 컬럼으로 옮기지 않았습니다(1단계 속성만 옮깁니다).");
		} else {
			vaColumns.push(makeColumn(psName, voProp, vaRequired.indexOf(psName) >= 0));
		}
	});
	return {
		columns : vaColumns,
		children : vaChildren,
		notes : vaNotes
	};
}

/**
 * 객체 스키마가 "목록 래퍼" 인지 보고 목록 속성 이름을 돌려준다.
 *  - 이름이 LIST_KEYS(data · content · list …)인 객체 배열 속성이 있으면 그것.
 *  - 아니면 객체 배열 속성이 하나뿐이고 나머지가 모두 래퍼용 스칼라(success · message · 페이지 정보)일 때만 그것.
 *  사원 상세처럼 "엔티티 + 자식 배열(careers)" 은 목록이 아니다(그 배열은 자식 DataSet 후보일 뿐).
 * @return {String} 목록 속성 이름 또는 null
 */
function listProperty(poSchema) {
	var vaKeys = Object.keys(poSchema.properties);
	for (var i = 0; i < LIST_KEYS.length; i++) {
		if (vaKeys.indexOf(LIST_KEYS[i]) >= 0 && isArrayOfObjects(poSchema.properties[LIST_KEYS[i]])) {
			return LIST_KEYS[i];
		}
	}
	var vaArrays = vaKeys.filter(function(psKey) {
		return isArrayOfObjects(poSchema.properties[psKey]);
	});
	if (vaArrays.length != 1) {
		return null;
	}
	var vbWrapper = vaKeys.every(function(psKey) {
		if (psKey == vaArrays[0]) {
			return true;
		}
		var voProp = poSchema.properties[psKey];
		if (isScalarSchema(voProp) || voProp.type == null) {
			return WRAPPER_KEYS.test(psKey);
		}
		return /^(pageable|sort|meta|paging|pagination|page)$/i.test(psKey); // 페이지 정보 객체
	});
	return vbWrapper ? vaArrays[0] : null;
}

/**
 * 응답 스키마에서 "목록(객체 배열)" 을 찾는다. 루트가 배열이면 그대로, 객체면 래퍼 속성(data · content …) 안을 2단계까지 본다.
 * @return {{alias:String, items:Object, path:String[]}} 없으면 null. alias 는 Submission 응답의 alias(점으로 이은 경로).
 */
function findList(poSchema) {
	if (poSchema == null) {
		return null;
	}
	if (isArrayOfObjects(poSchema)) {
		return {
			alias : "",
			items : poSchema.items,
			path : []
		};
	}
	if (!isObjectSchema(poSchema)) {
		return null;
	}
	var vsKey = listProperty(poSchema);
	if (vsKey != null) {
		return {
			alias : vsKey,
			items : poSchema.properties[vsKey].items,
			path : [vsKey]
		};
	}
	// 2단계 : {success, data:{content:[…], totalElements}} 처럼 래퍼 속성이 객체면 그 안을 본다.
	for (var j = 0; j < WRAPPER_INNER.length; j++) {
		var voInner = poSchema.properties[WRAPPER_INNER[j]];
		if (isObjectSchema(voInner)) {
			var vsInner = listProperty(voInner);
			if (vsInner != null) {
				return {
					alias : WRAPPER_INNER[j] + "." + vsInner,
					items : voInner.properties[vsInner].items,
					path : [WRAPPER_INNER[j], vsInner]
				};
			}
		}
	}
	return null;
}

/* ---------------------------------------------------------------- 2) API 목록 */

function joinPath(psBase, psPath) {
	var vsBase = trim(psBase).replace(/\/+$/, "");
	var vsPath = trim(psPath);
	if (vsPath.charAt(0) != "/") {
		vsPath = "/" + vsPath;
	}
	return vsBase + vsPath;
}

/** OpenAPI 3 servers[0].url → { origin, path } (상대 경로 "/api" 도 받는다) */
function serverOf(poSpec) {
	var voOut = {
		origin : "",
		path : ""
	};
	if (poSpec.openapi != null) {
		var vaServers = poSpec.servers || [];
		var vsUrl = vaServers.length > 0 && vaServers[0] != null ? trim(vaServers[0].url) : "";
		vsUrl = vsUrl.replace(/\{[^}]*\}/g, ""); // 서버 변수는 비운다.
		var vaMatch = /^(https?:\/\/[^\/?#]+)(\/[^?#]*)?/.exec(vsUrl);
		if (vaMatch != null) {
			voOut.origin = vaMatch[1];
			voOut.path = vaMatch[2] || "";
		} else if (vsUrl.charAt(0) == "/") {
			voOut.path = vsUrl;
		}
	} else {
		voOut.path = poSpec.basePath || "";
		if (poSpec.host) {
			voOut.origin = ((poSpec.schemes && poSpec.schemes[0]) || "http") + "://" + poSpec.host;
		}
	}
	voOut.path = voOut.path.replace(/\/+$/, "");
	if (voOut.path == "/") {
		voOut.path = "";
	}
	return voOut;
}

/** 파라미터 목록(경로 공통 + 오퍼레이션)을 이름+위치로 합친다. Swagger 2 의 body/formData 파라미터도 여기서 갈라낸다. */
function collectParams(poSpec, paCommon, paOwn, pbV3) {
	var vaOut = [];
	var voSeen = {};
	var voBody = null;
	var vbFormData = false;
	(paCommon || []).concat(paOwn || []).forEach(function(poParam) {
		if (poParam == null) {
			return;
		}
		if (poParam.$ref != null) {
			poParam = refTarget(poSpec, poParam.$ref) || {};
		}
		var vsIn = poParam["in"] || "query";
		if (!pbV3 && vsIn == "body") {
			voBody = {
				schema : resolveSchema(poSpec, poParam.schema),
				mediaType : "application/json",
				name : poParam.name
			};
			return;
		}
		if (vsIn == "formData") {
			vbFormData = true;
		}
		var vsKey = vsIn + ":" + poParam.name;
		var voSchema = pbV3 ? resolveSchema(poSpec, poParam.schema) : resolveSchema(poSpec, {
			type : poParam.type,
			format : poParam.format,
			"enum" : poParam["enum"],
			items : poParam.items,
			description : poParam.description,
			maxLength : poParam.maxLength
		});
		if (voSchema != null && poParam.description != null && voSchema.description == null) {
			voSchema.description = poParam.description;
		}
		var voEntry = {
			name : poParam.name,
			"in" : vsIn,
			required : poParam.required === true || vsIn == "path",
			description : poParam.description || "",
			schema : voSchema || {}
		};
		if (voSeen[vsKey] != null) {
			vaOut[voSeen[vsKey]] = voEntry; // 오퍼레이션 쪽이 공통을 덮는다.
		} else {
			voSeen[vsKey] = vaOut.length;
			vaOut.push(voEntry);
		}
	});
	return {
		params : vaOut,
		body : voBody,
		formData : vbFormData
	};
}

function pickMediaType(poContent) {
	if (poContent == null) {
		return null;
	}
	var vaKeys = Object.keys(poContent);
	for (var i = 0; i < vaKeys.length; i++) {
		if (/json/i.test(vaKeys[i])) {
			return vaKeys[i];
		}
	}
	return vaKeys.length > 0 ? vaKeys[0] : null;
}

function requestBodyOf(poSpec, poOp) {
	var voBody = poOp.requestBody;
	if (voBody == null) {
		return null;
	}
	if (voBody.$ref != null) {
		voBody = refTarget(poSpec, voBody.$ref) || {};
	}
	var vsMedia = pickMediaType(voBody.content);
	if (vsMedia == null) {
		return null;
	}
	return {
		schema : resolveSchema(poSpec, voBody.content[vsMedia].schema),
		mediaType : vsMedia,
		required : voBody.required === true
	};
}

function responseOf(poSpec, poOp, pbV3) {
	var voResponses = poOp.responses || {};
	var vaOrder = ["200", "201", "2XX", "2xx", "default"];
	var vsStatus = null;
	for (var i = 0; i < vaOrder.length; i++) {
		if (voResponses[vaOrder[i]] != null) {
			vsStatus = vaOrder[i];
			break;
		}
	}
	if (vsStatus == null) {
		var vaKeys = Object.keys(voResponses);
		for (var j = 0; j < vaKeys.length; j++) {
			if (/^2/.test(vaKeys[j])) {
				vsStatus = vaKeys[j];
				break;
			}
		}
	}
	if (vsStatus == null) {
		return null;
	}
	var voResponse = voResponses[vsStatus];
	if (voResponse != null && voResponse.$ref != null) {
		voResponse = refTarget(poSpec, voResponse.$ref) || {};
	}
	var voSchema = null;
	var vsMedia = null;
	if (pbV3) {
		vsMedia = pickMediaType(voResponse.content);
		voSchema = vsMedia == null ? null : resolveSchema(poSpec, voResponse.content[vsMedia].schema);
	} else {
		voSchema = resolveSchema(poSpec, voResponse.schema);
	}
	return {
		status : vsStatus,
		schema : voSchema,
		mediaType : vsMedia
	};
}

/** 역할 판정 — 응답이 목록이면 list(POST 조회 포함), GET+경로 변수 또는 객체 응답이면 detail, 본문 있는 POST/PUT/PATCH 는 create/update, DELETE 는 remove */
function inferRole(poOp) {
	if (poOp.list != null) {
		return "list";
	}
	var vbPathParam = poOp.params.some(function(poParam) {
		return poParam["in"] == "path";
	});
	var vbObjectResponse = poOp.response != null && isObjectSchema(poOp.response.schema);
	var vbObjectBody = poOp.body != null && isObjectSchema(poOp.body.schema);
	if (poOp.method == "get") {
		return vbPathParam || vbObjectResponse ? "detail" : "other";
	}
	if (poOp.method == "delete") {
		return "remove";
	}
	if (poOp.method == "post" && (vbObjectBody || poOp.params.length > 0)) {
		return "create";
	}
	if ((poOp.method == "put" || poOp.method == "patch") && (vbObjectBody || poOp.params.length > 0)) {
		return "update";
	}
	return "other";
}

/**
 * 명세를 "API 목록" 으로 정리한다. 응답 샘플 JSON 이면 analyzeSample() — 같은 모양의 결과(kind = "sample", operations = DataSet/DataMap 항목).
 * @param {Object} poSpec parse() 결과
 * @return {{title:String, version:String, kind:String, server:Object, tags:String[], operations:Object[], schemaCount:Number, warnings:String[]}}
 */
exports.analyze = function(poSpec) {
	if (!isSpec(poSpec)) {
		return analyzeSample(poSpec);
	}
	var vbV3 = poSpec.openapi != null;
	var voInfo = poSpec.info || {};
	var voServer = serverOf(poSpec);
	var vaOps = [];
	var vaWarnings = [];
	var vaTags = [];
	var voTagSeen = {};
	var voSchemas = vbV3 ? ((poSpec.components || {}).schemas || {}) : (poSpec.definitions || {});

	Object.keys(poSpec.paths).forEach(function(psPath) {
		var voPathItem = poSpec.paths[psPath];
		if (voPathItem == null || typeof voPathItem != "object") {
			return;
		}
		if (voPathItem.$ref != null) {
			voPathItem = refTarget(poSpec, voPathItem.$ref) || {};
		}
		METHODS.forEach(function(psMethod) {
			var voRaw = voPathItem[psMethod];
			if (voRaw == null || typeof voRaw != "object") {
				return;
			}
			var voParams = collectParams(poSpec, voPathItem.parameters, voRaw.parameters, vbV3);
			var voOp = {
				key : psMethod.toUpperCase() + " " + psPath,
				method : psMethod,
				path : joinPath(voServer.path, psPath),
				rawPath : psPath,
				operationId : voRaw.operationId || "",
				summary : trim(voRaw.summary) || "",
				description : trim(voRaw.description) || "",
				tags : (voRaw.tags || []).map(String),
				deprecated : voRaw.deprecated === true,
				params : voParams.params,
				formData : voParams.formData,
				body : vbV3 ? requestBodyOf(poSpec, voRaw) : voParams.body,
				response : responseOf(poSpec, voRaw, vbV3)
			};
			if (voOp.tags.length == 0) {
				voOp.tags = ["(태그 없음)"];
			}
			voOp.tags.forEach(function(psTag) {
				if (!voTagSeen[psTag]) {
					voTagSeen[psTag] = true;
					vaTags.push(psTag);
				}
			});
			voOp.list = voOp.response == null ? null : findList(voOp.response.schema);
			voOp.role = inferRole(voOp);
			voOp.label = voOp.key + (voOp.summary ? " — " + voOp.summary : "") + " [" + ROLE_LABEL[voOp.role] + "]";
			vaOps.push(voOp);
		});
	});
	if (vaOps.length == 0) {
		vaWarnings.push("paths 에 오퍼레이션(get/post/…)이 없습니다.");
	}
	return {
		title : trim(voInfo.title) || "",
		version : trim(voInfo.version) || "",
		kind : vbV3 ? "openapi " + poSpec.openapi : "swagger " + poSpec.swagger,
		server : voServer,
		tags : vaTags,
		operations : vaOps,
		schemaCount : Object.keys(voSchemas).length,
		warnings : vaWarnings
	};
};

exports.ROLE_LABEL = ROLE_LABEL;

/* ---------------------------------------------------------------- 2-b) 응답 샘플 JSON → DataSet/DataMap 항목
 *
 * 명세 대신 실제 응답 모양을 넣는 경우 : { dsList:[{…},{…}], dmPageInfo:{…} } · Spring Page { data:{ content:[…], totalElements } } · 배열 하나 ·
 * 계층형 { customerInfo:{ …, contact:{…}, accounts:[{ …, transactions:[…] }] }, creditInfo:{ …, paymentHistory:[…] } }.
 *   - 객체 값 키        → DataMap  (컬럼 = 1단계 스칼라 속성)
 *   - 객체 배열 값 키    → DataSet  (컬럼 = 행들의 스칼라 속성 합집합, 자료형은 값으로)
 *   - 그 안의 배열/객체는 재귀로 자식 항목이 된다(MAX_DEPTH 까지). 배열 행 안의 배열은 모든 행의 것을 이어 붙인 DataSet,
 *     배열 행 안의 객체는 행마다 하나씩 모은 DataSet, 객체 안의 객체는 DataMap. 경로(customerInfo.accounts.transactions)를 path 에 남긴다.
 *   - 스칼라가 없는 래퍼 객체({data:{content:[…]}})는 DataMap 이 되지 않고 안의 것만 항목이 된다.
 *   - 최상위 스칼라(success · message · CI …) → DataMap dmResult 하나
 *   - 페이지/부가 정보로 보이는 DataMap(컬럼 이름이 대부분 page·total·count·message …)은 role = "info" — 모델에는 넣고 캔버스에는 놓지 않는다.
 * id 는 키를 그대로 쓰되(dsList · dmPageInfo) ds/dm 접두가 없으면 붙인다(transactions → dsTransactions · contact → dmContact). 원래 키는 jsonKey 에 남긴다.
 * Submission 은 만들지 않는다(주소·메서드가 없다). 중첩 데이터는 responsedata alias 를 경로로 두거나 submit-done 에서 직접 넣어야 한다(참고에 적는다).
 */

/** 값 하나의 자료형(integer · number · boolean · string). null/undefined 는 모른다(null). */
function valueType(pvValue) {
	if (typeof pvValue == "number") {
		return isFinite(pvValue) && Math.floor(pvValue) == pvValue ? "integer" : "number";
	}
	if (typeof pvValue == "boolean") {
		return "boolean";
	}
	if (typeof pvValue == "string") {
		return "string";
	}
	return null;
}

/** "PROJ_LIST" · "page-info" · "content" → "ProjList" · "PageInfo" · "Content" (id 접두 뒤에 붙일 때) */
function pascalWords(psText) {
	var vsOut = "";
	String(psText == null ? "" : psText).split(/[^A-Za-z0-9가-힣]+/).forEach(function(psWord) {
		if (psWord.length > 0) {
			// 대문자 낱말(PROJ)은 소문자로 눌러 Proj 로, camelCase 낱말(pageInfo)은 첫 글자만 올린다.
			vsOut += capitalize(/^[A-Z0-9]+$/.test(psWord) ? psWord.toLowerCase() : psWord);
		}
	});
	return vsOut;
}

/** 응답 샘플 키 → 데이터 id. 이미 ds/dm 접두가 있으면 그대로, 없으면 붙인다. */
function sampleId(psKey, psPrefix) {
	var vsId = identifier(psKey, "");
	if (/^(ds|dm)[A-Z0-9_]/.test(vsId)) {
		return vsId;
	}
	return psPrefix + (pascalWords(psKey) || "Data");
}

/**
 * 객체(들)의 1단계 스칼라 속성을 컬럼으로 만든다. 여러 행이면 키의 합집합(처음 나온 순서), 자료형은 값들로 정한다
 * (문자열이 하나라도 있으면 string · 소수가 있으면 decimal · 정수만이면 number · boolean → 체크박스).
 * 중첩 배열/객체 속성은 컬럼이 되지 않고 nested 에 돌려준다(부른 쪽이 자식 항목으로 만든다).
 * 여러 행에 걸친 중첩은 한데 모은다 — 배열은 이어 붙이고(values = 모든 행의 원소), 객체는 행마다 하나씩(values = 객체들).
 * @param {Object[]} paRows
 * @return {{columns:Object[], nested:{name:String, kind:String, values:Array}[]}}
 */
function sampleColumns(paRows) {
	var vaColumns = [];
	var voIndex = {};
	var vaNested = [];
	var voNestedSeen = {};
	paRows.forEach(function(poRow) {
		if (!isPlainObject(poRow)) {
			return;
		}
		Object.keys(poRow).forEach(function(psKey) {
			var pvValue = poRow[psKey];
			if (isArray(pvValue) || isPlainObject(pvValue)) {
				var voNested = voNestedSeen[psKey];
				if (voNested == null) {
					voNested = {
						name : psKey,
						kind : isArray(pvValue) ? "array" : "object",
						values : []
					};
					voNestedSeen[psKey] = voNested;
					vaNested.push(voNested);
				}
				if (isArray(pvValue)) {
					voNested.kind = "array";
					voNested.values = voNested.values.concat(pvValue);
				} else {
					voNested.values.push(pvValue);
				}
				return;
			}
			var voColumn = voIndex[psKey];
			if (voColumn == null) {
				voColumn = {
					name : psKey,
					datatype : "string",
					label : psKey,
					type : "string",
					format : null,
					"enum" : null,
					required : false,
					maxLength : null,
					readOnly : false,
					seen : {},
					sample : null
				};
				voIndex[psKey] = voColumn;
				vaColumns.push(voColumn);
			}
			var vsType = valueType(pvValue);
			if (vsType != null) {
				voColumn.seen[vsType] = true;
				if (voColumn.sample == null) {
					voColumn.sample = pvValue;
				}
			}
		});
	});
	vaColumns.forEach(function(poColumn) {
		var voSeen = poColumn.seen;
		var pvSample = poColumn.sample;
		delete poColumn.seen;
		delete poColumn.sample;
		if (voSeen.string) {
			poColumn.type = "string";
		} else if (voSeen.number) {
			poColumn.type = "number";
			poColumn.datatype = "decimal";
		} else if (voSeen.integer) {
			poColumn.type = "integer";
			poColumn.datatype = "number";
		} else if (voSeen.boolean) {
			poColumn.type = "boolean";
		}
		if (poColumn.type == "string" && typeof pvSample == "string") {
			// 날짜로 보이는 값(2026-07-22 · 20260722 + 이름이 DT/DATE/YMD 로 끝남) → 날짜 입력
			if (/^\d{4}-\d{2}-\d{2}/.test(pvSample) || (/^\d{8}$/.test(pvSample) && /(dt|date|ymd)$/i.test(poColumn.name))) {
				poColumn.format = "date";
			} else if (pvSample.length > 200) {
				poColumn.maxLength = pvSample.length; // 긴 글 → 텍스트에리어
			}
		}
	});
	return {
		columns : vaColumns,
		nested : vaNested
	};
}

/** DataMap 컬럼이 대부분 페이지/부가 정보 이름이면 true(캔버스에 폼으로 놓지 않는다). */
function isInfoMap(paColumns) {
	if (paColumns.length == 0) {
		return false;
	}
	var vnHit = paColumns.filter(function(poColumn) {
		return INFO_COLUMN.test(poColumn.name);
	}).length;
	return vnHit / paColumns.length >= 0.6;
}

/**
 * 응답 샘플 JSON 을 DataSet/DataMap 항목으로 정리한다. analyze() 와 같은 모양을 돌려주어 화면(리소스 콤보 · 목록 상자)이 그대로 쓴다.
 * 항목 = { key, label, tags, deprecated, role, sample:true, id, kind:"dataset"|"datamap", jsonKey, path, columns, rows, notes }
 */
function analyzeSample(pvJson) {
	var vaEntries = [];
	var vaWarnings = [];
	var vaScalarKeys = [];
	var voScalars = {};

	/**
	 * 값 하나(배열 · 객체)를 항목으로 만들고, 그 안의 배열/객체는 재귀로 자식 항목을 만든다(계층형 JSON).
	 *   객체 → DataMap · 객체 배열 → DataSet · 배열 행 안의 배열 → 모든 행의 것을 이어 붙인 DataSet · 배열 행 안의 객체 → 행마다 하나씩 모은 DataSet
	 * 항목 순서는 상위 → 자식(깊이 우선)이라 JSON 을 읽는 순서와 같다.
	 */
	function addEntry(psKey, psPath, pvValue, pnDepth, psParent) {
		var voEntry = null;
		var voFlat;
		var vaNotes = [];
		if (isArray(pvValue)) {
			var vaRows = pvValue.filter(isPlainObject);
			if (vaRows.length == 0 && pvValue.length > 0) {
				// 스칼라 배열(["a","b"]) → 컬럼 하나(value)
				voFlat = sampleColumns(pvValue.map(function(pvEach) {
					return {
						value : pvEach
					};
				}));
				vaNotes.push(psPath + " 은 스칼라 배열이라 컬럼 하나(value)로 옮겼습니다.");
			} else {
				voFlat = sampleColumns(vaRows);
				if (pvValue.length == 0) {
					vaNotes.push(psPath + " 배열이 비어 있어 컬럼을 알 수 없습니다(샘플에 행을 하나 넣어 주세요).");
				}
			}
			voEntry = {
				kind : "dataset",
				id : sampleId(psKey, "ds"),
				jsonKey : psKey,
				path : psPath,
				parent : psParent || null,
				columns : voFlat.columns,
				rows : pvValue.length,
				notes : vaNotes,
				role : "table"
			};
			vaEntries.push(voEntry);
		} else if (isPlainObject(pvValue)) {
			voFlat = sampleColumns([pvValue]);
			if (voFlat.columns.length > 0) {
				voEntry = {
					kind : "datamap",
					id : sampleId(psKey, "dm"),
					jsonKey : psKey,
					path : psPath,
					parent : psParent || null,
					columns : voFlat.columns,
					rows : null,
					notes : vaNotes,
					role : isInfoMap(voFlat.columns) ? "info" : "form"
				};
				vaEntries.push(voEntry);
			} else if (voFlat.nested.length == 0) {
				vaWarnings.push(psPath + " 은 빈 객체라 DataMap 을 만들지 않았습니다.");
			}
			// 스칼라가 없는 래퍼({data:{content:[…]}})는 DataMap 이 되지 않고 안의 것만 항목이 된다.
		} else {
			return;
		}

		// ── 자식 : 중첩 배열/객체(계층형 JSON). 상위 항목 다음에 온다.
		voFlat.nested.forEach(function(poNested) {
			var vsChildPath = psPath + "." + poNested.name;
			if (pnDepth >= MAX_DEPTH) {
				(voEntry != null ? vaNotes : vaWarnings).push(vsChildPath + " 은 너무 깊어(" + MAX_DEPTH + "단계) 옮기지 않았습니다.");
				return;
			}
			var vbFromRows = voEntry != null && voEntry.kind == "dataset";
			var pvChild;
			var vsHow = "";
			if (poNested.kind == "array") {
				pvChild = poNested.values; // 배열(여러 행에 있었으면 이어 붙인 것)
				if (vbFromRows) {
					vsHow = "상위 " + psPath + " 모든 행의 '" + poNested.name + "' 배열을 이어 붙였습니다";
				}
			} else if (vbFromRows) {
				pvChild = poNested.values; // 행마다 하나씩 있던 객체 → 행 수만큼의 DataSet
				vsHow = "상위 " + psPath + " 의 행마다 하나씩 있던 객체 '" + poNested.name + "' 을 행으로 모았습니다";
			} else {
				pvChild = poNested.values[0]; // 객체 안의 객체 하나 → DataMap
			}
			var vnBefore = vaEntries.length;
			addEntry(poNested.name, vsChildPath, pvChild, pnDepth + 1, psPath);
			if (vsHow && vaEntries.length > vnBefore) {
				vaEntries[vnBefore].notes.push(vsChildPath + " : " + vsHow + " — 어느 상위 행의 것인지 구분할 키 컬럼이 없으면 넣어 주세요.");
			}
		});
	}

	if (isArray(pvJson)) {
		addEntry("list", "$", pvJson, 1, null);
	} else {
		Object.keys(pvJson).forEach(function(psKey) {
			var pvValue = pvJson[psKey];
			if (isArray(pvValue) || isPlainObject(pvValue)) {
				addEntry(psKey, psKey, pvValue, 1, null);
			} else {
				vaScalarKeys.push(psKey);
				voScalars[psKey] = pvValue;
			}
		});
		if (vaScalarKeys.length > 0) {
			var voResultFlat = sampleColumns([voScalars]);
			vaEntries.push({
				kind : "datamap",
				id : "dmResult",
				jsonKey : "",
				path : "(최상위 " + vaScalarKeys.join(" · ") + ")",
				columns : voResultFlat.columns,
				rows : null,
				notes : ["최상위 스칼라 값(" + vaScalarKeys.join(", ") + ")은 DataMap dmResult 로 모았습니다."],
				role : isInfoMap(voResultFlat.columns) ? "info" : "form"
			});
		}
	}
	// 같은 id 가 두 번 나오면(data.content 와 content) 번호를 붙인다.
	var voTaken = {};
	vaEntries.forEach(function(poEntry, pnIdx) {
		var vsBase = poEntry.id;
		var vnSeq = 1;
		while (voTaken[poEntry.id]) {
			vnSeq++;
			poEntry.id = vsBase + vnSeq;
		}
		voTaken[poEntry.id] = true;
		poEntry.key = poEntry.path;
		poEntry.tags = ["응답 샘플"];
		poEntry.deprecated = false;
		poEntry.sample = true;
		poEntry.label = poEntry.id + " ← " + poEntry.path + "  " + (poEntry.kind == "dataset" ? "DataSet" : "DataMap")
				+ " (" + poEntry.columns.length + " 컬럼" + (poEntry.rows != null ? " · " + poEntry.rows + " 행" : "") + ") [" + ROLE_LABEL[poEntry.role] + "]";
	});
	if (vaEntries.length == 0) {
		vaWarnings.push("배열이나 객체 값을 가진 키가 없습니다. {dsList:[{…}], dmPageInfo:{…}} 처럼 실제 응답 JSON 을 넣어 주세요.");
	}
	return {
		title : "",
		version : "",
		kind : "sample",
		server : null,
		tags : ["응답 샘플"],
		operations : vaEntries,
		schemaCount : 0,
		warnings : vaWarnings
	};
}

/* ---------------------------------------------------------------- 3) 데이터 모델 */

function baseName(poOp) {
	if (poOp.operationId) {
		return identifier(pascal(poOp.operationId), "Api");
	}
	return identifier(pascal(poOp.method + " " + poOp.rawPath), "Api");
}

function pathParamsOf(poOp) {
	return poOp.params.filter(function(poParam) {
		return poParam["in"] == "path";
	}).map(function(poParam) {
		return poParam.name;
	});
}

/** 파라미터(query · path · formData) → 컬럼. header · cookie 는 옮기지 않는다. */
function paramColumns(poOp, paNotes) {
	var vaColumns = [];
	poOp.params.forEach(function(poParam) {
		if (poParam["in"] == "header" || poParam["in"] == "cookie") {
			paNotes.push(poOp.key + " 의 " + poParam["in"] + " 파라미터 '" + poParam.name + "' 은 옮기지 않았습니다(Submission requestheader 로 직접 넣으세요).");
			return;
		}
		if (isScalarSchema(poParam.schema) || poParam.schema.type == null) {
			vaColumns.push(makeColumn(poParam.name, poParam.schema, poParam.required));
		} else if (poParam.schema.type == "array") {
			// ?ids=1,2 같은 배열 파라미터는 문자열 컬럼으로
			vaColumns.push(makeColumn(poParam.name, {
				type : "string",
				description : poParam.schema.description || poParam.description
			}, poParam.required));
			paNotes.push(poOp.key + " 의 배열 파라미터 '" + poParam.name + "' 은 문자열 컬럼으로 옮겼습니다.");
		} else if (isObjectSchema(poParam.schema)) {
			// 객체 파라미터(Spring @ModelAttribute 등)는 속성을 펼친다.
			var voFlat = columnsOf(poParam.schema, poOp.key + " 파라미터 '" + poParam.name + "'");
			vaColumns = vaColumns.concat(voFlat.columns);
			voFlat.notes.forEach(function(psNote) {
				paNotes.push(psNote);
			});
		}
	});
	return vaColumns;
}

function mergeColumns(paTarget, paColumns) {
	var voHas = {};
	paTarget.forEach(function(poColumn) {
		voHas[poColumn.name] = true;
	});
	paColumns.forEach(function(poColumn) {
		if (!voHas[poColumn.name]) {
			voHas[poColumn.name] = true;
			paTarget.push(poColumn);
		}
	});
}

/** 두 컬럼 목록이 같은 스키마로 볼 만한가(참조 이름이 같거나 이름이 절반 이상 겹침) */
function compatible(poA, poB) {
	if (poA.schemaName && poB.schemaName && poA.schemaName == poB.schemaName) {
		return true;
	}
	var voNames = {};
	poA.columns.forEach(function(poColumn) {
		voNames[poColumn.name] = true;
	});
	var vnHit = 0;
	poB.columns.forEach(function(poColumn) {
		if (voNames[poColumn.name]) {
			vnHit++;
		}
	});
	var vnBase = Math.min(poA.columns.length, poB.columns.length);
	return vnBase > 0 && vnHit / vnBase >= 0.5;
}

/**
 * 응답 샘플 항목(analyzeSample 결과 중 고른 것)을 데이터 모델로 옮긴다. DataSet · DataMap 만 만들고 Submission 은 없다.
 * 화면 흐름 : 첫 DataSet = 목록 그리드, 첫 "폼" DataMap = 상세 폼(그리드 선택 → 선택 행 복사). 페이지/부가 정보 DataMap 은 모델에만.
 */
function mapSampleModel(paEntries, poOpt) {
	var voModel = {
		datasets : [],
		datamaps : [],
		submissions : [],
		flows : {},
		notes : [],
		source : {
			title : poOpt.title || "",
			version : "",
			server : null,
			kind : "sample"
		}
	};
	var voTaken = {};
	var vaKeys = [];
	paEntries.forEach(function(poEntry) {
		var vsId = identifier(poEntry.id, poEntry.kind == "dataset" ? "dsList" : "dmData");
		var vsBase = vsId;
		var vnSeq = 1;
		while (voTaken[vsId]) {
			vnSeq++;
			vsId = vsBase + vnSeq;
		}
		voTaken[vsId] = true;
		var voData = {
			id : vsId,
			kind : poEntry.kind,
			columns : poEntry.columns.map(function(poColumn) {
				var voCopy = {};
				for (var vsKey in poColumn) {
					voCopy[vsKey] = poColumn[vsKey];
				}
				return voCopy;
			}),
			info : "응답 샘플 " + poEntry.path + (poEntry.kind == "dataset" ? " (배열 · " + poEntry.rows + " 행)" : " (객체)") + (poEntry.role == "info" ? " · 페이지/부가 정보" : ""),
			schemaName : null,
			jsonKey : poEntry.jsonKey,
			path : poEntry.path,
			parent : poEntry.parent || null,
			role : poEntry.role
		};
		(poEntry.kind == "dataset" ? voModel.datasets : voModel.datamaps).push(voData);
		(poEntry.notes || []).forEach(function(psNote) {
			voModel.notes.push(psNote);
		});
		if (poEntry.jsonKey) {
			vaKeys.push(poEntry.jsonKey);
		}
	});
	var voFirstSet = voModel.datasets[0] || null;
	var voFirstForm = voModel.datamaps.filter(function(poMap) {
		return poMap.role == "form";
	})[0] || null;
	if (voFirstSet != null) {
		voModel.flows.list = {
			ds : voFirstSet.id,
			sub : null // 응답 샘플에는 API 가 없다. 조회 버튼은 바인딩 없이 놓인다.
		};
	}
	if (voFirstForm != null) {
		// "그리드 선택 → 선택 행을 폼에 복사" 는 두 쪽에 같은 이름의 컬럼이 있을 때만 뜻이 있다(계층형 샘플의 계좌 목록 ↔ 고객 폼처럼 무관하면 만들지 않는다).
		var vbShares = voFirstSet == null || voFirstForm.columns.some(function(poColumn) {
			return voFirstSet.columns.some(function(poOther) {
				return poOther.name == poColumn.name;
			});
		});
		if (vbShares) {
			voModel.flows.form = {
				dm : voFirstForm.id
			};
		} else {
			voModel.notes.push("그리드(" + voFirstSet.id + ")와 폼(" + voFirstForm.id + ")에 같은 이름의 컬럼이 없어 '그리드 선택 → 폼 복사' 핸들러는 만들지 않았습니다.");
		}
	}
	voModel.notes.push("응답 샘플에는 API 주소·메서드가 없어 Submission 은 만들지 않았습니다. 스튜디오에서 Submission 을 만들고 responsedata 의 alias 를 JSON 키"
			+ (vaKeys.length > 0 ? "(" + vaKeys.join(", ") + ")" : "") + "로 두거나, Swagger 명세가 있으면 그것을 넣으세요.");
	var vaNested = voModel.datasets.concat(voModel.datamaps).filter(function(poData) {
		return poData.parent != null;
	});
	if (vaNested.length > 0) {
		voModel.notes.push("중첩 데이터(" + vaNested.map(function(poData) {
			return poData.id + " ← " + poData.path;
		}).join(", ") + ")는 응답 최상위가 아니라 런타임이 alias 로 바로 받지 못할 수 있습니다 — submit-done 에서 경로대로 꺼내 넣거나 서버 응답을 평평하게 하세요.");
	}
	return voModel;
}

/**
 * 고른 API 들을 eXBuilder6 데이터 모델로 옮긴다. 응답 샘플 항목(sample = true)이면 mapSampleModel().
 * @param {Object[]} paOps analyze().operations 중 고른 것
 * @param {{title:String, server:Object}} poOpt 명세 정보(참고 표시용)
 * @return {{datasets:Object[], datamaps:Object[], submissions:Object[], flows:Object, notes:String[], source:Object}}
 *   dataset/datamap = { id, columns:[{name, datatype, label, …}], info }
 *   submission      = { id, action, method, mediatype, request:[{dataid, alias, payload}], response:[{dataid, alias}], pathParams, key, summary, role }
 *   flows           = 화면 흐름(.js 핸들러 생성용) { search:{dm}, list:{ds, sub}, detail:{sub, keyDm, keyColumns}, form:{dm}, save:[{sub, label}], remove:{sub, keyDm, keyColumns} }
 */
exports.mapModel = function(paOps, poOpt) {
	poOpt = poOpt || {};
	if (paOps.length > 0 && paOps[0].sample === true) {
		return mapSampleModel(paOps, poOpt);
	}
	var voModel = {
		datasets : [],
		datamaps : [],
		submissions : [],
		flows : {},
		notes : [],
		source : {
			title : poOpt.title || "",
			version : poOpt.version || "",
			server : poOpt.server || null
		}
	};
	var voTaken = {};
	var voRoleCount = {};
	paOps.forEach(function(poOp) {
		voRoleCount[poOp.role] = (voRoleCount[poOp.role] || 0) + 1;
	});

	function uniqueId(psWanted) {
		var vsId = identifier(psWanted, "data");
		var vsBase = vsId;
		var vnSeq = 1;
		while (voTaken[vsId]) {
			vnSeq++;
			vsId = vsBase + vnSeq;
		}
		voTaken[vsId] = true;
		return vsId;
	}

	function friendlyId(poOp, psKind, psPrefix) {
		var voIds = ROLE_IDS[poOp.role];
		if (voIds != null && voIds[psKind] != null && voRoleCount[poOp.role] == 1) {
			return voIds[psKind];
		}
		return psPrefix + baseName(poOp);
	}

	function findData(psId) {
		var vaAll = voModel.datasets.concat(voModel.datamaps);
		for (var i = 0; i < vaAll.length; i++) {
			if (vaAll[i].id == psId) {
				return vaAll[i];
			}
		}
		return null;
	}

	function addDataMap(psId, paColumns, psInfo, psSchemaName) {
		var voExisting = findData(psId);
		if (voExisting != null) {
			mergeColumns(voExisting.columns, paColumns);
			if (psInfo && voExisting.info.indexOf(psInfo) < 0) {
				voExisting.info += " · " + psInfo;
			}
			return voExisting;
		}
		voTaken[psId] = true;
		var voMap = {
			id : psId,
			kind : "datamap",
			columns : paColumns.slice(),
			info : psInfo || "",
			schemaName : psSchemaName || null
		};
		voModel.datamaps.push(voMap);
		return voMap;
	}

	function addDataSet(psId, paColumns, psInfo, psSchemaName) {
		voTaken[psId] = true;
		var voSet = {
			id : psId,
			kind : "dataset",
			columns : paColumns.slice(),
			info : psInfo || "",
			schemaName : psSchemaName || null
		};
		voModel.datasets.push(voSet);
		return voSet;
	}

	// ── 상세 응답 · 등록/수정 본문이 같은 스키마면 DataMap 하나(dmDetail)를 함께 쓴다.
	var vaDetailCandidates = [];
	paOps.forEach(function(poOp) {
		var voSchema = null;
		var vsWhere = "";
		if (poOp.role == "detail" && poOp.response != null && isObjectSchema(poOp.response.schema)) {
			voSchema = poOp.response.schema;
			vsWhere = poOp.key + " 응답";
		} else if ((poOp.role == "create" || poOp.role == "update") && poOp.body != null && isObjectSchema(poOp.body.schema)) {
			voSchema = poOp.body.schema;
			vsWhere = poOp.key + " 요청 본문";
		}
		if (voSchema != null) {
			var voFlat = columnsOf(voSchema, vsWhere);
			voFlat.notes.forEach(function(psNote) {
				voModel.notes.push(psNote);
			});
			vaDetailCandidates.push({
				op : poOp,
				columns : voFlat.columns,
				schemaName : voSchema["x-name"] || null,
				where : vsWhere
			});
		}
	});
	var voDetailMap = null; // 공유 상세 DataMap
	var voDetailOf = {};    // op.key → 그 API 가 쓰는 상세 DataMap
	if (vaDetailCandidates.length > 0) {
		var voFirst = vaDetailCandidates[0];
		var vaShared = [voFirst];
		var vaOwn = [];
		for (var i = 1; i < vaDetailCandidates.length; i++) {
			(compatible(voFirst, vaDetailCandidates[i]) ? vaShared : vaOwn).push(vaDetailCandidates[i]);
		}
		var vsDetailId = vaShared.length > 1 || (ROLE_IDS[voFirst.op.role] && voRoleCount[voFirst.op.role] == 1) ? "dmDetail" : "dm" + baseName(voFirst.op);
		var vaUnion = [];
		var vaInfos = [];
		vaShared.forEach(function(poEach) {
			mergeColumns(vaUnion, poEach.columns);
			vaInfos.push(poEach.where);
		});
		voDetailMap = addDataMap(uniqueId(vsDetailId), vaUnion, vaInfos.join(" · "), voFirst.schemaName);
		vaShared.forEach(function(poEach) {
			voDetailOf[poEach.op.key] = voDetailMap;
		});
		vaOwn.forEach(function(poEach) {
			voDetailOf[poEach.op.key] = addDataMap(uniqueId("dm" + baseName(poEach.op)), poEach.columns, poEach.where, poEach.schemaName);
			voModel.notes.push(poEach.op.key + " 의 스키마가 다른 API 와 달라 별도 DataMap(" + voDetailOf[poEach.op.key].id + ")으로 두었습니다.");
		});
	}

	// ── API 하나 = Submission 하나
	paOps.forEach(function(poOp) {
		var vaPathParams = pathParamsOf(poOp);
		var vaParamCols = paramColumns(poOp, voModel.notes);
		var vsSubId = uniqueId(friendlyId(poOp, "sub", "sub"));
		var voSub = {
			id : vsSubId,
			key : poOp.key,
			role : poOp.role,
			summary : poOp.summary,
			action : poOp.path,
			method : poOp.method,
			mediatype : "application/x-www-form-urlencoded",
			request : [],
			response : [],
			pathParams : vaPathParams,
			requestDataId : null,
			responseDataId : null
		};
		var vbJsonBody = poOp.body != null && !poOp.formData && (poOp.body.mediaType == null || /json/i.test(poOp.body.mediaType));

		// 요청
		var voDetail = voDetailOf[poOp.key] || null;
		if (voDetail != null && (poOp.role == "create" || poOp.role == "update")) {
			// 본문 = 상세 DataMap. 경로/쿼리 파라미터(예: PUT /emps/{id})가 본문에 없으면 컬럼으로 보탠다.
			mergeColumns(voDetail.columns, vaParamCols);
			voSub.request.push({
				dataid : voDetail.id,
				alias : "",
				payload : "all"
			});
			voSub.requestDataId = voDetail.id;
			voSub.mediatype = vbJsonBody ? "application/json" : "application/x-www-form-urlencoded";
		} else if (poOp.body != null && isArrayOfObjects(poOp.body.schema)) {
			// 본문이 객체 배열 : 요청 DataSet
			var voReqFlat = columnsOf(poOp.body.schema.items, poOp.key + " 요청 본문(배열)");
			voReqFlat.notes.forEach(function(psNote) {
				voModel.notes.push(psNote);
			});
			var voReqSet = addDataSet(uniqueId("ds" + baseName(poOp) + "Req"), voReqFlat.columns, poOp.key + " 요청 본문(객체 배열)", poOp.body.schema.items["x-name"]);
			voSub.request.push({
				dataid : voReqSet.id,
				alias : "",
				payload : "all"
			});
			voSub.requestDataId = voReqSet.id;
			voSub.mediatype = "application/json";
			if (vaParamCols.length > 0) {
				var voExtraMap = addDataMap(uniqueId("dm" + baseName(poOp)), vaParamCols, poOp.key + " 파라미터");
				voSub.request.push({
					dataid : voExtraMap.id,
					alias : "",
					payload : "all"
				});
			}
		} else {
			var vaReqCols = vaParamCols.slice();
			var vsReqInfo = poOp.key + " 요청";
			if (poOp.body != null && isObjectSchema(poOp.body.schema)) {
				var voBodyFlat = columnsOf(poOp.body.schema, poOp.key + " 요청 본문");
				voBodyFlat.notes.forEach(function(psNote) {
					voModel.notes.push(psNote);
				});
				mergeColumns(vaReqCols, voBodyFlat.columns);
				voSub.mediatype = vbJsonBody ? "application/json" : "application/x-www-form-urlencoded";
				var vbHasQuery = poOp.params.some(function(poParam) {
					return poParam["in"] == "query" || poParam["in"] == "formData";
				});
				if (vbHasQuery && vbJsonBody) {
					voModel.notes.push(poOp.key + " 은 JSON 본문과 쿼리 파라미터를 함께 씁니다 — 한 DataMap 에 모았으니 전송 방식을 확인하세요(경로 변수는 .js 가 치환합니다).");
				}
			}
			if (vaReqCols.length > 0) {
				var vsReqId = friendlyId(poOp, poOp.role == "detail" || poOp.role == "remove" ? "key" : "req", "dm");
				if (vsReqId == "dmDetail" && voDetail == null) {
					vsReqId = "dm" + baseName(poOp);
				}
				var voReqMap = addDataMap(uniqueId(vsReqId), vaReqCols, vsReqInfo);
				voSub.request.push({
					dataid : voReqMap.id,
					alias : "",
					payload : "all"
				});
				voSub.requestDataId = voReqMap.id;
			}
		}
		if (poOp.formData) {
			voSub.mediatype = "application/x-www-form-urlencoded";
		}

		// 응답
		if (poOp.list != null) {
			var voListFlat = columnsOf(poOp.list.items, poOp.key + " 응답 목록");
			voListFlat.notes.forEach(function(psNote) {
				voModel.notes.push(psNote);
			});
			var vsInfo = poOp.key + " 응답 목록" + (poOp.list.alias ? " (alias " + poOp.list.alias + ")" : "");
			var voListSet = addDataSet(uniqueId(friendlyId(poOp, "res", "ds")), voListFlat.columns, vsInfo, poOp.list.items["x-name"]);
			voSub.response.push({
				dataid : voListSet.id,
				alias : poOp.list.alias
			});
			voSub.responseDataId = voListSet.id;
			if (poOp.list.path.length > 1) {
				voModel.notes.push(poOp.key + " 의 목록이 응답 안에 중첩(" + poOp.list.alias + ")되어 있습니다 — Submission 응답 alias 가 그대로 맞지 않으면 submit-done 에서 직접 넣으세요.");
			}
		} else if (poOp.response != null && isObjectSchema(poOp.response.schema)) {
			if (poOp.role == "detail" && voDetail != null) {
				voSub.response.push({
					dataid : voDetail.id,
					alias : ""
				});
				voSub.responseDataId = voDetail.id;
			} else if ((poOp.role == "create" || poOp.role == "update") && voDetail != null && poOp.response.schema["x-name"] != null && poOp.response.schema["x-name"] == voDetail.schemaName) {
				voSub.response.push({
					dataid : voDetail.id,
					alias : ""
				});
				voSub.responseDataId = voDetail.id;
			} else {
				var voResFlat = columnsOf(poOp.response.schema, poOp.key + " 응답");
				if (voResFlat.columns.length > 0) {
					var voResMap = addDataMap(uniqueId("dm" + baseName(poOp) + "Res"), voResFlat.columns, poOp.key + " 응답 객체", poOp.response.schema["x-name"]);
					voSub.response.push({
						dataid : voResMap.id,
						alias : ""
					});
					voSub.responseDataId = voResMap.id;
				}
			}
		}

		voModel.submissions.push(voSub);
	});

	// ── 화면 흐름
	var voFlows = voModel.flows;
	voModel.submissions.forEach(function(poSub) {
		var voOp = null;
		for (var i = 0; i < paOps.length; i++) {
			if (paOps[i].key == poSub.key) {
				voOp = paOps[i];
			}
		}
		if (poSub.role == "list" && voFlows.list == null) {
			voFlows.list = {
				sub : poSub.id,
				ds : poSub.responseDataId
			};
			if (poSub.requestDataId != null) {
				voFlows.search = {
					dm : poSub.requestDataId
				};
			}
		} else if (poSub.role == "detail" && voFlows.detail == null) {
			voFlows.detail = {
				sub : poSub.id,
				keyDm : poSub.requestDataId,
				keyColumns : poSub.pathParams.length > 0 ? poSub.pathParams : (poSub.requestDataId == null ? [] : findData(poSub.requestDataId).columns.map(function(poColumn) {
					return poColumn.name;
				})),
				dm : poSub.responseDataId
			};
		} else if (poSub.role == "create" || poSub.role == "update") {
			voFlows.save = voFlows.save || [];
			voFlows.save.push({
				sub : poSub.id,
				role : poSub.role,
				label : voRoleCount.create > 0 && voRoleCount.update > 0 ? (poSub.role == "create" ? "등록" : "저장") : "저장"
			});
		} else if (poSub.role == "remove" && voFlows.remove == null) {
			voFlows.remove = {
				sub : poSub.id,
				keyDm : poSub.requestDataId,
				keyColumns : poSub.pathParams.length > 0 ? poSub.pathParams : (poSub.requestDataId == null ? [] : findData(poSub.requestDataId).columns.map(function(poColumn) {
					return poColumn.name;
				}))
			};
		}
	});
	if (voDetailMap != null) {
		voFlows.form = {
			dm : voDetailMap.id
		};
	} else if (voFlows.detail != null && voFlows.detail.dm != null) {
		voFlows.form = {
			dm : voFlows.detail.dm
		};
	}
	return voModel;
};

/* ---------------------------------------------------------------- 바인딩 표기 */

/**
 * "ds:dsList" · "dm:dmDetail.empNo" · "sub:subList" · "clear:dmSearch" 를 해석한다.
 * @return {{kind:String, dataId:String, column:String}} 형식이 아니면 null
 */
exports.parseBind = function(psBind) {
	var vsBind = trim(psBind);
	if (vsBind === "") {
		return null;
	}
	var vaMatch = /^(ds|dm|sub|clear)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)(?:\.([A-Za-z_][A-Za-z0-9_.-]*))?$/.exec(vsBind);
	if (vaMatch == null) {
		return null;
	}
	if (vaMatch[1] == "dm" && vaMatch[3] == null) {
		return null; // 데이터맵은 컬럼까지 있어야 한다.
	}
	return {
		kind : vaMatch[1],
		dataId : vaMatch[2],
		column : vaMatch[3] || null
	};
};

exports.BIND_HINT = "ds:데이터셋 · dm:데이터맵.컬럼 · sub:서브미션 · clear:데이터";

/* ---------------------------------------------------------------- 4) 캔버스 뼈대 */

function findModelData(poModel, psId) {
	var vaAll = (poModel.datasets || []).concat(poModel.datamaps || []);
	for (var i = 0; i < vaAll.length; i++) {
		if (vaAll[i].id == psId) {
			return vaAll[i];
		}
	}
	return null;
}

/** 컬럼 → 입력 컨트롤 유형(enum → 콤보, 정수/실수 → 숫자, 날짜 → 날짜, 긴 글 → 텍스트에리어) */
function inputTypeOf(poColumn) {
	if (poColumn["enum"] != null && poColumn["enum"].length > 0) {
		return "combobox";
	}
	if (poColumn.type == "boolean") {
		return "checkbox";
	}
	if (poColumn.type == "integer" || poColumn.type == "number") {
		return "numbereditor";
	}
	if (poColumn.format == "date" || poColumn.format == "date-time" || /(^|_)(ymd|date|dt)$/i.test(poColumn.name)) {
		return "dateinput";
	}
	if ((poColumn.maxLength != null && poColumn.maxLength > 200) || /(desc|memo|content|remark|note|comment|cn)$/i.test(poColumn.name)) {
		return "textarea";
	}
	return "inputbox";
}

function inputTextOf(psType, poColumn) {
	if (psType == "combobox") {
		return poColumn["enum"].join(",");
	}
	if (psType == "checkbox") {
		return poColumn.label;
	}
	return "";
}

/** 컨트롤 id 접두(controlRegistry 의 idPrefix 와 같다) — 뼈대 컨트롤에 읽기 쉬운 id 를 준다(ipbEmpNm · btnSearch · grdList …). */
var ID_PREFIX = {
	output : "opt",
	inputbox : "ipb",
	combobox : "cmb",
	dateinput : "dti",
	numbereditor : "nbe",
	checkbox : "cbx",
	textarea : "txa",
	grid : "grd",
	button : "btn"
};

/** 뼈대 한 벌 안에서 id 가 겹치지 않게 한다(조회 조건과 폼에 같은 컬럼이 있을 수 있다). */
function makeIdPool() {
	var voUsed = {};
	return function(psWanted) {
		var vsId = identifier(psWanted, "ctl");
		var vsBase = vsId;
		var vnSeq = 1;
		while (voUsed[vsId]) {
			vnSeq++;
			vsId = vsBase + vnSeq;
		}
		voUsed[vsId] = true;
		return vsId;
	};
}

function item(psType, psText, pnX, pnY, pnWidth, pnHeight, psBind, psId) {
	return {
		type : psType,
		id : psId || null,
		text : psText,
		x : Math.round(pnX),
		y : Math.round(pnY),
		width : Math.max(40, Math.round(pnWidth)),
		height : Math.max(LAYOUT.rowHeight, Math.round(pnHeight)),
		bind : psBind || ""
	};
}

function rightButtons(paOut, pnRight, pnY, paButtons, pfId) {
	var vnX = pnRight - paButtons.length * LAYOUT.buttonWidth - (paButtons.length - 1) * LAYOUT.buttonSpacing;
	paButtons.forEach(function(poBtn, pnIdx) {
		var voItem = item("button", poBtn.text, vnX + pnIdx * (LAYOUT.buttonWidth + LAYOUT.buttonSpacing), pnY, LAYOUT.buttonWidth, LAYOUT.rowHeight, poBtn.bind, poBtn.id ? pfId(poBtn.id) : null);
		if (poBtn.style) {
			voItem.style = poBtn.style;
		}
		paOut.push(voItem);
	});
}

/**
 * 라벨·입력 쌍을 격자로 놓는다.
 * @param {String} psIdScope 입력 id 에 끼우는 구분(조회 조건 "Srch" · 폼 "") → ipbSrchDeptCd · ipbDeptCd
 * @return {Number} 쓴 높이
 */
function placeFields(paOut, paColumns, psDataMapId, pnX, pnY, pnWidth, pnPairs, pbRequiredMark, pfId, psIdScope) {
	var vnPairs = Math.max(1, pnPairs);
	var vnColWidth = Math.floor((pnWidth - (vnPairs - 1) * LAYOUT.gap) / vnPairs);
	var vnLabel = Math.min(90, Math.max(60, Math.floor(vnColWidth * 0.3)));
	var vnRows = 0;
	var vnPair = 0;
	paColumns.forEach(function(poColumn) {
		var vsType = inputTypeOf(poColumn);
		var vbWide = vsType == "textarea";
		if (vbWide && vnPair > 0) {
			vnRows++;
			vnPair = 0;
		}
		var vnLeft = pnX + vnPair * (vnColWidth + LAYOUT.gap);
		var vnTop = pnY + vnRows * LAYOUT.rowPitch;
		var vsLabel = poColumn.label + (pbRequiredMark && poColumn.required ? " *" : "");
		paOut.push(item("output", vsLabel, vnLeft, vnTop, vnLabel, LAYOUT.rowHeight));
		var vnInputWidth = (vbWide ? pnWidth : vnColWidth) - vnLabel - 10;
		var vnHeight = vbWide ? LAYOUT.rowHeight * 2 + 10 : LAYOUT.rowHeight;
		var vsId = pfId != null ? pfId((ID_PREFIX[vsType] || "ctl") + (psIdScope || "") + pascal(poColumn.name)) : null;
		paOut.push(item(vsType, inputTextOf(vsType, poColumn), vnLeft + vnLabel + 10, vnTop, vnInputWidth, vnHeight, "dm:" + psDataMapId + "." + poColumn.name, vsId));
		if (vbWide) {
			vnRows += 2;
			vnPair = 0;
			return;
		}
		vnPair++;
		if (vnPair >= vnPairs) {
			vnRows++;
			vnPair = 0;
		}
	});
	if (vnPair > 0) {
		vnRows++;
	}
	return vnRows == 0 ? 0 : vnRows * LAYOUT.rowPitch - (LAYOUT.rowPitch - LAYOUT.rowHeight);
}

/**
 * 모델에 맞는 캔버스 항목을 만든다. 조회 조건(목록 API 요청) → 그리드(목록 응답) + 폼(상세 DataMap) → 하단 버튼.
 * 좌표는 templatePlanner.planByRule 이 같은 구조로 읽도록 미리 배치(skeleton)와 같은 규칙을 따른다.
 * @param {Object} poModel mapModel() 결과
 * @param {{width:Number, height:Number}} poCanvas 캔버스 크기
 * @return {{items:Object[], pattern:String, title:String, notes:String[]}}
 */
exports.skeleton = function(poModel, poCanvas) {
	var vaOut = [];
	var vaNotes = [];
	var voFlows = poModel.flows || {};
	var vnWidth = Math.max(LAYOUT.minWidth, Math.round((poCanvas && poCanvas.width) || 800));
	var vnHeight = Math.max(LAYOUT.minHeight, Math.round((poCanvas && poCanvas.height) || 600));
	var vnLeft = LAYOUT.margin;
	var vnRight = vnWidth - LAYOUT.margin;
	var vnFull = vnRight - vnLeft;
	var vnFooterTop = vnHeight - LAYOUT.margin - LAYOUT.rowHeight;
	var vnY = LAYOUT.margin;

	var voSearchMap = voFlows.search != null ? findModelData(poModel, voFlows.search.dm) : null;
	var voListSet = voFlows.list != null ? findModelData(poModel, voFlows.list.ds) : null;
	var voFormMap = voFlows.form != null ? findModelData(poModel, voFlows.form.dm) : null;
	var vsTitle = poModel.source && poModel.source.title ? poModel.source.title : "";
	var fId = makeIdPool();

	// ── 조회 조건 : 목록 API 의 요청 컬럼(최대 8개) + 조회 · 초기화
	var vbSearch = voSearchMap != null && voSearchMap.columns.length > 0 && voFlows.list != null;
	if (voFlows.list != null) {
		var vaSearchButtons = [{
			text : "조회",
			id : "btnSearch",
			bind : voFlows.list.sub ? "sub:" + voFlows.list.sub : "",
			style : "primary"
		}];
		if (vbSearch) {
			vaSearchButtons.push({
				text : "초기화",
				id : "btnReset",
				bind : "clear:" + voSearchMap.id,
				style : "secondary"
			});
		}
		var vnButtonArea = vaSearchButtons.length * LAYOUT.buttonWidth + (vaSearchButtons.length - 1) * LAYOUT.buttonSpacing;
		// 페이징 파라미터(page · size …)는 DataMap 에만 두고 조회 조건 줄에는 놓지 않는다.
		var vaVisibleCols = vbSearch ? voSearchMap.columns.filter(function(poColumn) {
			return !PAGING_PARAM.test(poColumn.name);
		}) : [];
		if (vbSearch && vaVisibleCols.length < voSearchMap.columns.length) {
			vaNotes.push("페이징 파라미터(" + voSearchMap.columns.filter(function(poColumn) {
				return PAGING_PARAM.test(poColumn.name);
			}).map(function(poColumn) {
				return poColumn.name;
			}).join(", ") + ")는 " + voSearchMap.id + " 컬럼에만 두고 조회 조건에는 놓지 않았습니다.");
		}
		var vaSearchCols = vaVisibleCols.slice(0, LAYOUT.maxSearchFields);
		if (vaVisibleCols.length > LAYOUT.maxSearchFields) {
			vaNotes.push("조회 조건이 " + vaVisibleCols.length + "개라 앞 " + LAYOUT.maxSearchFields + "개만 캔버스에 놓았습니다(DataMap 컬럼은 모두 있습니다).");
		}
		var vnPairs = Math.max(1, Math.min(3, vaSearchCols.length));
		var vnFieldWidth = vnFull - vnButtonArea - LAYOUT.gap;
		var vnUsed = 0;
		if (vaSearchCols.length > 0) {
			vnUsed = placeFields(vaOut, vaSearchCols.map(function(poColumn) {
				// 조회 조건에는 긴 글 입력을 두지 않는다.
				var voCopy = {};
				for (var vsKey in poColumn) {
					voCopy[vsKey] = poColumn[vsKey];
				}
				voCopy.maxLength = null;
				return voCopy;
			}), voSearchMap.id, vnLeft, vnY, vnFieldWidth, vnPairs, false, fId, "Srch");
		} else {
			vnUsed = LAYOUT.rowHeight;
			vaNotes.push("목록 API 에 요청 파라미터가 없어 조회 조건 없이 조회 버튼만 두었습니다.");
		}
		rightButtons(vaOut, vnRight, vnY, vaSearchButtons, fId);
		vnY += Math.max(vnUsed, LAYOUT.rowHeight) + LAYOUT.gap;
	}

	// ── 하단 버튼 : 등록/저장 · 삭제 · 닫기
	var vaFooter = [];
	(voFlows.save || []).forEach(function(poSave) {
		vaFooter.push({
			text : poSave.label,
			id : poSave.label == "등록" ? "btnInsert" : "btnSave",
			bind : "sub:" + poSave.sub,
			style : "primary"
		});
	});
	if (voFlows.remove != null) {
		vaFooter.push({
			text : "삭제",
			id : "btnDelete",
			bind : "sub:" + voFlows.remove.sub,
			style : "secondary"
		});
	}
	vaFooter.push({
		text : "닫기",
		id : "btnClose",
		bind : "",
		style : "secondary"
	});

	// ── 데이터 영역
	var vnDataHeight = vnFooterTop - LAYOUT.gap - vnY;
	var vnTitleRow = LAYOUT.rowHeight + LAYOUT.titleGap;
	var vsPattern = "P1-1";
	var vsListTitle = voListSet != null ? (voListSet.info.indexOf("응답") > 0 ? "목록" : "목록") : "목록";
	var vsFormTitle = "상세 정보";
	if (vsTitle) {
		vsListTitle = vsTitle + " 목록";
	}

	var vnFormBottom = 0; // 폼이 캔버스보다 길면 하단 버튼을 그 아래로 내린다(겹치면 규칙 기반 변환이 잘못 읽는다).
	if (voListSet != null && voFormMap != null && voFormMap.columns.length > 0) {
		var vbSideBySide = voFormMap.columns.length <= 8;
		if (vbSideBySide) {
			vsPattern = "P3-2";
			var vnHalf = Math.floor((vnFull - LAYOUT.gap) / 2);
			var vnRightX = vnLeft + vnHalf + LAYOUT.gap;
			vaOut.push(item("output", vsListTitle, vnLeft, vnY, 160, LAYOUT.rowHeight));
			vaOut.push(item("grid", gridHeaders(voListSet), vnLeft, vnY + vnTitleRow, vnHalf, vnDataHeight - vnTitleRow, "ds:" + voListSet.id, fId("grdList")));
			vaOut.push(item("output", vsFormTitle, vnRightX, vnY, 160, LAYOUT.rowHeight));
			var vnFormUsed = placeFields(vaOut, voFormMap.columns, voFormMap.id, vnRightX, vnY + vnTitleRow, vnHalf, 1, true, fId, "");
			vnFormBottom = vnY + vnTitleRow + vnFormUsed;
		} else {
			vsPattern = "P3-1";
			var vnListHeight = Math.floor((vnDataHeight - LAYOUT.gap) * 0.5);
			vaOut.push(item("output", vsListTitle, vnLeft, vnY, 160, LAYOUT.rowHeight));
			vaOut.push(item("grid", gridHeaders(voListSet), vnLeft, vnY + vnTitleRow, vnFull, vnListHeight - vnTitleRow, "ds:" + voListSet.id, fId("grdList")));
			var vnFormTop = vnY + vnListHeight + LAYOUT.gap;
			vaOut.push(item("output", vsFormTitle, vnLeft, vnFormTop, 160, LAYOUT.rowHeight));
			var vnFormUsed2 = placeFields(vaOut, voFormMap.columns, voFormMap.id, vnLeft, vnFormTop + vnTitleRow, vnFull, 2, true, fId, "");
			vnFormBottom = vnFormTop + vnTitleRow + vnFormUsed2;
		}
	} else if (voListSet != null) {
		vsPattern = "P1-1";
		vaOut.push(item("output", vsListTitle, vnLeft, vnY, 160, LAYOUT.rowHeight));
		vaOut.push(item("grid", gridHeaders(voListSet), vnLeft, vnY + vnTitleRow, vnFull, vnDataHeight - vnTitleRow, "ds:" + voListSet.id, fId("grdList")));
	} else if (voFormMap != null && voFormMap.columns.length > 0) {
		vsPattern = "P1-6";
		vaOut.push(item("output", vsFormTitle, vnLeft, vnY, 160, LAYOUT.rowHeight));
		vnFormBottom = vnY + vnTitleRow + placeFields(vaOut, voFormMap.columns, voFormMap.id, vnLeft, vnY + vnTitleRow, vnFull, 2, true, fId, "");
	} else {
		vaNotes.push("목록 응답도 상세/저장 본문도 없어 데이터 영역 없이 버튼만 놓았습니다.");
	}

	if (vnFormBottom + LAYOUT.gap > vnFooterTop) {
		vnFooterTop = vnFormBottom + LAYOUT.gap;
		vaNotes.push("상세 폼이 캔버스 높이를 넘어 하단 버튼을 폼 아래(" + vnFooterTop + "px)로 내렸습니다(캔버스 스크롤).");
	}
	rightButtons(vaOut, vnRight, vnFooterTop, vaFooter, fId);

	return {
		items : vaOut,
		pattern : vsPattern,
		title : vsTitle,
		notes : vaNotes
	};
};

/** 그리드 헤더 글자(쉼표 구분) = 컬럼 라벨. 쉼표가 들어간 라벨은 이름으로 대신한다. */
function gridHeaders(poDataSet) {
	return poDataSet.columns.map(function(poColumn) {
		var vsLabel = poColumn.label.indexOf(",") >= 0 ? poColumn.name : poColumn.label;
		return vsLabel;
	}).join(",");
}

exports.gridHeaders = gridHeaders;

/* ---------------------------------------------------------------- 요약 */

/**
 * 모델을 사람이 읽는 글로 만든다(출력 미리보기 칸).
 * @param {Object} poModel mapModel() 결과
 * @param {Object} poAnalysis analyze() 결과(있으면 머리말에 쓴다)
 */
exports.describe = function(poModel, poAnalysis) {
	var vaLines = [];
	var vbSample = poModel.source != null && poModel.source.kind == "sample";
	if (vbSample) {
		vaLines.push("응답 샘플 JSON → DataSet " + poModel.datasets.length + " · DataMap " + poModel.datamaps.length + "  (Submission 없음 — 응답에는 API 주소·메서드가 없습니다)");
	} else {
		if (poAnalysis != null) {
			vaLines.push("API 분석 : " + (poAnalysis.title || "(제목 없음)") + (poAnalysis.version ? " " + poAnalysis.version : "") + "  (" + poAnalysis.kind + " · API " + poAnalysis.operations.length + "개 · 스키마 " + poAnalysis.schemaCount + "개)");
			if (poAnalysis.server && (poAnalysis.server.origin || poAnalysis.server.path)) {
				vaLines.push("서버 : " + poAnalysis.server.origin + poAnalysis.server.path + "  ※ Submission action 은 경로만 씁니다(같은 서버 배포 기준).");
			}
		}
		vaLines.push("선택한 API " + poModel.submissions.length + "개 → Submission " + poModel.submissions.length + " · DataSet " + poModel.datasets.length + " · DataMap " + poModel.datamaps.length);
	}
	vaLines.push("");
	if (poModel.datasets.length > 0) {
		vaLines.push("[DataSet]");
		poModel.datasets.forEach(function(poSet) {
			vaLines.push("  " + poSet.id + " (" + poSet.columns.length + " 컬럼) ← " + poSet.info);
			vaLines.push("    " + columnLine(poSet.columns));
		});
	}
	if (poModel.datamaps.length > 0) {
		vaLines.push("[DataMap]");
		poModel.datamaps.forEach(function(poMap) {
			vaLines.push("  " + poMap.id + " (" + poMap.columns.length + " 컬럼) ← " + poMap.info);
			vaLines.push("    " + columnLine(poMap.columns));
		});
	}
	if (!vbSample || poModel.submissions.length > 0) {
		vaLines.push("[Submission]");
	}
	poModel.submissions.forEach(function(poSub) {
		var vsReq = poSub.request.map(function(poEach) {
			return poEach.dataid;
		}).join("+") || "(없음)";
		var vsRes = poSub.response.map(function(poEach) {
			return poEach.dataid + (poEach.alias ? "(alias " + poEach.alias + ")" : "");
		}).join("+") || "(없음)";
		vaLines.push("  " + poSub.id + "  " + poSub.method.toUpperCase() + " " + poSub.action + "  [" + ROLE_LABEL[poSub.role] + "]  요청 " + vsReq + " → 응답 " + vsRes
				+ (poSub.pathParams.length > 0 ? "  ※ 경로 변수 {" + poSub.pathParams.join("},{") + "} 는 .js 핸들러가 치환" : ""));
	});
	var voFlows = poModel.flows || {};
	var vaFlow = [];
	if (voFlows.list) {
		vaFlow.push(voFlows.list.sub ? "조회 버튼 → " + voFlows.list.sub + " → " + voFlows.list.ds + " (그리드)" : "그리드 ← " + voFlows.list.ds + " (조회 버튼은 바인딩 없음 — Submission 을 만든 뒤 sub: 로 이으세요)");
	}
	if (voFlows.detail) {
		vaFlow.push("그리드 선택 → " + voFlows.detail.sub + " → " + (voFlows.detail.dm || "") + " (폼)");
	} else if (voFlows.list && voFlows.form) {
		vaFlow.push("그리드 선택 → 선택 행을 " + voFlows.form.dm + " 에 복사 (폼)");
	}
	(voFlows.save || []).forEach(function(poSave) {
		vaFlow.push(poSave.label + " 버튼 → " + poSave.sub + " (" + (voFlows.form ? voFlows.form.dm : "요청 DataMap") + " 전송)");
	});
	if (voFlows.remove) {
		vaFlow.push("삭제 버튼 → " + voFlows.remove.sub);
	}
	if (vaFlow.length > 0) {
		vaLines.push("[화면 흐름 · .js 핸들러]");
		vaFlow.forEach(function(psLine) {
			vaLines.push("  " + psLine);
		});
	}
	if (poModel.notes.length > 0) {
		vaLines.push("[참고]");
		poModel.notes.forEach(function(psNote) {
			vaLines.push("  - " + psNote);
		});
	}
	return vaLines.join("\n");
};

function columnLine(paColumns) {
	return paColumns.map(function(poColumn) {
		return poColumn.name + (poColumn.datatype != "string" ? "(" + poColumn.datatype + ")" : "") + (poColumn.label != poColumn.name ? " " + poColumn.label : "");
	}).join(" · ");
}

/* ---------------------------------------------------------------- 5) URL 에서 받아오기 */

function contextPath() {
	var vsPath = window.location.pathname;
	var vnIdx = vsPath.indexOf("/ui/");
	return vnIdx > 0 ? vsPath.substring(0, vnIdx) : "";
}

var mbProxy = null;

/**
 * 서버 프록시(/canvas/fetchOpenApi.do)가 있는지 확인한다(개발 서버 · Tomcat). 화면이 뜰 때 1회.
 * @param {function(Boolean)} pfDone
 */
exports.probeProxy = function(pfDone) {
	var voXhr = new XMLHttpRequest();
	try {
		voXhr.open("GET", contextPath() + "/canvas/fetchOpenApi.do?probe=1", true);
		voXhr.setRequestHeader("X-Requested-With", "eX-Canvas");
	} catch (e) {
		mbProxy = false;
		pfDone(false);
		return;
	}
	voXhr.timeout = 5000;
	voXhr.onreadystatechange = function() {
		if (voXhr.readyState != 4) {
			return;
		}
		var voResult = null;
		try {
			voResult = JSON.parse(voXhr.responseText);
		} catch (e2) {
			voResult = null;
		}
		mbProxy = voXhr.status == 200 && voResult != null && voResult.ok === true;
		pfDone(mbProxy);
	};
	try {
		voXhr.send();
	} catch (e3) {
		mbProxy = false;
		pfDone(false);
	}
};

exports.hasProxy = function() {
	return mbProxy === true;
};

/**
 * 사용자가 준 주소에서 시도할 문서 주소 후보. Swagger UI 화면 주소면 springdoc(/v3/api-docs) · springfox(/v2/api-docs) 등을 추정한다.
 * @param {String} psUrl
 * @return {String[]}
 */
exports.candidateUrls = function(psUrl) {
	var vsUrl = trim(psUrl);
	if (vsUrl === "") {
		return [];
	}
	if (!/^https?:\/\//i.test(vsUrl)) {
		vsUrl = "http://" + vsUrl;
	}
	var vaOut = [vsUrl];
	var vaMatch = /^(https?:\/\/[^\/?#]+)([^?#]*)/i.exec(vsUrl);
	if (vaMatch == null) {
		return vaOut;
	}
	var vsOrigin = vaMatch[1];
	var vsPath = vaMatch[2] || "";
	var vbLooksLikeDoc = /(api-docs|\.json|openapi|swagger\.json)/i.test(vsPath);
	if (!vbLooksLikeDoc) {
		var vsPrefix = vsPath.replace(/\/(swagger-ui.*|swagger\/?.*|docs?\/?.*|index\.html.*)$/i, "").replace(/\/+$/, "");
		var vaSuffix = ["/v3/api-docs", "/v2/api-docs", "/openapi.json", "/swagger.json", "/api-docs"];
		vaSuffix.forEach(function(psSuffix) {
			vaOut.push(vsOrigin + vsPrefix + psSuffix);
		});
		if (vsPrefix !== "") {
			vaSuffix.forEach(function(psSuffix) {
				vaOut.push(vsOrigin + psSuffix);
			});
		}
	}
	var voSeen = {};
	return vaOut.filter(function(psEach) {
		if (voSeen[psEach]) {
			return false;
		}
		voSeen[psEach] = true;
		return true;
	});
};

function httpGet(psUrl, pbProxy, pfDone, pfError) {
	var voXhr = new XMLHttpRequest();
	var vsTarget = pbProxy ? contextPath() + "/canvas/fetchOpenApi.do?url=" + encodeURIComponent(psUrl) : psUrl;
	try {
		voXhr.open("GET", vsTarget, true);
		if (pbProxy) {
			voXhr.setRequestHeader("X-Requested-With", "eX-Canvas");
		}
		voXhr.setRequestHeader("Accept", "application/json, */*");
	} catch (e) {
		pfError("요청을 만들지 못했습니다 : " + e.message);
		return;
	}
	voXhr.timeout = 30000;
	voXhr.onreadystatechange = function() {
		if (voXhr.readyState != 4) {
			return;
		}
		if (voXhr.status >= 200 && voXhr.status < 300) {
			pfDone(voXhr.responseText);
			return;
		}
		var vsMessage;
		if (voXhr.status == 0) {
			vsMessage = pbProxy ? "서버 프록시에 연결하지 못했습니다." : "브라우저가 직접 받지 못했습니다(CORS 차단 또는 연결 실패). 개발 서버/Tomcat 의 프록시를 쓰거나 JSON 을 붙여넣으세요.";
		} else {
			var voBody = null;
			try {
				voBody = JSON.parse(voXhr.responseText);
			} catch (e2) {
				voBody = null;
			}
			vsMessage = "HTTP " + voXhr.status + (voBody && voBody.message ? " : " + voBody.message : "");
		}
		pfError(vsMessage);
	};
	voXhr.ontimeout = function() {
		pfError("30초 안에 응답이 없습니다.");
	};
	try {
		voXhr.send();
	} catch (e3) {
		pfError("요청을 보내지 못했습니다 : " + e3.message);
	}
}

/**
 * URL 에서 명세를 받아 parse() 까지 한다. 후보 주소를 차례로 시도한다.
 * @param {String} psUrl
 * @param {{proxy:Boolean}} poOpt proxy 가 null 이면 probeProxy 결과를 따른다.
 * @param {function(Object, String)} pfDone (명세, 실제로 받은 주소)
 * @param {function(String)} pfError
 */
exports.fetchSpec = function(psUrl, poOpt, pfDone, pfError) {
	poOpt = poOpt || {};
	var vaCandidates = exports.candidateUrls(psUrl);
	if (vaCandidates.length == 0) {
		pfError("주소가 비어 있습니다.");
		return;
	}
	var vbProxy = poOpt.proxy == null ? mbProxy === true : poOpt.proxy === true;
	var vaErrors = [];
	var vnIdx = 0;

	function next() {
		if (vnIdx >= vaCandidates.length) {
			pfError("명세를 받지 못했습니다.\n" + vaErrors.join("\n"));
			return;
		}
		var vsEach = vaCandidates[vnIdx++];
		httpGet(vsEach, vbProxy, function(psText) {
			try {
				var voSpec = exports.parse(psText);
				pfDone(voSpec, vsEach);
			} catch (e) {
				vaErrors.push(vsEach + " → " + e.message);
				next();
			}
		}, function(psError) {
			vaErrors.push(vsEach + " → " + psError);
			next();
		});
	}
	next();
};

exports.LAYOUT = LAYOUT;
