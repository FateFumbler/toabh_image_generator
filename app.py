import os
import re
import uuid
import json
import base64
import requests
import threading
import subprocess
import sys
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from PIL import Image

from config import Config
from database import db, init_db, Prompt, GeneratedImage, ReferenceImage, Category, Character

# Import flux_gen for image generation
sys.path.insert(0, '/home/Fate/.openclaw/workspace/scripts')
from flux_gen import generate_image as flux_generate_image, DEFAULT_MODEL

# Import Google Gemini for image generation (New GenAI SDK)
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

app = Flask(__name__)
app.config.from_object(Config)
init_db(app)

# Track generation status
generation_status = {
    'is_generating': False,
    'stop_requested': False,
    'total': 0,
    'completed': 0,
    'current_prompt': '',
    'errors': []
}

@app.route('/api/generate/stop', methods=['POST'])
def stop_generation():
    global generation_status
    if generation_status['is_generating']:
        generation_status['stop_requested'] = True
        return jsonify({'stopped': True})
    return jsonify({'stopped': False, 'error': 'No generation in progress'})

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def get_model_directory(model_name):
    """Get or create directory for a model's reference images"""
    safe_name = secure_filename(model_name.lower().replace(' ', '_'))
    model_dir = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
    os.makedirs(model_dir, exist_ok=True)
    return model_dir, safe_name

@app.route('/')
def index():
    return render_template('index.html')

# ============ Prompt Routes ============

@app.route('/api/prompts', methods=['GET'])
def get_prompts():
    gender = request.args.get('gender', 'all')
    category = request.args.get('category', 'all')
    favorites_only = request.args.get('favorites', 'false').lower() == 'true'
    
    query = Prompt.query
    
    if gender != 'all':
        # Use case-insensitive filter
        query = query.filter(Prompt.gender.ilike(gender))
    if category != 'all':
        query = query.filter(Prompt.category.ilike(category))
    if favorites_only:
        query = query.filter(Prompt.favorite == True)
    
    prompts = query.order_by(Prompt.created_at.desc()).all()
    return jsonify([p.to_dict() for p in prompts])

@app.route('/api/prompts', methods=['POST'])
def add_prompt():
    data = request.json
    
    prompt = Prompt(
        theme=data.get('theme', ''),
        prompt_text=data.get('prompt_text', ''),
        gender=data.get('gender', 'female'),
        category=data.get('category', 'Polaroids'),
        model_name=data.get('model_name'),
        model_reference_directory=data.get('model_reference_directory')
    )
    
    db.session.add(prompt)
    db.session.commit()
    
    return jsonify(prompt.to_dict()), 201

@app.route('/api/prompts/bulk', methods=['POST'])
def add_bulk_prompts():
    data = request.json
    text = data.get('text', '')
    default_gender = data.get('gender', 'female')
    default_category = data.get('category', 'Polaroids')
    model_name = data.get('model_name')
    model_reference_directory = data.get('model_reference_directory')
    
    # Parse prompts - each line should be a prompt
    # Format: "Theme: Prompt text" or just "Prompt text"
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    added_count = 0
    
    for line in lines:
        if ':' in line:
            parts = line.split(':', 1)
            theme = parts[0].strip()
            prompt_text = parts[1].strip()
        else:
            theme = f"Prompt {added_count + 1}"
            prompt_text = line
        
        if prompt_text:
            prompt = Prompt(
                theme=theme,
                prompt_text=prompt_text,
                gender=default_gender,
                category=default_category,
                model_name=model_name,
                model_reference_directory=model_reference_directory
            )
            db.session.add(prompt)
            added_count += 1
    
    db.session.commit()
    
    return jsonify({'added': added_count, 'total_lines': len(lines)})

@app.route('/api/prompts/<int:prompt_id>', methods=['PUT'])
def update_prompt(prompt_id):
    prompt = Prompt.query.get_or_404(prompt_id)
    data = request.json
    
    prompt.theme = data.get('theme', prompt.theme)
    prompt.prompt_text = data.get('prompt_text', prompt.prompt_text)
    prompt.gender = data.get('gender', prompt.gender)
    prompt.category = data.get('category', prompt.category)
    prompt.favorite = data.get('favorite', prompt.favorite)
    
    db.session.commit()
    return jsonify(prompt.to_dict())

