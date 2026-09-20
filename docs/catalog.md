# eX-Canvas 카탈로그

`tools/SyncCatalog.java` 가 만드는 목록입니다(손으로 고치면 다음 실행에 지워집니다).
갱신 : `java tools\SyncCatalog.java` · `tools\dev.cmd` 는 빌드 전에 자동으로 돌립니다.

| 항목 | 개수 | 원본 |
|---|---|---|
| UI 템플릿 | 116 | `C:\eclipse_AI\workspace\eX-Canvas\.settings\canned-templates.xmi` |
| UDC | 4 | `clx-src/udc/**` |
| 화면 템플릿 | 77 | `templates/**` |

마지막 갱신 : 2026-09-20 18:22

## UI 템플릿 (팔레트 "UI 템플릿" 묶음)


### 넘버에디터

| 이름 | 설명 | 크기 |
|---|---|---|
| 컨트롤 그룹 (1) | [form-control] 넘버에디터 + 아웃풋 | 200×26 |
| 컨트롤 그룹 (2) | [form-control] displayExp : text + " 원" | 200×26 |

### 데이트인풋

| 이름 | 설명 | 크기 |
|---|---|---|
| 데이터 포맷 (1) | 연-월-일 | 110×26 |
| 데이터 포맷 (2) | 연-월 | 110×26 |
| 데이터 포맷 (3) | 연도 | 110×26 |
| 데이터 포맷 (4) | 시:분:초 | 80×26 |
| 데이터 포맷 (5) | 연-월-일 시:분:초 | 170×26 |
| 데이터 포맷 (6) | 스핀버튼이 보이는 데이트 인풋 | 130×26 |
| 컨트롤 그룹 | [form-control] 시작일자 ~ 종료일자 | 276×26 |

### 라디오버튼

| 이름 | 설명 | 크기 |
|---|---|---|
| 고정 아이템 | colCount=0, fixedWidth=true | 400×26 |
| 컨트롤 그룹 (1) | [form-control] 라디오버튼 + 라디오버튼 | 400×26 |
| 컨트롤 그룹 (2) | [form-control] 라디오버튼 + 버튼 | 400×26 |

### 버튼

| 이름 | 설명 | 크기 |
|---|---|---|
| 등록 버튼 | [btn-add] | 63×26 |
| 보조 버튼 | [btn-base] | 46×26 |
| 삭제 버튼 | [btn-remove] | 63×26 |
| 엑셀다운로드 버튼 | [btn-excel] | 108×26 |
| 엑셀업로드 버튼 | [btn-excel] | 97×26 |
| 인라인 버튼 | [btn-inline] | 46×26 |
| 저장 버튼 | [btn-save] | 63×26 |
| 조회 버튼 | [btn-search] | 63×26 |
| 주요 버튼 | [btn-submit] | 46×26 |
| 초기화 버튼 | [btn-reset] | 74×26 |
| 초기화 아이콘 버튼 | [btn-i-only btn-reset] 초기화 아이콘 버튼 | 28×26 |
| 출력 버튼 | [btn-print] | 63×26 |
| 타이틀 버튼 그룹 | [title-button-group] 타이틀 버튼 그룹. content-title-group 내 우측에 배치, 우측 정렬(horizontalSpacing = 4px), 다른 유형의 컨트롤 배치 시 사이에 간격 아웃풋 배치 | 1580×26 |
| 파일 다운로드 버튼 | [btn-download] | 85×26 |
| 파일 업로드 버튼 | [btn-upload] | 74×26 |
| 팝업 호출 버튼 | [btn-pop] | 85×26 |
| 푸터 버튼 그룹 | [footer-button-group] 푸터 버튼 그룹. content-footer 내 배치, 좌측 버튼 그룹과 우측 버튼 그룹으로 분리하여 배치(각각 width="765px", autoSizing="true", minLength="0") | 600×26 |
| 행삭제 버튼 | [btn-delete] | 74×26 |
| 행추가 버튼 | [btn-insert] | 74×26 |
| 행취소 버튼 | [btn-revert] | 74×26 |

