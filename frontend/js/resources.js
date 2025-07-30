// frontend/js/resources.js

// Global state
let currentPage = 1;
let currentFilters = {
    search: '',
    category: 'all',
    type: 'all',
    sortBy: 'created_at',
    sortOrder: 'DESC'
};
let currentUser = null;
let currentResources = [];

// DOM Elements
let resourcesContainer, resourcesLoading, noResourcesDiv, paginationDiv;
let searchInput, categoryFilter, typeFilter, sortFilter;
let uploadModal, resourceModal, uploadForm;
let userNameSpan, logoutBtn;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Resources page loaded');

    // Initialize DOM elements
    initializeDOMElements();

    // Check authentication
    await checkAuthentication();

    // Setup event listeners
    setupEventListeners();

    // Load initial data
    await loadResources();
});

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
}

async function checkAuthentication() {
    try {
        const response = await fetch(CONFIG.apiUrl('api/users/me'), {
            credentials: 'include'
        });

        if (!response.ok) {
            console.log('Not authenticated, redirecting to login');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        currentUser = data.user;

        // Update UI
        if (userNameSpan) {
            userNameSpan.textContent = currentUser.full_name;
        }

        // Update dashboard link in header navigation
        const dashboardLink = document.querySelector('a[href="/member_dashboard.html"]');
        if (dashboardLink && currentUser && currentUser.role === 'admin') {
            dashboardLink.href = '/admin_dashboard.html';
        }

        console.log('User authenticated:', currentUser.email, 'Role:', currentUser.role);
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/login.html';
    }
}

function setupEventListeners() {
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

    // Upload form
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    // File upload handling
    setupFileUpload();

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Pagination
    setupPaginationListeners();
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

async function loadResources() {
    try {
        showLoading(true);

        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            category: currentFilters.category,
            type: currentFilters.type,
            search: currentFilters.search,
            sortBy: currentFilters.sortBy,
            sortOrder: currentFilters.sortOrder
        });

        const response = await fetch(CONFIG.apiUrl(`api/resources?${params}`), {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load resources');
        }

        const data = await response.json();
        currentResources = data.resources;

        displayResources(data.resources);
        updatePagination(data.pagination);

    } catch (error) {
        console.error('Error loading resources:', error);
        showMessage('Failed to load resources. Please try again.', 'error');
        showNoResources();
    } finally {
        showLoading(false);
    }
}

function displayResources(resources) {
    if (!resourcesContainer) return;

    if (resources.length === 0) {
        showNoResources();
        return;
    }

    resourcesContainer.innerHTML = '';
    resourcesContainer.classList.remove('hidden');
    noResourcesDiv.classList.add('hidden');

    resources.forEach(resource => {
        const resourceCard = createResourceCard(resource);
        resourcesContainer.appendChild(resourceCard);
    });
}

function createResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer';

    const fileSize = formatFileSize(resource.file_size);
    const uploadDate = new Date(resource.created_at).toLocaleDateString();
    const fileIcon = getFileIconByType(resource.file_type);

    card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
                ${fileIcon.outerHTML}
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 line-clamp-1">${escapeHtml(resource.title)}</h3>
                    <p class="text-sm text-gray-500">${resource.category}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                ${resource.access_level === 'admin' ? '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">Admin Only</span>' : ''}
                ${resource.access_level === 'members' ? '<span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">Members</span>' : ''}
                ${resource.access_level === 'all' ? '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded-full">Public</span>' : ''}
            </div>
        </div>

        <p class="text-gray-600 text-sm mb-4 line-clamp-2">${escapeHtml(resource.description || '')}</p>

        <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
            <span>${fileSize}</span>
            <span>${resource.downloads || 0} downloads</span>
            <span>Added ${uploadDate}</span>
        </div>

        ${resource.tags ? `
            <div class="mb-4">
                <div class="flex flex-wrap gap-1">
                    ${resource.tags.split(',').map(tag => 
                        `<span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">${escapeHtml(tag.trim())}</span>`
                    ).join('')}
                </div>
            </div>
        ` : ''}

        <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500">by ${escapeHtml(resource.uploaded_by_name || 'Unknown')}</span>
            <div class="flex gap-2">
                <button onclick="viewResource(${resource.id})" 
                        class="px-3 py-1 text-sm text-brand-primary border border-brand-primary rounded hover:bg-brand-primary hover:text-white transition-colors">
                    View
                </button>
                <button onclick="downloadResource(${resource.id})" 
                        class="px-3 py-1 text-sm bg-brand-primary text-white rounded hover:bg-brand-primary/90 transition-colors">
                    Download
                </button>
            </div>
        </div>
    `;

    return card;
}

function getFileIconByType(fileType) {
    const icon = document.createElement('div');
    icon.className = 'w-10 h-10 flex items-center justify-center rounded-lg';

    switch (fileType) {
        case 'pdf':
            icon.className += ' bg-red-100';
            icon.innerHTML = '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
            break;
        case 'doc':
        case 'docx':
            icon.className += ' bg-blue-100';
            icon.innerHTML = '<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
            break;
        case 'xls':
        case 'xlsx':
            icon.className += ' bg-green-100';
            icon.innerHTML = '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>';
            break;
        case 'ppt':
        case 'pptx':
            icon.className += ' bg-orange-100';
            icon.innerHTML = '<svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V2a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h2a1 1 0 011 1v2m0 0h8m-8 0V4a1 1 0 011-1h6a1 1 0 011 1v2M7 8h10M7 12h4m-4 4h4"></path></svg>';
            break;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
            icon.className += ' bg-purple-100';
            icon.innerHTML = '<svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
            break;
        default:
            icon.className += ' bg-gray-100';
            icon.innerHTML = '<svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
    }

    return icon;
}

