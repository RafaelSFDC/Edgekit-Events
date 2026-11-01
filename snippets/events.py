"""
Edgekit Events Client for Python (Zero-Dependency Copy-Paste Snippet)

Copy this file directly into your Python project (e.g. `app/services/events.py`).
Compatible with FastAPI, Django, Flask, Celery, standalone scripts, and workers.
Zero external dependencies required (uses Python standard library: urllib, hmac, hashlib, json).
"""

import hmac
import hashlib
import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Optional, List, Dict, Any, Union


class EdgeKitEventsError(Exception):
    """Exception raised when Edgekit Events API returns an error."""
    pass


class EdgeKitEvents:
    def __init__(
        self,
        host: str,
        app_key: str,
        app_secret: str,
        app_id: str = "default-app",
        use_tls: Optional[bool] = None,
        port: Optional[int] = None,
    ):
        """
        Initializes the Edgekit Events client.

        :param host: Host of your Worker (e.g. "realtime.yourdomain.com" or "localhost:8787")
        :param app_key: Public App Key
        :param app_secret: Secret App Key
        :param app_id: Target App ID (defaults to "default-app")
        :param use_tls: Whether to use HTTPS (defaults to False for localhost, True otherwise)
        :param port: Custom port number if applicable
        """
        clean_host = host.replace("http://", "").replace("https://", "").rstrip("/")
        is_local = "localhost" in clean_host or "127.0.0.1" in clean_host
        self.use_tls = not is_local if use_tls is None else use_tls
        protocol = "https" if self.use_tls else "http"
        port_suffix = f":{port}" if port else ""
        self.base_url = f"{protocol}://{clean_host}{port_suffix}"

        self.host = clean_host
        self.app_key = app_key.strip()
        self.app_secret = app_secret.strip()
        self.app_id = app_id.strip()

    def trigger(
        self,
        channel: Union[str, List[str]],
        event: str,
        data: Any,
        socket_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Broadcasts an event to one or multiple channels.

        :param channel: Single channel name (str) or list of channel names (List[str])
        :param event: Name of the event to broadcast
        :param data: JSON-serializable payload dictionary, list, or primitive
        :param socket_id: Optional socket ID to exclude from broadcast
        :return: Dict with response status (e.g. {"success": True, "delivered_to": 1})
        """
        channels = [channel] if isinstance(channel, str) else list(channel)
        if not channels:
            raise ValueError("At least one channel must be specified.")

        payload = {
            "app_id": self.app_id,
            "channels": channels,
            "event": event,
            "data": data,
        }
        if socket_id:
            payload["socket_id"] = socket_id

        url = f"{self.base_url}/api/v1/trigger"
        body_bytes = json.dumps(payload).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.app_secret}",
            "X-App-Secret": self.app_secret,
            "User-Agent": "EdgekitEvents-Python/1.0",
        }

        req = urllib.request.Request(url, data=body_bytes, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                res_body = response.read().decode("utf-8")
                return json.loads(res_body)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                err_json = json.loads(err_body)
                msg = err_json.get("error", err_body)
            except Exception:
                msg = err_body
            raise EdgeKitEventsError(f"Trigger failed (HTTP {e.code}): {msg}") from e
        except Exception as e:
            raise EdgeKitEventsError(f"Connection error to Edgekit Events: {str(e)}") from e

    def authorize_channel(
        self,
        socket_id: str,
        channel: str,
        channel_data: Optional[Union[Dict[str, Any], str]] = None,
    ) -> Dict[str, str]:
        """
        Generates HMAC-SHA256 signature for private or presence channel subscriptions.
        Use this in your backend auth route (e.g. `/api/pusher/auth`).

        :param socket_id: The socket_id sent by the client (pusher-js)
        :param channel: Channel name (e.g. "private-chat", "presence-meeting")
        :param channel_data: Dictionary or JSON string with user profile (for presence channels)
        :return: Dict containing {"auth": "..."} or {"auth": "...", "channel_data": "..."}
        """
        if not socket_id or not channel:
            raise ValueError("socket_id and channel are required.")

        channel_data_str: Optional[str] = None
        string_to_sign = f"{socket_id}:{channel}"

        if channel.startswith("presence-"):
            if isinstance(channel_data, dict):
                channel_data_str = json.dumps(channel_data, separators=(",", ":"))
            elif isinstance(channel_data, str):
                channel_data_str = channel_data
            else:
                channel_data_str = "{}"
            string_to_sign = f"{socket_id}:{channel}:{channel_data_str}"

        secret_bytes = self.app_secret.encode("utf-8")
        msg_bytes = string_to_sign.encode("utf-8")
        sig_hex = hmac.new(secret_bytes, msg_bytes, hashlib.sha256).hexdigest()

        auth_value = f"{self.app_key}:{sig_hex}"
        result = {"auth": auth_value}
        if channel_data_str is not None:
            result["channel_data"] = channel_data_str

        return result

    def trigger_batch(self, batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Broadcasts multiple events in a single batch request (POST /api/v1/batch).
        Each item in batch should have: {"channel": str, "event": str, "data": Any, "socket_id"?: str}
        """
        url = f"{self.base_url}/api/v1/batch"
        body_bytes = json.dumps({"batch": batch}).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.app_secret}",
            "X-App-Secret": self.app_secret,
            "User-Agent": "EdgekitEvents-Python/1.0",
        }
        req = urllib.request.Request(url, data=body_bytes, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as e:
            raise EdgeKitEventsError(f"Batch trigger failed: {str(e)}") from e

    def get_history(self, channel: str) -> List[Dict[str, Any]]:
        """
        Retrieves message history for a channel (if retention is enabled).
        """
        url = f"{self.base_url}/api/v1/channels/{urllib.parse.quote(channel)}/history"
        headers = {
            "Authorization": f"Bearer {self.app_secret}",
            "X-App-Secret": self.app_secret,
            "User-Agent": "EdgekitEvents-Python/1.0",
        }
        req = urllib.request.Request(url, headers=headers, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                res = json.loads(response.read().decode("utf-8"))
                return res.get("messages", [])
        except Exception as e:
            raise EdgeKitEventsError(f"Failed to fetch history for {channel}: {str(e)}") from e

    def get_channels(self) -> Dict[str, Any]:
        """
        Retrieves active channels list and stats.
        """
        url = f"{self.base_url}/apps/{self.app_id}/channels"
        headers = {
            "Authorization": f"Bearer {self.app_secret}",
            "X-App-Secret": self.app_secret,
            "User-Agent": "EdgekitEvents-Python/1.0",
        }
        req = urllib.request.Request(url, headers=headers, method="GET")

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as e:
            raise EdgeKitEventsError(f"Failed to fetch channels: {str(e)}") from e
