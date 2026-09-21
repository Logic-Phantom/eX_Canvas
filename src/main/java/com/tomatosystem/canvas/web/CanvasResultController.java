package com.tomatosystem.canvas.web;

import java.io.ByteArrayOutputStream;
import java.io.File;
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
 * 소스 경로(clx-src)를 찾는 순서 :
 *   1. JVM 옵션 -Dexcanvas.src.dir=C:/eclipse_AI/workspace/eX-Canvas/clx-src (또는 환경 변수 EXCANVAS_SRC_DIR)
 *   2. 배포 폴더에서 위로 올라가며 clx-src 가 있는 프로젝트 폴더 찾기 (프로젝트 안에서 바로 서비스하는 경우)
 *   3. 이클립스 WTP 배포 경로(…/.metadata/…/wtpwebapps/<컨텍스트>)에서 워크스페이스를 거슬러 <컨텍스트>/clx-src
 *      (프로젝트가 워크스페이스 밖에 있으면 .metadata/…/.projects/<컨텍스트>/.location 이 가리키는 폴더)
 *   4. 서버 실행 폴더(user.dir)에서 위로 올라가며 clx-src 찾기
 * 그래도 못 찾으면 503 을 돌려준다(화면은 지정한 폴더에 직접 쓰거나 브라우저 다운로드로 대체한다).
 *
 * GET 은 저장 가능 여부만 알려준다(화면이 로드될 때 확인용. 파일을 쓰지 않는다).
 *
 * 개발 도구용 기능이다. 운영 서버에는 설정하지 않는다.
 */
@Controller
public class CanvasResultController {

	/** 본문 구분선 : 앞은 .clx, 뒤는 .js (tools/DevServer.java 와 같은 규약) */
	private static final String SEPARATOR = "\n=====eX-Canvas-JS=====\n";
	private static final int MAX_BODY_BYTES = 2 * 1024 * 1024;

	/** 한 번 찾은 소스 경로는 다시 찾지 않는다. */
	private volatile Path cachedSrcDir;

	/**
	 * 저장 가능 여부 확인. 파일을 쓰지 않고 저장될 경로만 알려준다.
	 */
	@RequestMapping(value = "/canvas/saveResult.do", method = RequestMethod.GET)
	public void probe(HttpServletRequest request, HttpServletResponse response) throws IOException {
		if (!"eX-Canvas".equals(request.getHeader("X-Requested-With"))) {
			write(response, HttpServletResponse.SC_FORBIDDEN, "{\"ok\":false,\"message\":\"forbidden\"}");
			return;
		}
		Path srcDir = resolveSrcDir(request);
		if (srcDir == null) {
			write(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "{\"ok\":false,\"message\":\"" + notFoundMessage() + "\"}");
			return;
		}
		String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
		write(response, HttpServletResponse.SC_OK,
				"{\"ok\":true,\"dir\":\"" + json(srcDir.getFileName().toString() + "/result/" + date) + "\",\"path\":\"" + json(srcDir.toString()) + "\"}");
	}

	@RequestMapping(value = "/canvas/saveResult.do", method = RequestMethod.POST)
	public void save(@RequestParam(value = "name", defaultValue = "prototype") String name,
			HttpServletRequest request, HttpServletResponse response) throws IOException {

		// 다른 출처 페이지의 단순 POST 를 막는다(사용자 정의 헤더는 CORS 사전 요청을 거쳐야 한다).
		if (!"eX-Canvas".equals(request.getHeader("X-Requested-With"))) {
			write(response, HttpServletResponse.SC_FORBIDDEN, "{\"ok\":false,\"message\":\"forbidden\"}");
			return;
		}
		Path srcRoot = resolveSrcDir(request);
		if (srcRoot == null) {
			write(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "{\"ok\":false,\"message\":\"" + notFoundMessage() + "\"}");
			return;
		}
		String srcDir = srcRoot.toString();

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

		write(response, HttpServletResponse.SC_OK,
				"{\"ok\":true,\"dir\":\"" + json(srcRoot.getFileName().toString() + "/result/" + date) + "\",\"name\":\"" + json(safeName) + "\"}");
	}

	/* ================================================================ 소스 경로 찾기 */

	private Path resolveSrcDir(HttpServletRequest request) {
		Path cached = cachedSrcDir;
		if (cached != null && Files.isDirectory(cached)) {
			return cached;
		}
		Path found = findSrcDir(request);
		cachedSrcDir = found;
		return found;
	}

