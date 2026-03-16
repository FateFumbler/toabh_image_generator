import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Turso database - use env vars for production deployment
    TURSO_DB_URL = os.environ.get('TURSO_DB_URL') or 'libsql://toabh-images-fatefumbler.aws-ap-south-1.turso.io'
    TURSO_AUTH_TOKEN = os.environ.get('TURSO_AUTH_TOKEN') or 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MDUyMzIyODEsImlhdCI6MTc3MzY5NjI4MSwiaWQiOiIwMTljZjg4OS0xNjAxLTczMDEtYmJlMy1mY2MxNDQ5NjAzNWQiLCJyaWQiOiJiMmQ5MjY4OC0xODNlLTQwZWEtODBmMC0yNmY1YjM2YzI0Y2YifQ.jpya6xr9NXWNohqectUq4j54uGlBRlp53grJwGwHKyVtxhuA_VHTMpnk2fotAJOqCTQOcN1mBhYYWUXgpy7yAQ'
    
    # Use local SQLite (for now) - Turso sync already done
    # Production can switch to Turso by setting USE_TURSO=true
    if os.environ.get('USE_TURSO') == 'true':
        SQLALCHEMY_DATABASE_URI = 'sqlite:///toabh_imagen.db'  # Will sync with Turso
    else:
        SQLALCHEMY_DATABASE_URI = 'sqlite:///toabh_imagen.db'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
    GENERATED_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'generated')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # Image generation settings
    MAX_REFERENCE_IMAGES = 8
    MAX_GENERATION_BATCH = 30
    
    # API Keys (should be set in environment variables)
    FLUX_API_KEY = os.environ.get('FLUX_API_KEY')
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    
    # Categories
    CATEGORIES = ['Polaroids', 'Portfolio', 'Indian', 'Swimwear/Lingerie']
    
    # Models
    MODELS = {
        'flux': 'FLUX 2 Pro',
        'gemini': 'Gemini Pro 3'
    }
    
    # Model-specific settings
    GEMINI_MODEL = "gemini-3-pro-image-preview"
    
    # Resolutions
    RESOLUTIONS = {
        '1k': '1K',
        '2k': '2K',
        '4k': '4K'
    }
    
    # Aspect Ratios with pixel dimensions for Gemini
    ASPECT_RATIOS = {
        '1:1': (1, 1),
        '16:9': (16, 9),
        '9:16': (9, 16),
        '4:3': (4, 3),
        '3:4': (3, 4)
    }
    
    # Aspect ratio to size mapping for Gemini (width x height)
    ASPECT_RATIO_SIZES = {
        '1:1': (1024, 1024),
        '16:9': (1024, 576),
        '9:16': (576, 1024),
        '4:3': (1024, 768),
        '3:4': (768, 1024)
    }
