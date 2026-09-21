#!/usr/bin/env sh
# eX-Canvas Web Prototyper - 카탈로그 갱신 + 빌드 + 개발 서버 (Java 11+) — macOS / Linux 용 (Windows 는 tools\dev.cmd)
#   사용: 프로젝트 루트에서  sh tools/dev.sh        (실행 권한을 주었으면  tools/dev.sh)
#   Gemini 서버 프록시를 쓰려면 실행 전에            export GEMINI_API_KEY=발급받은키
#   상용구(canned-templates.xmi)가 다른 워크스페이스에 있으면  export EXCANVAS_CANNED_XMI=경로
#   개발 서버 JVM 옵션(예: 공유 릴레이 포트)은        export EXCANVAS_JAVA_OPTS="-Dexcanvas.collab.port=9001"
set -e
cd "$(dirname "$0")/.."

# 1) 팔레트가 보는 목록(UI 템플릿 · UDC · 화면 템플릿) 갱신 + 지난 실행 대비 변경점 보고
java -Dfile.encoding=UTF-8 tools/SyncCatalog.java

# 2) 빌드 (CLI 컴파일러 + 이클립스가 만든 eXCFrame 테마)
java -Dfile.encoding=UTF-8 tools/BuildOnce.java target/clx-dev canvas/Prototyper

# 3) 개발 서버 (http://127.0.0.1:8090/ · 공유 릴레이 ws://127.0.0.1:8091/ws/crdt-sync.do)
# shellcheck disable=SC2086
exec java $EXCANVAS_JAVA_OPTS tools/DevServer.java target/clx-dev 8090
