// frontend/js/resources.js

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Resources page loaded');

    // Initialize DOM elements first
    initializeDOMElements();

    // Check authentication
    await checkAuthentication();

    // Load resources
    await loadResources();

    // Setup event listeners
    setupEventListeners();
});

async function checkAuthentication() {
    try {
        const response = await fetch(CONFIG.apiUrl('api/auth/me'), {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }

        currentUser = await response.json();
        console.log('User authenticated:', currentUser.email);

        // Update UI based on user role
        updateUIForRole();

    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/login.html';
    }
}

function updateUIForRole() {
    const uploadButton = document.getElementById('upload-btn');
    const adminActions = document.querySelectorAll('.admin-only');

    if (currentUser.role === 'admin') {
        if (uploadButton) uploadButton.style.display = 'block';
        adminActions.forEach(el => el.style.display = 'block');
    } else {
        if (uploadButton) uploadButton.style.display = 'none';
        adminActions.forEach(el => el.style.display = 'none');
    }
}

async function loadResources() {
    try {
        showLoading(true);
        
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: 20,
            ...currentFilters
        });
        
        const response = await fetch(CONFIG.apiUrl(`api/resources?${queryParams}`), {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load resources');
        }

        const data = await response.json();
        console.log('Resources data:', data);
        
        // Handle both old and new API response formats
        const resources = data.resources || data;
        const pagination = data.pagination;
        
        displayResources(Array.isArray(resources) ? resources : []);
        
        if (pagination) {
            updatePagination(pagination);
        }

    } catch (error) {
        console.error('Error loading resources:', error);
        showMessage('Failed to load resources', 'error');
        showNoResources();
    } finally {
        showLoading(false);
    }
}

