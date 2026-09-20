import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * eX-Canvas - 카탈로그 동기화 도구.
 *
 * 프로토타이퍼 팔레트가 보는 목록 세 가지를 한곳에서 다시 만들고, 지난번과 달라진 점을 알려 준다.
 *   ① UI 템플릿 : eXBuilder6 스튜디오의 "상용구"(canned-templates.xmi) → 컨트롤 트리
 *   ② UDC       : clx-src/udc/**.clx
 *   ③ 화면 템플릿 : templates/**.clx (P0~P8 · popup)
 *
 * 실행(Java 11+, 프로젝트 루트에서):
 *   java tools/SyncCatalog.java [canned-templates.xmi 경로]
 * 경로를 주지 않으면 -Dexcanvas.canned.xmi → 환경 변수 EXCANVAS_CANNED_XMI → 아래 기본 후보 순으로 찾는다.
 *
 * 만드는 것:
 *   clx-src/module/canvas/uiTemplateCatalog.module.js  (자동 생성 · 손으로 고치지 말 것)
 *   docs/catalog.md                                    (사람이 읽는 목록 + 변경 이력)
 *   tools/catalog-index.txt                            (변경 감지용 지문)
 */
public class SyncCatalog {

	/**
	 * canned-templates.xmi 를 찾을 기본 후보(워크스페이스가 다른 경우 인자로 직접 준다).
	 * 이 프로젝트의 `.settings` 에 복사본을 두면 다른 워크스페이스가 없어도 카탈로그를 만들 수 있다.
	 */
	private static final String[] XMI_CANDIDATES = {
		".settings/canned-templates.xmi",
		"C:/eclipse-jee-2025-03-R-win32-x86_64/workspace/eXCFrame-ui/.settings/canned-templates.xmi",
		"../eXCFrame-ui/.settings/canned-templates.xmi",
		"../../eXCFrame-ui/.settings/canned-templates.xmi"
	};

	private static final Path PROJECT = Paths.get("").toAbsolutePath().normalize();
	private static final Path OUT_MODULE = PROJECT.resolve("clx-src/module/canvas/uiTemplateCatalog.module.js");
	private static final Path OUT_DOC = PROJECT.resolve("docs/catalog.md");
	private static final Path OUT_INDEX = PROJECT.resolve("tools/catalog-index.txt");

	public static void main(String[] args) throws Exception {
		Path xmi = findXmi(args.length > 0 ? args[0] : null);
		List<Tpl> templates = xmi == null ? new ArrayList<>() : readCannedTemplates(xmi);
		List<String[]> udcs = scanUdc();
		List<String[]> screens = scanScreenTemplates();

		if (xmi == null) {
			System.out.println("[경고] canned-templates.xmi 를 찾지 못했습니다. UI 템플릿은 건너뜁니다.");
			System.out.println("       경로를 인자로 주세요 : java tools/SyncCatalog.java <canned-templates.xmi>");
			if (Files.exists(OUT_MODULE)) {
				System.out.println("       기존 카탈로그를 그대로 둡니다 : " + OUT_MODULE);
				return;
			}
		}

		Map<String, String> index = buildIndex(templates, udcs, screens);
		Map<String, String> previous = readIndex();
		Diff diff = diff(previous, index);

		writeModule(xmi, templates);
		writeDoc(xmi, templates, udcs, screens, diff);
		writeIndex(index);

		System.out.println("UI 템플릿 " + templates.size() + "개 · UDC " + udcs.size() + "개 · 화면 템플릿 " + screens.size() + "개");
		System.out.println("  → " + rel(OUT_MODULE));
		System.out.println("  → " + rel(OUT_DOC));
		if (previous.isEmpty()) {
			System.out.println("변경 감지 : 첫 실행(기준 지문을 새로 만들었습니다).");
		} else if (diff.isEmpty()) {
			System.out.println("변경 감지 : 달라진 것 없음.");
		} else {
			System.out.println("변경 감지 : 추가 " + diff.added.size() + " · 삭제 " + diff.removed.size() + " · 수정 " + diff.changed.size());
			diff.added.forEach(s -> System.out.println("  + " + s));
			diff.removed.forEach(s -> System.out.println("  - " + s));
			diff.changed.forEach(s -> System.out.println("  ~ " + s));
			System.out.println("빌드를 다시 하면 팔레트에 반영됩니다 : tools\\dev.cmd");
		}
	}

