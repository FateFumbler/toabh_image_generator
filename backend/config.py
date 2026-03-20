import os
from dotenv import load_dotenv

# Load .env from parent directory (react_dashboard/)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Turso database credentials
    TURSO_DB_URL = os.environ.get('TURSO_DB_URL') or 'libsql://toabh-images-fatefumbler.aws-ap-south-1.turso.io'
    TURSO_AUTH_TOKEN = os.environ.get('TURSO_AUTH_TOKEN') or 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MDUyMzY2MjQsImlhdCI6MTc3MzcwMDYyNCwiaWQiOiIwMTljZjg4OS0xNjAxLTczMDEtYmJlMy1mY2MxNDQ5NjAzNWQiLCJyaWQiOiJiMmQ5MjY4OC0xODNlLTQwZWEtODBmMC0yNmY1YjM2YzI0Y2YifQ.-CwP35cmQC303vlvOrMM7UnnpBiS7KJcv0oUQsQGwSFYqFEG0NHumCgHl9_PtcJppp84p39PB_kTLkrpoGUhAQ'
    
    # Enable Turso sync (set to True to enable automatic sync to Turso)
    USE_TURSO = os.environ.get('USE_TURSO', 'false').lower() == 'true'
    
    # Get instance folder path
    instance_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'instance')
    
    # Use local SQLite database - Turso sync is manual via API endpoints
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(instance_folder, "toabh_imagen.db")}'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Engine options - standard SQLite settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'check_same_thread': False}
    }
    
    # Upload settings - use static folder for Vercel static file serving
    # Vercel serves files from 'static' at the /static URL path
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
    GENERATED_FOLDER = os.path.join(BASE_DIR, 'static', 'generated')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # Image generation settings
    MAX_REFERENCE_IMAGES = 8
    MAX_GENERATION_BATCH = 30
    
    # API Keys (should be set in environment variables)
    FLUX_API_KEY = os.environ.get('FLUX_API_KEY')
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    LEONARDO_API_KEY = os.environ.get('LEONARDO_API_KEY') or 'efe32a90-7188-4f43-9078-d667ad5d1255'
    
    # Leonardo AI settings
    LEONARDO_API_URL = "https://cloud.leonardo.ai/api/rest/v2"
    
    # Categories
    CATEGORIES = ['Polaroids', 'Portfolio', 'Indian', 'Swimwear/Lingerie']
    
    # Models
    MODELS = {
        'flux': 'FLUX 2 Pro',
        'gemini': 'Gemini Pro 3',
        'leonardo': 'Leonardo AI'
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