function displayResources(resources) {
    const container = document.getElementById('resources-container');
    if (!container) return;

    if (!Array.isArray(resources) || resources.length === 0) {
        showNoResources();
        return;
    }

    // Update total stats
    const totalStats = document.getElementById('total-stats');
    if (totalStats) {
        totalStats.textContent = resources.length;
    }

    container.classList.remove('hidden');
    container.innerHTML = resources.map(resource => {
        const fileIcon = getFileIconForDisplay(resource.file_type || resource.mime_type);
        const categoryColor = getCategoryColor(resource.category);
        
        return `
            <div class="resource-card rounded-2xl p-6 group">
                <div class="flex items-start gap-4 mb-4">
                    <div class="flex-shrink-0 w-12 h-12 ${categoryColor} rounded-xl flex items-center justify-center">
                        ${fileIcon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-bold text-gray-900 mb-1 truncate group-hover:text-orange-600 transition-colors">${escapeHtml(resource.title)}</h3>
                        <span class="inline-block px-3 py-1 text-xs font-medium rounded-full ${categoryColor.replace('bg-', 'bg-').replace('-500', '-100')} ${categoryColor.replace('bg-', 'text-').replace('-500', '-800')}">${escapeHtml(resource.category || 'general')}</span>
                    </div>
                </div>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">${escapeHtml(resource.description || 'No description available')}</p>
                
                <div class="space-y-3 mb-4">
                    <div class="flex items-center justify-between text-xs text-gray-500">
                        <span class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                            </svg>
                            ${formatFileSize(resource.file_size || 0)}
                        </span>
                        <span class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                            ${resource.downloads || 0} downloads
                        </span>
                    </div>
                    <div class="flex items-center text-xs text-gray-500">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        ${escapeHtml(resource.uploaded_by_name || 'Unknown')} • ${new Date(resource.created_at).toLocaleDateString()}
                    </div>
                </div>
                
                <div class="flex gap-2">
                    <button onclick="viewResource(${resource.id})" 
                            class="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg text-orange-700 bg-orange-100 hover:bg-orange-200 transition-all duration-300">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        View
                    </button>
                    <a href="${CONFIG.apiUrl('api/resources/' + resource.id + '/download')}" 
                       class="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-md hover:shadow-lg">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        Download
                    </a>
                    ${currentUser && currentUser.role === 'admin' ? `
                        <button onclick="deleteResource(${resource.id})" 
                                class="px-3 py-2 text-sm font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-all duration-300">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Global state
let currentPage = 1;
let currentFilters = {
    search: '',
    category: 'all',
    type: 'all',
    sortBy: 'created_at',
    sortOrder: 'DESC'
};
let currentResources = [];

// DOM Elements
let resourcesContainer, resourcesLoading, noResourcesDiv, paginationDiv;
let searchInput, categoryFilter, typeFilter, sortFilter;
let uploadModal, resourceModal, uploadForm;
let userNameSpan, logoutBtn;

function initializeDOMElements() {
    // Main containers
    resourcesContainer = document.getElementById('resources-container');
    resourcesLoading = document.getElementById('resources-loading');
    noResourcesDiv = document.getElementById('no-resources');
    paginationDiv = document.getElementById('pagination');

    // Filters
    searchInput = document.getElementById('search-input');
    categoryFilter = document.getElementById('category-filter');
    typeFilter = document.getElementById('type-filter');
    sortFilter = document.getElementById('sort-filter');

    // Modals and forms
    uploadModal = document.getElementById('upload-modal');
    resourceModal = document.getElementById('resource-modal');
    uploadForm = document.getElementById('upload-form');

    // User elements
    userNameSpan = document.getElementById('user-name');
    logoutBtn = document.getElementById('logout-btn');

    // Initialize elements immediately
    if (resourcesContainer) resourcesContainer.classList.add('hidden');
    if (noResourcesDiv) noResourcesDiv.classList.add('hidden');
    if (paginationDiv) paginationDiv.classList.add('hidden');
}

function setupEventListeners() {
    // Upload button
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
    }

    // File input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // Upload form
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFormSubmit);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Search and filters
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentFilters.search = searchInput.value;
            currentPage = 1;
            loadResources();
        }, 300));
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentFilters.category = categoryFilter.value;
            currentPage = 1;
            loadResources();
        });
    }

    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            currentFilters.type = typeFilter.value;
            currentPage = 1;
            loadResources();
        });
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            currentFilters.sortBy = sortFilter.value;
            currentPage = 1;
            loadResources();
        });
    }

    // Clear filters
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }

    // Upload resource
    const uploadResourceBtn = document.getElementById('upload-resource-btn');
    if (uploadResourceBtn) {
        uploadResourceBtn.addEventListener('click', () => openUploadModal());
    }

    // File upload handling
    setupFileUpload();

    // Pagination
    setupPaginationListeners();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('upload-section').classList.remove('hidden');
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const fileInput = document.getElementById('file-input');
    const titleInput = document.getElementById('resource-title');
    const descriptionInput = document.getElementById('resource-description');
    const categorySelect = document.getElementById('resource-category');
    const accessSelect = document.getElementById('resource-access');
    const tagsInput = document.getElementById('resource-tags');

    if (!fileInput.files[0]) {
        showMessage('Please select a file', 'error');
        return;
    }

    if (!titleInput.value.trim()) {
        showMessage('Please enter a title', 'error');
        return;
    }

    if (!descriptionInput.value.trim()) {
        showMessage('Please enter a description', 'error');
        return;
    }

    const submitBtn = document.getElementById('upload-submit-btn');
    const uploadText = submitBtn.querySelector('.upload-text');
    const uploadLoading = submitBtn.querySelector('.upload-loading');
    
    submitBtn.disabled = true;
    uploadText.textContent = 'Uploading...';
    uploadLoading.classList.remove('hidden');

    try {
        const formData = new FormData();
        formData.append('files', fileInput.files[0]);
        formData.append('title', titleInput.value.trim());
        formData.append('description', descriptionInput.value.trim());
        formData.append('category', categorySelect.value);
        formData.append('access_level', accessSelect.value);
        formData.append('tags', tagsInput.value.trim());

        const response = await fetch(CONFIG.apiUrl('api/resources'), {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }

        showMessage('Resource uploaded successfully', 'success');

        // Close modal and reset form
        closeUploadModal();

        // Reload resources
        await loadResources();

    } catch (error) {
        console.error('Upload error:', error);
        showMessage(error.message || 'Failed to upload resource', 'error');
    } finally {
        submitBtn.disabled = false;
        uploadText.textContent = 'Upload Resource';
        uploadLoading.classList.add('hidden');
    }
}

function setupFileUpload() {
    const fileDropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');

    if (!fileDropZone || !fileInput) return;

    // Click to upload
    fileDropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File selection
    fileInput.addEventListener('change', handleFileSelection);

    // Drag and drop
    fileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropZone.classList.add('dragover');
    });

    fileDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileDropZone.classList.remove('dragover');
    });

    fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropZone.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files);
        handleFileSelection({ target: { files } });
    });
}

