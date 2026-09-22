/************************************************
 * geminiPlanner.module.js
 * Created at 2026. 9. 20.
 *
 * eX-Canvas(Web Prototyper) - Gemini API(무료 등급 키)로 "화면 계획(raw plan)"을 만든다.
 *
 * 설계 원칙
 *  - AI 는 CLX(XML)를 직접 쓰지 않는다. 캔버스 컨트롤을 템플릿 뼈대의 어느 자리에 둘지(JSON 계획)만 정한다.
 *    XML 은 clxSerializer 가 결정적으로 만든다 → std:sid 중복·깨진 XML·없는 속성 같은 환각이 파일에 들어가지 않는다.
 *  - 응답은 responseSchema 로 구조를 강제하고, templatePlanner.resolve() 가 ref 검증·누락 보충을 한다.
 *  - 규칙 기반 초안(draft)을 함께 보내 AI 는 "고치고 다듬는" 일을 한다(무료 등급의 작은 토큰·호출 한도 고려).
 *  - 호출 경로 2가지: direct(브라우저→Google, 테스트용. 키는 사용자가 입력) / proxy(브라우저→우리 서버→Google, 키는 서버 환경 변수).
 ************************************************/

var API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
var DEFAULT_MODEL = "gemini-2.5-flash";
var TIMEOUT_MS = 60000;

/* ---------------------------------------------------------------- 응답 스키마(OpenAPI 부분집합) */

function S(psType, poMore) {
	var vo = {
		type : psType
	};
	for (var vsKey in (poMore || {})) {
		vo[vsKey] = poMore[vsKey];
	}
	return vo;
}

function buildResponseSchema(paPatternIds) {
	var voButton = S("OBJECT", {
		properties : {
			ref : S("STRING"),
			cls : S("STRING")
		},
		required : ["ref"]
	});
	var voField = S("OBJECT", {
		properties : {
			label : S("STRING"),
			labelRef : S("STRING"),
			required : S("BOOLEAN"),
			refs : S("ARRAY", {
				items : S("STRING")
			}),
			separator : S("STRING")
		},
		required : ["label", "refs"]
	});
	var voSection = S("OBJECT", {
		properties : {
			row : S("INTEGER"),
			kind : S("STRING", {
				"enum" : ["grid", "tree", "tab", "form", "shuttle", "data"]
			}),
			title : S("STRING"),
			titleRef : S("STRING"),
			ref : S("STRING"),
			pagerRef : S("STRING"),
			gridColumns : S("ARRAY", {
				items : S("STRING")
			}),
			columns : S("INTEGER"),
			fields : S("ARRAY", {
				items : voField
			}),
			buttons : S("ARRAY", {
				items : voButton
			}),
			vertical : S("BOOLEAN"),
			parentTab : S("STRING"),
			tabIndex : S("INTEGER")
		},
		required : ["row", "kind"]
	});
	return S("OBJECT", {
		properties : {
			pattern : S("STRING", {
				"enum" : paPatternIds
			}),
			reason : S("STRING"),
			title : S("STRING"),
			search : S("OBJECT", {
				nullable : true,
				properties : {
					columns : S("INTEGER"),
					fields : S("ARRAY", {
						items : voField
					}),
					buttons : S("ARRAY", {
						items : voButton
					})
				}
			}),
			sections : S("ARRAY", {
				items : voSection
			}),
			footer : S("OBJECT", {
				properties : {
					left : S("ARRAY", {
						items : voButton
					}),
					right : S("ARRAY", {
						items : voButton
					})
				}
			}),
			rename : S("ARRAY", {
				items : S("OBJECT", {
					properties : {
						ref : S("STRING"),
						id : S("STRING")
					},
					required : ["ref", "id"]
				})
			})
		},
		required : ["pattern", "sections"],
		propertyOrdering : ["pattern", "reason", "title", "search", "sections", "footer", "rename"]
	});
}

/* ---------------------------------------------------------------- 프롬프트 */

