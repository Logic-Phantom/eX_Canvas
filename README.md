# eX-Canvas — eXBuilder6 Web Prototyper

브라우저에서 **드래그 앤 드롭으로 화면 초안을 그리고, 사내 표준 템플릿(`/templates`)을 닮은 `.clx` 파일로 내보내는** 도구입니다.
React·Vue 같은 외부 프레임워크 없이 **eXBuilder6 앱(`.clx`) + `cpr.*` JavaScript API + 공통 모듈(`*.module.js`)** 만으로 만들었습니다.

```
(패턴 뼈대 미리 배치) → 팔레트에서 끌어다 놓기 → 캔버스(XY) 배치 → JSON AST 추출
                     → 템플릿 뼈대에 맞춰 재배치(규칙 또는 Gemini) → .clx/.js 저장
```

팔레트에는 낱개 컨트롤 29종과 프로젝트 UDC 말고도 **UI 템플릿**(스튜디오 상용구 116종 — 조회 버튼 · 저장 버튼 · 조회 폼 한 줄 · 그리드 구획 …)이 올라옵니다.
끌어다 놓으면 사내 테마 클래스가 붙은 채로 그려지므로 **브라우저에서 실제 모양 그대로** 보이고, 그대로 `.clx` 로 나갑니다.
빈 화면부터 그리기 싫으면 툴바의 **[미리 배치]** 로 고른 패턴의 뼈대를 캔버스에 깔고 고쳐 쓰면 됩니다.

