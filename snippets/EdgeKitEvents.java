package edgekit.events;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Edgekit Events Client for Java (Copy-Paste Snippet).
 * Zero external dependencies — uses java.net.http.HttpClient and javax.crypto native to Java 11/17/21+.
 * Fully compatible with Spring Boot, Quarkus, Micronaut, and standalone Java apps.
 */
public class EdgeKitEvents {

    private final String baseUrl;
    private final String host;
    private final String appKey;
    private final String appSecret;
    private final String appId;
    private final HttpClient httpClient;

    public EdgeKitEvents(String host, String appKey, String appSecret) {
        this(host, appKey, appSecret, "default-app", null, null, null);
    }

    public EdgeKitEvents(
            String host,
            String appKey,
            String appSecret,
            String appId,
            Boolean useTls,
            Integer port,
            HttpClient client) {
        String cleanHost = host.replaceAll("^https?://", "").replaceAll("/+$", "");
        boolean isLocal = cleanHost.contains("localhost") || cleanHost.contains("127.0.0.1");
        boolean tls = useTls != null ? useTls : !isLocal;
        String scheme = tls ? "https" : "http";
        String portSuffix = port != null ? ":" + port : "";

        this.baseUrl = scheme + "://" + cleanHost + portSuffix;
        this.host = cleanHost;
        this.appKey = appKey.trim();
        this.appSecret = appSecret.trim();
        this.appId = (appId == null || appId.isBlank()) ? "default-app" : appId.trim();
        this.httpClient = client != null ? client : HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Broadcasts an event to a single channel.
     */
    public String trigger(String channel, String event, Object data, String socketId) throws IOException, InterruptedException {
        return trigger(Collections.singletonList(channel), event, data, socketId);
    }

    /**
     * Broadcasts an event to multiple channels.
     */
    public String trigger(List<String> channels, String event, Object data, String socketId) throws IOException, InterruptedException {
        if (channels == null || channels.isEmpty()) {
            throw new IllegalArgumentException("At least one channel must be specified.");
        }

        // Basic JSON serialization for payload
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"app_id\":\"").append(escapeJson(appId)).append("\",");
        sb.append("\"channels\":[");
        for (int i = 0; i < channels.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(escapeJson(channels.get(i))).append("\"");
        }
        sb.append("],");
        sb.append("\"event\":\"").append(escapeJson(event)).append("\",");
        
        // Serialize data (if already JSON string or raw primitive)
        if (data instanceof String && ((String) data).trim().startsWith("{")) {
            sb.append("\"data\":").append(data);
        } else if (data instanceof String) {
            sb.append("\"data\":\"").append(escapeJson((String) data)).append("\"");
        } else {
            sb.append("\"data\":").append(String.valueOf(data));
        }

        if (socketId != null && !socketId.isBlank()) {
            sb.append(",\"socket_id\":\"").append(escapeJson(socketId)).append("\"");
        }
        sb.append("}");

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/trigger"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + appSecret)
                .header("X-App-Secret", appSecret)
                .header("User-Agent", "EdgekitEvents-Java/1.0")
                .POST(HttpRequest.BodyPublishers.ofString(sb.toString(), StandardCharsets.UTF_8))
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (res.statusCode() >= 400) {
            throw new RuntimeException("Trigger failed with HTTP " + res.statusCode() + ": " + res.body());
        }

        return res.body();
    }

    /**
     * Computes the HMAC-SHA256 signature for private or presence channel subscriptions.
     * Returns JSON string: {"auth":"<key>:<sig>"} or with "channel_data".
     */
    public String authorizeChannel(String socketId, String channel, String channelDataJson) {
        if (socketId == null || channel == null) {
            throw new IllegalArgumentException("socketId and channel are required.");
        }

        String stringToSign = socketId + ":" + channel;
        if (channel.startsWith("presence-")) {
            String data = channelDataJson != null ? channelDataJson : "{}";
            stringToSign = socketId + ":" + channel + ":" + data;
        }

        String sigHex = hmacSha256(appSecret, stringToSign);
        String auth = appKey + ":" + sigHex;

        if (channel.startsWith("presence-") && channelDataJson != null) {
            return "{\"auth\":\"" + auth + "\",\"channel_data\":\"" + escapeJson(channelDataJson) + "\"}";
        }

        return "{\"auth\":\"" + auth + "\"}";
    }

    /**
     * Queries active channels from the Edgekit Events Worker.
     */
    public String getChannels() throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/apps/" + appId + "/channels"))
                .header("Authorization", "Bearer " + appSecret)
                .header("X-App-Secret", appSecret)
                .GET()
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (res.statusCode() >= 400) {
            throw new RuntimeException("Failed to fetch channels: HTTP " + res.statusCode() + ": " + res.body());
        }

        return res.body();
    }

    private static String hmacSha256(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hmacBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Failed to compute HMAC-SHA256", e);
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
