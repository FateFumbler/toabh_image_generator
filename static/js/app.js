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
let currentGenderFilter = 'all';
let currentCategoryFilter = 'all';
let currentSearchQuery = '';

// Favorites state
let favoritesCategoryFilter = 'all';
let favoritesDataByGender = { male: [], female: [] };

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
    setupLightbox();
    setupEditModal(); // Initialize edit modal
    setupResultsBulkActions();
    loadInitialData();
    loadResults();
    
    // Refresh results button
    document.getElementById('refresh-results-btn')?.addEventListener('click', loadResults);
    
    // Start polling for edit status on page load to catch any background edits
    pollEditStatus();
}

function setupResultsBulkActions() {
    // Select all checkbox
    document.getElementById('results-select-all')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            selectAllResults();
        } else {
            deselectAllResults();
        }
    });
    
    // Download selected button
    document.getElementById('bulk-download-selected-btn')?.addEventListener('click', () => {
        downloadSelectedImages();
    });
    
    // Delete selected button
    document.getElementById('bulk-delete-selected-btn')?.addEventListener('click', () => {
        deleteSelectedImages();
    });
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const section = item.dataset.section;
            if (!section) return; // For modal triggers like Categories
            
            e.preventDefault();
            
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

    // Sidebar Categories Link
    document.getElementById('sidebar-manage-cats')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('categories-modal').classList.add('open');
        renderCategoriesList();
    });

    // Sidebar Characters Link
    document.getElementById('sidebar-manage-chars')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('characters-modal').classList.add('open');
        renderCharactersList();
    });
    
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadPrompts();
        loadStats();
    });
}

function setupFilters() {
    // Gender Toggle Buttons
    const genderToggle = document.getElementById('gender-toggle');
    genderToggle.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-btn')) {
            genderToggle.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentGenderFilter = e.target.dataset.value;
            // Update hidden select for API compatibility
            document.getElementById('gender-filter').value = currentGenderFilter;
            loadPrompts();
        }
    });
    
    // Category Toggle Buttons
    const categoryToggle = document.getElementById('category-toggle');
    categoryToggle.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-btn')) {
            categoryToggle.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentCategoryFilter = e.target.textContent;
            // Convert "All" to lowercase for API, keep others as-is
            const apiCategory = currentCategoryFilter.toLowerCase() === 'all' ? 'all' : currentCategoryFilter;
            // Update hidden select for API compatibility
            document.getElementById('category-filter').value = apiCategory;
            loadPrompts();
        }
    });
    
    // Search Input with debounce
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            renderPrompts();
            updateBulkActions();
        }, 300);
    });

    // Select All / Deselect All
    document.getElementById('select-all-btn').addEventListener('click', () => {
        // Filter prompts by current search before selecting
        const filteredPrompts = getFilteredPrompts();
        filteredPrompts.forEach(p => selectedPrompts.add(p.id));
        renderPrompts();
        updateQueueList();
    });

    document.getElementById('deselect-all-btn').addEventListener('click', () => {
        promptsData.forEach(p => selectedPrompts.delete(p.id));
        renderPrompts();
        updateQueueList();
    });
    
    // Favorites Category Filter Buttons
    setupFavoritesFilters();
    
    // Setup category scroll navigation
    setupCategoryScroll();
}

