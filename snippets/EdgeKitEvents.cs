using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace EdgeKit.Events
{
    /// <summary>
    /// Edgekit Events Client for C# / .NET (Copy-Paste Snippet).
    /// Zero external dependencies (NuGet) — uses native HttpClient, HMACSHA256, and System.Text.Json from .NET 6/7/8+.
    /// Compatible with ASP.NET Core, Blazor, Worker Services, and Console apps.
    /// </summary>
    public class EdgeKitEventsClient
    {
        private readonly HttpClient _http;
        private readonly string _baseUrl;
        private readonly string _host;
        private readonly string _appKey;
        private readonly string _appSecret;
        private readonly string _appId;

        public EdgeKitEventsClient(
            string host,
            string appKey,
            string appSecret,
            string appId = "default-app",
            bool? useTls = null,
            int? port = null,
            HttpClient httpClient = null)
        {
            var cleanHost = host.Replace("http://", "").Replace("https://", "").TrimEnd('/');
            var isLocal = cleanHost.Contains("localhost") || cleanHost.Contains("127.0.0.1");
            var tls = useTls ?? !isLocal;
            var scheme = tls ? "https" : "http";
            var portSuffix = port.HasValue ? $":{port.Value}" : "";

            _baseUrl = $"{scheme}://{cleanHost}{portSuffix}";
            _host = cleanHost;
            _appKey = appKey.Trim();
            _appSecret = appSecret.Trim();
            _appId = string.IsNullOrWhiteSpace(appId) ? "default-app" : appId.Trim();
            _http = httpClient ?? new HttpClient();
        }

        /// <summary>
        /// Broadcasts an event to a single channel.
        /// </summary>
        public Task<TriggerResult> TriggerAsync(
            string channel,
            string eventName,
            object data,
            string socketId = null,
            CancellationToken ct = default)
        {
            return TriggerAsync(new[] { channel }, eventName, data, socketId, ct);
        }

        /// <summary>
        /// Broadcasts an event to one or more channels.
        /// </summary>
        public async Task<TriggerResult> TriggerAsync(
            IEnumerable<string> channels,
            string eventName,
            object data,
            string socketId = null,
            CancellationToken ct = default)
        {
            var channelList = channels?.ToList() ?? new List<string>();
            if (channelList.Count == 0)
                throw new ArgumentException("At least one channel must be specified.", nameof(channels));

            var payload = new Dictionary<string, object>
            {
                ["app_id"] = _appId,
                ["channels"] = channelList,
                ["event"] = eventName,
                ["data"] = data
            };

            if (!string.IsNullOrEmpty(socketId))
            {
                payload["socket_id"] = socketId;
            }

            var json = JsonSerializer.Serialize(payload);
            using var req = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/api/v1/trigger")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };

            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _appSecret);
            req.Headers.Add("X-App-Secret", _appSecret);
            req.Headers.Add("User-Agent", "EdgekitEvents-DotNet/1.0");

            var res = await _http.SendAsync(req, ct);
            var resBody = await res.Content.ReadAsStringAsync(ct);

            var result = JsonSerializer.Deserialize<TriggerResult>(resBody, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (!res.IsSuccessStatusCode)
            {
                var msg = result?.Error ?? resBody;
                throw new HttpRequestException($"Trigger failed with status code {(int)res.StatusCode}: {msg}");
            }

            return result;
        }

        /// <summary>
        /// Generates the HMAC-SHA256 authentication signature for private or presence channels.
        /// </summary>
        public ChannelAuthResult AuthorizeChannel(string socketId, string channel, object channelData = null)
        {
            if (string.IsNullOrWhiteSpace(socketId) || string.IsNullOrWhiteSpace(channel))
                throw new ArgumentException("socketId and channel are required.");

            string channelDataStr = null;
            string stringToSign = $"{socketId}:{channel}";

            if (channel.StartsWith("presence-", StringComparison.OrdinalIgnoreCase))
            {
                channelDataStr = channelData is string s
                    ? s
                    : JsonSerializer.Serialize(channelData ?? new object());
                stringToSign = $"{socketId}:{channel}:{channelDataStr}";
            }

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_appSecret));
            var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(stringToSign));
            var hashHex = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

            var auth = $"{_appKey}:{hashHex}";
            return new ChannelAuthResult
            {
                Auth = auth,
                ChannelData = channelDataStr
            };
        }

        /// <summary>
        /// Queries channel statistics from the Edgekit Events Worker.
        /// </summary>
        public async Task<string> GetChannelsAsync(CancellationToken ct = default)
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/apps/{_appId}/channels");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _appSecret);
            req.Headers.Add("X-App-Secret", _appSecret);

            var res = await _http.SendAsync(req, ct);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync(ct);
        }
    }

    public class TriggerResult
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("delivered_to")]
        public int DeliveredTo { get; set; }

        [JsonPropertyName("channels")]
        public List<string> Channels { get; set; }

        [JsonPropertyName("event")]
        public string Event { get; set; }

        [JsonPropertyName("error")]
        public string Error { get; set; }
    }

    public class ChannelAuthResult
    {
        [JsonPropertyName("auth")]
        public string Auth { get; set; }

        [JsonPropertyName("channel_data")]
        public string ChannelData { get; set; }
    }
}
