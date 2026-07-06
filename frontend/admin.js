// ==================== STATE ====================
let currentPage = 1;
let totalPages = 1;
let collectionPage = 1;
let collectionTotalPages = 1;
let editingId = null;
let deletingId = null;
let token = null;
let currentImageUrl = null;

// ==================== DOM REFS ====================
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

// ==================== AUTH ====================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value;
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            token = data.token;
            loginScreen.style.display = 'none';
            dashboardScreen.style.display = 'block';
            initDashboard();
        } else {
            loginError.textContent = 'Invalid password. Please try again.';
        }
    } catch (error) {
        loginError.textContent = 'Error connecting to server.';
    }
});

function logout() {
    token = null;
    dashboardScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
    passwordInput.value = '';
    loginError.textContent = '';
}

// ==================== INIT DASHBOARD ====================
function initDashboard() {
    loadCategories();
    loadRecentPrompts();
    loadCollection();
    loadStats();
    loadSettings();
    loadProfile();
    setupTabs();
    setupImageUpload();
}

// ==================== TABS ====================
function setupTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active from all nav items
            navItems.forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            
            // Hide all tabs
            tabContents.forEach(t => t.classList.remove('active'));
            
            // Show selected tab
            const tabId = this.dataset.tab;
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            // Refresh collection if switching to it
            if (tabId === 'collection') {
                loadCollection();
            }
        });
    });
}

// ==================== API HELPERS ====================
async function apiFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        logout();
        throw new Error('Session expired');
    }
    return response;
}

// ==================== IMAGE UPLOAD (ImgBB) ====================
function setupImageUpload() {
    const fileInput = document.getElementById('imageFileInput');
    fileInput.addEventListener('change', async function(e) {
        const file = this.files[0];
        if (!file) return;
        
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            this.value = '';
            return;
        }
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid image (JPG, PNG, GIF, WEBP)');
            this.value = '';
            return;
        }
        
        await uploadToImgBB(file);
    });
}

async function uploadToImgBB(file) {
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Preparing upload...';
    
    try {
        // Get ImgBB API key from settings or use default
        const apiKey = document.getElementById('imgbbApiKey').value || 'YOUR_IMGBB_API_KEY';
        
        const formData = new FormData();
        formData.append('key', apiKey);
        formData.append('image', file);
        
        progressFill.style.width = '30%';
        progressText.textContent = 'Uploading to ImgBB...';
        
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });
        
        progressFill.style.width = '80%';
        progressText.textContent = 'Processing...';
        
        const data = await response.json();
        
        if (data.success) {
            const imageUrl = data.data.url;
            currentImageUrl = imageUrl;
            document.getElementById('demoImage').value = imageUrl;
            
            // Show preview
            const preview = document.getElementById('demoImagePreview');
            preview.src = imageUrl;
            preview.style.display = 'block';
            document.getElementById('uploadPlaceholder').style.display = 'none';
            document.getElementById('removeImageBtn').style.display = 'inline-block';
            
            progressFill.style.width = '100%';
            progressText.textContent = '✅ Upload complete!';
            
            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 2000);
        } else {
            throw new Error(data.error?.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image: ' + error.message);
        progressBar.style.display = 'none';
    }
}

function removeImage() {
    currentImageUrl = null;
    document.getElementById('demoImage').value = '';
    document.getElementById('demoImagePreview').style.display = 'none';
    document.getElementById('uploadPlaceholder').style.display = 'block';
    document.getElementById('removeImageBtn').style.display = 'none';
    document.getElementById('imageFileInput').value = '';
}