@app.route('/api/prompts/<int:prompt_id>', methods=['DELETE'])
def delete_prompt(prompt_id):
    prompt = Prompt.query.get_or_404(prompt_id)
    
    # Delete associated generated images
    for img in prompt.generated_images:
        try:
            if os.path.exists(img.file_path):
                os.remove(img.file_path)
        except:
            pass
        db.session.delete(img)
    
    db.session.delete(prompt)
    db.session.commit()
    
    return jsonify({'deleted': True})

@app.route('/api/prompts/bulk-delete', methods=['POST'])
def bulk_delete_prompts():
    data = request.json
    ids = data.get('ids', [])
    
    for prompt_id in ids:
        prompt = Prompt.query.get(prompt_id)
        if prompt:
            # Delete associated generated images
            for img in prompt.generated_images:
                try:
                    if os.path.exists(img.file_path):
                        os.remove(img.file_path)
                except:
                    pass
                db.session.delete(img)
            db.session.delete(prompt)
    
    db.session.commit()
    return jsonify({'deleted': len(ids)})

# ============ Reference Image Routes ============

@app.route('/api/reference-images', methods=['GET'])
def get_reference_images():
    model_name = request.args.get('model_name')
    if model_name:
        images = ReferenceImage.query.filter_by(model_name=model_name).all()
    else:
        images = ReferenceImage.query.all()
    return jsonify([img.to_dict() for img in images])

@app.route('/api/reference-images/upload', methods=['POST'])
def upload_reference_images():
    model_name = request.form.get('model_name', 'default_model')
    
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    model_dir, safe_name = get_model_directory(model_name)
    
    uploaded = []
    
    # Check existing count
    existing_count = ReferenceImage.query.filter_by(model_name=model_name).count()
    remaining_slots = Config.MAX_REFERENCE_IMAGES - existing_count
    
    for file in files[:remaining_slots]:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
            filepath = os.path.join(model_dir, unique_name)
            file.save(filepath)
            
            # Create thumbnail
            try:
                with Image.open(filepath) as img:
                    img.thumbnail((400, 400))
                    thumb_path = filepath.rsplit('.', 1)[0] + '_thumb.' + filepath.rsplit('.', 1)[1]
                    img.save(thumb_path)
            except:
                pass
            
            ref_img = ReferenceImage(
                model_name=model_name,
                file_path=filepath,
                file_name=filename
            )
            db.session.add(ref_img)
            uploaded.append(ref_img)
    
    db.session.commit()
    return jsonify([img.to_dict() for img in uploaded])

@app.route('/api/reference-images/<int:image_id>', methods=['DELETE'])
def delete_reference_image(image_id):
    img = ReferenceImage.query.get_or_404(image_id)
    
    try:
        if os.path.exists(img.file_path):
            os.remove(img.file_path)
        # Delete thumbnail if exists
        thumb_path = img.file_path.rsplit('.', 1)[0] + '_thumb.' + img.file_path.rsplit('.', 1)[1]
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
    except:
        pass
    
    db.session.delete(img)
    db.session.commit()
    
    return jsonify({'deleted': True})

@app.route('/api/reference-images/clear', methods=['POST'])
def clear_reference_images():
    model_name = request.json.get('model_name')
    
    if model_name:
        images = ReferenceImage.query.filter_by(model_name=model_name).all()
    else:
        images = ReferenceImage.query.all()
    
    for img in images:
        try:
            if os.path.exists(img.file_path):
                os.remove(img.file_path)
            thumb_path = img.file_path.rsplit('.', 1)[0] + '_thumb.' + img.file_path.rsplit('.', 1)[1]
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
        except:
            pass
        db.session.delete(img)
    
    db.session.commit()
    return jsonify({'deleted': len(images)})

# ============ Image Generation Routes ============

