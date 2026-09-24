# eXBuilder6 Web Prototyper (eX-Canvas) — 아키텍처

브라우저에서 드래그 앤 드롭으로 화면 초안을 그리고, `/templates` 의 표준 뼈대를 닮은 `.clx` 로 내려받는 도구.
React/Vue 없이 eXBuilder6 앱(`.clx`) + `cpr.*` API + 공통 모듈(`*.module.js`)만 쓴다.

## 1. 화면 구성 (`clx-src/canvas/Prototyper.clx`)

```
body(.pt-root)  formlayout  rows 46px / 1fr / 190px   cols 190px / 1fr / 300px
├ grpToolbar        화면명 · 변환 방식(cmbMode) · 패턴(cmbPattern) · 미리 배치(cbxPrefill) · 팝업
│                   · [미리보기][AST(JSON)][result 저장][CLX 다운로드][전체 삭제]
├ grpPalette        찾기 상자(sipPaletteFilter) + 묶음별 항목
│                   기본 5 · 입력 13 · 데이터·컨테이너 11 · UDC · UI 템플릿 17묶음 116종 = 149항목
│                   항목 = Output 1개(DragSource, 더블클릭 추가)
├ canvasGroup       XYLayout 그룹 (DropTarget) — 항목 = 래퍼 그룹[실제 컨트롤 | 투명 덮개 | 크기 핸들]
├ grpPreview        생성된 XML / AST JSON 미리보기 (TextArea)
└ grpProperty       Type · ID · Text · Left · Top · Width · Height · [선택 삭제]
                    + 저장 위치(optSaveTarget · [폴더 지정]) + Gemini 설정(API Key · Model · 호출 경로 · 메모)
```

- **래퍼 구조의 이유**: 실제 `cpr.controls.*` 를 그대로 두면 디자인 중에 콤보가 열리고 인풋에 포커스가 간다.
  투명 덮개(Output)가 클릭(선택)·드래그(이동)를 받고, 실제 컨트롤은 표시만 한다. 컨트롤 내부 DOM 은 건드리지 않는다.
- 메타 정보는 래퍼의 사용자 속성(`pt-type` · `pt-id` · `pt-text` · `pt-style`), 위치·크기는 캔버스의 XY 제약이 단일 원본이다.
  `pt-style` 은 버튼의 스타일 계열(`primary` | `secondary` | 빈 값=자동). 캔버스에서는 `pt-style-*` 클래스로 보이고, 내보낼 때 `templatePlanner.buttonClass(text, place, style)` 이 자리별 템플릿 클래스로 바꾼다.
- `pt-type` 은 유형 키 그대로다 — 기본 컨트롤 `output`, UDC `udc:<정규 이름>`, UI 템플릿 `uitpl:<uuid>`.

## 2. 데이터 흐름

```
[미리 배치] templatePlanner.skeleton(패턴, 캔버스크기) ──▶ 캔버스에 뼈대 컨트롤을 바로 깐다
[이미지 드롭/붙여넣기] imagePlanner.readImage → analyze(Gemini 비전) → toCanvasItems ──▶ 캔버스에 바로 깐다 + 패턴 콤보 = AI 선택
팔레트 ──DragSource(dataType=pt-palette)──▶ canvasGroup(DropTarget.onDrop)
                                               │ new cpr.controls.Xxx() / new udc.com.Xxx() / templateBuilder.build(UI 템플릿)
                                               │   → wrapper.addChild → canvas.addChild(wrapper,{top,left,width,height})
                                               ▼
                         canvasAst.extract()  getChildren() + getConstraint() + userAttr()
                                               ▼
                                      JSON AST { app, children[{type,role,id,text,items,udcType,tpl,layoutData}] }
                       ┌───────────────────────┼─────────────────────────────┐
              mode = xy│              mode = rule                    mode = gemini
                       │      templatePlanner.planByRule()   geminiPlanner.plan()  ← 규칙 초안 + 카탈로그 + 메모
                       │               └──────────── raw plan(JSON) ──────────┘      (실패 시 규칙 기반으로 대체)
                       │                              ▼
                       │              templatePlanner.resolve()  ref 검증 · 누락 보충 · 패턴/배치 확정
                       ▼                              ▼
        clxSerializer.serializeXY()      clxSerializer.serializePlan()   ← /templates 뼈대
                       └──────────────┬───────────────┘   (uitpl 노드는 catalogNodeEl() 이 트리째 XML 로)
                                      ▼
        [result 저장] saveToProject() → 서버 / saveToDirectory() → 지정 폴더 / downloadClx() → 브라우저 다운로드
```