	/* ================================================================ 입력 찾기 */

	private static Path findXmi(String given) {
		List<String> candidates = new ArrayList<>();
		if (given != null && !given.isEmpty()) {
			candidates.add(given);
		}
		String prop = System.getProperty("excanvas.canned.xmi");
		if (prop == null || prop.isEmpty()) {
			prop = System.getenv("EXCANVAS_CANNED_XMI");
		}
		if (prop != null && !prop.isEmpty()) {
			candidates.add(prop);
		}
		candidates.addAll(Arrays.asList(XMI_CANDIDATES));
		for (String candidate : candidates) {
			Path path = Paths.get(candidate);
			if (!path.isAbsolute()) {
				path = PROJECT.resolve(candidate);
			}
			path = path.toAbsolutePath().normalize();
			if (Files.isRegularFile(path)) {
				System.out.println("상용구 파일 : " + path);
				return path;
			}
		}
		return null;
	}

	/* ================================================================ XMI → 컨트롤 트리 */

	/** 상용구 한 건. */
	private static final class Tpl {
		String uuid;
		String name;      // "[버튼] 조회 버튼"
		String group;     // "버튼"
		String label;     // "조회 버튼"
		String desc;
		String revision;
		int width;
		int height;
		Nd node;
	}

	/** 컨트롤 한 개(CLX 속성명으로 이미 바꿔 둔 상태). */
	private static final class Nd {
		String type;                                       // output · group · button · udc · tabitem …
		String cls;
		String id;
		Map<String, String> props = new LinkedHashMap<>(); // CLX 속성명 → 값
		Map<String, String> layout;                        // {kind:form|flow|vertical, …}
		List<Map<String, String>> rows;                    // formlayout 전용
		List<Map<String, String>> columns;
		Map<String, String> layoutData;                    // {kind:form|flow|vertical, …}
		List<Map<String, String>> items;                   // 콤보·체크박스그룹·라디오버튼의 고정 아이템
		int gridCols;                                      // 그리드 컬럼 수(밴드는 표준 1행으로 다시 만든다)
		List<Nd> children = new ArrayList<>();
	}

	/** XMI 의 xsi:type → CLX 태그 키(clxSerializer.TAG_INFO 와 같은 키). */
	private static final Map<String, String> TYPE_MAP = new HashMap<>();
	static {
		TYPE_MAP.put("UserDefinedControl", "udc");
		TYPE_MAP.put("Img", "img");
		TYPE_MAP.put("HtmlSnippet", "htmlsnippet");
	}

	/** XMI 속성명 → CLX 속성명. 없는 것은 소문자로 바꾼다. */
	private static final Map<String, String> ATTR_MAP = new HashMap<>();
	static {
		ATTR_MAP.put("autoSize", "autosize");
		ATTR_MAP.put("maxLength", "maxlength");
		ATTR_MAP.put("inputFilter", "inputfilter");
		ATTR_MAP.put("dataType", "datatype");
		ATTR_MAP.put("displayExp", "displayexp");
		ATTR_MAP.put("allowNewLine", "allownewline");
		ATTR_MAP.put("horizontalAlign", "halign");
		ATTR_MAP.put("verticalAlign", "valign");
		ATTR_MAP.put("ignoreLayoutSpacing", "ignore-layout-spacing");
		ATTR_MAP.put("rowSpan", "rowspan");
		ATTR_MAP.put("colSpan", "colspan");
		ATTR_MAP.put("shadeType", "shadetype");
		ATTR_MAP.put("shadeColor", "shadecolor");
		ATTR_MAP.put("minLength", "minlength");
		ATTR_MAP.put("synchronizeMinLength", "syncminlength");
		ATTR_MAP.put("autoSizing", "autoSizing");   // CLX 도 이 하나만 카멜표기다
		ATTR_MAP.put("colCount", "colcount");
		ATTR_MAP.put("fixedWidth", "fixedwidth");
		ATTR_MAP.put("minHeight", "minheight");
		ATTR_MAP.put("calendarType", "calendartype");
		ATTR_MAP.put("headerArrowVisible", "headerarrowvisible");
		ATTR_MAP.put("horizontalSeparatorWidth", "hseparatorwidth");
		ATTR_MAP.put("horizontalSeparatorType", "hseparatortype");
		ATTR_MAP.put("verticalSeparatorWidth", "vseparatorwidth");
		ATTR_MAP.put("verticalSeparatorType", "vseparatortype");
		ATTR_MAP.put("iconAlign", "iconalign");
	}

