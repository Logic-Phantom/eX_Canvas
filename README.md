# eX-Canvas — eXBuilder6 Web Prototyper

브라우저에서 **드래그 앤 드롭으로 화면 초안을 그리고, 사내 표준 템플릿(`/templates`)을 닮은 `.clx` 파일로 내보내는** 도구입니다.
React·Vue 같은 외부 프레임워크 없이 **eXBuilder6 앱(`.clx`) + `cpr.*` JavaScript API + 공통 모듈(`*.module.js`)** 만으로 만들었습니다.

```
팔레트에서 끌어다 놓기 → 캔버스(XY) 배치 → JSON AST 추출 → 템플릿 뼈대에 맞춰 재배치(규칙 또는 Gemini) → .clx/.js 저장
```

---

## 1. 빠른 시작

### Tomcat 없이 실행 (권장 · Java 11 이상)

프로젝트 루트에서:

```bash
tools\dev.cmd
```

빌드(`e6-compiler.jar`) 후 개발 서버가 뜹니다 → 브라우저에서 **http://127.0.0.1:8090/**

| 하고 싶은 것 | 방법 |
|---|---|
| Gemini 를 서버 프록시로 쓰기 | 실행 전에 `set GEMINI_API_KEY=발급받은키` (브라우저에 키를 두지 않는 경로) |
| 빌드만 하기 | `java -Dfile.encoding=UTF-8 -jar ci-lib\clx\e6-compiler.jar -s . -o target\clx-dev --main canvas/Prototyper` |
| 서버만 띄우기 | `java tools\DevServer.java target\clx-dev 8090` |

### eXBuilder6 스튜디오 / Tomcat 에서 실행

프로젝트를 빌드·배포한 뒤 `…/eX-Canvas/ui/canvas/Prototyper.clx` 를 엽니다.
`result` 저장을 쓰려면 Tomcat JVM 옵션에 `-Dexcanvas.src.dir=C:/eclipse_AI/workspace/eX-Canvas/clx-src` 를 추가합니다(없으면 브라우저 다운로드로 대체됩니다).

### 사용 순서

1. 좌측 **팔레트**에서 컨트롤(또는 UDC)을 중앙 **캔버스**로 끌어다 놓습니다. (더블클릭으로도 추가)
2. 캔버스에서 항목을 끌어 **이동**, 오른쪽 아래 파란 핸들로 **크기 조절**, 클릭해 **선택**합니다.
3. 우측 **속성창**에서 ID · Text · Left · Top · Width · Height 를 고칩니다. (Text 의 뜻은 유형마다 다릅니다 — 아래 표)
4. 상단 툴바에서 **화면명 · 변환 방식 · 패턴 · 팝업 여부**를 정합니다.
5. **[미리보기]** 로 XML 을 확인하고, **[result 저장]**(프로젝트에 저장) 또는 **[CLX 다운로드]**(브라우저 다운로드)를 누릅니다.

---

