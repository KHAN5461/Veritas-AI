import os
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_diagnostics_endpoint():
    response = client.get("/diagnostics")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert "uptime_seconds" in data
    assert "device" in data
    assert "worker_threads" in data

def test_correlation_headers():
    response = client.get("/health")
    assert "X-Request-ID" in response.headers
    assert "X-Process-Time" in response.headers

def test_create_job_invalid_type():
    with open("test.txt", "w") as f:
        f.write("dummy text")
    
    try:
        with open("test.txt", "rb") as f:
            response = client.post("/jobs", files={"file": ("test.txt", f, "text/plain")})
        
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]
    finally:
        if os.path.exists("test.txt"):
            os.remove("test.txt")

def test_get_invalid_job():
    response = client.get("/jobs/invalid_id")
    assert response.status_code == 404

def test_cancel_invalid_job():
    response = client.delete("/jobs/invalid_id")
    assert response.status_code == 404

def test_provenance_scanner():
    from provenance import scan_file_provenance
    with open("test_ai.png", "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...parameters: Midjourney v6 generated image...")
    try:
        res = scan_file_provenance("test_ai.png")
        assert res["has_ai_provenance"] is True
        assert any("Midjourney" in sig for sig in res["ai_signatures"])
    finally:
        if os.path.exists("test_ai.png"):
            os.remove("test_ai.png")
def test_batch_endpoint_empty():
    response = client.post("/jobs/batch")
    assert response.status_code == 422 or response.status_code == 400

def test_job_sse_stream_not_found():
    response = client.get("/jobs/nonexistent_id/stream")
    assert response.status_code == 200
    assert "not_found" in response.text