// Setup horizontal scroll for category bars with navigation arrows
function setupCategoryScroll() {
    // Main category toggle (in filters bar)
    const categoryToggle = document.getElementById('category-toggle');
    const categoryLeftBtn = document.querySelector('.category-scroll-left');
    const categoryRightBtn = document.querySelector('.category-scroll-right');
    
    if (categoryToggle && categoryLeftBtn && categoryRightBtn) {
        const scrollAmount = 200;
        
        categoryLeftBtn.addEventListener('click', () => {
            categoryToggle.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        
        categoryRightBtn.addEventListener('click', () => {
            categoryToggle.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
        
        // Update arrow visibility based on scroll position
        const updateCategoryArrows = () => {
            const { scrollLeft, scrollWidth, clientWidth } = categoryToggle;
            categoryLeftBtn.disabled = scrollLeft <= 0;
            categoryRightBtn.disabled = scrollLeft + clientWidth >= scrollWidth - 1;
        };
        
        categoryToggle.addEventListener('scroll', updateCategoryArrows);
        updateCategoryArrows(); // Initial check
    }
    
    // Favorites category filters
    const favoritesScroll = document.querySelector('.filter-btn-scroll');
    const favoritesLeftBtn = document.querySelector('.favorites-scroll-left');
    const favoritesRightBtn = document.querySelector('.favorites-scroll-right');
    
    if (favoritesScroll && favoritesLeftBtn && favoritesRightBtn) {
        const scrollAmount = 200;
        
        favoritesLeftBtn.addEventListener('click', () => {
            favoritesScroll.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        
        favoritesRightBtn.addEventListener('click', () => {
            favoritesScroll.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
        
        // Update arrow visibility based on scroll position
        const updateFavoritesArrows = () => {
            const { scrollLeft, scrollWidth, clientWidth } = favoritesScroll;
            favoritesLeftBtn.disabled = scrollLeft <= 0;
            favoritesRightBtn.disabled = scrollLeft + clientWidth >= scrollWidth - 1;
        };
        
        favoritesScroll.addEventListener('scroll', updateFavoritesArrows);
        updateFavoritesArrows(); // Initial check
    }
}

// Get filtered prompts based on current search query
function getFilteredPrompts() {
    if (!currentSearchQuery) return promptsData;
    
    return promptsData.filter(prompt => {
        const themeMatch = prompt.theme && prompt.theme.toLowerCase().includes(currentSearchQuery);
        const promptNumMatch = prompt.prompt_number && prompt.prompt_number.toLowerCase().includes(currentSearchQuery);
        return themeMatch || promptNumMatch;
    });
}

function setupFavoritesFilters() {
    const favoritesFilters = document.getElementById('favorites-category-filters');
    if (!favoritesFilters) return;
    
    favoritesFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            favoritesFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            favoritesCategoryFilter = e.target.textContent;
            // Convert "All" to lowercase for internal filtering
            const favFilter = favoritesCategoryFilter.toLowerCase() === 'all' ? 'all' : favoritesCategoryFilter;
            favoritesCategoryFilter = favFilter;
            renderFavorites();
        }
    });
}

function setupReferenceUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('ref-upload');
    const modelNameInput = document.getElementById('model-name');
    const modelNameSelect = document.getElementById('model-name-select');
    
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
    
    modelNameSelect.addEventListener('change', () => {
        if (modelNameSelect.value) {
            modelNameInput.value = modelNameSelect.value;
            currentModelName = modelNameSelect.value;
            loadReferenceImages();
        }
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
    
    // Edit Prompt Modal - Save button
    const saveEditBtn = document.getElementById('save-edit-btn');
    saveEditBtn.addEventListener('click', saveEditPrompt);
    
    // Categories Modal
    document.getElementById('save-cat-btn').addEventListener('click', addCategory);
    
    // Characters Modal
    document.getElementById('save-char-btn').addEventListener('click', addCharacter);
    
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

// Open edit modal with prompt data
function openEditModal(id) {
    const prompt = promptsData.find(p => p.id === id);
    if (!prompt) return;
    
    document.getElementById('edit-prompt-id').value = id;
    document.getElementById('edit-prompt-number').value = prompt.prompt_number || '';
    document.getElementById('edit-theme').value = prompt.theme || '';
    document.getElementById('edit-prompt-text').value = prompt.prompt_text || '';
    document.getElementById('edit-category').value = prompt.category || 'Portfolio';
    
    document.getElementById('edit-prompt-modal').classList.add('open');
}

// Save edited prompt
async function saveEditPrompt() {
    const id = parseInt(document.getElementById('edit-prompt-id').value);
    const theme = document.getElementById('edit-theme').value.trim();
    const promptText = document.getElementById('edit-prompt-text').value.trim();
    const category = document.getElementById('edit-category').value;
    
    if (!theme || !promptText) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/prompts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                theme: theme,
                prompt_text: promptText,
                category: category
            })
        });
        
        if (response.ok) {
            const updated = await response.json();
            
            // Update local data
            const idx = promptsData.findIndex(p => p.id === id);
            if (idx !== -1) {
                promptsData[idx] = { ...promptsData[idx], ...updated };
            }
            
            // Re-render prompts
            renderPrompts();
            
            // Close modal
            document.getElementById('edit-prompt-modal').classList.remove('open');
            showToast('Prompt updated successfully', 'success');
        } else {
            showToast('Failed to update prompt', 'error');
        }
    } catch (error) {
        console.error('Error updating prompt:', error);
        showToast('Failed to update prompt', 'error');
    }
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

// Categories State
let categoriesData = [];
let charactersData = [];

async function loadInitialData() {
    await loadAvailableModels();
    await loadCategories();
    await loadCharacters();
    await loadPrompts();
    await loadReferenceImages();
    await loadStats();
    await loadModelNames();
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        categoriesData = await response.json();
        updateCategoryDropdowns();
        renderCategoriesList();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadCharacters() {
    try {
        const response = await fetch('/api/characters');
        charactersData = await response.json();
        updateCharacterDropdowns();
        renderCharactersList();
    } catch (error) {
        console.error('Error loading characters:', error);
    }
}

function updateCategoryDropdowns() {
    const selects = [
        document.getElementById('category-filter'),
        document.querySelector('select[name="category"]'),
        document.querySelector('#bulk-add-form select[name="category"]')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        const isFilter = select.id === 'gender-filter' || select.id === 'category-filter';
        const currentValue = select.value;
        
        let html = isFilter ? '<option value="all">All</option>' : '';
        html += categoriesData.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
        
        select.innerHTML = html;
        if (currentValue) select.value = currentValue;
    });
    
    // Update category toggle buttons dynamically for Prompts section
    const categoryToggle = document.getElementById('category-toggle');
    if (categoryToggle && categoriesData.length > 0) {
        // Keep "All" button, add dynamic categories
        const allBtn = categoryToggle.querySelector('.toggle-btn[data-value="all"]');
        let toggleHtml = '';
        toggleHtml += `<button class="toggle-btn ${currentCategoryFilter === 'all' ? 'active' : ''}" data-value="all">All</button>`;
        categoriesData.forEach(cat => {
            toggleHtml += `<button class="toggle-btn ${currentCategoryFilter === cat.name ? 'active' : ''}" data-value="${cat.name}">${cat.name}</button>`;
        });
        categoryToggle.innerHTML = toggleHtml;
    }
    
    // Update Favorites category filter buttons dynamically
    updateFavoritesCategoryFilters();
}

function updateFavoritesCategoryFilters() {
    const favoritesCategoryToggle = document.getElementById('favorites-category-toggle');
    if (!favoritesCategoryToggle || categoriesData.length === 0) return;
    
    let toggleHtml = '';
    toggleHtml += `<button class="filter-btn ${favoritesCategoryFilter === 'all' ? 'active' : ''}" data-category="all">All</button>`;
    categoriesData.forEach(cat => {
        toggleHtml += `<button class="filter-btn ${favoritesCategoryFilter === cat.name ? 'active' : ''}" data-category="${cat.name}">${cat.name}</button>`;
    });
    favoritesCategoryToggle.innerHTML = toggleHtml;
}

function updateCharacterDropdowns() {
    const selects = [
        document.getElementById('model-name-select'),
        document.getElementById('gen-model-select'),
        document.getElementById('modal-model-select')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        
        let html = '<option value="">Select Character...</option>';
        html += charactersData.map(char => `<option value="${char.name}">${char.name}</option>`).join('');
        
        select.innerHTML = html;
        if (currentValue) select.value = currentValue;
    });
}

function renderCategoriesList() {
    const list = document.getElementById('categories-list');
    if (!list) return;
    
    if (categoriesData.length === 0) {
        list.innerHTML = '<p class="empty-state">No categories yet</p>';
        return;
    }
    
    list.innerHTML = categoriesData.map(cat => `
        <div class="category-item" data-id="${cat.id}">
            <span class="category-name-display">${escapeHtml(cat.name)}</span>
            <div class="category-item-actions">
                <button class="icon-btn edit" onclick="editCategoryName(${cat.id})" title="Edit Category Name">✏️</button>
                <button class="icon-btn delete" onclick="deleteCategory(${cat.id})" title="Delete Category">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Edit category name - makes it inline editable
function editCategoryName(categoryId) {
    const categoryItem = document.querySelector(`.category-item[data-id="${categoryId}"]`);
    if (!categoryItem) return;
    
    const nameDisplay = categoryItem.querySelector('.category-name-display');
    const currentName = nameDisplay.textContent;
    
    // Replace text with input
    nameDisplay.innerHTML = `<input type="text" class="category-name-input" value="${escapeHtml(currentName)}">`;
    
    // Replace edit button with save/cancel
    const actions = categoryItem.querySelector('.category-item-actions');
    actions.innerHTML = `
        <button class="icon-btn save" onclick="saveCategoryName(${categoryId})" title="Save">💾</button>
        <button class="icon-btn cancel" onclick="cancelEditCategory(${categoryId}, '${escapeHtml(currentName)}')" title="Cancel">✖️</button>
    `;
    
    // Focus the input and select all text
    const input = nameDisplay.querySelector('input');
    input.focus();
    input.select();
    
    // Handle Enter key to save
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveCategoryName(categoryId);
        }
    });
    
    // Handle Escape key to cancel
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelEditCategory(categoryId, currentName);
        }
    });
}

// Cancel editing category name
function cancelEditCategory(categoryId, originalName) {
    const categoryItem = document.querySelector(`.category-item[data-id="${categoryId}"]`);
    if (!categoryItem) return;
    
    const nameDisplay = categoryItem.querySelector('.category-name-display');
    nameDisplay.textContent = originalName;
    
    const actions = categoryItem.querySelector('.category-item-actions');
    actions.innerHTML = `
        <button class="icon-btn edit" onclick="editCategoryName(${categoryId})" title="Edit Category Name">✏️</button>
        <button class="icon-btn delete" onclick="deleteCategory(${categoryId})" title="Delete Category">🗑️</button>
    `;
}

// Save category name
async function saveCategoryName(categoryId) {
    const categoryItem = document.querySelector(`.category-item[data-id="${categoryId}"]`);
    if (!categoryItem) return;
    
    const input = categoryItem.querySelector('.category-name-input');
    const newName = input.value.trim();
    
    if (!newName) {
        showToast('Category name cannot be empty', 'error');
        return;
    }
    
    // Find current name to check if changed
    const currentCategory = categoriesData.find(c => c.id === categoryId);
    if (!currentCategory) return;
    
    if (newName === currentCategory.name) {
        // No change, just cancel edit mode
        cancelEditCategory(categoryId, currentCategory.name);
        return;
    }
    
    try {
        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update local data
            const idx = categoriesData.findIndex(c => c.id === categoryId);
            if (idx !== -1) {
                categoriesData[idx].name = result.name;
            }
            
            // Re-render the categories list
            renderCategoriesList();
            
            // Update dropdowns and toggle buttons
            updateCategoryDropdowns();
            
            // Reload prompts to reflect the new category names
            loadPrompts();
            loadFavorites();
            
            let message = `Category renamed to "${newName}"`;
            if (result.prompts_updated > 0) {
                message += ` (${result.prompts_updated} prompts updated)`;
            }
            showToast(message, 'success');
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to rename category', 'error');
        }
    } catch (error) {
        console.error('Error saving category name:', error);
        showToast('Failed to rename category', 'error');
    }
}

function renderCharactersList() {
    const list = document.getElementById('characters-list');
    if (!list) return;
    
    if (charactersData.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-user-friends"></i><p>No characters yet</p></div>';
        return;
    }
    
    list.innerHTML = charactersData.map(char => `
        <div class="character-card" data-id="${char.id}">
            <div class="character-card-header">
                <div class="character-card-title">
                    <span class="char-name-display">${escapeHtml(char.name)}</span>
                </div>
                <div class="character-card-actions">
                    <button class="icon-btn save" onclick="saveCharacterName(${char.id})" title="Save Name" style="display: none;">💾</button>
                    <button class="icon-btn delete" onclick="deleteCharacter(${char.id})" title="Delete Character">🗑️</button>
                </div>
            </div>
            <div class="character-card-body">
                <div class="character-images-grid" id="char-images-${char.id}">
                    ${renderCharacterImages(char)}
                </div>
            </div>
            <div class="character-card-footer">
                <span class="image-count">${char.image_count || 0}/8 reference images</span>
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('char-upload-${char.id}').click()">
                    <i class="fas fa-plus"></i> Add Images
                </button>
                <input type="file" id="char-upload-${char.id}" multiple accept="image/*" style="display: none;" 
                    onchange="uploadMoreImages(${char.id}, this.files)">
            </div>
        </div>
    `).join('');
    
    // Add inline editing for character names
    document.querySelectorAll('.character-card-title').forEach(title => {
        title.addEventListener('dblclick', (e) => {
            const card = e.target.closest('.character-card');
            const nameSpan = card.querySelector('.char-name-display');
            const currentName = nameSpan.textContent;
            const saveBtn = card.querySelector('.icon-btn.save');
            
            nameSpan.innerHTML = `<input type="text" class="char-name-input" value="${escapeHtml(currentName)}">`;
            saveBtn.style.display = 'block';
            
            const input = nameSpan.querySelector('input');
            input.focus();
            input.select();
            
            input.addEventListener('keypress', (ev) => {
                if (ev.key === 'Enter') {
                    saveCharacterName(parseInt(card.dataset.id));
                }
            });
            
            input.addEventListener('blur', () => {
                saveCharacterName(parseInt(card.dataset.id));
            });
        });
    });
}

function renderCharacterImages(char) {
    let html = '';
    const images = char.reference_images || [];
    
    images.forEach(img => {
        html += `
            <div class="character-image-thumb">
                <img src="${img.file_path}" alt="Reference">
                <button class="remove-btn" onclick="deleteCharReferenceImage(${char.id}, ${img.id})">×</button>
            </div>
        `;
    });
    
    // Add "add" button if less than 8 images
    if (images.length < 8) {
        html += `
            <div class="add-image-btn" onclick="document.getElementById('char-upload-${char.id}').click()">
                <i class="fas fa-plus"></i>
            </div>
        `;
    }
    
    return html;
}

async function saveCharacterName(charId) {
    const card = document.querySelector(`.character-card[data-id="${charId}"]`);
    if (!card) return;
    
    const input = card.querySelector('.char-name-input');
    const newName = input ? input.value.trim() : card.querySelector('.char-name-display').textContent.trim();
    
    if (!newName) {
        showToast('Character name cannot be empty', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/characters/${charId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        
        if (response.ok) {
            const updated = await response.json();
            card.querySelector('.char-name-display').textContent = updated.name;
            card.querySelector('.icon-btn.save').style.display = 'none';
            await loadCharacters();
            await loadModelNames();
            showToast('Character name updated', 'success');
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to update character', 'error');
        }
    } catch (error) {
        console.error('Error saving character name:', error);
        showToast('Failed to update character', 'error');
    }
}

async function uploadMoreImages(charId, files) {
    if (!files || files.length === 0) return;
    
    const char = charactersData.find(c => c.id === charId);
    if (!char) return;
    
    const formData = new FormData();
    formData.append('name', char.name);
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    try {
        const response = await fetch(`/api/characters/${charId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (response.ok) {
            const updated = await response.json();
            // Update local data
            const idx = charactersData.findIndex(c => c.id === charId);
            if (idx !== -1) {
                charactersData[idx] = updated;
            }
            renderCharactersList();
            showToast(`Added ${files.length} images`, 'success');
        } else {
            showToast('Failed to upload images', 'error');
        }
    } catch (error) {
        console.error('Error uploading images:', error);
        showToast('Failed to upload images', 'error');
    }
}

async function deleteCharReferenceImage(charId, imageId) {
    if (!confirm('Delete this reference image?')) return;
    
    try {
        const response = await fetch(`/api/reference-images/${imageId}`, { method: 'DELETE' });
        if (response.ok) {
            // Update local data
            const char = charactersData.find(c => c.id === charId);
            if (char && char.reference_images) {
                char.reference_images = char.reference_images.filter(img => img.id !== imageId);
                char.image_count = (char.image_count || 1) - 1;
            }
            renderCharactersList();
            showToast('Image deleted', 'success');
        }
    } catch (error) {
        console.error('Error deleting reference:', error);
        showToast('Failed to delete image', 'error');
    }
}

async function addCategory() {
    const input = document.getElementById('new-cat-name');
    const name = input.value.trim();
    
    if (!name) return;
    
    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            input.value = '';
            await loadCategories();
            showToast('Category added', 'success');
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to add category', 'error');
        }
    } catch (error) {
        console.error('Error adding category:', error);
    }
}

async function addCharacter() {
    const input = document.getElementById('new-char-name');
    const fileInput = document.getElementById('char-ref-upload');
    const name = input.value.trim();
    
    if (!name && fileInput.files.length === 0) {
        showToast('Please enter a name or select images', 'error');
        return;
    }
    
    // Use the name from input, or generate one from first image filename
    const charName = name || fileInput.files[0]?.name.split('.')[0] || 'new_character';
    
    const formData = new FormData();
    formData.append('name', charName);
    
    // Add files if any
    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('files', fileInput.files[i]);
    }
    
    try {
        const response = await fetch('/api/characters', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            input.value = '';
            fileInput.value = '';
            await loadCharacters();
            await loadModelNames();
            showToast('Character added', 'success');
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to add character', 'error');
        }
    } catch (error) {
        console.error('Error adding character:', error);
        showToast('Failed to add character', 'error');
    }
}