### 모듈 (`clx-src/module/canvas/*.module.js`, `cpr.core.Module.require("module/canvas/<이름>")`)

| 모듈 | 역할 |
|---|---|
| `controlRegistry` | 유형 표: 런타임 생성 함수 · CLX 태그/`std:sid` 접두 · ID 접두 · 기본 크기 · 역할(label/input/button/data). 유형 추가 = 여기 1항목 + `clxSerializer.TAG_INFO` 1줄. UDC(`udc:`)와 UI 템플릿(`uitpl:`)은 런타임에 붙인다 |
| `canvasAst` | 캔버스 → JSON AST |
| `templatePlanner` | 템플릿 카탈로그, 좌표 규칙 기반 계획, 계획 해석(검증·정규화), 패턴 뼈대 `skeleton()` |
| `geminiPlanner` | Gemini `generateContent` 호출(응답 스키마 강제) → raw plan. `request()` 는 direct/proxy 호출 공용(이미지 분석도 쓴다) |
| `imagePlanner` | 이미지 → 캔버스 항목. `analyzeFile()`(경로 결정) · `analyzeUpload()`(multipart 로 서버에) · `probeServer()`(`imageStatus.do`) · `readImage()`/`analyze()`(브라우저 직접) · `normalize()` · `toCanvasItems()`(가로 비례 · 세로 줄 단위 재측정) |
| `openApiPlanner` | Swagger/OpenAPI 명세 → 데이터 모델 → 바인딩된 뼈대. `parse()` · `analyze()`(API 목록 · 역할) · `mapModel()`(DataSet · DataMap · Submission · flows) · `parseBind()`(바인딩 표기) · `skeleton()` · `describe()` · `fetchSpec()`/`candidateUrls()`/`probeProxy()`(URL 받기). `cpr` 에 의존하지 않는 순수 JS |
| `clxSerializer` | XML 빌더, `std:sid` 유일성, XY/템플릿 두 가지 직렬화 + UI 템플릿 트리(`catalogNodeEl`) + `<cl:model>` · 바인딩(`bindChildren`) · `generate()` → `{clx, js}`(리스너 핸들러 `.js` 생성 `scriptFor`) |
| `fileDownload` | Blob 다운로드 · 저장 서버 요청(`probeServer`/`saveToProject`) · 지정 폴더에 직접 쓰기(`saveToDirectory`) |
| `templateBuilder` | UI 템플릿 카탈로그 노드 → 실제 `cpr.controls.*` 트리(캔버스 미리보기) |
| `uiTemplateCatalog` | **자동 생성** — 상용구 116종의 컨트롤 트리. `tools/SyncCatalog.java` 가 만든다 |
| `collabSession` | 공유 세션 — `Y.Doc`(항목 맵) · awareness(커서·선택) · 웹소켓 · 서버 주소 찾기. 화면은 `publishXxx()` 로 알리고 핸들러로 돌려받는다 |
| `yjsLoader` | 공유를 처음 켤 때만 `yjs` · `y-protocols/awareness` 를 동적 `import` |

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
| 개발 서버(Tomcat 불필요) | `tools\dev.cmd`(Windows) / `tools/dev.sh`(macOS·Linux) → ① `SyncCatalog`(카탈로그 갱신·변경 보고) ② `BuildOnce`(빌드+테마) ③ `DevServer` → http://127.0.0.1:8090/ (+ 공유 릴레이 ws://127.0.0.1:8091) |
| eXBuilder6 스튜디오/Tomcat | 프로젝트 빌드 후 `…/eX-Canvas/ui/canvas/Prototyper.clx` (공유는 같은 서버의 `/ws/crdt-sync.do`) |

