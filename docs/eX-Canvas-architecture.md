# eXBuilder6 Web Prototyper (eX-Canvas) — 아키텍처

브라우저에서 드래그 앤 드롭으로 화면 초안을 그리고, `/templates` 의 표준 뼈대를 닮은 `.clx` 로 내려받는 도구.
React/Vue 없이 eXBuilder6 앱(`.clx`) + `cpr.*` API + 공통 모듈(`*.module.js`)만 쓴다.

## 1. 화면 구성 (`clx-src/canvas/Prototyper.clx`)

```
body(.pt-root)  formlayout  rows 46px / 1fr / 190px   cols 190px / 1fr / 300px
├ grpToolbar        화면명 · 변환 방식(cmbMode) · 패턴(cmbPattern) · 팝업 · [미리보기][AST(JSON)][result 저장][CLX 다운로드][전체 삭제]
├ grpPalette        묶음별(기본 5 · 입력 13 · 데이터·컨테이너 11 · UDC) 항목. 항목 = Output 1개(DragSource, 더블클릭 추가)
├ canvasGroup       XYLayout 그룹 (DropTarget) — 항목 = 래퍼 그룹[실제 컨트롤 | 투명 덮개 | 크기 핸들]
├ grpPreview        생성된 XML / AST JSON 미리보기 (TextArea)
└ grpProperty       Type · ID · Text · Left · Top · Width · Height · [선택 삭제] + Gemini 설정(API Key · Model · 호출 경로 · 메모)
```

- **래퍼 구조의 이유**: 실제 `cpr.controls.*` 를 그대로 두면 디자인 중에 콤보가 열리고 인풋에 포커스가 간다.
  투명 덮개(Output)가 클릭(선택)·드래그(이동)를 받고, 실제 컨트롤은 표시만 한다. 컨트롤 내부 DOM 은 건드리지 않는다.
- 메타 정보는 래퍼의 사용자 속성(`pt-type` · `pt-id` · `pt-text`), 위치·크기는 캔버스의 XY 제약이 단일 원본이다.

## 2. 데이터 흐름

```
팔레트 ──DragSource(dataType=pt-palette)──▶ canvasGroup(DropTarget.onDrop)
                                               │ new cpr.controls.Xxx() → wrapper.addChild → canvas.addChild(wrapper,{top,left,width,height})
                                               ▼
                         canvasAst.extract()  getChildren() + getConstraint() + userAttr()
                                               ▼
                                      JSON AST { app, children[{type,role,id,text,items,layoutData}] }
                       ┌───────────────────────┼─────────────────────────────┐
              mode = xy│              mode = rule                    mode = gemini
                       │      templatePlanner.planByRule()   geminiPlanner.plan()  ← 규칙 초안 + 카탈로그 + 메모
                       │               └──────────── raw plan(JSON) ──────────┘      (실패 시 규칙 기반으로 대체)
                       │                              ▼
                       │              templatePlanner.resolve()  ref 검증 · 누락 보충 · 패턴/배치 확정
                       ▼                              ▼
        clxSerializer.serializeXY()      clxSerializer.serializePlan()   ← /templates 뼈대
                       └──────────────┬───────────────┘
                                      ▼
                     fileDownload.downloadClx()  Blob → <a download> (+ 같은 이름 .js 뼈대)
```

### 모듈 (`clx-src/module/canvas/*.module.js`, `cpr.core.Module.require("module/canvas/<이름>")`)

| 모듈 | 역할 |
|---|---|
| `controlRegistry` | 유형 표: 런타임 생성 함수 · CLX 태그/`std:sid` 접두 · ID 접두 · 기본 크기 · 역할(label/input/button/data). 유형 추가 = 여기 1항목 + `clxSerializer.TAG_INFO` 1줄 |
| `canvasAst` | 캔버스 → JSON AST |
| `templatePlanner` | 템플릿 카탈로그, 좌표 규칙 기반 계획, 계획 해석(검증·정규화) |
| `geminiPlanner` | Gemini `generateContent` 호출(응답 스키마 강제) → raw plan |
| `clxSerializer` | XML 빌더, `std:sid` 유일성, XY/템플릿 두 가지 직렬화 |
| `fileDownload` | Blob 다운로드 · `saveToProject()`(서버가 `clx-src/result/yyyyMMdd/` 에 저장) |

