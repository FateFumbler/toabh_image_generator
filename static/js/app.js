// Toabh AI Imagen - Main JavaScript

// State
let promptsData = [];
let favoritesData = [];
let selectedPrompts = new Set();
let referenceImages = [];
let generationQueue = [];
let currentModel = 'flux';
let currentResolution = '1k';
let currentAspectRatio = '1:1';
let currentModelName = 'default_model';

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupFilters();
    setupReferenceUpload();
    setupPromptModals();
    setupGeneration();
    loadInitialData();
    
    // Refresh results button
    document.getElementById('refresh-results-btn')?.addEventListener('click', loadResults);
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            
            // Update nav active state
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Show section
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(`${section}-section`).classList.add('active');
            
            // Load section data
            if (section === 'prompts') loadPrompts();
            if (section === 'favorites') loadFavorites();
            if (section === 'results') loadResults();
            if (section === 'generate') updateQueueList();
        });
    });
    
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadPrompts();
        loadStats();
    });
}

function setupFilters() {
    const genderFilter = document.getElementById('gender-filter');
    const categoryFilter = document.getElementById('category-filter');
    
    genderFilter.addEventListener('change', loadPrompts);
    categoryFilter.addEventListener('change', loadPrompts);
}

function setupReferenceUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('ref-upload');
    const modelNameInput = document.getElementById('model-name');
    
    uploadZone.addEventListener('click', () => fileInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    modelNameInput.addEventListener('change', () => {
        currentModelName = modelNameInput.value || 'default_model';
        loadReferenceImages();
    });
    
    document.getElementById('clear-ref-btn').addEventListener('click', clearReferenceImages);
}

async function handleFiles(files) {
    if (files.length === 0) return;
    
    const modelName = currentModelName;
    const formData = new FormData();
    formData.append('model_name', modelName);
    
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    try {
        const response = await fetch('/api/reference-images/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            referenceImages = [...referenceImages, ...data];
            renderReferenceImages();
            showToast(`Uploaded ${data.length} images`, 'success');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed', 'error');
    }
}

async function loadReferenceImages() {
    const modelName = currentModelName;
    
    try {
        const response = await fetch(`/api/reference-images?model_name=${modelName}`);
        referenceImages = await response.json();
        renderReferenceImages();
    } catch (error) {
        console.error('Error loading reference images:', error);
    }
}

function renderReferenceImages() {
    const preview = document.getElementById('reference-preview');
    const countBadge = document.getElementById('ref-count');
    
    countBadge.textContent = `${referenceImages.length}/8`;
    
    if (referenceImages.length === 0) {
        preview.innerHTML = '';
        return;
    }
    
    preview.innerHTML = referenceImages.map(img => `
        <div class="ref-image" data-id="${img.id}">
            <img src="${img.file_path}" alt="Reference">
            <button class="remove-btn" onclick="deleteReferenceImage(${img.id})">×</button>
        </div>
    `).join('');
}

async function deleteReferenceImage(id) {
    try {
        const response = await fetch(`/api/reference-images/${id}`, { method: 'DELETE' });
        if (response.ok) {
            referenceImages = referenceImages.filter(img => img.id !== id);
            renderReferenceImages();
        }
    } catch (error) {
        console.error('Error deleting reference:', error);
    }
}

async function clearReferenceImages() {
    try {
        const response = await fetch('/api/reference-images/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_name: currentModelName })
        });
        
        if (response.ok) {
            referenceImages = [];
            renderReferenceImages();
            showToast('Reference images cleared', 'success');
        }
    } catch (error) {
        console.error('Error clearing references:', error);
    }
}

function setupPromptModals() {
    // Add Prompt Modal
    const addPromptBtn = document.getElementById('add-prompt-btn');
    const addPromptModal = document.getElementById('add-prompt-modal');
    const savePromptBtn = document.getElementById('save-prompt-btn');
    
    addPromptBtn.addEventListener('click', () => {
        addPromptModal.classList.add('open');
        loadModelNames();
    });
    
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
        });
    });
    
    savePromptBtn.addEventListener('click', addSinglePrompt);
    
    // Bulk Add Modal
    const bulkAddBtn = document.getElementById('bulk-add-btn');
    const bulkAddModal = document.getElementById('bulk-add-modal');
    const saveBulkBtn = document.getElementById('save-bulk-btn');
    
    bulkAddBtn.addEventListener('click', () => {
        bulkAddModal.classList.add('open');
    });
    
    saveBulkBtn.addEventListener('click', addBulkPrompts);
    
    // Delete Modal
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    confirmDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.remove('open');
    });
}