## 2. 화면 구성

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ 툴바  화면명 | 변환 방식 | 패턴 | 팝업 | [미리보기] [AST(JSON)] [result 저장] [CLX 다운로드] [전체 삭제] │
├────────────┬──────────────────────────────────────────────┬───────────────────────────────┤
│ 팔레트      │ 캔버스 (canvasGroup, XYLayout)                │ 속성창                         │
│  기본       │   끌어다 놓은 컨트롤이 실제 cpr.controls.* 로   │  Type / ID / Text             │
│  입력       │   그려진다                                    │  Left / Top / Width / Height  │
│  데이터·컨테이너│                                           │  [선택 삭제]                   │
│  UDC        ├──────────────────────────────────────────────┤ Gemini 설정                   │
│            │ 출력 미리보기 (생성된 XML / AST JSON)           │  API Key / Model / 호출 경로 / 메모│
└────────────┴──────────────────────────────────────────────┴───────────────────────────────┘
```

### 툴바 옵션

| 항목 | 값 | 설명 |
|---|---|---|
| 변환 | **템플릿(규칙 기반)** | 좌표를 분석해 템플릿 뼈대로 재배치. AI 불필요(기본값) |
| | **템플릿(Gemini AI)** | 규칙 기반 초안을 Gemini 가 다듬음(라벨·제목·의미 있는 id·패턴 선택). 실패하면 규칙 기반으로 자동 대체 |
| | **XY 좌표 그대로** | 캔버스 좌표를 `cl:xylayout` 으로 그대로 내보냄 |
| 패턴 | 자동 선택 / P1-1 … P8-3 | 직접 고르면 그 패턴의 배치(위아래/좌우)를 강제 |
| 팝업 | 체크 | `_P` 템플릿 형태(`pop-content-wrapper`, EXB-POP 활성, 앱 헤더 숨김) |

### 팔레트 (29종 + UDC)

| 묶음 | 컨트롤 |
|---|---|
| 기본 | Output · Button · Image · HTMLSnippet · Progress |
| 입력 | InputBox · ComboBox · DateInput · NumberEditor · MaskEditor · SearchInput · CheckBox · CheckBoxGroup · RadioButton · ListBox · TextArea · Slider · FileInput |
| 데이터 · 컨테이너 | Grid · Tree · TabFolder · Accordion · Group · PageIndexer · Calendar · FileUpload · EmbeddedPage · EmbeddedApp · UIControlShell |
| UDC | 빌드에 등록된 UDC 전부 — 런타임에 자동 탐색. `clx-src/udc` 에 추가하고 빌드하면 팔레트에 나타남 |

### 속성창 Text 의 뜻

| 유형 | Text 가 뜻하는 것 | 예 |
|---|---|---|
| Output · Button · InputBox · TextArea · HTMLSnippet | 표시 값(`value`) | `조회` |
| CheckBox | 문구(`text`) | `사용` |
| ComboBox · RadioButton · CheckBoxGroup · ListBox | 아이템 목록(쉼표 구분) | `영업,개발,인사` |
| Grid | 헤더 목록(쉼표 구분) → 컬럼 수도 함께 바뀜 | `사번,성명,부서` |
| TabFolder / Accordion | 탭 이름 / 섹션 제목 목록 | `기본,상세` |
| MaskEditor | 입력 마스크(`mask`) | `XXX-XXXX` |
| Image · EmbeddedPage | 경로(`src`) | |
| UDC (`title` 속성이 있는 것) | UDC 의 `title` | `사원 목록` |

> **규칙 기반 변환을 잘 받는 팁** — 라벨은 입력의 **왼쪽(또는 바로 위)** 에, 필수 항목은 라벨 끝에 `*`, 기간은 `입력 ~ 입력` 처럼 `~` 라벨로 연결, 조회 버튼은 조회 조건과 같은 줄에, 저장/닫기 버튼은 화면 맨 아래에 둡니다. 두 그리드 사이에 `>` `<` 버튼을 두면 셔틀 패턴이 됩니다.

---

## 3. 프로젝트 구조

```
eX-Canvas/
├ README.md                          ← 이 문서
├ docs/eX-Canvas-architecture.md     ← 상세 설계(아키텍처 · 템플릿 매칭 · Gemini · 저장 규약)
├ templates/                         ← 표준 화면 템플릿 77개(P0~P8, popup). 생성물이 닮아야 할 원본
├ clx-src/                           ← eXBuilder6 소스 경로
│  ├ canvas/
│  │  ├ Prototyper.clx               ← Web Prototyper 화면(툴바 · 팔레트 · 캔버스 · 속성창 · 미리보기)
│  │  ├ Prototyper.js                ← 화면 스크립트: 드래그 앤 드롭 · 선택/이동/크기 · 속성 반영 · 내보내기
│  │  └ 확인필요.md                   ← 검증한 것 / 아직 확인이 필요한 것
│  ├ module/canvas/                  ← 공통 모듈 6종 (cpr.core.Module.require("module/canvas/<이름>"))
│  │  ├ controlRegistry.module.js    ← 컨트롤 유형 표 + UDC 자동 탐색
│  │  ├ canvasAst.module.js          ← 캔버스 → JSON AST
│  │  ├ templatePlanner.module.js    ← 템플릿 카탈로그 · 규칙 기반 계획 · 계획 검증/정규화
│  │  ├ geminiPlanner.module.js      ← Gemini 호출 → 화면 계획(JSON)
│  │  ├ clxSerializer.module.js      ← JSON → .clx XML (XY / 템플릿 뼈대)
│  │  └ fileDownload.module.js       ← Blob 다운로드 · 프로젝트 저장 요청
│  ├ theme/custom/prototyper.less    ← Prototyper 전용 스타일(env.json 의 runtime-css 에 등록)
│  ├ udc/com/                        ← 프로젝트 UDC (팔레트 UDC 묶음의 원천)
│  └ result/<yyyyMMdd>/              ← [result 저장] 결과물(.clx + .js). 실행한 날짜별 폴더
├ src/main/java/com/tomatosystem/canvas/web/
│  ├ GeminiProxyController.java      ← POST /ai/gemini.do       (Tomcat 용 Gemini 프록시)
│  └ CanvasResultController.java     ← POST /canvas/saveResult.do (Tomcat 용 result 저장)
├ tools/
│  ├ dev.cmd                         ← 빌드 + 개발 서버 실행
│  └ DevServer.java                  ← Tomcat 없이 쓰는 개발 서버(정적 파일 + 위 두 엔드포인트), 127.0.0.1 전용
├ ci-lib/clx/e6-compiler.jar         ← eXBuilder6 컴파일러(빌드 · 생성물 유효성 검증에 사용)
├ exbuilder/runtime/                 ← 런타임(cleopatra.js · 기본 테마)
└ target/clx-dev/                    ← 개발 서버용 빌드 산출물(생성됨)
```

---

## 4. 동작 원리

### 4.1 전체 데이터 흐름

```
 팔레트 항목(Output)
    │  cpr.controls.DragSource (dataType = "pt-palette", 피드백은 app.floatControl)
    ▼
 canvasGroup  ── cpr.controls.DropTarget.onDrop ──▶ pointerLocation → 캔버스 상대 좌표(10px 격자 스냅)
    │  new cpr.controls.Xxx() / new udc.com.Xxx()  →  canvas.addChild(wrapper, {top,left,width,height})
    ▼
 canvasAst.extract()      getChildren() 순회 + getConstraint()(좌표) + userAttr()(유형·id·text)
    ▼
 JSON AST   { app:{name,popup,canvas}, children:[{type, role, id, text, items, udcType, layoutData:{x,y,width,height}}] }
    │
    ├─ 변환 = XY ───────────────────────────────▶ clxSerializer.serializeXY(ast)
    │
    ├─ 변환 = 규칙 ──▶ templatePlanner.planByRule(ast) ─┐
    │                                                  ├─▶ raw plan(JSON)
    └─ 변환 = Gemini ▶ geminiPlanner.plan(ast, …) ─────┘        │  (Gemini 실패 → 규칙 기반으로 대체)
                                                                ▼
                                       templatePlanner.resolve()   ref 검증 · 빠진 컨트롤 보충 · 패턴/배치 확정
                                                                ▼
                                       clxSerializer.serializePlan(plan)   /templates 뼈대로 XML 생성
    ▼
 [result 저장]  fileDownload.saveToProject() → POST /canvas/saveResult.do → clx-src/result/<yyyyMMdd>/<화면명>.clx · .js
 [CLX 다운로드] fileDownload.downloadClx()   → Blob → <a download>