function handleFileSelection(e) {
    const files = Array.from(e.target.files);
    const fileList = document.getElementById('file-list');

    if (!fileList) return;

    // Clear previous file list
    fileList.innerHTML = '';

    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item flex items-center justify-between p-3 bg-gray-50 rounded-lg';

        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex items-center gap-3';

        const fileIcon = getFileIcon(file.type);
        const fileName = document.createElement('span');
        fileName.className = 'text-sm font-medium text-gray-900';
        fileName.textContent = file.name;

        const fileSize = document.createElement('span');
        fileSize.className = 'text-xs text-gray-500';
        fileSize.textContent = formatFileSize(file.size);

        fileInfo.appendChild(fileIcon);
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-red-500 hover:text-red-700';
        removeBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        removeBtn.onclick = () => removeFile(index);

        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    const fileInput = document.getElementById('file-input');
    const dt = new DataTransfer();

    Array.from(fileInput.files).forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });

    fileInput.files = dt.files;
    handleFileSelection({ target: { files: dt.files } });
}

function getFileIcon(mimeType) {
    const icon = document.createElement('div');
    icon.className = 'file-icon flex items-center justify-center';

    if (mimeType.startsWith('image/')) {
        icon.innerHTML = '<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
    } else if (mimeType.includes('pdf')) {
        icon.innerHTML = '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
    } else if (mimeType.includes('document') || mimeType.includes('word')) {
        icon.innerHTML = '<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        icon.innerHTML = '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>';
    } else {
        icon.innerHTML = '<svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
    }

    return icon;
}

function setupPaginationListeners() {
    const prevMobile = document.getElementById('prev-mobile');
    const nextMobile = document.getElementById('next-mobile');
    const prevDesktop = document.getElementById('prev-desktop');
    const nextDesktop = document.getElementById('next-desktop');

    [prevMobile, prevDesktop].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    loadResources();
                }
            });
        }
    });

    [nextMobile, nextDesktop].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                currentPage++;
                loadResources();
            });
        }
    });
}

function clearFilters() {
    currentFilters = {
        search: '',
        category: 'all',
        type: 'all',
        sortBy: 'created_at',
        sortOrder: 'DESC'
    };
    currentPage = 1;

    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = 'all';
    if (typeFilter) typeFilter.value = 'all';
    if (sortFilter) sortFilter.value = 'created_at';

    loadResources();
}

function updatePagination(pagination) {
    if (!paginationDiv) return;

    if (pagination.totalPages <= 1) {
        paginationDiv.classList.add('hidden');
        return;
    }

    paginationDiv.classList.remove('hidden');

    // Update showing text
    const showingFrom = document.getElementById('showing-from');
    const showingTo = document.getElementById('showing-to');
    const totalResources = document.getElementById('total-resources');

    if (showingFrom) showingFrom.textContent = (pagination.page - 1) * pagination.limit + 1;
    if (showingTo) showingTo.textContent = Math.min(pagination.page * pagination.limit, pagination.total);
    if (totalResources) totalResources.textContent = pagination.total;

    // Update buttons
    const prevButtons = [document.getElementById('prev-mobile'), document.getElementById('prev-desktop')];
    const nextButtons = [document.getElementById('next-mobile'), document.getElementById('next-desktop')];

    prevButtons.forEach(btn => {
        if (btn) {
            btn.disabled = pagination.page <= 1;
            btn.classList.toggle('opacity-50', pagination.page <= 1);
            btn.classList.toggle('cursor-not-allowed', pagination.page <= 1);
        }
    });

    nextButtons.forEach(btn => {
        if (btn) {
            btn.disabled = pagination.page >= pagination.totalPages;
            btn.classList.toggle('opacity-50', pagination.page >= pagination.totalPages);
            btn.classList.toggle('cursor-not-allowed', pagination.page >= pagination.totalPages);
        }
    });
}

function showLoading(show) {
    if (show) {
        resourcesLoading.classList.remove('hidden');
        resourcesContainer.classList.add('hidden');
        noResourcesDiv.classList.add('hidden');
    } else {
        resourcesLoading.classList.add('hidden');
    }
}

function showNoResources() {
    resourcesContainer.classList.add('hidden');
    noResourcesDiv.classList.remove('hidden');
    paginationDiv.classList.add('hidden');
}