async function loadModelNames() {
    try {
        const response = await fetch('/api/model-names');
        const names = await response.json();
        
        const selects = [
            document.getElementById('modal-model-select'),
            document.getElementById('gen-model-select')
        ];
        
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">None</option>' + 
                names.map(name => `<option value="${name}">${name}</option>`).join('');
            if (currentValue) select.value = currentValue;
        });
    } catch (error) {
        console.error('Error loading model names:', error);
    }
}

async function loadInitialData() {
    await loadAvailableModels();
    await loadPrompts();
    await loadReferenceImages();
    await loadStats();
    await loadModelNames();
}

async function loadPrompts() {
    const gender = document.getElementById('gender-filter').value;
    const category = document.getElementById('category-filter').value;
    
    try {
        const response = await fetch(`/api/prompts?gender=${gender}&category=${category}`);
        promptsData = await response.json();
        renderPrompts();
    } catch (error) {
        console.error('Error loading prompts:', error);
    }
}

async function loadFavorites() {
    try {
        const response = await fetch('/api/prompts?favorites=true');
        favoritesData = await response.json();
        renderFavorites();
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('total-prompts').textContent = stats.total_prompts || 0;
        document.getElementById('total-generated').textContent = stats.total_generated || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function renderPrompts() {
    const grid = document.getElementById('prompts-grid');
    
    if (promptsData.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-lightbulb"></i><p>No prompts yet. Add some!</p></div>';
        return;
    }
    
    grid.innerHTML = promptsData.map(prompt => `
        <div class="prompt-card ${selectedPrompts.has(prompt.id) ? 'selected' : ''}" data-id="${prompt.id}">
            <div class="prompt-card-header">
                <input type="checkbox" class="prompt-checkbox" 
                    data-id="${prompt.id}" 
                    ${selectedPrompts.has(prompt.id) ? 'checked' : ''}>
                <span class="prompt-card-title">${escapeHtml(prompt.theme)}</span>
                <div class="prompt-card-actions">
                    <button class="icon-btn heart ${prompt.favorite ? 'active' : ''}" 
                        data-id="${prompt.id}" title="Favorite">
                        ${prompt.favorite ? '❤️' : '🤍'}
                    </button>
                    <button class="icon-btn delete" data-id="${prompt.id}" title="Delete">🗑️</button>
                </div>
            </div>
            <p class="prompt-card-preview">${escapeHtml(prompt.prompt_text)}</p>
            <div class="prompt-card-meta">
                <span class="badge ${prompt.gender.toLowerCase()}">${prompt.gender}</span>
                <span class="badge">${prompt.category}</span>
            </div>
        </div>
    `).join('');
    
    attachPromptListeners();
    updateBulkActions();
}

function renderFavorites() {
    const grid = document.getElementById('favorites-grid');
    
    if (favoritesData.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-heart"></i><p>No favorites yet</p></div>';
        return;
    }
    
    grid.innerHTML = favoritesData.map(prompt => `
        <div class="prompt-card ${selectedPrompts.has(prompt.id) ? 'selected' : ''}" data-id="${prompt.id}">
            <div class="prompt-card-header">
                <input type="checkbox" class="prompt-checkbox" 
                    data-id="${prompt.id}" 
                    ${selectedPrompts.has(prompt.id) ? 'checked' : ''}>
                <span class="prompt-card-title">${escapeHtml(prompt.theme)}</span>
                <div class="prompt-card-actions">
                    <button class="icon-btn heart active" data-id="${prompt.id}" title="Remove from favorites">❤️</button>
                    <button class="icon-btn queue-btn" data-id="${prompt.id}" title="Add to queue">➕</button>
                </div>
            </div>
            <p class="prompt-card-preview">${escapeHtml(prompt.prompt_text)}</p>
            <div class="prompt-card-meta">
                <span class="badge ${prompt.gender.toLowerCase()}">${prompt.gender}</span>
                <span class="badge">${prompt.category}</span>
            </div>
        </div>
    `).join('');
    
    attachFavoritesListeners();
}

function attachPromptListeners() {
    document.querySelectorAll('.prompt-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                selectedPrompts.add(id);
            } else {
                selectedPrompts.delete(id);
            }
            renderPrompts();
            updateQueueList();
        });
    });
    
    document.querySelectorAll('.icon-btn.heart').forEach(btn => {
        btn.addEventListener('click', () => toggleFavorite(parseInt(btn.dataset.id)));
    });
    
    document.querySelectorAll('.icon-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => deletePrompt(parseInt(btn.dataset.id)));
    });
}