## 3. 템플릿 매칭

`/templates` 77개를 분석한 공통 뼈대:

```
body.content-wrapper (팝업: pop-content-wrapper, EXB-POP active, 앱 헤더 hidden)
  formlayout rows: 30px | 조회(autoSizing) | 1fr | 하단(50px·팝업 45px autoSizing)
├ udcComAppHeader
├ grpHeader.content-header > grpSearch.search-box     라벨(80px autoSizing)+컨트롤(1fr) 쌍 × n, 끝 열 = grpBtnSearch.search-button-group
├ grpData.content-body                                 구획 행렬. 한 행에 구획 2개 이상 → division-group(좌우)
│   ├ content  = udcComGridTitle|udcComFormTitle (+ content-title-box/title-button-group) + grid|tree|form-base
│   ├ tabfolder > tabitem > (locked group) > content…  (P5)
│   └ shuttle-button-group (btn-right/left · btn-down/up) (P7)
└ grpFooter.content-footer > footer-button-group       왼쪽 묶음 | 오른쪽 묶음(halign=right)
```

규칙 기반 계획(`planByRule`)의 판단:

1. 데이터 컨트롤(grid/tree/tabfolder)의 위 = 조회 조건, 아래·옆의 입력 = form 구획, 맨 아래 버튼 줄 = footer(가로 중앙 기준 좌/우).
2. 같은 줄의 왼쪽 라벨(또는 바로 위 라벨)을 입력과 짝짓는다. `~` `-` 라벨은 앞뒤 입력을 한 필드(`form-control` 그룹)로 묶는다. 라벨의 `*` = `label required`.
3. 구획 바로 위(48px 이내)의 입력 없는 줄: 버튼 → `title-button-group`, 라벨 → 타이틀 UDC 의 `title`.
4. 두 그리드 사이의 화살표 버튼(`>` `<` `▶` …) → 셔틀. 탭폴더 영역 안의 컨트롤 → 첫 탭의 구획.
5. 세로로 절반 이상 겹치는 구획 = 같은 행(좌우 배치). 구획 구성으로 가장 비슷한 템플릿 id(P1-1 … P7-2, 팝업 `_P`)를 고른다.
6. 툴바에서 패턴을 직접 고르면 그 패턴의 배치(위아래/좌우)를 강제한다.

## 4. Gemini (무료 API 키) 연동

- **AI 는 XML 을 쓰지 않는다.** 캔버스 컨트롤을 뼈대의 어느 자리에 둘지(JSON 계획)만 정하고, XML 은 직렬화기가 결정적으로 만든다.
  → `std:sid` 중복 · 깨진 XML · 없는 속성 같은 환각이 파일에 들어갈 수 없다.
- `generationConfig.responseMimeType = application/json` + `responseSchema` 로 구조를 강제하고, `resolve()` 가
  없는 ref · 중복 ref 를 버리고 빠진 컨트롤을 보충한다(사용자가 그린 컨트롤은 절대 잃지 않는다).
- 규칙 기반 초안을 프롬프트에 함께 보내 AI 는 "고치고 다듬기"(라벨·제목·의미 있는 id·그리드 헤더 제안·패턴 선택 이유)만 한다 — 무료 등급의 호출·토큰 한도 절약.
- 실패(키 없음 · 429 한도 · 네트워크)해도 규칙 기반 결과로 자동 대체된다.
- 호출 경로
  - `direct` : 브라우저 → Google. 키는 화면에 입력(헤더 `x-goog-api-key`, URL 에 싣지 않음). 체크 시에만 localStorage 저장. **개인 테스트 전용.**
  - `proxy` : 브라우저 → `/ai/gemini.do` → Google. 키는 서버 환경 변수 `GEMINI_API_KEY`. 팀에 공개할 때는 이 경로.
    (Tomcat: `GeminiProxyController`, 개발 서버: `tools/DevServer.java`)
- 키 발급: Google AI Studio. 기본 모델 `gemini-2.5-flash`(화면에서 변경 가능).

