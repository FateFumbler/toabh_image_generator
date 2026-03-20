import os, sys
sys.path.insert(0, '/home/Fate/.openclaw/workspace/toabh/react_dashboard/backend')
from dotenv import load_dotenv
load_dotenv('/home/Fate/.openclaw/workspace/toabh/react_dashboard/.env')
from google import genai
from google.genai import types
import httpx
from PIL import Image

api_key = os.environ.get('GEMINI_API_KEY')
print(f"API key available: {bool(api_key)}")

client = genai.Client(api_key=api_key, http_options=types.HttpOptions(
    timeout=1200000,
    client_args={'timeout': httpx.Timeout(timeout=1200, connect=10.0)}
))
print(f"Client timeout: {client._api_client._httpx_client.timeout}")

img = Image.new('RGB', (256, 256), color='blue')
contents = [img, 'Generate a simple blue sky landscape']

try:
    response = client.models.generate_content(
        model='gemini-3-pro-image-preview',
        contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=['TEXT', 'IMAGE']
        )
    )
    print("SUCCESS 1!")
except Exception as e:
    print(f"ERROR 1: {type(e).__name__}: {e}")