async function viewResource(resourceId) {
    try {
        const response = await fetch(CONFIG.apiUrl(`api/resources/${resourceId}`), {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load resource details');
        }

        const data = await response.json();
        showResourceModal(data.resource);

    } catch (error) {
        console.error('Error loading resource details:', error);
        showMessage('Failed to load resource details.', 'error');
    }
}

function showResourceModal(resource) {
    const modalTitle = document.getElementById('resource-modal-title');
    const modalContent = document.getElementById('resource-modal-content');
    const modalActions = document.getElementById('resource-modal-actions');

    if (!modalTitle || !modalContent || !modalActions) return;

    modalTitle.textContent = resource.title;

    const uploadDate = new Date(resource.created_at).toLocaleDateString();
    const fileSize = formatFileSize(resource.file_size);

    modalContent.innerHTML = `
        <div class="space-y-4">
            <div>
                <h4 class="font-medium text-gray-900 mb-2">Description</h4>
                <p class="text-gray-600">${escapeHtml(resource.description || 'No description provided.')}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">Category</h4>
                    <p class="text-gray-600 capitalize">${resource.category}</p>
                </div>
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">Access Level</h4>
                    <p class="text-gray-600 capitalize">${resource.access_level}</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">File Size</h4>
                    <p class="text-gray-600">${fileSize}</p>
                </div>
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">Downloads</h4>
                    <p class="text-gray-600">${resource.downloads || 0}</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">Uploaded By</h4>
                    <p class="text-gray-600">${escapeHtml(resource.uploaded_by_name || 'Unknown')}</p>
                </div>
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">Upload Date</h4>
                    <p class="text-gray-600">${uploadDate}</p>
                </div>
            </div>

            ${resource.tags ? `
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">Tags</h4>
                    <div class="flex flex-wrap gap-1">
                        ${resource.tags.split(',').map(tag => 
                            `<span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">${escapeHtml(tag.trim())}</span>`
                        ).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    modalActions.innerHTML = `
        <button onclick="downloadResource(${resource.id})" 
                class="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors">
            Download
        </button>
        <button onclick="closeResourceModal()" 
                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Close
        </button>
    `;

    resourceModal.classList.remove('hidden');
}

async function downloadResource(resourceId) {
    try {
        const response = await fetch(CONFIG.apiUrl(`api/resources/${resourceId}/download`), {
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to download resource');
        }

        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
            ? contentDisposition.split('filename=')[1].replace(/"/g, '')
            : 'download';

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showMessage('Download started successfully!', 'success');

    } catch (error) {
        console.error('Error downloading resource:', error);
        showMessage(error.message, 'error');
    }
}

function openUploadModal() {
    if (uploadModal) {
        // Reset form
        uploadForm.reset();
        document.getElementById('file-list').innerHTML = '';
        uploadModal.classList.remove('hidden');
    }
}

function closeUploadModal() {
    if (uploadModal) {
        uploadModal.classList.add('hidden');
    }
}

function closeResourceModal() {
    if (resourceModal) {
        resourceModal.classList.add('hidden');
    }
}

async function handleUpload(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('upload-submit-btn');
    const uploadText = submitBtn?.querySelector('.upload-text');
    const uploadLoading = submitBtn?.querySelector('.upload-loading');

    if (submitBtn) submitBtn.disabled = true;
    if (uploadText) uploadText.classList.add('hidden');
    if (uploadLoading) uploadLoading.classList.remove('hidden');

    try {
        const formData = new FormData(uploadForm);

        const response = await fetch(CONFIG.apiUrl('api/resources'), {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to upload resource');
        }

        showMessage(data.message, 'success');
        closeUploadModal();
        await loadResources();

    } catch (error) {
        console.error('Error uploading resource:', error);
        showMessage(error.message, 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (uploadText) uploadText.classList.remove('hidden');
        if (uploadLoading) uploadLoading.classList.add('hidden');
    }
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
    if (!resourcesContainer || !noResourcesDiv) return;
    
    resourcesContainer.classList.add('hidden');
    noResourcesDiv.classList.remove('hidden');
    if (paginationDiv) paginationDiv.classList.add('hidden');
}
```python
    resourcesContainer.classList.add('hidden');
    noResourcesDiv.classList.remove('hidden');
    paginationDiv.classList.add('hidden');
}

async function handleLogout() {
    try {
        await fetch(CONFIG.apiUrl('api/auth/logout'), {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear any local storage/session data
        localStorage.clear();
        sessionStorage.clear();

        // Show logout message and redirect to homepage
        showMessage('Logged out successfully. Redirecting...', 'success', 1500);
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showMessage(message, type = 'info', duration = 3000) {
    // Reuse the showMessage function from auth.js
    if (typeof window.showMessage === 'function') {
        window.showMessage(message, type, duration);
        return;
    }

    // Fallback implementation
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message);
}

// Global functions for onclick handlers
window.viewResource = viewResource;
window.downloadResource = downloadResource;
window.closeUploadModal = closeUploadModal;
window.closeResourceModal = closeResourceModal;