@app.route('/api/generate', methods=['POST'])
def generate_images():
    global generation_status
    
    data = request.json
    prompt_ids = data.get('prompt_ids', [])
    model = data.get('model', 'flux')
    resolution = data.get('resolution', '1k')
    aspect_ratio = data.get('aspect_ratio', '1:1')
    model_name = data.get('model_name', 'default_model')
    
    if generation_status['is_generating']:
        return jsonify({'error': 'Generation already in progress'}), 409
    
    if not prompt_ids:
        return jsonify({'error': 'No prompts selected'}), 400
    
    # Get prompts
    prompts = Prompt.query.filter(Prompt.id.in_(prompt_ids)).all()
    
    # Start generation in background thread
    thread = threading.Thread(
        target=generate_images_task,
        args=(prompts, model, resolution, aspect_ratio, model_name)
    )
    thread.start()
    
    return jsonify({'started': True, 'total': len(prompts)})

def generate_images_task(prompts, model, resolution, aspect_ratio, model_name):
    global generation_status
    
    with app.app_context():
        generation_status = {
            'is_generating': True,
            'stop_requested': False,
            'total': len(prompts),
            'completed': 0,
            'current_prompt': '',
            'errors': []
        }
        
        try:
            for prompt in prompts:
                if generation_status['stop_requested']:
                    generation_status['errors'].append("Generation stopped by user")
                    break
                    
                generation_status['current_prompt'] = prompt.theme
                
                # Simulate or actual generation
                # In production, replace with actual API calls
                try:
                    generate_single_image(prompt, model, resolution, aspect_ratio, model_name)
                except Exception as e:
                    generation_status['errors'].append(f"{prompt.theme}: {str(e)}")
                
                generation_status['completed'] += 1
        finally:
            generation_status['is_generating'] = False

def generate_image_with_gemini(prompt_text, reference_images=None, aspect_ratio='1:1', resolution='1K'):
    """Generate image using Google Gemini API with support for reference images (New SDK).
    
    Args:
        prompt_text: The text prompt for image generation
        reference_images: List of file paths to reference images (optional)
        aspect_ratio: Aspect ratio string (e.g., '1:1', '16:9', '9:16')
        resolution: '1K', '2K', or '4K'
        
    Returns:
        Bytes of the generated image
    """
    if not GEMINI_AVAILABLE:
        raise Exception("Google GenAI library not installed. Run: pip install google-genai")
    
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        raise Exception("GEMINI_API_KEY not found in environment or .env file")
    
    # Initialize Client
    client = genai.Client(api_key=api_key)
    
    # Prepare contents
    contents = []
    
    # Add reference images if provided (up to 14 supported by Gemini 3 Pro)
    if reference_images:
        for ref_path in reference_images[:14]:
            try:
                if os.path.exists(ref_path):
                    contents.append(Image.open(ref_path))
            except Exception as e:
                print(f"Warning: Could not load reference image {ref_path}: {e}")
                continue
    
    # Add the prompt text
    contents.append(prompt_text)
    
    # Build image config
    image_cfg_kwargs = {"image_size": resolution}
    if aspect_ratio:
        # Map our aspect ratios to the ones supported by the API if needed
        # Supported: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
        image_cfg_kwargs["aspect_ratio"] = aspect_ratio
    
    # Generate the image
    try:
        response = client.models.generate_content(
            model=Config.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(**image_cfg_kwargs)
            )
        )
        
        # Process response and extract image data
        for part in response.parts:
            if part.inline_data is not None:
                # If it's already bytes, return it
                if isinstance(part.inline_data.data, bytes):
                    return part.inline_data.data
                # If it's a string, it might be base64
                if isinstance(part.inline_data.data, str):
                    import base64
                    return base64.b64decode(part.inline_data.data)
        
        raise Exception("No image data in Gemini response")
        
    except Exception as e:
        raise Exception(f"Gemini generation failed: {str(e)}")


