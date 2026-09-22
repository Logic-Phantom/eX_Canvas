package com.tomatosystem.canvas.web;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * eX-Canvas(Web Prototyper) - Gemini API 프록시.
 *
 * 브라우저는 generateContent 요청 본문(JSON)만 보내고, API 키는 서버가 붙인다.
 * 키 위치: 환경 변수 GEMINI_API_KEY (없으면 JVM 옵션 -Dgemini.api.key).
 * 화면에서는 "호출 = 서버 프록시(/ai/gemini.do)" 를 고르면 이 경로를 쓴다.
 */
@Controller
public class GeminiProxyController {

	private static final String API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
	/** 이미지 분석(inline_data · 긴 변 1600px 이하)까지 담을 수 있게 넉넉히 둔다. */
	private static final int MAX_BODY_BYTES = 8 * 1024 * 1024;

	@RequestMapping(value = "/ai/gemini.do", method = RequestMethod.POST)
	public void generate(@RequestParam(value = "model", defaultValue = "gemini-2.5-flash") String model,
			HttpServletRequest request, HttpServletResponse response) throws IOException {

		String apiKey = System.getenv("GEMINI_API_KEY");
		if (apiKey == null || apiKey.isEmpty()) {
			apiKey = System.getProperty("gemini.api.key");
		}
		if (apiKey == null || apiKey.isEmpty()) {
			write(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "{\"error\":{\"message\":\"서버에 GEMINI_API_KEY 가 설정되지 않았습니다.\"}}".getBytes(StandardCharsets.UTF_8));
			return;
		}
		// 모델명은 URL 경로에 들어가므로 허용 문자만 남긴다.
		if (!model.matches("[A-Za-z0-9._-]{1,64}")) {
			write(response, HttpServletResponse.SC_BAD_REQUEST, "{\"error\":{\"message\":\"모델명이 올바르지 않습니다.\"}}".getBytes(StandardCharsets.UTF_8));
			return;
		}

		byte[] body = readAll(request.getInputStream(), MAX_BODY_BYTES);
		if (body == null) {
			write(response, HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE, "{\"error\":{\"message\":\"요청이 너무 큽니다.\"}}".getBytes(StandardCharsets.UTF_8));
			return;
		}

		HttpURLConnection con = (HttpURLConnection) new URL(API_BASE + model + ":generateContent").openConnection();
		try {
			con.setRequestMethod("POST");
			con.setConnectTimeout(10000);
			con.setReadTimeout(60000);
			con.setDoOutput(true);
			con.setRequestProperty("Content-Type", "application/json");
			con.setRequestProperty("x-goog-api-key", apiKey);
			try (OutputStream out = con.getOutputStream()) {
				out.write(body);
			}
			int status = con.getResponseCode();
			InputStream in = status >= 400 ? con.getErrorStream() : con.getInputStream();
			byte[] result = in == null ? new byte[0] : readAll(in, Integer.MAX_VALUE);
			write(response, status, result);
		} finally {
			con.disconnect();
		}
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

	private static void write(HttpServletResponse response, int status, byte[] body) throws IOException {
		response.setStatus(status);
		response.setContentType("application/json; charset=utf-8");
		response.setContentLength(body.length);
		response.getOutputStream().write(body);
	}
}
