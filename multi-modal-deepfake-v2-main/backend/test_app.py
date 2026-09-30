from fastapi.testclient import TestClient
from app import app
import os

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_create_job_invalid_type():
    with open("test.txt", "w") as f:
        f.write("dummy text")
    
    with open("test.txt", "rb") as f:
        response = client.post("/jobs", files={"file": ("test.txt", f, "text/plain")})
        
    os.remove("test.txt")
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]

def test_get_invalid_job():
    response = client.get("/jobs/invalid_id")
    assert response.status_code == 404
