import os
import re
import uuid
import json
import base64
import requests
import threading
import subprocess
import sys
import io
import zipfile
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

# Serve static files (uploads)
@app.route('/static/<path:filename>')
def serve_static(filename):
    from flask import send_from_directory
    import os
    return send_from_directory(os.path.join(os.path.dirname(__file__), 'static'), filename)

# Track generation status
generation_status = {
    'is_generating': False,
    'stop_requested': False,
    'total': 0,
    'completed': 0,
    'current_prompt': '',
    'errors': []
}

# Knowledge Base for Prompt Generator
PROMPT_GENERATOR_KB_FILE = os.path.join(app.instance_path, 'prompt_generator_kb.txt')

@app.route('/api/prompt-generator/kb', methods=['GET', 'POST'])
def handle_prompt_kb():
    if request.method == 'POST':
        data = request.json
        kb_text = data.get('kb', '')
        # Ensure instance directory exists
        if not os.path.exists(app.instance_path):
            os.makedirs(app.instance_path)
        with open(PROMPT_GENERATOR_KB_FILE, 'w') as f:
            f.write(kb_text)
        return jsonify({'status': 'success'})
    
    kb_text = ""
    if os.path.exists(PROMPT_GENERATOR_KB_FILE):
        with open(PROMPT_GENERATOR_KB_FILE, 'r') as f:
            kb_text = f.read()
    else:
        # Default KB rules
        kb_text = """### Prompt Style Rules:
- Start with 'Theme: '
- Followed by a descriptive prompt text.
- Use cinematic lighting terms.
- Focus on facial details and atmosphere.
- Example: Theme: Sunset Glow - High-end fashion editorial, soft golden hour lighting on face, sharp eyes, cinematic bokeh."""
        if not os.path.exists(app.instance_path):
            os.makedirs(app.instance_path)
        with open(PROMPT_GENERATOR_KB_FILE, 'w') as f:
            f.write(kb_text)
            
    return jsonify({'kb': kb_text})