### 서치인풋

| 이름 | 설명 | 크기 |
|---|---|---|
| 컨트롤 그룹 (1) | [form-control] 서치인풋 + 초기화 버튼 | 200×26 |
| 컨트롤 그룹 (2) | [form-control] 주소 | 200×26 |

### 아웃풋

| 이름 | 설명 | 크기 |
|---|---|---|
| h1 타이틀 | [tit h1] h1 제목 수준 타이틀 | 120×26 |
| h2 타이틀 | [tit h2] h2 제목 수준 타이틀 | 120×26 |
| h3 타이틀 | [tit h3] h3 제목 수준 타이틀 | 120×26 |
| h4 타이틀 | [tit h4] h4 제목 수준 타이틀 | 120×26 |
| h5 타이틀 | [tit h5] h5 제목 수준 타이틀 | 120×26 |
| h6 타이틀 | [tit h6] h6 제목 수준 타이틀 | 120×26 |
| 가로 중앙 정렬 | [text-center] 문자열 정형 데이터에 적용하는 정렬 | 120×26 |
| 간격 지정 컨트롤 | [spacing] 버튼 영역, 정보 영역 등에서 기본 간격 이외에 컨트롤 간 간격을 지정할 때 사용. 해당 컨트롤 다음으로 오는 컨트롤은 allowNewLine=false 처리할 것 | 8×26 |
| 날짜 포맷 (1) | YYYY-MM-DD | 120×26 |
| 날짜 포맷 (2) | YYYY-MM | 120×26 |
| 날짜 포맷 (3) | YYYY | 120×26 |
| 날짜 포맷 (4) | YYYY-MM-DD HH:mm:ss | 120×26 |
| 날짜 포맷 (5) | YYYY-MM-DD (ddd) | 120×26 |
| 단위 포맷 | 단위를 변경할 경우 displayExp 속성을 통해 수정 | 120×26 |
| 마스킹 문자열 포맷 | - | 120×26 |
| 밑줄 | [underline] 텍스트 밑줄 | 120×26 |
| 밑줄 해제 | [no-underline] 텍스트 밑줄 해제 | 120×26 |
| 빈값 | - | 120×26 |
| 상측 정렬 | [align-top] 상측 정렬 | 120×26 |
| 상태 | [state-cell] 그리드에서 상태 컬럼으로 사용되는 컬럼의 디테일 셀에 행의 상태를 표시 | 300×26 |
| 세로 중앙 정렬 | [align-middle] 세로 중앙 정렬 | 120×26 |
| 숫자 포맷 (1) | [text-right] s#,##0 | 120×26 |
| 숫자 포맷 (2) | [text-right] s#,##9 | 120×26 |
| 숫자 포맷 (3) | [text-right] s#,##0.00 | 120×26 |
| 숫자 포맷 (4) | [text-right] s#,##9.99 | 120×26 |
| 숫자 포맷 (5) | [text-right] displayExp : text + " 원", 단위를 변경할 경우 displayExp 속성을 통해 수정 | 120×26 |
| 숫자 포맷 (6) | [text-right] displayExp : "₩ " + text | 120×26 |
| 숫자 포맷 (7) | [text-right] displayExp : "$ " + text | 120×26 |
| 숫자 포맷 (8) | [text-right] displayExp : text + " %" | 120×26 |
| 우측 정렬 | [text-right] 숫자형 데이터에 적용하는 정렬 | 120×26 |
| 윗줄 | [overline] 텍스트 윗줄 | 120×26 |
| 좌측 정렬 | [text-left] 문자열 비정형 데이터에 적용하는 정렬 | 120×26 |
| 주민등록번호 포맷 | - | 120×26 |
| 지시문/안내문 (1) | [info-txt] 일반 | 300×20 |
| 지시문/안내문 (2) | [info-txt-highlighted] 강조 | 300×20 |
| 취소선 | [line-through] 텍스트 취소선 | 120×26 |
| 하측 정렬 | [align-bottom] 하측 정렬 | 120×26 |