var SYSTEM_TEXT = [
	"너는 토마토시스템 eXBuilder6 화면 설계 보조자다.",
	"사용자가 XY 캔버스에 대충 배치한 화면 초안(JSON AST)을, 사내 표준 화면 템플릿 뼈대에 맞는 '화면 계획(JSON)'으로 바꾼다.",
	"XML 이나 코드는 쓰지 않는다. 주어진 응답 스키마의 JSON 만 돌려준다.",
	"",
	"[표준 뼈대] 위에서 아래로: 앱 헤더 → 조회 조건(search-box: 라벨·입력 쌍의 격자 + 조회/초기화 버튼) → 데이터 영역(구획들) → 하단 버튼(왼쪽 묶음 | 오른쪽 묶음).",
	"[구획 kind] grid(그리드 제목+그리드) · tree(제목+트리) · tab(탭폴더) · form(제목+라벨·입력 표, form-base) · shuttle(두 그리드 사이의 이동 버튼 묶음).",
	"[그 밖의 데이터 컨트롤] accordion · group · calendar · fileupload · embeddedpage · embeddedapp · uicontrolshell 도 role=data 다. kind 는 data 로 하고 ref 에 그 id 를 적는다(제목+컨트롤 구획이 된다).",
	"[페이지 인덱서] role=pager 는 바로 위 그리드 구획의 pagerRef 에 적는다.",
	"[UDC] type=udc 는 프로젝트 공통 컨트롤이다(udcType 참고). role=title 은 바로 아래 구획의 titleRef 로, role=button(버튼 묶음)은 버튼과 같은 자리(buttons)에 cls 없이, role=header(앱 헤더)는 어디에도 넣지 않고 text 만 title 로, role=input 은 입력처럼 필드 refs 에 넣는다.",
	"[row] 같은 row 값의 구획은 좌우로 나란히(division-group), 다른 row 는 위아래로 쌓인다. 0 부터 센다.",
	"",
	"[규칙]",
	"1. ref · labelRef · titleRef · parentTab 에는 AST 의 id 만 쓴다. 없는 id 를 만들지 않는다. 한 컨트롤은 한 곳에만 쓴다.",
	"2. AST 의 모든 입력(role=input)·버튼(role=button)·데이터(role=data) 컨트롤을 빠짐없이 어딘가에 배정한다.",
	"3. 라벨(role=label)은 좌표상 가장 가까운 입력의 label/labelRef 로 짝짓는다. 입력 위쪽에 홀로 있는 큰 제목성 라벨은 title 또는 구획 title/titleRef 로 쓴다.",
	"4. '~' '-' 라벨로 이어진 두 입력(기간 등)은 한 필드의 refs 에 함께 넣고 separator 를 적는다.",
	"5. 라벨 끝의 * 는 필수 표시다. required=true 로 하고 label 에서 * 를 뺀다.",
	"6. 데이터 컨트롤보다 위에 있는 입력들은 조회 조건, 아래/옆에 있는 입력들은 form 구획이다. 데이터 컨트롤이 없으면 입력들은 form 구획이다.",
	"7. 화면 맨 아래 버튼 줄은 footer 다(캔버스 가로 중앙 기준 왼쪽은 left, 오른쪽은 right). 그리드/폼 바로 위 버튼 줄은 그 구획의 buttons 다. 조회 조건 줄의 버튼은 search.buttons 다.",
	"8. 버튼 cls: 조회=btn-primary-02, 초기화=btn-secondary-03 btn-md, 저장·확인·등록=btn-primary-01, 그 밖의 하단 오른쪽=btn-secondary-01, 하단 왼쪽·제목 줄=btn-secondary-03, 셔틀=btn-right/btn-left(좌우) 또는 btn-down/btn-up(상하).",
	"9. search.columns 는 한 줄에 놓을 라벨·입력 쌍 수(1~4, 보통 3), form 의 columns 는 1~3.",
	"10. 그리드 text 가 '컬럼1,컬럼2..' 같은 기본값이고 요구사항 메모로 컬럼을 추정할 수 있으면 gridColumns 에 한글 헤더를 제안한다. 아니면 비운다.",
	"11. rename 은 기본 id(ipb1, btn2 ...)를 의미 있는 id 로 바꿀 때만 쓴다. rename 을 하더라도 계획 안의 모든 ref · refs · labelRef · titleRef · parentTab 에는 반드시 AST 의 '원래 id'를 쓴다(새 id 는 rename 목록에만 적는다). 접두 규칙: opt 아웃풋, ipb 인풋박스, btn 버튼, cmb 콤보, dti 날짜, nbe 숫자, sch 서치인풋, cbx 체크, rdb 라디오, txa 텍스트에리어, grd 그리드, tre 트리, tab 탭폴더. 영문 camelCase.",
	"12. pattern 은 카탈로그에서 구획 구성이 가장 비슷한 것을 고르고 reason 에 한 문장으로 이유를 적는다.",
	"13. 규칙 기반 초안(draft)이 주어진다. 좌표를 다시 보고 잘못된 짝·구획·순서만 고치고, 제목·라벨·id 를 다듬어라. 초안이 맞으면 그대로 두어도 된다."
].join("\n");

