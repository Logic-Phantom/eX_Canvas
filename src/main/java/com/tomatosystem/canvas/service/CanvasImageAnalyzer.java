package com.tomatosystem.canvas.service;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Locale;
import java.util.Properties;

import javax.imageio.ImageIO;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * eX-Canvas(Web Prototyper) - 화면 이미지 → Gemini 비전 → "보이는 UI 요소 목록(JSON)".
 *
 * eXConverter-AI 의 GeminiUiIrAnalyzer 와 같은 방식으로 만들었다(README 4.12).
 *  - 브라우저는 이미지 파일을 multipart 로 올리기만 하고, 키 · 축소 · 인코딩 · 호출 · 재시도 · 로그는 서버가 맡는다.
 *  - 키는 -Dexcanvas.gemini.apiKey > 환경 변수 EXCANVAS_GEMINI_APIKEY > GEMINI_API_KEY > GOOGLE_API_KEY > canvas/excanvas.properties.
 *  - responseSchema 는 기본으로 보내지 않는다(eXConverter-AI 실측 : 스키마를 붙이면 3.5-flash 가 반복 생성으로 붕괴).
 *    responseMimeType=application/json 만으로 JSON 을 강제하고, 형식 검증은 브라우저(imagePlanner.normalize)가 한다.
 *  - 전송 실패(429/5xx/연결)는 같은 요청을 백오프로, 비정상 출력(MAX_TOKENS · JSON 아님 · 반복)은 온도를 올려 다시 보낸다.
 *  - 구형 모델(2.5)이 thinkingLevel 을 거부하면 thinkingConfig 없이 한 번 더 보낸다.
 *
 * 스프링 · 서블릿에 의존하지 않는다(JDK + org.json). 그래서 Tomcat 컨트롤러(CanvasImageController)와
 * 개발 서버(tools/DevServer.java, 리플렉션으로 호출)가 같은 클래스를 쓴다.
 *
 * 결과 JSON : { ok:true, plan:{ pattern, title, reason, items:[{type,text,box[4],style,required}] },
 *              image:{width,height,originalWidth,originalHeight}, model, usage:{...}, elapsedSeconds }
 */
public final class CanvasImageAnalyzer {

	static final String DEFAULT_MODEL = "gemini-2.5-flash";
	static final String DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
	static final String API_VERSION = "v1beta";
	static final String PROMPT_RESOURCE = "canvas/prompts/image-items.txt";
	static final String CONFIG_RESOURCE = "canvas/excanvas.properties";
	/** 요청 전체가 20MB 를 넘으면 안 된다. 여유 있게 잡는다. */
	private static final int MAX_IMAGE_BYTES = 7000000;
	private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm:ss");
	private static final Properties FILE = loadProperties();

	private CanvasImageAnalyzer() {
	}

	/* ---------------------------------------------------------------- 설정 */

	/** -D > 환경 변수(점 → 밑줄, 대문자) > canvas/excanvas.properties > 기본값 */
	public static String get(String key, String defaultValue) {
		String value = System.getProperty(key);
		if (isBlank(value)) {
			value = System.getenv(key.replace('.', '_').toUpperCase(Locale.ROOT));
		}
		if (isBlank(value)) {
			value = FILE.getProperty(key);
		}
		return isBlank(value) ? defaultValue : value.trim();
	}

	public static int getInt(String key, int defaultValue) {
		try {
			return Integer.parseInt(get(key, String.valueOf(defaultValue)));
		} catch (NumberFormatException e) {
			return defaultValue;
		}
	}

	public static String apiKey() {
		String key = get("excanvas.gemini.apiKey", "");
		if (key.isEmpty()) {
			key = valueOf(System.getenv("GEMINI_API_KEY"));
		}
		if (key.isEmpty()) {
			key = valueOf(System.getenv("GOOGLE_API_KEY"));
		}
		return key;
	}

	public static boolean isConfigured() {
		return !apiKey().isEmpty();
	}

	public static String model() {
		return get("excanvas.gemini.model", DEFAULT_MODEL);
	}

	private static String baseUrl() {
		return get("excanvas.gemini.url", DEFAULT_BASE_URL).replaceAll("/+$", "");
	}

