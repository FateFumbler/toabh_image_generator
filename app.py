import os
import sqlite3
import uuid
import datetime
import subprocess
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'toabh-secret-key-2024'

# Configuration
UPLOAD_FOLDER = '/home/Fate/.openclaw/workspace/toabh/new_dashboard/uploads'
OUTPUT_FOLDER = '/home/Fate/.openclaw/workspace/toabh/new_dashboard/output'
DB_PATH = '/home/Fate/.openclaw/workspace/toabh/new_dashboard/prompts.db'
SCRIPTS_DIR = os.path.expanduser('~/.npm-global/lib/node_modules/openclaw/skills/nano-banana-pro/scripts')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            theme TEXT NOT NULL,
            prompt_text TEXT NOT NULL,
            gender TEXT NOT NULL,
            category TEXT NOT NULL,
            favorite INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/prompts', methods=['GET'])
def get_prompts():
    gender = request.args.get('gender')
    category = request.args.get('category')
    favorites_only = request.args.get('favorites') == 'true'
    
    conn = get_db_connection()
    query = "SELECT * FROM prompts WHERE 1=1"
    params = []
    
    if gender and gender != 'all':
        query += " AND gender = ?"
        params.append(gender.capitalize())
    
    if category and category != 'all':
        query += " AND category = ?"
        params.append(category)
    
    if favorites_only:
        query += " AND favorite = 1"
    
    query += " ORDER BY created_at DESC"
    
    prompts = conn.execute(query, params).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in prompts])

@app.route('/api/prompts', methods=['POST'])
def add_prompt():
    data = request.json
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO prompts (theme, prompt_text, gender, category)
        VALUES (?, ?, ?, ?)
    ''', (data['theme'], data['prompt_text'], data['gender'], data['category']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/prompts/bulk', methods=['POST'])
def add_bulk_prompts():
    data = request.json
    text = data.get('text', '')
    
    # Parse the bulk text
    prompts = []
    current_prompt = {}
    
    lines = text.strip().split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('Theme:'):
            if current_prompt:
                prompts.append(current_prompt)
            current_prompt = {'theme': line.replace('Theme:', '').strip()}
        elif line.startswith('Gender:'):
            current_prompt['gender'] = line.replace('Gender:', '').strip()
        elif line.startswith('Category:'):
            current_prompt['category'] = line.replace('Category:', '').strip()
        elif line.startswith('Prompt:'):
            current_prompt['prompt_text'] = line.replace('Prompt:', '').strip()
    
    if current_prompt:
        prompts.append(current_prompt)
    
    # Insert into database
    conn = get_db_connection()
    count = 0
    for p in prompts:
        if 'theme' in p and 'prompt_text' in p and 'gender' in p and 'category' in p:
            conn.execute('''
                INSERT INTO prompts (theme, prompt_text, gender, category)
                VALUES (?, ?, ?, ?)
            ''', (p['theme'], p['prompt_text'], p['gender'], p['category']))
            count += 1
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'count': count})

@app.route('/api/prompts/<int:prompt_id>', methods=['DELETE'])
def delete_prompt(prompt_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM prompts WHERE id = ?', (prompt_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/prompts/bulk-delete', methods=['POST'])
def bulk_delete_prompts():
    data = request.json
    ids = data.get('ids', [])
    
    conn = get_db_connection()
    for id in ids:
        conn.execute('DELETE FROM prompts WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/prompts/<int:prompt_id>/favorite', methods=['POST'])
def toggle_favorite(prompt_id):
    data = request.json
    favorite = 1 if data.get('favorite') else 0
    
    conn = get_db_connection()
    conn.execute('UPDATE prompts SET favorite = ? WHERE id = ?', (favorite, prompt_id))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/upload-reference', methods=['POST'])
def upload_reference():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = f"reference_{uuid.uuid4().hex}_{secure_filename(file.filename)}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'url': f'/uploads/{filename}'
        })
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/clear-reference', methods=['POST'])
def clear_reference():
    filename = request.json.get('filename')
    if filename:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    return jsonify({'success': True})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/generate', methods=['POST'])
def generate_images():
    data = request.json
    prompt_ids = data.get('prompt_ids', [])
    reference_filename = data.get('reference_filename')
    resolution = data.get('resolution', '1K')
    aspect_ratio = data.get('aspect_ratio', '1:1')
    
    if not prompt_ids:
        return jsonify({'error': 'No prompts selected'}), 400
    
    # Get prompts from database
    conn = get_db_connection()
    prompts = conn.execute('SELECT * FROM prompts WHERE id IN ({})'.format(
        ','.join('?' * len(prompt_ids))), prompt_ids).fetchall()
    conn.close()
    
    results = []
    
    # Build reference image path if provided
    reference_path = None
    if reference_filename:
        reference_path = os.path.join(app.config['UPLOAD_FOLDER'], reference_filename)
    
    for prompt_data in prompts:
        prompt_obj = dict(prompt_data)
        
        # Generate unique filename
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
        output_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}.png"
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
        
        try:
            # Build the command - use full path as filename
            cmd = [
                'uv', 'run',
                os.path.join(SCRIPTS_DIR, 'generate_image.py'),
                '--prompt', prompt_obj['prompt_text'],
                '--filename', output_path,
                '--resolution', resolution
            ]
            
            # Add aspect ratio if supported
            if aspect_ratio and aspect_ratio != '1:1':
                cmd.extend(['--aspect-ratio', aspect_ratio])
            
            # Add reference image if available
            if reference_path and os.path.exists(reference_path):
                cmd.extend(['-i', reference_path])
            
            # Add API key from environment if available
            gemini_key = os.environ.get('GEMINI_API_KEY')
            if gemini_key:
                cmd.extend(['--api-key', gemini_key])
            
            # Run the generation with 10 minute timeout
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600,
                env={**os.environ}
            )
            
            if result.returncode == 0 and os.path.exists(output_path):
                results.append({
                    'success': True,
                    'prompt_id': prompt_obj['id'],
                    'theme': prompt_obj['theme'],
                    'filename': output_filename,
                    'url': f'/output/{output_filename}'
                })
            else:
                results.append({
                    'success': False,
                    'prompt_id': prompt_obj['id'],
                    'theme': prompt_obj['theme'],
                    'error': result.stderr or 'Generation failed'
                })
                
        except Exception as e:
            results.append({
                'success': False,
                'prompt_id': prompt_obj['id'],
                'theme': prompt_obj['theme'],
                'error': str(e)
            })
    
    return jsonify({
        'success': True,
        'results': results
    })

@app.route('/output/<filename>')
def output_file(filename):
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename)

@app.route('/api/outputs', methods=['GET'])
def get_outputs():
    files = []
    output_dir = app.config['OUTPUT_FOLDER']
    
    if os.path.exists(output_dir):
        for f in sorted(os.listdir(output_dir), key=lambda x: os.path.getmtime(os.path.join(output_dir, x)), reverse=True):
            if f.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                files.append({
                    'filename': f,
                    'url': f'/output/{f}',
                    'created': os.path.getmtime(os.path.join(output_dir, f))
                })
    
    return jsonify(files)

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5001, debug=True)