async function deleteCategory(id) {
    if (!confirm('Delete this category? This will not delete prompts in this category.')) return;
    
    try {
        const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadCategories();
            showToast('Category deleted', 'success');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
    }
}

async function deleteCharacter(id) {
    if (!confirm('Delete this character? This will also DELETE all associated reference images!')) return;
    
    try {
        const response = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadCharacters();
            loadReferenceImages();
            showToast('Character and images deleted', 'success');
        }
    } catch (error) {
        console.error('Error deleting character:', error);
    }
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
        
        // Update favorites count badge in tab
        updateFavoritesCountBadge();
        
        renderFavorites();
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

function updateFavoritesCountBadge() {
    const badge = document.getElementById('favorites-count-badge');
    if (badge) {
        badge.textContent = `(${favoritesData.length})`;
    }
}

function filterFavoritesByCategory(favorites) {
    if (favoritesCategoryFilter === 'all') return favorites;
    return favorites.filter(fav => fav.category === favoritesCategoryFilter);
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
    
    // Filter prompts by search query
    const displayPrompts = getFilteredPrompts();
    
    if (displayPrompts.length === 0) {
        if (currentSearchQuery) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No prompts match your search</p></div>';
        } else {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-lightbulb"></i><p>No prompts yet. Add some!</p></div>';
        }
        return;
    }
    
    grid.innerHTML = displayPrompts.map(prompt => `
        <div class="prompt-card ${selectedPrompts.has(prompt.id) ? 'selected' : ''}" data-id="${prompt.id}">
            <div class="prompt-card-top">
                <input type="checkbox" class="prompt-checkbox" 
                    data-id="${prompt.id}" 
                    ${selectedPrompts.has(prompt.id) ? 'checked' : ''}>
                <div class="prompt-card-header-info">
                    <span class="prompt-card-number">${prompt.prompt_number || ''}</span>
                    <span class="prompt-card-title" title="${escapeHtml(prompt.theme)}">${escapeHtml(prompt.theme)}</span>
                </div>
            </div>
            <p class="prompt-card-preview">${escapeHtml(prompt.prompt_text)}</p>
            <div class="prompt-card-bottom">
                <div class="prompt-card-meta">
                    <span class="badge ${prompt.gender.toLowerCase()}">${prompt.gender}</span>
                    <span class="badge">${prompt.category}</span>
                </div>
                <div class="prompt-card-actions">
                    <button class="icon-btn edit" data-id="${prompt.id}" title="Edit">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="icon-btn heart ${prompt.favorite ? 'active' : ''}" 
                        data-id="${prompt.id}" title="Favorite">
                        ${prompt.favorite ? '❤️' : '🤍'}
                    </button>
                    <button class="icon-btn delete" data-id="${prompt.id}" title="Delete">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
    
    attachPromptListeners();
    updateBulkActions();
}

function renderFavorites() {
    // Separate favorites by gender
    favoritesDataByGender = {
        male: favoritesData.filter(fav => fav.gender && fav.gender.toLowerCase() === 'male'),
        female: favoritesData.filter(fav => fav.gender && fav.gender.toLowerCase() === 'female')
    };
    
    // Filter by category
    const filteredMale = filterFavoritesByCategory(favoritesDataByGender.male);
    const filteredFemale = filterFavoritesByCategory(favoritesDataByGender.female);
    
    // Update counts
    const maleCount = document.getElementById('male-favorites-count');
    const femaleCount = document.getElementById('female-favorites-count');
    if (maleCount) maleCount.textContent = `(${filteredMale.length})`;
    if (femaleCount) femaleCount.textContent = `(${filteredFemale.length})`;
    
    // Show/hide sections based on filter and data
    const maleSection = document.getElementById('male-favorites-section');
    const femaleSection = document.getElementById('female-favorites-section');
    const emptyState = document.getElementById('favorites-empty');
    
    // Render male favorites
    const maleGrid = document.getElementById('male-favorites-grid');
    if (maleGrid) {
        if (filteredMale.length === 0) {
            maleGrid.innerHTML = '<div class="empty-state-small">No male favorites</div>';
        } else {
            maleGrid.innerHTML = filteredMale.map(prompt => createFavoriteCard(prompt)).join('');
        }
    }
    
    // Render female favorites
    const femaleGrid = document.getElementById('female-favorites-grid');
    if (femaleGrid) {
        if (filteredFemale.length === 0) {
            femaleGrid.innerHTML = '<div class="empty-state-small">No female favorites</div>';
        } else {
            femaleGrid.innerHTML = filteredFemale.map(prompt => createFavoriteCard(prompt)).join('');
        }
    }
    
    // Show/hide gender sections based on whether there's data
    const hasAnyFavorites = favoritesData.length > 0;
    const hasMale = filteredMale.length > 0 || (favoritesCategoryFilter === 'all' && favoritesDataByGender.male.length > 0);
    const hasFemale = filteredFemale.length > 0 || (favoritesCategoryFilter === 'all' && favoritesDataByGender.female.length > 0);
    
    if (maleSection) maleSection.style.display = hasMale ? 'block' : 'none';
    if (femaleSection) femaleSection.style.display = hasFemale ? 'block' : 'none';
    
    // Show empty state only if no favorites at all
    if (emptyState) {
        emptyState.style.display = hasAnyFavorites ? 'none' : 'block';
    }
    
    // Attach event listeners
    attachFavoritesListeners();
}

function createFavoriteCard(prompt) {
    return `
        <div class="prompt-card ${selectedPrompts.has(prompt.id) ? 'selected' : ''}" data-id="${prompt.id}">
            <div class="prompt-card-top">
                <input type="checkbox" class="prompt-checkbox" 
                    data-id="${prompt.id}" 
                    ${selectedPrompts.has(prompt.id) ? 'checked' : ''}>
                <div class="prompt-card-header-info">
                    <span class="prompt-card-number">${prompt.prompt_number || ''}</span>
                    <span class="prompt-card-title" title="${escapeHtml(prompt.theme)}">${escapeHtml(prompt.theme)}</span>
                </div>
            </div>
            <p class="prompt-card-preview">${escapeHtml(prompt.prompt_text)}</p>
            <div class="prompt-card-bottom">
                <div class="prompt-card-meta">
                    <span class="badge ${prompt.gender.toLowerCase()}">${prompt.gender}</span>
                    <span class="badge">${prompt.category}</span>
                </div>
                <div class="prompt-card-actions">
                    <button class="icon-btn heart active" data-id="${prompt.id}" title="Remove from favorites">❤️</button>
                    <button class="icon-btn queue-btn" data-id="${prompt.id}" title="Add to queue">➕</button>
                </div>
            </div>
        </div>
    `;
}

// Toggle gender section (collapsible)
function toggleGenderSection(gender) {
    const section = document.getElementById(`${gender}-favorites-section`);
    if (!section) return;
    
    const content = section.querySelector('.gender-section-content');
    const icon = section.querySelector('.gender-section-header i.fa-chevron-right');
    
    if (content) {
        content.classList.toggle('collapsed');
    }
    if (icon) {
        icon.classList.toggle('rotated');
    }
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
    
    // Make entire prompt card clickable (except buttons)
    document.querySelectorAll('.prompt-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Ignore clicks on action buttons, checkboxes, and their containers
            if (e.target.closest('.prompt-card-actions') || 
                e.target.closest('.prompt-checkbox') ||
                e.target.tagName === 'BUTTON' ||
                e.target.tagName === 'INPUT') {
                return;
            }
            
            const id = parseInt(card.dataset.id);
            if (selectedPrompts.has(id)) {
                selectedPrompts.delete(id);
            } else {
                selectedPrompts.add(id);
            }
            renderPrompts();
            updateQueueList();
        });
    });
    
    // Edit button handler
    document.querySelectorAll('.icon-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            openEditModal(id);
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
    
    // Make entire prompt card clickable in favorites (except buttons)
    document.querySelectorAll('#favorites-section .prompt-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Ignore clicks on action buttons, checkboxes, and their containers
            if (e.target.closest('.prompt-card-actions') || 
                e.target.closest('.prompt-checkbox') ||
                e.target.tagName === 'BUTTON' ||
                e.target.tagName === 'INPUT') {
                return;
            }
            
            const id = parseInt(card.dataset.id);
            if (selectedPrompts.has(id)) {
                selectedPrompts.delete(id);
            } else {
                selectedPrompts.add(id);
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
    const deleteBtn = document.getElementById('bulk-delete-btn');
    const generateBtn = document.getElementById('select-generate-btn');
    
    selectedCount.textContent = `${selectedPrompts.size} selected`;
    
    // Always show the bar so "Select All" is reachable
    bulkBar.style.display = 'flex';
    
    // Disable actions if none selected
    const noneSelected = selectedPrompts.size === 0;
    deleteBtn.disabled = noneSelected;
    generateBtn.disabled = noneSelected;
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
            let message = `${data.added} prompts added successfully`;
            if (data.untitled && data.untitled > 0) {
                message += ` (${data.untitled} without theme)`;
            }
            showToast(message, 'success');
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

// Lightbox State
let currentImageGroup = []; // Array of images in current character group
let currentImageIndex = 0;

// Lightbox Setup
function setupLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxOverlay = document.querySelector('.lightbox-overlay');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    
    // Close on button click
    lightboxClose?.addEventListener('click', closeLightbox);
    
    // Close on overlay click
    lightboxOverlay?.addEventListener('click', closeLightbox);
    
    // Previous button
    prevBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateLightbox(-1);
    });
    
    // Next button
    nextBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateLightbox(1);
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('open')) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            navigateLightbox(-1);
        } else if (e.key === 'ArrowRight') {
            navigateLightbox(1);
        }
    });
}

// Navigate through images in the lightbox
function navigateLightbox(direction) {
    if (currentImageGroup.length === 0) return;
    
    // Calculate new index with wrapping
    currentImageIndex = (currentImageIndex + direction + currentImageGroup.length) % currentImageGroup.length;
    
    // Update lightbox with new image
    const img = currentImageGroup[currentImageIndex];
    updateLightboxImage(img.file_path, img.prompt_number || '', img.file_path);
}

// Update the lightbox image without reopening
function updateLightboxImage(imageSrc, promptNumber, downloadSrc) {
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxPromptNumber = document.getElementById('lightbox-prompt-number');
    const lightboxDownload = document.getElementById('lightbox-download');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    
    lightboxImage.src = imageSrc;
    lightboxPromptNumber.textContent = promptNumber;
    lightboxDownload.href = downloadSrc || imageSrc;
    
    // Show/hide navigation buttons based on group size
    if (currentImageGroup.length > 1) {
        prevBtn?.classList.add('visible');
        nextBtn?.classList.add('visible');
    } else {
        prevBtn?.classList.remove('visible');
        nextBtn?.classList.remove('visible');
    }
}

function openLightbox(imageSrc, promptNumber, downloadSrc, imageGroup = null) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxPromptNumber = document.getElementById('lightbox-prompt-number');
    const lightboxDownload = document.getElementById('lightbox-download');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    
    // Set up image group for navigation
    if (imageGroup && imageGroup.length > 0) {
        currentImageGroup = imageGroup;
        currentImageIndex = imageGroup.findIndex(img => img.file_path === imageSrc);
        if (currentImageIndex === -1) currentImageIndex = 0;
    } else {
        // Fallback: single image
        currentImageGroup = [{ file_path: imageSrc, prompt_number: promptNumber }];
        currentImageIndex = 0;
    }
    
    lightboxImage.src = imageSrc;
    lightboxPromptNumber.textContent = promptNumber || '';
    lightboxDownload.href = downloadSrc || imageSrc;
    
    // Show/hide navigation buttons based on group size
    if (currentImageGroup.length > 1) {
        prevBtn?.classList.add('visible');
        nextBtn?.classList.add('visible');
    } else {
        prevBtn?.classList.remove('visible');
        nextBtn?.classList.remove('visible');
    }
    
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('open');
    document.body.style.overflow = ''; // Restore scrolling
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
    
    if (!resultsContainer) {
        console.error('Results container not found');
        return;
    }
    
    // Clear previous selections when reloading
    selectedResultsImages.clear();
    updateResultsBulkActions();
    
    try {
        console.log('Fetching generated images...');
        const response = await fetch('/api/generated-images');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const images = await response.json();
        console.log(`Loaded ${images.length} images:`, images);
        
        if (!Array.isArray(images) || images.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i><p>No generated images yet</p></div>';
            return;
        }
        
        // Sort images by edited_at first, then created_at (edited images show at top)
        const sortedImages = [...images].sort((a, b) => {
            const aTime = a.edited_at || a.created_at || '';
            const bTime = b.edited_at || b.created_at || '';
            return bTime.localeCompare(aTime);
        });
        
        // Group by Reference Character Name (using sorted images)
        const grouped = {};
        sortedImages.forEach(img => {
            const charName = img.character_name || 'Ungrouped';
            if (!grouped[charName]) grouped[charName] = [];
            grouped[charName].push(img);
        });
        
        // Sort characters - recently edited images first, then by most recent
        const sortedChars = Object.keys(grouped).sort((a, b) => {
            if (a === 'Ungrouped') return 1;
            if (b === 'Ungrouped') return -1;
            // Get most recent timestamp (edited_at or created_at) for each character
            const aTime = grouped[a][0]?.edited_at || grouped[a][0]?.created_at || '';
            const bTime = grouped[b][0]?.edited_at || grouped[b][0]?.created_at || '';
            // Sort descending (newest first)
            return bTime.localeCompare(aTime);
        });
        
        resultsContainer.innerHTML = sortedChars.map(charName => {
            const imgs = grouped[charName];
            const safeCharName = charName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            return `
            <div class="model-group">
                <div class="model-group-header" onclick="this.nextElementSibling.classList.toggle('open')">
                    <h3>Character: ${escapeHtml(charName)}</h3>
                    <div class="header-right">
                        <span class="badge">${imgs.length} images</span>
                        <button class="btn btn-primary btn-sm download-all-btn" 
                            onclick="event.stopPropagation(); downloadAllForCharacter('${escapeHtml(charName)}')"
                            title="Download all as ZIP">
                            <i class="fas fa-download"></i> Download All
                        </button>
                        <button class="btn btn-danger btn-sm delete-all-btn" 
                            onclick="event.stopPropagation(); deleteAllForCharacter('${escapeHtml(charName)}')"
                            title="Delete all images for this character">
                            <i class="fas fa-trash"></i> Delete All
                        </button>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="model-group-content open">
                    <div class="results-grid">
                        ${imgs.map((img, idx) => `
                            <div class="result-item" data-image-id="${img.id}">
                                <input type="checkbox" class="select-checkbox" data-id="${img.id}" onchange="toggleImageSelection(${img.id})">
                                <img src="${img.file_path}" alt="Generated" onclick="openLightbox('${img.file_path}', '${img.prompt_number || ''}', '${img.file_path}', ${JSON.stringify(imgs).replace(/"/g, '&quot;')})" style="cursor: pointer;">
                                <div class="result-meta">
                                    ${img.prompt_number ? `<span class="badge prompt-number-badge">${img.prompt_number}</span>` : ''}
                                    <span class="badge model-tag">${img.model_used.toUpperCase()}</span>
                                    <span class="badge">${img.resolution || '1k'}</span>
                                    <span class="badge">${img.aspect_ratio || '1:1'}</span>
                                </div>
                                <div class="result-item-actions">
                                    <button class="edit-btn" onclick="openEditModal(${img.id}, '${img.file_path.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" title="Edit Image">
                                        <i class="fas fa-edit"></i>
                                    </button>
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
        resultsContainer.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading results: ${escapeHtml(error.message)}</p></div>`;
    }
}

// Track selected images in results
let selectedResultsImages = new Set();

function toggleImageSelection(imageId) {
    const checkbox = document.querySelector(`.select-checkbox[data-id="${imageId}"]`);
    const resultItem = document.querySelector(`.result-item[data-image-id="${imageId}"]`);
    
    if (checkbox.checked) {
        selectedResultsImages.add(imageId);
        resultItem.classList.add('selected');
    } else {
        selectedResultsImages.delete(imageId);
        resultItem.classList.remove('selected');
    }
    
    updateResultsBulkActions();
}

function updateResultsBulkActions() {
    const bulkActions = document.getElementById('results-bulk-actions');
    const selectedCount = document.getElementById('results-selected-count');
    const selectAllCheckbox = document.getElementById('results-select-all');
    
    selectedCount.textContent = selectedResultsImages.size;
    
    if (selectedResultsImages.size > 0) {
        bulkActions.style.display = 'flex';
    } else {
        bulkActions.style.display = 'none';
    }
    
    // Update select all checkbox state
    const totalCheckboxes = document.querySelectorAll('.select-checkbox').length;
    if (selectedResultsImages.size === totalCheckboxes && totalCheckboxes > 0) {
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.checked = false;
    }
}

function selectAllResults() {
    const checkboxes = document.querySelectorAll('.select-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = true;
        const imageId = parseInt(cb.dataset.id);
        selectedResultsImages.add(imageId);
        cb.closest('.result-item').classList.add('selected');
    });
    updateResultsBulkActions();
}