	/**
	 * 컨트롤로 옮기지 않는 속성.
	 *  - 상용구 자체의 정보(uuid · preferredWidth …)
	 *  - 스튜디오 디자이너 전용이라 CLX 에 없는 것(fieldLabel) — 넣으면 컴파일이 "Feature not found" 로 막는다.
	 */
	private static final Set<String> SKIP_ATTR = new LinkedHashSet<>(Arrays.asList(
			"sid", "uuid", "version", "preferredWidth", "preferredHeight", "revision", "name", "description",
			"fieldLabel"));

	private static List<Tpl> readCannedTemplates(Path xmi) throws Exception {
		DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
		factory.setNamespaceAware(false); // 접두어가 붙은 이름 그대로 다룬다(xsi:type 등).
		Document doc;
		try (InputStream in = Files.newInputStream(xmi)) {
			doc = factory.newDocumentBuilder().parse(in);
		}
		List<Tpl> result = new ArrayList<>();
		NodeList list = doc.getElementsByTagName("settings:CannedTemplate");
		for (int i = 0; i < list.getLength(); i++) {
			Element el = (Element) list.item(i);
			Element control = firstChild(el, "control");
			if (control == null) {
				continue;
			}
			Tpl tpl = new Tpl();
			tpl.uuid = el.getAttribute("uuid");
			tpl.name = el.getAttribute("name");
			tpl.desc = el.getAttribute("description");
			tpl.revision = el.getAttribute("revision");
			tpl.width = intOf(el.getAttribute("preferredWidth"), 160);
			tpl.height = intOf(el.getAttribute("preferredHeight"), 26);
			splitName(tpl);
			tpl.node = toNode(control);
			result.add(tpl);
		}
		result.sort(Comparator.comparing((Tpl t) -> t.group).thenComparing(t -> t.label));
		return result;
	}

	/** "[버튼] 조회 버튼" → group=버튼, label=조회 버튼 */
	private static void splitName(Tpl tpl) {
		String name = tpl.name == null ? "" : tpl.name.trim();
		if (name.startsWith("[")) {
			int close = name.indexOf(']');
			if (close > 0) {
				tpl.group = name.substring(1, close).trim();
				tpl.label = name.substring(close + 1).trim();
				return;
			}
		}
		tpl.group = "기타";
		tpl.label = name;
	}

