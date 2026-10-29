//! Edgekit Events Client for Rust (Copy-Paste Snippet)
//! 
//! Copy this file directly into your Rust project (e.g. `src/events.rs`).
//! Requires in your `Cargo.toml`:
//! ```toml
//! [dependencies]
//! reqwest = { version = "0.12", features = ["json"] }
//! serde = { version = "1.0", features = ["derive"] }
//! serde_json = "1.0"
//! tokio = { version = "1", features = ["full"] }
//! hmac = "0.12"
//! sha2 = "0.10"
//! hex = "0.4"
//! ```

use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::error::Error;

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone, Debug)]
pub struct EdgeKitEvents {
    pub base_url: String,
    pub host: String,
    pub app_key: String,
    pub app_secret: String,
    pub app_id: String,
    client: reqwest::Client,
}

#[derive(Serialize, Debug)]
struct TriggerPayload<'a> {
    app_id: &'a str,
    channels: &'a [&'a str],
    event: &'a str,
    data: &'a serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    socket_id: Option<&'a str>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct TriggerResponse {
    pub success: bool,
    #[serde(default)]
    pub delivered_to: Option<u32>,
    #[serde(default)]
    pub channels: Option<Vec<String>>,
    #[serde(default)]
    pub event: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChannelAuth {
    pub auth: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_data: Option<String>,
}

impl EdgeKitEvents {
    pub fn new(host: &str, app_key: &str, app_secret: &str) -> Self {
        Self::with_options(host, app_key, app_secret, "default-app", None, None)
    }

    pub fn with_options(
        host: &str,
        app_key: &str,
        app_secret: &str,
        app_id: &str,
        use_tls: Option<bool>,
        port: Option<u16>,
    ) -> Self {
        let clean_host = host
            .trim_start_matches("http://")
            .trim_start_matches("https://")
            .trim_end_matches('/');
        let is_local = clean_host.contains("localhost") || clean_host.contains("127.0.0.1");
        let tls = use_tls.unwrap_or(!is_local);
        let scheme = if tls { "https" } else { "http" };
        let port_suffix = port.map(|p| format!(":{}", p)).unwrap_or_default();

        let base_url = format!("{}://{}{}", scheme, clean_host, port_suffix);

        Self {
            base_url,
            host: clean_host.to_string(),
            app_key: app_key.trim().to_string(),
            app_secret: app_secret.trim().to_string(),
            app_id: if app_id.is_empty() {
                "default-app".to_string()
            } else {
                app_id.to_string()
            },
            client: reqwest::Client::new(),
        }
    }

    /// Broadcasts an event to one or more channels.
    pub async fn trigger(
        &self,
        channels: &[&str],
        event: &str,
        data: &serde_json::Value,
        socket_id: Option<&str>,
    ) -> Result<TriggerResponse, Box<dyn Error>> {
        if channels.is_empty() {
            return Err("At least one channel must be specified".into());
        }

        let payload = TriggerPayload {
            app_id: &self.app_id,
            channels,
            event,
            data,
            socket_id,
        };

        let url = format!("{}/api/v1/trigger", self.base_url);
        let res = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", self.app_secret))
            .header("X-App-Secret", &self.app_secret)
            .header("User-Agent", "EdgekitEvents-Rust/1.0")
            .json(&payload)
            .send()
            .await?;

        let status = res.status();
        let body: TriggerResponse = res.json().await?;

        if !status.is_success() {
            let msg = body.error.unwrap_or_else(|| format!("HTTP error {}", status));
            return Err(msg.into());
        }

        Ok(body)
    }

    /// Generates HMAC-SHA256 signature for private or presence channel subscriptions.
    pub fn authorize_channel(
        &self,
        socket_id: &str,
        channel: &str,
        channel_data: Option<&str>,
    ) -> Result<ChannelAuth, Box<dyn Error>> {
        if socket_id.is_empty() || channel.is_empty() {
            return Err("socket_id and channel cannot be empty".into());
        }

        let string_to_sign = if channel.starts_with("presence-") {
            let data = channel_data.unwrap_or("{}");
            format!("{}:{}:{}", socket_id, channel, data)
        } else {
            format!("{}:{}", socket_id, channel)
        };

        let mut mac = HmacSha256::new_from_slice(self.app_secret.as_bytes())?;
        mac.update(string_to_sign.as_bytes());
        let result = mac.finalize();
        let sig_hex = hex::encode(result.into_bytes());

        let auth = format!("{}:{}", self.app_key, sig_hex);

        Ok(ChannelAuth {
            auth,
            channel_data: if channel.starts_with("presence-") {
                channel_data.map(|s| s.to_string())
            } else {
                None
            },
        })
    }

    /// Queries active channels.
    pub async fn get_channels(&self) -> Result<serde_json::Value, Box<dyn Error>> {
        let url = format!("{}/apps/{}/channels", self.base_url, self.app_id);
        let res = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.app_secret))
            .header("X-App-Secret", &self.app_secret)
            .send()
            .await?;

        let body: serde_json::Value = res.json().await?;
        Ok(body)
    }
}