	private static boolean useResponseSchema() {
		return "true".equalsIgnoreCase(get("excanvas.gemini.responseSchema", "false"));
	}

	private static int maxOutputTokens() {
		return getInt("excanvas.gemini.maxOutputTokens", 8192);
	}

	private static int maxResponseChars() {
		return getInt("excanvas.gemini.maxResponseChars", 40000);
	}

	private static int maxImageSide() {
		return getInt("excanvas.gemini.maxImageSide", 1536);
	}

	private static int timeoutSeconds() {
		return getInt("excanvas.gemini.timeoutSeconds", 120);
	}

	private static int maxRetries() {
		return getInt("excanvas.gemini.maxRetries", 2);
	}

	private static double temperature() {
		try {
			return Double.parseDouble(get("excanvas.gemini.temperature", "0"));
		} catch (NumberFormatException e) {
			return 0;
		}
	}

	/** MINIMAL / LOW / MEDIUM / HIGH. NONE(OFF) 이면 thinkingConfig 를 보내지 않는다. */
	private static String thinkingLevel() {
		String level = get("excanvas.gemini.thinkingLevel", "MINIMAL").trim().toUpperCase(Locale.ROOT);
		return "NONE".equals(level) || "OFF".equals(level) ? "" : level;
	}

	/** 상태 확인용(키 값은 절대 넣지 않는다). */
	public static JSONObject describe() {
		JSONObject status = new JSONObject();
		status.put("ok", true);
		status.put("configured", isConfigured());
		status.put("model", model());
		status.put("url", baseUrl());
		status.put("responseSchema", useResponseSchema());
		status.put("maxOutputTokens", maxOutputTokens());
		status.put("maxImageSide", maxImageSide());
		status.put("thinkingLevel", thinkingLevel());
		status.put("timeoutSeconds", timeoutSeconds());
		status.put("maxRetries", maxRetries());
		return status;
	}

	public static String describeJson() {
		return describe().toString();
	}

	/* ---------------------------------------------------------------- 분석 */

	/**
	 * 이미지 바이트를 분석해 결과 JSON 문자열을 돌려준다.
	 * @param image   업로드된 이미지 원본
	 * @param name    파일 이름(로그용)
	 * @param memo    화면 요구사항 메모(프롬프트에 포함, 없으면 빈 문자열)
	 * @param pattern 사용자가 고른 패턴("auto" 또는 P1-1 …)
	 * @param catalog 템플릿 카탈로그 설명(브라우저의 templatePlanner.CATALOG 를 줄로 적은 것 — 한 곳에서만 관리한다)
	 * @param types   허용 컨트롤 유형(쉼표 구분, controlRegistry 의 type 키)
	 * @throws IllegalArgumentException 이미지가 아니거나 너무 큼(400)
	 * @throws IllegalStateException    키 없음 · Gemini 실패(503/500)
	 */
	public static String analyzeJson(byte[] image, String name, String memo, String pattern, String catalog, String types) throws IOException {
		if (!isConfigured()) {
			throw new IllegalStateException("서버에 Gemini API 키가 없습니다. -Dexcanvas.gemini.apiKey 또는 환경 변수 GEMINI_API_KEY 를 설정하세요.");
		}
		long started = System.currentTimeMillis();
		log("===== [이미지 배치] 분석 시작: {} ({} KB) =====", name, image.length / 1024);
		BufferedImage buffered = ImageIO.read(new ByteArrayInputStream(image));
		if (buffered == null) {
			throw new IllegalArgumentException("이미지 파일(PNG · JPG · GIF · WEBP · BMP)만 분석할 수 있습니다 : " + name);
		}
		if (buffered.getWidth() > 10000 || buffered.getHeight() > 10000) {
			throw new IllegalArgumentException("이미지가 너무 큽니다(10000px 초과) : " + name);
		}
		BufferedImage scaled = downscale(buffered, maxImageSide());
		EncodedImage encoded = encode(scaled);
		String prompt = loadPrompt();
		String userText = buildUserText(encoded, memo, pattern, catalog);
		log("Gemini 분석 시작: model={}, 전송 이미지 {}x{} ({} {} KB), thinkingLevel={}, maxOutputTokens={}, responseSchema={}",
				model(), encoded.width, encoded.height, encoded.mediaType, encoded.bytes.length / 1024,
				thinkingLevel().isEmpty() ? "(생략)" : thinkingLevel(), maxOutputTokens(), useResponseSchema());

		ModelOutput output = callGemini(encoded, prompt, userText, types);
		JSONObject plan = parsePlan(output.text);
		long elapsed = (System.currentTimeMillis() - started) / 1000;
		log("===== [이미지 배치] 분석 완료: 총 {}s, 요소 {}개, 패턴 {} =====", elapsed, plan.optJSONArray("items") == null ? 0 : plan.getJSONArray("items").length(), plan.optString("pattern", ""));

		JSONObject result = new JSONObject();
		result.put("ok", true);
		result.put("plan", plan);
		result.put("image", new JSONObject().put("width", encoded.width).put("height", encoded.height)
				.put("originalWidth", buffered.getWidth()).put("originalHeight", buffered.getHeight()));
		result.put("model", output.model);
		result.put("usage", output.usage());
		result.put("elapsedSeconds", elapsed);
		return result.toString();
	}