async function logout() {
    try {
        await fetch(CONFIG.apiUrl('api/auth/logout'), {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        window.location.href = '/';
    }
}

async function handleLogout() {
    try {
        const response = await fetch(CONFIG.apiUrl('api/auth/logout'), {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            showMessage('Logged out successfully. Redirecting...', 'success', 1500);
        }
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Logout completed. Redirecting...', 'info', 1500);
    } finally {
        // Clear any local storage/session data
        localStorage.clear();
        sessionStorage.clear();

        // Redirect to homepage
        setTimeout(() => {
            window.location.href = '/';
        }, 1600);
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIconForDisplay(mimeType) {
    if (!mimeType) {
        return '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
    }
    
    if (mimeType.includes('image') || mimeType.includes('png') || mimeType.includes('jpg') || mimeType.includes('jpeg')) {
        return '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
    } else if (mimeType.includes('pdf')) {
        return '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>';
    } else if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('doc')) {
        return '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('xls')) {
        return '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>';
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || mimeType.includes('ppt')) {
        return '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m4 0H3a1 1 0 00-1 1v14a1 1 0 001 1h18a1 1 0 001-1V5a1 1 0 00-1-1zM9 9h6m-6 4h6"></path></svg>';
    } else {
        return '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
    }
}

function getCategoryColor(category) {
    const colors = {
        documentation: 'bg-blue-500',
        templates: 'bg-green-500',
        reports: 'bg-purple-500',
        presentations: 'bg-pink-500',
        graphics: 'bg-indigo-500',
        finance: 'bg-yellow-500',
        general: 'bg-gray-500'
    };
    return colors[category] || colors.general;
}

function showMessage(message, type = 'info', duration = 3000) {
    // Create or get the toast container
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-50 flex flex-col items-end space-y-2';
        document.body.appendChild(container);
    }

    // Create the toast element
    const toast = document.createElement('div');
    toast.className = `mb-2 px-6 py-3 rounded shadow-lg text-white font-medium ${
        type === 'error' ? 'bg-red-600' :
        type === 'success' ? 'bg-green-600' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-600'
    }`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duration);
}

// Resource management functions
async function viewResource(resourceId) {
    try {
        const response = await fetch(CONFIG.apiUrl(`api/resources/${resourceId}`), {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load resource details');
        }

        const data = await response.json();
        const resource = data.resource;

        // Update modal content
        document.getElementById('resource-modal-title').textContent = resource.title;
        document.getElementById('resource-modal-content').innerHTML = `
            <div class="space-y-4">
                <div>
                    <h4 class="font-medium text-gray-900">Description</h4>
                    <p class="text-gray-600 mt-1">${escapeHtml(resource.description || 'No description available')}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-medium text-gray-900">Category</h4>
                        <p class="text-gray-600 mt-1">${escapeHtml(resource.category || 'General')}</p>
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900">File Type</h4>
                        <p class="text-gray-600 mt-1">${escapeHtml(resource.file_type || 'Unknown')}</p>
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900">File Size</h4>
                        <p class="text-gray-600 mt-1">${formatFileSize(resource.file_size || 0)}</p>
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900">Downloads</h4>
                        <p class="text-gray-600 mt-1">${resource.downloads || 0}</p>
                    </div>
                </div>
                <div>
                    <h4 class="font-medium text-gray-900">Uploaded By</h4>
                    <p class="text-gray-600 mt-1">${escapeHtml(resource.uploaded_by_name || 'Unknown')} on ${new Date(resource.created_at).toLocaleDateString()}</p>
                </div>
                ${resource.tags ? `
                    <div>
                        <h4 class="font-medium text-gray-900">Tags</h4>
                        <p class="text-gray-600 mt-1">${escapeHtml(resource.tags)}</p>
                    </div>
                ` : ''}
            </div>
        `;

        // Update modal actions
        document.getElementById('resource-modal-actions').innerHTML = `
            <a href="${CONFIG.apiUrl('api/resources/' + resource.id + '/download')}" 
               class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary/90">
                Download
            </a>
            <button onclick="closeResourceModal()" 
                    class="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Close
            </button>
        `;

        // Show modal
        document.getElementById('resource-modal').classList.remove('hidden');

    } catch (error) {
        console.error('Error loading resource:', error);
        showMessage('Failed to load resource details', 'error');
    }
}

async function downloadResource(resourceId) {
    try {
        window.open(CONFIG.apiUrl(`api/resources/${resourceId}/download`), '_blank');
    } catch (error) {
        console.error('Error downloading resource:', error);
        showMessage('Failed to download resource', 'error');
    }
}

async function deleteResource(resourceId) {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(CONFIG.apiUrl(`api/resources/${resourceId}`), {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete resource');
        }

        showMessage('Resource deleted successfully', 'success');
        await loadResources(); // Reload the resources list

    } catch (error) {
        console.error('Error deleting resource:', error);
        showMessage(error.message || 'Failed to delete resource', 'error');
    }
}

function openUploadModal() {
    document.getElementById('upload-modal').classList.remove('hidden');
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.add('hidden');
    // Reset form
    document.getElementById('upload-form').reset();
    document.getElementById('file-list').innerHTML = '';
}

function closeResourceModal() {
    document.getElementById('resource-modal').classList.add('hidden');
}

// Global functions for onclick handlers
window.viewResource = viewResource;
window.downloadResource = downloadResource;
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.closeResourceModal = closeResourceModal;
window.deleteResource = deleteResource;