function deselectAllResults() {
    const checkboxes = document.querySelectorAll('.select-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = false;
        const imageId = parseInt(cb.dataset.id);
        selectedResultsImages.delete(imageId);
        cb.closest('.result-item').classList.remove('selected');
    });
    updateResultsBulkActions();
}

async function downloadSelectedImages() {
    const ids = Array.from(selectedResultsImages);
    
    if (ids.length === 0) {
        showToast('No images selected', 'error');
        return;
    }
    
    showToast(`Downloading ${ids.length} images...`, 'info');
    
    try {
        const response = await fetch('/api/generated-images/bulk-download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: ids })
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'selected_images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast(`Downloaded ${ids.length} images`, 'success');
        deselectAllResults();
        
    } catch (error) {
        console.error('Error downloading images:', error);
        showToast('Failed to download images', 'error');
    }
}

async function deleteSelectedImages() {
    const ids = Array.from(selectedResultsImages);
    
    if (ids.length === 0) {
        showToast('No images selected', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${ids.length} image(s)?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/generated-images/bulk-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: ids })
        });
        
        const result = await response.json();
        
        if (result.deleted) {
            showToast(`Deleted ${result.deleted} images`, 'success');
            deselectAllResults();
            loadResults();
        } else {
            throw new Error('Delete failed');
        }
        
    } catch (error) {
        console.error('Error deleting images:', error);
        showToast('Failed to delete images', 'error');
    }
}

