package com.min.webrtcexample.socket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Component
public class SocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, String> sessions = new ConcurrentHashMap<>(); // sessionId, name
    private final Map<String, List<WebSocketSession>> rooms = new HashMap<>(); // name, session

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message)
            throws InterruptedException, IOException {
        log.info(message.getPayload());

        String name = sessions.get(session.getId());
        List<WebSocketSession> sessions = this.rooms.getOrDefault(name, null);

        if(sessions == null)
            return;

        for (WebSocketSession webSocketSession : sessions) {
            if (webSocketSession.isOpen() && !session.getId().equals(webSocketSession.getId())) {
                webSocketSession.sendMessage(message);
            }
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info(session.getId() + " is connected");

        String queryString = session.getUri().getQuery();
        String name = "";

        String[] params = queryString.split("&");
        for (String param : params) {
            String[] keyValue = param.split("=");
            if (keyValue.length == 2) {
                String key = keyValue[0];
                String value = keyValue[1];
                System.out.println("Key: " + key + ", Value: " + value);

                if(key.equals("name"))
                    name = value;
            }
        }

        if(this.rooms.containsKey(name)) {
            List<WebSocketSession> sessions = this.rooms.get(name);

            log.info("session size = " + sessions.size());

            if(sessions.size() == 1) {
                sessions.add(session);
            } else {
                Map<String, Object> messageMap = new HashMap<>();
                messageMap.put("event", "error");
                messageMap.put("data", "이미 방이 꽉 찼습니다.");

                String jsonData = objectMapper.writeValueAsString(messageMap);

                TextMessage message = new TextMessage(jsonData);
                session.sendMessage(message);
                return;
            }

        } else {
            List<WebSocketSession> sessions = new ArrayList<>();
            sessions.add(session);
            this.rooms.put(name, sessions);
        }

        this.sessions.put(session.getId(), name);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info(session.getId() + " is closed");

        String name = this.sessions.get(session.getId());
        List<WebSocketSession> sessions = this.rooms.getOrDefault(name, null);

        if(sessions != null) {
            if(sessions.size() == 1) {
                rooms.remove(name);
            } else {
                sessions = sessions.stream()
                        .filter(value -> !value.equals(session))
                        .collect(Collectors.toList());

                this.rooms.put(name, sessions);
            }
        }

        this.sessions.remove(session.getId());
    }


}