	private static Path findSrcDir(HttpServletRequest request) {
		// 1. 설정으로 직접 받은 경로
		String configured = System.getProperty("excanvas.src.dir");
		if (configured == null || configured.isEmpty()) {
			configured = System.getenv("EXCANVAS_SRC_DIR");
		}
		if (configured != null && !configured.isEmpty()) {
			Path path = Paths.get(configured).toAbsolutePath().normalize();
			return Files.isDirectory(path) ? path : null;
		}

		String realPath = null;
		try {
			realPath = request.getServletContext().getRealPath("/");
		} catch (RuntimeException ex) {
			realPath = null;
		}

		// 2. 배포 폴더에서 위로 올라가며 clx-src 찾기
		if (realPath != null) {
			Path found = walkUpForSrc(Paths.get(realPath));
			if (found != null) {
				return found;
			}
			// 3. 이클립스 WTP : …/.metadata/.plugins/org.eclipse.wst.server.core/tmp0/wtpwebapps/<컨텍스트>
			found = fromEclipseWorkspace(Paths.get(realPath));
			if (found != null) {
				return found;
			}
		}

		// 4. 서버 실행 폴더
		return walkUpForSrc(Paths.get(System.getProperty("user.dir", ".")));
	}

	/** 자기 자신부터 위로 8단계까지 보면서 clx-src 를 가진 폴더를 찾는다. */
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

	/**
	 * 이클립스에서 띄운 톰캣의 배포 경로를 거슬러 워크스페이스의 프로젝트 폴더를 찾는다.
	 * 배포 폴더 이름(= 웹 모듈 이름)을 프로젝트 이름으로 본다.
	 */
	private static Path fromEclipseWorkspace(Path realPath) {
		Path deployed = realPath.toAbsolutePath().normalize();
		Path projectName = deployed.getFileName();
		if (projectName == null) {
			return null;
		}
		for (Path dir = deployed; dir != null; dir = dir.getParent()) {
			Path name = dir.getFileName();
			if (name == null || !".metadata".equals(name.toString())) {
				continue;
			}
			Path workspace = dir.getParent();
			if (workspace == null) {
				return null;
			}
			Path candidate = workspace.resolve(projectName).resolve("clx-src");
			if (Files.isDirectory(candidate)) {
				return candidate.toAbsolutePath().normalize();
			}
			// 프로젝트가 워크스페이스 밖에 있으면(Import 한 경우) .metadata 의 .location 파일이 실제 위치를 가리킨다.
			candidate = importedProjectSrc(workspace, projectName.toString());
			if (candidate != null) {
				return candidate;
			}
			// 프로젝트 이름과 컨텍스트 이름이 다를 수 있다 → 워크스페이스에서 clx-src 를 가진 프로젝트가 하나면 그것.
			return onlyProjectWithSrc(workspace);
		}
		return null;
	}

	/**
	 * 워크스페이스 밖에 있는 프로젝트의 실제 폴더를 .metadata 에서 읽는다.
	 * .metadata/.plugins/org.eclipse.core.resources/.projects/&lt;프로젝트&gt;/.location 안에 "URI//file:/…" 가 들어 있다.
	 */
	private static Path importedProjectSrc(Path workspace, String projectName) {
		Path location = workspace.resolve(".metadata/.plugins/org.eclipse.core.resources/.projects").resolve(projectName).resolve(".location");
		if (!Files.isRegularFile(location)) {
			return null;
		}
		try {
			String text = new String(Files.readAllBytes(location), StandardCharsets.ISO_8859_1);
			int at = text.indexOf("URI//");
			if (at < 0) {
				return null;
			}
			int end = at + 5;
			while (end < text.length() && text.charAt(end) >= 0x20) {
				end++;
			}
			String uri = text.substring(at + 5, end);
			Path project = Paths.get(new java.net.URI(uri));
			Path candidate = project.resolve("clx-src");
			return Files.isDirectory(candidate) ? candidate.toAbsolutePath().normalize() : null;
		} catch (IOException | RuntimeException | java.net.URISyntaxException ex) {
			return null;
		}
	}

	private static Path onlyProjectWithSrc(Path workspace) {
		File[] children = workspace.toFile().listFiles();
		if (children == null) {
			return null;
		}
		Path only = null;
		for (File child : children) {
			File candidate = new File(child, "clx-src");
			if (candidate.isDirectory()) {
				if (only != null) {
					return null; // 여러 개면 고르지 않는다(설정으로 지정해야 한다).
				}
				only = candidate.toPath().toAbsolutePath().normalize();
			}
		}
		return only;
	}

	private static String notFoundMessage() {
		return "소스 경로(clx-src)를 찾지 못했습니다. 톰캣 JVM 옵션에 -Dexcanvas.src.dir=<프로젝트>/clx-src 를 추가하세요.";
	}

	private static String json(String value) {
		return value.replace("\\", "\\\\").replace("\"", "\\\"");
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