def generate_single_image(prompt, model, resolution, aspect_ratio, selected_model_name):
    """Generate a single image using the specified model (FLUX or Gemini)."""
    
    # Determine which model/character references to use
    # Priority: 
    # 1. Selected model in generation tab (if not 'default_model')
    # 2. Model associated with the prompt
    # 3. Default fallback
    
    actual_model_name = selected_model_name
    if selected_model_name == 'default_model' or not selected_model_name:
        if prompt.model_name:
            actual_model_name = prompt.model_name
    
    # Create output directory
    output_dir = os.path.join(app.config['GENERATED_FOLDER'], secure_filename(actual_model_name))
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{prompt.id}_{timestamp}_{uuid.uuid4().hex[:6]}.png"
    output_path = os.path.join(output_dir, filename)
    
    # Get reference images for this model
    reference_images = []
    ref_imgs = ReferenceImage.query.filter_by(model_name=actual_model_name).all()
    for ref_img in ref_imgs:
        if os.path.exists(ref_img.file_path):
            reference_images.append(ref_img.file_path)
            
    print(f"Generating image for prompt {prompt.id} using model {actual_model_name}. References: {len(reference_images)}")
    
    # Build the full prompt with aspect ratio instruction
    ratio_dimensions = {
        '1:1': 'square format',
        '16:9': 'widescreen landscape format',
        '9:16': 'vertical portrait format',
        '4:3': 'standard landscape format',
        '3:4': 'standard portrait format'
    }
    
    full_prompt = prompt.prompt_text
    
    # Add consistency instruction if reference images are present
    if reference_images:
        full_prompt = f"Using the provided images as a reference for the person's face and features, generate a photo: {full_prompt}"
    
    if aspect_ratio in ratio_dimensions:
        full_prompt += f". Image in {ratio_dimensions[aspect_ratio]}."
    
    # Generate image based on selected model
    try:
        if model == 'gemini':
            # Use Gemini for generation (New SDK)
            # Map resolution string ('1k', '2k') to API values ('1K', '2K')
            api_resolution = Config.RESOLUTIONS.get(resolution, '1K')
            
            img_data = generate_image_with_gemini(
                prompt_text=full_prompt,
                reference_images=reference_images if reference_images else None,
                aspect_ratio=aspect_ratio,
                resolution=api_resolution
            )
            
            if img_data is None:
                raise Exception("Gemini image generation returned None - check API key and model availability")
            
            # Save the generated image
            with open(output_path, 'wb') as f:
                f.write(img_data)
        
        else:
            # Use FLUX for generation (default)
            img_data = flux_generate_image(
                prompt=full_prompt,
                model=DEFAULT_MODEL,
                timeout=180,
                reference_images=reference_images if reference_images else None
            )
            
            if img_data is None:
                raise Exception("Image generation returned None - check API key and OpenRouter status")
            
            # Save the generated image
            with open(output_path, 'wb') as f:
                f.write(img_data)
            
            # Resize if needed based on resolution
            if resolution == '2k':
                try:
                    with Image.open(output_path) as img:
                        # Get current size
                        w, h = img.size
                        # Scale up to ~2k on the longer side
                        ratio = 2048 / max(w, h)
                        new_size = (int(w * ratio), int(h * ratio))
                        img_resized = img.resize(new_size, Image.Resampling.LANCZOS)
                        img_resized.save(output_path, quality=95)
                except Exception as resize_err:
                    print(f"Warning: Could not resize image: {resize_err}")
        
    except Exception as e:
        raise Exception(f"Image generation failed: {str(e)}")
    
    # Save to database
    gen_img = GeneratedImage(
        prompt_id=prompt.id,
        file_path=output_path,
        model_used=model,
        resolution=resolution,
        aspect_ratio=aspect_ratio
    )
    db.session.add(gen_img)
    db.session.commit()
    
    return output_path

@app.route('/api/generate/mock', methods=['POST'])
def mock_generate_images():
    """Mock endpoint for testing without API keys"""
    global generation_status
    
    data = request.json
    prompt_ids = data.get('prompt_ids', [])
    model = data.get('model', 'flux')
    resolution = data.get('resolution', '1k')
    aspect_ratio = data.get('aspect_ratio', '1:1')
    model_name = data.get('model_name', 'default')
    
    if generation_status['is_generating']:
        return jsonify({'error': 'Generation already in progress'}), 409
    
    prompts = Prompt.query.filter(Prompt.id.in_(prompt_ids)).all()
    
    thread = threading.Thread(
        target=generate_images_task,
        args=(prompts, model, resolution, aspect_ratio, model_name)
    )
    thread.start()
    
    return jsonify({'started': True, 'total': len(prompts), 'mock': True})

@app.route('/api/generation-status', methods=['GET'])
def get_generation_status():
    return jsonify(generation_status)

# ============ Generated Images Routes ============

