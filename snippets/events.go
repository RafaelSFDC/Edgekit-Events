// Package edgekit provides a zero-dependency client for Edgekit Events.
// Copy this file directly into your Go project (e.g., `pkg/events/edgekit.go`).
package edgekit

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Config defines the connection parameters for Edgekit Events.
type Config struct {
	Host       string
	AppKey     string
	AppSecret  string
	AppID      string
	UseTLS     *bool
	Port       int
	HTTPClient *http.Client
}

// Client represents the Edgekit Events client.
type Client struct {
	baseURL    string
	host       string
	appKey     string
	appSecret  string
	appID      string
	httpClient *http.Client
}

// TriggerOptions contains options for broadcasting an event.
type TriggerOptions struct {
	Channel  string   `json:"-"`
	Channels []string `json:"-"`
	Event    string   `json:"event"`
	Data     any      `json:"data"`
	SocketID string   `json:"socket_id,omitempty"`
}

// TriggerResponse represents the API response from triggering an event.
type TriggerResponse struct {
	Success     bool     `json:"success"`
	DeliveredTo int      `json:"delivered_to"`
	Channels    []string `json:"channels,omitempty"`
	Event       string   `json:"event,omitempty"`
	Error       string   `json:"error,omitempty"`
}

// ChannelAuthResult represents the authorization signature for private/presence channels.
type ChannelAuthResult struct {
	Auth        string  `json:"auth"`
	ChannelData *string `json:"channel_data,omitempty"`
}

// NewClient initializes a new Edgekit Events client.
func NewClient(cfg Config) *Client {
	cleanHost := strings.TrimRight(strings.TrimPrefix(strings.TrimPrefix(cfg.Host, "http://"), "https://"), "/")
	isLocal := strings.Contains(cleanHost, "localhost") || strings.Contains(cleanHost, "127.0.0.1")

	useTLS := !isLocal
	if cfg.UseTLS != nil {
		useTLS = *cfg.UseTLS
	}

	scheme := "http"
	if useTLS {
		scheme = "https"
	}

	portSuffix := ""
	if cfg.Port > 0 {
		portSuffix = fmt.Sprintf(":%d", cfg.Port)
	}

	appID := cfg.AppID
	if appID == "" {
		appID = "default-app"
	}

	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 10 * time.Second}
	}

	return &Client{
		baseURL:    fmt.Sprintf("%s://%s%s", scheme, cleanHost, portSuffix),
		host:       cleanHost,
		appKey:     strings.TrimSpace(cfg.AppKey),
		appSecret:  strings.TrimSpace(cfg.AppSecret),
		appID:      strings.TrimSpace(appID),
		httpClient: httpClient,
	}
}

// Trigger broadcasts an event to one or more channels.
func (c *Client) Trigger(ctx context.Context, opts TriggerOptions) (*TriggerResponse, error) {
	channels := opts.Channels
	if len(channels) == 0 && opts.Channel != "" {
		channels = []string{opts.Channel}
	}
	if len(channels) == 0 {
		return nil, fmt.Errorf("at least one channel must be specified")
	}

	payload := map[string]any{
		"app_id":   c.appID,
		"channels": channels,
		"event":    opts.Event,
		"data":     opts.Data,
	}
	if opts.SocketID != "" {
		payload["socket_id"] = opts.SocketID
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to encode trigger payload: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/trigger", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.appSecret)
	req.Header.Set("X-App-Secret", c.appSecret)
	req.Header.Set("User-Agent", "EdgekitEvents-Go/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var triggerResp TriggerResponse
	if err := json.Unmarshal(respBytes, &triggerResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if resp.StatusCode >= 400 {
		errMsg := triggerResp.Error
		if errMsg == "" {
			errMsg = string(respBytes)
		}
		return nil, fmt.Errorf("trigger failed with status %d: %s", resp.StatusCode, errMsg)
	}

	return &triggerResp, nil
}

// AuthorizeChannel signs a private or presence channel subscription using HMAC-SHA256.
func (c *Client) AuthorizeChannel(socketID, channel string, channelData any) (*ChannelAuthResult, error) {
	if socketID == "" || channel == "" {
		return nil, fmt.Errorf("socketID and channel are required")
	}

	var channelDataStr *string
	stringToSign := fmt.Sprintf("%s:%s", socketID, channel)

	if strings.HasPrefix(channel, "presence-") {
		if channelData != nil {
			bytes, err := json.Marshal(channelData)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal channel_data: %w", err)
			}
			str := string(bytes)
			channelDataStr = &str
			stringToSign = fmt.Sprintf("%s:%s:%s", socketID, channel, str)
		} else {
			empty := "{}"
			channelDataStr = &empty
			stringToSign = fmt.Sprintf("%s:%s:%s", socketID, channel, empty)
		}
	}

	mac := hmac.New(sha256.New, []byte(c.appSecret))
	mac.Write([]byte(stringToSign))
	sigHex := hex.EncodeToString(mac.Sum(nil))

	auth := fmt.Sprintf("%s:%s", c.appKey, sigHex)
	return &ChannelAuthResult{
		Auth:        auth,
		ChannelData: channelDataStr,
	}, nil
}

// GetChannels queries active channel statistics.
func (c *Client) GetChannels(ctx context.Context) (map[string]any, error) {
	url := fmt.Sprintf("%s/apps/%s/channels", c.baseURL, c.appID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+c.appSecret)
	req.Header.Set("X-App-Secret", c.appSecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result, nil
}
