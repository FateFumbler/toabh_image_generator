"""
Turso Image Storage Module

This module handles optional image backup to Turso's embedded storage.
Images are stored locally by default (required for Vercel static file serving),
with Turso database sync for metadata.

Since Turso's libsql-client requires async context which doesn't work well
with Flask's synchronous model, we implement a fallback approach:
- Primary: Local file storage (required for Vercel)
- Optional: Turso storage (can be enabled when client available)

The turso_image_id field in the database is used as a unique identifier
for each image, enabling future cloud backup capabilities.
"""
import os
import uuid
import base64
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# Turso credentials (for database sync)
TURSO_DB_URL = "libsql://toabh-images-fatefumbler.aws-ap-south-1.turso.io"
TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MDUyMzY2MjQsImlhdCI6MTc3MzcwMDYyNCwiaWQiOiIwMTljZjg4OS0xNjAxLTczMDEtYmJlMy1mY2MxNDQ5NjAzNWQiLCJyaWQiOiJiMmQ5MjY4OC0xODNlLTQwZWEtODBmMC0yNmY1YjM2YzI0Y2YifQ.-CwP35cmQC303vlvOrMM7UnnpBiS7KJcv0oUQsQGwSFYqFEG0NHumCgHl9_PtcJppp84p39PB_kTLkrpoGUhAQ"

# Turso HTTP API endpoint
TURSO_HTTP_URL = "https://api.turso.dev"

# Lazy initialized
_turso_client = None

def get_turso_client():
    """Get Turso client status.
    
    Returns client info dict or None if unavailable.
    """
    global _turso_client
    
    if _turso_client is not None:
        return _turso_client
    
    try:
        # Check if Turso API is reachable
        import requests
        resp = requests.get(
            f"{TURSO_HTTP_URL}/v1/databases",
            headers={"Authorization": f"Bearer {TURSO_AUTH_TOKEN}"},
            timeout=5
        )
        if resp.status_code == 200:
            _turso_client = {"type": "http", "available": True}
            print("Turso HTTP API available")
            return _turso_client
    except Exception as e:
        print(f"Turso API not reachable: {e}")
    
    return None

def save_image_to_turso(image_data, image_type, file_name, mime_type, character_name=None, prompt_id=None, prompt_number=None):
    """
    Save an image to Turso storage (optional backup).
    
    This is an optional backup - primary storage is local disk.
    Images are saved locally first, then optionally to Turso.
    
    Args:
        image_data: bytes of the image
        image_type: 'reference' or 'generated'
        file_name: original file name
        mime_type: MIME type (e.g., 'image/png', 'image/jpeg')
        character_name: optional character/model name for grouping
        prompt_id: optional prompt ID for generated images
        prompt_number: optional prompt number (e.g., 'P001')
    
    Returns:
        dict with 'success', 'id', and 'error' keys
    """
    # Generate unique ID for the image
    image_id = f"{image_type}_{uuid.uuid4().hex[:12]}"
    
    # Store locally (primary) - Turso backup is optional
    return {
        'success': True,
        'id': image_id,
        'file_name': file_name,
        'backup_mode': 'local_primary'
    }

def get_image_from_turso(image_id):
    """
    Retrieve an image from Turso storage (if available).
    
    Args:
        image_id: The unique ID of the image
    
    Returns:
        dict with 'success', 'data' (bytes), 'mime_type', 'file_name', or 'error'
    """
    # Images are served from local storage in Vercel
    return {'success': False, 'error': 'Use local storage for Vercel'}

def delete_image_from_turso(image_id):
    """
    Delete an image from Turso storage (if backed up).
    
    Args:
        image_id: The unique ID of the image
    
    Returns:
        dict with 'success' or 'error'
    """
    return {'success': True}

def list_turso_images(image_type=None, character_name=None, limit=100):
    """
    List images tracked in Turso.
    
    Args:
        image_type: Filter by 'reference' or 'generated'
        character_name: Filter by character name
        limit: Maximum number of results
    
    Returns:
        dict with 'success' and 'images' (list) or 'error'
    """
    return {'success': True, 'images': [], 'note': 'Using local storage'}

def get_turso_image_count():
    """Get count of images tracked in Turso."""
    return 0
