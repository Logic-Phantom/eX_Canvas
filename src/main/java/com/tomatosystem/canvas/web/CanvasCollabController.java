package com.tomatosystem.canvas.web;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.JSONObject;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

/**
 * eX-Canvas(Web Prototyper) - 공유(CRDT) 릴레이 주소 안내(Tomcat 용).
 *
 * 화면은 뜰 때 GET /canvas/collabInfo.do 로 "공유 서버가 어디냐" 고 묻는다(collabSession.probeServerUrl).
 *   - 개발 서버(tools/DevServer.java)는 릴레이가 HTTP 와 다른 포트에 있어 port 를 알려 준다.
 *   - Tomcat 은 CrdtRelayEndpoint 가 같은 포트(같은 출처)에 있으므로 port 없이 path 만 준다 →
 *     브라우저는 ws(s)://&lt;지금 보는 host&gt;&lt;컨텍스트&gt;/ws/crdt-sync.do 로 붙는다.
 * 이 컨트롤러가 없어도 브라우저는 같은 주소로 대체하지만, 콘솔에 404 가 남고 "서버가 알려 준 주소" 로 표시되지 않는다.
 * 개발 서버의 collabInfo 와 같은 계약이다.
 *
 *   GET /canvas/collabInfo.do → { ok:true, path:"/ws/crdt-sync.do", rooms:&lt;열린 방 수&gt; }
 *
 * 개발 도구용 기능이다. 운영 서버에는 배포하지 않는다.
 */
@Controller
public class CanvasCollabController {

	@RequestMapping(value = "/canvas/collabInfo.do", method = RequestMethod.GET)
	public void info(HttpServletRequest request, HttpServletResponse response) throws IOException {
		JSONObject json = new JSONObject()
				.put("ok", true)
				.put("path", CrdtRelayEndpoint.WS_PATH)
				.put("rooms", CrdtRelayEndpoint.roomCount());
		byte[] body = json.toString().getBytes(StandardCharsets.UTF_8);
		response.setStatus(HttpServletResponse.SC_OK);
		response.setContentType("application/json; charset=utf-8");
		response.setHeader("Cache-Control", "no-store");
		response.setContentLength(body.length);
		response.getOutputStream().write(body);
	}
}
