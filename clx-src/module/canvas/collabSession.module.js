/************************************************
 * collabSession.module.js
 * Created at 2026. 9. 20.
 *
 * eX-Canvas(Web Prototyper) - 캔버스를 여러 사람이 함께 고치는 CRDT 세션.
 *
 *  화면(Prototyper.js) ──publishXxx()──▶ Y.Doc ──update(0)──▶ WebSocket 릴레이 ──▶ 다른 사람
 *  화면(Prototyper.js) ◀──handlers.onItemXxx()── Y.Doc ◀──update(0)── 릴레이 ◀── 다른 사람
 *                       ◀──handlers.onPresence()── Awareness ◀──update(1)──┘
 *
 * 공유 문서의 모양 (Y.Doc)
 *   items : Y.Map<uid, Y.Map>  한 항목 = { uid, type, id, text, x, y, w, h }
 *           uid 는 만든 사람이 붙이는 전역 고유 키다. 이것으로 어느 컨트롤이 어느 컨트롤인지 맞춘다.
 *           필드마다 따로 쓰므로 A 가 옮기고 B 가 글자를 고쳐도 서로를 덮어쓰지 않는다(같은 필드는 나중 쓴 값).
 *   awareness : { name, c(색 번호), sel(고른 uid), cursor({x,y} 캔버스 좌표) }  ← 문서가 아니라 "지금 상태"
 *
 * 전선 규약(Crdt_WebSoket 프로젝트의 CrdtRelayHandler 와 같다 — 서버를 그대로 바꿔 쓸 수 있다)
 *   [0] + Yjs update      : 문서 변경. 서버가 저장해 두었다가 새로 들어온 사람에게 다시 들려준다.
 *   [1] + awareness update: 커서·선택. 저장하지 않고 지금 붙어 있는 사람에게만 넘긴다.
 *
 * 되울림(echo) 막기
 *   - 원격 업데이트는 origin 을 "collab-remote" 로 적용한다 → doc.on("update") 에서 걸러 다시 보내지 않는다.
 *   - 원격 변경을 화면에 반영하는 동안에는 mbApplying 을 세워 publishXxx() 를 모두 무시한다.
 ************************************************/

var FLAG_DOC = 0;
var FLAG_AWARENESS = 1;
/** 원격에서 받은 변경임을 표시하는 트랜잭션 origin */
var REMOTE_ORIGIN = "collab-remote";
/** 사람마다 돌아가며 쓰는 색(클래스 pt-peer-0 ~ pt-peer-7). 인라인 스타일을 쓰지 않으려고 번호로 나눈다. */
var PEER_COLOR_COUNT = 8;
/** 접속 직후 서버가 들려주는 기존 이력을 다 받을 때까지 기다리는 시간(ms) */
var SYNC_GRACE = 700;
var RETRY_LIMIT = 3;
var RETRY_DELAY = 2000;

/* ---------------------------------------------------------------- 세션 상태 */

var mbConnected = false;
var mbConnecting = false;
/** 원격 변경을 화면에 반영하는 중 — 이 동안의 publish 는 모두 무시한다. */
var mbApplying = false;
/** 사용자가 끈 것인지(끈 것이면 자동 재접속하지 않는다) */
var mbClosedByUser = false;

var moDoc = null;
var moItems = null;
var moAwareness = null;
var moSocket = null;
var moHandlers = {};
var msUrl = "";
var msRoom = "";
var msName = "";
var mnRetry = 0;
var mnRetryTimer = 0;
var mnSyncTimer = 0;

var FIELDS = ["uid", "type", "id", "text", "x", "y", "w", "h", "style", "bind"];

function handler(psName) {
	return typeof moHandlers[psName] == "function" ? moHandlers[psName] : function() {
		// 화면이 관심 없는 알림은 버린다.
	};
}

function status(psState, psMessage) {
	handler("onStatus")(psState, psMessage);
}

/** 보낼 수 있는 상태인가(끊겼거나 원격 반영 중이면 보내지 않는다). */
function canPublish() {
	return mbConnected && !mbApplying && moItems != null;
}