	private static Nd toNode(Element el) {
		Nd node = new Nd();
		node.type = clxType(el.getAttribute("xsi:type"), el.getTagName());
		NamedNodeMap attrs = el.getAttributes();
		for (int i = 0; i < attrs.getLength(); i++) {
			Node attr = attrs.item(i);
			String name = attr.getNodeName();
			if (name.startsWith("xsi:") || name.startsWith("xmi:") || SKIP_ATTR.contains(name)) {
				continue;
			}
			String value = attr.getNodeValue();
			if ("class".equals(name)) {
				node.cls = value;
			} else if ("id".equals(name)) {
				node.id = value;
			} else {
				node.props.put(clxAttr(name), value);
			}
		}
		for (Element child : childElements(el)) {
			String tag = child.getTagName();
			if ("layoutData".equals(tag)) {
				node.layoutData = toLayoutData(child);
			} else if ("layout".equals(tag)) {
				fillLayout(node, child);
			} else if ("controls".equals(tag) || "content".equals(tag)) {
				node.children.add(toNode(child));
			} else if ("tabItems".equals(tag)) {
				node.children.add(toTabItem(child));
			} else if ("items".equals(tag)) {
				if (node.items == null) {
					node.items = new ArrayList<>();
				}
				Map<String, String> item = new LinkedHashMap<>();
				item.put("label", child.getAttribute("label"));
				item.put("value", child.getAttribute("value"));
				node.items.add(item);
			} else if ("gridColumns".equals(tag)) {
				node.gridCols++;
			}
			// 그 밖(metaData · itemStyle · binders · gridHeader/gridDetail · userAttributes)은 초안에 옮기지 않는다.
			// 그리드 밴드는 컬럼 수만 보고 표준 1행 머리글/본문으로 다시 만든다.
		}
		return node;
	}

	private static Nd toTabItem(Element el) {
		Nd item = new Nd();
		item.type = "tabitem";
		if (!el.getAttribute("text").isEmpty()) {
			item.props.put("text", el.getAttribute("text"));
		}
		if ("true".equals(el.getAttribute("selected"))) {
			item.props.put("selected", "true");
		}
		Element content = firstChild(el, "content");
		if (content != null) {
			item.children.add(toNode(content));
		}
		return item;
	}

	private static Map<String, String> toLayoutData(Element el) {
		Map<String, String> data = new LinkedHashMap<>();
		data.put("kind", layoutKind(el.getAttribute("xsi:type")));
		NamedNodeMap attrs = el.getAttributes();
		for (int i = 0; i < attrs.getLength(); i++) {
			Node attr = attrs.item(i);
			String name = attr.getNodeName();
			if (name.startsWith("xsi:") || "sid".equals(name)) {
				continue;
			}
			// FormData 의 rowIndex/colIndex 는 CLX 에서 row/col 이다.
			if ("rowIndex".equals(name)) {
				data.put("row", attr.getNodeValue());
			} else if ("colIndex".equals(name)) {
				data.put("col", attr.getNodeValue());
			} else {
				data.put(clxAttr(name), attr.getNodeValue());
			}
		}
		return data;
	}

	private static void fillLayout(Nd node, Element el) {
		String kind = layoutKind(el.getAttribute("xsi:type"));
		Map<String, String> layout = new LinkedHashMap<>();
		layout.put("kind", kind);
		NamedNodeMap attrs = el.getAttributes();
		for (int i = 0; i < attrs.getLength(); i++) {
			Node attr = attrs.item(i);
			String name = attr.getNodeName();
			if (name.startsWith("xsi:") || "sid".equals(name)) {
				continue;
			}
			layout.put(layoutAttr(kind, name), attr.getNodeValue());
		}
		node.layout = layout;
		for (Element child : childElements(el)) {
			Map<String, String> track = new LinkedHashMap<>();
			NamedNodeMap trackAttrs = child.getAttributes();
			for (int i = 0; i < trackAttrs.getLength(); i++) {
				Node attr = trackAttrs.item(i);
				if ("sid".equals(attr.getNodeName())) {
					continue;
				}
				track.put(clxAttr(attr.getNodeName()), attr.getNodeValue());
			}
			if ("rows".equals(child.getTagName())) {
				if (node.rows == null) {
					node.rows = new ArrayList<>();
				}
				node.rows.add(track);
			} else if ("columns".equals(child.getTagName())) {
				if (node.columns == null) {
					node.columns = new ArrayList<>();
				}
				node.columns.add(track);
			}
		}
	}

	private static String clxType(String xsiType, String fallbackTag) {
		String name = xsiType == null ? "" : xsiType;
		int colon = name.indexOf(':');
		if (colon >= 0) {
			name = name.substring(colon + 1);
		}
		if (name.isEmpty()) {
			name = fallbackTag;
		}
		String mapped = TYPE_MAP.get(name);
		return mapped != null ? mapped : name.toLowerCase();
	}

