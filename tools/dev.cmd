@echo off
rem eX-Canvas Web Prototyper - 카탈로그 갱신 + 빌드 + 개발 서버 (Java 11+)
rem   사용: 프로젝트 루트에서  tools\dev.cmd
rem   Gemini 서버 프록시를 쓰려면 실행 전에  set GEMINI_API_KEY=발급받은키
rem   상용구(canned-templates.xmi)가 다른 워크스페이스에 있으면  set EXCANVAS_CANNED_XMI=경로
cd /d "%~dp0.."

rem 1) 팔레트가 보는 목록(UI 템플릿 · UDC · 화면 템플릿) 갱신 + 지난 실행 대비 변경점 보고
java -Dfile.encoding=UTF-8 tools\SyncCatalog.java
if errorlevel 1 exit /b 1

rem 2) 빌드 (CLI 컴파일러 + 이클립스가 만든 eXCFrame 테마)
java -Dfile.encoding=UTF-8 tools\BuildOnce.java target\clx-dev canvas/Prototyper
if errorlevel 1 exit /b 1

rem 3) 개발 서버
java tools\DevServer.java target\clx-dev 8090