### 인풋박스

| 이름 | 설명 | 크기 |
|---|---|---|
| 컨트롤 그룹 (1) | [form-control] 이메일 | 200×26 |
| 컨트롤 그룹 (2) | [form-control] 전화번호 | 200×26 |
| 컨트롤 그룹 (3) | [form-control] 주민등록번호 | 200×26 |
| 컨트롤 그룹 (4) | [form-control] 이어지는 텍스트 | 200×26 |
| 컨트롤 그룹 (6) | [form-control] 인풋박스 + 버튼 | 200×26 |

### 체크박스

| 이름 | 설명 | 크기 |
|---|---|---|
| 빈값 | - | 200×26 |
| 중앙정렬 | [text-center] 폼에서 사용 (그리드 내 체크박스 및 체크박스그룹은 CSS에 의해 자동으로 중앙정렬됨) | 200×26 |
| 컨트롤 그룹 (1) | [form-control] 체크박스 + 체크박스 | 200×26 |
| 컨트롤 그룹 (2) | [form-control] 체크박스 + 버튼 | 200×26 |

### 체크박스그룹

| 이름 | 설명 | 크기 |
|---|---|---|
| 고정 아이템 | colCount=0, fixedWidth=true | 400×26 |
| 컨트롤 그룹 (1) | [form-control] 체크박스그룹 + 체크박스그룹 | 400×26 |
| 컨트롤 그룹 (2) | [form-control] 체크박스그룹 + 버튼 | 400×26 |

### 카드

| 이름 | 설명 | 크기 |
|---|---|---|
| 일반 | [card] | 1091×150 |

### 콘텐츠

| 이름 | 설명 | 크기 |
|---|---|---|
| 그리드 | [content] | 1580×234 |
| 그리드 타이틀 | [content-title-box] | 1580×26 |
| 폼 | [content] | 1580×191 |
| 폼 타이틀 | [content-title-box] | 1580×26 |

### 콤보박스

| 이름 | 설명 | 크기 |
|---|---|---|
| 컨트롤 그룹 | [form-control] | 200×26 |

### 탭폴더

| 이름 | 설명 | 크기 |
|---|---|---|
| 아이콘 탭 | [tab] | 1045×200 |
| 일반 | - | 1045×200 |

### 텍스트에리어

| 이름 | 설명 | 크기 |
|---|---|---|
| 길이 제한 텍스트에리어 | [form-control] | 469×81 |

### 파일인풋

| 이름 | 설명 | 크기 |
|---|---|---|
| 컨트롤 그룹 | [form-control] | 300×26 |

### 폼

| 이름 | 설명 | 크기 |
|---|---|---|
| 라벨 | [label] 폼의 라벨 | 120×38 |
| 서브 라벨 | [sub-label] 폼의 서브 라벨 | 120×38 |
| 입력행 (1행) | [form-base] | 1091×40 |
| 입력행 (2행) | [form-base] | 1091×79 |
| 입력행 (3행) | [search-box] | 1091×118 |
| 조회 (1행) | [search-box] | 1580×50 |
| 조회 (2행) | [search-box] | 1580×84 |
| 조회 (3행) | [search-box] | 1580×118 |
| 조회 폼 라벨 | [label] 조회 폼의 라벨 | 60×26 |
| 조회 폼 서브 라벨 | [sub-label] 조회 폼의 서브 라벨 | 60×26 |
| 조회 폼 필수 라벨 | [label required] 조회 폼의 라벨 또는 서브 라벨필수입력값 | 60×26 |
| 필수 라벨 | [label required] 폼의 라벨 또는 서브 라벨 필수입력값 | 120×38 |

### 프레임