function buildUserText(poAst, poDraft, paCatalog, psMemo, psForcedPattern) {
	var vaLines = [];
	vaLines.push("[템플릿 카탈로그]");
	paCatalog.forEach(function(poEach) {
		vaLines.push("- " + poEach.id + " (" + poEach.arrange + "): " + poEach.desc);
	});
	if (psForcedPattern != null && psForcedPattern != "auto") {
		vaLines.push("");
		vaLines.push("[사용자 지정 패턴] " + psForcedPattern + " - pattern 은 이 값으로 하고 구획 배치(row)도 이 패턴에 맞춘다.");
	}
	vaLines.push("");
	vaLines.push("[요구사항 메모] " + (psMemo ? psMemo : "(없음)"));
	vaLines.push("");
	vaLines.push("[캔버스 AST] 좌표 단위 px, 원점은 캔버스 왼쪽 위. text 는 버튼·라벨의 글자 / 콤보·라디오의 아이템 / 그리드의 헤더 / 탭 이름.");
	vaLines.push(JSON.stringify({
		canvas : poAst.app.canvas,
		popup : poAst.app.popup,
		children : poAst.children.map(function(poNode) {
			return {
				id : poNode.id,
				type : poNode.type,
				udcType : poNode.udcType,
				role : poNode.role,
				text : poNode.text,
				x : poNode.layoutData.x,
				y : poNode.layoutData.y,
				w : poNode.layoutData.width,
				h : poNode.layoutData.height
			};
		})
	}));
	vaLines.push("");
	vaLines.push("[규칙 기반 초안(draft)]");
	vaLines.push(JSON.stringify({
		pattern : poDraft.pattern,
		title : poDraft.title,
		search : poDraft.search,
		sections : poDraft.sections,
		footer : poDraft.footer
	}));
	return vaLines.join("\n");
}

/* ---------------------------------------------------------------- 호출 */

function contextPath() {
	var vsPath = window.location.pathname;
	var vnIdx = vsPath.indexOf("/ui/");
	return vnIdx > 0 ? vsPath.substring(0, vnIdx) : "";
}

function errorMessage(pnStatus, psBody) {
	var vsDetail = "";
	try {
		var voJson = JSON.parse(psBody);
		vsDetail = voJson.error && voJson.error.message ? voJson.error.message : "";
	} catch (e) {
		vsDetail = "";
	}
	if (pnStatus == 429) {
		return "Gemini 무료 등급 호출 한도를 넘었습니다(429). 잠시 뒤 다시 시도하세요. " + vsDetail;
	}
	if (/API key not valid|API_KEY_INVALID/i.test(vsDetail)) {
		return "Gemini API 키가 유효하지 않습니다(" + pnStatus + "). Google AI Studio 에서 발급한 키인지, 앞뒤 공백이 없는지 확인하세요. " + vsDetail;
	}
	if (pnStatus == 400 || pnStatus == 403) {
		return "Gemini 요청이 거부되었습니다(" + pnStatus + "). API 키·모델명을 확인하세요. " + (vsDetail || psBody || "");
	}
	if (pnStatus == 0) {
		return "Gemini 에 연결하지 못했습니다(네트워크·CORS·시간 초과).";
	}
	return "Gemini 호출 실패(" + pnStatus + "). " + vsDetail;
}

/**
 * generateContent 를 호출해 첫 후보의 글자(JSON 문자열)를 돌려준다(비동기).
 * 화면 계획(plan)과 이미지 분석(imagePlanner)이 같은 길(direct / proxy · 오류 문구)을 쓴다.
 * @param {Object} poBody generateContent 요청 본문
 * @param {{apiKey:String, model:String, route:String, timeout:Number}} poOpt route = direct | proxy
 * @param {function(String)} pfSuccess 응답 글자(코드 펜스를 벗긴 것)
 * @param {function(String)} pfError 오류 메시지
 */