/* ---------------------------------------------------------------- 문서 ↔ 평범한 객체 */

function toRecord(poMap) {
	if (poMap == null || typeof poMap.get != "function") {
		return null;
	}
	var voRecord = {};
	FIELDS.forEach(function(psField) {
		voRecord[psField] = poMap.get(psField);
	});
	return voRecord;
}

function fillMap(poMap, poRecord) {
	FIELDS.forEach(function(psField) {
		if (poRecord[psField] !== undefined) {
			poMap.set(psField, poRecord[psField]);
		}
	});
}

/* ---------------------------------------------------------------- 원격 변경 → 화면 */

function bindDocument() {
	// 내 변경만 서버로 보낸다(원격에서 받아 적용한 것은 origin 으로 걸러진다).
	moDoc.on("update", function(paUpdate, pvOrigin) {
		if (pvOrigin === REMOTE_ORIGIN) {
			return;
		}
		sendFramed(FLAG_DOC, paUpdate);
	});

	moItems.observeDeep(function(paEvents, poTransaction) {
		if (poTransaction.origin !== REMOTE_ORIGIN) {
			return; // 내가 만든 변경은 화면에 이미 반영돼 있다.
		}
		mbApplying = true;
		try {
			paEvents.forEach(applyEvent);
		} finally {
			mbApplying = false;
		}
	});
}

function applyEvent(poEvent) {
	if (poEvent.target === moItems) {
		// 항목이 통째로 생기거나 사라진 경우
		poEvent.changes.keys.forEach(function(poChange, psUid) {
			if (poChange.action == "delete") {
				handler("onItemDelete")(psUid);
				return;
			}
			var voRecord = toRecord(moItems.get(psUid));
			if (voRecord == null) {
				return;
			}
			if (poChange.action == "update") {
				handler("onItemDelete")(psUid); // 통째로 바뀐 경우는 지우고 다시 그린다.
			}
			handler("onItemAdd")(psUid, voRecord);
		});
		return;
	}
	// 항목 안의 필드가 바뀐 경우(이동 · 크기 · id · Text)
	var voTarget = poEvent.target;
	if (voTarget == null || typeof voTarget.get != "function") {
		return;
	}
	var vsUid = voTarget.get("uid");
	if (vsUid == null) {
		return;
	}
	var voPatch = {};
	var vbHas = false;
	poEvent.changes.keys.forEach(function(poChange, psField) {
		if (poChange.action == "delete") {
			return;
		}
		voPatch[psField] = voTarget.get(psField);
		vbHas = true;
	});
	if (vbHas) {
		handler("onItemUpdate")(vsUid, voPatch);
	}
}

/* ---------------------------------------------------------------- 지금 상태(awareness) */

/**
 * 사람마다 다른 색 번호(0~7). clientID 를 그대로 나누면 값이 몰릴 수 있어 소수로 한 번 섞는다.
 * @param {Number} pnClientId
 */
function colorIndexOf(pnClientId) {
	return Math.abs(pnClientId % 1000003) % PEER_COLOR_COUNT;
}

function bindAwareness() {
	moAwareness.setLocalState({
		name : msName,
		c : colorIndexOf(moAwareness.clientID),
		sel : null,
		cursor : null
	});
	moAwareness.on("update", function(poChange) {
		var vaChanged = poChange.added.concat(poChange.updated).concat(poChange.removed);
		// 릴레이는 커서 상태를 모아 두지 않는다. 그래서 새 사람이 나타나면(added) 내 상태도 같이 실어 보낸다
		// — 그래야 뒤늦게 들어온 사람이 이미 있던 사람들을 볼 수 있다(두 번 오가면 수렴한다).
		if (poChange.added.length > 0 && vaChanged.indexOf(moAwareness.clientID) < 0) {
			vaChanged = vaChanged.concat([moAwareness.clientID]);
		}
		sendFramed(FLAG_AWARENESS, window.yProtocols.awarenessProtocol.encodeAwarenessUpdate(moAwareness, vaChanged));
	});
	moAwareness.on("change", function() {
		handler("onPresence")(exports.getPeers());
	});
}