	private static String layoutKind(String xsiType) {
		String name = clxType(xsiType, "");
		if (name.startsWith("form")) {
			return "form";
		}
		if (name.startsWith("flow")) {
			return "flow";
		}
		if (name.startsWith("vertical")) {
			return "vertical";
		}
		if (name.startsWith("xy")) {
			return "xy";
		}
		return name;
	}

	private static String clxAttr(String name) {
		String mapped = ATTR_MAP.get(name);
		return mapped != null ? mapped : name.toLowerCase();
	}

	/**
	 * 여백·간격 속성은 레이아웃마다 CLX 이름이 다르다.
	 *   formlayout   : hspace · vspace · top-margin …
	 *   flow/vertical: hspacing · vspacing · topmargin …
	 */
	private static String layoutAttr(String kind, String name) {
		boolean form = "form".equals(kind);
		switch (name) {
		case "horizontalSpacing":
			return form ? "hspace" : "hspacing";
		case "verticalSpacing":
			return form ? "vspace" : "vspacing";
		case "topMargin":
			return form ? "top-margin" : "topmargin";
		case "rightMargin":
			return form ? "right-margin" : "rightmargin";
		case "bottomMargin":
			return form ? "bottom-margin" : "bottommargin";
		case "leftMargin":
			return form ? "left-margin" : "leftmargin";
		default:
			return clxAttr(name);
		}
	}

	/* ================================================================ UDC · 화면 템플릿 훑기 */

	private static List<String[]> scanUdc() throws IOException {
		Path root = PROJECT.resolve("clx-src/udc");
		List<String[]> result = new ArrayList<>();
		if (!Files.isDirectory(root)) {
			return result;
		}
		try (java.util.stream.Stream<Path> walk = Files.walk(root)) {
			for (Path path : walk.filter(p -> p.toString().endsWith(".clx")).sorted().collect(Collectors.toList())) {
				String relative = root.relativize(path).toString().replace('\\', '/');
				String type = "udc." + relative.substring(0, relative.length() - 4).replace('/', '.');
				result.add(new String[] { type, relative });
			}
		}
		return result;
	}

	private static List<String[]> scanScreenTemplates() throws IOException {
		Path root = PROJECT.resolve("templates");
		List<String[]> result = new ArrayList<>();
		if (!Files.isDirectory(root)) {
			return result;
		}
		try (java.util.stream.Stream<Path> walk = Files.walk(root)) {
			for (Path path : walk.filter(p -> p.toString().endsWith(".clx")).sorted().collect(Collectors.toList())) {
				String relative = root.relativize(path).toString().replace('\\', '/');
				String name = path.getFileName().toString();
				name = name.substring(0, name.length() - 4);
				result.add(new String[] { name, relative });
			}
		}
		return result;
	}

	/* ================================================================ 변경 감지 */

	private static final class Diff {
		List<String> added = new ArrayList<>();
		List<String> removed = new ArrayList<>();
		List<String> changed = new ArrayList<>();

		boolean isEmpty() {
			return added.isEmpty() && removed.isEmpty() && changed.isEmpty();
		}
	}

	/** 항목 키 → 내용 지문. 키는 사람이 읽을 수 있게 만든다(변경 보고에 그대로 쓴다). */
	private static Map<String, String> buildIndex(List<Tpl> templates, List<String[]> udcs, List<String[]> screens) {
		Map<String, String> index = new TreeMap<>();
		for (Tpl tpl : templates) {
			index.put("uitpl\t" + tpl.name, sha1(tpl.uuid + "|" + tpl.revision + "|" + tpl.desc + "|" + nodeSignature(tpl.node)));
		}
		for (String[] udc : udcs) {
			index.put("udc\t" + udc[0], sha1(udc[1]));
		}
		for (String[] screen : screens) {
			index.put("screen\t" + screen[0], sha1(screen[1]));
		}
		return index;
	}

	private static String nodeSignature(Nd node) {
		StringBuilder sb = new StringBuilder();
		appendSignature(sb, node);
		return sb.toString();
	}

