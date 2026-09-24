package com.tomatosystem.canvas.web;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.JSONObject;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

/**
 * eX-Canvas(Web Prototyper) - API 연동 : Swagger/OpenAPI 명세(JSON)를 서버가 대신 받아 준다(Tomcat 용).
 *
 * 브라우저는 다른 출처(포트가 다른 API 서버)의 명세를 CORS 때문에 직접 받지 못하는 경우가 많다.
 * 이 컨트롤러는 주소의 본문을 그대로 돌려줄 뿐 해석하지 않는다. 개발 서버(tools/DevServer.java)의 fetchOpenApi 와 같은 계약이다.
 *   GET /canvas/fetchOpenApi.do?probe=1     → { ok:true }
 *   GET /canvas/fetchOpenApi.do?url=<주소>   → 본문 (http/https 만 · 30초 · 8MB 상한)
 *
 * 사내 개발 도구용이라 주소를 따로 제한하지 않는다. 외부에 공개하는 서버에는 배포하지 않는다(README 제약 참고).
 */
@Controller
public class CanvasOpenApiController {

	private static final int MAX_SPEC_BYTES = 8 * 1024 * 1024;

	@RequestMapping(value = "/canvas/fetchOpenApi.do", method = RequestMethod.GET)
	public void fetch(HttpServletRequest request, HttpServletResponse response) throws IOException {
		if (!"eX-Canvas".equals(request.getHeader("X-Requested-With"))) {
			write(response, HttpServletResponse.SC_FORBIDDEN, "application/json; charset=utf-8", error("forbidden").getBytes(StandardCharsets.UTF_8));
			return;
		}
		if (request.getParameter("probe") != null) {
			write(response, HttpServletResponse.SC_OK, "application/json; charset=utf-8",
					new JSONObject().put("ok", true).put("maxBytes", MAX_SPEC_BYTES).toString().getBytes(StandardCharsets.UTF_8));
			return;
		}
		String url = request.getParameter("url");
		if (url == null || url.trim().isEmpty()) {
			write(response, HttpServletResponse.SC_BAD_REQUEST, "application/json; charset=utf-8", error("url 파라미터가 없습니다.").getBytes(StandardCharsets.UTF_8));
			return;
		}
		url = url.trim();
		if (!url.matches("(?i)^https?://.+")) {
			write(response, HttpServletResponse.SC_BAD_REQUEST, "application/json; charset=utf-8", error("http/https 주소만 받을 수 있습니다.").getBytes(StandardCharsets.UTF_8));
			return;
		}
		try {
			HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
			con.setInstanceFollowRedirects(true);
			con.setConnectTimeout(10000);
			con.setReadTimeout(30000);
			con.setRequestProperty("Accept", "application/json, */*");
			con.setRequestProperty("User-Agent", "eX-Canvas");
			int status = con.getResponseCode();
			InputStream in = status >= 400 ? con.getErrorStream() : con.getInputStream();
			byte[] body = in == null ? new byte[0] : readLimited(in, MAX_SPEC_BYTES);
			if (body == null) {
				write(response, 413, "application/json; charset=utf-8", error("명세가 8MB 를 넘습니다.").getBytes(StandardCharsets.UTF_8));
				return;
			}
			if (status >= 400) {
				write(response, status, "application/json; charset=utf-8", error("상대 서버가 HTTP " + status + " 로 답했습니다.").getBytes(StandardCharsets.UTF_8));
				return;
			}
			String contentType = con.getContentType();
			if (contentType == null || contentType.isEmpty()) {
				contentType = "application/json; charset=utf-8";
			}
			write(response, HttpServletResponse.SC_OK, contentType, body);
		} catch (Exception e) {
			write(response, HttpServletResponse.SC_BAD_GATEWAY, "application/json; charset=utf-8", error(e.toString()).getBytes(StandardCharsets.UTF_8));
		}
	}

	private static byte[] readLimited(InputStream in, int max) throws IOException {
		ByteArrayOutputStream buffer = new ByteArrayOutputStream();
		byte[] chunk = new byte[8192];
		int read;
		while ((read = in.read(chunk)) > 0) {
			if (buffer.size() + read > max) {
				return null;
			}
			buffer.write(chunk, 0, read);
		}
		return buffer.toByteArray();
	}

	private static String error(String message) {
		return new JSONObject().put("ok", false).put("message", String.valueOf(message)).toString();
	}

	private static void write(HttpServletResponse response, int status, String contentType, byte[] body) throws IOException {
		response.setStatus(status);
		response.setContentType(contentType);
		response.setContentLength(body.length);
		response.getOutputStream().write(body);
	}
}