/* ---------------------------------------------------------------- 웹소켓 */

/** [flag] + payload 한 덩어리로 보낸다. */
function sendFramed(pnFlag, paPayload) {
	if (moSocket == null || moSocket.readyState !== WebSocket.OPEN) {
		return;
	}
	var vaMessage = new Uint8Array(paPayload.byteLength + 1);
	vaMessage[0] = pnFlag;
	vaMessage.set(paPayload, 1);
	try {
		moSocket.send(vaMessage);
	} catch (ex) {
		// 끊기는 중이면 onclose 가 처리한다.
	}
}

function openSocket() {
	try {
		moSocket = new WebSocket(msUrl);
	} catch (ex) {
		failConnect("공유 서버 주소가 올바르지 않습니다 : " + msUrl);
		return;
	}
	moSocket.binaryType = "arraybuffer";

	moSocket.onopen = function() {
		mbConnecting = false;
		mbConnected = true;
		mnRetry = 0;
		status("connected", "공유 중 · 방 \"" + msRoom + "\"");
		// 붙자마자 내가 누구인지 알린다(소켓이 열리기 전에 만든 첫 상태는 나가지 못했다).
		sendFramed(FLAG_AWARENESS, window.yProtocols.awarenessProtocol.encodeAwarenessUpdate(moAwareness, [moAwareness.clientID]));
		// 서버가 들려주는 기존 이력을 다 받은 뒤에 "지금 방에 뭐가 있는지" 를 화면에 알린다.
		mnSyncTimer = window.setTimeout(function() {
			mnSyncTimer = 0;
			handler("onSynced")(exports.getItems());
		}, SYNC_GRACE);
	};

	moSocket.onmessage = function(poEvent) {
		var vaData = new Uint8Array(poEvent.data);
		if (vaData.length < 2) {
			return;
		}
		var vnFlag = vaData[0];
		var vaPayload = vaData.subarray(1);
		try {
			if (vnFlag === FLAG_DOC) {
				window.Y.applyUpdate(moDoc, vaPayload, REMOTE_ORIGIN);
			} else if (vnFlag === FLAG_AWARENESS) {
				window.yProtocols.awarenessProtocol.applyAwarenessUpdate(moAwareness, vaPayload, moSocket);
			}
		} catch (ex) {
			status("warn", "받은 변경을 반영하지 못했습니다 : " + ex);
		}
	};

	moSocket.onerror = function() {
		// 자세한 사유는 브라우저가 주지 않는다. 뒤따라 오는 onclose 에서 처리한다.
	};

	moSocket.onclose = function() {
		moSocket = null;
		if (mbClosedByUser) {
			return;
		}
		if (mnSyncTimer) {
			window.clearTimeout(mnSyncTimer);
			mnSyncTimer = 0;
		}
		mbConnected = false;
		if (mnRetry < RETRY_LIMIT) {
			mnRetry++;
			status("retry", "공유 서버와 끊겼습니다. 다시 붙는 중 (" + mnRetry + "/" + RETRY_LIMIT + ")");
			mnRetryTimer = window.setTimeout(openSocket, RETRY_DELAY);
			return;
		}
		failConnect("공유 서버에 붙지 못했습니다 : " + msUrl);
	};
}

function failConnect(psMessage) {
	cleanup();
	status("error", psMessage);
}

function cleanup() {
	if (mnRetryTimer) {
		window.clearTimeout(mnRetryTimer);
		mnRetryTimer = 0;
	}
	if (mnSyncTimer) {
		window.clearTimeout(mnSyncTimer);
		mnSyncTimer = 0;
	}
	if (moSocket != null) {
		try {
			moSocket.onclose = null;
			moSocket.close();
		} catch (ex) {
			// 이미 닫혔으면 넘어간다.
		}
		moSocket = null;
	}
	if (moAwareness != null) {
		try {
			moAwareness.destroy();
		} catch (ex2) {
			// 무시
		}
		moAwareness = null;
	}
	if (moDoc != null) {
		try {
			moDoc.destroy();
		} catch (ex3) {
			// 무시
		}
		moDoc = null;
	}
	moItems = null;
	mbConnected = false;
	mbConnecting = false;
	mbApplying = false;
	handler("onPresence")([]);
}

