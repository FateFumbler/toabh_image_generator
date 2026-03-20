from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

db = SQLAlchemy()

# Sync function that can be called after commits
def sync_to_turso():
    """Sync database to Turso after changes."""
    try:
        # Import app context to get config
        from flask import current_app
        if not current_app.config.get('USE_TURSO', False):
            return {'success': True, 'message': 'Turso disabled'}
        
        import subprocess
        turso_db_url = current_app.config.get('TURSO_DB_URL', '')
        if not turso_db_url:
            return {'success': False, 'message': 'No Turso URL'}
        
        # Use turso CLI to sync
        db_name = turso_db_url.split('://')[1] if '://' in turso_db_url else turso_db_url
        
        result = subprocess.run(
            ['turso', 'db', 'sync', db_name],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            return {'success': True, 'message': 'Synced to Turso'}
        else:
            return {'success': False, 'message': result.stderr}
    except FileNotFoundError:
        return {'success': False, 'message': 'Turso CLI not found'}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def generate_next_prompt_number():
    """Generate the next prompt number (e.g., P001, P002) based on existing prompts."""
    from .models import Prompt
    # Import here to avoid circular imports when used in models
    
    # Get the maximum existing prompt number
    max_prompt = Prompt.query.filter(
        Prompt.prompt_number.isnot(None)
    ).order_by(Prompt.prompt_number.desc()).first()
    
    if max_prompt and max_prompt.prompt_number:
        # Extract number from existing (e.g., "P001" -> 1)
        try:
            num = int(max_prompt.prompt_number[1:])
            return f"P{num + 1:03d}"
        except (ValueError, IndexError):
            pass
    
    # Start from P001 if no existing prompts or error
    return "P001"

class Prompt(db.Model):
    __tablename__ = 'prompts'
    
    id = db.Column(db.Integer, primary_key=True)
    theme = db.Column(db.String(200), nullable=False)
    prompt_text = db.Column(db.Text, nullable=False)
    gender = db.Column(db.String(20), nullable=False)  # 'male' or 'female'
    category = db.Column(db.String(50), nullable=False)
    favorite = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    model_name = db.Column(db.String(100), nullable=True)
    model_reference_directory = db.Column(db.String(500), nullable=True)
    prompt_number = db.Column(db.String(10), unique=True, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'theme': self.theme,
            'prompt_text': self.prompt_text,
            'gender': self.gender,
            'category': self.category,
            'favorite': self.favorite,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'model_name': self.model_name,
            'model_reference_directory': self.model_reference_directory,
            'prompt_number': self.prompt_number
        }

class GeneratedImage(db.Model):
    __tablename__ = 'generated_images'
    
    id = db.Column(db.Integer, primary_key=True)
    prompt_id = db.Column(db.Integer, db.ForeignKey('prompts.id'), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    model_used = db.Column(db.String(50), nullable=False)
    resolution = db.Column(db.String(20), nullable=False)
    aspect_ratio = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    edited_at = db.Column(db.DateTime, nullable=True)  # Track when image was last edited
    prompt_number = db.Column(db.String(10), nullable=True)
    character_name = db.Column(db.String(100), nullable=True)  # Store character name for grouping
    
    prompt = db.relationship('Prompt', backref=db.backref('generated_images', cascade='save-update'))
    
    def to_dict(self):
        # Return URL path for generated images (served from /static/generated/)
        # Extract path relative to the static/generated folder
        static_base = '/static/generated/'
        if self.file_path and static_base in self.file_path:
            relative_path = self.file_path.split(static_base)[-1]
        else:
            # Fallback to just basename if path structure is different
            relative_path = os.path.basename(self.file_path)
        
        return {
            'id': self.id,
            'prompt_id': self.prompt_id,
            'prompt_number': self.prompt_number,
            'file_path': f'{static_base}{relative_path}',
            'model_used': self.model_used,
            'resolution': self.resolution,
            'aspect_ratio': self.aspect_ratio,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'edited_at': self.edited_at.isoformat() if self.edited_at else None,
            'character_name': self.character_name if self.character_name else 'Ungrouped'
        }

class ReferenceImage(db.Model):
    __tablename__ = 'reference_images'
    
    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(100), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        # Return URL path for reference images (served from /static/uploads/)
        # Extract path relative to the static/uploads folder
        static_base = '/static/uploads/'
        if self.file_path and static_base in self.file_path:
            relative_path = self.file_path.split(static_base)[-1]
        else:
            # Fallback to just basename if path structure is different
            relative_path = os.path.basename(self.file_path)
        
        return {
            'id': self.id,
            'model_name': self.model_name,
            'file_path': f'{static_base}{relative_path}',
            'file_name': self.file_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        # Count prompts with this category name
        prompt_count = Prompt.query.filter_by(category=self.name).count()
        return {
            'id': self.id,
            'name': self.name,
            'prompt_count': prompt_count
        }

class Character(db.Model):
    __tablename__ = 'characters'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
        
        # Seed default categories if none exist
        if Category.query.count() == 0:
            defaults = ['Polaroids', 'Portfolio', 'Indian', 'Swimwear/Lingerie']
            for cat_name in defaults:
                db.session.add(Category(name=cat_name))
            db.session.commit()
            
        # Seed default characters if none exist
        if Character.query.count() == 0:
            # Check if we have existing reference images to migrate names from
            existing_names = db.session.query(ReferenceImage.model_name).distinct().all()
            names = [n[0] for n in existing_names] if existing_names else ['default_model']
            for name in names:
                if not Character.query.filter_by(name=name).first():
                    db.session.add(Character(name=name))
            db.session.commit()
        
        # Create upload directories
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        os.makedirs(app.config['GENERATED_FOLDER'], exist_ok=True)