// ==================== LOAD CATEGORIES ====================
async function loadCategories() {
    try {
        const response = await apiFetch('/api/admin/categories');
        const categories = await response.json();
        
        // Populate category dropdown in editor
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        
        // Populate category dropdown in collection
        const collectionCategory = document.getElementById('collectionCategory');
        collectionCategory.innerHTML = '<option value="">All Categories</option>';
        
        categories.forEach(cat => {
            const option1 = document.createElement('option');
            option1.value = cat.name;
            option1.textContent = cat.name;
            categorySelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = cat.name;
            option2.textContent = cat.name;
            collectionCategory.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function updateSubCategories() {
    const category = document.getElementById('category').value;
    if (!category) return;
    // Sub-category is free text for now
}

// ==================== RECENT PROMPTS ====================
async function loadRecentPrompts() {
    try {
        const response = await apiFetch('/api/admin/prompts?limit=5');
        const data = await response.json();
        
        const container = document.getElementById('recentPromptsList');
        if (data.prompts.length === 0) {
            container.innerHTML = '<p class="loading-text">No prompts yet. Create your first prompt!</p>';
            return;
        }
        
        container.innerHTML = data.prompts.map(prompt => `
            <div class="recent-prompt-item">
                <span class="prompt-title">${escapeHtml(prompt.headline)}</span>
                <span class="prompt-category">${escapeHtml(prompt.category)}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent prompts:', error);
    }
}

// ==================== PROMPT FORM ====================
document.getElementById('promptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        headline: document.getElementById('headline').value,
        description: document.getElementById('description').value,
        full_prompt: document.getElementById('fullPrompt').value,
        category: document.getElementById('category').value,
        sub_category: document.getElementById('subCategory').value || null,
        tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t),
        demo_image_url: document.getElementById('demoImage').value || null,
        max_images_allowed: parseInt(document.getElementById('maxImages').value),
        is_active: document.getElementById('isActive').value === 'true'
    };
    
    try {
        let response;
        const editingId = document.getElementById('promptId').value;
        
        if (editingId) {
            response = await apiFetch(`/api/admin/prompts/${editingId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            response = await apiFetch('/api/admin/prompts', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        
        if (response.ok) {
            alert(editingId ? 'Prompt updated successfully!' : 'Prompt created successfully!');
            document.getElementById('promptForm').reset();
            document.getElementById('promptId').value = '';
            removeImage();
            loadRecentPrompts();
            loadCollection();
            loadStats();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error saving prompt:', error);
        alert('Failed to save prompt');
    }
});

// ==================== COLLECTION ====================
async function loadCollection() {
    try {
        const search = document.getElementById('collectionSearch').value;
        const category = document.getElementById('collectionCategory').value;
        const limit = parseInt(document.getElementById('collectionLimit').value);
        
        const url = `/api/admin/prompts?page=${collectionPage}&limit=${limit}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`;
        
        const response = await apiFetch(url);
        const data = await response.json();
        
        renderCollection(data.prompts);
        collectionTotalPages = data.totalPages;
        updateCollectionPagination();
    } catch (error) {
        console.error('Error loading collection:', error);
        document.getElementById('collectionGrid').innerHTML = '<div class="loading-text">Error loading prompts</div>';
    }
}

function renderCollection(prompts) {
    const grid = document.getElementById('collectionGrid');
    
    if (prompts.length === 0) {
        grid.innerHTML = '<div class="loading-text">No prompts found</div>';
        return;
    }
    
    grid.innerHTML = prompts.map(prompt => `
        <div class="collection-card">
            ${prompt.demo_image_url ? `<img src="${escapeHtml(prompt.demo_image_url)}" alt="${escapeHtml(prompt.headline)}" class="card-image">` : 
            `<div class="card-image" style="background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;">📷</div>`}
            <div class="card-body">
                <div class="card-headline">${escapeHtml(prompt.headline)}</div>
                <div class="card-description">${escapeHtml(prompt.description || 'No description')}</div>
                <div class="card-meta">
                    <span>${escapeHtml(prompt.category)}${prompt.sub_category ? ` → ${escapeHtml(prompt.sub_category)}` : ''}</span>
                    <span>📸 ${prompt.max_images_allowed} image${prompt.max_images_allowed > 1 ? 's' : ''}</span>
                </div>
                ${prompt.tags && prompt.tags.length > 0 ? `
                    <div class="card-tags">
                        ${prompt.tags.map(tag => `<span class="card-tag">#${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn-edit" onclick="editPrompt('${prompt.id}')">✏️ Edit</button>
                    <button class="btn-delete" onclick="deletePrompt('${prompt.id}')">🗑️ Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateCollectionPagination() {
    document.getElementById('collectionPageInfo').textContent = `Page ${collectionPage} of ${collectionTotalPages || 1}`;
    document.getElementById('collectionPrevBtn').disabled = collectionPage === 1;
    document.getElementById('collectionNextBtn').disabled = collectionPage === collectionTotalPages || collectionTotalPages === 0;
}

function changeCollectionPage(direction) {
    if (direction === 'prev' && collectionPage > 1) {
        collectionPage--;
    } else if (direction === 'next' && collectionPage < collectionTotalPages) {
        collectionPage++;
    }
    loadCollection();
}

// ==================== EDIT PROMPT ====================
async function editPrompt(id) {
    try {
        const response = await apiFetch(`/api/admin/prompts/${id}`);
        const prompt = await response.json();
        
        // Switch to editor tab
        document.querySelector('[data-tab="editor"]').click();
        
        document.getElementById('promptId').value = id;
        document.getElementById('headline').value = prompt.headline;
        document.getElementById('description').value = prompt.description || '';
        document.getElementById('fullPrompt').value = prompt.full_prompt;
        document.getElementById('category').value = prompt.category;
        document.getElementById('subCategory').value = prompt.sub_category || '';
        document.getElementById('tags').value = prompt.tags ? prompt.tags.join(', ') : '';
        document.getElementById('maxImages').value = prompt.max_images_allowed;
        document.getElementById('isActive').value = prompt.is_active ? 'true' : 'false';
        
        // Show image if exists
        if (prompt.demo_image_url) {
            currentImageUrl = prompt.demo_image_url;
            document.getElementById('demoImage').value = prompt.demo_image_url;
            const preview = document.getElementById('demoImagePreview');
            preview.src = prompt.demo_image_url;
            preview.style.display = 'block';
            document.getElementById('uploadPlaceholder').style.display = 'none';
            document.getElementById('removeImageBtn').style.display = 'inline-block';
        }
        
        // Scroll to form
        document.querySelector('.editor-form').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading prompt for edit:', error);
        alert('Failed to load prompt data');
    }
}

// ==================== DELETE PROMPT ====================
function deletePrompt(id) {
    deletingId = id;
    document.getElementById('deleteModal').style.display = 'block';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deletingId = null;
}

async function confirmDelete() {
    if (!deletingId) return;
    
    try {
        const response = await apiFetch(`/api/admin/prompts/${deletingId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            closeDeleteModal();
            loadRecentPrompts();
            loadCollection();
            loadStats();
            alert('Prompt deleted successfully!');
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error deleting prompt:', error);
        alert('Failed to delete prompt');
    }
}

// ==================== STATS ====================
async function loadStats() {
    try {
        const response = await apiFetch('/api/admin/prompts?limit=1');
        const data = await response.json();
        
        document.getElementById('totalPrompts').textContent = data.total || 0;
        
        // Get active prompts count
        const activeResponse = await apiFetch('/api/admin/prompts?limit=1&search=&category=&is_active=true');
        const activeData = await activeResponse.json();
        document.getElementById('activePrompts').textContent = activeData.total || 0;
        
        // Get categories count
        const catResponse = await apiFetch('/api/admin/categories');
        const categories = await catResponse.json();
        document.getElementById('totalCategories').textContent = categories.length || 0;
        
        // Placeholder for images generated
        document.getElementById('totalImages').textContent = '0';
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ==================== SETTINGS ====================
function loadSettings() {
    // Load settings from localStorage
    document.getElementById('imgbbApiKey').value = localStorage.getItem('imgbbApiKey') || '';
    document.getElementById('nimEndpoint').value = localStorage.getItem('nimEndpoint') || '';
    document.getElementById('nimApiKey').value = localStorage.getItem('nimApiKey') || '';
    document.getElementById('driveFolderId').value = localStorage.getItem('driveFolderId') || '';
    document.getElementById('serviceAccount').value = localStorage.getItem('serviceAccount') || '';
    document.getElementById('defaultStorage').value = localStorage.getItem('defaultStorage') || 'imgbb';
}

function saveSettings() {
    localStorage.setItem('imgbbApiKey', document.getElementById('imgbbApiKey').value);
    localStorage.setItem('nimEndpoint', document.getElementById('nimEndpoint').value);
    localStorage.setItem('nimApiKey', document.getElementById('nimApiKey').value);
    alert('Settings saved successfully!');
}

function saveDriveSettings() {
    localStorage.setItem('driveFolderId', document.getElementById('driveFolderId').value);
    localStorage.setItem('serviceAccount', document.getElementById('serviceAccount').value);
    alert('Drive settings saved successfully!');
}

function saveStorageSettings() {
    localStorage.setItem('defaultStorage', document.getElementById('defaultStorage').value);
    alert('Storage settings saved successfully!');
}

// ==================== PROFILE ====================
function loadProfile() {
    document.getElementById('brandName').value = localStorage.getItem('brandName') || 'PromptPro';
    document.getElementById('brandLogo').value = localStorage.getItem('brandLogo') || '';
    document.getElementById('brandColor').value = localStorage.getItem('brandColor') || '#667eea';
    document.getElementById('siteTitle').value = localStorage.getItem('siteTitle') || 'PromptPro - AI Image Generator';
    document.getElementById('siteDescription').value = localStorage.getItem('siteDescription') || 'Generate stunning images with AI-powered prompts';
    document.getElementById('defaultPerPage').value = localStorage.getItem('defaultPerPage') || '24';
}

function saveBrandSettings() {
    localStorage.setItem('brandName', document.getElementById('brandName').value);
    localStorage.setItem('brandLogo', document.getElementById('brandLogo').value);
    localStorage.setItem('brandColor', document.getElementById('brandColor').value);
    alert('Brand settings saved successfully!');
}

function saveUISettings() {
    localStorage.setItem('siteTitle', document.getElementById('siteTitle').value);
    localStorage.setItem('siteDescription', document.getElementById('siteDescription').value);
    localStorage.setItem('defaultPerPage', document.getElementById('defaultPerPage').value);
    alert('UI settings saved successfully!');
}

// ==================== UTILITIES ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== CLOSE MODALS ====================
window.onclick = function(event) {
    if (event.target === document.getElementById('deleteModal')) {
        closeDeleteModal();
    }
};