| 이름 | 설명 | 크기 |
|---|---|---|
| 버티컬 레이아웃 | [form-control] "form-control" 클래스가 적용된 그룹 | 958×26 |
| 분할 배치 | [division-group] "division-group" 클래스가 적용된 그룹 | 958×300 |
| 컨트롤 그룹 (1) | [form-control] 폼 레이아웃이 적용된 "컨트롤 + 단위" 형태의 프레임 | 200×26 |
| 컨트롤 그룹 (2) | [form-control] 폼 레이아웃이 적용된 "컨트롤 + 버튼" 형태의 프레임 | 200×26 |
| 컨트롤 그룹 (3) | [form-control] 폼 레이아웃이 적용된 "컨트롤 + 체크박스" 형태의 프레임 | 200×26 |
| 컨트롤 그룹 (4) | [form-control] 폼 레이아웃이 적용된 "컨트롤 + 컨트롤" 형태의 프레임 | 200×26 |
| 컨트롤 그룹 (5) | [form-control] 폼 레이아웃이 적용된 "컨트롤 + 컨트롤 + 컨트롤" 형태의 프레임 | 200×26 |
| 컨트롤 그룹 (6) | [form-control] 폼 레이아웃이 적용된 "컨트롤 + 기호 + 컨트롤" 형태의 프레임 | 200×26 |
| 컨트롤 그룹 (7) | [form-control] 폼 레이아웃이 적용된 "컨트롤 + 기호 + 컨트롤" 형태의 프레임 | 200×26 |
| 폼 레이아웃 | [form-control] "form-control" 클래스가 적용된 그룹 | 958×26 |
| 플로우 레이아웃 | [form-control] "form-control" 클래스가 적용된 그룹 | 958×26 |

## UDC

- `udc.com.udcComAppHeader` — `clx-src/udc/com/udcComAppHeader.clx`
- `udc.com.udcComFormTitle` — `clx-src/udc/com/udcComFormTitle.clx`
- `udc.com.udcComGridCudBtns` — `clx-src/udc/com/udcComGridCudBtns.clx`
- `udc.com.udcComGridTitle` — `clx-src/udc/com/udcComGridTitle.clx`

## 화면 템플릿