function attachFavoritesListeners() {
    // Checkboxes for selection
    document.querySelectorAll('#favorites-section .prompt-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                selectedPrompts.add(id);
            } else {
                selectedPrompts.delete(id);
            }
            renderFavorites();
            updateQueueList();
        });
    });
    
    // Heart button to unfavorite
    document.querySelectorAll('#favorites-section .icon-btn.heart').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            await toggleFavorite(id);
            loadFavorites(); // Refresh favorites list
        });
    });
    
    // Queue button to quickly add to generation queue
    document.querySelectorAll('#favorites-section .icon-btn.queue-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            selectedPrompts.add(id);
            renderFavorites();
            updateQueueList();
            showToast('Added to generation queue', 'success');
        });
    });
}

function updateBulkActions() {
    const bulkBar = document.getElementById('bulk-actions-bar');
    const selectedCount = document.getElementById('selected-count');
    
    if (selectedPrompts.size > 0) {
        bulkBar.style.display = 'flex';
        selectedCount.textContent = `${selectedPrompts.size} selected`;
    } else {
        bulkBar.style.display = 'none';
    }
}

async function addSinglePrompt() {
    const form = document.getElementById('add-prompt-form');
    const formData = new FormData(form);
    
    const data = {
        theme: formData.get('theme'),
        prompt_text: formData.get('prompt_text'),
        gender: formData.get('gender'),
        category: formData.get('category'),
        model_name: currentModelName
    };
    
    if (!data.theme || !data.prompt_text) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            document.getElementById('add-prompt-modal').classList.remove('open');
            form.reset();
            loadPrompts();
            loadStats();
            showToast('Prompt added successfully', 'success');
        }
    } catch (error) {
        console.error('Error adding prompt:', error);
        showToast('Failed to add prompt', 'error');
    }
}

async function addBulkPrompts() {
    const text = document.querySelector('.bulk-textarea').value;
    const gender = document.querySelector('#bulk-add-form select[name="gender"]').value;
    const category = document.querySelector('#bulk-add-form select[name="category"]').value;
    
    if (!text.trim()) {
        showToast('Please paste some prompts', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/prompts/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                gender: gender,
                category: category,
                model_name: currentModelName
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('bulk-add-modal').classList.remove('open');
            document.querySelector('.bulk-textarea').value = '';
            loadPrompts();
            loadStats();
            showToast(`${data.added} prompts added successfully`, 'success');
        }
    } catch (error) {
        console.error('Error adding bulk prompts:', error);
        showToast('Failed to add prompts', 'error');
    }
}

async function deletePrompt(id) {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    try {
        const response = await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            selectedPrompts.delete(id);
            loadPrompts();
            loadStats();
            showToast('Prompt deleted', 'success');
        }
    } catch (error) {
        console.error('Error deleting prompt:', error);
        showToast('Failed to delete prompt', 'error');
    }
}