	/* ---------------------------------------------------------------- Gemini 호출 · 재시도 */

	static final class ModelOutput {
		String text = "";
		String model = "";
		String finishReason = "";
		String blockReason = "";
		int promptTokens;
		int outputTokens;
		int thoughtTokens;
		int totalTokens;

		JSONObject usage() {
			return new JSONObject().put("promptTokenCount", promptTokens).put("candidatesTokenCount", outputTokens)
					.put("thoughtsTokenCount", thoughtTokens).put("totalTokenCount", totalTokens)
					.put("model", model).put("finishReason", finishReason);
		}
	}

	/**
	 * 재시도 이유는 두 가지다.
	 *  - 전송 실패(429/5xx/연결 끊김) : 같은 요청 + 지수 백오프(오류의 retryDelay 우선)
	 *  - 비정상 출력(MAX_TOKENS · JSON 아님 · 반복) : 온도를 0 → 0.4 → 0.8 로 올려 다른 경로로 다시 생성
	 */
	private static ModelOutput callGemini(EncodedImage image, String prompt, String userText, String types) throws IOException {
		int attempts = maxRetries() + 1;
		boolean omitThinking = false;
		RuntimeException last = null;
		for (int attempt = 1; attempt <= attempts; attempt++) {
			double temperature = attempt == 1 ? temperature() : Math.min(1.0, 0.4 * (attempt - 1));
			byte[] body = buildRequest(image, prompt, userText, types, omitThinking, temperature).toString().getBytes(StandardCharsets.UTF_8);
			long started = System.currentTimeMillis();
			try {
				ModelOutput output = requestOnce(body);
				log("Gemini 응답: {}s, 입력 {}토큰, 출력 {}토큰(추론 {}), 종료사유={}, 응답 모델={}", (System.currentTimeMillis() - started) / 1000,
						output.promptTokens, output.outputTokens, output.thoughtTokens, output.finishReason, output.model);
				verify(output);
				return output;
			} catch (UnsupportedThinkingException e) {
				if (omitThinking) {
					throw e;
				}
				omitThinking = true;
				log("이 모델은 thinkingLevel 을 지원하지 않아 thinkingConfig 없이 다시 보냅니다: model={}", model());
				attempt--; // 모델에 닿지 못한 요청은 횟수로 세지 않는다.
			} catch (DegenerateOutputException e) {
				last = e;
				if (attempt == attempts) {
					break;
				}
				log("Gemini 출력이 비정상이라 재시도 {}/{}: {} → 다음은 temperature={}", attempt, attempts - 1, e.getMessage(), Math.min(1.0, 0.4 * attempt));
			} catch (RetryableException e) {
				last = e;
				if (attempt == attempts) {
					break;
				}
				long wait = e.retryAfterMs > 0 ? e.retryAfterMs : (long) Math.pow(2, attempt) * 1000L;
				log("Gemini 호출 재시도 {}/{}: {} ({}초 후)", attempt, attempts - 1, e.getMessage(), wait / 1000);
				try {
					Thread.sleep(wait);
				} catch (InterruptedException ie) {
					Thread.currentThread().interrupt();
					throw new IllegalStateException("중단되었습니다.", ie);
				}
			}
		}
		if (last instanceof DegenerateOutputException) {
			throw new IllegalStateException("Gemini 가 " + attempts + "회 모두 비정상 출력을 냈습니다: " + last.getMessage(), last);
		}
		throw new IllegalStateException("Gemini 를 " + attempts + "회 시도했지만 실패했습니다: " + (last == null ? "" : last.getMessage()), last);
	}

