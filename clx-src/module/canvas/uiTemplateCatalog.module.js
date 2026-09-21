/************************************************
 * uiTemplateCatalog.module.js
 *
 * !! 자동 생성 파일 - 손으로 고치지 말 것 !!
 * 만드는 도구 : tools/SyncCatalog.java  (실행 : java tools/SyncCatalog.java)
 * 원본        : eXBuilder6 스튜디오 상용구(canned-templates.xmi)
 *
 * 항목 하나 = { uuid, name, group, label, desc, width, height, node }
 * node      = { type, cls, id, props, layout, rows, columns, ld, children }
 *   type    : CLX 태그 키(clxSerializer.TAG_INFO 와 같다). tabitem 은 탭 한 칸.
 *   props   : CLX 속성명 그대로. ld = 부모 레이아웃에 붙는 데이터.
 ************************************************/

exports.GENERATED_AT = "2026-09-22 08:16";
exports.SOURCE = "/Users/lim/Desktop/eclipse/eX_Canvas/.settings/canned-templates.xmi";

/** 팔레트에서 쓰는 묶음 순서 */
exports.GROUPS = ["넘버에디터", "데이트인풋", "라디오버튼", "버튼", "서치인풋", "아웃풋", "인풋박스", "체크박스", "체크박스그룹", "카드", "콘텐츠", "콤보박스", "탭폴더", "텍스트에리어", "파일인풋", "폼", "프레임"];