async function deleteAllForCharacter(characterName) {
    if (!confirm(`Are you sure you want to delete ALL images for "${characterName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/generated-images/delete-all/${encodeURIComponent(characterName)}`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.deleted !== undefined) {
            showToast(`Deleted ${result.deleted} images`, 'success');
            loadResults();
        } else {
            throw new Error('Delete failed');
        }
        
    } catch (error) {
        console.error('Error deleting all images:', error);
        showToast('Failed to delete images', 'error');
    }
}

// Download all images for a character as ZIP
async function downloadAllForCharacter(characterName) {
    try {
        // Fetch all images again to ensure we have the latest
        const response = await fetch('/api/generated-images');
        const allImages = await response.json();
        
        // Filter images for this character
        const images = allImages.filter(img => 
            (img.character_name || 'Ungrouped') === characterName
        );
        
        if (images.length === 0) {
            showToast('No images found for this character', 'error');
            return;
        }
        
        showToast(`Preparing ${images.length} images for download...`, 'info');
        
        const zip = new JSZip();
        const safeCharName = characterName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        // Download each image and add to ZIP
        const imagePromises = images.map(async (img, idx) => {
            try {
                // Get the full file path from the relative URL
                const imgUrl = img.file_path;
                const response = await fetch(imgUrl);
                const blob = await response.blob();
                
                // Generate filename: P001_muskan_1.png
                const promptNum = img.prompt_number || `img${idx + 1}`;
                const ext = img.file_path.split('.').pop() || 'png';
                const filename = `${promptNum}_${safeCharName}_${idx + 1}.${ext}`;
                
                zip.file(filename, blob);
            } catch (err) {
                console.error(`Error downloading image ${img.id}:`, err);
            }
        });
        
        await Promise.all(imagePromises);
        
        // Generate and download ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `${safeCharName}_images.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(zipUrl);
        
        showToast(`Downloaded ${images.length} images as ZIP`, 'success');
        
    } catch (error) {
        console.error('Error downloading ZIP:', error);
        showToast('Failed to download images', 'error');
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

// ============ Image Editing Functions ============

// Open edit modal with image details
function openEditModal(imageId, imagePath) {
    const modal = document.getElementById('edit-image-modal');
    const previewImg = document.getElementById('edit-image-preview-img');
    const instructionInput = document.getElementById('edit-instruction');
    const hiddenId = document.getElementById('edit-image-id');
    
    // Set the image ID and path
    hiddenId.value = imageId;
    previewImg.src = imagePath;
    instructionInput.value = ''; // Clear previous instruction
    
    modal.classList.add('open');
}

// Set quick suggestion instruction
function setEditInstruction(instruction) {
    document.getElementById('edit-instruction').value = instruction;
}

// Handle edit submission - runs in background
async function submitEdit() {
    const imageId = document.getElementById('edit-image-id').value;
    const instruction = document.getElementById('edit-instruction').value.trim();
    
    if (!imageId) {
        showToast('No image selected', 'error');
        return;
    }
    
    if (!instruction) {
        showToast('Please enter an editing instruction', 'error');
        return;
    }
    
    // Show loading state on button
    const applyBtn = document.getElementById('apply-edit-btn');
    const originalBtnText = applyBtn.innerHTML;
    applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Queuing...';
    applyBtn.disabled = true;
    
    try {
        // Submit edit to API
        const response = await fetch('/api/edit-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_id: parseInt(imageId),
                instruction: instruction
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Close the modal on success - editing runs in background
            document.getElementById('edit-image-modal').classList.remove('open');
            
            // Show toast that editing has started
            showToast('Image added to edit queue. You can continue using the dashboard.', 'info');
            
            // Start polling for edit queue status
            pollEditStatus();
        } else {
            showToast('Failed to queue edit: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error submitting edit:', error);
        showToast('Error submitting edit: ' + error.message, 'error');
    } finally {
        // Restore button
        applyBtn.innerHTML = originalBtnText;
        applyBtn.disabled = false;
    }
}

// Poll for edit queue status - handles multiple edits
let editStatusPollInterval = null;
let lastEditCompleted = false;

// Dismiss edit banner
function dismissEditBanner() {
    const banner = document.getElementById('edit-status-banner');
    banner.style.display = 'none';
    // Clear the queue locally so it doesn't reappear
    lastEditCompleted = false;
}

async function pollEditStatus() {
    const banner = document.getElementById('edit-status-banner');
    const statusText = document.getElementById('edit-status-text');
    const progressFill = document.getElementById('edit-progress-fill');
    
    // Clear any existing interval to prevent multiple polls
    if (editStatusPollInterval) {
        clearInterval(editStatusPollInterval);
    }
    
    const checkStatus = async () => {
        try {
            const response = await fetch('/api/edit-status');
            const data = await response.json();
            
            const queue = data.queue || [];
            const processing = data.processing || 0;
            const queued = data.queued || 0;
            const completed = data.completed || 0;
            const errors = data.error || 0;
            
            if (queue.length === 0) {
                // No edits in progress
                banner.style.display = 'none';
                // If we had edits before and now queue is empty, reload results
                if (lastEditCompleted) {
                    lastEditCompleted = false;
                    loadResults();
                }
                return;
            }
            
            // Show banner with queue status
            banner.style.display = 'block';
            
            // Reset all status classes
            banner.classList.remove('queued', 'processing', 'completed', 'error');
            
            // Build status message with color-coded status
            let statusMsg = '';
            if (processing > 0) {
                // Find the currently processing task
                const procTask = queue.find(t => t.status === 'processing');
                if (procTask) {
                    statusMsg = `<span class="status-badge processing"><i class="fas fa-spinner fa-spin"></i> Processing</span> "${escapeHtml(procTask.instruction.substring(0, 30))}${procTask.instruction.length > 30 ? '...' : ''}"`;
                } else {
                    statusMsg = `<span class="status-badge processing"><i class="fas fa-cog fa-spin"></i> Processing</span> ${processing} image(s)...`;
                }
                banner.classList.add('processing');
                lastEditCompleted = false;
            } else if (queued > 0) {
                const queuedTasks = queue.filter(t => t.status === 'queued');
                statusMsg = `<span class="status-badge queued"><i class="fas fa-hourglass-half"></i> Queued</span> ${queued} edit(s) waiting in queue...`;
                banner.classList.add('queued');
                lastEditCompleted = false;
            } else if (errors > 0 && processing === 0 && queued === 0) {
                const errorTask = queue.find(t => t.status === 'error');
                statusMsg = `<span class="status-badge error"><i class="fas fa-exclamation-circle"></i> Error</span> ${escapeHtml(errorTask?.error || 'Edit failed')}`;
                banner.classList.add('error');
                lastEditCompleted = false;
            } else if (completed > 0 && processing === 0 && queued === 0) {
                statusMsg = `<span class="status-badge completed"><i class="fas fa-check-circle"></i> Completed</span> All edits finished successfully!`;
                banner.classList.add('completed');
                lastEditCompleted = true;
                // Reload results to show edited images
                loadResults();
                // Hide banner after 3 seconds since all completed
                setTimeout(() => {
                    banner.style.display = 'none';
                }, 3000);
            }
            
            statusText.innerHTML = statusMsg;
            
            // Update progress bar based on completed vs total
            const total = queue.length;
            const done = completed + errors;
            if (total > 0) {
                const pct = (done / total) * 100;
                progressFill.style.width = pct + '%';
            }
            
        } catch (error) {
            console.error('Error polling edit status:', error);
        }
    };
    
    // Start first check immediately
    await checkStatus();
    
    // Continue polling every 2 seconds while there are active edits
    editStatusPollInterval = setInterval(async () => {
        const response = await fetch('/api/edit-status');
        const data = await response.json();
        const queue = data.queue || [];
        const processing = data.processing || 0;
        const queued = data.queued || 0;
        
        // Continue polling if there are active edits
        if (queue.length > 0 || processing > 0 || queued > 0) {
            checkStatus();
        } else {
            // No more active edits, slow down polling
            if (editStatusPollInterval) {
                clearInterval(editStatusPollInterval);
                editStatusPollInterval = null;
            }
            // Final check and hide banner
            checkStatus();
        }
    }, 2000);
}

// Initialize edit modal event listeners
function setupEditModal() {
    const modal = document.getElementById('edit-image-modal');
    const applyBtn = document.getElementById('apply-edit-btn');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const closeBtn = modal.querySelector('.modal-close');
    
    // Apply edit button
    applyBtn?.addEventListener('click', submitEdit);
    
    // Cancel button
    cancelBtn?.addEventListener('click', () => {
        modal.classList.remove('open');
    });
    
    // Close button
    closeBtn?.addEventListener('click', () => {
        modal.classList.remove('open');
    });
    
    // Close on overlay click
    const overlay = modal.querySelector('.modal-overlay');
    overlay?.addEventListener('click', () => {
        modal.classList.remove('open');
    });
    
    // Handle Enter key in textarea to submit
    const instructionInput = document.getElementById('edit-instruction');
    instructionInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            submitEdit();
        }
    });
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
window.deleteCategory = deleteCategory;
window.deleteCharacter = deleteCharacter;
window.downloadAllForCharacter = downloadAllForCharacter;
window.deleteAllForCharacter = deleteAllForCharacter;
window.saveCharacterName = saveCharacterName;
window.uploadMoreImages = uploadMoreImages;
window.deleteCharReferenceImage = deleteCharReferenceImage;
window.toggleGenderSection = toggleGenderSection;
window.editCategoryName = editCategoryName;
window.saveCategoryName = saveCategoryName;
window.cancelEditCategory = cancelEditCategory;
window.openEditModal = openEditModal;
window.setEditInstruction = setEditInstruction;
window.toggleImageSelection = toggleImageSelection;