	private static void verify(ModelOutput output) {
		if (!output.blockReason.isEmpty()) {
			throw new IllegalStateException("Gemini 가 요청을 차단했습니다(blockReason=" + output.blockReason + ").");
		}
		String reason = output.finishReason;
		if ("MAX_TOKENS".equals(reason)) {
			String cause = output.thoughtTokens > 0 && output.thoughtTokens >= output.outputTokens
					? "추론이 예산을 소진했습니다(excanvas.gemini.thinkingLevel 을 MINIMAL 로)."
					: "모델이 반복 생성에 빠진 것입니다.";
			throw new DegenerateOutputException("maxOutputTokens=" + maxOutputTokens() + " 에서 잘림(추론 " + output.thoughtTokens + " + 답변 " + output.outputTokens + "토큰). " + cause);
		}
		if ("SAFETY".equals(reason) || "PROHIBITED_CONTENT".equals(reason) || "BLOCKLIST".equals(reason) || "SPII".equals(reason)) {
			throw new IllegalStateException("Gemini 가 안전 사유로 멈췄습니다(finishReason=" + reason + ").");
		}
		if ("RECITATION".equals(reason)) {
			throw new IllegalStateException("Gemini 가 finishReason=RECITATION 으로 멈췄습니다.");
		}
		if (output.text.trim().isEmpty()) {
			throw new DegenerateOutputException("빈 응답(finishReason=" + reason + ")");
		}
		if (output.text.length() > maxResponseChars()) {
			throw new DegenerateOutputException("출력이 " + maxResponseChars() + "자를 넘었습니다(" + output.text.length() + "자). 같은 구조를 반복 생성한 것입니다.");
		}
	}

