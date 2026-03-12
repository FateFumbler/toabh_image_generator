# TOABH AI Image Generator

A Flask-based dashboard for managing prompts and generating images using Google's Gemini 3 Pro Image API (Nano Banana Pro).

## Requirements

- Python 3.10+
- Flask
- uv (for running the image generation script)

## Setup

1. Set the GEMINI_API_KEY environment variable:
```bash
export GEMINI_API_KEY="your-api-key-here"
```

2. Install dependencies:
```bash
pip install flask
```

3. Run the application:
```bash
python3 app.py
```

4. Open in browser:
```
http://localhost:5001
```

## Features

- Gender filter (Male/Female/All)
- Reference image upload and preview
- Single prompt addition
- Bulk prompt import (parse from formatted text)
- Category filtering (Polaroids, Portfolio, Indian, Swimwear/Lingerie)
- Favorites system
- Bulk delete with confirmation
- Image generation using Gemini 3 Pro
- Results gallery with download buttons

## Database

SQLite database stores all prompts at:
```
/home/Fate/.openclaw/workspace/toabh/new_dashboard/prompts.db
```

## Generated Images

Saved to:
```
/home/Fate/.openclaw/workspace/toabh/new_dashboard/output/
```

## API Endpoints

- `GET /api/prompts` - List all prompts (supports ?gender=&category=&favorites=true)
- `POST /api/prompts` - Add single prompt
- `POST /api/prompts/bulk` - Bulk add prompts
- `DELETE /api/prompts/<id>` - Delete prompt
- `POST /api/prompts/bulk-delete` - Bulk delete
- `POST /api/prompts/<id>/favorite` - Toggle favorite
- `POST /api/upload-reference` - Upload reference image
- `POST /api/clear-reference` - Clear reference image
- `POST /generate` - Generate images from selected prompts
- `GET /api/outputs` - List generated images
