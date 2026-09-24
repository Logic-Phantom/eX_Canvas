import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CopyOnWriteArraySet;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

/**
 * eX-Canvas 개발용 초경량 서버 (Tomcat 없이 Web Prototyper 를 띄워 보기 위한 도구).
 *
 * 실행(Java 11+, 프로젝트 루트에서):
 *   java tools/DevServer.java [빌드폴더=target/clx-dev] [포트=8090]
 *
 *  - /runtime/**      → exbuilder/runtime (cleopatra.js · 기본 테마)
 *  - /ai/gemini.do    → Gemini 프록시. 키는 환경 변수 GEMINI_API_KEY (브라우저에 키를 두지 않는 경로)
 *  - /canvas/saveResult.do → 생성한 .clx/.js 를 clx-src/result/<실행 날짜>/ 에 저장
 *  - /canvas/collabInfo.do → 공유(CRDT) 릴레이 주소 알림
 *  - 그 밖            → 빌드 폴더(e6-compiler 산출물, index.html 포함)
 *
 * 공유 릴레이(웹소켓)는 HTTP 와 다른 포트(기본 = HTTP 포트 + 1)에서 돈다.
 * com.sun.net.httpserver 는 프로토콜 업그레이드를 지원하지 않아 소켓을 따로 연다.
 *   -Dexcanvas.collab.port=0        → 공유 릴레이를 끈다
 *   -Dexcanvas.collab.host=0.0.0.0  → 다른 PC 에서도 붙을 수 있게 연다(사내망 실습용)
 *
 * 127.0.0.1 에만 바인딩한다. 운영 용도가 아니다.
 */
public class DevServer {

	private static final Map<String, String> MIME = new HashMap<>();
	static {
		MIME.put("html", "text/html; charset=utf-8");
		MIME.put("js", "text/javascript; charset=utf-8");
		MIME.put("css", "text/css; charset=utf-8");
		MIME.put("json", "application/json; charset=utf-8");
		MIME.put("png", "image/png");
		MIME.put("gif", "image/gif");
		MIME.put("svg", "image/svg+xml");
		MIME.put("ico", "image/x-icon");
		MIME.put("woff", "font/woff");
		MIME.put("woff2", "font/woff2");
		MIME.put("ttf", "font/ttf");
	}

	/** 생성물을 쓸 소스 경로(clx-src). 실행 폴더가 어디든 찾아낸다. */
	private static Path srcDir;

	/** 공유(CRDT) 릴레이. 끄면 null. */
	private static CollabRelay collab;

	public static void main(String[] args) throws Exception {
		final Path buildDir = Paths.get(args.length > 0 ? args[0] : "target/clx-dev").toAbsolutePath().normalize();
		final Path runtimeDir = Paths.get("exbuilder/runtime").toAbsolutePath().normalize();
		int port = args.length > 1 ? Integer.parseInt(args[1]) : 8090;
		srcDir = findSrcDir(buildDir);

		ensureIndexHtml(buildDir, args.length > 2 ? args[2] : "canvas/Prototyper");

		startCollabRelay(port);

		HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
		server.createContext("/ai/gemini.do", DevServer::proxyGemini);
		server.createContext("/canvas/saveResult.do", DevServer::saveResult);
		server.createContext("/canvas/collabInfo.do", DevServer::collabInfo);
		server.createContext("/canvas/analyzeImage.do", DevServer::analyzeImage);
		server.createContext("/canvas/imageStatus.do", DevServer::imageStatus);
		server.createContext("/canvas/fetchOpenApi.do", DevServer::fetchOpenApi);
		server.createContext("/runtime/", exchange -> serveFile(exchange, runtimeDir, exchange.getRequestURI().getPath().substring("/runtime/".length())));
		server.createContext("/", exchange -> {
			String path = exchange.getRequestURI().getPath();
			serveFile(exchange, buildDir, path.equals("/") ? "index.html" : path.substring(1));
		});
		server.start();
		System.out.println("eX-Canvas dev server : http://127.0.0.1:" + port + "/  (build: " + buildDir + ")");
		System.out.println("Gemini proxy        : " + (System.getenv("GEMINI_API_KEY") == null ? "OFF (GEMINI_API_KEY 미설정)" : "ON"));
		System.out.println("이미지로 배치       : " + imageAnalyzerState());
		System.out.println("API 연동(명세 프록시): ON (GET /canvas/fetchOpenApi.do?url=… · http/https · 8MB)");
		System.out.println("result 저장         : " + (srcDir == null ? "OFF (clx-src 를 찾지 못했습니다 → 브라우저 다운로드로 대체)" : srcDir.resolve("result").resolve("<yyyyMMdd>")));
		System.out.println("공유 릴레이         : " + (collab == null ? "OFF" : "ws://" + collab.host + ":" + collab.port + CollabRelay.WS_PATH));
	}

