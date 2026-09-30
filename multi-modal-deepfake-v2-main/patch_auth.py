import re

with open('backend/app.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Add imports
imports = """
from fastapi import Request, Depends
from fastapi.security import APIKeyHeader
import time
from collections import defaultdict

API_KEY = os.getenv("VERITAS_API_KEY", "dev_key_123")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

class RateLimiter:
    def __init__(self, requests_per_minute: int):
        self.rpm = requests_per_minute
        self.requests = defaultdict(list)
    
    def check(self, ip: str):
        now = time.time()
        # Keep only requests from last 60 seconds
        self.requests[ip] = [t for t in self.requests[ip] if now - t < 60]
        if len(self.requests[ip]) >= self.rpm:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in a minute.")
        self.requests[ip].append(now)

limiter = RateLimiter(requests_per_minute=20)

async def verify_api_key(api_key: str = Depends(api_key_header)):
    if not api_key or api_key != API_KEY:
        # For local development we allow missing key, but in production we should enforce it.
        if os.getenv("ENV") == "production":
            raise HTTPException(status_code=403, detail="Invalid or missing API Key")
    return api_key

"""

if "API_KEY" not in code:
    code = code.replace('app = FastAPI(title="Multimodal Deepfake Detection API")', imports + '\napp = FastAPI(title="Multimodal Deepfake Detection API")')

# Inject into endpoints
def patch_endpoint(signature, new_signature):
    global code
    code = code.replace(signature, new_signature)

patch_endpoint('async def create_job(background_tasks: BackgroundTasks, request: Request, file: UploadFile = File(...), file_hash: str = Form("")):',
               'async def create_job(background_tasks: BackgroundTasks, request: Request, file: UploadFile = File(...), file_hash: str = Form(""), api_key: str = Depends(verify_api_key)):')

patch_endpoint('    # Early Rejection 50MB',
               '    limiter.check(request.client.host)\n    # Early Rejection 50MB')

patch_endpoint('async def get_job(job_id: str):',
               'async def get_job(job_id: str, request: Request, api_key: str = Depends(verify_api_key)):')
patch_endpoint('async def get_job(job_id: str, request: Request, api_key: str = Depends(verify_api_key)):',
               'async def get_job(job_id: str, request: Request, api_key: str = Depends(verify_api_key)):\n    limiter.check(request.client.host)')

with open('backend/app.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched app.py")
