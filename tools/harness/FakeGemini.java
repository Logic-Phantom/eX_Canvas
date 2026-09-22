import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * 가짜 Gemini 서버 — API 키 없이 "이미지로 배치" 의 서버 경로(업로드 → CanvasImageAnalyzer → 배치)를 확인하는 도구.
 * 이클립스 빌드 대상이 아니다(tools/ 아래). eXConverter-AI 의 GeminiStreamHarness 와 같은 용도.
 *
 *   POST …/models/<model>:generateContent 에 미리 정한 계획(JSON 파일)을 candidates 응답으로 돌려준다.
 *   요청에 thinkingLevel 이 있으면 400("Thinking level is not supported")을 내서 분석기의 자동 재요청 경로도 확인한다.
 *   콘솔에 요청마다 키 헤더 · inline_data · responseSchema · thinkingLevel · 카탈로그/유형 전달 여부를 찍는다.
 *
 * 사용(프로젝트 루트, 터미널 2개):
 *   java tools/harness/FakeGemini.java 18436 tools/harness/sample-image-plan.json
 *   EXCANVAS_JAVA_OPTS="-Dexcanvas.gemini.apiKey=fake -Dexcanvas.gemini.url=http://127.0.0.1:18436" sh tools/dev.sh
 *   → 브라우저 http://127.0.0.1:8090/ 에서 아무 이미지나 캔버스에 놓으면 sample-image-plan.json 대로 배치된다(P3-2).
 *   서버 없이 엔드포인트만 보려면:
 *   curl -H "X-Requested-With: eX-Canvas" -F image=@아무이미지.png -F pattern=auto http://127.0.0.1:8090/canvas/analyzeImage.do
 */
public class FakeGemini {
	public static void main(String[] args) throws Exception {
		int port = Integer.parseInt(args[0]);
		String planJson = new String(Files.readAllBytes(Paths.get(args[1])), StandardCharsets.UTF_8);
		HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
		server.createContext("/", exchange -> {
			byte[] body = exchange.getRequestBody().readAllBytes();
			String text = new String(body, StandardCharsets.UTF_8);
			System.out.println("[fake] " + exchange.getRequestMethod() + " " + exchange.getRequestURI() + " key=" + exchange.getRequestHeaders().getFirst("x-goog-api-key")
				+ " bytes=" + body.length + " inline_data=" + text.contains("inline_data") + " schema=" + text.contains("responseSchema") + " thinking=" + text.contains("thinkingLevel")
				+ " catalog=" + text.contains("[템플릿 카탈로그]") + " types=" + text.contains("uicontrolshell"));
			byte[] out;
			int status;
			if (text.contains("thinkingLevel")) {
				status = 400;
				out = "{\"error\":{\"code\":400,\"message\":\"Thinking level is not supported for this model.\",\"status\":\"INVALID_ARGUMENT\"}}".getBytes(StandardCharsets.UTF_8);
			} else {
				status = 200;
				String escaped = planJson.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
				// 일부러 코드 펜스를 붙여 분석기가 벗기는지도 본다.
				out = ("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"```json\\n" + escaped + "\\n```\"}],\"role\":\"model\"},\"finishReason\":\"STOP\"}],\"usageMetadata\":{\"promptTokenCount\":1234,\"candidatesTokenCount\":321,\"totalTokenCount\":1555},\"modelVersion\":\"fake-flash\"}").getBytes(StandardCharsets.UTF_8);
			}
			exchange.getResponseHeaders().set("Content-Type", "application/json");
			exchange.sendResponseHeaders(status, out.length);
			exchange.getResponseBody().write(out);
			exchange.close();
		});
		server.start();
		System.out.println("fake gemini on " + port + " (plan: " + args[1] + ")");
	}
}