exports.request = function(poBody, poOpt, pfSuccess, pfError) {
	var vsModel = poOpt.model ? poOpt.model : DEFAULT_MODEL;
	var voXhr = new XMLHttpRequest();
	if (poOpt.route == "proxy") {
		// 서버 프록시: 키는 서버(환경 변수 GEMINI_API_KEY)에 있다. 브라우저에는 키가 없다.
		voXhr.open("POST", contextPath() + "/ai/gemini.do?model=" + encodeURIComponent(vsModel), true);
	} else {
		var vsKey = (poOpt.apiKey || "").replace(/^\s+|\s+$/g, ""); // 복사해 넣을 때 딸려 오는 공백·줄바꿈 제거
		if (!vsKey) {
			pfError("Gemini API 키가 없습니다. 속성창 아래 'Gemini 설정'에 키를 넣거나 호출을 '서버 프록시' 로 바꾸세요.");
			return;
		}
		voXhr.open("POST", API_BASE + encodeURIComponent(vsModel) + ":generateContent", true);
		voXhr.setRequestHeader("x-goog-api-key", vsKey); // 키를 URL 에 싣지 않는다(로그·히스토리 노출 방지)
	}
	voXhr.setRequestHeader("Content-Type", "application/json");
	voXhr.timeout = poOpt.timeout || TIMEOUT_MS;

	voXhr.onreadystatechange = function() {
		if (voXhr.readyState != 4) {
			return;
		}
		if (voXhr.status < 200 || voXhr.status >= 300) {
			pfError(errorMessage(voXhr.status, voXhr.responseText));
			return;
		}
		var vsText;
		try {
			var voResponse = JSON.parse(voXhr.responseText);
			var voCandidate = voResponse.candidates && voResponse.candidates[0];
			if (voCandidate == null || voCandidate.content == null || voCandidate.content.parts == null) {
				var vsBlock = voResponse.promptFeedback && voResponse.promptFeedback.blockReason ? voResponse.promptFeedback.blockReason : "응답 없음";
				pfError("Gemini 가 결과를 돌려주지 않았습니다(" + vsBlock + ").");
				return;
			}
			vsText = voCandidate.content.parts.map(function(poPart) {
				return poPart.text || "";
			}).join("");
			// responseMimeType 을 지정해도 드물게 코드 펜스가 붙는 경우를 방어한다.
			vsText = vsText.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
		} catch (e) {
			pfError("Gemini 응답을 해석하지 못했습니다: " + e.message);
			return;
		}
		pfSuccess(vsText);
	};
	voXhr.send(JSON.stringify(poBody));
};

/**
 * Gemini 로 원시 계획을 만든다(비동기).
 * @param {Object} poAst canvasAst.extract() 결과
 * @param {{apiKey:String, model:String, route:String, memo:String, pattern:String}} poOpt route = direct | proxy
 * @param {function(Object)} pfSuccess raw plan 을 받는다(templatePlanner.resolve 로 넘길 것)
 * @param {function(String)} pfError 오류 메시지를 받는다
 */
exports.plan = function(poAst, poOpt, pfSuccess, pfError) {
	var planner = cpr.core.Module.require("module/canvas/templatePlanner");
	var vaCatalog = planner.getCatalog();
	var voDraft = planner.planByRule(poAst);

	var voBody = {
		systemInstruction : {
			parts : [{
				text : SYSTEM_TEXT
			}]
		},
		contents : [{
			role : "user",
			parts : [{
				text : buildUserText(poAst, voDraft, vaCatalog, poOpt.memo, poOpt.pattern)
			}]
		}],
		generationConfig : {
			temperature : 0.2,
			responseMimeType : "application/json",
			responseSchema : buildResponseSchema(vaCatalog.map(function(poEach) {
				return poEach.id;
			}))
		}
	};

	exports.request(voBody, poOpt, function(psText) {
		try {
			var voPlan = JSON.parse(psText);
			voPlan.warnings = [];
			if (voPlan.reason) {
				voPlan.warnings.push("AI 선택 이유: " + voPlan.reason);
			}
			pfSuccess(voPlan);
		} catch (e) {
			pfError("Gemini 응답을 해석하지 못했습니다: " + e.message);
		}
	}, pfError);
};

exports.DEFAULT_MODEL = DEFAULT_MODEL;
