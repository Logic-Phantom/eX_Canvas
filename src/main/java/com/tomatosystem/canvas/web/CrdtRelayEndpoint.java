package com.tomatosystem.canvas.web;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CopyOnWriteArraySet;

import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

/**
 * eX-Canvas(Web Prototyper) - 공유(실시간 협업) 릴레이.
 *
 * 브라우저끼리 CRDT(Yjs) 업데이트를 주고받게만 해 준다. 내용을 해석하지 않는다.
 *   [0] + Yjs update       : 문서(캔버스에 무엇이 어디에 있는지). 모아 두었다가 새로 들어온 사람에게 다시 들려준다.
 *   [1] + awareness update : 커서·선택 같은 "지금 상태". 모아 두지 않고 지금 붙어 있는 사람에게만 넘긴다.
 *
 * 방(room)은 접속 주소의 ?room=&lt;화면명&gt; 으로 나뉜다. 마지막 사람이 나가면 방과 기록을 버린다.
 * Tomcat 이 @ServerEndpoint 를 스스로 찾아 연다(스프링 설정·추가 라이브러리가 필요 없다).
 * Tomcat 없이 도는 개발 서버(tools/DevServer.java)의 CollabRelay 가 같은 일을 같은 규약으로 한다.
 *
 * 주의 : 순서 보장을 위해 한 세션에는 한 번에 하나씩만 보낸다(sendBinary 는 동시 호출을 허용하지 않는다).
 *
 * 개발 도구용 기능이다. 운영 서버에는 배포하지 않는다.
 */
@ServerEndpoint(CrdtRelayEndpoint.WS_PATH)
public class CrdtRelayEndpoint {

	/** 릴레이 경로. CanvasCollabController 가 화면에 알려 준다(개발 서버의 CollabRelay.WS_PATH 와 같다). */
	public static final String WS_PATH = "/ws/crdt-sync.do";

	/** 문서 변경 · 커서 구분(첫 바이트) */
	private static final byte FLAG_DOC = 0;
	/** Yjs 업데이트 한 덩어리의 상한(Tomcat 기본값 8KB 는 캔버스를 통째로 올릴 때 모자란다) */
	private static final int MAX_MESSAGE = 1024 * 1024;
	/** 방 하나가 들고 있을 문서 기록의 상한 */
	private static final long MAX_HISTORY_BYTES = 16L * 1024 * 1024;

	private static final Map<String, Room> ROOMS = new ConcurrentHashMap<>();

	/** 지금 열려 있는 방의 수(collabInfo.do 응답용 · 개발 서버의 CollabRelay.roomCount() 와 같다). */
	public static int roomCount() {
		return ROOMS.size();
	}

	@OnOpen
	public void onOpen(Session session) {
		session.setMaxBinaryMessageBufferSize(MAX_MESSAGE);
		Room room = ROOMS.computeIfAbsent(roomOf(session), Room::new);
		room.sessions.add(session);
		session.getUserProperties().put("room", room.name);

		// 새로 들어온 사람에게 지금까지의 문서 변경을 그대로 들려준다(초기 동기화).
		for (byte[] past : room.history) {
			if (!send(session, past)) {
				break;
			}
		}
	}

	@OnMessage
	public void onMessage(ByteBuffer message, Session session) {
		byte[] bytes = new byte[message.remaining()];
		message.get(bytes);
		if (bytes.length == 0) {
			return;
		}
		Room room = ROOMS.get(roomName(session));
		if (room == null) {
			return;
		}
		if (bytes[0] == FLAG_DOC) {
			room.remember(bytes);
		}
		List<Session> dead = new ArrayList<>();
		for (Session other : room.sessions) {
			if (other == session || !other.isOpen()) {
				continue;
			}
			if (!send(other, bytes)) {
				dead.add(other);
			}
		}
		room.sessions.removeAll(dead);
	}

	@OnClose
	public void onClose(Session session) {
		Room room = ROOMS.get(roomName(session));
		if (room == null) {
			return;
		}
		room.sessions.remove(session);
		if (room.sessions.isEmpty()) {
			// 아무도 없으면 방을 버린다(다음 사람이 자기 캔버스로 다시 연다).
			ROOMS.remove(room.name);
		}
	}

	@OnError
	public void onError(Session session, Throwable error) {
		onClose(session);
		try {
			session.close();
		} catch (IOException ignore) {
			// 이미 닫혔다.
		}
	}

	/** 한 세션에 한 번에 하나씩만 보낸다. 실패하면 false(부른 쪽이 정리한다). */
	private static boolean send(Session session, byte[] payload) {
		synchronized (session) {
			try {
				session.getBasicRemote().sendBinary(ByteBuffer.wrap(payload));
				return true;
			} catch (IOException | IllegalStateException e) {
				return false;
			}
		}
	}

	private static String roomOf(Session session) {
		Map<String, List<String>> params = session.getRequestParameterMap();
		List<String> values = params == null ? null : params.get("room");
		if (values == null || values.isEmpty() || values.get(0).isEmpty()) {
			return "default";
		}
		return values.get(0);
	}

	private static String roomName(Session session) {
		Object name = session.getUserProperties().get("room");
		return name == null ? roomOf(session) : String.valueOf(name);
	}

	/** 한 방 = 붙어 있는 사람들 + 지금까지의 문서 변경 */
	private static final class Room {

		final String name;
		final Set<Session> sessions = new CopyOnWriteArraySet<>();
		final List<byte[]> history = new CopyOnWriteArrayList<>();
		private long historyBytes;
		private boolean historyFull;

		Room(String name) {
			this.name = name;
		}

		synchronized void remember(byte[] message) {
			if (historyFull) {
				return;
			}
			if (historyBytes + message.length > MAX_HISTORY_BYTES) {
				historyFull = true;
				return;
			}
			history.add(message);
			historyBytes += message.length;
		}
	}
}
