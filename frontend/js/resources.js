// frontend/js/resources.js
document.addEventListener('DOMContentLoaded', () => {
    let currentUserRole = null;

    const sidebarNav = document.getElementById('sidebar-nav');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const uploadForm = document.getElementById('upload-form');
    const resourcesList = document.getElementById('resources-list');
    const logoutButton = document.getElementById('logout-button');
    const dragUpload = document.getElementById('drag-upload');
    const toast = document.getElementById('toast');
    const resourceSearch = document.getElementById('resource-search');

    const initialize = async () => {
        await checkUserRole();
        buildSidebar();
        await fetchAndRenderResources();
        setupEventListeners();
    };

    const checkUserRole = async () => {
        try {
            const res = await fetch(CONFIG.apiUrl('api/users/me'));
            if (!res.ok) window.location.href = '/login.html';
            const user = await res.json();
            currentUserRole = user.role;
        } catch (error) {
            window.location.href = '/login.html';
        }
    };

    const buildSidebar = () => {
        const commonLinks = `
            <a href="/events.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Events</a>
            <a href="/resources.html" class="flex items-center p-3 my-1 bg-brand-beige text-brand-primary rounded-lg font-semibold">Resources</a>
        `;
        if (currentUserRole === 'admin') {
            sidebarNav.innerHTML = `
                <a href="/admin_dashboard.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Dashboard</a>
                <a href="/member_directory.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Members</a>
                ${commonLinks}
            `;
            uploadFormContainer.classList.remove('hidden');
        } else {
            sidebarNav.innerHTML = `
                <a href="/member_dashboard.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Dashboard</a>
                ${commonLinks}
            `;
        }
    };

    let allResources = [];
    const fetchAndRenderResources = async () => {
        try {
            const res = await fetch(CONFIG.apiUrl('api/resources'));
            const resources = await res.json();
            allResources = resources;
            renderResourceGrid(resources);
        } catch (error) {
            resourcesList.innerHTML = '<p class="text-red-500">Could not load resources.</p>';
        }
    };

    function renderResourceGrid(resources) {
        resourcesList.innerHTML = '';
        if (!resources || resources.length === 0) {
            resourcesList.innerHTML = '<p>No resources have been uploaded yet.</p>';
            return;
        }
        resources.forEach(resource => {
            const ext = resource.file_url.split('.').pop().toLowerCase();
            const icon = getFileIcon(ext);
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl shadow p-5 flex flex-col gap-3 items-start';
            card.innerHTML = `
                <div class="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-50 mb-2">${icon}</div>
                <div class="font-semibold text-gray-800 truncate w-full">${resource.title}</div>
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3"/></svg>
                  <span>${resource.download_count || 0} downloads</span>
                </div>
                <div class="flex gap-3 mt-2">
                  <a href="${resource.file_url}" download class="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 transition">Download</a>
                  ${currentUserRole === 'admin' ? `<button class="delete-btn text-red-600 font-semibold hover:underline" data-id="${resource.id}">Delete</button>` : ''}
                </div>
            `;
            resourcesList.appendChild(card);
        });
    }

    function getFileIcon(ext) {
        switch (ext) {
            case 'pdf': return '<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>';
            case 'doc':
            case 'docx': return '<svg class="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4h16v16H4z"/></svg>';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif': return '<svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
            case 'xls':
            case 'xlsx': return '<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="2"/></svg>';
            default: return '<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="2"/></svg>';
        }
    }

    const setupEventListeners = () => {
        uploadForm.addEventListener('submit', handleUpload);
        resourcesList.addEventListener('click', handleDelete);
        logoutButton.addEventListener('click', handleLogout);

        // --- Search/filter ---
        if (resourceSearch) {
            resourceSearch.addEventListener('input', e => {
                const val = e.target.value.toLowerCase();
                const filtered = allResources.filter(r => r.title.toLowerCase().includes(val));
                renderResourceGrid(filtered);
            });
        }

        // --- Drag & Drop Upload ---
        if (dragUpload) {
            dragUpload.addEventListener('click', () => {
                document.getElementById('resourceFile').click();
            });
            dragUpload.addEventListener('dragover', e => {
                e.preventDefault();
                dragUpload.classList.add('bg-blue-100');
            });
            dragUpload.addEventListener('dragleave', e => {
                e.preventDefault();
                dragUpload.classList.remove('bg-blue-100');
            });
            dragUpload.addEventListener('drop', e => {
                e.preventDefault();
                dragUpload.classList.remove('bg-blue-100');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    document.getElementById('resourceFile').files = files;
                }
            });
        }
    };

    // --- Toast Notification ---
    function showToast(msg, success = true) {
        if (!toast) return;
        toast.textContent = msg;
        toast.className = `block px-4 py-2 rounded shadow mt-2 ${success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2000);
    }

    const handleUpload = async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const fileInput = document.getElementById('resourceFile');
        
        const formData = new FormData();
        formData.append('title', title);
        formData.append('resourceFile', fileInput.files[0]);

        try {
            const res = await fetch(CONFIG.apiUrl('api/resources'), {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error('File upload failed.');
            uploadForm.reset();
            showToast('Resource uploaded!');
            await fetchAndRenderResources();
        } catch (error) {
            showToast(`Error: ${error.message}`, false);
        }
    };

    const handleDelete = async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const resourceId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this resource?')) {
                try {
                    const res = await fetch(CONFIG.apiUrl(`api/resources/${resourceId}`), { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete resource.');
                    showToast('Resource deleted!');
                    await fetchAndRenderResources();
                } catch (error) {
                    showToast(`Error: ${error.message}`, false);
                }
            }
        }
    };

    const handleLogout = async () => {
        await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST' });
        window.location.href = '/login.html';
    };

    initialize();
});