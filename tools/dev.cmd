@echo off
rem eX-Canvas Web Prototyper - Tomcat 없이 빌드 + 실행 (Java 11+)
rem   사용: 프로젝트 루트에서  tools\dev.cmd
rem   Gemini 서버 프록시를 쓰려면 실행 전에  set GEMINI_API_KEY=발급받은키
cd /d "%~dp0.."
java -Dfile.encoding=UTF-8 -jar ci-lib\clx\e6-compiler.jar -s . -o target\clx-dev --main canvas/Prototyper
if errorlevel 1 exit /b 1
java tools\DevServer.java target\clx-dev 8090