	private static void appendSignature(StringBuilder sb, Nd node) {
		sb.append(node.type).append('/').append(node.cls).append('/').append(node.id).append('/').append(node.props);
		sb.append('/').append(node.layout).append('/').append(node.rows).append('/').append(node.columns).append('/').append(node.layoutData);
		sb.append('/').append(node.items).append('/').append(node.gridCols);
		sb.append('(');
		for (Nd child : node.children) {
			appendSignature(sb, child);
			sb.append(',');
		}
		sb.append(')');
	}

	private static Map<String, String> readIndex() throws IOException {
		Map<String, String> index = new TreeMap<>();
		if (!Files.isRegularFile(OUT_INDEX)) {
			return index;
		}
		for (String line : Files.readAllLines(OUT_INDEX, StandardCharsets.UTF_8)) {
			if (line.isEmpty() || line.startsWith("#")) {
				continue;
			}
			int tab = line.lastIndexOf('\t');
			if (tab > 0) {
				index.put(line.substring(0, tab), line.substring(tab + 1));
			}
		}
		return index;
	}

	private static void writeIndex(Map<String, String> index) throws IOException {
		StringBuilder sb = new StringBuilder("# eX-Canvas 카탈로그 지문 - tools/SyncCatalog.java 가 만든다(변경 감지용).\n");
		index.forEach((key, value) -> sb.append(key).append('\t').append(value).append('\n'));
		write(OUT_INDEX, sb.toString());
	}

	private static Diff diff(Map<String, String> previous, Map<String, String> current) {
		Diff diff = new Diff();
		if (previous.isEmpty()) {
			return diff;
		}
		current.forEach((key, value) -> {
			String old = previous.get(key);
			if (old == null) {
				diff.added.add(label(key));
			} else if (!old.equals(value)) {
				diff.changed.add(label(key));
			}
		});
		previous.keySet().stream().filter(key -> !current.containsKey(key)).forEach(key -> diff.removed.add(label(key)));
		return diff;
	}

	private static String label(String key) {
		String[] parts = key.split("\t", 2);
		String kind = parts[0];
		String name = parts.length > 1 ? parts[1] : "";
		if ("uitpl".equals(kind)) {
			return "UI 템플릿 " + name;
		}
		if ("udc".equals(kind)) {
			return "UDC " + name;
		}
		return "화면 템플릿 " + name;
	}

	/* ================================================================ 생성물 쓰기 */

	private static void writeModule(Path xmi, List<Tpl> templates) throws IOException {
		StringBuilder sb = new StringBuilder();
		sb.append("/************************************************\n");
		sb.append(" * uiTemplateCatalog.module.js\n");
		sb.append(" *\n");
		sb.append(" * !! 자동 생성 파일 - 손으로 고치지 말 것 !!\n");
		sb.append(" * 만드는 도구 : tools/SyncCatalog.java  (실행 : java tools\\SyncCatalog.java)\n");
		sb.append(" * 원본        : eXBuilder6 스튜디오 상용구(canned-templates.xmi)\n");
		sb.append(" *\n");
		sb.append(" * 항목 하나 = { uuid, name, group, label, desc, width, height, node }\n");
		sb.append(" * node      = { type, cls, id, props, layout, rows, columns, ld, children }\n");
		sb.append(" *   type    : CLX 태그 키(clxSerializer.TAG_INFO 와 같다). tabitem 은 탭 한 칸.\n");
		sb.append(" *   props   : CLX 속성명 그대로. ld = 부모 레이아웃에 붙는 데이터.\n");
		sb.append(" ************************************************/\n\n");
		sb.append("exports.GENERATED_AT = ").append(js(now())).append(";\n");
		sb.append("exports.SOURCE = ").append(js(xmi == null ? "" : xmi.toString())).append(";\n\n");

		List<String> groups = templates.stream().map(t -> t.group).distinct().collect(Collectors.toList());
		sb.append("/** 팔레트에서 쓰는 묶음 순서 */\n");
		sb.append("exports.GROUPS = [").append(groups.stream().map(SyncCatalog::js).collect(Collectors.joining(", "))).append("];\n\n");

		sb.append("exports.TEMPLATES = [\n");
		for (int i = 0; i < templates.size(); i++) {
			Tpl tpl = templates.get(i);
			sb.append("\t{\n");
			sb.append("\t\tuuid : ").append(js(tpl.uuid)).append(",\n");
			sb.append("\t\tname : ").append(js(tpl.name)).append(",\n");
			sb.append("\t\tgroup : ").append(js(tpl.group)).append(",\n");
			sb.append("\t\tlabel : ").append(js(tpl.label)).append(",\n");
			sb.append("\t\tdesc : ").append(js(tpl.desc)).append(",\n");
			sb.append("\t\twidth : ").append(tpl.width).append(",\n");
			sb.append("\t\theight : ").append(tpl.height).append(",\n");
			sb.append("\t\tnode : ");
			appendNode(sb, tpl.node, 2);
			sb.append("\n\t}").append(i < templates.size() - 1 ? "," : "").append("\n");
		}
		sb.append("];\n");
		write(OUT_MODULE, sb.toString());
	}