	/** 코드 펜스를 벗기고 JSON 으로 읽는다. items 배열이 없으면 비정상 출력으로 본다(온도를 올려 재시도). */
	private static JSONObject parsePlan(String text) {
		String cleaned = text.trim().replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "").trim();
		JSONObject plan;
		try {
			plan = new JSONObject(cleaned);
		} catch (RuntimeException e) {
			int open = cleaned.indexOf('{');
			int close = cleaned.lastIndexOf('}');
			if (open < 0 || close <= open) {
				throw new IllegalStateException("Gemini 응답이 JSON 이 아닙니다: " + e.getMessage());
			}
			plan = new JSONObject(cleaned.substring(open, close + 1));
		}
		if (plan.optJSONArray("items") == null) {
			throw new IllegalStateException("Gemini 응답에 items 배열이 없습니다.");
		}
		return plan;
	}

	static JSONObject buildRequest(EncodedImage image, String systemPrompt, String userText, String types, boolean omitThinking, double temperature) {
		JSONObject request = new JSONObject();
		request.put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(new JSONObject().put("text", systemPrompt))));
		JSONArray parts = new JSONArray();
		parts.put(new JSONObject().put("inline_data", new JSONObject().put("mime_type", image.mediaType).put("data", Base64.getEncoder().encodeToString(image.bytes))));
		parts.put(new JSONObject().put("text", userText));
		request.put("contents", new JSONArray().put(new JSONObject().put("role", "user").put("parts", parts)));

		JSONObject generationConfig = new JSONObject();
		generationConfig.put("temperature", temperature);
		generationConfig.put("maxOutputTokens", maxOutputTokens());
		generationConfig.put("responseMimeType", "application/json");
		if (useResponseSchema()) {
			generationConfig.put("responseSchema", responseSchema(types));
		}
		String level = omitThinking ? "" : thinkingLevel();
		if (!level.isEmpty()) {
			generationConfig.put("thinkingConfig", new JSONObject().put("thinkingLevel", level));
		}
		request.put("generationConfig", generationConfig);
		return request;
	}

	/** 브라우저(imagePlanner.buildResponseSchema)와 같은 모양. maxItems 는 넣지 않는다(400 원인). */
	static JSONObject responseSchema(String types) {
		JSONArray typeEnum = new JSONArray();
		for (String each : (types == null ? "" : types).split(",")) {
			if (!each.trim().isEmpty()) {
				typeEnum.put(each.trim());
			}
		}
		JSONObject itemProps = new JSONObject();
		itemProps.put("type", typeEnum.length() > 0 ? new JSONObject().put("type", "STRING").put("enum", typeEnum) : new JSONObject().put("type", "STRING"));
		itemProps.put("text", new JSONObject().put("type", "STRING"));
		itemProps.put("box", new JSONObject().put("type", "ARRAY").put("items", new JSONObject().put("type", "INTEGER")));
		itemProps.put("style", new JSONObject().put("type", "STRING").put("enum", new JSONArray().put("primary").put("secondary").put("default")));
		itemProps.put("required", new JSONObject().put("type", "BOOLEAN"));
		JSONObject item = new JSONObject().put("type", "OBJECT").put("properties", itemProps).put("required", new JSONArray().put("type").put("box"));
		JSONObject props = new JSONObject();
		props.put("pattern", new JSONObject().put("type", "STRING"));
		props.put("reason", new JSONObject().put("type", "STRING"));
		props.put("title", new JSONObject().put("type", "STRING"));
		props.put("items", new JSONObject().put("type", "ARRAY").put("items", item));
		return new JSONObject().put("type", "OBJECT").put("properties", props).put("required", new JSONArray().put("pattern").put("items"));
	}

	private static String buildUserText(EncodedImage image, String memo, String pattern, String catalog) {
		StringBuilder sb = new StringBuilder();
		if (!isBlank(catalog)) {
			sb.append("[템플릿 카탈로그]\n").append(catalog.trim()).append("\n\n");
		}
		if (!isBlank(pattern) && !"auto".equals(pattern)) {
			sb.append("[사용자 지정 패턴] ").append(pattern.trim()).append(" - pattern 은 이 값으로 한다.\n\n");
		}
		sb.append("[요구사항 메모] ").append(isBlank(memo) ? "(없음)" : memo.trim()).append("\n\n");
		sb.append("[이미지] ").append(image.width).append("×").append(image.height)
				.append("px. 이 이미지의 화면 본문에 보이는 UI 요소를 모두 옮겨 JSON 만 돌려줘라.");
		return sb.toString();
	}

	/* ---------------------------------------------------------------- HTTP */

	private static ModelOutput requestOnce(byte[] body) throws IOException {
		URL url = new URL(baseUrl() + "/" + API_VERSION + "/models/" + model() + ":generateContent");
		String proxyHost = get("excanvas.gemini.proxyHost", "");
		HttpURLConnection con = (HttpURLConnection) (proxyHost.isEmpty() ? url.openConnection()
				: url.openConnection(new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyHost, getInt("excanvas.gemini.proxyPort", 8080)))));
		con.setRequestMethod("POST");
		con.setConnectTimeout(10000);
		con.setReadTimeout(timeoutSeconds() * 1000);
		con.setDoOutput(true);
		con.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
		con.setRequestProperty("x-goog-api-key", apiKey()); // 헤더로만 보낸다(접근 로그 · 프록시에 키가 남지 않게)
		con.setFixedLengthStreamingMode(body.length);
		try (OutputStream out = con.getOutputStream()) {
			out.write(body);
		}
		int status;
		try {
			status = con.getResponseCode();
		} catch (IOException e) {
			throw new RetryableException("연결 실패: " + e.getMessage(), 0);
		}
		if (status >= 400) {
			String raw = con.getErrorStream() == null ? "" : new String(readAll(con.getErrorStream()), StandardCharsets.UTF_8);
			String message = "Gemini API HTTP " + status;
			long retryAfterMs = 0;
			try {
				JSONObject error = new JSONObject(raw).optJSONObject("error");
				if (error != null) {
					message += " " + error.optString("status", "") + ": " + error.optString("message", "");
					retryAfterMs = retryDelayMs(error);
				} else {
					message += ": " + raw;
				}
			} catch (RuntimeException ignored) {
				message += ": " + raw;
			}
			if (status == 400 && message.toLowerCase(Locale.ROOT).contains("thinking level is not supported")) {
				throw new UnsupportedThinkingException(message);
			}
			if (status == 429 || status == 408 || status == 409 || status >= 500) {
				throw new RetryableException(message, retryAfterMs);
			}
			throw new IllegalStateException(message);
		}
		JSONObject response = new JSONObject(new String(readAll(con.getInputStream()), StandardCharsets.UTF_8));
		ModelOutput output = new ModelOutput();
		output.model = response.optString("modelVersion", model());
		JSONObject promptFeedback = response.optJSONObject("promptFeedback");
		if (promptFeedback != null) {
			output.blockReason = promptFeedback.optString("blockReason", "");
		}
		JSONObject usage = response.optJSONObject("usageMetadata");
		if (usage != null) {
			output.promptTokens = usage.optInt("promptTokenCount", 0);
			output.outputTokens = usage.optInt("candidatesTokenCount", 0);
			output.thoughtTokens = usage.optInt("thoughtsTokenCount", 0);
			output.totalTokens = usage.optInt("totalTokenCount", 0);
		}
		JSONArray candidates = response.optJSONArray("candidates");
		StringBuilder text = new StringBuilder();
		if (candidates != null && candidates.length() > 0) {
			JSONObject candidate = candidates.getJSONObject(0);
			output.finishReason = candidate.optString("finishReason", "");
			JSONObject content = candidate.optJSONObject("content");
			JSONArray parts = content == null ? null : content.optJSONArray("parts");
			if (parts != null) {
				for (int i = 0; i < parts.length(); i++) {
					JSONObject part = parts.getJSONObject(i);
					if (part.optBoolean("thought", false)) {
						continue; // 추론 파트는 답이 아니다.
					}
					text.append(part.optString("text", ""));
				}
			}
		}
		output.text = text.toString();
		return output;
	}

	/** 쿼터 오류에는 RetryInfo(retryDelay: "37s")가 실려 온다. */
	private static long retryDelayMs(JSONObject error) {
		JSONArray details = error.optJSONArray("details");
		if (details == null) {
			return 0;
		}
		for (int i = 0; i < details.length(); i++) {
			JSONObject detail = details.optJSONObject(i);
			if (detail == null) {
				continue;
			}
			String delay = detail.optString("retryDelay", "");
			if (delay.endsWith("s")) {
				try {
					return (long) (Double.parseDouble(delay.substring(0, delay.length() - 1)) * 1000);
				} catch (NumberFormatException ignored) {
					// 백오프로 대체
				}
			}
		}
		return 0;
	}

	static final class UnsupportedThinkingException extends RuntimeException {
		private static final long serialVersionUID = 1L;

		UnsupportedThinkingException(String message) {
			super(message);
		}
	}

	static final class DegenerateOutputException extends RuntimeException {
		private static final long serialVersionUID = 1L;

		DegenerateOutputException(String message) {
			super(message);
		}
	}

	static final class RetryableException extends RuntimeException {
		private static final long serialVersionUID = 1L;
		final long retryAfterMs;

		RetryableException(String message, long retryAfterMs) {
			super(message);
			this.retryAfterMs = retryAfterMs;
		}
	}

	/* ---------------------------------------------------------------- 프롬프트 · 이미지 */

	/** 클래스패스의 canvas/prompts/image-items.txt. 없으면 내장 프롬프트. */
	static String loadPrompt() throws IOException {
		try (InputStream in = CanvasImageAnalyzer.class.getClassLoader().getResourceAsStream(PROMPT_RESOURCE)) {
			if (in != null) {
				return new String(readAll(in), StandardCharsets.UTF_8);
			}
		}
		return BUILTIN_PROMPT;
	}

	static final String BUILTIN_PROMPT = String.join("\n",
			"너는 토마토시스템 eXBuilder6 화면 설계 보조자다.",
			"사용자가 준 화면 이미지(캡처 · 디자인 시안 · 손그림)를 보고, 화면 본문에 보이는 UI 요소를 eXBuilder6 컨트롤 목록(JSON)으로 옮긴다.",
			"XML 이나 코드, 설명 문장은 쓰지 않는다. 아래 모양의 JSON 객체 하나만 돌려준다(마크다운 펜스 없이).",
			"{\"pattern\":\"P1-1\",\"reason\":\"한 문장\",\"title\":\"화면 제목\",\"items\":[{\"type\":\"output\",\"text\":\"라벨\",\"box\":[ymin,xmin,ymax,xmax],\"style\":\"default\",\"required\":false}]}",
			"",
			"[요소] { type, text, box, style, required }",
			"- box : 정수 4개 [ymin, xmin, ymax, xmax]. 이미지의 가로·세로를 각각 0~1000 으로 본 좌표이며 요소가 실제로 차지하는 사각형이다.",
			"- type : output(라벨·제목·안내 글) · button · inputbox(글상자, 읽기 전용 값 표시 포함) · combobox(드롭다운) · dateinput(날짜) · numbereditor(숫자·금액) ·",
			"  maskeditor(전화·사업자번호처럼 형식 있는 입력) · searchinput(돋보기 검색 상자) · checkbox(체크 1개) · checkboxgroup(체크 여러 개 묶음) · radiobutton(라디오 묶음) ·",
			"  listbox · textarea(여러 줄 글상자) · slider · fileinput(파일 선택 한 줄) · img(이미지·로고·사진) · htmlsnippet · progress ·",
			"  grid(표·목록) · tree(트리) · tabfolder(탭) · accordion · group(빈 상자·카드 틀) · pageindexer(페이지 번호 줄) · calendar(달력) ·",
			"  fileupload(파일 목록 업로드 영역) · embeddedpage(외부 페이지·iframe) · embeddedapp · uicontrolshell(차트·지도·에디터 같은 서드파티 영역).",
			"- text : 유형별 뜻 — output/button/inputbox/textarea: 보이는 글자 · checkbox: 문구 · combobox/radiobutton/checkboxgroup/listbox: 항목을 쉼표로 ·",
			"  grid: 표 헤더를 왼쪽부터 쉼표로 · tabfolder: 탭 이름을 쉼표로 · accordion: 섹션 제목을 쉼표로 · maskeditor: 마스크 · 그 밖: 빈 문자열.",
			"  글자는 보이는 그대로 적는다(번역·요약·추측하지 않는다). 안 보이면 비운다. 설명이나 이유를 값에 적지 않는다.",
			"- style : button 에만. 채워진 강조색(파랑·진한색) 버튼 = primary, 흰·회색 바탕의 보통 버튼 = secondary, 모르면 default.",
			"- required : output(라벨) 에만. 라벨에 * 나 빨간 필수 표시가 있으면 true 로 하고 text 에서 * 는 뺀다.",
			"",
			"[규칙]",
			"1. 화면 본문의 요소만 옮긴다. 브라우저 틀 · 상단 메뉴 · 좌측 네비게이션 · 워터마크 · 툴팁 · 마우스 커서는 뺀다.",
			"2. 표(그리드)는 표 전체를 grid 하나로 옮긴다(셀·행을 따로 만들지 않는다). 헤더 글자를 text 에 쉼표로 적는다. 데이터 행은 요소가 아니다.",
			"3. 표 위에 붙은 제목 글자와 버튼 묶음은 각각 output · button 으로 표 바로 위에 둔다. 표 아래의 페이지 번호 줄은 pageindexer. '총 0건' 같은 건수 표시와 아이콘은 뺀다.",
			"4. 조회 조건은 라벨 output + 입력 컨트롤로 각각 옮기고, 라벨은 입력의 왼쪽(또는 바로 위)에 둔다.",
			"   '시작 ~ 끝' 기간은 입력 2개 사이에 text 가 \"~\" 인 output 을 하나 둔다.",
			"5. 탭폴더는 탭 머리와 내용 영역을 합친 사각형 하나로 두고, 탭 안의 표·입력은 그 사각형 안의 좌표로 따로 적는다.",
			"6. 두 표 사이의 이동 버튼(▶ ◀ ▼ ▲ > <)은 button 으로 두고 text 에는 화살표만 적는다.",
			"7. 요소끼리 겹치지 않게, 이미지의 위치·크기 비율을 그대로 지킨다. 같은 줄의 요소는 ymin 이 거의 같아야 한다.",
			"8. 라벨과 입력이 한 상자로 붙어 있어도 라벨(output)과 입력을 따로 나눈다. 입력 안의 자리 표시 글자(placeholder)는 text 에 넣지 않는다.",
			"9. pattern 은 [템플릿 카탈로그] 에서 화면 구성이 가장 비슷한 것의 id 를 고르고 reason 에 한 문장으로 이유를 적는다. title 은 화면 제목(보이면).",
			"10. 화면 맨 아래 버튼 줄(저장 · 닫기 등)은 button 으로 맨 아래에 그대로 둔다. 좌·우 위치도 이미지대로.",
			"11. 같은 문장을 두 번 쓰고 있다면 즉시 멈추고 JSON 을 닫는다.");

	static final class EncodedImage {
		final byte[] bytes;
		final String mediaType;
		final int width;
		final int height;

		EncodedImage(byte[] bytes, String mediaType, int width, int height) {
			this.bytes = bytes;
			this.mediaType = mediaType;
			this.width = width;
			this.height = height;
		}
	}

	/** 작은 글자를 위해 PNG 를 우선하고, 너무 크면 JPEG. */
	static EncodedImage encode(BufferedImage image) throws IOException {
		byte[] png = write(image, "png");
		if (png.length <= MAX_IMAGE_BYTES) {
			return new EncodedImage(png, "image/png", image.getWidth(), image.getHeight());
		}
		byte[] jpeg = write(image, "jpg");
		if (jpeg.length > MAX_IMAGE_BYTES) {
			throw new IllegalArgumentException("이미지가 너무 커서 한 번에 보낼 수 없습니다. excanvas.gemini.maxImageSide 를 낮추세요.");
		}
		return new EncodedImage(jpeg, "image/jpeg", image.getWidth(), image.getHeight());
	}

	private static byte[] write(BufferedImage image, String format) throws IOException {
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		if (!ImageIO.write(image, format, out)) {
			throw new IllegalStateException("ImageIO writer 가 없습니다: " + format);
		}
		return out.toByteArray();
	}

	static BufferedImage downscale(BufferedImage source, int maxSide) {
		int longest = Math.max(source.getWidth(), source.getHeight());
		double scale = longest > maxSide ? maxSide / (double) longest : 1.0;
		int w = Math.max(1, (int) Math.round(source.getWidth() * scale));
		int h = Math.max(1, (int) Math.round(source.getHeight() * scale));
		BufferedImage target = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
		Graphics2D g = target.createGraphics();
		g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
		g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
		g.setColor(java.awt.Color.WHITE); // 투명 PNG 는 흰 바탕에
		g.fillRect(0, 0, w, h);
		g.drawImage(source, 0, 0, w, h, null);
		g.dispose();
		return target;
	}

	/* ---------------------------------------------------------------- 잔손질 */

	private static Properties loadProperties() {
		Properties properties = new Properties();
		try (InputStream in = CanvasImageAnalyzer.class.getClassLoader().getResourceAsStream(CONFIG_RESOURCE)) {
			if (in != null) {
				properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
			}
		} catch (IOException ignored) {
			// 기본값을 쓴다.
		}
		return properties;
	}

	private static byte[] readAll(InputStream in) throws IOException {
		ByteArrayOutputStream buffer = new ByteArrayOutputStream();
		byte[] chunk = new byte[8192];
		int read;
		while ((read = in.read(chunk)) > 0) {
			buffer.write(chunk, 0, read);
		}
		return buffer.toByteArray();
	}

	/** 이클립스 콘솔 · 개발 서버 콘솔에 진행 상황을 남긴다({} 자리 채움). */
	public static void log(String message, Object... args) {
		StringBuilder out = new StringBuilder();
		int argIndex = 0;
		int from = 0;
		int at;
		while ((at = message.indexOf("{}", from)) >= 0) {
			out.append(message, from, at).append(argIndex < args.length ? String.valueOf(args[argIndex++]) : "{}");
			from = at + 2;
		}
		out.append(message.substring(from));
		System.out.println("[eX-Canvas " + LocalTime.now().format(TIME) + "] " + out);
		System.out.flush();
	}

	private static boolean isBlank(String value) {
		return value == null || value.trim().isEmpty();
	}

	private static String valueOf(String value) {
		return value == null ? "" : value.trim();
	}
}