@app.route('/api/prompt-generator/generate', methods=['POST'])
def generate_prompts_from_images():
    if 'images' not in request.files:
        return jsonify({'error': 'No images provided'}), 400
    
    images = request.files.getlist('images')
    if len(images) > 20:
        return jsonify({'error': 'Maximum 20 images allowed'}), 400
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return jsonify({'error': 'Gemini API key not configured'}), 500

    # Load KB rules
    kb_text = ""
    if os.path.exists(PROMPT_GENERATOR_KB_FILE):
        with open(PROMPT_GENERATOR_KB_FILE, 'r') as f:
            kb_text = f.read()
    
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        
        generated_prompts = []
        
        for img_file in images:
            # Read image data
            img_data = img_file.read()
            # Reset file pointer for any other use
            img_file.seek(0)
            
            # Use Gemini to analyze image
            prompt_instruction = f"""Analyze this image and generate a structured prompt for an AI image generator.

STRICT RULES - FOLLOW EXACTLY:
{kb_text}

CRITICAL: Your response MUST be in the exact format:
Theme: [Theme Name] - [Detailed prompt description]

DO NOT include any other text, explanation, or formatting. Return ONLY the Theme line."""
            
            response = client.models.generate_content(
                model="gemini-2.0-flash", # Using flash for faster analysis
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_text(text=prompt_instruction),
                            types.Part.from_bytes(data=img_data, mime_type=img_file.content_type)
                        ]
                    )
                ]
            )
            
            if response.text:
                generated_prompts.append(response.text.strip())
            else:
                generated_prompts.append("Error: Failed to generate prompt for this image.")
                
        return jsonify({'prompts': generated_prompts})
        
    except Exception as e:
        print(f"Prompt generation error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/prompts/bulk-save', methods=['POST'])
def bulk_save_to_library():
    data = request.json
    prompts_text = data.get('prompts', '')
    category_id = data.get('category_id')
    gender = data.get('gender', 'FEMALE')
    
    if not prompts_text:
        return jsonify({'error': 'No prompts provided'}), 400
    
    # Fetch category name from Category table
    category_name = 'Polaroids'  # default fallback
    if category_id:
        category = Category.query.get(category_id)
        if category:
            category_name = category.name
        
    # Standard parsing logic for prompts
    new_prompts = []
    lines = prompts_text.strip().split('\n')
    for line in lines:
        if not line.strip(): continue
        
        # Look for Theme: Name - Prompt format
        match = re.match(r'Theme:\s*(.*?)\s*-\s*(.*)', line)
        if match:
            theme = match.group(1).strip()
            prompt_text = match.group(2).strip()
        else:
            # Fallback for "Theme: Name" or just prompt text
            if line.startswith('Theme:'):
                theme = line.replace('Theme:', '').strip()
                prompt_text = theme
            else:
                theme = line[:30] + "..." if len(line) > 30 else line
                prompt_text = line.strip()
        
        # Generate next prompt number
        prompt_number = get_next_prompt_number()
                
        prompt = Prompt(
            theme=theme,
            prompt_text=prompt_text,
            category=category_name,
            gender=gender.lower(),
            prompt_number=prompt_number
        )
        db.session.add(prompt)
        new_prompts.append(prompt)
        
    try:
        db.session.commit()
        return jsonify({'status': 'success', 'count': len(new_prompts)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Existing routes...


# Track image edit status (for background editing) - queue-based for multiple edits
# Each edit task has: id, image_id, instruction, status (queued/processing/completed/error), 
# created_at, completed_at, error, edited_image_path
edit_queue = []
edit_queue_lock = threading.Lock()
edit_task_counter = 0
edit_processing_thread = None

def get_next_edit_id():
    global edit_task_counter
    with edit_queue_lock:
        edit_task_counter += 1
        return edit_task_counter

def start_edit_processor():
    """Start the background edit processor thread if not already running."""
    global edit_processing_thread
    if edit_processing_thread is None or not edit_processing_thread.is_alive():
        edit_processing_thread = threading.Thread(target=process_edit_queue, daemon=True)
        edit_processing_thread.start()

def process_edit_queue():
    """Process edit tasks from the queue one at a time."""
    while True:
        task_to_process = None
        
        with edit_queue_lock:
            # Find next queued task
            for task in edit_queue:
                if task['status'] == 'queued':
                    task['status'] = 'processing'
                    task['started_at'] = datetime.utcnow().isoformat()
                    task_to_process = task
                    break
        
        if task_to_process is None:
            # No tasks to process, sleep and check again
            import time
            time.sleep(1)
            continue
        
        # Process the task
        try:
            with app.app_context():
                image_id = task_to_process['image_id']
                instruction = task_to_process['instruction']
                
                # Get the original image
                original_img = GeneratedImage.query.get(image_id)
                if not original_img:
                    raise Exception("Image not found")
                
                if not os.path.exists(original_img.file_path):
                    raise Exception("Original image file not found")
                
                # Use Gemini to edit the image
                edited_image_data = edit_image_with_gemini(
                    original_image_path=original_img.file_path,
                    instruction=instruction
                )
                
                if not edited_image_data:
                    raise Exception("Gemini returned no image data")
                
                # Create a backup first
                backup_path = original_img.file_path + '.backup'
                if os.path.exists(original_img.file_path):
                    import shutil
                    shutil.copy2(original_img.file_path, backup_path)
                
                # Save the edited image
                with open(original_img.file_path, 'wb') as f:
                    f.write(edited_image_data)
                
                # Clean up backup if save was successful
                if os.path.exists(backup_path):
                    os.remove(backup_path)
                
                # Update edited_at timestamp
                original_img.edited_at = datetime.utcnow()
                db.session.commit()
                
                # Update task status
                with edit_queue_lock:
                    for task in edit_queue:
                        if task['id'] == task_to_process['id']:
                            task['status'] = 'completed'
                            task['completed_at'] = datetime.utcnow().isoformat()
                            task['success'] = True
                            task['edited_image_path'] = original_img.file_path
                            break
                            
        except Exception as e:
            print(f"Background image editing error: {str(e)}")
            with edit_queue_lock:
                for task in edit_queue:
                    if task['id'] == task_to_process['id']:
                        task['status'] = 'error'
                        task['completed_at'] = datetime.utcnow().isoformat()
                        task['error'] = str(e)
                        task['success'] = False
                        break

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

def get_next_prompt_number():
    """Generate the next prompt number (e.g., P001, P002) based on existing prompts."""
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

@app.route('/api/prompts', methods=['POST'])
def add_prompt():
    data = request.json
    
    prompt = Prompt(
        theme=data.get('theme', ''),
        prompt_text=data.get('prompt_text', ''),
        gender=data.get('gender', 'female'),
        category=data.get('category', 'Polaroids'),
        model_name=data.get('model_name'),
        model_reference_directory=data.get('model_reference_directory'),
        prompt_number=get_next_prompt_number()
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
    
    # Limit to 50 prompts max
    MAX_PROMPTS = 50
    if len(lines) > MAX_PROMPTS:
        lines = lines[:MAX_PROMPTS]
    
    added_count = 0
    untitled_count = 0
    
    # Get starting number for bulk add
    current_prompt_number = get_next_prompt_number()
    
    for line in lines:
        if ':' in line:
            parts = line.split(':', 1)
            theme = parts[0].strip()
            prompt_text = parts[1].strip()
        else:
            # Lines without colon: treat whole line as prompt text with "Untitled" theme
            theme = "Untitled"
            prompt_text = line
            untitled_count += 1
        
        if prompt_text:
            prompt = Prompt(
                theme=theme,
                prompt_text=prompt_text,
                gender=default_gender,
                category=default_category,
                model_name=model_name,
                model_reference_directory=model_reference_directory,
                prompt_number=current_prompt_number
            )
            db.session.add(prompt)
            added_count += 1
            
            # Increment prompt number for next prompt
            try:
                num = int(current_prompt_number[1:])
                current_prompt_number = f"P{num + 1:03d}"
            except (ValueError, IndexError):
                pass
    
    db.session.commit()
    
    return jsonify({'added': added_count, 'total_lines': len(lines), 'untitled': untitled_count})

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
        aspect_ratio=aspect_ratio,
        prompt_number=prompt.prompt_number,
        character_name=actual_model_name if actual_model_name and actual_model_name != 'default_model' else None
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
        img_dict['prompt_number'] = img.prompt.prompt_number if img.prompt else None
        # Use stored character_name only if explicitly set (not None), otherwise fallback to prompt.model_name
        if not img.character_name:
            img_dict['character_name'] = img.prompt.model_name if img.prompt and img.prompt.model_name else "Ungrouped"
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

@app.route('/api/generated-images/bulk-download', methods=['POST'])
def bulk_download_images():
    """Download multiple images as a ZIP file"""
    data = request.json
    ids = data.get('ids', [])
    
    if not ids:
        return jsonify({'error': 'No image IDs provided'}), 400
    
    # Get images by IDs
    images = GeneratedImage.query.filter(GeneratedImage.id.in_(ids)).all()
    
    if not images:
        return jsonify({'error': 'No images found'}), 404
    
    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for idx, img in enumerate(images):
            if os.path.exists(img.file_path):
                # Get file extension
                ext = os.path.splitext(img.file_path)[1] or '.png'
                # Create filename: P001_character_1.png
                prompt_num = img.prompt.prompt_number if img.prompt else f'img{idx+1}'
                char_name = re.sub(r'[^a-z0-9]', '_', (img.character_name or 'Ungrouped').lower())
                filename = f"{prompt_num}_{char_name}_{idx+1}{ext}"
                
                # Read file and add to ZIP
                with open(img.file_path, 'rb') as f:
                    zipf.writestr(filename, f.read())
    
    zip_buffer.seek(0)
    
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name='selected_images.zip'
    )

@app.route('/api/generated-images/delete-all/<character_name>', methods=['POST'])
def delete_all_for_character(character_name):
    """Delete all images for a specific character"""
    # URL decode the character name
    char_name = character_name
    
    # Find all images for this character
    images = GeneratedImage.query.filter(
        GeneratedImage.character_name.ilike(char_name)
    ).all()
    
    # If no character_name match, try to find by model_name in prompt
    if not images:
        prompts = Prompt.query.filter(
            Prompt.model_name.ilike(char_name)
        ).all()
        prompt_ids = [p.id for p in prompts]
        images = GeneratedImage.query.filter(
            GeneratedImage.prompt_id.in_(prompt_ids)
        ).all() if prompt_ids else []
    
    deleted_count = 0
    for img in images:
        try:
            if os.path.exists(img.file_path):
                os.remove(img.file_path)
        except:
            pass
        db.session.delete(img)
        deleted_count += 1
    
    db.session.commit()
    return jsonify({'deleted': deleted_count})

# ============ Image Editing Endpoint (Queue-based) ============

@app.route('/api/edit-image', methods=['POST'])
def edit_image():
    """Edit an image using Google Gemini API with the original image as reference.
    Runs in background queue to avoid blocking the UI."""
    data = request.json
    image_id = data.get('image_id')
    instruction = data.get('instruction', '').strip()
    
    if not image_id:
        return jsonify({'error': 'Image ID is required'}), 400
    
    if not instruction:
        return jsonify({'error': 'Edit instruction is required'}), 400
    
    # Get the original image
    original_img = GeneratedImage.query.get(image_id)
    if not original_img:
        return jsonify({'error': 'Image not found'}), 404
    
    if not os.path.exists(original_img.file_path):
        return jsonify({'error': 'Original image file not found'}), 404
    
    # Check if this image is already being edited (queued or processing)
    with edit_queue_lock:
        for task in edit_queue:
            if task['image_id'] == image_id and task['status'] in ['queued', 'processing']:
                return jsonify({
                    'error': 'This image is already being edited',
                    'existing_task_id': task['id'],
                    'status': task['status']
                }), 409
    
    # Create edit task
    task_id = get_next_edit_id()
    task = {
        'id': task_id,
        'image_id': image_id,
        'instruction': instruction,
        'status': 'queued',  # queued, processing, completed, error
        'created_at': datetime.utcnow().isoformat(),
        'started_at': None,
        'completed_at': None,
        'error': None,
        'success': False,
        'edited_image_path': None
    }
    
    # Add to queue
    with edit_queue_lock:
        edit_queue.append(task)
    
    # Start the processor if not running
    start_edit_processor()
    
    return jsonify({
        'success': True,
        'message': 'Image added to edit queue',
        'task_id': task_id
    })


@app.route('/api/edit-status', methods=['GET'])
def get_edit_status():
    """Get the current status of all image editing tasks (for polling)."""
    with edit_queue_lock:
        # Return queue copy with status info
        queue_status = []
        for task in edit_queue:
            queue_status.append({
                'id': task['id'],
                'image_id': task['image_id'],
                'instruction': task['instruction'],
                'status': task['status'],
                'created_at': task['created_at'],
                'started_at': task.get('started_at'),
                'completed_at': task.get('completed_at'),
                'error': task.get('error'),
                'success': task.get('success', False)
            })
        
        # Clean up completed tasks older than 5 minutes
        current_time = datetime.utcnow()
        cleanup_threshold = 300  # 5 minutes
        edit_queue[:] = [t for t in edit_queue 
            if t['status'] != 'completed' or 
            (t.get('completed_at') and 
             (current_time - datetime.fromisoformat(t['completed_at'])).total_seconds() < cleanup_threshold)]
        
        return jsonify({
            'queue': queue_status,
            'total': len(queue_status),
            'processing': sum(1 for t in queue_status if t['status'] == 'processing'),
            'queued': sum(1 for t in queue_status if t['status'] == 'queued'),
            'completed': sum(1 for t in queue_status if t['status'] == 'completed'),
            'error': sum(1 for t in queue_status if t['status'] == 'error')
        })


@app.route('/api/edit-status/<int:task_id>', methods=['GET'])
def get_edit_task_status(task_id):
    """Get status of a specific edit task."""
    with edit_queue_lock:
        for task in edit_queue:
            if task['id'] == task_id:
                return jsonify({
                    'id': task['id'],
                    'image_id': task['image_id'],
                    'instruction': task['instruction'],
                    'status': task['status'],
                    'created_at': task['created_at'],
                    'started_at': task.get('started_at'),
                    'completed_at': task.get('completed_at'),
                    'error': task.get('error'),
                    'success': task.get('success', False)
                })
    return jsonify({'error': 'Task not found'}), 404


def edit_image_with_gemini(original_image_path, instruction):
    """Edit an image using Google Gemini API.
    
    Uses the original image as a reference and applies the user's editing instruction.
    Since Gemini doesn't have a direct edit endpoint, we generate a new image
    using the original as reference along with the editing instruction.
    
    Args:
        original_image_path: Path to the original image file
        instruction: Text instruction for editing (e.g., "remove text", "fix background")
        
    Returns:
        Bytes of the edited image
    """
    if not GEMINI_AVAILABLE:
        raise Exception("Google GenAI library not installed. Run: pip install google-genai")
    
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        raise Exception("GEMINI_API_KEY not found in environment or .env file")
    
    # Initialize Client with longer timeout for image operations
    client = genai.Client(api_key=api_key, http_options={'timeout': 600})
    
    # Get original image dimensions for consistent output
    with Image.open(original_image_path) as img:
        width, height = img.size
        # Determine aspect ratio
        if width == height:
            aspect_ratio = '1:1'
        elif width > height:
            aspect_ratio = '16:9' if width / height > 1.5 else '4:3'
        else:
            aspect_ratio = '9:16' if height / width > 1.5 else '3:4'
    
    # Prepare the prompt with instruction
    # The instruction is added to modify the original image
    full_prompt = f"Using the provided image as a reference, {instruction}. Maintain the same subject, pose, and composition. High quality, professional photography."
    
    # Prepare contents - original image + instruction
    contents = []
    
    # Add the original image as reference
    try:
        contents.append(Image.open(original_image_path))
    except Exception as e:
        raise Exception(f"Could not load original image: {str(e)}")
    
    # Add the editing instruction
    contents.append(full_prompt)
    
    # Build image config - try to match original dimensions
    image_cfg_kwargs = {}
    
    # Use the original image's aspect ratio
    image_cfg_kwargs["aspect_ratio"] = aspect_ratio
    
    # Try to use the original resolution (within API limits)
    max_dim = max(width, height)
    if max_dim >= 2048:
        resolution = '4K'
    elif max_dim >= 1024:
        resolution = '2K'
    else:
        resolution = '1K'
    image_cfg_kwargs["image_size"] = resolution
    
    # Generate the edited image
    try:
        response = client.models.generate_content(
            model=Config.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(**image_cfg_kwargs),
                http_options=types.HttpOptions(timeout=1200)
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
        raise Exception(f"Gemini editing failed: {str(e)}")

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

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    category = Category.query.get_or_404(category_id)
    data = request.json
    new_name = data.get('name', '').strip()
    
    if not new_name:
        return jsonify({'error': 'Name is required'}), 400
    
    if Category.query.filter(Category.name == new_name, Category.id != category_id).first():
        return jsonify({'error': 'Category name already exists'}), 400
    
    old_name = category.name
    
    # Update the category name
    category.name = new_name
    db.session.commit()
    
    # Update all prompts that have this category
    prompts_updated = Prompt.query.filter(Prompt.category == old_name).all()
    for prompt in prompts_updated:
        prompt.category = new_name
    db.session.commit()
    
    return jsonify({
        'id': category.id,
        'name': category.name,
        'prompts_updated': len(prompts_updated)
    })

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
    result = []
    for char in characters:
        char_dict = char.to_dict()
        # Get reference images for this character
        ref_images = ReferenceImage.query.filter_by(model_name=char.name).all()
        char_dict['reference_images'] = [img.to_dict() for img in ref_images]
        char_dict['image_count'] = len(ref_images)
        result.append(char_dict)
    return jsonify(result)

@app.route('/api/characters', methods=['POST'])
def add_character():
    # Check if this is a multipart form request (with file uploads) or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        name = request.form.get('name', '').strip()
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        
        if Character.query.filter_by(name=name).first():
            return jsonify({'error': 'Character already exists'}), 400
        
        character = Character(name=name)
        db.session.add(character)
        db.session.commit()
        
        # Handle reference image uploads
        uploaded_images = []
        if 'files' in request.files:
            files = request.files.getlist('files')
            model_dir, safe_name = get_model_directory(name)
            
            existing_count = ReferenceImage.query.filter_by(model_name=name).count()
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
                        model_name=name,
                        file_path=filepath,
                        file_name=filename
                    )
                    db.session.add(ref_img)
                    uploaded_images.append(ref_img)
            
            db.session.commit()
        
        # Return character with reference images
        char_dict = character.to_dict()
        char_dict['reference_images'] = [img.to_dict() for img in uploaded_images]
        char_dict['image_count'] = len(uploaded_images)
        return jsonify(char_dict), 201
    else:
        # JSON request (original behavior)
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

@app.route('/api/characters/<int:character_id>', methods=['PUT'])
def update_character(character_id):
    character = Character.query.get_or_404(character_id)
    
    # Check if this is a multipart form request (with file uploads) or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        new_name = request.form.get('name', '').strip()
        
        # Update name if provided and different
        if new_name and new_name != character.name:
            # Check if new name already exists
            if Character.query.filter(Character.name == new_name, Character.id != character_id).first():
                return jsonify({'error': 'Character name already exists'}), 400
            
            # Update reference images model_name
            old_name = character.name
            ref_images = ReferenceImage.query.filter_by(model_name=old_name).all()
            for img in ref_images:
                img.model_name = new_name
            
            character.name = new_name
        
        # Handle new reference image uploads
        uploaded_images = []
        if 'files' in request.files:
            files = request.files.getlist('files')
            model_dir, safe_name = get_model_directory(character.name)
            
            existing_count = ReferenceImage.query.filter_by(model_name=character.name).count()
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
                        model_name=character.name,
                        file_path=filepath,
                        file_name=filename
                    )
                    db.session.add(ref_img)
                    uploaded_images.append(ref_img)
            
            db.session.commit()
        
        db.session.commit()
        
        # Return updated character
        char_dict = character.to_dict()
        ref_images = ReferenceImage.query.filter_by(model_name=character.name).all()
        char_dict['reference_images'] = [img.to_dict() for img in ref_images]
        char_dict['image_count'] = len(ref_images)
        return jsonify(char_dict)
    else:
        # JSON request - update name only
        data = request.json
        new_name = data.get('name', '').strip()
        
        if new_name and new_name != character.name:
            # Check if new name already exists
            if Character.query.filter(Character.name == new_name, Character.id != character_id).first():
                return jsonify({'error': 'Character name already exists'}), 400
            
            # Update reference images model_name
            old_name = character.name
            ref_images = ReferenceImage.query.filter_by(model_name=old_name).all()
            for img in ref_images:
                img.model_name = new_name
            
            character.name = new_name
            db.session.commit()
        
        char_dict = character.to_dict()
        ref_images = ReferenceImage.query.filter_by(model_name=character.name).all()
        char_dict['reference_images'] = [img.to_dict() for img in ref_images]
        char_dict['image_count'] = len(ref_images)
        return jsonify(char_dict)

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

@app.route('/api/debug/images', methods=['GET'])
def debug_images():
    """Debug endpoint to check image paths"""
    images = GeneratedImage.query.all()
    result = []
    for img in images[:10]:  # Limit to first 10
        result.append({
            'id': img.id,
            'file_path': img.file_path,
            'file_exists': os.path.exists(img.file_path),
            'character_name': img.character_name,
            'prompt_id': img.prompt_id
        })
    return jsonify({
        'count': len(images),
        'sample': result,
        'generated_folder': app.config['GENERATED_FOLDER']
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
