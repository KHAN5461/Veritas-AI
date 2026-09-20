# Hosting on Google Colab (Free GPU) via GitHub

You can easily host this FastAPI backend on Google Colab to take advantage of their **Free T4 GPUs**, and expose it globally using `ngrok`. Instead of using Google Drive, we will pull the code directly from your GitHub repository.

## Step 1: Create a New Colab Notebook
1. Go to [Google Colab](https://colab.research.google.com/).
2. Click **Runtime > Change runtime type** and set the Hardware Accelerator to **T4 GPU**.

## Step 2: Run this Code in Colab
Paste the following code into a single cell and run it. It will clone your repo, install dependencies, start the FastAPI server in the background, and generate a global public URL!

```python
import os

# 1. Clone the repository from GitHub (Replace with your actual GitHub repo URL)
!git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
%cd YOUR_REPO_NAME

# 2. Clean up old packages and install everything
!pip uninstall -y ffmpeg
!pip install fastapi uvicorn python-multipart transformers torch torchaudio torchvision librosa opencv-python-headless soundfile optimum[onnxruntime] pyngrok ffmpeg-python

# 3. Kill any old crashed servers just in case
os.system("pkill uvicorn")

# 4. Start the FastAPI server safely in the background
os.system("nohup uvicorn app:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &")

# 5. Expose the server globally using Ngrok
from pyngrok import ngrok

# 👉 Replace YOUR_TOKEN_HERE with your real Ngrok Authtoken
ngrok.set_auth_token("YOUR_TOKEN_HERE") 

public_url = ngrok.connect("127.0.0.1:8000")
print(f"✅ Your Global API URL is: {public_url}")
```

## Step 3: Access Your App
1. When you run the cell, it will print your Ngrok URL.
2. Wait about 15-20 seconds for the backend models to download and load into GPU memory.
3. Open your local `index.html` file, paste the Ngrok URL into the API box, and drag-and-drop a file!

*(Note: If anything goes wrong, you can create a new cell and run `!cat server.log` to view the server errors).*
