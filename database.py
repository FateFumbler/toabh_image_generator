from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

db = SQLAlchemy()

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
        # Get relative path from static folder
        static_idx = self.file_path.find('/static/')
        url_path = self.file_path[static_idx:] if static_idx != -1 else self.file_path
        
        return {
            'id': self.id,
            'prompt_id': self.prompt_id,
            'prompt_number': self.prompt_number,
            'file_path': url_path,
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
        # Get relative path from static folder
        static_idx = self.file_path.find('/static/')
        url_path = self.file_path[static_idx:] if static_idx != -1 else self.file_path
        
        return {
            'id': self.id,
            'model_name': self.model_name,
            'file_path': url_path,
            'file_name': self.file_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
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