```

### 4.2 캔버스 항목의 구조

캔버스에 놓인 항목 하나는 **래퍼 그룹**입니다.

```
래퍼 그룹(XY, class=pt-item)   ← 캔버스의 XY 제약(top/left/width/height)이 위치·크기의 단일 원본
 ├ ① 실제 컨트롤 (cpr.controls.* 또는 UDC 인스턴스)   ← 보이기만 한다
 ├ ② 투명 덮개 Output (pt-item-overlay)               ← 클릭 = 선택, 드래그 = 이동
 └ ③ 크기 핸들 Output (pt-item-handle)                ← 드래그 = 크기 조절
래퍼의 사용자 속성: pt-type(유형) · pt-id(CLX id) · pt-text(속성창 Text)
```

- 덮개가 없으면 디자인 중에 콤보가 열리거나 인풋에 포커스가 가서 편집이 안 됩니다.
- 컨트롤 내부 DOM 은 건드리지 않습니다. 위치는 레이아웃 제약(`updateConstraint`), 모양은 클래스로만 다룹니다.
- 이미지 · 빈 그룹 · 임베디드 · UDC 처럼 비어 보일 수 있는 유형은 덮개에 이름표를 표시합니다.

### 4.3 템플릿 매칭 (규칙 기반)

`/templates` 77개를 분석한 공통 뼈대에 캔버스 컨트롤을 배정합니다.

```
body.content-wrapper                       (팝업: pop-content-wrapper)
├ udcComAppHeader                          앱 헤더
├ grpHeader > grpSearch.search-box         조회 조건: [라벨 80px | 컨트롤 1fr] × n + 조회 버튼 묶음
├ grpData.content-body                     데이터 영역: 구획들의 행렬
│   ├ content = 타이틀 UDC(+ 제목 줄 버튼) + grid / tree / form-base / 기타 컨트롤 (+ pageindexer)
│   ├ division-group                       한 행에 구획이 2개 이상 → 좌우 배치
│   ├ tabfolder > tabitem > content …
│   └ shuttle-button-group                 두 그리드 사이 이동 버튼
└ grpFooter > footer-button-group          하단 버튼: 왼쪽 묶음 | 오른쪽 묶음
```

판단 규칙:

1. **데이터 컨트롤**(Grid · Tree · TabFolder …)의 **위** = 조회 조건, **아래·옆**의 입력 = 폼 구획, **맨 아래 버튼 줄** = 하단 버튼(가로 중앙 기준 좌/우).
2. 같은 줄 왼쪽(또는 바로 위) 라벨을 입력과 짝지음. `~` `-` 라벨은 앞뒤 입력을 한 필드로 묶음. 라벨 끝 `*` = 필수(`label required`).
3. 구획 바로 위의 입력 없는 줄: 버튼 → 제목 줄 버튼(`title-button-group`), 라벨/타이틀 UDC → 구획 제목.
4. 두 그리드 사이의 화살표 버튼 → 셔틀. 탭폴더 영역 안의 컨트롤 → 첫 탭의 내용. PageIndexer → 바로 위 그리드의 아래 줄.
5. 세로로 절반 이상 겹치는 구획은 같은 행(좌우). 구획 구성으로 가장 비슷한 템플릿을 고름.
6. 버튼 클래스는 글자로 추정: 조회 `btn-primary-02` · 초기화 `btn-secondary-03 btn-md` · 저장/확인/등록 `btn-primary-01` · 그 밖 `btn-secondary-01/03`.

지원 패턴: `P1-1` `P1-2` `P1-4` `P1-6` `P2-1` `P2-4` `P2-5` `P3-1` `P3-2` `P3-4` `P4-1` `P4-3` `P4-4` `P5-1` `P5-2` `P6-1` `P6-2` `P7-1` `P7-2` `P8-1` `P8-3` (+ 팝업 `_P`)

### 4.4 UDC

- `controlRegistry` 가 `window.udc.**` 를 훑어 `cpr.controls.UDCBase` 를 상속한 생성자를 찾아 팔레트에 올립니다.
- 내보낼 때 `<cl:udc type="udc.com.xxx">` + (Text 가 있으면) `<cl:property name="title" …/>`.
- 템플릿 변환에서의 역할(이름으로 추정): `*AppHeader` → 화면 제목으로 흡수 · `*Title` → 아래 구획 제목 · `*Btn*`/`*Button*` → 버튼 자리 · 그 밖 → 입력 필드 자리.

### 4.5 Gemini 연동 (무료 API 키)

- **AI 는 XML 을 쓰지 않습니다.** "어느 컨트롤을 뼈대의 어디에 둘지"만 JSON 으로 정하고, XML 은 `clxSerializer` 가 결정적으로 만듭니다 → `std:sid` 중복·깨진 XML·없는 속성이 파일에 들어갈 수 없습니다.
- `responseMimeType=application/json` + `responseSchema` 로 응답 구조를 강제하고, `resolve()` 가 없는 ref·중복 ref 를 버리고 **빠진 컨트롤을 보충**합니다(사용자가 그린 것은 잃지 않음).
- 규칙 기반 초안을 함께 보내 AI 는 다듬기만 합니다(무료 등급의 호출·토큰 한도 절약). AI 가 `rename` 으로 제안한 새 id 를 ref 에 써도 원래 컨트롤로 해석합니다.
- 실패(키 없음 · 429 한도 · 네트워크)하면 규칙 기반 결과로 자동 대체됩니다.

| 호출 경로 | 흐름 | 키 위치 | 용도 |
|---|---|---|---|
| 브라우저 직접 호출 | 브라우저 → Google | 화면에 입력(헤더 `x-goog-api-key`). 체크 시에만 localStorage 저장 | 개인 테스트 |
| 서버 프록시 | 브라우저 → `/ai/gemini.do` → Google | 서버 환경 변수 `GEMINI_API_KEY` | 팀 공유 |

키 발급: Google AI Studio · 기본 모델 `gemini-2.5-flash`(화면에서 변경 가능) · "화면 요구사항 메모"가 프롬프트에 포함됩니다.

### 4.6 result 저장

`POST /canvas/saveResult.do?name=<화면명>` — 본문은 `clx + "\n=====eX-Canvas-JS=====\n" + js`.

- 저장 위치: `clx-src/result/<yyyyMMdd>/<화면명>.clx` · `.js` → 소스 경로 안이므로 스튜디오에서 바로 열립니다(앱 URI `result/<yyyyMMdd>/<화면명>`).
- 같은 이름이 있으면 덮어쓰지 않고 `_HHmmss` 를 붙입니다.
- 파일명은 글자·숫자·`_`·`-` 만 남겨 `result` 폴더 밖으로 나갈 수 없고, `X-Requested-With: eX-Canvas` 헤더가 없으면 403 입니다.
- 서버가 없거나 저장 경로가 설정되지 않았으면 브라우저 다운로드로 대체합니다.

### 4.7 생성되는 CLX 의 규칙

- `std:sid` 는 파일 안에서 유일(태그별 접두 + 16진수 8자리), 컨트롤 `id` 도 중복 시 번호를 붙여 유일하게.
- 컨테이너의 레이아웃 노드는 마지막 자식, 자식마다 부모 레이아웃에 맞는 데이터 노드(`cl:formdata` / `cl:verticaldata` / `cl:flowlayoutdata` / `cl:xylayoutdata`).
- `style` 속성은 쓰지 않고 템플릿과 같은 클래스(`search-box` · `content` · `form-base` · `btn-primary-01` …)만 사용.
- 스크린은 템플릿과 같은 `EXB-FULL / EXB-DIV / EXB-PART / EXB-POP`.
- 데이터셋 · 서브미션 · 이벤트 핸들러는 만들지 않습니다(화면 초안 도구). `.js` 는 템플릿과 같은 머리 주석뿐입니다.

---

## 5. 확장하는 법

| 하고 싶은 것 | 고칠 곳 |
|---|---|
| 팔레트에 컨트롤 추가 | `controlRegistry.module.js` 의 `TYPES` 에 1항목 + `CATEGORIES` 에 유형 키 + `clxSerializer.module.js` 의 `TAG_INFO` 에 1줄(고유 속성이 있으면 `controlEl` 의 `switch`) |
| UDC 추가 | `clx-src/udc/**` 에 UDC 를 만들고 빌드 — 코드 수정 없음 |
| 템플릿 패턴 추가 | `templatePlanner.module.js` 의 `CATALOG` + `decidePattern()` |
| 뼈대(클래스·행 높이·스크린) 변경 | `clxSerializer.module.js` (`headEl` · `searchHeaderEl` · `sectionEl` · `footerEl`) |
| AI 프롬프트·응답 스키마 | `geminiPlanner.module.js` (`SYSTEM_TEXT` · `buildResponseSchema`) |

---

## 6. 검증 현황과 알려진 제약

**검증한 것**

- `Prototyper.clx` 와 모듈 6종: `e6-compiler.jar` 컴파일 문제 0건.
- 브라우저에서 드롭 · 더블클릭 추가 · 이동 · 미리보기 · result 저장 동작.
- 생성 CLX: 컨트롤 29종 + UDC 4종을 XY·템플릿 두 방식으로 내보내 컴파일 문제 0건. 일반/팝업/셔틀/탭/트리 시나리오의 실행 화면 구조 확인.
- Gemini: 서버 프록시 경로로 실호출 성공(`gemini-2.5-flash`, 응답 스키마 통과).

**알려진 제약 · 확인이 필요한 것** (상세: [clx-src/canvas/확인필요.md](clx-src/canvas/확인필요.md))

1. **생성 CLX 는 eXCFrame 프로젝트 전제입니다.** 템플릿 클래스의 스타일과 UDC 가 요구하는 공통 모듈(`createCommonUtil`)이 이 프로젝트에는 없습니다. 여기서 실행하면 스타일이 없고 콘솔에 UDC 오류가 찍힙니다(캔버스의 UDC 도 비어 보일 수 있음 — 이름표로 구분).
2. **스튜디오 디자인 편집기 표시**는 아직 확인하지 않았습니다. 컴파일은 통과했지만 생성한 `.clx` 를 스튜디오에서 열어 확인해 주세요.
3. Tomcat 에서 result 저장을 쓰려면 `-Dexcanvas.src.dir` 설정이 필요합니다.
4. 브라우저 직접 호출 방식은 API 키가 브라우저에 남습니다. 팀에 공개할 때는 서버 프록시를 쓰세요.
5. P0(이너) 패턴과 카드 구성은 지원하지 않습니다. 아코디언·임베디드·쉘 안의 자식 컨트롤은 비워서 내보냅니다.
6. 툴바가 길어 창 폭이 1440px 보다 좁으면 상태 메시지 칸이 좁아집니다(전체 내용은 툴팁).