- Inner Pattern_P0-1 — `templates/P0_Inner Pattern/Inner Pattern_P0-1.clx`
- Single Pattern P1-1_P — `templates/P1_Single Pattern/버티컬/popup/Single Pattern P1-1_P.clx`
- Single Pattern P1-2_P — `templates/P1_Single Pattern/버티컬/popup/Single Pattern P1-2_P.clx`
- Single Pattern P1-3_P — `templates/P1_Single Pattern/버티컬/popup/Single Pattern P1-3_P.clx`
- Single Pattern P1-4_P — `templates/P1_Single Pattern/버티컬/popup/Single Pattern P1-4_P.clx`
- Single Pattern P1-5_P — `templates/P1_Single Pattern/버티컬/popup/Single Pattern P1-5_P.clx`
- Single Pattern P1-6_P — `templates/P1_Single Pattern/버티컬/popup/Single Pattern P1-6_P.clx`
- Single Pattern P1-7_P — `templates/P1_Single Pattern/버티컬/popup/Single Pattern P1-7_P.clx`
- Single Pattern P1-8_P — `templates/P1_Single Pattern/버티컬/popup/Single Pattern P1-8_P.clx`
- Single Pattern P1-1 — `templates/P1_Single Pattern/버티컬/Single Pattern P1-1.clx`
- Single Pattern P1-2 — `templates/P1_Single Pattern/버티컬/Single Pattern P1-2.clx`
- Single Pattern P1-3 — `templates/P1_Single Pattern/버티컬/Single Pattern P1-3.clx`
- Single Pattern P1-4 — `templates/P1_Single Pattern/버티컬/Single Pattern P1-4.clx`
- Single Pattern P1-5 — `templates/P1_Single Pattern/버티컬/Single Pattern P1-5.clx`
- Single Pattern P1-6 — `templates/P1_Single Pattern/버티컬/Single Pattern P1-6.clx`
- Single Pattern P1-1_P — `templates/P1_Single Pattern/폼/popup/Single Pattern P1-1_P.clx`
- Single Pattern P1-2_P — `templates/P1_Single Pattern/폼/popup/Single Pattern P1-2_P.clx`
- Single Pattern P1-3_P — `templates/P1_Single Pattern/폼/popup/Single Pattern P1-3_P.clx`
- Single Pattern P1-4_P — `templates/P1_Single Pattern/폼/popup/Single Pattern P1-4_P.clx`
- Single Pattern P1-5_P — `templates/P1_Single Pattern/폼/popup/Single Pattern P1-5_P.clx`
- Single Pattern P1-6_P — `templates/P1_Single Pattern/폼/popup/Single Pattern P1-6_P.clx`
- Single Pattern P1-7_P — `templates/P1_Single Pattern/폼/popup/Single Pattern P1-7_P.clx`
- Single Pattern P1-8_P — `templates/P1_Single Pattern/폼/popup/Single Pattern P1-8_P.clx`
- Single Pattern P1-1 — `templates/P1_Single Pattern/폼/Single Pattern P1-1.clx`
- Single Pattern P1-2 — `templates/P1_Single Pattern/폼/Single Pattern P1-2.clx`
- Single Pattern P1-3 — `templates/P1_Single Pattern/폼/Single Pattern P1-3.clx`
- Single Pattern P1-4 — `templates/P1_Single Pattern/폼/Single Pattern P1-4.clx`
- Single Pattern P1-5 — `templates/P1_Single Pattern/폼/Single Pattern P1-5.clx`
- Single Pattern P1-6 — `templates/P1_Single Pattern/폼/Single Pattern P1-6.clx`
- Multi Pattern P2-1 — `templates/P2_Multi Pattern/Multi Pattern P2-1.clx`
- Multi Pattern P2-2 — `templates/P2_Multi Pattern/Multi Pattern P2-2.clx`
- Multi Pattern P2-3 — `templates/P2_Multi Pattern/Multi Pattern P2-3.clx`
- Multi Pattern P2-4 — `templates/P2_Multi Pattern/Multi Pattern P2-4.clx`
- Multi Pattern P2-5 — `templates/P2_Multi Pattern/Multi Pattern P2-5.clx`
- Multi Pattern P2-1_P — `templates/P2_Multi Pattern/popup/Multi Pattern P2-1_P.clx`
- Multi Pattern P2-2_P — `templates/P2_Multi Pattern/popup/Multi Pattern P2-2_P.clx`
- Multi Pattern P2-3_P — `templates/P2_Multi Pattern/popup/Multi Pattern P2-3_P.clx`
- Multi Pattern P2-4_P — `templates/P2_Multi Pattern/popup/Multi Pattern P2-4_P.clx`
- List Pattern P3-1 — `templates/P3_List Pattern/List Pattern P3-1.clx`
- List Pattern P3-2 — `templates/P3_List Pattern/List Pattern P3-2.clx`
- List Pattern P3-3 — `templates/P3_List Pattern/List Pattern P3-3.clx`
- List Pattern P3-4 — `templates/P3_List Pattern/List Pattern P3-4.clx`
- List Pattern P3-1_P — `templates/P3_List Pattern/popup/List Pattern P3-1_P.clx`
- List Pattern P3-2_P — `templates/P3_List Pattern/popup/List Pattern P3-2_P.clx`
- Master Detail Pattern P4-1 — `templates/P4_Master Detail Pattern/Master Detail Pattern P4-1.clx`
- Master Detail Pattern P4-2 — `templates/P4_Master Detail Pattern/Master Detail Pattern P4-2.clx`
- Master Detail Pattern P4-3 — `templates/P4_Master Detail Pattern/Master Detail Pattern P4-3.clx`
- Master Detail Pattern P4-4 — `templates/P4_Master Detail Pattern/Master Detail Pattern P4-4.clx`
- Master Detail Pattern P4-5 — `templates/P4_Master Detail Pattern/Master Detail Pattern P4-5.clx`
- Master Detail Pattern P4-6 — `templates/P4_Master Detail Pattern/Master Detail Pattern P4-6.clx`
- Master Detail Pattern P4-7 — `templates/P4_Master Detail Pattern/Master Detail Pattern P4-7.clx`
- Master Detail Pattern P4-1_P — `templates/P4_Master Detail Pattern/popup/Master Detail Pattern P4-1_P.clx`
- Master Detail Pattern P4-2_P — `templates/P4_Master Detail Pattern/popup/Master Detail Pattern P4-2_P.clx`
- Master Detail Pattern P4-3_P — `templates/P4_Master Detail Pattern/popup/Master Detail Pattern P4-3_P.clx`
- Master Detail Pattern P4-4_P — `templates/P4_Master Detail Pattern/popup/Master Detail Pattern P4-4_P.clx`
- Master Detail Pattern P4-5_P — `templates/P4_Master Detail Pattern/popup/Master Detail Pattern P4-5_P.clx`
- Master Detail Pattern P4-6_P — `templates/P4_Master Detail Pattern/popup/Master Detail Pattern P4-6_P.clx`
- Tab Pattern P5-1_P — `templates/P5_Tab Pattern/popup/Tab Pattern P5-1_P.clx`
- Tab Pattern P5-2_P — `templates/P5_Tab Pattern/popup/Tab Pattern P5-2_P.clx`
- Tab Pattern P5-1 — `templates/P5_Tab Pattern/Tab Pattern P5-1.clx`
- Tab Pattern P5-2 — `templates/P5_Tab Pattern/Tab Pattern P5-2.clx`
- Tree Pattern P6-1_P — `templates/P6_Tree Pattern/popup/Tree Pattern P6-1_P.clx`
- Tree Pattern P6-1 — `templates/P6_Tree Pattern/Tree Pattern P6-1.clx`
- Tree Pattern P6-2 — `templates/P6_Tree Pattern/Tree Pattern P6-2.clx`
- Tree Pattern P6-3 — `templates/P6_Tree Pattern/Tree Pattern P6-3.clx`
- Shuttle Pattern P7-1_P — `templates/P7_Shuttle Pattern/popup/Shuttle Pattern P7-1_P.clx`
- Shuttle Pattern P7-1 — `templates/P7_Shuttle Pattern/Shuttle Pattern P7-1.clx`
- Shuttle Pattern P7-2 — `templates/P7_Shuttle Pattern/Shuttle Pattern P7-2.clx`
- Shuttle Pattern P7-3 — `templates/P7_Shuttle Pattern/Shuttle Pattern P7-3.clx`
- Thirdparty Pattern P8-1_P — `templates/P8_Thirdparty Pattern/popup/Thirdparty Pattern P8-1_P.clx`
- Thirdparty Pattern P8-2_P — `templates/P8_Thirdparty Pattern/popup/Thirdparty Pattern P8-2_P.clx`
- Thirdparty Pattern P8-3_P — `templates/P8_Thirdparty Pattern/popup/Thirdparty Pattern P8-3_P.clx`
- Thirdparty Pattern P8-4_P — `templates/P8_Thirdparty Pattern/popup/Thirdparty Pattern P8-4_P.clx`
- Thirdparty Pattern P8-1 — `templates/P8_Thirdparty Pattern/Thirdparty Pattern P8-1.clx`
- Thirdparty Pattern P8-2 — `templates/P8_Thirdparty Pattern/Thirdparty Pattern P8-2.clx`
- Thirdparty Pattern P8-3 — `templates/P8_Thirdparty Pattern/Thirdparty Pattern P8-3.clx`
- Thirdparty Pattern P8-4 — `templates/P8_Thirdparty Pattern/Thirdparty Pattern P8-4.clx`
