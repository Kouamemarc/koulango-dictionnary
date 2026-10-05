"""Tests de l'upload média : types renvoyés par les navigateurs et téléphones."""
import pytest

from app.api.routers.media import normalize_content_type


@pytest.mark.parametrize("content_type, filename, expected", [
    ("audio/webm;codecs=opus", "prononciation.webm", "audio/webm"),  # MediaRecorder Chrome/Edge
    ("audio/ogg; codecs=opus", "blob", "audio/ogg"),                  # Firefox
    ("video/webm", "blob", "audio/webm"),
    ("audio/mp3", "son.mp3", "audio/mpeg"),
    ("application/octet-stream", "prononciation.m4a", "audio/mp4"),   # téléphone sans type
    (None, "photo.JPG", "image/jpeg"),
    ("image/png", "x.png", "image/png"),
    ("application/pdf", "doc.pdf", "application/pdf"),                # reste refusé
])
def test_normalize_content_type(content_type, filename, expected):
    assert normalize_content_type(content_type, filename) == expected


def test_upload_recorded_audio(client):
    r = client.post(
        "/api/v1/media",
        files={"file": ("prononciation.webm", b"fake-audio", "audio/webm;codecs=opus")},
    )
    assert r.status_code == 201, r.text
    media = client.get(r.json()["url"].replace("http://testserver", ""))
    assert media.status_code == 200
    assert media.headers["content-type"].startswith("audio/webm")


def test_upload_rejects_other_files(client):
    r = client.post("/api/v1/media", files={"file": ("doc.pdf", b"%PDF", "application/pdf")})
    assert r.status_code == 415