`BuildOnce` 는 `e6-compiler` 를 `--exclude theme/**` 로 돌리고 eXCFrame 테마는 이클립스 산출물(`clx-build/theme`)에서 가져온다.
CLI 컴파일러가 `theme/custom-theme.less` 에서 끝나지 않기 때문이다(원인 미상 — `clx-src/canvas/확인필요.md` 0-3 참고).
그래서 Prototyper 전용 스타일은 테마 밖 `clx-src/style/prototyper.less` 에 두어 CLI 가 직접 컴파일한다.

## 6. 범위와 한계

- 생성 CLX 는 템플릿과 같은 클래스(`search-box`, `btn-primary-01` …)와 UDC(`udc.com.*`)를 쓴다.
  테마 LESS 는 이 프로젝트에도 있어 **스타일은 그대로 보이지만**, UDC 는 eXCFrame 공통 모듈(`createCommonUtil`)을 요구한다
  → UDC 는 캔버스에서 이름표로 대신 보인다(파일 출력은 정상). 실행은 **eXCFrame 템플릿 프로젝트가 전제**다.
- P0(이너) 패턴은 대상에서 뺐다. 아코디언·임베디드·쉘 안의 내용(자식 컨트롤)은 비워서 내보낸다.
- 손으로만 그린 화면은 데이터셋·서브미션·이벤트 핸들러를 만들지 않는다(화면 초안 도구). 그리드 헤더는 `text` 만 채운다.
  API 연동([9-2](#9-2-api-연동-swaggeropenapi--데이터-모델--바인딩))으로 모델을 붙인 경우에만 `<cl:model>` · 바인딩 · 리스너 핸들러가 생긴다.
- UI 템플릿은 스튜디오 전용 정보(`metaData` · `fieldLabel`)와 표현식 바인딩(`itemStyle`/`binders`), 탭 아이콘용 `userAttributes` 를 옮기지 않는다.

## 7. 팔레트 컨트롤 · UDC

| 묶음 | 유형 |
|---|---|
| 기본 | Output · Button · Image · HTMLSnippet · Progress |
| 입력 | InputBox · ComboBox · DateInput · NumberEditor · MaskEditor · SearchInput · CheckBox · CheckBoxGroup · RadioButton · ListBox · TextArea · Slider · FileInput |
| 데이터 · 컨테이너 | Grid · Tree · TabFolder · Accordion · Group · PageIndexer · Calendar · FileUpload · EmbeddedPage · EmbeddedApp · UIControlShell |
| UDC | 런타임에 등록된 UDC 전부(`window.udc.**` 에서 `cpr.controls.UDCBase` 상속 생성자를 찾는다). `clx-src/udc` 에 UDC 를 추가하고 빌드하면 팔레트에 자동으로 나온다 |
| UI 템플릿 | 스튜디오 상용구 116종(`.settings/canned-templates.xmi`). 상용구의 `[버튼]` `[폼]` `[콘텐츠]` … 묶음이 그대로 팔레트 묶음 17개가 된다 |

- UDC 는 실제 인스턴스를 캔버스에 올리고 이름표를 함께 보여 준다. `title` 출판 속성이 있으면 속성창 Text 가 `title` 이 되고 CLX 에 `<cl:property name="title" …/>` 로 나간다.
- 템플릿 변환에서 UDC 의 역할(이름으로 어림): `*AppHeader` → 화면 제목으로 흡수(직렬화기가 0행에 넣는다) · `*Title` → 바로 아래 구획의 제목 · `*Btn*`/`*Button*` → 버튼 자리(구획 제목 줄 · 하단) · 그 밖 → 입력 필드 자리.
- PageIndexer 는 바로 위 그리드 구획의 아래 줄로 들어간다(템플릿 P1-4). Accordion · Group · Calendar · FileUpload · Embedded* · UIControlShell 은 "제목 + 컨트롤" 구획이 된다(P3-4 · P8-1 · P8-3).

## 8. result 저장

어디에 저장하든 결과는 같다 — `…/result/<yyyyMMdd>/<화면명>.clx · .js`. 화면이 뜰 때 `GET …?probe=1` 로 저장 서버를 확인해 두고 아래 순서로 쓴다.

| 순위 | 방법 | 쓰는 주체 |
|---|---|---|
| 1 | `POST /canvas/saveResult.do?name=<화면명>` (본문 = clx + 구분선 + js) | 서버(DevServer · `CanvasResultController`) |
| 2 | 속성창 **[폴더 지정]** 으로 고른 폴더 아래 `<yyyyMMdd>/` | 브라우저(File System Access API · Chrome/Edge) |
| 3 | 브라우저 기본 다운로드 | 브라우저 |

- 소스 경로(`clx-src`)는 설정이 없어도 찾는다 — `CanvasResultController` : `-Dexcanvas.src.dir`/`EXCANVAS_SRC_DIR` → 배포 폴더에서 위로 → 이클립스 WTP 배포 경로에서 워크스페이스의 같은 이름 프로젝트 → 실행 폴더. `DevServer` : 설정 → 실행 폴더 → 빌드 폴더에서 위로.
- 2번의 폴더 핸들은 IndexedDB 에 남아 다음 실행에도 이어진다. 폴더 선택·권한 창은 브라우저가 클릭 안에서만 열어 주므로 CLX 를 만들기 **전에** 확보한다.
- 파일명은 글자·숫자·`_`·`-` 만 남기므로 result 폴더 밖으로 나갈 수 없다. 같은 이름이 있으면 덮어쓰지 않고 `_HHmmss` 를 붙인다. `X-Requested-With: eX-Canvas` 헤더가 없으면 403.
- 저장된 파일은 소스 경로 안이므로 스튜디오에서 바로 열린다(앱 URI `result/<yyyyMMdd>/<화면명>`).

## 9. UI 템플릿 · 카탈로그 · 패턴 미리 배치

세부는 [README](../README.md) 4.7~4.9 에 있다. 설계상의 요점만 적는다.

- **한 노드, 두 출력** — 상용구 XMI 를 `SyncCatalog` 가 컨트롤 트리 JSON 으로 옮겨 두면, 같은 노드를 `templateBuilder.build()` 가 캔버스 컨트롤로, `clxSerializer.catalogNodeEl()` 이 CLX 로 만든다. 화면에서 본 모양이 곧 파일이다.
- **XMI → CLX 이름 변환은 생성 시점에 한 번** 끝낸다(`rowIndex`→`row`, `horizontalSpacing`→`hspace`/`hspacing`, `ignoreLayoutSpacing`→`ignore-layout-spacing` …). 브라우저 쪽 모듈은 이미 CLX 속성명인 값을 그대로 쓴다.
- **변경 감지**는 항목별 지문(`tools/catalog-index.txt`)을 비교한다. 이름뿐 아니라 컨트롤 트리·클래스·레이아웃이 바뀐 것도 "수정"으로 잡는다.
- **패턴 뼈대**(`templatePlanner.skeleton()`)는 캔버스 크기를 받아 사방 20px 여백만 남기고 폭·높이를 나눠 쓴다. 좌표는 `planByRule()` 이 같은 패턴으로 되읽도록 맞춰 두었다.

## 9-1. 이미지로 배치 (Gemini 비전)

사용법은 [README](../README.md) 4.12 에 있다. 설계상의 요점만 적는다.

- **AI 의 몫은 "요소 목록"까지** — `{ type, text, box[ymin,xmin,ymax,xmax] 0~1000, style, required }` 와 `pattern`(가장 비슷한 템플릿). 조회 조건·구획·하단 버튼의 해석은 손으로 그린 캔버스와 똑같이 `planByRule()` 이 좌표로 한다. 그래서 이미지에서 온 캔버스도 같은 길·같은 품질로 CLX 가 된다.
- **좌표 변환은 단조(monotone)** — 가로는 캔버스 폭 비례. 세로는 요소의 위·아래 경계로 이미지를 띠로 자르고, 한 줄짜리 컨트롤이 지나는 띠는 "줄 높이 24px" 배율, 큰 영역·빈 띠는 "남는 높이를 채우는" 배율로 늘이거나 줄인다. 순서와 겹침이 유지되므로 규칙 기반 변환의 줄 묶기(`clusterRows`)·위/아래 판정이 이미지 그대로 나온다. (풀 HD 캡처를 900px 캔버스에 그냥 비례 축소하면 입력 줄이 12px 이 되어 줄이 뭉개지는 문제를 피한다.)
- **스타일은 계열만** — 버튼 primary/secondary 를 `pt-style` 에 두고 실제 클래스는 자리(조회 줄 · 제목 줄 · 하단 좌/우)의 템플릿 관례를 따른다. 필수 표시는 라벨 끝 `*`. 인라인 스타일은 만들지 않는다.
- **입구** — HTML5 파일 드롭(`document` 의 dragover/drop, 캔버스 사각형 안일 때만 받는다 · 밖에 놓으면 브라우저 이동을 막기만 한다) · `paste`(입력 요소에 포커스가 없을 때) · 숨은 `<input type=file>`. 팔레트의 `cpr.controls.DragSource/DropTarget` 과는 별개다.
- **두 경로, 같은 계획 모양** — 기본은 **서버 업로드**(eXConverter-AI 의 `GeminiConversionController` 방식) : 브라우저가 원본 파일을 multipart 로 `/canvas/analyzeImage.do` 에 올리고, 서버 `CanvasImageAnalyzer`(JDK + org.json, 스프링 의존 없음)가 키 · ImageIO 축소(1536) · 호출 · 재시도 · 콘솔 로그를 맡는다. Tomcat 은 `CanvasImageController`(+ `multipartResolver`), 개발 서버는 같은 클래스를 리플렉션으로 부른다(`dev.sh` 가 컴파일해 `-cp` 로 올림 · 없으면 503). 직접 경로(브라우저 → Google)는 개인 테스트용으로 남겨 두었고, 두 경로가 돌려주는 `plan` 은 같은 모양이라 `normalize()`/`toCanvasItems()` 가 공통이다.
- **서버 분석기의 방어** — 전송 실패(429/5xx/연결)는 같은 요청 + 지수 백오프(`retryDelay` 우선), 비정상 출력(MAX_TOKENS · JSON 아님 · `maxResponseChars` 초과)은 온도 0→0.4→0.8 로 재생성, 2.5 계열이 `thinkingLevel` 을 거부하면 `thinkingConfig` 없이 재요청. `responseSchema` 는 기본 OFF(eXConverter-AI 실측 : 스키마가 붙으면 3.5-flash 가 반복 생성으로 붕괴). 카탈로그 · 유형 목록은 브라우저가 폼 필드로 보내 서버에 사본을 두지 않는다.
- **전송량** — 서버 경로는 원본 파일(20MB 상한)이 서버까지만 가고 서버가 줄여 보낸다. 직접 경로는 브라우저에서 긴 변 1600px 로 줄이고 PNG(크면 JPEG 0.9)로 보낸다(Tomcat 프록시 본문 상한 8MB).

## 9-2. API 연동 (Swagger/OpenAPI → 데이터 모델 · 바인딩)

사용법과 전체 흐름은 [README](../README.md) 4.13 에 있다. 설계상의 요점만 적는다.

- **AI 를 쓰지 않는다.** 명세는 이미 구조화된 데이터라 결정적으로 옮긴다(같은 명세 → 같은 결과 · 비용 0). Gemini 는 이미지 배치·계획 다듬기에만 쓴다.
- **역할 판정은 응답 모양이 먼저다.** 응답에 "목록" 이 있으면 메서드와 무관하게 list(사내 API 의 "POST 로 조회" 를 받아 준다). 목록 래퍼 판정(`listProperty`)은 ① 이름이 `data · content · list · items · rows · result(s) · records · body · payload` 인 객체 배열, ② 그것이 아니면 객체 배열 속성이 하나뿐이고 나머지 속성이 모두 래퍼용(success · message · 페이지 정보)일 때만이다 — 그래서 "엔티티 + 자식 배열(careers)" 은 목록이 아니라 상세로 남는다. 래퍼 안(`data`)이 객체면 한 단계 더 본다(`data.content`).
- **DataMap 하나로 폼을 잇는다.** 상세 응답 · 등록 본문 · 수정 본문이 같은 `$ref` 이름이거나 컬럼 이름이 절반 이상 겹치면 `dmDetail` 하나에 합친다(컬럼 합집합). 실제 eXBuilder 화면이 폼 DataMap 하나로 "선택 → 상세 조회 → 고쳐서 저장" 을 돌리는 관례를 따른 것이다. 경로 변수는 키 DataMap(`dmDetailKey` · `dmDeleteKey`)으로 떼고 `.js` 가 `action` 의 `{id}` 를 치환한다(Submission `action` 은 정적이라).
- **id 는 역할이 하나뿐일 때만 읽기 쉬운 이름**(`subList` · `dmSearch` · `dsList` · `dmDetail` · `subSave/subUpdate` · `subDelete`)이고, 같은 역할이 여럿이면 `operationId` 기반(`subGetEmployee`)이다. 컨트롤 id 도 뼈대가 준다(`ipbSrchDeptCd` · `ipbEmpNm` · `grdList` · `btnSearch` …) → 핸들러 이름이 `onBtnSearchClick` 처럼 읽힌다.
- **바인딩은 항목의 문자열 한 칸(`pt-bind`)이다.** `ds:` · `dm:x.col` · `sub:` · `clear:` 네 가지뿐이라 AST · 공유 문서 · 속성창이 같은 값을 들고 다니고, 해석은 내보낼 때 `clxSerializer.bindChildren()` 한 곳에서 한다. 모델(`app.model`)은 화면 상태(메모리)이고 공유하지 않는다.
- **CLX 스키마 확인 사항**(`kr.co.tomatosystem.exbuilder.model` 플러그인의 `cleopatra/head/*.xsd` · `body/bindable.xsd` 로 확정) — `<cl:model>` 자식 순서는 dataset → datamap → submission. `<cl:dataset>`/`<cl:datamap>` 은 `id` · `info` 와 `<cl:datacolumnlist><cl:datacolumn name datatype(string|number|decimal|expression)/>`. `<cl:submission id action method mediatype>` 의 자식 `<cl:requestdata dataid alias payload/>` · `<cl:responsedata dataid alias/>` 와 `<cl:datamapbind property datacontrolid columnname/>` 는 **`std:sid` 를 갖지 않는다**(붙이면 컴파일러가 "Feature 'sid' not found" 로 거부 — 실측). 컨트롤 자식 순서는 listener → bind → layoutdata → 고유 자식. 그리드는 `datasetid`, 헤더 셀 `targetcolumnname`, 디테일 셀 `columnname`.
- **`.js` 핸들러는 리스너가 있는 컨트롤에만** 만든다(직렬화 문맥 `ctx.handlers`). 그리드 `selection-change` 는 목록 데이터셋에 바인딩된 그리드 + 상세/폼 흐름이 있을 때만 붙는다. 삭제는 키를 폼 DataMap(같은 컬럼이 있으면) 아니면 그리드 선택 행에서 채운다.
- **명세 프록시**는 본문을 해석하지 않고 그대로 돌려준다(`DevServer.fetchOpenApi` · `CanvasOpenApiController`). 개발 도구라 주소를 제한하지 않으므로 외부 공개 서버에는 두지 않는다.
- **응답 샘플 JSON(명세가 없을 때)** — `parse()` 는 `openapi`/`swagger` 필드가 없는 JSON 을 응답 샘플로 그대로 돌려주고, `analyze()` 가 `analyzeSample()` 로 갈라진다(결과 모양은 같아 화면의 콤보·목록 상자·[화면 생성] 코드가 그대로다 — 항목에 `sample:true` 와 `kind/columns/path` 가 붙는다). 규칙은 값의 모양뿐이다 : 객체 → DataMap, 객체 배열 → DataSet, 그 안의 배열/객체는 재귀(`MAX_DEPTH` 8)로 자식 항목 — 배열 행 안의 배열은 모든 행의 것을 이어 붙이고(`sampleColumns` 가 `nested.values` 에 모은다), 배열 행 안의 객체는 행마다 하나씩 모아 DataSet 으로, 객체 안의 객체는 DataMap 으로. 스칼라 없는 래퍼(`{data:{content:[…]}}`)는 항목이 되지 않고 안의 것만 올라온다. 자료형은 값으로(정수 number · 소수 decimal · 그 밖 string · boolean 은 체크박스), 컬럼 이름이 대부분 page/total/count/message 계열인 DataMap 은 `role:"info"`(모델에만). **Submission 은 만들지 않는다**(주소·메서드가 없다) — `flows.list.sub` 가 null 이라 조회 버튼은 바인딩 없이 놓이고, `flows.form` 은 그리드와 폼에 같은 이름의 컬럼이 있을 때만 두어 의미 없는 selection-change 핸들러를 만들지 않는다. 화면 쪽(`Prototyper.js`)은 응답 샘플을 **화면 생성 재료가 아니라 "이 화면의 모델"** 로 다룬다 — 분석 즉시 `applySampleModel()` 이 `moApiModel` 로 붙이고(목록 상자 선택이 바뀌면 다시), `addCanvasItem()` 은 새 그리드를 아직 안 쓴 첫 DataSet 에 `ds:` 로 잇는다(`nextDataSetBind` · 먼저 그린 그리드는 `autoBindGrids`). 그래서 응답 샘플에서는 [화면 생성]·[모델만 적용] 을 숨긴다. 중첩 데이터의 경로는 `path`/`parent` 에 남겨 [참고]에 "alias 로 바로 못 받을 수 있다" 를 적는다.

## 10. 공유 (CRDT 실시간 협업)

사용법과 전체 그림은 [README](../README.md) 4.11 에 있다. 설계상의 요점만 적는다.

### 왜 CRDT 인가

캔버스 편집은 "누가 먼저 눌렀나" 로 줄 세우기 어렵다(동시에 다른 항목을 옮기는 것이 정상이다).
CRDT 는 **순서를 맞추지 않고도 같은 결과로 수렴**하므로 서버가 중재하지 않아도 된다 → 릴레이는 내용을 해석하지 않는 단순 중계로 끝난다.

### 문서 모양

```
Y.Doc
 └ items : Y.Map< uid, Y.Map{ uid, type, id, text, x, y, w, h, style } >
```

- **필드 단위 병합** — A 가 `x/y` 를, B 가 `text` 를 동시에 고쳐도 서로를 덮지 않는다. 같은 필드가 겹치면 나중 값(LWW).
- **`uid`** = 만든 시각(36진) + 일련번호 + 난수. 래퍼의 사용자 속성 `pt-uid` 에 넣는다.
  CLX `id` 는 사람이 바꾸는 이름이라 식별자로 쓸 수 없다.
- 항목 배열이 아니라 **맵**인 이유: 캔버스는 XY 배치라 순서가 의미를 갖지 않고, 맵이면 같은 항목의 동시 수정이 자연스럽게 합쳐진다.

### 되울림(echo) 막기 — 두 겹

| 겹 | 방법 |
|---|---|
| 웹소켓 | 원격 업데이트는 `Y.applyUpdate(doc, u, "collab-remote")` 로 적용하고, `doc.on("update")` 에서 그 origin 이면 보내지 않는다 |
| 화면 | 원격 변경을 캔버스에 반영하는 동안 `mbApplying` 을 세운다 → 그 사이에 불린 `publishXxx()` 는 모두 무시된다 |

덕분에 화면 쪽(`Prototyper.js`)은 **조건 없이** `publishAdd/Update/Delete` 를 부르면 된다(꺼져 있으면 그냥 무시된다).
초기 내려받기처럼 "화면만 고치고 문서는 건드리지 않을 때" 는 `collabSession.withRemote(fn)` 로 감싼다.

### 좌표 전송량

드래그 중에는 `setItemRect()` 가 1초에 수십 번 불린다. `publishRect()` 가 60ms 예약(trailing)으로 묶어 **그 시점의 최종 좌표**만 보낸다.
마우스 커서도 같은 방식으로 60ms 간격이며, `left/top` CSS 전이로 받는 쪽에서 부드럽게 이어 그린다.

### awareness (지금 상태)

`{ name, c(색 번호), sel(고른 uid), cursor{x,y} }`. 릴레이가 모아 두지 않으므로 두 가지 보완을 넣었다.

1. 소켓이 열리면 내 상태를 바로 한 번 보낸다(소켓보다 먼저 만든 첫 상태는 나가지 못했다).
2. `update` 에 **새 사람(added)** 이 있으면 내 clientID 도 함께 실어 보낸다 → 늦게 들어온 사람이 이미 있던 사람을 본다(두 번 오가면 수렴).

색은 `clientID % 1000003 % 8` 로 정한다(clientID 를 그대로 8로 나누면 값이 한쪽으로 몰리는 것을 확인했다).

### 접속 직후 합치기

공유본은 붙자마자 캔버스에 들어온다. 그래서 정할 것은 **켜기 직전에 내가 갖고 있던 항목**뿐이다(`maPreShareUids`).
이미 공유본에 있는 uid 는 "내 것" 에서 뺀다 → 껐다 켠 경우에 내 항목을 지우는 사고가 나지 않는다.

### 릴레이 두 벌, 같은 규약

`[0] + Yjs update`(모아 둔다) · `[1] + awareness update`(그냥 넘긴다). `Crdt_WebSoket` 프로젝트의 `CrdtRelayHandler` 와 같다.

- `tools/DevServer.java` 의 `CollabRelay` — `com.sun.net.httpserver` 가 업그레이드를 지원하지 않아 **HTTP 포트+1** 에 소켓을 따로 열고 RFC 6455(핸드셰이크·마스킹·조각 프레임·ping/pong)를 직접 구현했다.
- `CrdtRelayEndpoint` — Tomcat 의 JSR-356 이 `@ServerEndpoint` 를 스스로 찾는다(스프링 설정·추가 jar 불필요). 바이너리 버퍼 기본값 8KB 로는 캔버스 전체 전송이 잘려 `onOpen` 에서 1MB 로 올린다.
- 방은 `?room=<화면명>`, 기록은 방당 16MB 까지. **마지막 사람이 나가면 방을 버린다**(서버는 저장소가 아니다).