	private static void appendNode(StringBuilder sb, Nd node, int depth) {
		String pad = "\t".repeat(depth);
		String inner = "\t".repeat(depth + 1);
		sb.append("{\n");
		sb.append(inner).append("type : ").append(js(node.type));
		if (node.cls != null) {
			sb.append(",\n").append(inner).append("cls : ").append(js(node.cls));
		}
		if (node.id != null) {
			sb.append(",\n").append(inner).append("id : ").append(js(node.id));
		}
		if (!node.props.isEmpty()) {
			sb.append(",\n").append(inner).append("props : ").append(map(node.props));
		}
		if (node.layout != null) {
			sb.append(",\n").append(inner).append("layout : ").append(map(node.layout));
		}
		if (node.rows != null) {
			sb.append(",\n").append(inner).append("rows : ").append(mapList(node.rows));
		}
		if (node.columns != null) {
			sb.append(",\n").append(inner).append("columns : ").append(mapList(node.columns));
		}
		if (node.layoutData != null) {
			sb.append(",\n").append(inner).append("ld : ").append(map(node.layoutData));
		}
		if (node.items != null) {
			sb.append(",\n").append(inner).append("items : ").append(mapList(node.items));
		}
		if (node.gridCols > 0) {
			sb.append(",\n").append(inner).append("gridCols : ").append(node.gridCols);
		}
		if (!node.children.isEmpty()) {
			sb.append(",\n").append(inner).append("children : [");
			for (int i = 0; i < node.children.size(); i++) {
				sb.append(i == 0 ? "\n" : ",\n").append(inner).append('\t');
				appendNode(sb, node.children.get(i), depth + 2);
			}
			sb.append("\n").append(inner).append("]");
		}
		sb.append("\n").append(pad).append("}");
	}

	private static String map(Map<String, String> values) {
		return "{ " + values.entrySet().stream()
				.map(e -> js(e.getKey()) + " : " + js(e.getValue()))
				.collect(Collectors.joining(", ")) + " }";
	}

	private static String mapList(List<Map<String, String>> values) {
		return "[" + values.stream().map(SyncCatalog::map).collect(Collectors.joining(", ")) + "]";
	}

