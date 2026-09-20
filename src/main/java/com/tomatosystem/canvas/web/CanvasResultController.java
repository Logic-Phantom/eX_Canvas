package com.tomatosystem.canvas.web;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * eX-Canvas(Web Prototyper) - 생성한 .clx/.js 를 소스 경로 아래 result/yyyyMMdd/ 에 저장한다.
 *
 * 소스 경로(clx-src)는 WAS 에서 알 수 없으므로 설정으로 받는다.
 *   JVM 옵션  -Dexcanvas.src.dir=C:/eclipse_AI/workspace/eX-Canvas/clx-src
 *   또는 환경 변수 EXCANVAS_SRC_DIR
 * 설정이 없으면 저장하지 않고 503 을 돌려준다(화면은 브라우저 다운로드로 대체한다).
 *
 * 개발 도구용 기능이다. 운영 서버에는 설정하지 않는다.
 */
@Controller
public class CanvasResultController {

	/** 본문 구분선 : 앞은 .clx, 뒤는 .js (tools/DevServer.java 와 같은 규약) */
	private static final String SEPARATOR = "\n=====eX-Canvas-JS=====\n";
	private static final int MAX_BODY_BYTES = 2 * 1024 * 1024;

	@RequestMapping(value = "/canvas/saveResult.do", method = RequestMethod.POST)
	public void save(@RequestParam(value = "name", defaultValue = "prototype") String name,
			HttpServletRequest request, HttpServletResponse response) throws IOException {

		// 다른 출처 페이지의 단순 POST 를 막는다(사용자 정의 헤더는 CORS 사전 요청을 거쳐야 한다).
		if (!"eX-Canvas".equals(request.getHeader("X-Requested-With"))) {
			write(response, HttpServletResponse.SC_FORBIDDEN, "{\"ok\":false,\"message\":\"forbidden\"}");
			return;
		}
		String srcDir = System.getProperty("excanvas.src.dir");
		if (srcDir == null || srcDir.isEmpty()) {
			srcDir = System.getenv("EXCANVAS_SRC_DIR");
		}
		if (srcDir == null || srcDir.isEmpty()) {
			write(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "{\"ok\":false,\"message\":\"서버에 excanvas.src.dir(소스 경로)이 설정되지 않았습니다.\"}");
			return;
		}

		// 파일명은 글자·숫자·밑줄·하이픈만 남긴다 → result 폴더 밖으로 나갈 수 없다.
		String safeName = name.replaceAll("[^\\p{L}\\p{N}_-]", "");
		if (safeName.isEmpty()) {
			safeName = "prototype";
		}

		byte[] raw = readAll(request.getInputStream(), MAX_BODY_BYTES);
		if (raw == null) {
			write(response, HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE, "{\"ok\":false,\"message\":\"요청이 너무 큽니다.\"}");
			return;
		}
		String body = new String(raw, StandardCharsets.UTF_8);
		int cut = body.indexOf(SEPARATOR);
		String clx = cut < 0 ? body : body.substring(0, cut);
		String js = cut < 0 ? "" : body.substring(cut + SEPARATOR.length());

		LocalDateTime now = LocalDateTime.now();
		String date = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
		Path dir = Paths.get(srcDir, "result", date).toAbsolutePath().normalize();
		Files.createDirectories(dir);
		// 같은 이름이 있으면 덮어쓰지 않는다.
		if (Files.exists(dir.resolve(safeName + ".clx"))) {
			safeName = safeName + "_" + now.format(DateTimeFormatter.ofPattern("HHmmss"));
		}
		Files.write(dir.resolve(safeName + ".clx"), clx.getBytes(StandardCharsets.UTF_8));
		Files.write(dir.resolve(safeName + ".js"), js.getBytes(StandardCharsets.UTF_8));

		write(response, HttpServletResponse.SC_OK, "{\"ok\":true,\"dir\":\"result/" + date + "\",\"name\":\"" + safeName + "\"}");
	}

	private static byte[] readAll(InputStream in, int limit) throws IOException {
		ByteArrayOutputStream buffer = new ByteArrayOutputStream();
		byte[] chunk = new byte[8192];
		int read;
		while ((read = in.read(chunk)) > 0) {
			buffer.write(chunk, 0, read);
			if (buffer.size() > limit) {
				return null;
			}
		}
		return buffer.toByteArray();
	}

	private static void write(HttpServletResponse response, int status, String json) throws IOException {
		byte[] body = json.getBytes(StandardCharsets.UTF_8);
		response.setStatus(status);
		response.setContentType("application/json; charset=utf-8");
		response.setContentLength(body.length);
		response.getOutputStream().write(body);
	}
}