@app.route('/api/generated-images', methods=['GET'])
def get_generated_images():
    model_name = request.args.get('model_name')
    prompt_id = request.args.get('prompt_id', type=int)
    
    query = GeneratedImage.query
    
    if prompt_id:
        query = query.filter_by(prompt_id=prompt_id)
    
    images = query.order_by(GeneratedImage.created_at.desc()).all()
    
    result = []
    for img in images:
        img_dict = img.to_dict()
        img_dict['prompt_theme'] = img.prompt.theme if img.prompt else None
        img_dict['prompt_gender'] = img.prompt.gender if img.prompt else None
        # Add character/reference name for grouping
        img_dict['character_name'] = img.prompt.model_name if img.prompt and img.prompt.model_name else "Default"
        result.append(img_dict)
    
    return jsonify(result)

@app.route('/api/generated-images/<int:image_id>', methods=['DELETE'])
def delete_generated_image(image_id):
    img = GeneratedImage.query.get_or_404(image_id)
    
    try:
        if os.path.exists(img.file_path):
            os.remove(img.file_path)
    except:
        pass
    
    db.session.delete(img)
    db.session.commit()
    
    return jsonify({'deleted': True})

@app.route('/api/generated-images/bulk-delete', methods=['POST'])
def bulk_delete_generated_images():
    data = request.json
    ids = data.get('ids', [])
    
    for image_id in ids:
        img = GeneratedImage.query.get(image_id)
        if img:
            try:
                if os.path.exists(img.file_path):
                    os.remove(img.file_path)
            except:
                pass
            db.session.delete(img)
    
    db.session.commit()
    return jsonify({'deleted': len(ids)})

@app.route('/api/generated-images/download/<int:image_id>')
def download_image(image_id):
    img = GeneratedImage.query.get_or_404(image_id)
    
    if os.path.exists(img.file_path):
        return send_file(img.file_path, as_attachment=True)
    else:
        return jsonify({'error': 'File not found'}), 404

# ============ Model Routes ============

@app.route('/api/models', methods=['GET'])
def get_models():
    return jsonify(Config.MODELS)

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([c.to_dict() for c in categories])

@app.route('/api/categories', methods=['POST'])
def add_category():
    data = request.json
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    if Category.query.filter_by(name=name).first():
        return jsonify({'error': 'Category already exists'}), 400
    
    category = Category(name=name)
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    category = Category.query.get_or_404(category_id)
    db.session.delete(category)
    db.session.commit()
    return jsonify({'deleted': True})

# ============ Character Routes ============

@app.route('/api/characters', methods=['GET'])
def get_characters():
    characters = Character.query.all()
    return jsonify([c.to_dict() for c in characters])

@app.route('/api/characters', methods=['POST'])
def add_character():
    data = request.json
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    if Character.query.filter_by(name=name).first():
        return jsonify({'error': 'Character already exists'}), 400
    
    character = Character(name=name)
    db.session.add(character)
    db.session.commit()
    return jsonify(character.to_dict()), 201

@app.route('/api/characters/<int:character_id>', methods=['DELETE'])
def delete_character(character_id):
    character = Character.query.get_or_404(character_id)
    
    # Delete associated reference images
    ref_images = ReferenceImage.query.filter_by(model_name=character.name).all()
    for img in ref_images:
        try:
            if os.path.exists(img.file_path):
                os.remove(img.file_path)
            thumb_path = img.file_path.rsplit('.', 1)[0] + '_thumb.' + img.file_path.rsplit('.', 1)[1]
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
        except:
            pass
        db.session.delete(img)
    
    db.session.delete(character)
    db.session.commit()
    return jsonify({'deleted': True})

@app.route('/api/resolutions', methods=['GET'])
def get_resolutions():
    return jsonify({
        'resolutions': Config.RESOLUTIONS,
        'aspect_ratios': list(Config.ASPECT_RATIOS.keys())
    })

@app.route('/api/model-names', methods=['GET'])
def get_model_names():
    """Get unique model names from reference images"""
    names = db.session.query(ReferenceImage.model_name).distinct().all()
    return jsonify([name[0] for name in names])

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics"""
    total_prompts = Prompt.query.count()
    total_generated = GeneratedImage.query.count()
    total_refs = ReferenceImage.query.count()
    
    return jsonify({
        'total_prompts': total_prompts,
        'total_generated': total_generated,
        'total_reference_images': total_refs
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