	private static void writeDoc(Path xmi, List<Tpl> templates, List<String[]> udcs, List<String[]> screens, Diff diff) throws IOException {
		StringBuilder sb = new StringBuilder();
		sb.append("# eX-Canvas 카탈로그\n\n");
		sb.append("`tools/SyncCatalog.java` 가 만드는 목록입니다(손으로 고치면 다음 실행에 지워집니다).\n");
		sb.append("갱신 : `java tools\\SyncCatalog.java` · `tools\\dev.cmd` 는 빌드 전에 자동으로 돌립니다.\n\n");
		sb.append("| 항목 | 개수 | 원본 |\n|---|---|---|\n");
		sb.append("| UI 템플릿 | ").append(templates.size()).append(" | ").append(xmi == null ? "(없음)" : "`" + xmi + "`").append(" |\n");
		sb.append("| UDC | ").append(udcs.size()).append(" | `clx-src/udc/**` |\n");
		sb.append("| 화면 템플릿 | ").append(screens.size()).append(" | `templates/**` |\n\n");
		sb.append("마지막 갱신 : ").append(now()).append("\n\n");

		if (!diff.isEmpty()) {
			sb.append("## 지난 실행 대비 변경\n\n");
			diff.added.forEach(s -> sb.append("- 추가 : ").append(s).append('\n'));
			diff.removed.forEach(s -> sb.append("- 삭제 : ").append(s).append('\n'));
			diff.changed.forEach(s -> sb.append("- 수정 : ").append(s).append('\n'));
			sb.append('\n');
		}

		sb.append("## UI 템플릿 (팔레트 \"UI 템플릿\" 묶음)\n\n");
		String group = null;
		for (Tpl tpl : templates) {
			if (!tpl.group.equals(group)) {
				group = tpl.group;
				sb.append("\n### ").append(group).append("\n\n| 이름 | 설명 | 크기 |\n|---|---|---|\n");
			}
			sb.append("| ").append(tpl.label).append(" | ").append(tpl.desc.isEmpty() ? "-" : tpl.desc.replace("|", "\\|"))
					.append(" | ").append(tpl.width).append("×").append(tpl.height).append(" |\n");
		}

		sb.append("\n## UDC\n\n");
		for (String[] udc : udcs) {
			sb.append("- `").append(udc[0]).append("` — `clx-src/udc/").append(udc[1]).append("`\n");
		}

		sb.append("\n## 화면 템플릿\n\n");
		for (String[] screen : screens) {
			sb.append("- ").append(screen[0]).append(" — `templates/").append(screen[1]).append("`\n");
		}
		write(OUT_DOC, sb.toString());
	}

	/* ================================================================ 잡일 */

	private static List<Element> childElements(Element parent) {
		List<Element> result = new ArrayList<>();
		NodeList children = parent.getChildNodes();
		for (int i = 0; i < children.getLength(); i++) {
			if (children.item(i) instanceof Element) {
				result.add((Element) children.item(i));
			}
		}
		return result;
	}

	private static Element firstChild(Element parent, String tag) {
		for (Element child : childElements(parent)) {
			if (child.getTagName().equals(tag)) {
				return child;
			}
		}
		return null;
	}

	private static int intOf(String value, int fallback) {
		try {
			return (int) Math.round(Double.parseDouble(value));
		} catch (RuntimeException ex) {
			return fallback;
		}
	}

	/** 자바 문자열 → 자바스크립트 문자열 리터럴 */
	private static String js(String value) {
		if (value == null) {
			return "null";
		}
		StringBuilder sb = new StringBuilder("\"");
		for (int i = 0; i < value.length(); i++) {
			char c = value.charAt(i);
			switch (c) {
			case '"':
				sb.append("\\\"");
				break;
			case '\\':
				sb.append("\\\\");
				break;
			case '\n':
				sb.append("\\n");
				break;
			case '\r':
				sb.append("\\r");
				break;
			case '\t':
				sb.append("\\t");
				break;
			default:
				if (c < 0x20) {
					sb.append(String.format("\\u%04x", (int) c));
				} else {
					sb.append(c);
				}
			}
		}
		return sb.append('"').toString();
	}

	private static String sha1(String value) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-1");
			byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
			StringBuilder sb = new StringBuilder();
			for (int i = 0; i < 8; i++) {
				sb.append(String.format("%02x", bytes[i]));
			}
			return sb.toString();
		} catch (Exception ex) {
			return Integer.toHexString(value.hashCode());
		}
	}

	private static String now() {
		return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
	}

	private static String rel(Path path) {
		return PROJECT.relativize(path).toString().replace('\\', '/');
	}

	private static void write(Path path, String content) throws IOException {
		Files.createDirectories(path.getParent());
		Files.write(path, content.getBytes(StandardCharsets.UTF_8));
	}
}
