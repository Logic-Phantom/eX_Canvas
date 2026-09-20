import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;

/**
 * eX-Canvas - 개발 서버용 빌드.
 *
 * e6-compiler(CLI)는 이 프로젝트의 `theme/custom-theme.less`(eXCFrame 테마 전체)에서 끝나지 않는다.
 * 같은 LESS 를 이클립스의 eXBuilder6 빌더는 문제없이 컴파일해 `clx-build/theme` 에 넣어 둔다.
 * 그래서 이렇게 한다.
 *
 *   1. `--exclude theme/**` 로 CLI 빌드 → 화면 · 모듈 · UDC · 우리 스타일(style/prototyper.less)까지 1분 안에 끝난다.
 *   2. eXCFrame 테마(`clx-build/theme`)를 산출물에 덮어 넣는다 → 브라우저에서 사내 스타일 그대로 보인다.
 *
 * 테마 LESS(`clx-src/theme/**`)를 고쳤다면 이클립스가 다시 빌드해야 반영된다(프로젝트 새로 고침 F5).
 * 프로토타이퍼 전용 스타일은 테마 밖(`clx-src/style/prototyper.less`)에 두어 여기서 바로 컴파일된다.
 *
 * 실행(Java 11+, 프로젝트 루트에서):
 *   java tools/BuildOnce.java [출력폴더=target/clx-dev] [메인앱=canvas/Prototyper]
 */
public class BuildOnce {

	private static final Path PROJECT = Paths.get("").toAbsolutePath().normalize();
	private static final Path COMPILER = PROJECT.resolve("ci-lib/clx/e6-compiler.jar");
	private static final Path ECLIPSE_THEME = PROJECT.resolve("clx-build/theme");

	public static void main(String[] args) throws Exception {
		Path outDir = PROJECT.resolve(args.length > 0 ? args[0] : "target/clx-dev").normalize();
		String mainApp = args.length > 1 ? args[1] : "canvas/Prototyper";

		if (!Files.isRegularFile(COMPILER)) {
			System.out.println("[오류] 컴파일러를 찾지 못했습니다 : " + COMPILER);
			System.exit(1);
		}

		ProcessBuilder builder = new ProcessBuilder("java", "-Dfile.encoding=UTF-8", "-jar", COMPILER.toString(),
				"-s", ".", "-o", outDir.toString(), "--main", mainApp, "--exclude", "theme/**");
		builder.directory(PROJECT.toFile());
		builder.redirectErrorStream(true);
		Process process = builder.start();
		try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
			String line;
			while ((line = reader.readLine()) != null) {
				System.out.println(line);
			}
		}
		int exit = process.waitFor();
		if (exit != 0) {
			System.out.println("[오류] 컴파일러가 " + exit + " 로 끝났습니다.");
			System.exit(exit);
		}

		copyTheme(outDir.resolve("theme"));
		System.out.println("빌드 완료 : " + outDir);
	}

	/** eXCFrame 테마를 이클립스 빌드 산출물에서 가져온다(CSS · 이미지 · 폰트). */
	private static void copyTheme(Path outTheme) throws IOException {
		if (!Files.isDirectory(ECLIPSE_THEME)) {
			System.out.println("[경고] " + ECLIPSE_THEME + " 가 없습니다. 사내 테마 없이 뜹니다(기본 모양).");
			System.out.println("       이클립스에서 프로젝트를 한 번 빌드하면 만들어집니다.");
			return;
		}
		int[] copied = { 0 };
		Files.walkFileTree(ECLIPSE_THEME, new SimpleFileVisitor<Path>() {
			@Override
			public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
				Path target = outTheme.resolve(ECLIPSE_THEME.relativize(file).toString());
				if (!Files.exists(target) || Files.getLastModifiedTime(target).toMillis() < attrs.lastModifiedTime().toMillis()) {
					Files.createDirectories(target.getParent());
					Files.copy(file, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES);
					copied[0]++;
				}
				return FileVisitResult.CONTINUE;
			}
		});
		System.out.println("테마(clx-build/theme) 반영 : " + copied[0] + "개 파일");
	}
}
