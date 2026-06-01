"""
test_camera_server.py - Unit tests for camera_server Flask routes.

Picamera2 is already mocked in conftest.py so importing camera_server is safe.
"""
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture(scope="module")
def client():
    """Return a Flask test client with the camera start patched out."""
    with patch("picamera2.Picamera2"):
        import camera_server
        camera_server.app.config["TESTING"] = True
        with camera_server.app.test_client() as c:
            yield c


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_returns_ok_text(self, client):
        resp = client.get("/health")
        assert b"OK" in resp.data


# ---------------------------------------------------------------------------
# / (index)
# ---------------------------------------------------------------------------

class TestIndexEndpoint:
    def test_returns_200(self, client):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_contains_video_feed_src(self, client):
        resp = client.get("/")
        assert b"/video_feed" in resp.data

    def test_html_content_type(self, client):
        resp = client.get("/")
        assert "text/html" in resp.content_type


# ---------------------------------------------------------------------------
# /video_feed
# ---------------------------------------------------------------------------

class TestVideoFeedEndpoint:
    def test_returns_200(self, client):
        """
        generate_frames() is an infinite generator; we just check the route
        opens without error and returns the correct MIME type.
        """
        import camera_server

        def one_frame():
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + b"\xff\xd8\xff" + b"\r\n")

        with patch.object(camera_server, "generate_frames", side_effect=one_frame):
            resp = client.get("/video_feed")
        assert resp.status_code == 200

    def test_mjpeg_content_type(self, client):
        import camera_server

        def one_frame():
            yield b""

        with patch.object(camera_server, "generate_frames", side_effect=one_frame):
            resp = client.get("/video_feed")
        assert "multipart/x-mixed-replace" in resp.content_type