/* ---------------------------------------------------------------- 공유 서버 주소 찾기
 *
 * 1) 사용자가 속성창에 직접 적은 주소가 있으면 그것.
 * 2) GET /canvas/collabInfo.do — DevServer 는 릴레이 포트를 여기서 알려 준다(HTTP 와 다른 포트를 쓴다).
 * 3) 없으면 이 화면을 준 서버의 같은 포트 : ws(s)://<host><contextPath>/ws/crdt-sync.do (Tomcat 배포)
 */

var COLLAB_INFO_PATH = "/canvas/collabInfo.do";
var COLLAB_WS_PATH = "/ws/crdt-sync.do";

function wsScheme() {
	return window.location.protocol == "https:" ? "wss://" : "ws://";
}

function sameOriginUrl() {
	return wsScheme() + window.location.host + cpr.core.Module.require("module/canvas/fileDownload").contextPath() + COLLAB_WS_PATH;
}

/**
 * 공유 서버 주소를 찾는다(화면이 뜰 때 1회).
 * @param {function(String, Boolean)} pfDone (주소, 서버가 알려 준 것인지)
 */
exports.probeServerUrl = function(pfDone) {
	var voXhr = new XMLHttpRequest();
	try {
		voXhr.open("GET", cpr.core.Module.require("module/canvas/fileDownload").contextPath() + COLLAB_INFO_PATH, true);
		voXhr.setRequestHeader("X-Requested-With", "eX-Canvas");
	} catch (ex) {
		pfDone(sameOriginUrl(), false);
		return;
	}
	voXhr.timeout = 5000;
	voXhr.onreadystatechange = function() {
		if (voXhr.readyState != 4) {
			return;
		}
		var voInfo = null;
		try {
			voInfo = JSON.parse(voXhr.responseText);
		} catch (e) {
			voInfo = null;
		}
		if (voXhr.status >= 200 && voXhr.status < 300 && voInfo != null && voInfo.ok) {
			// 릴레이가 다른 포트에 있을 수 있다. host 는 지금 보고 있는 주소를 그대로 쓴다(127.0.0.1 · 사내 IP 모두 대응).
			var vsPath = voInfo.path || COLLAB_WS_PATH;
			pfDone(voInfo.port ? wsScheme() + window.location.hostname + ":" + voInfo.port + vsPath : sameOriginUrl(), true);
			return;
		}
		pfDone(sameOriginUrl(), false);
	};
	try {
		voXhr.send();
	} catch (ex2) {
		pfDone(sameOriginUrl(), false);
	}
};

/**
 * 사용자가 적은 공유 서버 주소를 웹소켓 주소로 고친다. 쓸 수 없는 값이면 "".
 * ws(s):// 는 그대로, http(s):// 는 ws(s):// 로 바꾼다. 그 밖의 값(예: 이름을 잘못 적은 것)은
 * new WebSocket 이 이 화면 기준 상대 경로(/ui/<값>)로 풀어 404 가 나므로 받지 않는다.
 * @param {String} psUrl
 */