## 5. 실행

| 방법 | 절차 |
|---|---|
| 개발 서버(Tomcat 불필요) | `tools\dev.cmd` → http://127.0.0.1:8090/ |
| eXBuilder6 스튜디오/Tomcat | 프로젝트 빌드 후 `…/eX-Canvas/ui/canvas/Prototyper.clx` |

## 6. 범위와 한계

- 생성 CLX 는 템플릿과 같은 클래스(`search-box`, `btn-primary-01` …)와 UDC(`udc.com.*`)를 쓴다. 이 프로젝트의 테마에는 그 클래스의 스타일이 없고,
  UDC 는 eXCFrame 공통 모듈(`createCommonUtil`)을 요구한다 → **eXCFrame 템플릿 프로젝트에 넣어 여는 것이 전제**다.
- P0(이너) 패턴과 카드(`card` · `card-dim`) 구성은 대상에서 뺐다. 아코디언·임베디드·쉘 안의 내용(자식 컨트롤)은 비워서 내보낸다.
- 데이터셋·서브미션·이벤트 핸들러는 만들지 않는다(화면 초안 도구). 그리드 헤더는 `text` 만 채운다.

## 7. 팔레트 컨트롤 · UDC

| 묶음 | 유형 |
|---|---|
| 기본 | Output · Button · Image · HTMLSnippet · Progress |
| 입력 | InputBox · ComboBox · DateInput · NumberEditor · MaskEditor · SearchInput · CheckBox · CheckBoxGroup · RadioButton · ListBox · TextArea · Slider · FileInput |
| 데이터 · 컨테이너 | Grid · Tree · TabFolder · Accordion · Group · PageIndexer · Calendar · FileUpload · EmbeddedPage · EmbeddedApp · UIControlShell |
| UDC | 런타임에 등록된 UDC 전부(`window.udc.**` 에서 `cpr.controls.UDCBase` 상속 생성자를 찾는다). `clx-src/udc` 에 UDC 를 추가하고 빌드하면 팔레트에 자동으로 나온다 |

- UDC 는 실제 인스턴스를 캔버스에 올리고 이름표를 함께 보여 준다. `title` 출판 속성이 있으면 속성창 Text 가 `title` 이 되고 CLX 에 `<cl:property name="title" …/>` 로 나간다.
- 템플릿 변환에서 UDC 의 역할(이름으로 어림): `*AppHeader` → 화면 제목으로 흡수(직렬화기가 0행에 넣는다) · `*Title` → 바로 아래 구획의 제목 · `*Btn*`/`*Button*` → 버튼 자리(구획 제목 줄 · 하단) · 그 밖 → 입력 필드 자리.
- PageIndexer 는 바로 위 그리드 구획의 아래 줄로 들어간다(템플릿 P1-4). Accordion · Group · Calendar · FileUpload · Embedded* · UIControlShell 은 "제목 + 컨트롤" 구획이 된다(P3-4 · P8-1 · P8-3).

## 8. result 저장

[result 저장] → `POST /canvas/saveResult.do?name=<화면명>` (본문 = clx + 구분선 + js) → `clx-src/result/<yyyyMMdd>/<화면명>.clx · .js`.

- 브라우저는 임의 경로에 파일을 쓸 수 없어 서버가 쓴다. 개발 서버(`tools/DevServer.java`)는 프로젝트 루트의 `clx-src` 에, Tomcat(`CanvasResultController`)은 `-Dexcanvas.src.dir=<clx-src 절대 경로>`(또는 환경 변수 `EXCANVAS_SRC_DIR`)에 쓴다. 설정이 없으면 503 → 화면은 브라우저 다운로드로 대체한다.
- 파일명은 글자·숫자·`_`·`-` 만 남기므로 result 폴더 밖으로 나갈 수 없다. 같은 이름이 있으면 덮어쓰지 않고 `_HHmmss` 를 붙인다. `X-Requested-With: eX-Canvas` 헤더가 없으면 403.
- 저장된 파일은 소스 경로 안이므로 스튜디오에서 바로 열린다(앱 URI `result/<yyyyMMdd>/<화면명>`).