	/** 공유 릴레이를 띄운다(포트 0 이면 띄우지 않는다). 실패해도 화면은 그대로 뜬다. */
	private static void startCollabRelay(int httpPort) {
		int relayPort = Integer.getInteger("excanvas.collab.port", httpPort + 1);
		if (relayPort <= 0) {
			return;
		}
		String host = System.getProperty("excanvas.collab.host", "127.0.0.1");
		try {
			CollabRelay relay = new CollabRelay(host, relayPort);
			relay.start();
			collab = relay;
		} catch (IOException e) {
			System.err.println("공유 릴레이를 띄우지 못했습니다(" + host + ":" + relayPort + ") : " + e.getMessage());
		}
	}

	/** 화면이 "공유 서버가 어디냐" 고 물을 때 답한다. 릴레이가 HTTP 와 다른 포트를 쓰므로 필요하다. */
	private static void collabInfo(HttpExchange exchange) throws IOException {
		try {
			if (collab == null) {
				send(exchange, 503, "application/json; charset=utf-8",
						"{\"ok\":false,\"message\":\"공유 릴레이가 꺼져 있습니다(-Dexcanvas.collab.port).\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			String json = "{\"ok\":true,\"port\":" + collab.port + ",\"path\":\"" + CollabRelay.WS_PATH + "\",\"rooms\":" + collab.roomCount() + "}";
			send(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
		} finally {
			exchange.close();
		}
	}

	/**
	 * 빌드 폴더에 index.html 이 없으면 만들어 준다.
	 *
	 * e6-compiler 는 --main 을 주면 index.html 을 만들지만, 이클립스의 eXBuilder6 빌더가 만드는
	 * clx-build 에는 없다(WAS 가 .clx URL 로 직접 여는 구조라 필요가 없다).
	 * 걸어 줄 CSS 는 빌드 폴더의 env.json(runtime-css)을 그대로 읽는다.
	 */
	private static void ensureIndexHtml(Path buildDir, String mainApp) throws IOException {
		Path index = buildDir.resolve("index.html");
		if (Files.isRegularFile(index) || !Files.isDirectory(buildDir)) {
			return;
		}
		StringBuilder links = new StringBuilder();
		for (String css : runtimeCss(buildDir)) {
			links.append("\t\t<link rel=\"stylesheet\" href=\".").append(css).append("\" type=\"text/css\">\n");
		}
		String html = "<!DOCTYPE html>\n<html>\n\t<head>\n"
				+ "\t\t<meta charset=\"UTF-8\">\n"
				+ "\t\t<meta name=\"viewport\" content=\"width=device-width, user-scalable=no\">\n"
				+ "\t\t<script type=\"text/javascript\" src=\"runtime/cleopatra.js\"></script>\n"
				+ "\t\t<script type=\"text/javascript\" src=\"./cpr-lib/user-modules.js\"></script>\n"
				+ "\t\t<script type=\"text/javascript\" src=\"./cpr-lib/udc.js\"></script>\n"
				+ "\t\t<script type=\"text/javascript\" src=\"" + mainApp + ".clx.js\"></script>\n"
				+ "\t\t<link rel=\"stylesheet\" type=\"text/css\" href=\"runtime/css/cleopatra.css\">\n"
				+ links
				+ "\t\t<style>html, body { margin: 0px; padding: 0px; height: 100%; } body { box-sizing: content-box; min-height: 100%; }</style>\n"
				+ "\t</head>\n\t<body>\n\t\t<script type=\"text/javascript\">\n"
				+ "\t\t\tvar app = cpr.core.Platform.INSTANCE.lookup(\"" + mainApp + "\");\n"
				+ "\t\t\tapp.createNewInstance().run();\n"
				+ "\t\t</script>\n\t</body>\n</html>\n";
		Files.write(index, html.getBytes(StandardCharsets.UTF_8));
		System.out.println("index.html 을 만들었습니다 : " + index);
	}

	/** env.json 의 runtime-css 목록(예: "/theme/custom-theme.less" → "/theme/custom-theme.css"). */
	private static java.util.List<String> runtimeCss(Path buildDir) throws IOException {
		java.util.List<String> result = new java.util.ArrayList<>();
		Path env = buildDir.resolve("env.json");
		if (!Files.isRegularFile(env)) {
			return result;
		}
		String text = new String(Files.readAllBytes(env), StandardCharsets.UTF_8);
		int at = text.indexOf("runtime-css");
		if (at < 0) {
			return result;
		}
		int open = text.indexOf('[', at);
		int close = text.indexOf(']', open);
		if (open < 0 || close < 0) {
			return result;
		}
		for (String piece : text.substring(open + 1, close).split(",")) {
			String value = piece.trim().replace("\"", "").trim();
			if (value.isEmpty()) {
				continue;
			}
			result.add(value.endsWith(".less") ? value.substring(0, value.length() - 5) + ".css" : value);
		}
		return result;
	}

	/** 설정(-Dexcanvas.src.dir) → 실행 폴더 → 빌드 폴더 순으로 위로 올라가며 clx-src 를 찾는다. */
	private static Path findSrcDir(Path buildDir) {
		String configured = System.getProperty("excanvas.src.dir");
		if (configured == null || configured.isEmpty()) {
			configured = System.getenv("EXCANVAS_SRC_DIR");
		}
		if (configured != null && !configured.isEmpty()) {
			Path path = Paths.get(configured).toAbsolutePath().normalize();
			return Files.isDirectory(path) ? path : null;
		}
		Path found = walkUpForSrc(Paths.get("").toAbsolutePath());
		return found != null ? found : walkUpForSrc(buildDir);
	}

	private static Path walkUpForSrc(Path start) {
		Path dir = start.toAbsolutePath().normalize();
		for (int i = 0; i < 8 && dir != null; i++) {
			Path candidate = dir.resolve("clx-src");
			if (Files.isDirectory(candidate)) {
				return candidate;
			}
			dir = dir.getParent();
		}
		return null;
	}

	private static void serveFile(HttpExchange exchange, Path root, String relative) throws IOException {
		try {
			Path file = root.resolve(URLDecoder.decode(relative, "UTF-8")).normalize();
			if (!file.startsWith(root) || !Files.isRegularFile(file)) {
				send(exchange, 404, "text/plain; charset=utf-8", "Not Found".getBytes(StandardCharsets.UTF_8));
				return;
			}
			String name = file.getFileName().toString();
			String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : "";
			exchange.getResponseHeaders().set("Cache-Control", "no-store");
			send(exchange, 200, MIME.getOrDefault(ext, "application/octet-stream"), Files.readAllBytes(file));
		} finally {
			exchange.close();
		}
	}

	/** 요청 본문(generateContent JSON)을 그대로 Google 로 넘기고 응답을 그대로 돌려준다. */
	private static void proxyGemini(HttpExchange exchange) throws IOException {
		try {
			String key = System.getenv("GEMINI_API_KEY");
			if (key == null || key.isEmpty()) {
				send(exchange, 503, "application/json; charset=utf-8", "{\"error\":{\"message\":\"서버에 GEMINI_API_KEY 환경 변수가 없습니다.\"}}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			String query = exchange.getRequestURI().getQuery();
			String model = "gemini-2.5-flash";
			if (query != null && query.startsWith("model=")) {
				model = query.substring("model=".length()).replaceAll("[^A-Za-z0-9._-]", "");
			}
			byte[] body = readAll(exchange.getRequestBody());

			HttpURLConnection con = (HttpURLConnection) new URL("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent").openConnection();
			con.setRequestMethod("POST");
			con.setConnectTimeout(10000);
			con.setReadTimeout(60000);
			con.setDoOutput(true);
			con.setRequestProperty("Content-Type", "application/json");
			con.setRequestProperty("x-goog-api-key", key);
			try (OutputStream out = con.getOutputStream()) {
				out.write(body);
			}
			int status = con.getResponseCode();
			InputStream in = status >= 400 ? con.getErrorStream() : con.getInputStream();
			send(exchange, status, "application/json; charset=utf-8", in == null ? new byte[0] : readAll(in));
		} finally {
			exchange.close();
		}
	}

	/* ================================================================ API 연동 (Swagger/OpenAPI 명세 받기)
	 *
	 * 브라우저는 다른 출처(포트가 다른 API 서버)의 명세 JSON 을 CORS 때문에 직접 받지 못하는 경우가 많다.
	 * 서버가 대신 받아 본문을 그대로 돌려준다(해석하지 않는다). Tomcat 은 CanvasOpenApiController 가 같은 일을 한다.
	 *   GET /canvas/fetchOpenApi.do?probe=1     → {ok:true}  (화면이 뜰 때 프록시가 있는지 확인)
	 *   GET /canvas/fetchOpenApi.do?url=<주소>   → 그 주소의 본문 (http/https 만 · 30초 · 8MB 상한 · 리다이렉트 따라감)
	 * 127.0.0.1 전용 개발 서버라 주소를 따로 제한하지 않는다. X-Requested-With 헤더는 다른 출처 페이지의 단순 요청을 막는다.
	 */
	private static final int MAX_SPEC_BYTES = 8 * 1024 * 1024;

	private static void fetchOpenApi(HttpExchange exchange) throws IOException {
		try {
			if (!"GET".equals(exchange.getRequestMethod()) || !"eX-Canvas".equals(exchange.getRequestHeaders().getFirst("X-Requested-With"))) {
				send(exchange, 403, "application/json; charset=utf-8", "{\"ok\":false,\"message\":\"forbidden\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
			if (query.containsKey("probe")) {
				send(exchange, 200, "application/json; charset=utf-8", ("{\"ok\":true,\"maxBytes\":" + MAX_SPEC_BYTES + "}").getBytes(StandardCharsets.UTF_8));
				return;
			}
			String url = query.get("url");
			if (url == null || url.trim().isEmpty()) {
				send(exchange, 400, "application/json; charset=utf-8", "{\"ok\":false,\"message\":\"url 파라미터가 없습니다.\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			url = url.trim();
			if (!url.matches("(?i)^https?://.+")) {
				send(exchange, 400, "application/json; charset=utf-8", "{\"ok\":false,\"message\":\"http/https 주소만 받을 수 있습니다.\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
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
				send(exchange, 413, "application/json; charset=utf-8", "{\"ok\":false,\"message\":\"명세가 8MB 를 넘습니다.\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			System.out.println("[fetchOpenApi] " + url + " → " + status + " (" + body.length + " bytes)");
			if (status >= 400) {
				send(exchange, status, "application/json; charset=utf-8", ("{\"ok\":false,\"message\":\"상대 서버가 HTTP " + status + " 로 답했습니다.\"}").getBytes(StandardCharsets.UTF_8));
				return;
			}
			String contentType = con.getContentType();
			if (contentType == null || contentType.isEmpty()) {
				contentType = "application/json; charset=utf-8";
			}
			send(exchange, 200, contentType, body);
		} catch (Exception e) {
			System.out.println("[fetchOpenApi] 실패 : " + e);
			send(exchange, 502, "application/json; charset=utf-8", ("{\"ok\":false,\"message\":\"" + jsonText(e.toString()) + "\"}").getBytes(StandardCharsets.UTF_8));
		} finally {
			exchange.close();
		}
	}

	/** 상한까지만 읽는다. 넘으면 null. */
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

	private static Map<String, String> parseQuery(String rawQuery) throws IOException {
		Map<String, String> out = new HashMap<>();
		if (rawQuery == null || rawQuery.isEmpty()) {
			return out;
		}
		for (String pair : rawQuery.split("&")) {
			int eq = pair.indexOf('=');
			String key = URLDecoder.decode(eq < 0 ? pair : pair.substring(0, eq), "UTF-8");
			String value = eq < 0 ? "" : URLDecoder.decode(pair.substring(eq + 1), "UTF-8");
			out.put(key, value);
		}
		return out;
	}

	/* ================================================================ 이미지로 배치 (서버 분석)
	 *
	 * 브라우저가 이미지 파일을 multipart 로 올리면 서버가 Gemini 로 분석한다(eXConverter-AI 의 업로드 방식).
	 * 분석기(com.tomatosystem.canvas.service.CanvasImageAnalyzer)는 Tomcat 컨트롤러와 같은 클래스를 쓰며,
	 * 이 파일은 단일 소스 실행(java tools/DevServer.java)이라 클래스패스에 있을 때만 리플렉션으로 부른다.
	 * dev.sh / dev.cmd 가 분석기를 target/canvas-classes 에 컴파일해 -cp 로 올린다. 없으면 503 으로 이유를 알린다.
	 */
	private static final String ANALYZER_CLASS = "com.tomatosystem.canvas.service.CanvasImageAnalyzer";

	private static Class<?> analyzerClass() {
		try {
			return Class.forName(ANALYZER_CLASS);
		} catch (ClassNotFoundException | NoClassDefFoundError e) {
			return null;
		}
	}

	private static String imageAnalyzerState() {
		Class<?> analyzer = analyzerClass();
		if (analyzer == null) {
			return "OFF (분석기 클래스 없음 — tools/dev.sh 또는 dev.cmd 로 실행하면 컴파일해 올립니다)";
		}
		try {
			boolean configured = (Boolean) analyzer.getMethod("isConfigured").invoke(null);
			String model = (String) analyzer.getMethod("model").invoke(null);
			return configured ? "ON (서버 분석 · " + model + ")" : "키 없음 (GEMINI_API_KEY 또는 -Dexcanvas.gemini.apiKey) — 브라우저 직접 호출만 가능";
		} catch (Exception e) {
			return "오류 : " + e.getMessage();
		}
	}

	private static void imageStatus(HttpExchange exchange) throws IOException {
		try {
			Class<?> analyzer = analyzerClass();
			if (analyzer == null) {
				send(exchange, 503, "application/json; charset=utf-8", "{\"ok\":false,\"configured\":false,\"message\":\"분석기 클래스가 없습니다. tools/dev.sh 로 실행하세요.\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			String json = (String) analyzer.getMethod("describeJson").invoke(null);
			send(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
		} catch (Exception e) {
			send(exchange, 500, "application/json; charset=utf-8", ("{\"ok\":false,\"message\":\"" + jsonText(e.getMessage()) + "\"}").getBytes(StandardCharsets.UTF_8));
		} finally {
			exchange.close();
		}
	}

	private static void analyzeImage(HttpExchange exchange) throws IOException {
		try {
			if (!"POST".equals(exchange.getRequestMethod()) || !"eX-Canvas".equals(exchange.getRequestHeaders().getFirst("X-Requested-With"))) {
				send(exchange, 403, "application/json; charset=utf-8", "{\"ok\":false,\"message\":\"forbidden\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			Class<?> analyzer = analyzerClass();
			if (analyzer == null) {
				send(exchange, 503, "application/json; charset=utf-8", "{\"ok\":false,\"message\":\"서버 분석기가 없습니다. tools/dev.sh(dev.cmd) 로 실행하거나 호출을 브라우저 직접 호출로 바꾸세요.\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
			if (contentType == null || !contentType.toLowerCase().startsWith("multipart/form-data")) {
				send(exchange, 400, "application/json; charset=utf-8", "{\"ok\":false,\"message\":\"multipart/form-data 로 이미지 파일을 올려야 합니다.\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			Multipart form = Multipart.parse(contentType, readAll(exchange.getRequestBody()));
			if (form.fileBytes == null || form.fileBytes.length == 0) {
				send(exchange, 400, "application/json; charset=utf-8", "{\"ok\":false,\"message\":\"이미지 파일이 없습니다.\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			try {
				String json = (String) analyzer.getMethod("analyzeJson", byte[].class, String.class, String.class, String.class, String.class, String.class)
						.invoke(null, form.fileBytes, form.fileName, form.field("memo"), form.field("pattern"), form.field("catalog"), form.field("types"));
				send(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
			} catch (java.lang.reflect.InvocationTargetException e) {
				Throwable cause = e.getCause() == null ? e : e.getCause();
				int status = cause instanceof IllegalArgumentException ? 400 : (cause.getMessage() != null && cause.getMessage().contains("API 키가 없습니다") ? 503 : 500);
				System.out.println("[이미지 배치] 분석 실패(" + status + ") : " + cause.getMessage());
				send(exchange, status, "application/json; charset=utf-8", ("{\"ok\":false,\"message\":\"" + jsonText(cause.getMessage()) + "\"}").getBytes(StandardCharsets.UTF_8));
			}
		} catch (Exception e) {
			send(exchange, 500, "application/json; charset=utf-8", ("{\"ok\":false,\"message\":\"" + jsonText(e.getMessage()) + "\"}").getBytes(StandardCharsets.UTF_8));
		} finally {
			exchange.close();
		}
	}

	private static String jsonText(String value) {
		return String.valueOf(value).replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
	}

	/** 아주 작은 multipart/form-data 해석기 : 첫 번째 파일 파트 + 문자열 필드. 서블릿 API 없이 쓴다. */
	static final class Multipart {
		byte[] fileBytes;
		String fileName = "image";
		final Map<String, String> fields = new HashMap<>();

		String field(String name) {
			return fields.get(name);
		}

		static Multipart parse(String contentType, byte[] body) {
			Multipart result = new Multipart();
			String boundary = null;
			for (String piece : contentType.split(";")) {
				String trimmed = piece.trim();
				if (trimmed.toLowerCase().startsWith("boundary=")) {
					boundary = trimmed.substring("boundary=".length()).trim();
					if (boundary.startsWith("\"") && boundary.endsWith("\"") && boundary.length() >= 2) {
						boundary = boundary.substring(1, boundary.length() - 1);
					}
				}
			}
			if (boundary == null) {
				return result;
			}
			byte[] delimiter = ("--" + boundary).getBytes(StandardCharsets.ISO_8859_1);
			int at = indexOf(body, delimiter, 0);
			while (at >= 0) {
				int partStart = at + delimiter.length;
				if (partStart + 2 <= body.length && body[partStart] == '-' && body[partStart + 1] == '-') {
					break; // 닫는 구분선
				}
				partStart += 2; // CRLF
				int next = indexOf(body, delimiter, partStart);
				if (next < 0) {
					break;
				}
				int partEnd = next - 2; // 파트 끝의 CRLF 는 내용이 아니다.
				int headerEnd = indexOf(body, "\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1), partStart);
				if (headerEnd >= 0 && headerEnd < partEnd) {
					String headers = new String(body, partStart, headerEnd - partStart, StandardCharsets.UTF_8);
					int contentStart = headerEnd + 4;
					byte[] content = java.util.Arrays.copyOfRange(body, contentStart, Math.max(contentStart, partEnd));
					String name = headerValue(headers, "name");
					String fileName = headerValue(headers, "filename");
					if (fileName != null) {
						if (result.fileBytes == null) {
							result.fileBytes = content;
							result.fileName = fileName.isEmpty() ? "image" : fileName;
						}
					} else if (name != null) {
						result.fields.put(name, new String(content, StandardCharsets.UTF_8));
					}
				}
				at = next;
			}
			return result;
		}

		private static String headerValue(String headers, String key) {
			java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?i)[;\\s]" + key + "=\"([^\"]*)\"").matcher(headers);
			return m.find() ? m.group(1) : null;
		}

		private static int indexOf(byte[] haystack, byte[] needle, int from) {
			outer:
			for (int i = Math.max(0, from); i <= haystack.length - needle.length; i++) {
				for (int j = 0; j < needle.length; j++) {
					if (haystack[i + j] != needle[j]) {
						continue outer;
					}
				}
				return i;
			}
			return -1;
		}
	}

	/** 본문 구분선 : 앞은 .clx, 뒤는 .js (GeminiProxyController 와 같은 규약) */
	private static final String SEPARATOR = "\n=====eX-Canvas-JS=====\n";

	/**
	 * 생성물을 소스 경로 아래 result/yyyyMMdd/ 에 저장한다.
	 * - 파일명은 글자·숫자·밑줄·하이픈만 남긴다(경로 문자 제거) → result 폴더 밖으로 나갈 수 없다.
	 * - 같은 이름이 있으면 덮어쓰지 않고 _HHmmss 를 붙인다.
	 * - X-Requested-With 헤더를 요구한다(다른 출처 페이지의 단순 POST 차단).
	 */
	private static void saveResult(HttpExchange exchange) throws IOException {
		try {
			boolean probe = "GET".equals(exchange.getRequestMethod());
			if (!(probe || "POST".equals(exchange.getRequestMethod())) || !"eX-Canvas".equals(exchange.getRequestHeaders().getFirst("X-Requested-With"))) {
				send(exchange, 403, "application/json; charset=utf-8", "{\"ok\":false,\"message\":\"forbidden\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			if (srcDir == null) {
				send(exchange, 503, "application/json; charset=utf-8",
						"{\"ok\":false,\"message\":\"소스 경로(clx-src)를 찾지 못했습니다. 프로젝트 루트에서 실행하거나 -Dexcanvas.src.dir 를 지정하세요.\"}".getBytes(StandardCharsets.UTF_8));
				return;
			}
			// GET 은 저장 가능 여부만 알려준다(화면 로드 때 확인용).
			if (probe) {
				String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
				String probeJson = "{\"ok\":true,\"dir\":\"" + srcDir.getFileName() + "/result/" + today + "\",\"path\":\"" + srcDir.toString().replace("\\", "\\\\") + "\"}";
				send(exchange, 200, "application/json; charset=utf-8", probeJson.getBytes(StandardCharsets.UTF_8));
				return;
			}
			String query = exchange.getRequestURI().getQuery();
			String name = query != null && query.startsWith("name=") ? URLDecoder.decode(query.substring(5), "UTF-8") : "";
			name = name.replaceAll("[^\\p{L}\\p{N}_-]", "");
			if (name.isEmpty()) {
				name = "prototype";
			}
			String body = new String(readAll(exchange.getRequestBody()), StandardCharsets.UTF_8);
			int cut = body.indexOf(SEPARATOR);
			String clx = cut < 0 ? body : body.substring(0, cut);
			String js = cut < 0 ? "" : body.substring(cut + SEPARATOR.length());

			java.time.LocalDateTime now = java.time.LocalDateTime.now();
			String date = now.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
			Path dir = srcDir.resolve("result").resolve(date);
			Files.createDirectories(dir);
			if (Files.exists(dir.resolve(name + ".clx"))) {
				name = name + "_" + now.format(java.time.format.DateTimeFormatter.ofPattern("HHmmss"));
			}
			Files.write(dir.resolve(name + ".clx"), clx.getBytes(StandardCharsets.UTF_8));
			Files.write(dir.resolve(name + ".js"), js.getBytes(StandardCharsets.UTF_8));
			System.out.println("[saveResult] " + dir.resolve(name + ".clx"));
			String json = "{\"ok\":true,\"dir\":\"" + srcDir.getFileName() + "/result/" + date + "\",\"name\":\"" + name + "\"}";
			send(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
		} finally {
			exchange.close();
		}
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

	private static void send(HttpExchange exchange, int status, String contentType, byte[] body) throws IOException {
		exchange.getResponseHeaders().set("Content-Type", contentType);
		exchange.sendResponseHeaders(status, body.length == 0 ? -1 : body.length);
		if (body.length > 0) {
			try (OutputStream out = exchange.getResponseBody()) {
				out.write(body);
			}
		}
	}

	/* ================================================================ 공유(CRDT) 릴레이
	 *
	 * 브라우저끼리 Yjs 업데이트를 주고받게만 해 주는 아주 작은 웹소켓 서버다(RFC 6455 직접 구현).
	 * 보내온 것을 해석하지 않는다 — 같은 방의 다른 사람에게 그대로 넘기고, 문서 변경만 모아 둔다.
	 *
	 *   [0] + Yjs update      : 문서. 모아 두었다가 새로 들어온 사람에게 다시 들려준다.
	 *   [1] + awareness update: 커서·선택. 모아 두지 않는다.
	 *
	 * 방(room)은 접속 주소의 ?room= 로 나뉜다(화면명). 마지막 사람이 나가면 방과 기록을 버린다.
	 * 같은 규약을 Tomcat 배포에서는 CrdtRelayEndpoint(javax.websocket) 가 맡는다.
	 */
	static final class CollabRelay {

		static final String WS_PATH = "/ws/crdt-sync.do";
		private static final String ACCEPT_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
		/** 한 번에 받는 메시지 상한(이보다 크면 끊는다) */
		private static final int MAX_MESSAGE = 8 * 1024 * 1024;
		/** 방 하나가 들고 있을 문서 기록의 상한 */
		private static final long MAX_HISTORY_BYTES = 16L * 1024 * 1024;

		final String host;
		final int port;
		private final Map<String, Room> rooms = new ConcurrentHashMap<>();
		private ServerSocket serverSocket;

		CollabRelay(String host, int port) {
			this.host = host;
			this.port = port;
		}

		void start() throws IOException {
			serverSocket = new ServerSocket();
			serverSocket.setReuseAddress(true);
			serverSocket.bind(new InetSocketAddress(host, port));
			Thread thread = new Thread(this::acceptLoop, "collab-accept");
			thread.setDaemon(true);
			thread.start();
		}

		int roomCount() {
			return rooms.size();
		}

		private void acceptLoop() {
			while (!serverSocket.isClosed()) {
				try {
					Socket socket = serverSocket.accept();
					Thread thread = new Thread(() -> serve(socket), "collab-peer");
					thread.setDaemon(true);
					thread.start();
				} catch (IOException e) {
					if (!serverSocket.isClosed()) {
						System.err.println("[collab] accept 실패 : " + e.getMessage());
					}
				}
			}
		}

		/** 손님 하나를 처음부터 끝까지 맡는다(핸드셰이크 → 이력 재생 → 중계). */
		private void serve(Socket socket) {
			Peer peer = null;
			Room room = null;
			try {
				socket.setTcpNoDelay(true);
				InputStream in = new java.io.BufferedInputStream(socket.getInputStream());
				OutputStream out = socket.getOutputStream();

				String requestLine = readLine(in);
				if (requestLine == null) {
					socket.close();
					return;
				}
				Map<String, String> headers = readHeaders(in);
				String target = requestLine.split(" ").length > 1 ? requestLine.split(" ")[1] : "";
				String path = target.contains("?") ? target.substring(0, target.indexOf('?')) : target;
				String key = headers.get("sec-websocket-key");
				if (!WS_PATH.equals(path) || key == null) {
					out.write(("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.ISO_8859_1));
					out.flush();
					socket.close();
					return;
				}
				out.write(("HTTP/1.1 101 Switching Protocols\r\n"
						+ "Upgrade: websocket\r\n"
						+ "Connection: Upgrade\r\n"
						+ "Sec-WebSocket-Accept: " + acceptKey(key) + "\r\n\r\n").getBytes(StandardCharsets.ISO_8859_1));
				out.flush();

				room = rooms.computeIfAbsent(roomOf(target), Room::new);
				peer = new Peer(socket, out);
				room.peers.add(peer);
				System.out.println("[collab] 접속 : 방 \"" + room.name + "\" (" + room.peers.size() + "명, 기록 " + room.history.size() + "건)");

				// 새로 들어온 사람에게 지금까지의 문서 변경을 그대로 들려준다(초기 동기화).
				for (byte[] past : room.history) {
					peer.send(past);
				}
				readLoop(in, peer, room);
			} catch (IOException e) {
				// 창을 닫았거나 네트워크가 끊긴 경우 — 아래 정리로 넘어간다.
			} finally {
				if (room != null && peer != null) {
					room.peers.remove(peer);
					System.out.println("[collab] 종료 : 방 \"" + room.name + "\" (" + room.peers.size() + "명)");
					if (room.peers.isEmpty()) {
						// 아무도 없으면 방을 버린다(다음 사람이 자기 캔버스로 다시 연다).
						rooms.remove(room.name);
					}
				}
				try {
					socket.close();
				} catch (IOException ignore) {
					// 이미 닫혔다.
				}
			}
		}

		/** 프레임을 읽어 메시지 하나가 완성될 때마다 같은 방의 다른 사람에게 넘긴다. */
		private void readLoop(InputStream in, Peer peer, Room room) throws IOException {
			ByteArrayOutputStream message = new ByteArrayOutputStream();
			while (true) {
				int b0 = in.read();
				if (b0 < 0) {
					return;
				}
				boolean fin = (b0 & 0x80) != 0;
				int opcode = b0 & 0x0F;
				int b1 = in.read();
				if (b1 < 0) {
					return;
				}
				boolean masked = (b1 & 0x80) != 0;
				long length = b1 & 0x7F;
				if (length == 126) {
					length = ((long) readByte(in) << 8) | readByte(in);
				} else if (length == 127) {
					length = 0;
					for (int i = 0; i < 8; i++) {
						length = (length << 8) | readByte(in);
					}
				}
				if (length > MAX_MESSAGE || message.size() + length > MAX_MESSAGE) {
					System.err.println("[collab] 메시지가 너무 큽니다(" + length + "바이트) — 연결을 끊습니다.");
					return;
				}
				byte[] mask = masked ? readFully(in, 4) : null;
				byte[] payload = readFully(in, (int) length);
				if (mask != null) {
					for (int i = 0; i < payload.length; i++) {
						payload[i] ^= mask[i % 4];
					}
				}

				if (opcode == 0x8) { // close
					return;
				}
				if (opcode == 0x9) { // ping → pong
					peer.sendFrame(0xA, payload);
					continue;
				}
				if (opcode == 0xA) { // pong
					continue;
				}
				message.write(payload);
				if (!fin) {
					continue; // 조각난 메시지는 이어 붙인다.
				}
				byte[] whole = message.toByteArray();
				message.reset();
				if (whole.length > 0) {
					relay(whole, peer, room);
				}
			}
		}

		private void relay(byte[] message, Peer from, Room room) {
			if (message[0] == 0) { // 문서 변경만 모아 둔다(커서는 모으지 않는다).
				room.remember(message, MAX_HISTORY_BYTES);
			}
			for (Peer other : room.peers) {
				if (other == from) {
					continue;
				}
				try {
					other.send(message);
				} catch (IOException e) {
					room.peers.remove(other);
					other.closeQuietly();
				}
			}
		}

		/* ---------------------------------------------------------- 잔손질 */

		private static String roomOf(String target) {
			int at = target.indexOf("room=");
			if (at < 0) {
				return "default";
			}
			String value = target.substring(at + 5);
			int end = value.indexOf('&');
			if (end >= 0) {
				value = value.substring(0, end);
			}
			try {
				value = URLDecoder.decode(value, "UTF-8");
			} catch (IOException ignore) {
				// 그대로 쓴다.
			}
			return value.isEmpty() ? "default" : value;
		}

		private static String acceptKey(String key) {
			try {
				MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
				return Base64.getEncoder().encodeToString(sha1.digest((key + ACCEPT_MAGIC).getBytes(StandardCharsets.ISO_8859_1)));
			} catch (Exception e) {
				throw new IllegalStateException(e);
			}
		}

		private static String readLine(InputStream in) throws IOException {
			ByteArrayOutputStream buffer = new ByteArrayOutputStream();
			int read;
			while ((read = in.read()) >= 0) {
				if (read == '\n') {
					break;
				}
				if (read != '\r') {
					buffer.write(read);
				}
			}
			if (read < 0 && buffer.size() == 0) {
				return null;
			}
			return new String(buffer.toByteArray(), StandardCharsets.ISO_8859_1);
		}

		private static Map<String, String> readHeaders(InputStream in) throws IOException {
			Map<String, String> headers = new HashMap<>();
			String line;
			while ((line = readLine(in)) != null && !line.isEmpty()) {
				int colon = line.indexOf(':');
				if (colon > 0) {
					headers.put(line.substring(0, colon).trim().toLowerCase(), line.substring(colon + 1).trim());
				}
			}
			return headers;
		}

		private static int readByte(InputStream in) throws IOException {
			int value = in.read();
			if (value < 0) {
				throw new IOException("연결이 끊겼습니다.");
			}
			return value;
		}

		private static byte[] readFully(InputStream in, int length) throws IOException {
			byte[] buffer = new byte[length];
			int done = 0;
			while (done < length) {
				int read = in.read(buffer, done, length - done);
				if (read < 0) {
					throw new IOException("연결이 끊겼습니다.");
				}
				done += read;
			}
			return buffer;
		}

		/** 한 방 = 붙어 있는 사람들 + 지금까지의 문서 변경 */
		static final class Room {
			final String name;
			final Set<Peer> peers = new CopyOnWriteArraySet<>();
			final List<byte[]> history = new CopyOnWriteArrayList<>();
			private long historyBytes;
			private boolean historyFull;

			Room(String name) {
				this.name = name;
			}

			synchronized void remember(byte[] message, long maxBytes) {
				if (historyFull) {
					return;
				}
				if (historyBytes + message.length > maxBytes) {
					historyFull = true;
					System.err.println("[collab] 방 \"" + name + "\" 의 기록이 한도를 넘었습니다 — 이후 들어오는 사람은 최신 상태를 못 받을 수 있습니다.");
					return;
				}
				history.add(message);
				historyBytes += message.length;
			}
		}

		/** 붙어 있는 브라우저 하나 */
		static final class Peer {
			private final Socket socket;
			private final OutputStream out;

			Peer(Socket socket, OutputStream out) {
				this.socket = socket;
				this.out = out;
			}

			void send(byte[] payload) throws IOException {
				sendFrame(0x2, payload); // 0x2 = binary
			}

			synchronized void sendFrame(int opcode, byte[] payload) throws IOException {
				List<Integer> header = new ArrayList<>();
				header.add(0x80 | opcode);
				int length = payload.length;
				if (length < 126) {
					header.add(length);
				} else if (length < 65536) {
					header.add(126);
					header.add((length >> 8) & 0xFF);
					header.add(length & 0xFF);
				} else {
					header.add(127);
					for (int i = 7; i >= 0; i--) {
						header.add((int) (((long) length >> (8 * i)) & 0xFF));
					}
				}
				byte[] bytes = new byte[header.size()];
				for (int i = 0; i < header.size(); i++) {
					bytes[i] = (byte) header.get(i).intValue();
				}
				out.write(bytes);
				out.write(payload);
				out.flush();
			}

			void closeQuietly() {
				try {
					socket.close();
				} catch (IOException ignore) {
					// 이미 닫혔다.
				}
			}
		}
	}
}