exports.TEMPLATES = [
	{
		uuid : "a351beff-d6e3-4186-af22-69f9939a964a",
		name : "[넘버에디터] 컨트롤 그룹 (1)",
		group : "넘버에디터",
		label : "컨트롤 그룹 (1)",
		desc : "[form-control] 넘버에디터 + 아웃풋",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "30", "syncminlength" : "false", "unit" : "PIXEL" }],
			ld : { "kind" : "form", "col" : "1", "row" : "1" },
			children : [
				{
					type : "numbereditor",
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "output",
					props : { "value" : "원" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "80d29e6d-f550-49bf-ba64-363774bc6350",
		name : "[넘버에디터] 컨트롤 그룹 (2)",
		group : "넘버에디터",
		label : "컨트롤 그룹 (2)",
		desc : "[form-control] displayExp : text + \" 원\"",
		width : 200,
		height : 26,
		node : {
			type : "numbereditor",
			props : { "displayexp" : "text + \" 원\"" },
			ld : { "kind" : "form", "col" : "1", "row" : "2" }
		}
	},
	{
		uuid : "6b396fea-295d-4868-8d31-da46c2b416af",
		name : "[데이트인풋] 데이터 포맷 (1)",
		group : "데이트인풋",
		label : "데이터 포맷 (1)",
		desc : "연-월-일",
		width : 110,
		height : 26,
		node : {
			type : "dateinput",
			ld : { "kind" : "form", "col" : "1", "halign" : "LEFT", "row" : "1", "width" : "110" }
		}
	},
	{
		uuid : "124a9e07-bda4-4b7e-a57e-39e6c5572f9f",
		name : "[데이트인풋] 데이터 포맷 (2)",
		group : "데이트인풋",
		label : "데이터 포맷 (2)",
		desc : "연-월",
		width : 110,
		height : 26,
		node : {
			type : "dateinput",
			props : { "calendartype" : "yearmonth", "format" : "YYYYMM", "mask" : "YYYY-MM" },
			ld : { "kind" : "form", "col" : "1", "halign" : "LEFT", "row" : "2", "width" : "110" }
		}
	},
	{
		uuid : "499790e4-87af-4d8e-aa18-5ed628cde29e",
		name : "[데이트인풋] 데이터 포맷 (3)",
		group : "데이트인풋",
		label : "데이터 포맷 (3)",
		desc : "연도",
		width : 110,
		height : 26,
		node : {
			type : "dateinput",
			props : { "calendartype" : "year", "format" : "YYYY", "mask" : "YYYY" },
			ld : { "kind" : "form", "col" : "1", "halign" : "LEFT", "row" : "3", "width" : "110" }
		}
	},
	{
		uuid : "5040fb5a-6733-4e69-a6a7-f8a8a63b2816",
		name : "[데이트인풋] 데이터 포맷 (4)",
		group : "데이트인풋",
		label : "데이터 포맷 (4)",
		desc : "시:분:초",
		width : 80,
		height : 26,
		node : {
			type : "dateinput",
			cls : "timepicker",
			props : { "format" : "HHmmss", "hidebutton" : "true", "mask" : "HH:mm:ss", "value" : "235959" },
			ld : { "kind" : "form", "col" : "1", "halign" : "LEFT", "row" : "4", "width" : "80" }
		}
	},
	{
		uuid : "47e27fba-bdba-400c-8123-5fbdadac95c0",
		name : "[데이트인풋] 데이터 포맷 (5)",
		group : "데이트인풋",
		label : "데이터 포맷 (5)",
		desc : "연-월-일 시:분:초",
		width : 170,
		height : 26,
		node : {
			type : "dateinput",
			props : { "format" : "YYYYMMDDHHmmss", "mask" : "YYYY-MM-DD HH:mm:ss", "value" : "20240101123456" },
			ld : { "kind" : "form", "col" : "1", "halign" : "LEFT", "row" : "5", "width" : "170" }
		}
	},
	{
		uuid : "82df0947-feb3-4833-9087-dbc0d5bc7783",
		name : "[데이트인풋] 데이터 포맷 (6)",
		group : "데이트인풋",
		label : "데이터 포맷 (6)",
		desc : "스핀버튼이 보이는 데이트 인풋",
		width : 130,
		height : 26,
		node : {
			type : "dateinput",
			props : { "spinbutton" : "true", "value" : "20240101" },
			ld : { "kind" : "form", "col" : "1", "halign" : "LEFT", "row" : "6", "width" : "130" }
		}
	},
	{
		uuid : "b63e0b62-db52-408e-8c55-1602b9fad09b",
		name : "[데이트인풋] 컨트롤 그룹",
		group : "데이트인풋",
		label : "컨트롤 그룹",
		desc : "[form-control] 시작일자 ~ 종료일자",
		width : 276,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "10", "syncminlength" : "false", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "1", "syncminlength" : "true", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "halign" : "FILL", "row" : "7", "width" : "236" },
			children : [
				{
					type : "dateinput",
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "output",
					props : { "value" : "-" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "dateinput",
					ld : { "kind" : "form", "col" : "2", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "d80bd3eb-e3a4-4be1-a3ca-006a831790cf",
		name : "[라디오버튼] 고정 아이템",
		group : "라디오버튼",
		label : "고정 아이템",
		desc : "colCount=0, fixedWidth=true",
		width : 400,
		height : 26,
		node : {
			type : "radiobutton",
			props : { "colcount" : "0", "fixedwidth" : "true" },
			ld : { "kind" : "form", "col" : "1", "row" : "1" },
			items : [{ "label" : "아이템", "value" : "value1" }, { "label" : "아이템", "value" : "value2" }, { "label" : "아이템", "value" : "value3" }]
		}
	},
	{
		uuid : "fccda1a1-9fc8-4ae2-b84e-c0560190bf95",
		name : "[라디오버튼] 컨트롤 그룹 (1)",
		group : "라디오버튼",
		label : "컨트롤 그룹 (1)",
		desc : "[form-control] 라디오버튼 + 라디오버튼",
		width : 400,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "flow", "hspacing" : "10", "scrollable" : "false" },
			ld : { "kind" : "form", "col" : "1", "row" : "2" },
			children : [
				{
					type : "radiobutton",
					props : { "colcount" : "0", "fixedwidth" : "true" },
					ld : { "kind" : "flow", "autosize" : "both", "height" : "26px", "minheight" : "20", "width" : "200px" },
					items : [{ "label" : "아이템", "value" : "value1" }, { "label" : "아이템", "value" : "value2" }, { "label" : "아이템", "value" : "value3" }]
				},
				{
					type : "radiobutton",
					props : { "colcount" : "0", "fixedwidth" : "true" },
					ld : { "kind" : "flow", "autosize" : "both", "height" : "26px", "minheight" : "20", "width" : "130px" },
					items : [{ "label" : "아이템", "value" : "value1" }, { "label" : "아이템", "value" : "value2" }]
				}
			]
		}
	},
	{
		uuid : "155ca2e4-7915-471b-9777-71456ea22ec9",
		name : "[라디오버튼] 컨트롤 그룹 (2)",
		group : "라디오버튼",
		label : "컨트롤 그룹 (2)",
		desc : "[form-control] 라디오버튼 + 버튼",
		width : 400,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "flow", "hspacing" : "10", "scrollable" : "false" },
			ld : { "kind" : "form", "col" : "1", "row" : "3" },
			children : [
				{
					type : "radiobutton",
					props : { "colcount" : "0", "fixedwidth" : "true" },
					ld : { "kind" : "flow", "autosize" : "both", "height" : "26px", "minheight" : "20", "width" : "200px" },
					items : [{ "label" : "아이템", "value" : "value1" }, { "label" : "아이템", "value" : "value2" }, { "label" : "아이템", "value" : "value3" }]
				},
				{
					type : "button",
					cls : "btn-inline",
					props : { "value" : "버튼" },
					ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "64px" }
				}
			]
		}
	},
	{
		uuid : "d561b7ca-80d2-4205-904c-189774953c2c",
		name : "[버튼] 등록 버튼",
		group : "버튼",
		label : "등록 버튼",
		desc : "[btn-add]",
		width : 63,
		height : 26,
		node : {
			type : "button",
			cls : "btn-add",
			props : { "icon" : "0", "value" : "등록" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "63px" }
		}
	},
	{
		uuid : "f4b3d120-1a38-49ec-9ef8-8012620e980d",
		name : "[버튼] 보조 버튼",
		group : "버튼",
		label : "보조 버튼",
		desc : "[btn-base]",
		width : 46,
		height : 26,
		node : {
			type : "button",
			cls : "btn-base",
			props : { "value" : "버튼" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "46px" }
		}
	},
	{
		uuid : "d86d6ff8-4f88-430f-9ff0-807e7a9fa4c4",
		name : "[버튼] 삭제 버튼",
		group : "버튼",
		label : "삭제 버튼",
		desc : "[btn-remove]",
		width : 63,
		height : 26,
		node : {
			type : "button",
			cls : "btn-remove",
			props : { "icon" : "0", "value" : "삭제" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "63px" }
		}
	},
	{
		uuid : "db10345c-44b9-4a61-8aab-f11ff191fd16",
		name : "[버튼] 엑셀다운로드 버튼",
		group : "버튼",
		label : "엑셀다운로드 버튼",
		desc : "[btn-excel]",
		width : 108,
		height : 26,
		node : {
			type : "button",
			cls : "btn-excel",
			props : { "icon" : "../theme/images/controls/button/ic_btn_blank.svg", "value" : "엑셀다운로드" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "108px" }
		}
	},
	{
		uuid : "ed2b3e9d-4954-42e1-a447-7a9c901874cc",
		name : "[버튼] 엑셀업로드 버튼",
		group : "버튼",
		label : "엑셀업로드 버튼",
		desc : "[btn-excel]",
		width : 97,
		height : 26,
		node : {
			type : "button",
			cls : "btn-excel",
			props : { "icon" : "../theme/images/controls/button/ic_btn_blank.svg", "value" : "엑셀업로드" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "97px" }
		}
	},
	{
		uuid : "56a10b6f-c4af-4a01-ae46-d7b177098ddc",
		name : "[버튼] 인라인 버튼",
		group : "버튼",
		label : "인라인 버튼",
		desc : "[btn-inline]",
		width : 46,
		height : 26,
		node : {
			type : "button",
			cls : "btn-base",
			props : { "value" : "버튼" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "46px" }
		}
	},
	{
		uuid : "321f1a24-6834-4c71-96f2-1dcb09258548",
		name : "[버튼] 저장 버튼",
		group : "버튼",
		label : "저장 버튼",
		desc : "[btn-save]",
		width : 63,
		height : 26,
		node : {
			type : "button",
			cls : "btn-save",
			props : { "icon" : "0", "value" : "저장" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "63px" }
		}
	},
	{
		uuid : "9fa6535a-9935-44c1-9b7e-45c015ccd25c",
		name : "[버튼] 조회 버튼",
		group : "버튼",
		label : "조회 버튼",
		desc : "[btn-search]",
		width : 63,
		height : 26,
		node : {
			type : "button",
			cls : "btn-search",
			props : { "icon" : "0", "value" : "조회" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "63px" }
		}
	},
	{
		uuid : "2ee12e50-2c3c-4e5d-b2db-1a6294a66dc5",
		name : "[버튼] 주요 버튼",
		group : "버튼",
		label : "주요 버튼",
		desc : "[btn-submit]",
		width : 46,
		height : 26,
		node : {
			type : "button",
			cls : "btn-submit",
			props : { "value" : "버튼" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "46px" }
		}
	},
	{
		uuid : "c26dffd9-8a0e-4604-84f0-ec332c238ae8",
		name : "[버튼] 초기화 버튼",
		group : "버튼",
		label : "초기화 버튼",
		desc : "[btn-reset]",
		width : 74,
		height : 26,
		node : {
			type : "button",
			cls : "btn-reset",
			props : { "icon" : "0", "value" : "초기화" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "74px" }
		}
	},
	{
		uuid : "cbe95027-edd9-46a5-9e25-2ca0fa78d5e3",
		name : "[버튼] 초기화 아이콘 버튼",
		group : "버튼",
		label : "초기화 아이콘 버튼",
		desc : "[btn-i-only btn-reset] 초기화 아이콘 버튼",
		width : 28,
		height : 26,
		node : {
			type : "button",
			cls : "btn-reset btn-i-only",
			props : { "icon" : "../theme/images/controls/button/ic_btn_blank.svg", "tooltip" : "초기화", "value" : "" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "28px" }
		}
	},
	{
		uuid : "33c49c66-0a4a-4db5-be3b-4d61f163454e",
		name : "[버튼] 출력 버튼",
		group : "버튼",
		label : "출력 버튼",
		desc : "[btn-print]",
		width : 63,
		height : 26,
		node : {
			type : "button",
			cls : "btn-print",
			props : { "icon" : "../theme/images/controls/button/ic_btn_blank.svg", "value" : "출력" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "63px" }
		}
	},
	{
		uuid : "cac1b6c6-647f-450c-8a08-9bf99b5be1b2",
		name : "[버튼] 타이틀 버튼 그룹",
		group : "버튼",
		label : "타이틀 버튼 그룹",
		desc : "[title-button-group] 타이틀 버튼 그룹. content-title-group 내 우측에 배치, 우측 정렬(horizontalSpacing = 4px), 다른 유형의 컨트롤 배치 시 사이에 간격 아웃풋 배치",
		width : 1580,
		height : 26,
		node : {
			type : "group",
			cls : "title-button-group",
			layout : { "kind" : "flow", "halign" : "right", "scrollable" : "false" },
			ld : { "kind" : "vertical", "height" : "26px", "width" : "600px" },
			children : [
				{
					type : "udc",
					id : "udccomgridcudbtns1",
					props : { "type" : "udc.com.udcComGridCudBtns" },
					ld : { "kind" : "flow", "allownewline" : "false", "autosize" : "width", "height" : "26px", "width" : "230px" }
				},
				{
					type : "button",
					cls : "btn-save",
					props : { "icon" : "0", "value" : "저장" },
					ld : { "kind" : "flow", "allownewline" : "false", "autosize" : "width", "height" : "26px", "width" : "63px" }
				},
				{
					type : "output",
					cls : "spacing",
					ld : { "kind" : "flow", "height" : "26px", "width" : "8px" }
				},
				{
					type : "button",
					cls : "btn-submit",
					props : { "value" : "버튼" },
					ld : { "kind" : "flow", "allownewline" : "false", "autosize" : "width", "height" : "26px", "width" : "47px" }
				}
			]
		}
	},
	{
		uuid : "9d752cfd-7966-4a1e-ab83-a52b363afb0b",
		name : "[버튼] 파일 다운로드 버튼",
		group : "버튼",
		label : "파일 다운로드 버튼",
		desc : "[btn-download]",
		width : 85,
		height : 26,
		node : {
			type : "button",
			cls : "btn-download",
			props : { "icon" : "0", "value" : "다운로드" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "85px" }
		}
	},
	{
		uuid : "f7ec4f03-fce6-43f1-a499-583b33ea6ae7",
		name : "[버튼] 파일 업로드 버튼",
		group : "버튼",
		label : "파일 업로드 버튼",
		desc : "[btn-upload]",
		width : 74,
		height : 26,
		node : {
			type : "button",
			cls : "btn-upload",
			props : { "icon" : "0", "value" : "업로드" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "74px" }
		}
	},
	{
		uuid : "7ee9442b-6574-46ff-87bf-118378559e92",
		name : "[버튼] 팝업 호출 버튼",
		group : "버튼",
		label : "팝업 호출 버튼",
		desc : "[btn-pop]",
		width : 85,
		height : 26,
		node : {
			type : "button",
			cls : "btn-pop",
			props : { "icon" : "../theme/images/controls/button/ic_btn_blank.svg", "value" : "팝업호출" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "85px" }
		}
	},
	{
		uuid : "fbff0210-ac88-4699-b32a-bf65c7b35a21",
		name : "[버튼] 푸터 버튼 그룹",
		group : "버튼",
		label : "푸터 버튼 그룹",
		desc : "[footer-button-group] 푸터 버튼 그룹. content-footer 내 배치, 좌측 버튼 그룹과 우측 버튼 그룹으로 분리하여 배치(각각 width=\"765px\", autoSizing=\"true\", minLength=\"0\")",
		width : 600,
		height : 26,
		node : {
			type : "group",
			cls : "footer-button-group",
			layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "1fr", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "autoSizing" : "true", "length" : "300", "shadecolor" : "transparent", "shadetype" : "NONE", "syncminlength" : "false", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "300", "shadecolor" : "transparent", "shadetype" : "NONE", "syncminlength" : "false", "unit" : "PIXEL" }],
			ld : { "kind" : "form", "col" : "1", "row" : "2" },
			children : [
				{
					type : "group",
					layout : { "kind" : "flow", "halign" : "left" },
					ld : { "kind" : "form", "col" : "0", "row" : "0" },
					children : [
						{
							type : "button",
							cls : "btn-base",
							props : { "value" : "버튼" },
							ld : { "kind" : "flow", "autosize" : "width", "height" : "32px", "width" : "48px" }
						},
						{
							type : "button",
							cls : "btn-base",
							props : { "value" : "버튼" },
							ld : { "kind" : "flow", "autosize" : "width", "height" : "32px", "width" : "48px" }
						}
					]
				},
				{
					type : "group",
					layout : { "kind" : "flow", "halign" : "right" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" },
					children : [
						{
							type : "button",
							cls : "btn-submit",
							props : { "value" : "버튼" },
							ld : { "kind" : "flow", "autosize" : "width", "height" : "32px", "width" : "48px" }
						},
						{
							type : "button",
							cls : "btn-submit",
							props : { "value" : "버튼" },
							ld : { "kind" : "flow", "autosize" : "width", "height" : "32px", "width" : "48px" }
						},
						{
							type : "button",
							cls : "btn-base",
							props : { "value" : "버튼" },
							ld : { "kind" : "flow", "autosize" : "width", "height" : "32px", "width" : "48px" }
						}
					]
				}
			]
		}
	},
	{
		uuid : "28436a20-e048-4f7d-b4bd-cdb970437579",
		name : "[버튼] 행삭제 버튼",
		group : "버튼",
		label : "행삭제 버튼",
		desc : "[btn-delete]",
		width : 74,
		height : 26,
		node : {
			type : "button",
			cls : "btn-delete",
			props : { "icon" : "../theme/images/controls/button/ic_btn_blank.svg", "value" : "행삭제" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "74px" }
		}
	},
	{
		uuid : "c147804b-9c47-4431-b8bd-a1d06e3ba592",
		name : "[버튼] 행추가 버튼",
		group : "버튼",
		label : "행추가 버튼",
		desc : "[btn-insert]",
		width : 74,
		height : 26,
		node : {
			type : "button",
			cls : "btn-insert",
			props : { "icon" : "0", "value" : "행추가" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "74px" }
		}
	},
	{
		uuid : "35600121-63aa-46f7-8a72-ad054634930e",
		name : "[버튼] 행취소 버튼",
		group : "버튼",
		label : "행취소 버튼",
		desc : "[btn-revert]",
		width : 74,
		height : 26,
		node : {
			type : "button",
			cls : "btn-revert",
			props : { "icon" : "../theme/images/controls/button/ic_btn_blank.svg", "value" : "행취소" },
			ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "74px" }
		}
	},
	{
		uuid : "1a7c92dd-1428-47d5-becf-b16863735f46",
		name : "[서치인풋] 컨트롤 그룹 (1)",
		group : "서치인풋",
		label : "컨트롤 그룹 (1)",
		desc : "[form-control] 서치인풋 + 초기화 버튼",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "shadecolor" : "transparent", "shadetype" : "NONE", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "30", "shadecolor" : "transparent", "shadetype" : "NONE", "syncminlength" : "false", "unit" : "PIXEL" }],
			ld : { "kind" : "form", "col" : "1", "row" : "1" },
			children : [
				{
					type : "searchinput",
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "button",
					cls : "btn-reset btn-i-only",
					props : { "icon" : "0", "tooltip" : "초기화", "value" : "" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "77d4bf6a-85d7-4cac-afc4-b45077aa5fff",
		name : "[서치인풋] 컨트롤 그룹 (2)",
		group : "서치인풋",
		label : "컨트롤 그룹 (2)",
		desc : "[form-control] 주소",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "length" : "1", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "2" },
			children : [
				{
					type : "searchinput",
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "inputbox",
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "inputbox",
					ld : { "kind" : "form", "col" : "2", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "29150d37-80f5-4d99-bc4e-48c14bc3de4e",
		name : "[아웃풋] h1 타이틀",
		group : "아웃풋",
		label : "h1 타이틀",
		desc : "[tit h1] h1 제목 수준 타이틀",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "tit h1",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "8" }
		}
	},
	{
		uuid : "d43d3803-cc6c-41b8-9b2b-d6cb6c15840c",
		name : "[아웃풋] h2 타이틀",
		group : "아웃풋",
		label : "h2 타이틀",
		desc : "[tit h2] h2 제목 수준 타이틀",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "tit h2",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "9" }
		}
	},
	{
		uuid : "95e7aa60-138f-4e03-88d2-df85b0d21d4d",
		name : "[아웃풋] h3 타이틀",
		group : "아웃풋",
		label : "h3 타이틀",
		desc : "[tit h3] h3 제목 수준 타이틀",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "tit h3",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "10" }
		}
	},
	{
		uuid : "64dab3a0-2aa7-4ece-b202-afb09318e873",
		name : "[아웃풋] h4 타이틀",
		group : "아웃풋",
		label : "h4 타이틀",
		desc : "[tit h4] h4 제목 수준 타이틀",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "tit h4",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "11" }
		}
	},
	{
		uuid : "029e4628-1dd1-4d9b-a9b5-dd2717eeb854",
		name : "[아웃풋] h5 타이틀",
		group : "아웃풋",
		label : "h5 타이틀",
		desc : "[tit h5] h5 제목 수준 타이틀",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "tit h5",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "12" }
		}
	},
	{
		uuid : "a0f108c0-58d4-4f85-b876-192221bb18a9",
		name : "[아웃풋] h6 타이틀",
		group : "아웃풋",
		label : "h6 타이틀",
		desc : "[tit h6] h6 제목 수준 타이틀",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "tit h6",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "13" }
		}
	},
	{
		uuid : "b73557d3-4d7b-4227-a5a0-06227da4b33f",
		name : "[아웃풋] 가로 중앙 정렬",
		group : "아웃풋",
		label : "가로 중앙 정렬",
		desc : "[text-center] 문자열 정형 데이터에 적용하는 정렬",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-center",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "3" }
		}
	},
	{
		uuid : "0d664027-f2ae-4fdc-bdbc-7c3a86b83c74",
		name : "[아웃풋] 간격 지정 컨트롤",
		group : "아웃풋",
		label : "간격 지정 컨트롤",
		desc : "[spacing] 버튼 영역, 정보 영역 등에서 기본 간격 이외에 컨트롤 간 간격을 지정할 때 사용. 해당 컨트롤 다음으로 오는 컨트롤은 allowNewLine=false 처리할 것",
		width : 8,
		height : 26,
		node : {
			type : "output",
			cls : "spacing",
			id : "opt2",
			props : { "comment" : "간격 지정 컨트롤. 다음으로 오는 컨트롤은 allowNewLine=false로 처리할 것", "value" : "" },
			ld : { "kind" : "form", "col" : "1", "halign" : "LEFT", "row" : "1", "width" : "8" }
		}
	},
	{
		uuid : "5c57edc3-08ef-454b-a496-e0d06d58bc39",
		name : "[아웃풋] 날짜 포맷 (1)",
		group : "아웃풋",
		label : "날짜 포맷 (1)",
		desc : "YYYY-MM-DD",
		width : 120,
		height : 26,
		node : {
			type : "output",
			props : { "datatype" : "date", "format" : "YYYY-MM-DD", "value" : "20221231" },
			ld : { "kind" : "form", "col" : "1", "row" : "1" }
		}
	},
	{
		uuid : "58a9418e-aab5-49ab-8b7a-992b54d99eb2",
		name : "[아웃풋] 날짜 포맷 (2)",
		group : "아웃풋",
		label : "날짜 포맷 (2)",
		desc : "YYYY-MM",
		width : 120,
		height : 26,
		node : {
			type : "output",
			props : { "datatype" : "date", "format" : "YYYY-MM", "value" : "202212" },
			ld : { "kind" : "form", "col" : "1", "row" : "2" }
		}
	},
	{
		uuid : "3b540d80-5bc6-464f-9452-09438de17745",
		name : "[아웃풋] 날짜 포맷 (3)",
		group : "아웃풋",
		label : "날짜 포맷 (3)",
		desc : "YYYY",
		width : 120,
		height : 26,
		node : {
			type : "output",
			props : { "datatype" : "date", "format" : "YYYY", "value" : "2022" },
			ld : { "kind" : "form", "col" : "1", "row" : "3" }
		}
	},
	{
		uuid : "9387a0f3-3bb6-4911-a783-8c0df8d0ab63",
		name : "[아웃풋] 날짜 포맷 (4)",
		group : "아웃풋",
		label : "날짜 포맷 (4)",
		desc : "YYYY-MM-DD HH:mm:ss",
		width : 120,
		height : 26,
		node : {
			type : "output",
			props : { "datatype" : "date", "format" : "YYYY-MM-DD HH:mm:ss", "value" : "20221231121212" },
			ld : { "kind" : "form", "col" : "1", "row" : "4" }
		}
	},
	{
		uuid : "81948831-28fc-4919-b214-866c1aaea251",
		name : "[아웃풋] 날짜 포맷 (5)",
		group : "아웃풋",
		label : "날짜 포맷 (5)",
		desc : "YYYY-MM-DD (ddd)",
		width : 120,
		height : 26,
		node : {
			type : "output",
			props : { "datatype" : "date", "format" : "YYYY-MM-DD (ddd)", "value" : "20220101" },
			ld : { "kind" : "form", "col" : "1", "row" : "5" }
		}
	},
	{
		uuid : "1bd7d761-a884-4746-8d7d-096a5b9c98a1",
		name : "[아웃풋] 단위 포맷",
		group : "아웃풋",
		label : "단위 포맷",
		desc : "단위를 변경할 경우 displayExp 속성을 통해 수정",
		width : 120,
		height : 26,
		node : {
			type : "output",
			props : { "displayexp" : "text + \"단위\"", "value" : "00" },
			ld : { "kind" : "form", "col" : "1", "row" : "18" }
		}
	},
	{
		uuid : "f2270d48-df22-4dba-9232-fc5a3c278a69",
		name : "[아웃풋] 마스킹 문자열 포맷",
		group : "아웃풋",
		label : "마스킹 문자열 포맷",
		desc : "",
		width : 120,
		height : 26,
		node : {
			type : "output",
			id : "opt66",
			props : { "format" : "000000-0******", "value" : "0000000000000" },
			ld : { "kind" : "form", "col" : "1", "row" : "20" }
		}
	},
	{
		uuid : "bf561763-3ae6-497e-8c67-9519feb10866",
		name : "[아웃풋] 밑줄",
		group : "아웃풋",
		label : "밑줄",
		desc : "[underline] 텍스트 밑줄",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "underline",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "14" }
		}
	},
	{
		uuid : "0acf360c-96c7-4eee-8f1f-bf800bc83cb4",
		name : "[아웃풋] 밑줄 해제",
		group : "아웃풋",
		label : "밑줄 해제",
		desc : "[no-underline] 텍스트 밑줄 해제",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "no-underline",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "17" }
		}
	},
	{
		uuid : "51988901-befd-4368-8487-21ccb2828d3d",
		name : "[아웃풋] 빈값",
		group : "아웃풋",
		label : "빈값",
		desc : "",
		width : 120,
		height : 26,
		node : {
			type : "output",
			props : { "value" : "" },
			ld : { "kind" : "form", "col" : "1", "row" : "1" }
		}
	},
	{
		uuid : "2fedbbde-9cb6-42cc-b3db-cdecffaaccce",
		name : "[아웃풋] 상측 정렬",
		group : "아웃풋",
		label : "상측 정렬",
		desc : "[align-top] 상측 정렬",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "align-top",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "5" }
		}
	},
	{
		uuid : "51209a27-edd3-46ad-ba64-a7e92eeda661",
		name : "[아웃풋] 상태",
		group : "아웃풋",
		label : "상태",
		desc : "[state-cell] 그리드에서 상태 컬럼으로 사용되는 컬럼의 디테일 셀에 행의 상태를 표시",
		width : 300,
		height : 26,
		node : {
			type : "output",
			cls : "state-cell",
			props : { "value" : "" },
			ld : { "kind" : "form", "col" : "1", "row" : "1" }
		}
	},
	{
		uuid : "de843ab2-c354-47a7-b10b-06bf2d7611bc",
		name : "[아웃풋] 세로 중앙 정렬",
		group : "아웃풋",
		label : "세로 중앙 정렬",
		desc : "[align-middle] 세로 중앙 정렬",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "align-middle",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "6" }
		}
	},
	{
		uuid : "88350e32-912a-4848-bc42-ee66cdd0918e",
		name : "[아웃풋] 숫자 포맷 (1)",
		group : "아웃풋",
		label : "숫자 포맷 (1)",
		desc : "[text-right] s#,##0",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-right",
			props : { "datatype" : "number", "format" : "s#,##0", "value" : "0" },
			ld : { "kind" : "form", "col" : "1", "row" : "1" }
		}
	},
	{
		uuid : "0ed268e2-e9af-4a7f-8c51-26af3b60ee89",
		name : "[아웃풋] 숫자 포맷 (2)",
		group : "아웃풋",
		label : "숫자 포맷 (2)",
		desc : "[text-right] s#,##9",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-right",
			props : { "datatype" : "number", "format" : "s#,##9", "value" : "0" },
			ld : { "kind" : "form", "col" : "1", "row" : "2" }
		}
	},
	{
		uuid : "08cc7ab1-9bd9-4e28-ba3a-026bdcde0c62",
		name : "[아웃풋] 숫자 포맷 (3)",
		group : "아웃풋",
		label : "숫자 포맷 (3)",
		desc : "[text-right] s#,##0.00",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-right",
			id : "opt54",
			props : { "datatype" : "number", "format" : "s#,##0.00", "value" : "0" },
			ld : { "kind" : "form", "col" : "1", "row" : "3" }
		}
	},
	{
		uuid : "a4cf7ab9-2a08-4889-82aa-868674b9904e",
		name : "[아웃풋] 숫자 포맷 (4)",
		group : "아웃풋",
		label : "숫자 포맷 (4)",
		desc : "[text-right] s#,##9.99",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-right",
			id : "opt55",
			props : { "datatype" : "number", "format" : "s#,##9.99", "value" : "0" },
			ld : { "kind" : "form", "col" : "1", "row" : "4" }
		}
	},
	{
		uuid : "6af7e61d-8a4b-4a41-973a-df22c1587d66",
		name : "[아웃풋] 숫자 포맷 (5)",
		group : "아웃풋",
		label : "숫자 포맷 (5)",
		desc : "[text-right] displayExp : text + \" 원\", 단위를 변경할 경우 displayExp 속성을 통해 수정",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-right",
			props : { "datatype" : "number", "displayexp" : "text + \" 원\"", "format" : "s#,##0", "value" : "0" },
			ld : { "kind" : "form", "col" : "1", "row" : "5" }
		}
	},
	{
		uuid : "36f9faf7-5af3-4358-9236-7a5d0a45d8c2",
		name : "[아웃풋] 숫자 포맷 (6)",
		group : "아웃풋",
		label : "숫자 포맷 (6)",
		desc : "[text-right] displayExp : \"₩ \" + text",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-right",
			id : "opt138",
			props : { "datatype" : "number", "displayexp" : "\"₩ \" + text", "format" : "s#,##0", "value" : "0" },
			ld : { "kind" : "form", "col" : "1", "row" : "6" }
		}
	},
	{
		uuid : "9ef508eb-05be-4b5a-94c8-a264864de481",
		name : "[아웃풋] 숫자 포맷 (7)",
		group : "아웃풋",
		label : "숫자 포맷 (7)",
		desc : "[text-right] displayExp : \"$ \" + text",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-right",
			id : "opt139",
			props : { "datatype" : "number", "displayexp" : "\"$ \" + text", "format" : "s#,##0", "value" : "0" },
			ld : { "kind" : "form", "col" : "1", "row" : "7" }
		}
	},
	{
		uuid : "f185d7d5-87c5-4803-934a-b20166854cf8",
		name : "[아웃풋] 숫자 포맷 (8)",
		group : "아웃풋",
		label : "숫자 포맷 (8)",
		desc : "[text-right] displayExp : text + \" %\"",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-right",
			props : { "datatype" : "number", "displayexp" : "text + \" %\"", "format" : "#,##0", "value" : "0" },
			ld : { "kind" : "form", "col" : "1", "row" : "8" }
		}
	},
	{
		uuid : "7e78a81b-a1e9-43e9-adc5-ca4c31380182",
		name : "[아웃풋] 우측 정렬",
		group : "아웃풋",
		label : "우측 정렬",
		desc : "[text-right] 숫자형 데이터에 적용하는 정렬",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-right",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "4" }
		}
	},
	{
		uuid : "600d11aa-950f-490c-a07c-b5bdc5d3cc0e",
		name : "[아웃풋] 윗줄",
		group : "아웃풋",
		label : "윗줄",
		desc : "[overline] 텍스트 윗줄",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "overline",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "15" }
		}
	},
	{
		uuid : "cc987a0f-6c38-402f-a708-0ea4edc4f551",
		name : "[아웃풋] 좌측 정렬",
		group : "아웃풋",
		label : "좌측 정렬",
		desc : "[text-left] 문자열 비정형 데이터에 적용하는 정렬",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "text-left",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "2" }
		}
	},
	{
		uuid : "6ca4b38b-25a1-4bf6-aedc-32cb7108302a",
		name : "[아웃풋] 주민등록번호 포맷",
		group : "아웃풋",
		label : "주민등록번호 포맷",
		desc : "",
		width : 120,
		height : 26,
		node : {
			type : "output",
			id : "opt60",
			props : { "format" : "000000-0000000", "value" : "0000000000000" },
			ld : { "kind" : "form", "col" : "1", "row" : "19" }
		}
	},
	{
		uuid : "5d481d88-f429-4d17-885f-c3fc135625b6",
		name : "[아웃풋] 지시문/안내문 (1)",
		group : "아웃풋",
		label : "지시문/안내문 (1)",
		desc : "[info-txt] 일반",
		width : 300,
		height : 20,
		node : {
			type : "output",
			cls : "info-txt",
			props : { "value" : "지시문/안내문은 \"info-txt\" 클래스를 적용합니다." },
			ld : { "kind" : "vertical", "autosize" : "height", "height" : "20px", "width" : "1223px" }
		}
	},
	{
		uuid : "70485a00-35ae-49aa-8a1c-4d70db2a7f4a",
		name : "[아웃풋] 지시문/안내문 (2)",
		group : "아웃풋",
		label : "지시문/안내문 (2)",
		desc : "[info-txt-highlighted] 강조",
		width : 300,
		height : 20,
		node : {
			type : "output",
			cls : "info-txt-highlighted",
			props : { "value" : "지시문/안내문은 \"info-txt\" 클래스를 적용합니다." },
			ld : { "kind" : "vertical", "autosize" : "height", "height" : "20px", "width" : "1223px" }
		}
	},
	{
		uuid : "4512654d-80e6-4bd4-88cb-722f8dd03b3d",
		name : "[아웃풋] 취소선",
		group : "아웃풋",
		label : "취소선",
		desc : "[line-through] 텍스트 취소선",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "line-through",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "16" }
		}
	},
	{
		uuid : "2a189c03-7c9f-4f1c-af4f-5bc14e1206e0",
		name : "[아웃풋] 하측 정렬",
		group : "아웃풋",
		label : "하측 정렬",
		desc : "[align-bottom] 하측 정렬",
		width : 120,
		height : 26,
		node : {
			type : "output",
			cls : "align-bottom",
			props : { "value" : "텍스트" },
			ld : { "kind" : "form", "col" : "1", "row" : "7" }
		}
	},
	{
		uuid : "180d4529-7bf8-457d-a2a5-5a8f8bccbbe1",
		name : "[인풋박스] 컨트롤 그룹 (1)",
		group : "인풋박스",
		label : "컨트롤 그룹 (1)",
		desc : "[form-control] 이메일",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "10", "shadecolor" : "transparent", "shadetype" : "NONE", "syncminlength" : "false", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "1", "syncminlength" : "true", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "1" },
			children : [
				{
					type : "inputbox",
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "output",
					props : { "value" : "@" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "inputbox",
					ld : { "kind" : "form", "col" : "2", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "3cb09572-a0ee-47e9-921c-dc152c0c9d22",
		name : "[인풋박스] 컨트롤 그룹 (2)",
		group : "인풋박스",
		label : "컨트롤 그룹 (2)",
		desc : "[form-control] 전화번호",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "shadecolor" : "transparent", "shadetype" : "NONE", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "10", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "shadecolor" : "transparent", "shadetype" : "NONE", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "10", "syncminlength" : "false", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "1", "syncminlength" : "true", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "2" },
			children : [
				{
					type : "inputbox",
					props : { "inputfilter" : "[0-9]", "maxlength" : "4" },
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "output",
					props : { "value" : "-" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "inputbox",
					props : { "inputfilter" : "[0-9]", "maxlength" : "4" },
					ld : { "kind" : "form", "col" : "2", "row" : "0" }
				},
				{
					type : "output",
					props : { "value" : "-" },
					ld : { "kind" : "form", "col" : "3", "row" : "0" }
				},
				{
					type : "inputbox",
					props : { "inputfilter" : "[0-9]", "maxlength" : "4" },
					ld : { "kind" : "form", "col" : "4", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "d0a501f0-a273-42ba-923f-dd5f2cfd514f",
		name : "[인풋박스] 컨트롤 그룹 (3)",
		group : "인풋박스",
		label : "컨트롤 그룹 (3)",
		desc : "[form-control] 주민등록번호",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "10", "syncminlength" : "false", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "1", "syncminlength" : "true", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "3" },
			children : [
				{
					type : "inputbox",
					props : { "inputfilter" : "[0-9]", "maxlength" : "6" },
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "output",
					props : { "value" : "-" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "inputbox",
					props : { "inputfilter" : "[0-9]", "maxlength" : "7", "secret" : "true" },
					ld : { "kind" : "form", "col" : "2", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "a8cdfbbd-1169-45cc-834f-150ff9628521",
		name : "[인풋박스] 컨트롤 그룹 (4)",
		group : "인풋박스",
		label : "컨트롤 그룹 (4)",
		desc : "[form-control] 이어지는 텍스트",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "10", "syncminlength" : "false", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "1", "syncminlength" : "true", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "4" },
			children : [
				{
					type : "inputbox",
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "output",
					props : { "value" : "-" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "inputbox",
					ld : { "kind" : "form", "col" : "2", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "c3482941-102e-4f07-82f8-f69a5e92bda9",
		name : "[인풋박스] 컨트롤 그룹 (6)",
		group : "인풋박스",
		label : "컨트롤 그룹 (6)",
		desc : "[form-control] 인풋박스 + 버튼",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "35", "shadecolor" : "transparent", "shadetype" : "NONE", "syncminlength" : "false", "unit" : "PIXEL" }],
			ld : { "kind" : "form", "col" : "1", "row" : "5" },
			children : [
				{
					type : "inputbox",
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "button",
					cls : "btn-inline",
					props : { "value" : "버튼" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "9a6a9b23-9613-45aa-a93b-29f8c3b97b58",
		name : "[체크박스] 빈값",
		group : "체크박스",
		label : "빈값",
		desc : "",
		width : 200,
		height : 26,
		node : {
			type : "checkbox",
			props : { "text" : "" },
			ld : { "kind" : "form", "col" : "1", "row" : "1" }
		}
	},
	{
		uuid : "e84f4651-0d5f-442c-98ba-aca79799cfa9",
		name : "[체크박스] 중앙정렬",
		group : "체크박스",
		label : "중앙정렬",
		desc : "[text-center] 폼에서 사용 (그리드 내 체크박스 및 체크박스그룹은 CSS에 의해 자동으로 중앙정렬됨)",
		width : 200,
		height : 26,
		node : {
			type : "checkbox",
			cls : "text-center",
			props : { "text" : "" },
			ld : { "kind" : "form", "col" : "1", "row" : "2" }
		}
	},
	{
		uuid : "22a07f29-fef6-44a8-83dc-4623c5721390",
		name : "[체크박스] 컨트롤 그룹 (1)",
		group : "체크박스",
		label : "컨트롤 그룹 (1)",
		desc : "[form-control] 체크박스 + 체크박스",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "flow", "hspacing" : "10", "scrollable" : "false" },
			ld : { "kind" : "form", "col" : "1", "row" : "3" },
			children : [
				{
					type : "checkbox",
					props : { "text" : "체크박스" },
					ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "65px" }
				},
				{
					type : "checkbox",
					props : { "text" : "체크박스" },
					ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "65px" }
				}
			]
		}
	},
	{
		uuid : "072537e7-74df-4ae6-9985-a888da151119",
		name : "[체크박스] 컨트롤 그룹 (2)",
		group : "체크박스",
		label : "컨트롤 그룹 (2)",
		desc : "[form-control] 체크박스 + 버튼",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "flow", "hspacing" : "10", "scrollable" : "false" },
			ld : { "kind" : "form", "col" : "1", "row" : "4" },
			children : [
				{
					type : "checkbox",
					props : { "text" : "체크박스" },
					ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "65px" }
				},
				{
					type : "button",
					cls : "btn-inline",
					props : { "value" : "버튼" },
					ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "64px" }
				}
			]
		}
	},
	{
		uuid : "4ea77f30-3ba3-4611-a362-1b3fb221046b",
		name : "[체크박스그룹] 고정 아이템",
		group : "체크박스그룹",
		label : "고정 아이템",
		desc : "colCount=0, fixedWidth=true",
		width : 400,
		height : 26,
		node : {
			type : "checkboxgroup",
			props : { "colcount" : "0", "fixedwidth" : "true" },
			ld : { "kind" : "form", "col" : "1", "row" : "1" },
			items : [{ "label" : "아이템", "value" : "value1" }, { "label" : "아이템", "value" : "value2" }, { "label" : "아이템", "value" : "value3" }]
		}
	},
	{
		uuid : "cf8acdb7-eb0f-455e-80f3-248818b5f6fc",
		name : "[체크박스그룹] 컨트롤 그룹 (1)",
		group : "체크박스그룹",
		label : "컨트롤 그룹 (1)",
		desc : "[form-control] 체크박스그룹 + 체크박스그룹",
		width : 400,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "flow", "hspacing" : "10", "scrollable" : "false" },
			ld : { "kind" : "form", "col" : "1", "row" : "2" },
			children : [
				{
					type : "checkboxgroup",
					ld : { "kind" : "flow", "autosize" : "both", "height" : "26px", "minheight" : "20", "width" : "200px" },
					items : [{ "label" : "아이템", "value" : "value1" }, { "label" : "아이템", "value" : "value2" }, { "label" : "아이템", "value" : "value3" }]
				},
				{
					type : "checkboxgroup",
					ld : { "kind" : "flow", "autosize" : "both", "height" : "26px", "minheight" : "20", "width" : "130px" },
					items : [{ "label" : "아이템", "value" : "value1" }, { "label" : "아이템", "value" : "value2" }]
				}
			]
		}
	},
	{
		uuid : "ab986a32-30d2-4615-88d2-9896543228df",
		name : "[체크박스그룹] 컨트롤 그룹 (2)",
		group : "체크박스그룹",
		label : "컨트롤 그룹 (2)",
		desc : "[form-control] 체크박스그룹 + 버튼",
		width : 400,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "flow", "hspacing" : "10", "scrollable" : "false" },
			ld : { "kind" : "form", "col" : "1", "row" : "3" },
			children : [
				{
					type : "checkboxgroup",
					ld : { "kind" : "flow", "autosize" : "both", "height" : "26px", "minheight" : "20", "width" : "200px" },
					items : [{ "label" : "아이템", "value" : "value1" }, { "label" : "아이템", "value" : "value2" }, { "label" : "아이템", "value" : "value3" }]
				},
				{
					type : "button",
					cls : "btn-inline",
					props : { "value" : "버튼" },
					ld : { "kind" : "flow", "autosize" : "width", "height" : "26px", "width" : "64px" }
				}
			]
		}
	},
	{
		uuid : "9c06a577-2fc0-4c34-b5fd-4fd37911c5ef",
		name : "[카드] 일반",
		group : "카드",
		label : "일반",
		desc : "[card]",
		width : 1091,
		height : 150,
		node : {
			type : "group",
			cls : "card",
			layout : { "kind" : "vertical", "scrollable" : "false" },
			ld : { "kind" : "vertical", "autosize" : "height", "height" : "150px", "width" : "1091px" }
		}
	},
	{
		uuid : "eb5323ac-ca81-448f-b148-620d31527e47",
		name : "[콘텐츠] 그리드",
		group : "콘텐츠",
		label : "그리드",
		desc : "[content]",
		width : 1580,
		height : 234,
		node : {
			type : "group",
			cls : "content",
			layout : { "kind" : "vertical", "scrollable" : "false" },
			ld : { "kind" : "vertical", "height" : "234px", "width" : "1064px" },
			children : [
				{
					type : "group",
					cls : "content-title-box",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "0px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "autoSizing" : "true", "length" : "200", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }],
					ld : { "kind" : "vertical", "autosize" : "none", "height" : "26px", "width" : "1064px" },
					children : [
						{
							type : "udc",
							id : "udccomgridtitle2",
							props : { "type" : "udc.com.udcComGridTitle" },
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "group",
							cls : "title-button-group",
							layout : { "kind" : "flow", "halign" : "right", "scrollable" : "false" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" },
							children : [
								{
									type : "udc",
									id : "udccomgridcudbtns3",
									props : { "type" : "udc.com.udcComGridCudBtns" },
									ld : { "kind" : "flow", "allownewline" : "false", "autosize" : "width", "height" : "26px", "width" : "230px" }
								}
							]
						}
					]
				},
				{
					type : "grid",
					ld : { "kind" : "vertical", "autosize" : "none", "height" : "200px", "width" : "1064px" },
					gridCols : 5
				}
			]
		}
	},
	{
		uuid : "b116bc97-03fd-44a4-9134-81b17ddff2b4",
		name : "[콘텐츠] 그리드 타이틀",
		group : "콘텐츠",
		label : "그리드 타이틀",
		desc : "[content-title-box]",
		width : 1580,
		height : 26,
		node : {
			type : "group",
			cls : "content-title-box",
			layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "autoSizing" : "true", "length" : "200", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }],
			ld : { "kind" : "vertical", "height" : "26px", "width" : "1064px" },
			children : [
				{
					type : "udc",
					id : "udccomgridtitle1",
					props : { "type" : "udc.com.udcComGridTitle" },
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "group",
					cls : "title-button-group",
					layout : { "kind" : "flow", "halign" : "right", "scrollable" : "false" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" },
					children : [
						{
							type : "udc",
							id : "udccomgridcudbtns1",
							props : { "type" : "udc.com.udcComGridCudBtns" },
							ld : { "kind" : "flow", "allownewline" : "false", "autosize" : "width", "height" : "26px", "width" : "230px" }
						}
					]
				}
			]
		}
	},
	{
		uuid : "ccc8e728-c055-4019-927c-1b5885565986",
		name : "[콘텐츠] 폼",
		group : "콘텐츠",
		label : "폼",
		desc : "[content]",
		width : 1580,
		height : 191,
		node : {
			type : "group",
			cls : "content",
			layout : { "kind" : "vertical", "scrollable" : "false" },
			ld : { "kind" : "vertical", "height" : "191px", "width" : "1064px" },
			children : [
				{
					type : "group",
					cls : "content-title-box",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "0px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "autoSizing" : "true", "length" : "200", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }],
					ld : { "kind" : "vertical", "autosize" : "none", "height" : "26px", "width" : "1064px" },
					children : [
						{
							type : "udc",
							id : "udccomformtitle3",
							props : { "type" : "udc.com.udcComFormTitle" },
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "group",
							cls : "title-button-group",
							layout : { "kind" : "flow", "halign" : "right", "scrollable" : "false" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" },
							children : [
								{
									type : "udc",
									id : "udccomgridcudbtns5",
									props : { "type" : "udc.com.udcComGridCudBtns" },
									ld : { "kind" : "flow", "allownewline" : "false", "autosize" : "width", "height" : "26px", "width" : "230px" }
								}
							]
						}
					]
				},
				{
					type : "group",
					cls : "form-base",
					layout : { "kind" : "form", "bottom-margin" : "6px", "hseparatortype" : "BY_CLASS", "hseparatorwidth" : "1", "hspace" : "17px", "left-margin" : "8px", "right-margin" : "8px", "scrollable" : "false", "top-margin" : "6px", "vspace" : "13px" },
					rows : [{ "length" : "26", "unit" : "PIXEL" }, { "length" : "26", "unit" : "PIXEL" }, { "length" : "26", "unit" : "PIXEL" }, { "length" : "26", "unit" : "PIXEL" }],
					columns : [{ "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }],
					ld : { "kind" : "vertical", "autosize" : "none", "height" : "157px", "width" : "1064px" },
					children : [
						{
							type : "output",
							cls : "label",
							props : { "value" : "항목" },
							ld : { "kind" : "form", "col" : "0", "ignore-layout-spacing" : "true", "row" : "0" }
						},
						{
							type : "output",
							props : { "value" : "데이터" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						},
						{
							type : "output",
							cls : "label",
							props : { "value" : "항목" },
							ld : { "kind" : "form", "col" : "2", "ignore-layout-spacing" : "true", "row" : "0" }
						},
						{
							type : "output",
							cls : "text-right",
							props : { "datatype" : "number", "format" : "s#,##0", "value" : "1234567890" },
							ld : { "kind" : "form", "col" : "3", "row" : "0" }
						},
						{
							type : "output",
							cls : "label",
							props : { "value" : "항목" },
							ld : { "kind" : "form", "col" : "4", "ignore-layout-spacing" : "true", "row" : "0" }
						},
						{
							type : "output",
							props : { "datatype" : "date", "format" : "YYYY-MM-DD", "value" : "20241231" },
							ld : { "kind" : "form", "col" : "5", "row" : "0" }
						},
						{
							type : "output",
							cls : "label",
							props : { "value" : "항목" },
							ld : { "kind" : "form", "col" : "0", "ignore-layout-spacing" : "true", "row" : "1" }
						},
						{
							type : "inputbox",
							ld : { "kind" : "form", "col" : "1", "row" : "1" }
						},
						{
							type : "output",
							cls : "label",
							props : { "value" : "항목" },
							ld : { "kind" : "form", "col" : "2", "ignore-layout-spacing" : "true", "row" : "1" }
						},
						{
							type : "group",
							cls : "form-control",
							layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
							rows : [{ "length" : "1", "unit" : "FRACTION" }],
							columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "80", "syncminlength" : "false", "unit" : "PIXEL" }],
							ld : { "kind" : "form", "col" : "3", "row" : "1" },
							children : [
								{
									type : "inputbox",
									ld : { "kind" : "form", "col" : "0", "row" : "0" }
								},
								{
									type : "checkbox",
									props : { "text" : "체크박스" },
									ld : { "kind" : "form", "col" : "1", "row" : "0" }
								}
							]
						},
						{
							type : "output",
							cls : "label",
							props : { "value" : "항목" },
							ld : { "kind" : "form", "col" : "4", "ignore-layout-spacing" : "true", "row" : "1" }
						},
						{
							type : "group",
							cls : "form-control",
							layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
							rows : [{ "length" : "1", "unit" : "FRACTION" }],
							columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "66", "syncminlength" : "false", "unit" : "PIXEL" }],
							ld : { "kind" : "form", "col" : "5", "row" : "1" },
							children : [
								{
									type : "inputbox",
									ld : { "kind" : "form", "col" : "0", "row" : "0" }
								},
								{
									type : "button",
									cls : "btn-inline",
									props : { "value" : "테이블버튼" },
									ld : { "kind" : "form", "col" : "1", "row" : "0" }
								}
							]
						},
						{
							type : "output",
							cls : "label",
							props : { "value" : "항목" },
							ld : { "kind" : "form", "col" : "0", "ignore-layout-spacing" : "true", "row" : "2" }
						},
						{
							type : "numbereditor",
							ld : { "kind" : "form", "col" : "1", "row" : "2" }
						},
						{
							type : "output",
							cls : "label",
							props : { "value" : "항목" },
							ld : { "kind" : "form", "col" : "2", "ignore-layout-spacing" : "true", "row" : "2" }
						},
						{
							type : "dateinput",
							props : { "value" : "20241231" },
							ld : { "kind" : "form", "col" : "3", "halign" : "LEFT", "row" : "2", "width" : "110" }
						},
						{
							type : "output",
							cls : "label",
							props : { "value" : "항목" },
							ld : { "kind" : "form", "col" : "4", "ignore-layout-spacing" : "true", "row" : "2" }
						},
						{
							type : "group",
							cls : "form-control",
							layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
							rows : [{ "length" : "1", "unit" : "FRACTION" }],
							columns : [{ "length" : "110", "shadecolor" : "transparent", "shadetype" : "NONE", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "50", "syncminlength" : "false", "unit" : "PIXEL" }],
							ld : { "kind" : "form", "col" : "5", "row" : "2" },
							children : [
								{
									type : "numbereditor",
									ld : { "kind" : "form", "col" : "0", "row" : "0" }
								},
								{
									type : "output",
									props : { "value" : "원" },
									ld : { "kind" : "form", "col" : "1", "row" : "0" }
								}
							]
						},
						{
							type : "output",
							cls : "label",
							props : { "value" : "항목" },
							ld : { "kind" : "form", "col" : "0", "ignore-layout-spacing" : "true", "row" : "3" }
						},
						{
							type : "group",
							cls : "form-control",
							layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
							rows : [{ "length" : "1", "unit" : "FRACTION" }],
							columns : [{ "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "length" : "1", "unit" : "FRACTION" }],
							ld : { "kind" : "form", "col" : "1", "colspan" : "5", "row" : "3", "rowspan" : "1" },
							children : [
								{
									type : "searchinput",
									ld : { "kind" : "form", "col" : "0", "row" : "0" }
								},
								{
									type : "inputbox",
									ld : { "kind" : "form", "col" : "1", "row" : "0" }
								},
								{
									type : "inputbox",
									ld : { "kind" : "form", "col" : "2", "row" : "0" }
								}
							]
						}
					]
				}
			]
		}
	},
	{
		uuid : "59042279-5672-436a-9140-2aece17954cd",
		name : "[콘텐츠] 폼 타이틀",
		group : "콘텐츠",
		label : "폼 타이틀",
		desc : "[content-title-box]",
		width : 1580,
		height : 26,
		node : {
			type : "group",
			cls : "content-title-box",
			layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "autoSizing" : "true", "length" : "200", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }],
			ld : { "kind" : "vertical", "height" : "26px", "width" : "1064px" },
			children : [
				{
					type : "udc",
					id : "udccomformtitle1",
					props : { "type" : "udc.com.udcComFormTitle" },
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "group",
					cls : "title-button-group",
					layout : { "kind" : "flow", "halign" : "right", "scrollable" : "false" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" },
					children : [
						{
							type : "udc",
							id : "udccomgridcudbtns2",
							props : { "type" : "udc.com.udcComGridCudBtns" },
							ld : { "kind" : "flow", "allownewline" : "false", "autosize" : "width", "height" : "26px", "width" : "230px" }
						}
					]
				}
			]
		}
	},
	{
		uuid : "53d4207d-7537-430b-bd46-1371cddbcfc5",
		name : "[콤보박스] 컨트롤 그룹",
		group : "콤보박스",
		label : "컨트롤 그룹",
		desc : "[form-control]",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "shadecolor" : "transparent", "shadetype" : "NONE", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "shadecolor" : "transparent", "shadetype" : "NONE", "unit" : "FRACTION" }, { "autoSizing" : "false", "length" : "1", "syncminlength" : "true", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "1" },
			children : [
				{
					type : "combobox",
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "combobox",
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "a2d665a6-8cae-4b64-8c8d-51e5f113c1be",
		name : "[탭폴더] 아이콘 탭",
		group : "탭폴더",
		label : "아이콘 탭",
		desc : "[tab]",
		width : 1045,
		height : 200,
		node : {
			type : "tabfolder",
			cls : "tab",
			props : { "headerarrowvisible" : "show" },
			ld : { "kind" : "form", "col" : "1", "row" : "2" },
			children : [
				{
					type : "tabitem",
					props : { "text" : "아이템", "selected" : "true" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				}
			]
		}
	},
	{
		uuid : "6df393fb-8121-42d4-b59f-8cdd788d628c",
		name : "[탭폴더] 일반",
		group : "탭폴더",
		label : "일반",
		desc : "",
		width : 1045,
		height : 200,
		node : {
			type : "tabfolder",
			props : { "headerarrowvisible" : "show" },
			ld : { "kind" : "form", "col" : "1", "row" : "1" },
			children : [
				{
					type : "tabitem",
					props : { "text" : "아이템", "selected" : "true" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				},
				{
					type : "tabitem",
					props : { "text" : "아이템" },
					children : [
						{
							type : "group",
							layout : { "kind" : "vertical", "spacing" : "12" }
						}
					]
				}
			]
		}
	},
	{
		uuid : "26018776-4707-4c5f-831f-5f44e3f4c483",
		name : "[텍스트에리어] 길이 제한 텍스트에리어",
		group : "텍스트에리어",
		label : "길이 제한 텍스트에리어",
		desc : "[form-control]",
		width : 469,
		height : 81,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "60", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "18", "syncminlength" : "false", "unit" : "PIXEL" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "0" },
			children : [
				{
					type : "textarea",
					id : "txa",
					props : { "maxlength" : "80" },
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "output",
					cls : "txt-byte text-right",
					id : "optTxt",
					props : { "displayexp" : "#txa.length + \"/\" + #txa.maxLength + \" Bytes\"", "value" : "Output" },
					ld : { "kind" : "form", "col" : "0", "row" : "1" }
				}
			]
		}
	},
	{
		uuid : "46410091-7999-46c5-87bf-be4baffd1552",
		name : "[파일인풋] 컨트롤 그룹",
		group : "파일인풋",
		label : "컨트롤 그룹",
		desc : "[form-control]",
		width : 300,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "autoSizing" : "false", "hidden" : "false", "length" : "1", "minlength" : "0", "shadecolor" : "#000000", "shadetype" : "NONE", "unit" : "FRACTION" }, { "autoSizing" : "true", "hidden" : "false", "length" : "63", "minlength" : "0", "shadecolor" : "#000000", "shadetype" : "NONE", "syncminlength" : "false", "unit" : "PIXEL" }, { "autoSizing" : "true", "hidden" : "false", "length" : "108", "minlength" : "0", "syncminlength" : "false", "unit" : "PIXEL" }],
			ld : { "kind" : "form", "col" : "1", "row" : "1" },
			children : [
				{
					type : "fileinput",
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "button",
					cls : "btn-inline",
					props : { "value" : "파일찾기" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "button",
					cls : "btn-excel",
					props : { "icon" : "0", "value" : "엑셀다운로드" },
					ld : { "kind" : "form", "col" : "2", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "eed3d45b-9210-4163-bb90-350094815165",
		name : "[폼] 라벨",
		group : "폼",
		label : "라벨",
		desc : "[label] 폼의 라벨",
		width : 120,
		height : 38,
		node : {
			type : "output",
			cls : "label",
			props : { "value" : "항목" },
			ld : { "kind" : "form", "col" : "0", "row" : "0" }
		}
	},
	{
		uuid : "c1b08fd3-c5c2-4e14-86cc-afb4be24ed3e",
		name : "[폼] 서브 라벨",
		group : "폼",
		label : "서브 라벨",
		desc : "[sub-label] 폼의 서브 라벨",
		width : 120,
		height : 38,
		node : {
			type : "output",
			cls : "sub-label",
			props : { "value" : "항목" },
			ld : { "kind" : "form", "col" : "0", "row" : "0" }
		}
	},
	{
		uuid : "c27293ac-7f6d-4c87-80a0-6727ace8bceb",
		name : "[폼] 입력행 (1행)",
		group : "폼",
		label : "입력행 (1행)",
		desc : "[form-base]",
		width : 1091,
		height : 40,
		node : {
			type : "group",
			cls : "form-base",
			layout : { "kind" : "form", "bottom-margin" : "6px", "hseparatortype" : "BY_CLASS", "hseparatorwidth" : "1", "hspace" : "17px", "left-margin" : "8px", "right-margin" : "8px", "scrollable" : "false", "top-margin" : "6px", "vspace" : "13px" },
			rows : [{ "length" : "26", "unit" : "PIXEL" }],
			columns : [{ "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }],
			ld : { "kind" : "vertical", "autosize" : "none", "height" : "40px", "width" : "1042px" },
			children : [
				{
					type : "output",
					cls : "label required",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "0", "ignore-layout-spacing" : "true", "row" : "0" }
				},
				{
					type : "output",
					props : { "value" : "데이터" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "2", "ignore-layout-spacing" : "true", "row" : "0" }
				},
				{
					type : "output",
					cls : "text-right",
					props : { "datatype" : "number", "format" : "s#,##0", "value" : "1234567890" },
					ld : { "kind" : "form", "col" : "3", "row" : "0" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "4", "ignore-layout-spacing" : "true", "row" : "0" }
				},
				{
					type : "output",
					props : { "datatype" : "date", "format" : "YYYY-MM-DD", "value" : "20241231" },
					ld : { "kind" : "form", "col" : "5", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "366dae4c-60bb-4dca-a4b9-e7518d1fec2b",
		name : "[폼] 입력행 (2행)",
		group : "폼",
		label : "입력행 (2행)",
		desc : "[form-base]",
		width : 1091,
		height : 79,
		node : {
			type : "group",
			cls : "form-base",
			layout : { "kind" : "form", "bottom-margin" : "6px", "hseparatortype" : "BY_CLASS", "hseparatorwidth" : "1", "hspace" : "17px", "left-margin" : "8px", "right-margin" : "8px", "scrollable" : "false", "top-margin" : "6px", "vspace" : "13px" },
			rows : [{ "length" : "26", "unit" : "PIXEL" }, { "length" : "26", "unit" : "PIXEL" }],
			columns : [{ "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }],
			ld : { "kind" : "vertical", "autosize" : "none", "height" : "79px", "width" : "1042px" },
			children : [
				{
					type : "output",
					cls : "label required",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "0", "ignore-layout-spacing" : "true", "row" : "0" }
				},
				{
					type : "output",
					props : { "value" : "데이터" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "2", "ignore-layout-spacing" : "true", "row" : "0" }
				},
				{
					type : "output",
					cls : "text-right",
					props : { "datatype" : "number", "format" : "s#,##0", "value" : "1234567890" },
					ld : { "kind" : "form", "col" : "3", "row" : "0" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "4", "ignore-layout-spacing" : "true", "row" : "0" }
				},
				{
					type : "output",
					props : { "datatype" : "date", "format" : "YYYY-MM-DD", "value" : "20241231" },
					ld : { "kind" : "form", "col" : "5", "row" : "0" }
				},
				{
					type : "output",
					cls : "label required",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "0", "ignore-layout-spacing" : "true", "row" : "1" }
				},
				{
					type : "inputbox",
					ld : { "kind" : "form", "col" : "1", "row" : "1" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "2", "ignore-layout-spacing" : "true", "row" : "1" }
				},
				{
					type : "group",
					cls : "form-control",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "80", "syncminlength" : "false", "unit" : "PIXEL" }],
					ld : { "kind" : "form", "col" : "3", "row" : "1" },
					children : [
						{
							type : "inputbox",
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "checkbox",
							props : { "text" : "체크박스" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						}
					]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "4", "ignore-layout-spacing" : "true", "row" : "1" }
				},
				{
					type : "group",
					cls : "form-control",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "66", "syncminlength" : "false", "unit" : "PIXEL" }],
					ld : { "kind" : "form", "col" : "5", "row" : "1" },
					children : [
						{
							type : "inputbox",
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "button",
							cls : "btn-inline",
							props : { "value" : "테이블버튼" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						}
					]
				}
			]
		}
	},
	{
		uuid : "087f0a79-d176-4fa0-8c73-6ddcb366a9bb",
		name : "[폼] 입력행 (3행)",
		group : "폼",
		label : "입력행 (3행)",
		desc : "[search-box]",
		width : 1091,
		height : 118,
		node : {
			type : "group",
			cls : "form-base",
			layout : { "kind" : "form", "bottom-margin" : "6px", "hseparatortype" : "BY_CLASS", "hseparatorwidth" : "1", "hspace" : "17px", "left-margin" : "8px", "right-margin" : "8px", "scrollable" : "false", "top-margin" : "6px", "vspace" : "13px" },
			rows : [{ "length" : "26", "unit" : "PIXEL" }, { "length" : "26", "unit" : "PIXEL" }, { "length" : "26", "unit" : "PIXEL" }],
			columns : [{ "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "120", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }],
			ld : { "kind" : "vertical", "autosize" : "none", "height" : "118px", "width" : "1042px" },
			children : [
				{
					type : "output",
					cls : "label required",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "0", "ignore-layout-spacing" : "true", "row" : "0" }
				},
				{
					type : "output",
					props : { "value" : "데이터" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "2", "ignore-layout-spacing" : "true", "row" : "0" }
				},
				{
					type : "output",
					cls : "text-right",
					props : { "datatype" : "number", "format" : "s#,##0", "value" : "1234567890" },
					ld : { "kind" : "form", "col" : "3", "row" : "0" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "4", "ignore-layout-spacing" : "true", "row" : "0" }
				},
				{
					type : "output",
					props : { "datatype" : "date", "format" : "YYYY-MM-DD", "value" : "20241231" },
					ld : { "kind" : "form", "col" : "5", "row" : "0" }
				},
				{
					type : "output",
					cls : "label required",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "0", "ignore-layout-spacing" : "true", "row" : "1" }
				},
				{
					type : "inputbox",
					ld : { "kind" : "form", "col" : "1", "row" : "1" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "2", "ignore-layout-spacing" : "true", "row" : "1" }
				},
				{
					type : "group",
					cls : "form-control",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "80", "syncminlength" : "false", "unit" : "PIXEL" }],
					ld : { "kind" : "form", "col" : "3", "row" : "1" },
					children : [
						{
							type : "inputbox",
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "checkbox",
							props : { "text" : "체크박스" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						}
					]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "4", "ignore-layout-spacing" : "true", "row" : "1" }
				},
				{
					type : "group",
					cls : "form-control",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "66", "syncminlength" : "false", "unit" : "PIXEL" }],
					ld : { "kind" : "form", "col" : "5", "row" : "1" },
					children : [
						{
							type : "inputbox",
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "button",
							cls : "btn-inline",
							props : { "value" : "테이블버튼" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						}
					]
				},
				{
					type : "output",
					cls : "label required",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "0", "ignore-layout-spacing" : "true", "row" : "2" }
				},
				{
					type : "numbereditor",
					ld : { "kind" : "form", "col" : "1", "row" : "2" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "2", "ignore-layout-spacing" : "true", "row" : "2" }
				},
				{
					type : "dateinput",
					props : { "value" : "20241231" },
					ld : { "kind" : "form", "col" : "3", "halign" : "LEFT", "row" : "2", "width" : "110" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "항목" },
					ld : { "kind" : "form", "col" : "4", "ignore-layout-spacing" : "true", "row" : "2" }
				},
				{
					type : "group",
					cls : "form-control",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "110", "shadecolor" : "transparent", "shadetype" : "NONE", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "50", "syncminlength" : "false", "unit" : "PIXEL" }],
					ld : { "kind" : "form", "col" : "5", "row" : "2" },
					children : [
						{
							type : "numbereditor",
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "output",
							props : { "value" : "원" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						}
					]
				}
			]
		}
	},
	{
		uuid : "9d275920-2a28-43f5-af8d-db35540278fa",
		name : "[폼] 조회 (1행)",
		group : "폼",
		label : "조회 (1행)",
		desc : "[search-box]",
		width : 1580,
		height : 50,
		node : {
			type : "group",
			cls : "search-box",
			id : "grpSearch",
			layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "8px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "8px" },
			rows : [{ "length" : "26", "unit" : "PIXEL" }],
			columns : [{ "autoSizing" : "true", "length" : "110", "minlength" : "70", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "110", "minlength" : "70", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "110", "minlength" : "70", "shadecolor" : "transparent", "shadetype" : "NONE", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "minlength" : "0", "shadecolor" : "transparent", "shadetype" : "NONE", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "110", "minlength" : "70", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "minlength" : "0", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "63", "syncminlength" : "true", "unit" : "PIXEL" }],
			ld : { "kind" : "vertical", "autosize" : "height", "height" : "50px", "width" : "1580px" },
			children : [
				{
					type : "output",
					cls : "label required",
					props : { "value" : "인풋박스" },
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "inputbox",
					cls : "required",
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "output",
					cls : "label required",
					props : { "value" : "콤보박스" },
					ld : { "kind" : "form", "col" : "2", "row" : "0" }
				},
				{
					type : "combobox",
					cls : "required",
					ld : { "kind" : "form", "col" : "3", "row" : "0" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "주민등록번호" },
					ld : { "kind" : "form", "col" : "4", "row" : "0" }
				},
				{
					type : "group",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "100", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "6", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "100", "unit" : "PIXEL" }],
					ld : { "kind" : "form", "col" : "5", "row" : "0" },
					children : [
						{
							type : "inputbox",
							props : { "inputfilter" : "[0-9]", "maxlength" : "6" },
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "output",
							props : { "value" : "-" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						},
						{
							type : "inputbox",
							props : { "inputfilter" : "[0-9]", "maxlength" : "7" },
							ld : { "kind" : "form", "col" : "2", "row" : "0" }
						}
					]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "데이트인풋" },
					ld : { "kind" : "form", "col" : "6", "row" : "0" }
				},
				{
					type : "dateinput",
					props : { "value" : "20241231" },
					ld : { "kind" : "form", "col" : "7", "halign" : "LEFT", "row" : "0", "width" : "110" }
				},
				{
					type : "button",
					cls : "btn-search",
					id : "btnSearch",
					props : { "icon" : "../theme/images/controls/button/ic_btn_blank.svg", "value" : "조회" },
					ld : { "kind" : "form", "col" : "8", "row" : "0", "width" : "63" }
				}
			]
		}
	},
	{
		uuid : "e96b2545-9dc1-416b-b5b1-8dca8c8f086a",
		name : "[폼] 조회 (2행)",
		group : "폼",
		label : "조회 (2행)",
		desc : "[search-box]",
		width : 1580,
		height : 84,
		node : {
			type : "group",
			cls : "search-box",
			id : "grpSearch",
			layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "8px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "8px" },
			rows : [{ "length" : "26", "unit" : "PIXEL" }, { "length" : "26", "unit" : "PIXEL" }],
			columns : [{ "autoSizing" : "true", "length" : "110", "minlength" : "70", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "110", "minlength" : "70", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "110", "minlength" : "70", "shadecolor" : "transparent", "shadetype" : "NONE", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "shadecolor" : "transparent", "shadetype" : "NONE", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "110", "minlength" : "70", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "63", "syncminlength" : "true", "unit" : "PIXEL" }],
			ld : { "kind" : "vertical", "autosize" : "height", "height" : "84px", "width" : "1580px" },
			children : [
				{
					type : "output",
					cls : "label required",
					props : { "value" : "인풋박스" },
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "inputbox",
					cls : "required",
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "output",
					cls : "label required",
					props : { "value" : "콤보박스" },
					ld : { "kind" : "form", "col" : "2", "row" : "0" }
				},
				{
					type : "combobox",
					cls : "required",
					ld : { "kind" : "form", "col" : "3", "row" : "0" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "주민등록번호" },
					ld : { "kind" : "form", "col" : "4", "row" : "0" }
				},
				{
					type : "group",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "100", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "6", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "100", "unit" : "PIXEL" }],
					ld : { "kind" : "form", "col" : "5", "row" : "0" },
					children : [
						{
							type : "inputbox",
							props : { "inputfilter" : "[0-9]", "maxlength" : "6" },
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "output",
							props : { "value" : "-" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						},
						{
							type : "inputbox",
							props : { "inputfilter" : "[0-9]", "maxlength" : "7" },
							ld : { "kind" : "form", "col" : "2", "row" : "0" }
						}
					]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "데이트인풋" },
					ld : { "kind" : "form", "col" : "6", "row" : "0" }
				},
				{
					type : "dateinput",
					props : { "value" : "20241231" },
					ld : { "kind" : "form", "col" : "7", "halign" : "LEFT", "row" : "0", "width" : "110" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "서치인풋" },
					ld : { "kind" : "form", "col" : "0", "row" : "1" }
				},
				{
					type : "searchinput",
					ld : { "kind" : "form", "col" : "1", "row" : "1" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "라디오버튼" },
					ld : { "kind" : "form", "col" : "2", "row" : "1" }
				},
				{
					type : "radiobutton",
					props : { "value" : "value1" },
					ld : { "kind" : "form", "col" : "3", "row" : "1" },
					items : [{ "label" : "예", "value" : "value1" }, { "label" : "아니오", "value" : "value2" }]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "체크박스그룹" },
					ld : { "kind" : "form", "col" : "4", "row" : "1" }
				},
				{
					type : "checkboxgroup",
					ld : { "kind" : "form", "col" : "5", "row" : "1" },
					items : [{ "label" : "아이템", "value" : "value1" }, { "label" : "아이템", "value" : "value2" }, { "label" : "아이템", "value" : "value3" }]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "데이트인풋" },
					ld : { "kind" : "form", "col" : "6", "row" : "1" }
				},
				{
					type : "group",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "110", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "6", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "110", "unit" : "PIXEL" }],
					ld : { "kind" : "form", "col" : "7", "row" : "1" },
					children : [
						{
							type : "dateinput",
							props : { "value" : "20241231" },
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "output",
							props : { "value" : "-" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						},
						{
							type : "dateinput",
							props : { "value" : "20241231" },
							ld : { "kind" : "form", "col" : "2", "row" : "0" }
						}
					]
				},
				{
					type : "button",
					cls : "btn-search",
					id : "btnSearch",
					props : { "icon" : "../theme/images/controls/button/ic_btn_blank.svg", "value" : "조회" },
					ld : { "kind" : "form", "col" : "8", "row" : "1", "width" : "63" }
				}
			]
		}
	},
	{
		uuid : "262f53ee-6273-4f4f-841e-c14efad28f44",
		name : "[폼] 조회 (3행)",
		group : "폼",
		label : "조회 (3행)",
		desc : "[search-box]",
		width : 1580,
		height : 118,
		node : {
			type : "group",
			cls : "search-box",
			id : "grpSearch",
			layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "8px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "8px" },
			rows : [{ "length" : "26", "unit" : "PIXEL" }, { "length" : "26", "unit" : "PIXEL" }, { "length" : "26", "unit" : "PIXEL" }],
			columns : [{ "autoSizing" : "true", "length" : "110", "minlength" : "70", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "110", "minlength" : "70", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "110", "minlength" : "70", "shadecolor" : "transparent", "shadetype" : "NONE", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "shadecolor" : "transparent", "shadetype" : "NONE", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "110", "minlength" : "70", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "63", "syncminlength" : "true", "unit" : "PIXEL" }],
			ld : { "kind" : "vertical", "autosize" : "height", "height" : "118px", "width" : "1580px" },
			children : [
				{
					type : "output",
					cls : "label required",
					props : { "value" : "인풋박스" },
					ld : { "kind" : "form", "col" : "0", "row" : "0" }
				},
				{
					type : "inputbox",
					cls : "required",
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				},
				{
					type : "output",
					cls : "label required",
					props : { "value" : "콤보박스" },
					ld : { "kind" : "form", "col" : "2", "row" : "0" }
				},
				{
					type : "combobox",
					cls : "required",
					ld : { "kind" : "form", "col" : "3", "row" : "0" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "주민등록번호" },
					ld : { "kind" : "form", "col" : "4", "row" : "0" }
				},
				{
					type : "group",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "100", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "6", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "100", "unit" : "PIXEL" }],
					ld : { "kind" : "form", "col" : "5", "row" : "0" },
					children : [
						{
							type : "inputbox",
							props : { "inputfilter" : "[0-9]", "maxlength" : "6" },
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "output",
							props : { "value" : "-" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						},
						{
							type : "inputbox",
							props : { "inputfilter" : "[0-9]", "maxlength" : "7" },
							ld : { "kind" : "form", "col" : "2", "row" : "0" }
						}
					]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "데이트인풋" },
					ld : { "kind" : "form", "col" : "6", "row" : "0" }
				},
				{
					type : "dateinput",
					props : { "value" : "20241231" },
					ld : { "kind" : "form", "col" : "7", "halign" : "LEFT", "row" : "0", "width" : "110" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "서치인풋" },
					ld : { "kind" : "form", "col" : "0", "row" : "1" }
				},
				{
					type : "searchinput",
					ld : { "kind" : "form", "col" : "1", "row" : "1" }
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "라디오버튼" },
					ld : { "kind" : "form", "col" : "2", "row" : "1" }
				},
				{
					type : "radiobutton",
					props : { "value" : "value1" },
					ld : { "kind" : "form", "col" : "3", "row" : "1" },
					items : [{ "label" : "예", "value" : "value1" }, { "label" : "아니오", "value" : "value2" }]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "체크박스그룹" },
					ld : { "kind" : "form", "col" : "4", "row" : "1" }
				},
				{
					type : "checkboxgroup",
					ld : { "kind" : "form", "col" : "5", "row" : "1" },
					items : [{ "label" : "아이템", "value" : "value1" }, { "label" : "아이템", "value" : "value2" }, { "label" : "아이템", "value" : "value3" }]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "데이트인풋" },
					ld : { "kind" : "form", "col" : "6", "row" : "1" }
				},
				{
					type : "group",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "110", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "6", "syncminlength" : "false", "unit" : "PIXEL" }, { "length" : "110", "unit" : "PIXEL" }],
					ld : { "kind" : "form", "col" : "7", "row" : "1" },
					children : [
						{
							type : "dateinput",
							props : { "value" : "20241231" },
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "output",
							props : { "value" : "-" },
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						},
						{
							type : "dateinput",
							props : { "value" : "20241231" },
							ld : { "kind" : "form", "col" : "2", "row" : "0" }
						}
					]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "검색어" },
					ld : { "kind" : "form", "col" : "0", "row" : "2" }
				},
				{
					type : "group",
					layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "4px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "4px" },
					rows : [{ "length" : "1", "unit" : "FRACTION" }],
					columns : [{ "length" : "200", "unit" : "PIXEL" }, { "length" : "1", "unit" : "FRACTION" }],
					ld : { "kind" : "form", "col" : "1", "colspan" : "5", "row" : "2", "rowspan" : "1" },
					children : [
						{
							type : "combobox",
							ld : { "kind" : "form", "col" : "0", "row" : "0" }
						},
						{
							type : "inputbox",
							ld : { "kind" : "form", "col" : "1", "row" : "0" }
						}
					]
				},
				{
					type : "output",
					cls : "label",
					props : { "value" : "체크박스" },
					ld : { "kind" : "form", "col" : "6", "row" : "2" }
				},
				{
					type : "checkbox",
					props : { "text" : "" },
					ld : { "kind" : "form", "col" : "7", "row" : "2" }
				},
				{
					type : "button",
					cls : "btn-search",
					id : "btnSearch",
					props : { "icon" : "../theme/images/controls/button/ic_btn_blank.svg", "value" : "조회" },
					ld : { "kind" : "form", "col" : "8", "row" : "2", "width" : "63" }
				}
			]
		}
	},
	{
		uuid : "9ba09bfe-ffa4-4573-95cb-8435162cf52d",
		name : "[폼] 조회 폼 라벨",
		group : "폼",
		label : "조회 폼 라벨",
		desc : "[label] 조회 폼의 라벨",
		width : 60,
		height : 26,
		node : {
			type : "output",
			cls : "label",
			props : { "value" : "항목" },
			ld : { "kind" : "form", "col" : "0", "row" : "0" }
		}
	},
	{
		uuid : "2cd8ddd3-b315-4794-ae24-f99747d0a0b0",
		name : "[폼] 조회 폼 서브 라벨",
		group : "폼",
		label : "조회 폼 서브 라벨",
		desc : "[sub-label] 조회 폼의 서브 라벨",
		width : 60,
		height : 26,
		node : {
			type : "output",
			cls : "sub-label",
			props : { "value" : "항목" },
			ld : { "kind" : "form", "col" : "0", "row" : "0" }
		}
	},
	{
		uuid : "58f8f851-b51b-45a4-9d8e-8a19664dc543",
		name : "[폼] 조회 폼 필수 라벨",
		group : "폼",
		label : "조회 폼 필수 라벨",
		desc : "[label required] 조회 폼의 라벨 또는 서브 라벨필수입력값",
		width : 60,
		height : 26,
		node : {
			type : "output",
			cls : "label required",
			props : { "value" : "항목" },
			ld : { "kind" : "form", "col" : "0", "row" : "0" }
		}
	},
	{
		uuid : "22a9fe8c-82b7-42fb-8db7-6e324501d6ef",
		name : "[폼] 필수 라벨",
		group : "폼",
		label : "필수 라벨",
		desc : "[label required] 폼의 라벨 또는 서브 라벨 필수입력값",
		width : 120,
		height : 38,
		node : {
			type : "output",
			cls : "label required",
			props : { "value" : "항목" },
			ld : { "kind" : "form", "col" : "0", "row" : "0" }
		}
	},
	{
		uuid : "81e5333f-697c-4a47-abcd-19963f9d5416",
		name : "[프레임] 버티컬 레이아웃",
		group : "프레임",
		label : "버티컬 레이아웃",
		desc : "[form-control] \"form-control\" 클래스가 적용된 그룹",
		width : 958,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "vertical", "scrollable" : "false", "spacing" : "4" },
			ld : { "kind" : "form", "col" : "1", "row" : "1" }
		}
	},
	{
		uuid : "19d38982-1f54-4923-ab5a-736a56db327f",
		name : "[프레임] 분할 배치",
		group : "프레임",
		label : "분할 배치",
		desc : "[division-group] \"division-group\" 클래스가 적용된 그룹",
		width : 958,
		height : 300,
		node : {
			type : "group",
			cls : "division-group",
			props : { "clipcontent" : "true" },
			layout : { "kind" : "form", "bottom-margin" : "0px", "hspace" : "16px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px", "vspace" : "16px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "length" : "1", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "1" }
		}
	},
	{
		uuid : "0acf4130-7586-43ff-a1df-b731e604df62",
		name : "[프레임] 컨트롤 그룹 (1)",
		group : "프레임",
		label : "컨트롤 그룹 (1)",
		desc : "[form-control] 폼 레이아웃이 적용된 \"컨트롤 + 단위\" 형태의 프레임",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "30", "syncminlength" : "false", "unit" : "PIXEL" }],
			ld : { "kind" : "form", "col" : "1", "row" : "1" },
			children : [
				{
					type : "output",
					props : { "value" : "단위" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "3bf13d0a-f558-4031-9001-4cf6f17ba355",
		name : "[프레임] 컨트롤 그룹 (2)",
		group : "프레임",
		label : "컨트롤 그룹 (2)",
		desc : "[form-control] 폼 레이아웃이 적용된 \"컨트롤 + 버튼\" 형태의 프레임",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "66", "syncminlength" : "false", "unit" : "PIXEL" }],
			ld : { "kind" : "form", "col" : "1", "row" : "2" },
			children : [
				{
					type : "button",
					cls : "btn-inline",
					props : { "value" : "버튼" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "ec46a9d8-1177-4555-8a99-a41c1c89336c",
		name : "[프레임] 컨트롤 그룹 (3)",
		group : "프레임",
		label : "컨트롤 그룹 (3)",
		desc : "[form-control] 폼 레이아웃이 적용된 \"컨트롤 + 체크박스\" 형태의 프레임",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "80", "syncminlength" : "false", "unit" : "PIXEL" }],
			ld : { "kind" : "form", "col" : "1", "row" : "3" },
			children : [
				{
					type : "checkbox",
					props : { "text" : "텍스트", "value" : "" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "918cbf94-1e15-4444-88ed-e829aed08e1f",
		name : "[프레임] 컨트롤 그룹 (4)",
		group : "프레임",
		label : "컨트롤 그룹 (4)",
		desc : "[form-control] 폼 레이아웃이 적용된 \"컨트롤 + 컨트롤\" 형태의 프레임",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "1", "syncminlength" : "true", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "4" }
		}
	},
	{
		uuid : "9fe64964-7337-4bec-8724-ae10c45cef24",
		name : "[프레임] 컨트롤 그룹 (5)",
		group : "프레임",
		label : "컨트롤 그룹 (5)",
		desc : "[form-control] 폼 레이아웃이 적용된 \"컨트롤 + 컨트롤 + 컨트롤\" 형태의 프레임",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "1", "syncminlength" : "true", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "1", "syncminlength" : "true", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "5" }
		}
	},
	{
		uuid : "64a81f8d-ec4e-4a4d-a8fb-408fc5d6d23c",
		name : "[프레임] 컨트롤 그룹 (6)",
		group : "프레임",
		label : "컨트롤 그룹 (6)",
		desc : "[form-control] 폼 레이아웃이 적용된 \"컨트롤 + 기호 + 컨트롤\" 형태의 프레임",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "autoSizing" : "true", "length" : "10", "shadecolor" : "transparent", "shadetype" : "NONE", "syncminlength" : "false", "unit" : "PIXEL" }, { "autoSizing" : "true", "length" : "1", "syncminlength" : "true", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "6" },
			children : [
				{
					type : "output",
					props : { "value" : "-" },
					ld : { "kind" : "form", "col" : "1", "row" : "0" }
				}
			]
		}
	},
	{
		uuid : "9a24b1cb-2975-4579-8f77-24e591ac8878",
		name : "[프레임] 컨트롤 그룹 (7)",
		group : "프레임",
		label : "컨트롤 그룹 (7)",
		desc : "[form-control] 폼 레이아웃이 적용된 \"컨트롤 + 기호 + 컨트롤\" 형태의 프레임",
		width : 200,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "flow", "scrollable" : "false" },
			ld : { "kind" : "form", "col" : "1", "row" : "7" }
		}
	},
	{
		uuid : "e349a579-5a7d-41f4-a831-5fa800baf526",
		name : "[프레임] 폼 레이아웃",
		group : "프레임",
		label : "폼 레이아웃",
		desc : "[form-control] \"form-control\" 클래스가 적용된 그룹",
		width : 958,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "form", "bottom-margin" : "0px", "left-margin" : "0px", "right-margin" : "0px", "scrollable" : "false", "top-margin" : "0px" },
			rows : [{ "length" : "1", "unit" : "FRACTION" }],
			columns : [{ "length" : "1", "unit" : "FRACTION" }, { "length" : "1", "unit" : "FRACTION" }],
			ld : { "kind" : "form", "col" : "1", "row" : "2" }
		}
	},
	{
		uuid : "cd5c4752-40ea-4d51-8b98-4dbaa32114a1",
		name : "[프레임] 플로우 레이아웃",
		group : "프레임",
		label : "플로우 레이아웃",
		desc : "[form-control] \"form-control\" 클래스가 적용된 그룹",
		width : 958,
		height : 26,
		node : {
			type : "group",
			cls : "form-control",
			layout : { "kind" : "flow", "scrollable" : "false" },
			ld : { "kind" : "form", "col" : "1", "row" : "3" }
		}
	}
];