async function toggleFavorite(id) {
    const prompt = promptsData.find(p => p.id === id);
    if (!prompt) return;
    
    try {
        await fetch(`/api/prompts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorite: !prompt.favorite })
        });
        
        loadPrompts();
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
}

// Store available models from API
let availableModels = {};

// Load available models from API
async function loadAvailableModels() {
    try {
        const response = await fetch('/api/models');
        availableModels = await response.json();
        renderModelOptions();
    } catch (error) {
        console.error('Error loading models:', error);
        // Fallback models
        availableModels = {
            'flux': 'FLUX 2 Pro',
            'gemini': 'Gemini Pro 3'
        };
    }
}

// Render model toggle buttons
function renderModelOptions() {
    const modelToggle = document.querySelector('.model-toggle');
    if (!modelToggle) return;
    
    modelToggle.innerHTML = Object.entries(availableModels).map(([key, name]) => `
        <button class="model-option ${currentModel === key ? 'active' : ''}" data-model="${key}">
            <i class="fas fa-${key === 'flux' ? 'bolt' : 'gem'}"></i>
            ${name}
        </button>
    `).join('');
    
    // Re-attach listeners
    document.querySelectorAll('.model-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.model-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentModel = btn.dataset.model;
        });
    });
}

// Generation Setup
function setupGeneration() {
    // Model toggle - listeners attached in renderModelOptions
    
    // Resolution
    document.getElementById('resolution-select').addEventListener('change', (e) => {
        currentResolution = e.target.value;
    });
    
    // Aspect Ratio
    document.getElementById('aspect-ratio-select').addEventListener('change', (e) => {
        currentAspectRatio = e.target.value;
    });
    
    // Generate button
    document.getElementById('start-generation-btn').addEventListener('click', startGeneration);
    
    // Stop button
    document.getElementById('stop-generation-btn').addEventListener('click', stopGeneration);
    
    // Clear queue
    document.getElementById('clear-queue-btn').addEventListener('click', () => {
        selectedPrompts.clear();
        renderPrompts();
        updateQueueList();
    });
    
    // Add to queue from selected
    document.getElementById('select-generate-btn').addEventListener('click', () => {
        // Switch to generate section
        document.querySelector('[data-section="generate"]').click();
    });
    
    // Bulk delete
    document.getElementById('bulk-delete-btn').addEventListener('click', bulkDeletePrompts);
}

function updateQueueList() {
    const queueList = document.getElementById('queue-list');
    const queueCount = document.getElementById('queue-count');
    const generateBtn = document.getElementById('start-generation-btn');
    
    queueCount.textContent = selectedPrompts.size;
    generateBtn.disabled = selectedPrompts.size === 0;
    
    if (selectedPrompts.size === 0) {
        queueList.innerHTML = '<p class="empty-state">Select prompts from the Prompts or Favorites section to add them here</p>';
        return;
    }
    
    // Combine prompts from both sources to find selected ones
    const allPrompts = [...promptsData, ...favoritesData];
    const uniquePrompts = [];
    const seenIds = new Set();
    
    for (const p of allPrompts) {
        if (selectedPrompts.has(p.id) && !seenIds.has(p.id)) {
            uniquePrompts.push(p);
            seenIds.add(p.id);
        }
    }
    
    queueList.innerHTML = uniquePrompts.map(p => `
        <div class="queue-item">
            <input type="checkbox" checked data-id="${p.id}">
            <span>${escapeHtml(p.theme)}</span>
            <span class="badge ${p.gender.toLowerCase()}">${p.gender}</span>
        </div>
    `).join('');
    
    // Add listeners to queue checkboxes to allow removing from queue
    document.querySelectorAll('.queue-item input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            if (!e.target.checked) {
                selectedPrompts.delete(id);
                renderPrompts();
                renderFavorites();
                updateQueueList();
            }
        });
    });
}

async function startGeneration() {
    if (selectedPrompts.size === 0) return;
    
    const promptIds = Array.from(selectedPrompts);
    const generateBtn = document.getElementById('start-generation-btn');
    const stopBtn = document.getElementById('stop-generation-btn');
    const statusCard = document.getElementById('generation-status-card');
    
    // Get the reference model name from the generation settings dropdown
    const selectedRefModel = document.getElementById('gen-model-select').value;
    
    generateBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';
    statusCard.style.display = 'block';
    
    // Clear previous errors from status
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const currentPromptText = document.getElementById('current-prompt');
    
    progressFill.style.width = '0%';
    progressText.textContent = `0 / ${promptIds.length} completed`;
    currentPromptText.textContent = 'Starting...';
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt_ids: promptIds,
                model: currentModel,
                resolution: currentResolution,
                aspect_ratio: currentAspectRatio,
                model_name: selectedRefModel || 'default_model'
            })
        });
        
        if (response.ok) {
            // Poll for status - the polling function will handle hiding the card when done
            pollGenerationStatus();
        } else {
            const error = await response.json();
            showToast(error.error || 'Generation failed to start', 'error');
            generateBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'none';
            statusCard.style.display = 'none';
        }
    } catch (error) {
        console.error('Generation error:', error);
        showToast('Generation failed to start', 'error');
        generateBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
        statusCard.style.display = 'none';
    }
}

async function stopGeneration() {
    const stopBtn = document.getElementById('stop-generation-btn');
    stopBtn.disabled = true;
    stopBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Stopping...';
    
    try {
        const response = await fetch('/api/generate/stop', {
            method: 'POST'
        });
        if (response.ok) {
            showToast('Stopping generation...', 'info');
        }
    } catch (error) {
        console.error('Stop error:', error);
    }
}

async function pollGenerationStatus() {
    const checkStatus = async () => {
        try {
            const response = await fetch('/api/generation-status');
            const status = await response.json();
            
            const progressFill = document.getElementById('progress-fill');
            const progressText = document.getElementById('progress-text');
            const currentPrompt = document.getElementById('current-prompt');
            const statusCard = document.getElementById('generation-status-card');
            const generateBtn = document.getElementById('start-generation-btn');
            
            const percent = status.total > 0 ? (status.completed / status.total) * 100 : 0;
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${status.completed} / ${status.total} completed`;
            currentPrompt.textContent = status.current_prompt || '-';
            
            if (!status.is_generating) {
                // HIDE the status card when finished
                statusCard.style.display = 'none';
                generateBtn.style.display = 'inline-flex';
                const stopBtn = document.getElementById('stop-generation-btn');
                stopBtn.style.display = 'none';
                stopBtn.disabled = false;
                stopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
                
                if (status.errors.length > 0) {
                    // Show first few errors in detail
                    const errorMsg = status.errors.slice(0, 3).join('; ');
                    const more = status.errors.length > 3 ? ` +${status.errors.length - 3} more` : '';
                    showToast(`Errors: ${errorMsg}${more}`, 'error');
                } else if (status.total > 0) {
                    showToast('Images generated successfully!', 'success');
                }
                
                loadResults();
                loadStats();
                return;
            }
            
            setTimeout(checkStatus, 2000);
        } catch (error) {
            console.error('Status poll error:', error);
            document.getElementById('generation-status-card').style.display = 'none';
            document.getElementById('start-generation-btn').disabled = false;
        }
    };
    
    checkStatus();
}