툴바의 **[공유]** 를 켜면 같은 화면명을 쓰는 사람과 **한 캔버스를 실시간으로 함께** 고칩니다(CRDT · [4.11](#411-공유-crdt-실시간-협업)).
끄면 지금까지처럼 혼자 씁니다 — 공유는 체크박스를 켠 동안에만 동작합니다.

---

## 1. 빠른 시작

### Tomcat 없이 실행 (권장 · Java 11 이상)

프로젝트 루트에서 — Windows 와 macOS/Linux 는 실행 스크립트만 다릅니다(하는 일은 같습니다).

```bash
tools\dev.cmd        # Windows (cmd · PowerShell)
sh tools/dev.sh      # macOS · Linux
```

① 카탈로그 갱신(`SyncCatalog`) → ② 빌드(`BuildOnce` → `e6-compiler.jar`) → ③ 개발 서버가 뜹니다 → 브라우저에서 **http://127.0.0.1:8090/**
공유(CRDT) 릴레이도 함께 뜹니다 — **ws://127.0.0.1:8091/ws/crdt-sync.do** (HTTP 포트 + 1).

| 하고 싶은 것 | 방법 |
|---|---|
| Gemini 를 서버 프록시로 쓰기 | 실행 전에 `set GEMINI_API_KEY=발급받은키` (Windows) / `export GEMINI_API_KEY=발급받은키` (macOS) — 브라우저에 키를 두지 않는 경로 |
| 상용구 파일 위치 지정 | 실행 전에 `set EXCANVAS_CANNED_XMI=…\.settings\canned-templates.xmi` / `export EXCANVAS_CANNED_XMI=…/.settings/canned-templates.xmi` (이 프로젝트 `.settings` 에 사본이 있어 보통 필요 없음) |
| 카탈로그만 갱신(변경점 보기) | `java -Dfile.encoding=UTF-8 tools/SyncCatalog.java` |
| 빌드만 하기 | `java -Dfile.encoding=UTF-8 tools/BuildOnce.java target/clx-dev canvas/Prototyper` |
| 서버만 띄우기 | `java tools/DevServer.java target/clx-dev 8090` |
| 공유 릴레이 포트 바꾸기 / 끄기 | `java -Dexcanvas.collab.port=9001 …` / `-Dexcanvas.collab.port=0` (macOS 스크립트는 `export EXCANVAS_JAVA_OPTS="-D…"` 로도 전달) |

> Java 도구 세 개(`SyncCatalog` · `BuildOnce` · `DevServer`)와 `e6-compiler.jar` 는 OS 를 가리지 않습니다(`java.nio.file.Path` 만 사용). 경로 구분자는 Windows 에서 `\` 대신 `/` 를 써도 됩니다.

#### 개발 환경 (Windows ↔ macOS)

| 항목 | Windows(노트북) | macOS |
|---|---|---|
| JDK | 11 이상 | Oracle JDK 11 (`/Library/Java/JavaVirtualMachines/jdk-11.jdk`) — `~/.zshrc` 에 `JAVA_HOME` 설정 |
| 이클립스 + eXBuilder6 플러그인 | `C:/eclipse_AI` | `/Applications/Eclipse.app` (2026-09 · eXBuilder 플러그인 6190 · 내장 JRE 25) · 워크스페이스 `~/Desktop/eclipse/workspace` |
| Tomcat 9 | 이클립스 서버 | `~/Desktop/eclipse/apache-tomcat-9.0.122` (이클립스 "Apache Tomcat v9.0" 런타임으로 등록됨) |
| 프로젝트 위치 | `C:/eclipse_AI/workspace/eX-Canvas` | `~/Desktop/eclipse/eX_Canvas` (워크스페이스 밖 · 이클립스에 import 되어 있음) |

macOS 에서 처음 쓸 때 한 번만:

- Tomcat 을 터미널에서 직접 띄우려면 zip 을 풀면서 실행 권한이 빠지므로 `chmod +x ~/Desktop/eclipse/apache-tomcat-9.0.122/bin/*.sh` (이클립스에서 띄울 때는 불필요).
- 이클립스에서 `clx-build`(사내 테마 산출물)가 없으면 프로젝트를 한 번 빌드합니다(`BuildOnce` 가 여기서 테마를 가져옵니다). 저장소에 이미 들어 있어 보통 그대로 됩니다.
- 파일은 모두 UTF-8 · LF 이고 `core.autocrlf` 는 쓰지 않습니다. Windows 쪽 git 도 같은 설정이면 줄 끝 차이로 인한 diff 가 생기지 않습니다.
| 다른 PC 와 공유하기(사내망 실습) | 릴레이를 `-Dexcanvas.collab.host=0.0.0.0` 로 열고, 상대는 **자기 PC 에서 화면을 띄운 뒤** 속성창 **서버** 칸에 `ws://<내 IP>:8091/ws/crdt-sync.do` 를 넣습니다. (개발 서버의 HTTP 는 127.0.0.1 전용이라 화면 자체는 각자 띄웁니다. 한 번에 여럿이 쓰려면 Tomcat 배포가 낫습니다) |

### eXBuilder6 스튜디오 / Tomcat 에서 실행

프로젝트를 빌드·배포한 뒤 `…/eX-Canvas/ui/canvas/Prototyper.clx` 를 엽니다.
`result` 저장은 서버가 배포 경로에서 `clx-src` 를 스스로 찾습니다. 못 찾으면(다른 워크스페이스 등) Tomcat JVM 옵션에 `-Dexcanvas.src.dir=C:/eclipse_AI/workspace/eX-Canvas/clx-src`(Windows) / `-Dexcanvas.src.dir=/Users/<나>/Desktop/eclipse/eX_Canvas/clx-src`(macOS) 를 추가하세요.
저장 서버가 아예 없는 환경(스튜디오 내장 미리보기 등)에서는 속성창 맨 아래 **[폴더 지정]** 으로 `clx-src/result` 를 한 번 고르면 브라우저가 그 아래 날짜 폴더에 직접 씁니다. 화면 오른쪽 **저장 위치 (result)** 칸이 지금 어디에 저장되는지 알려 줍니다.

### 사용 순서

1. (선택) 툴바에서 **패턴**을 고르고 **미리 배치**를 켜면 그 패턴의 뼈대가 캔버스에 깔립니다 — 빈 화면부터 그리지 않아도 됩니다([4.9](#49-패턴-미리-배치)).
2. 좌측 **팔레트**에서 컨트롤 · UDC · **UI 템플릿**을 중앙 **캔버스**로 끌어다 놓습니다. (더블클릭으로도 추가)
   항목이 149개나 되므로 팔레트 맨 위 **찾기 상자**에 `조회` `버튼` 처럼 넣어 좁혀 쓰세요.
3. 캔버스에서 항목을 끌어 **이동**, 오른쪽 아래 파란 핸들로 **크기 조절**, 클릭해 **선택**합니다.
4. 우측 **속성창**에서 ID · Text · Left · Top · Width · Height 를 고칩니다. (Text 의 뜻은 유형마다 다릅니다 — 아래 표)
5. 상단 툴바에서 **화면명 · 변환 방식 · 패턴 · 팝업 여부**를 정합니다.
6. (선택) 같이 고칠 사람이 있으면 **화면명을 맞추고** 각자 **[공유]** 를 켭니다 — 서로의 커서 · 선택 · 편집이 그대로 보입니다([4.11](#411-공유-crdt-실시간-협업)).
7. **[미리보기]** 로 XML 을 확인하고, **[result 저장]**(프로젝트에 저장) 또는 **[CLX 다운로드]**(브라우저 다운로드)를 누릅니다.

---

## 2. 화면 구성

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 툴바  화면명 | 변환 | 패턴 | 미리 배치 | 팝업 | 공유 | [미리보기] [AST(JSON)] [result 저장] [CLX 다운로드] [전체 삭제] │
├────────────┬─────────────────────────────────────────────────┬───────────────────────────────────────┤
│ 팔레트      │ 캔버스 (canvasGroup, XYLayout)                   │ 속성창                                 │
│  [찾기]     │   끌어다 놓은 컨트롤이 실제 cpr.controls.* 로      │  Type / ID / Text                     │
│  기본       │   그려진다                                       │  Left / Top / Width / Height          │
│  입력       │   (공유 중이면 남의 커서·선택이 함께 보인다)         │  [선택 삭제]                           │
│  데이터·컨테이너├─────────────────────────────────────────────────┤ 공유 : 내 이름 / 서버 / 상태 / 접속자     │
│  UDC        │ 출력 미리보기 (생성된 XML / AST JSON)              │ 저장 위치 / [폴더 지정]                 │
│  UI 템플릿 · 버튼 │                                             │ Gemini 설정                           │
│  UI 템플릿 · 폼 …│                                             │  API Key / Model / 호출 경로 / 메모     │
└────────────┴─────────────────────────────────────────────────┴───────────────────────────────────────┘
```

팔레트 맨 위 **찾기 상자**에 글자를 넣으면 이름·설명이 맞는 항목만 남고, 남은 것이 없는 묶음 머리글도 함께 숨습니다.

### 툴바 옵션

| 항목 | 값 | 설명 |
|---|---|---|
| 변환 | **템플릿(규칙 기반)** | 좌표를 분석해 템플릿 뼈대로 재배치. AI 불필요(기본값) |
| | **템플릿(Gemini AI)** | 규칙 기반 초안을 Gemini 가 다듬음(라벨·제목·의미 있는 id·패턴 선택). 실패하면 규칙 기반으로 자동 대체 |
| | **XY 좌표 그대로** | 캔버스 좌표를 `cl:xylayout` 으로 그대로 내보냄 |
| 패턴 | 자동 선택 / P1-1 … P8-3 | 직접 고르면 그 패턴의 배치(위아래/좌우)를 강제 |
| 미리 배치 | 체크 | 패턴을 고르는 순간 그 패턴의 뼈대(조회 조건 · 그리드/폼 · 하단 버튼)를 캔버스에 깔아 준다 |
| 팝업 | 체크 | `_P` 템플릿 형태(`pop-content-wrapper`, EXB-POP 활성, 앱 헤더 숨김) |
| 공유 | 체크 | **화면명과 같은 이름의 "방"** 에 붙어 캔버스를 실시간으로 함께 고친다. 끄면 연결을 끊고 그때까지의 캔버스를 혼자 이어서 쓴다([4.11](#411-공유-crdt-실시간-협업)) |

### 팔레트 (기본 29종 + UDC + UI 템플릿 116종 = 149항목)

| 묶음 | 컨트롤 |
|---|---|
| 기본 | Output · Button · Image · HTMLSnippet · Progress |
| 입력 | InputBox · ComboBox · DateInput · NumberEditor · MaskEditor · SearchInput · CheckBox · CheckBoxGroup · RadioButton · ListBox · TextArea · Slider · FileInput |
| 데이터 · 컨테이너 | Grid · Tree · TabFolder · Accordion · Group · PageIndexer · Calendar · FileUpload · EmbeddedPage · EmbeddedApp · UIControlShell |
| UDC | 빌드에 등록된 UDC 전부 — 런타임에 자동 탐색. `clx-src/udc` 에 추가하고 빌드하면 팔레트에 나타남 |
| UI 템플릿 · &lt;묶음&gt; | 스튜디오 상용구 116종. 상용구의 `[버튼]` `[폼]` `[콘텐츠]` … 묶음이 그대로 팔레트 묶음이 됨 ([4.7](#47-ui-템플릿스튜디오-상용구)) |

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
├ docs/
│  ├ eX-Canvas-architecture.md       ← 상세 설계(아키텍처 · 템플릿 매칭 · Gemini · 저장 규약)
│  └ catalog.md                      ← **자동 생성** : UI 템플릿 · UDC · 화면 템플릿 목록 + 변경 이력
├ templates/                         ← 표준 화면 템플릿 77개(P0~P8, popup). 생성물이 닮아야 할 원본
├ .settings/canned-templates.xmi     ← 스튜디오 상용구(UI 템플릿의 원본). 없으면 eXCFrame-ui 워크스페이스를 찾는다
├ clx-src/                           ← eXBuilder6 소스 경로
│  ├ canvas/
│  │  ├ Prototyper.clx               ← Web Prototyper 화면(툴바 · 팔레트 · 캔버스 · 속성창 · 미리보기)
│  │  ├ Prototyper.js                ← 화면 스크립트: 드래그 앤 드롭 · 선택/이동/크기 · 속성 반영 · 내보내기
│  │  └ 확인필요.md                   ← 검증한 것 / 아직 확인이 필요한 것
│  ├ module/canvas/                  ← 공통 모듈 10종 (cpr.core.Module.require("module/canvas/<이름>"))
│  │  ├ controlRegistry.module.js    ← 컨트롤 유형 표 + UDC 자동 탐색 + UI 템플릿 등록
│  │  ├ canvasAst.module.js          ← 캔버스 → JSON AST
│  │  ├ templatePlanner.module.js    ← 템플릿 카탈로그 · 규칙 기반 계획 · 계획 검증/정규화 · 패턴 뼈대(skeleton)
│  │  ├ geminiPlanner.module.js      ← Gemini 호출 → 화면 계획(JSON)
│  │  ├ clxSerializer.module.js      ← JSON → .clx XML (XY / 템플릿 뼈대 / UI 템플릿 트리)
│  │  ├ fileDownload.module.js       ← Blob 다운로드 · 저장 서버 요청 · 지정 폴더에 직접 쓰기
│  │  ├ templateBuilder.module.js    ← UI 템플릿 노드 → 실제 cpr.controls.* 트리(캔버스 미리보기)
│  │  ├ uiTemplateCatalog.module.js  ← **자동 생성** : 상용구 116종의 컨트롤 트리 (SyncCatalog 가 만든다)
│  │  ├ collabSession.module.js      ← 공유 세션 : Y.Doc(항목) · awareness(커서/선택) · 웹소켓 · 서버 주소 찾기
│  │  └ yjsLoader.module.js          ← 공유를 켤 때만 Yjs·y-protocols 를 내려받는다(동적 import)
│  ├ style/prototyper.less           ← Prototyper 전용 스타일(env.json 의 runtime-css 에 등록)
│  ├ theme/                          ← eXCFrame 테마 LESS 원본(이클립스 빌더가 컴파일한다 — [6](#6-검증-현황과-알려진-제약) 참고)
│  ├ udc/com/                        ← 프로젝트 UDC (팔레트 UDC 묶음의 원천)
│  └ result/<yyyyMMdd>/              ← [result 저장] 결과물(.clx + .js). 실행한 날짜별 폴더
├ src/main/java/com/tomatosystem/canvas/web/
│  ├ GeminiProxyController.java      ← POST /ai/gemini.do       (Tomcat 용 Gemini 프록시)
│  ├ CanvasResultController.java     ← /canvas/saveResult.do (Tomcat 용 result 저장 · GET 은 가능 여부 확인)
│  └ CrdtRelayEndpoint.java          ← /ws/crdt-sync.do      (Tomcat 용 공유 릴레이 · javax.websocket)
├ tools/
│  ├ dev.cmd · dev.sh                ← 카탈로그 갱신 + 빌드 + 개발 서버 실행 (Windows · macOS/Linux)
│  ├ SyncCatalog.java                ← 상용구 XMI·UDC·화면 템플릿 훑기 → 카탈로그 모듈 · docs/catalog.md · 변경 보고
│  ├ catalog-index.txt               ← 자동 생성: 변경 감지용 지문(항목별 해시)
│  ├ BuildOnce.java                  ← e6-compiler 실행 + eXCFrame 테마(clx-build/theme) 반영
│  └ DevServer.java                  ← Tomcat 없이 쓰는 개발 서버(정적 파일 + 위 엔드포인트 + 공유 릴레이), 127.0.0.1 전용
├ ci-lib/clx/e6-compiler.jar         ← eXBuilder6 컴파일러(빌드 · 생성물 유효성 검증에 사용)
├ exbuilder/runtime/                 ← 런타임(cleopatra.js · 기본 테마)
├ clx-build/                         ← 이클립스 eXBuilder6 빌더 산출물. BuildOnce 가 여기서 테마를 가져온다
└ target/clx-dev/                    ← 개발 서버용 빌드 산출물(생성됨)
```

---

## 4. 동작 원리

### 4.1 전체 데이터 흐름

```
 팔레트 항목(Output · UDC · UI 템플릿)         ◀── 패턴 미리 배치는 이 단계를 건너뛰고 캔버스에 바로 깐다
    │  cpr.controls.DragSource (dataType = "pt-palette", 피드백은 app.floatControl)
    ▼
 canvasGroup  ── cpr.controls.DropTarget.onDrop ──▶ pointerLocation → 캔버스 상대 좌표(10px 격자 스냅)
    │  new cpr.controls.Xxx() / new udc.com.Xxx() / templateBuilder.build(UI 템플릿)
    │      →  canvas.addChild(wrapper, {top,left,width,height})
    ▼
 canvasAst.extract()      getChildren() 순회 + getConstraint()(좌표) + userAttr()(유형·id·text)
    ▼
 JSON AST   { app:{name,popup,canvas}, children:[{type, role, id, text, items, udcType, tpl, layoutData:{x,y,width,height}}] }
    │          (UI 템플릿은 type="uitpl" + tpl = 카탈로그 항목)
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
 [result 저장]  saveToProject() → POST /canvas/saveResult.do ─┬─▶ clx-src/result/<yyyyMMdd>/<화면명>.clx · .js
                saveToDirectory() → 지정한 폴더(브라우저가 직접) ┘   (둘 다 안 되면 브라우저 다운로드)
 [CLX 다운로드] fileDownload.downloadClx()   → Blob → <a download>
```

### 4.2 캔버스 항목의 구조

캔버스에 놓인 항목 하나는 **래퍼 그룹**입니다.

```
래퍼 그룹(XY, class=pt-item)   ← 캔버스의 XY 제약(top/left/width/height)이 위치·크기의 단일 원본
 ├ ① 실제 컨트롤 (cpr.controls.* · UDC 인스턴스 · UI 템플릿 트리)  ← 보이기만 한다
 ├ ② 투명 덮개 Output (pt-item-overlay)               ← 클릭 = 선택, 드래그 = 이동
 └ ③ 크기 핸들 Output (pt-item-handle)                ← 드래그 = 크기 조절
래퍼의 사용자 속성: pt-type(유형) · pt-id(CLX id) · pt-text(속성창 Text)
  pt-type 은 유형 키 그대로 — 기본 컨트롤은 `output` · UDC 는 `udc:<정규 이름>` · UI 템플릿은 `uitpl:<uuid>`
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

어디에 저장하든 결과는 같습니다 — `…/result/<yyyyMMdd>/<화면명>.clx` 와 같은 이름의 `.js`. 소스 경로 안이므로 스튜디오에서 바로 열립니다(앱 URI `result/<yyyyMMdd>/<화면명>`).
같은 이름이 있으면 덮어쓰지 않고 `_HHmmss` 를 붙이고, 파일명은 글자·숫자·`_`·`-` 만 남깁니다(`result` 폴더 밖으로 나갈 수 없음).

화면이 뜰 때 `GET /canvas/saveResult.do?probe=1` 로 저장 서버를 확인해 두고, **[result 저장]** 은 아래 순서로 저장합니다.

| 순위 | 방법 | 조건 | 쓰는 주체 |
|---|---|---|---|
| 1 | 저장 서버 | `POST /canvas/saveResult.do?name=<화면명>` 이 200 (DevServer · Tomcat) | 서버 |
| 2 | 저장 폴더 | 속성창 **[폴더 지정]** 으로 `clx-src/result` 를 고른 경우 (Chrome · Edge) | 브라우저(File System Access API) |
| 3 | 브라우저 다운로드 | 위 둘 다 안 될 때 | 브라우저 기본 다운로드 폴더 |

- **저장 서버** — 본문은 `clx + "\n=====eX-Canvas-JS=====\n" + js`, `X-Requested-With: eX-Canvas` 헤더가 없으면 403.
  소스 경로(`clx-src`)는 ① `-Dexcanvas.src.dir` / `EXCANVAS_SRC_DIR` ② 배포 폴더에서 위로 올라가며 탐색 ③ 이클립스 WTP 배포 경로 → 워크스페이스의 같은 이름 프로젝트(워크스페이스 밖에 있는 프로젝트는 `.metadata` 의 `.location` 으로 실제 위치를 찾음) ④ 서버 실행 폴더 순으로 찾습니다. DevServer 는 실행 폴더·빌드 폴더에서 거슬러 찾으므로 어느 폴더에서 실행해도 됩니다(시작 로그에 저장 경로를 찍습니다).
- **저장 폴더** — 고른 폴더는 IndexedDB 에 남아 다음 실행에도 이어집니다(권한만 저장할 때 다시 확인). 폴더 선택·권한 창은 브라우저가 클릭 안에서만 열어 주므로 CLX 를 만들기 **전에** 먼저 확보합니다.
- 현재 어디에 저장되는지는 속성창 **저장 위치 (result)** 칸에 나옵니다.

### 4.7 UI 템플릿(스튜디오 상용구)

`[버튼] 조회 버튼` · `[폼] 조회 (1행)` · `[콘텐츠] 그리드` 처럼 **이미 디자인이 끝난 컨트롤 묶음**을 팔레트에서 그대로 꺼내 씁니다.
원본은 eXBuilder6 스튜디오의 상용구 파일 `<eXCFrame-ui>/.settings/canned-templates.xmi` 입니다.

```
canned-templates.xmi ── SyncCatalog(빌드 전) ──▶ uiTemplateCatalog.module.js (컨트롤 트리 JSON)
                                                    │
                        팔레트/캔버스 ◀── templateBuilder.build() ──┤  실제 cpr.controls.* 트리 (테마 클래스 그대로)
                        .clx 내보내기 ◀── clxSerializer.catalogNodeEl() ──┘  같은 트리를 XML 로
```

- **한 노드, 두 출력** — 캔버스에 그리는 것과 파일로 나가는 것이 같은 노드에서 나옵니다. 화면에서 본 모양이 곧 `.clx` 입니다.
- 클래스(`btn-search` · `search-box` · `label required` …)·레이아웃(폼/플로우/버티컬의 행·열·여백)·고정 아이템·그리드 컬럼 수를 그대로 옮깁니다.
- 옮기지 않는 것 : 스튜디오 전용 정보(`metaData` · `fieldLabel`), 표현식 바인딩(`itemStyle`/`binders`), 탭 아이콘용 `userAttributes`. 데이터셋에 붙는 속성(`datatype` · `displayexp`)은 파일에는 그대로 나가지만 캔버스 미리보기에는 쓰지 않습니다.
- UDC 가 들어 있는 템플릿은 공통 모듈(`createCommonUtil`)이 없는 이 프로젝트에서 이름표로 대신 보입니다(파일에는 `<cl:udc type="…">` 로 정상 출력).
- 템플릿 묶음 이름으로 화면 계획에서의 역할을 정합니다 — `버튼`→버튼 자리, `아웃풋`→라벨, `폼`·`인풋박스` 등→입력 필드, `콘텐츠`·`탭폴더`·`프레임`·`카드`→데이터 구획.

### 4.8 카탈로그 동기화와 변경 감지

`tools\dev.cmd` / `tools/dev.sh` 가 빌드 전에 `SyncCatalog` 를 돌립니다(수동: `java -Dfile.encoding=UTF-8 tools/SyncCatalog.java`).

| 보는 곳 | 무엇을 |
|---|---|
| `.settings\canned-templates.xmi` (없으면 eXCFrame-ui 워크스페이스) | UI 템플릿 116종. `-Dexcanvas.canned.xmi` · `EXCANVAS_CANNED_XMI` · 실행 인자로 경로를 직접 줄 수도 있습니다 |
| `clx-src/udc/**` | 프로젝트 UDC |
| `templates/**` | 화면 템플릿(P0~P8 · popup) |

- 만드는 것 : `clx-src/module/canvas/uiTemplateCatalog.module.js`(팔레트가 읽는 카탈로그) · `docs/catalog.md`(사람이 읽는 목록) · `tools/catalog-index.txt`(지문).
- 지난 실행의 지문과 비교해 **추가 / 삭제 / 수정**을 콘솔과 `docs/catalog.md` 에 적습니다. 이름뿐 아니라 컨트롤 트리·클래스·레이아웃이 바뀐 것도 "수정"으로 잡습니다.
- 상용구 파일을 찾지 못하면 기존 카탈로그를 그대로 두고 경고만 합니다(빌드는 계속됩니다).

### 4.9 패턴 미리 배치

툴바에서 **미리 배치**를 켜고 **패턴**을 고르면 그 패턴의 뼈대가 캔버스에 깔립니다(이미 그린 것이 있으면 물어본 뒤 지웁니다).

- 깔리는 것 : 조회 조건 줄(라벨·입력·기간·조회·초기화) → 패턴별 데이터 영역(그리드 / 폼 / 탭 / 트리 / 셔틀 / 카드 …) → 하단 버튼(저장·닫기).
- **지금 보이는 캔버스 크기를 꽉 채웁니다.** 사방 20px 여백만 두고 폭·높이를 나눠 쓰므로 오른쪽·아래가 남지 않습니다 — 조회/초기화·저장/닫기 버튼은 오른쪽 끝에 붙고, 하단 버튼 줄은 캔버스 바닥에 붙습니다. 폼 구획은 남는 높이만큼 행을 더 깔고 행 간격을 늘려 채웁니다. 창을 넓히고 다시 고르면 그 크기로 다시 깔립니다.
- 좌표는 **규칙 기반 변환이 그 패턴으로 다시 읽도록** 맞춰 두었습니다(데이터 컨트롤 위 = 조회 조건, 맨 아래 줄 = 하단 버튼, 좌우 배치는 세로로 겹치게).
- 21개 패턴 모두 `skeleton → planByRule → resolve` 왕복을 확인했습니다. 다만 `P4-1/P4-3/P4-4` 는 `P1-6/P3-2/P3-1` 과 배치가 같아 **자동 선택**으로 되돌리면 뒤쪽으로 판정됩니다(고른 패턴을 그대로 두면 그대로 나갑니다).

### 4.10 생성되는 CLX 의 규칙

- `std:sid` 는 파일 안에서 유일(태그별 접두 + 16진수 8자리), 컨트롤 `id` 도 중복 시 번호를 붙여 유일하게.
- 컨테이너의 레이아웃 노드는 마지막 자식, 자식마다 부모 레이아웃에 맞는 데이터 노드(`cl:formdata` / `cl:verticaldata` / `cl:flowlayoutdata` / `cl:xylayoutdata`).
- `style` 속성은 쓰지 않고 템플릿과 같은 클래스(`search-box` · `content` · `form-base` · `btn-primary-01` …)만 사용.
- 스크린은 템플릿과 같은 `EXB-FULL / EXB-DIV / EXB-PART / EXB-POP`.
- 데이터셋 · 서브미션 · 이벤트 핸들러는 만들지 않습니다(화면 초안 도구). `.js` 는 템플릿과 같은 머리 주석뿐입니다.

### 4.11 공유 (CRDT 실시간 협업)

툴바 **[공유]** 를 켠 사람들끼리 **한 캔버스**를 같이 고칩니다. 끄면 웹소켓을 닫고 그때까지의 캔버스를 각자 혼자 이어서 씁니다(내용은 지우지 않습니다).
끈 상태에서는 라이브러리도 받지 않고 서버에 붙지도 않습니다 — 기존 사용 방식이 그대로입니다.

#### 방(room) = 화면명

접속 주소에 `?room=<화면명>` 을 붙입니다. **같이 고치려면 툴바 화면명을 서로 맞추면 됩니다.**
켠 뒤에 화면명을 바꿔도 방은 그대로입니다(껐다 켜면 새 이름의 방으로 갑니다).

#### 무엇이 오가는가

```
 내 캔버스                                     ┌──────────────┐                                   남의 캔버스
 ────────                                     │  릴레이 서버   │                                   ────────
 항목 추가/이동/크기/ID/Text/삭제                 │ (내용을 해석 │
   → collabSession.publishXxx()               │  하지 않는다) │
   → Y.Doc(items)  ─ update ─▶ [0]+update ──▶ │ 방마다 모아 둠 │ ──▶ [0]+update ─▶ Y.Doc ─ observe ─▶ 캔버스에 반영
                                              │              │
 마우스 커서 · 선택                             │              │
   → awareness ────────────▶ [1]+update ────▶ │ 그냥 넘김     │ ──▶ awareness ──▶ 커서·선택 상자 그리기
                                              └──────────────┘
```

- **문서(누가 무엇을 어디에 놓았는지)** 는 CRDT(Yjs)가 합칩니다. 동시에 고쳐도 충돌·되돌림이 없습니다.
  항목 하나 = `Y.Map { uid, type, id, text, x, y, w, h }`, 전체 = `Y.Map<uid, 항목>`.
  **필드 단위로 합치므로** A 가 옮기는 동안 B 가 Text 를 고쳐도 서로를 덮어쓰지 않습니다(같은 필드를 동시에 고치면 나중 값).
- **`uid`** 는 항목을 만들 때 붙는 전역 고유 키(시각+일련번호+난수)입니다. 래퍼의 사용자 속성 `pt-uid` 에 들어가며, 공유를 켜지 않아도 늘 붙습니다.
  CLX 의 `id` 는 사람이 읽는 이름이라 바뀔 수 있어서, 누가 어느 컨트롤을 고쳤는지는 `uid` 로 맞춥니다.
- **커서·선택(awareness)** 은 문서가 아니라 "지금 상태"라 저장하지 않습니다. 접속이 끊기면 그 사람의 커서도 함께 사라집니다.
- 전선 규약은 `Crdt_WebSoket` 프로젝트(`CrdtRelayHandler`)와 같습니다 — 첫 바이트 `0` = 문서, `1` = 커서. 서버를 서로 바꿔 써도 됩니다.

#### 켤 때 내 캔버스는 어떻게 되나

붙자마자 방에 있던 내용이 먼저 내 캔버스에 들어옵니다. 그다음 **켜기 직전에 내가 갖고 있던 항목**만 놓고 정합니다.

| 상황 | 결과 |
|---|---|
| 방이 비어 있음 | 내 캔버스를 그대로 올린다(내가 첫 사람) |
| 방에 있고 내 캔버스는 비었음 | 받은 것만 쓴다(묻지 않는다) |
| 둘 다 있음 | 물어본다 — **[확인]** 내 것도 올려 합친다 / **[취소]** 내가 그린 것은 지우고 공유본만 쓴다 |
| 껐다 다시 켬 | 이미 공유본에 있는 내 항목은 "내 것" 으로 치지 않으므로 묻지 않고 그대로 이어 간다 |

#### 남이 어디를 보고 있는지

- **커서** — 남의 마우스가 캔버스 안에 있으면 그 자리에 **화살표 + 이름표**가 뜹니다(60ms 간격 · 캔버스 기준 좌표, `left/top` 전이로 부드럽게 움직입니다).
  캔버스 밖으로 나가면 커서는 사라지고, 이름표는 그 사람이 고른 항목 위로 붙습니다.
- **선택** — 남이 고른 항목에 그 사람 색의 테두리 상자가 생깁니다. 그 항목이 움직이면 상자도 따라갑니다.
- 색은 사람마다 8가지 중 하나(`pt-peer-0` ~ `pt-peer-7`, clientID 로 정함)입니다.
  **인라인 스타일을 쓰지 않으려고** 색을 클래스로 나눴습니다 — 캔버스 항목과 같은 원칙(위치는 레이아웃, 모양은 클래스)입니다.
- 커서·선택 표시는 캔버스 안에 만든 아웃풋 2개(상자 · 이름표)이고 `pointer-events:none` 이라 내 조작을 가로채지 않습니다.
  AST 추출·저장에서는 `pt-type` 이 없어 자동으로 빠집니다.

#### 서버 (둘 중 하나면 됩니다)

| 실행 방법 | 담당 | 주소 |
|---|---|---|
| 개발 서버 | `tools/DevServer.java` 의 `CollabRelay`(RFC 6455 직접 구현) | `ws://127.0.0.1:<HTTP 포트+1>/ws/crdt-sync.do` |
| Tomcat 배포 | `CrdtRelayEndpoint`(`javax.websocket` · `@ServerEndpoint`) | `ws://<서버>/<컨텍스트>/ws/crdt-sync.do` |

- 화면은 뜰 때 `GET /canvas/collabInfo.do` 로 주소를 묻고(개발 서버만 답합니다), 답이 없으면 **이 화면을 내려준 서버의 같은 포트**로 봅니다(Tomcat 배포가 이 경우).
  속성창 **서버** 칸에 직접 적으면 그 주소를 씁니다(빈 칸 = 자동).
- 릴레이는 **내용을 해석하지 않습니다.** 방마다 문서 변경을 모아 두었다가 새로 들어온 사람에게 다시 들려줄 뿐입니다.
  **마지막 사람이 나가면 방과 기록을 버립니다** — 다음 사람이 자기 캔버스로 새로 엽니다(서버는 파일을 저장하지 않습니다).
- `com.sun.net.httpserver` 는 프로토콜 업그레이드를 지원하지 않아 개발 서버는 릴레이를 **다른 포트**에서 엽니다.
- 끊기면 2초 간격으로 3번까지 다시 붙고, 그래도 안 되면 체크가 자동으로 꺼지며 이유를 알려 줍니다.

#### 라이브러리

`yjsLoader` 가 **공유를 처음 켤 때** `https://esm.sh` 에서 `yjs@13.6.8` 과 `y-protocols@1.0.6/awareness` 를 동적 `import` 합니다(두 패키지를 같은 yjs 버전으로 받는 것이 중요합니다 — 인스턴스가 갈리면 awareness 가 동작하지 않습니다).
사내망처럼 esm.sh 를 못 여는 곳이면 사본을 두고 화면보다 먼저 `window.EXCANVAS_YJS_URL` · `window.EXCANVAS_YAWARENESS_URL` 에 주소를 넣으면 됩니다.

---

## 5. 확장하는 법

| 하고 싶은 것 | 고칠 곳 |
|---|---|
| 팔레트에 컨트롤 추가 | `controlRegistry.module.js` 의 `TYPES` 에 1항목 + `CATEGORIES` 에 유형 키 + `clxSerializer.module.js` 의 `TAG_INFO` 에 1줄(고유 속성이 있으면 `controlEl` 의 `switch`) |
| UDC 추가 | `clx-src/udc/**` 에 UDC 를 만들고 빌드 — 코드 수정 없음 |
| **UI 템플릿 추가** | 스튜디오에서 상용구를 만들고 `tools\dev.cmd` / `tools/dev.sh`(또는 `SyncCatalog`) 실행 — 코드 수정 없음 |
| UI 템플릿 컨트롤 유형 추가 | `templateBuilder.module.js` 의 `FACTORY` 에 1줄(캔버스 미리보기용). CLX 출력은 `TAG_INFO` 를 따른다 |
| 템플릿 패턴 추가 | `templatePlanner.module.js` 의 `CATALOG` + `decidePattern()` + `skeleton()` 의 `switch` |
| 뼈대(클래스·행 높이·스크린) 변경 | `clxSerializer.module.js` (`headEl` · `searchHeaderEl` · `sectionEl` · `footerEl`) |
| AI 프롬프트·응답 스키마 | `geminiPlanner.module.js` (`SYSTEM_TEXT` · `buildResponseSchema`) |
| 공유 항목에 필드 추가(예: 잠금·색) | `collabSession.module.js` 의 `FIELDS` 에 이름 추가 + `Prototyper.js` 의 `itemRecord()`·`applyRemoteUpdate()` |
| 공유 표시(커서·선택 상자) 모양 | `style/prototyper.less` 의 `.pt-remote-sel` · `.pt-remote-chip` · `.pt-peer-0~7` |
| 공유 서버를 따로 운영 | 릴레이 주소만 속성창 **서버** 칸(또는 `collabInfo.do` 응답)에 넣으면 됩니다. 전선 규약은 `[0]`=문서 · `[1]`=커서 두 가지뿐입니다 |
| CRDT 라이브러리 위치(폐쇄망) | 화면보다 먼저 `window.EXCANVAS_YJS_URL` · `window.EXCANVAS_YAWARENESS_URL` 설정 |

---

## 6. 검증 현황과 알려진 제약

**검증한 것**

- `Prototyper.clx` 와 모듈 10종: `e6-compiler.jar` 컴파일 문제 0건. `DevServer.java` · `CrdtRelayEndpoint.java` `javac` 통과.
- 브라우저에서 드롭 · 더블클릭 추가 · 이동 · 팔레트 찾기 · 미리보기 · result 저장 동작.
- 생성 CLX: 컨트롤 29종 + UDC 4종을 XY·템플릿 두 방식으로 내보내 컴파일 문제 0건. 일반/팝업/셔틀/탭/트리 시나리오의 실행 화면 구조 확인.
- **UI 템플릿 116종 전부** — 캔버스 컨트롤 트리 생성 오류 0건, 한 화면에 모두 담아 내보낸 `.clx` 컴파일 오류 0건(`std:sid`·`id` 충돌 없음). `[폼] 조회 (1행)` 은 브라우저에서 사내 테마(`search-box` · `label required` · `btn-search`)가 그대로 나오는 것을 눈으로 확인.
- **패턴 미리 배치 21개** — `skeleton() → planByRule() → resolve()` 왕복에서 고른 패턴 그대로 나오는 것 확인(자동 선택일 때 18/21은 그대로, 나머지 3개는 아래 5번). 900×580 과 1600×900 두 크기에서 21개 모두 사방 여백이 정확히 20px(넘침·빈 공간 0) 인 것 확인.
- Gemini: 서버 프록시 경로로 실호출 성공(`gemini-2.5-flash`, 응답 스키마 통과).
- **공유(CRDT)** — 브라우저 탭 2개를 개발 서버 릴레이(`ws://127.0.0.1:8091`)에 실제로 붙여 확인했습니다.
  ① 방 열기(첫 사람) · ② 나중 사람이 기존 항목을 그대로 받기 · ③ 항목 추가 · **드래그 이동** · 크기 · `ID`/`Text` 변경 · 삭제가 양쪽에 같은 값으로 반영 ·
  ④ 남의 **커서**(캔버스 좌표)와 **선택 상자**가 따라 움직임 · 사람마다 다른 색 · 이름 바꾸면 즉시 반영 ·
  ⑤ 공유를 끄면 상대 화면에서 접속자·표시가 바로 사라지고 내 캔버스는 그대로 남음 ·
  ⑥ 껐다 다시 켜도(다른 사람이 방에 남아 있을 때) 내 항목이 사라지지 않음 ·
  ⑦ 마지막 사람이 나가면 릴레이가 방·기록을 버림(서버 로그로 확인).

**알려진 제약 · 확인이 필요한 것** (상세: [clx-src/canvas/확인필요.md](clx-src/canvas/확인필요.md))

1. **CLI 컴파일러는 `theme/custom-theme.less` 에서 끝나지 않습니다.** 그래서 `BuildOnce` 가 `--exclude theme/**` 로 빌드하고 eXCFrame 테마는 이클립스 빌드 산출물(`clx-build/theme`)에서 가져옵니다.
   → **테마 LESS(`clx-src/theme/**`)를 고쳤으면 이클립스가 한 번 빌드해야 반영됩니다.** Prototyper 전용 스타일은 테마 밖(`clx-src/style/prototyper.less`)에 있어 CLI 가 바로 컴파일합니다.
   → 새로 만든 파일(`*.module.js` · `*.clx`)은 이클립스가 바로 못 볼 수 있으니 프로젝트 새로 고침(F5) 후 빌드하세요.
2. **생성 CLX 는 eXCFrame 프로젝트 전제입니다.** UDC 가 요구하는 공통 모듈(`createCommonUtil`)이 이 프로젝트에는 없어 UDC 는 캔버스에서 이름표로 보입니다(파일 출력은 정상).
3. **스튜디오 디자인 편집기 표시**는 아직 확인하지 않았습니다. 컴파일은 통과했지만 생성한 `.clx` 를 스튜디오에서 열어 확인해 주세요.
4. 저장 폴더(File System Access API)는 Chrome · Edge 에서만 됩니다. Firefox · Safari 는 저장 서버가 없으면 브라우저 다운로드로 대체됩니다.
5. 패턴 `P4-1` · `P4-3` · `P4-4` 는 `P1-6` · `P3-2` · `P3-1` 과 배치가 같아 **자동 선택**으로는 구분되지 않습니다(패턴을 직접 고르면 그대로 나갑니다).
6. UI 템플릿의 폼 셀 세부(`halign` · 셀 `width` · `ignore-layout-spacing`)는 캔버스 미리보기에서는 생략하고 `.clx` 에만 넣습니다. 탭 아이콘용 `userAttributes`/표현식 바인딩은 옮기지 않습니다.
7. 브라우저 직접 호출 방식은 API 키가 브라우저에 남습니다. 팀에 공개할 때는 서버 프록시를 쓰세요.
8. P0(이너) 패턴은 지원하지 않습니다. 아코디언·임베디드·쉘 안의 자식 컨트롤은 비워서 내보냅니다.
9. 툴바가 길어 창 폭이 1500px 보다 좁으면 상태 메시지 칸이 좁아집니다(전체 내용은 툴팁).
10. **공유는 개발·협업 도구입니다.** 인증이 없어 같은 방 이름을 아는 사람은 누구나 들어옵니다. 릴레이 기본 바인딩은 `127.0.0.1` 이며, 사내망에 열 때만 `-Dexcanvas.collab.host` 를 쓰세요. 운영 서버에는 배포하지 않습니다.
11. **공유 서버는 캔버스를 저장하지 않습니다.** 방에 아무도 없으면 내용이 사라집니다 — 결과는 평소대로 **[result 저장]** 으로 남기세요.
12. Tomcat 배포에서 공유를 쓰려면 **JSR-356(javax.websocket)을 지원하는 컨테이너**가 필요합니다. Tomcat 10+ 는 `CrdtRelayEndpoint` 의 `javax.websocket` → `jakarta.websocket` 으로 바꿔야 합니다. **Tomcat 9.0.122(macOS · 이클립스 배포)에서 탭 2개로 항목·커서 동기화를 확인했습니다**(2026-09-22). Safari 18 도 라이브러리 로드·웹소켓 접속이 됩니다.
    **같이 고치려면 두 사람이 같은 서버에 붙어야 합니다** — 한쪽은 개발 서버(`:8090`, 릴레이 `:8091`), 다른 쪽은 Tomcat(`:8080`) 이면 방 이름이 같아도 서로 보이지 않습니다(속성창 **서버** 칸의 주소가 같은지 보세요). 이클립스 Tomcat 은 파일이 바뀌면 자동 재배포(context reload)되어 접속이 모두 끊깁니다 — 3번 재시도 뒤 체크가 꺼지므로 다시 켜야 합니다.
13. 공유 중에 두 사람이 **동시에 같은 유형을 추가하면** 둘 다 `btn1` 같은 같은 `id` 를 가질 수 있습니다(모두의 화면에 똑같이 보입니다). 내보낼 때 직렬화기가 번호를 붙여 유일하게 만들지만, 원하는 이름이면 속성창에서 고치세요.
14. 화면명·팝업·변환 방식 같은 **툴바 설정은 공유하지 않습니다**(각자 값). 공유되는 것은 캔버스 항목뿐입니다.
15. CRDT 라이브러리를 인터넷(esm.sh)에서 받습니다. 막힌 망에서는 [5](#5-확장하는-법) 의 주소 설정으로 사본을 쓰세요.

---

## 7. 변경 이력

### 2026-09-20 · 공유 (CRDT 실시간 협업)

툴바 **[공유]** 체크박스로 **켠 동안에만** 같은 화면명(방)의 사람들과 캔버스를 실시간으로 함께 고칩니다([4.11](#411-공유-crdt-실시간-협업)).

- **문서는 CRDT(Yjs)** — 항목 하나가 `Y.Map { uid, type, id, text, x, y, w, h }`, 전체가 `Y.Map<uid, 항목>`. 필드 단위로 합쳐져 동시에 고쳐도 충돌하지 않습니다.
  항목마다 전역 고유 키(`pt-uid`)를 붙여 `id` 가 바뀌어도 서로를 알아봅니다.
- **커서·선택은 awareness** — 남의 마우스 자리에 화살표+이름표, 남이 고른 항목에 색 테두리. 문서에 남기지 않습니다.
  색은 인라인 스타일 대신 클래스(`pt-peer-0~7`)로 주고, 표시는 캔버스 안 아웃풋 2개로 그려 컨트롤 DOM 을 건드리지 않습니다.
- **서버** — 개발 서버는 HTTP 포트+1 에 웹소켓 릴레이(RFC 6455 직접 구현)를 함께 띄우고 `/canvas/collabInfo.do` 로 주소를 알려 줍니다.
  Tomcat 배포는 `CrdtRelayEndpoint`(`javax.websocket`)가 같은 일을 합니다. 전선 규약(`[0]`=문서 · `[1]`=커서)은 `Crdt_WebSoket` 프로젝트와 같아 서버를 바꿔 써도 됩니다.
- **라이브러리는 켤 때만** — `yjsLoader` 가 `yjs` · `y-protocols/awareness` 를 동적 `import` 로 받습니다(끈 상태에서는 네트워크를 타지 않습니다).
- 켤 때 내 캔버스와 공유본이 둘 다 있으면 **합칠지 버릴지 물어봅니다**. 껐다 켠 경우는 묻지 않고 그대로 이어 갑니다.

### 2026-09-20 · result 저장 경로 3단

`[result 저장]` 이 늘 브라우저 다운로드로 빠지던 것을 고쳤습니다([4.6](#46-result-저장)).

- 화면이 뜰 때 `GET …?probe=1` 로 저장 서버를 미리 확인하고, 속성창에 **저장 위치 (result)** 칸과 **[폴더 지정]** 버튼을 추가.
- 저장 서버가 없으면 브라우저가 지정 폴더에 직접 쓰는 길(File System Access API)을 추가 — 서버 없이도 `result/<날짜>/` 에 저장됩니다.
- `CanvasResultController` 가 `-Dexcanvas.src.dir` 없이도 `clx-src` 를 스스로 찾습니다(배포 경로 → 이클립스 WTP 워크스페이스 → 실행 폴더).
- `DevServer` 도 실행 폴더가 어디든 `clx-src` 를 찾고, 저장할 때마다 실제 경로를 로그에 찍습니다.

### 2026-09-20 · UI 템플릿 · 카탈로그 동기화 · 패턴 미리 배치

- **UI 템플릿**([4.7](#47-ui-템플릿스튜디오-상용구)) — 스튜디오 상용구 116종을 팔레트에 올렸습니다. 사내 테마 클래스가 그대로 붙어 **브라우저에서 실제 모양으로** 보이고 같은 트리가 `.clx` 로 나갑니다. 팔레트 항목이 149개가 되어 **찾기 상자**를 함께 넣었습니다.
- **카탈로그 동기화**([4.8](#48-카탈로그-동기화와-변경-감지)) — `tools/SyncCatalog.java` 가 상용구·UDC·화면 템플릿을 훑어 카탈로그 모듈과 `docs/catalog.md` 를 만들고, 지난 실행 대비 **추가/삭제/수정**을 보고합니다. `dev.cmd` 가 빌드 전에 자동으로 돌립니다.
- **패턴 미리 배치**([4.9](#49-패턴-미리-배치)) — 툴바 **[미리 배치]** 를 켜고 패턴을 고르면 뼈대가 깔립니다. 캔버스 크기를 꽉 채웁니다(사방 20px 여백).
- **빌드 파이프라인** — CLI 컴파일러가 `custom-theme.less` 에서 끝나지 않는 문제를 확인하고([6](#6-검증-현황과-알려진-제약) 제약 1번) `tools/BuildOnce.java` 로 우회했습니다. Prototyper 전용 스타일은 테마 밖 `clx-src/style/prototyper.less` 로 옮겨 CLI 가 직접 컴파일합니다.
