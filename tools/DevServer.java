import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

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
 *  - 그 밖            → 빌드 폴더(e6-compiler 산출물, index.html 포함)
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

	public static void main(String[] args) throws Exception {
		final Path buildDir = Paths.get(args.length > 0 ? args[0] : "target/clx-dev").toAbsolutePath().normalize();
		final Path runtimeDir = Paths.get("exbuilder/runtime").toAbsolutePath().normalize();
		int port = args.length > 1 ? Integer.parseInt(args[1]) : 8090;
		srcDir = findSrcDir(buildDir);

		ensureIndexHtml(buildDir, args.length > 2 ? args[2] : "canvas/Prototyper");

		HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
		server.createContext("/ai/gemini.do", DevServer::proxyGemini);
		server.createContext("/canvas/saveResult.do", DevServer::saveResult);
		server.createContext("/runtime/", exchange -> serveFile(exchange, runtimeDir, exchange.getRequestURI().getPath().substring("/runtime/".length())));
		server.createContext("/", exchange -> {
			String path = exchange.getRequestURI().getPath();
			serveFile(exchange, buildDir, path.equals("/") ? "index.html" : path.substring(1));
		});
		server.start();
		System.out.println("eX-Canvas dev server : http://127.0.0.1:" + port + "/  (build: " + buildDir + ")");
		System.out.println("Gemini proxy        : " + (System.getenv("GEMINI_API_KEY") == null ? "OFF (GEMINI_API_KEY 미설정)" : "ON"));
		System.out.println("result 저장         : " + (srcDir == null ? "OFF (clx-src 를 찾지 못했습니다 → 브라우저 다운로드로 대체)" : srcDir.resolve("result") + "\\<yyyyMMdd>"));
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
}