// Results
async function loadResults() {
    const resultsContainer = document.getElementById('results-container');
    
    try {
        const response = await fetch('/api/generated-images');
        const images = await response.json();
        
        if (images.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i><p>No generated images yet</p></div>';
            return;
        }
        
        // Group by Reference Character Name
        const grouped = {};
        images.forEach(img => {
            const charName = img.character_name || 'Default';
            if (!grouped[charName]) grouped[charName] = [];
            grouped[charName].push(img);
        });
        
        resultsContainer.innerHTML = Object.entries(grouped).map(([charName, imgs]) => {
            return `
            <div class="model-group">
                <div class="model-group-header" onclick="this.nextElementSibling.classList.toggle('open')">
                    <h3>Character: ${charName}</h3>
                    <div class="header-right">
                        <span class="badge">${imgs.length} images</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="model-group-content">
                    <div class="results-grid">
                        ${imgs.map(img => `
                            <div class="result-item">
                                <img src="${img.file_path}" alt="Generated">
                                <div class="result-meta">
                                    <span class="badge model-tag">${img.model_used.toUpperCase()}</span>
                                    <span class="badge">${img.resolution || '1k'}</span>
                                    <span class="badge">${img.aspect_ratio || '1:1'}</span>
                                </div>
                                <div class="result-item-actions">
                                    <a href="${img.file_path}" download class="download-btn">
                                        <i class="fas fa-download"></i>
                                    </a>
                                    <button class="delete-btn" onclick="deleteGeneratedImage(${img.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `}).join('');
        
    } catch (error) {
        console.error('Error loading results:', error);
    }
}

async function deleteGeneratedImage(id) {
    if (!confirm('Delete this image?')) return;
    
    try {
        const response = await fetch(`/api/generated-images/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadResults();
            loadStats();
            showToast('Image deleted', 'success');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        showToast('Failed to delete image', 'error');
    }
}

async function bulkDeletePrompts() {
    if (selectedPrompts.size === 0) return;
    
    if (!confirm(`Delete ${selectedPrompts.size} selected prompts?`)) return;
    
    const ids = Array.from(selectedPrompts);
    
    try {
        const response = await fetch('/api/prompts/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        
        if (response.ok) {
            selectedPrompts.clear();
            loadPrompts();
            loadStats();
            showToast('Prompts deleted', 'success');
        }
    } catch (error) {
        console.error('Error bulk deleting:', error);
        showToast('Failed to delete prompts', 'error');
    }
}

// Utilities
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Make functions globally available
window.deleteReferenceImage = deleteReferenceImage;
window.deleteGeneratedImage = deleteGeneratedImage;