function normalizeUrl(psUrl) {
	var vsUrl = (psUrl || "").replace(/\s+/g, "");
	if (/^wss?:\/\/[^\/?#]+/i.test(vsUrl)) {
		return vsUrl;
	}
	if (/^https?:\/\/[^\/?#]+/i.test(vsUrl)) {
		return vsUrl.replace(/^http/i, "ws");
	}
	return "";
}
exports.normalizeUrl = normalizeUrl;

/**
 * 방 이름을 붙인 접속 주소.
 * @param {String} psBaseUrl
 * @param {String} psRoom
 */
exports.buildUrl = function(psBaseUrl, psRoom) {
	var vsBase = normalizeUrl(psBaseUrl);
	if (vsBase === "") {
		vsBase = sameOriginUrl();
	}
	return vsBase + (vsBase.indexOf("?") >= 0 ? "&" : "?") + "room=" + encodeURIComponent(psRoom || "default");
};

/* ================================================================ 공개 API */

/**
 * 공유를 켠다. 라이브러리를 받은 뒤(처음 한 번) 웹소켓에 붙는다.
 * @param {{url:String, room:String, name:String}} poOptions
 * @param {Object} poHandlers onStatus(state, message) · onSynced(items) · onItemAdd(uid, record)
 *                            · onItemUpdate(uid, patch) · onItemDelete(uid) · onPresence(peers)
 */
exports.connect = function(poOptions, poHandlers) {
	if (mbConnected || mbConnecting) {
		return;
	}
	moHandlers = poHandlers || {};
	msUrl = poOptions.url;
	msRoom = poOptions.room || "default";
	msName = poOptions.name || "사용자";
	mbClosedByUser = false;
	mbConnecting = true;
	mnRetry = 0;
	status("connecting", "CRDT 라이브러리를 준비하는 중...");

	cpr.core.Module.require("module/canvas/yjsLoader").load(function() {
		if (!mbConnecting) {
			return; // 기다리는 사이에 사용자가 껐다.
		}
		moDoc = new window.Y.Doc();
		moItems = moDoc.getMap("items");
		moAwareness = new window.yProtocols.awarenessProtocol.Awareness(moDoc);
		bindDocument();
		bindAwareness();
		status("connecting", "공유 서버에 붙는 중... " + msUrl);
		openSocket();
	}, function(psError) {
		mbConnecting = false;
		status("error", psError);
	});
};

/** 공유를 끈다. 캔버스 내용은 그대로 둔다(각자 자기 것으로 이어서 쓴다). */
exports.disconnect = function() {
	if (!mbConnected && !mbConnecting) {
		cleanup();
		return;
	}
	mbClosedByUser = true;
	if (moAwareness != null && moSocket != null && moSocket.readyState === WebSocket.OPEN) {
		// 내가 나갔다는 것을 남들이 바로 알도록 상태를 지우고 그 변경까지 보낸다.
		try {
			window.yProtocols.awarenessProtocol.removeAwarenessStates(moAwareness, [moAwareness.clientID], "disconnect");
		} catch (ex) {
			// 무시
		}
	}
	cleanup();
	status("closed", "공유를 껐습니다.");
};

exports.isConnected = function() {
	return mbConnected;
};

exports.isBusy = function() {
	return mbConnecting;
};

exports.getRoom = function() {
	return msRoom;
};

/** 원격 변경을 화면에 반영하는 중인가(publish 를 막는 락). */
exports.isApplyingRemote = function() {
	return mbApplying;
};

/**
 * 공유 문서를 건드리지 않고 화면만 고칠 때 쓴다(초기 내려받기 · 공유본 받아 쓰기).
 * 이 안에서 부른 publishXxx 는 모두 무시된다.
 * @param {function()} pfBody
 */
exports.withRemote = function(pfBody) {
	var vbPrevious = mbApplying;
	mbApplying = true;
	try {
		pfBody();
	} finally {
		mbApplying = vbPrevious;
	}
};

/** 지금 공유 문서에 들어 있는 항목 전부 */
exports.getItems = function() {
	var vaItems = [];
	if (moItems == null) {
		return vaItems;
	}
	moItems.forEach(function(poMap) {
		var voRecord = toRecord(poMap);
		if (voRecord != null && voRecord.uid != null) {
			vaItems.push(voRecord);
		}
	});
	return vaItems;
};

exports.hasItem = function(psUid) {
	return moItems != null && moItems.get(psUid) != null;
};

/** @param {Object} poRecord {uid, type, id, text, x, y, w, h} */
exports.publishAdd = function(poRecord) {
	if (!canPublish() || poRecord == null || poRecord.uid == null || poRecord.uid === "") {
		return;
	}
	moDoc.transact(function() {
		var voMap = new window.Y.Map();
		moItems.set(poRecord.uid, voMap);
		fillMap(voMap, poRecord);
	});
};

/**
 * 항목의 일부 필드만 고친다(이동 · 크기 · id · Text).
 * @param {String} psUid
 * @param {Object} poPatch 바뀐 필드만
 */
exports.publishUpdate = function(psUid, poPatch) {
	if (!canPublish() || psUid == null || psUid === "") {
		return;
	}
	var voMap = moItems.get(psUid);
	if (voMap == null) {
		return;
	}
	moDoc.transact(function() {
		Object.keys(poPatch).forEach(function(psField) {
			if (FIELDS.indexOf(psField) >= 0 && voMap.get(psField) !== poPatch[psField]) {
				voMap.set(psField, poPatch[psField]);
			}
		});
	});
};

exports.publishDelete = function(psUid) {
	if (!canPublish() || psUid == null || psUid === "") {
		return;
	}
	moDoc.transact(function() {
		moItems.delete(psUid);
	});
};

/** 캔버스를 통째로 비운다(전체 삭제 · 패턴 미리 배치). */
exports.publishClear = function() {
	if (!canPublish()) {
		return;
	}
	var vaKeys = [];
	moItems.forEach(function(poMap, psUid) {
		vaKeys.push(psUid);
	});
	moDoc.transact(function() {
		vaKeys.forEach(function(psUid) {
			moItems.delete(psUid);
		});
	});
};

/**
 * 여러 번의 publish 를 한 번의 변경으로 묶는다(뼈대 미리 배치처럼 한꺼번에 깔 때).
 * @param {function()} pfBody
 */
exports.transact = function(pfBody) {
	if (!canPublish()) {
		pfBody();
		return;
	}
	moDoc.transact(pfBody);
};

/** 내가 고른 항목을 남들에게 알린다. */
exports.setSelection = function(psUid) {
	if (mbConnected && moAwareness != null) {
		moAwareness.setLocalStateField("sel", psUid == null || psUid === "" ? null : psUid);
	}
};

/**
 * 내 마우스 위치를 알린다(캔버스 기준 좌표. 캔버스 밖이면 null).
 * @param {{x:Number, y:Number}} poPoint
 */
exports.setCursor = function(poPoint) {
	if (mbConnected && moAwareness != null) {
		moAwareness.setLocalStateField("cursor", poPoint);
	}
};

/** 내 표시 이름을 바꾼다(접속 중에도 된다). */
exports.setName = function(psName) {
	msName = psName || "사용자";
	if (mbConnected && moAwareness != null) {
		moAwareness.setLocalStateField("name", msName);
	}
};

/**
 * 지금 같은 방에 있는 다른 사람들.
 * @return {Array} [{clientId, name, colorIndex, sel, cursor}]
 */
exports.getPeers = function() {
	var vaPeers = [];
	if (moAwareness == null) {
		return vaPeers;
	}
	moAwareness.getStates().forEach(function(poState, pnClientId) {
		if (poState == null || pnClientId === moAwareness.clientID) {
			return;
		}
		vaPeers.push({
			clientId : pnClientId,
			name : poState.name || ("사용자" + pnClientId),
			colorIndex : poState.c == null ? colorIndexOf(pnClientId) : (poState.c % PEER_COLOR_COUNT),
			sel : poState.sel || null,
			cursor : poState.cursor || null
		});
	});
	return vaPeers;
};

/** 내 색 번호(0~7) — 화면에 "나" 를 같은 색으로 보여 줄 때 쓴다. */
exports.getMyColorIndex = function() {
	return moAwareness == null ? 0 : colorIndexOf(moAwareness.clientID);
};

exports.PEER_COLOR_COUNT = PEER_COLOR_COUNT;
