# Toabh AI Imagen Dashboard

AI-powered image generation dashboard with reference image support for consistent character/face generation.

## Features

- **Multiple AI Models**: FLUX 2 Pro and Gemini Pro 3 image generation
- **Reference Images**: Upload up to 8 reference images per character for face consistency
- **Prompt Management**: Add single or bulk prompts with categories
- **Categories**: Polaroids, Portfolio, Indian, Swimwear/Lingerie
- **Gender Filtering**: Filter prompts by Male/Female
- **Favorites**: Mark prompts as favorites for quick access
- **Resolution Options**: 1K (1024x1024) and 2K (2048x2048)
- **Aspect Ratios**: 1:1, 16:9, 9:16, 4:3, 3:4

## Setup

### Prerequisites

```bash
pip install flask flask-sqlalchemy pillow google-generativeai requests
```

### Running the Dashboard

```bash
cd /home/Fate/.openclaw/workspace/toabh/new_dashboard
python3.12 app.py
```

The dashboard runs on `http://localhost:5000`

### API Keys

Create a `.env` file in the dashboard directory:

```
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

## Usage Guide

### 1. Upload Reference Images

1. Go to the **Reference Images** section
2. Enter a character/look name (e.g., "shweta_portfolio", "model_001")
3. Click upload zone or drag & drop images
4. Upload up to 8 reference images per character

### 2. Add Prompts

**Single Prompt:**
1. Click "Add Prompt"
2. Fill in: Theme Name, Prompt Text, Gender, Category
3. Click Save

**Bulk Add:**
1. Click "Bulk Add"
2. Paste multiple prompts (one per line)
3. Format: `Theme: Prompt text` or just `Prompt text`
4. Set default Gender and Category
5. Click "Add Prompts"

### 3. Select Prompts

- Use checkboxes on prompt cards to select
- Filter by Gender and Category
- View favorites in the Favorites tab

### 4. Generate Images

1. Go to **Generate** section
2. Select **AI Model** (FLUX 2 Pro or Gemini Pro 3)
3. Choose **Resolution** and **Aspect Ratio**
4. Select **Reference Set** (which character references to use)
5. Click **Start Generation**

### 5. View Results

- Generated images appear in the **Results** section
- Grouped by AI model used
- Download individual images or delete

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/prompts` | GET | List prompts (supports ?gender=&category=&favorites=) |
| `/api/prompts` | POST | Add single prompt |
| `/api/prompts/bulk` | POST | Bulk add prompts |
| `/api/prompts/<id>` | DELETE | Delete prompt |
| `/api/reference-images/upload` | POST | Upload reference images |
| `/api/generate` | POST | Generate images |
| `/api/generated-images` | GET | List generated images |
| `/api/models` | GET | List available AI models |
| `/api/stats` | GET | Dashboard statistics |

## Database Schema

### prompts
- id, theme, prompt_text, gender, category, favorite, created_at, model_name, model_reference_directory

### generated_images
- id, prompt_id, file_path, model_used, resolution, aspect_ratio, created_at

### reference_images
- id, model_name, file_path, file_name, created_at

## File Structure

```
new_dashboard/
├── app.py              # Flask backend
├── config.py           # Configuration
├── database.py         # SQLAlchemy models
├── requirements.txt    # Python dependencies
├── static/
│   ├── css/style.css  # Styles
│   ├── js/app.js      # Frontend JavaScript
│   ├── uploads/       # Reference images
│   └── generated/    # Generated images
└── templates/
    └── index.html    # Main dashboard
```

## Troubleshooting

**Generation fails with errors:**
- Check API keys are set in `.env`
- Check OpenRouter/Gemini API credits

**Reference images not loading:**
- Ensure images are in correct model folder
- Check file permissions

## Credits

- FLUX 2 Pro via OpenRouter
- Gemini Pro 3 via Google AI
