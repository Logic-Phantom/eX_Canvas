package com.tomatosystem.canvas.web;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.JSONObject;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import com.tomatosystem.canvas.service.CanvasImageAnalyzer;

/**
 * eX-Canvas(Web Prototyper) - 이미지로 배치 : 이미지를 multipart 로 받아 서버가 Gemini 로 분석한다(Tomcat 용).
 *
 * eXConverter-AI 의 GeminiConversionController 와 같은 계약이다.
 *   POST /canvas/analyzeImage.do   multipart/form-data. 첫 번째 파일 파트 = 이미지(20MB), 그 밖 파트 = memo · pattern · catalog · types
 *   GET  /canvas/imageStatus.do    { ok, configured, model, ... } — 키가 서버에 있는지(키 값은 돌려주지 않는다)
 *
 * 키는 서버에만 둔다(-Dexcanvas.gemini.apiKey · GEMINI_API_KEY). 브라우저에는 키가 없다.
 * dispatcher-servlet.xml 의 multipartResolver(CommonsMultipartResolver)가 있어야 MultipartHttpServletRequest 로 들어온다.
 * 개발 서버(tools/DevServer.java)는 같은 분석기를 리플렉션으로 부른다.
 */
@Controller
public class CanvasImageController {

	private static final long MAX_IMAGE_BYTES = 20L * 1024L * 1024L;

	@RequestMapping(value = "/canvas/imageStatus.do", method = { RequestMethod.GET, RequestMethod.POST })
	public void status(HttpServletResponse response) throws IOException {
		write(response, HttpServletResponse.SC_OK, CanvasImageAnalyzer.describeJson());
	}

	@RequestMapping(value = "/canvas/analyzeImage.do", method = RequestMethod.POST)
	public void analyze(HttpServletRequest request, HttpServletResponse response) throws IOException {
		// 다른 출처 페이지의 단순 POST 를 막는다(saveResult.do 와 같은 규약).
		if (!"eX-Canvas".equals(request.getHeader("X-Requested-With"))) {
			write(response, HttpServletResponse.SC_FORBIDDEN, error("forbidden"));
			return;
		}
		if (!CanvasImageAnalyzer.isConfigured()) {
			write(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE, error("서버에 Gemini API 키가 없습니다(-Dexcanvas.gemini.apiKey 또는 GEMINI_API_KEY)."));
			return;
		}
		if (!(request instanceof MultipartHttpServletRequest)) {
			write(response, HttpServletResponse.SC_BAD_REQUEST, error("multipart/form-data 로 이미지 파일을 올려야 합니다(multipartResolver 설정 확인)."));
			return;
		}
		MultipartHttpServletRequest multipart = (MultipartHttpServletRequest) request;
		try {
			MultipartFile file = firstUploadedFile(multipart);
			if (file == null || file.isEmpty()) {
				throw new IllegalArgumentException("이미지 파일이 없습니다.");
			}
			if (file.getSize() > MAX_IMAGE_BYTES) {
				throw new IllegalArgumentException("이미지는 20MB 를 넘을 수 없습니다.");
			}
			String name = file.getOriginalFilename();
			if (name == null || name.trim().isEmpty()) {
				name = file.getName();
			}
			String json = CanvasImageAnalyzer.analyzeJson(file.getBytes(), name,
					multipart.getParameter("memo"), multipart.getParameter("pattern"),
					multipart.getParameter("catalog"), multipart.getParameter("types"));
			write(response, HttpServletResponse.SC_OK, json);
		} catch (IllegalArgumentException e) {
			CanvasImageAnalyzer.log("===== [이미지 배치] 분석 실패(400): {} =====", e.getMessage());
			write(response, HttpServletResponse.SC_BAD_REQUEST, error(e.getMessage()));
		} catch (Exception e) {
			CanvasImageAnalyzer.log("===== [이미지 배치] 분석 실패: {} =====", e.getMessage());
			write(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, error(e.getMessage()));
		}
	}

	/** eXBuilder6 · 브라우저 FormData 모두 파일 파트 이름이 다를 수 있어 첫 번째 실제 파일 파트를 쓴다. */
	private static MultipartFile firstUploadedFile(MultipartHttpServletRequest request) {
		Iterator<String> names = request.getFileNames();
		while (names.hasNext()) {
			MultipartFile candidate = request.getFile(names.next());
			if (candidate != null && !candidate.isEmpty()) {
				return candidate;
			}
		}
		return null;
	}

	private static String error(String message) {
		return new JSONObject().put("ok", false).put("message", String.valueOf(message)).toString();
	}

	private static void write(HttpServletResponse response, int status, String body) throws IOException {
		byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
		response.setStatus(status);
		response.setContentType("application/json; charset=utf-8");
		response.setContentLength(bytes.length);
		response.getOutputStream().write(bytes);
	}
}
