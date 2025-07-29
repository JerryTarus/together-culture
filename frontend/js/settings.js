// frontend/js/settings.js

// Global state
let currentUser = null;
let selectedAvatar = null;

// DOM Elements
let userNameSpan, logoutBtn;
let profileForm, passwordForm, preferencesForm;
let currentAvatarImg, avatarPlaceholder, avatarUploadZone, avatarInput;
let uploadAvatarBtn, removeAvatarBtn;
let deleteAccountModal, deleteAccountBtn, confirmDeleteBtn;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Settings page loaded');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Check authentication
    await checkAuthentication();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load user data
    await loadUserData();
    
    // Initialize tabs
    initializeTabs();
});

function initializeDOMElements() {
    // User elements
    userNameSpan = document.getElementById('user-name');
    logoutBtn = document.getElementById('logout-btn');
    
    // Forms
    profileForm = document.getElementById('profile-form');
    passwordForm = document.getElementById('password-form');
    preferencesForm = document.getElementById('preferences-form');
    
    // Avatar elements
    currentAvatarImg = document.getElementById('current-avatar');
    avatarPlaceholder = document.getElementById('avatar-placeholder');
    avatarUploadZone = document.getElementById('avatar-upload-zone');
    avatarInput = document.getElementById('avatar-input');
    uploadAvatarBtn = document.getElementById('upload-avatar-btn');
    removeAvatarBtn = document.getElementById('remove-avatar-btn');
    
    // Delete account elements
    deleteAccountModal = document.getElementById('delete-account-modal');
    deleteAccountBtn = document.getElementById('delete-account-btn');
    confirmDeleteBtn = document.getElementById('confirm-delete-btn');
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
        
        console.log('User authenticated:', currentUser.email, 'Role:', currentUser.role);
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/login.html';
    }
}

function setupEventListeners() {
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Forms
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', handlePreferencesUpdate);
    }
    
    // Avatar upload
    if (avatarUploadZone) {
        avatarUploadZone.addEventListener('click', () => avatarInput.click());
        avatarUploadZone.addEventListener('dragover', handleAvatarDragOver);
        avatarUploadZone.addEventListener('dragleave', handleAvatarDragLeave);
        avatarUploadZone.addEventListener('drop', handleAvatarDrop);
    }
    
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarSelection);
    }
    
    if (uploadAvatarBtn) {
        uploadAvatarBtn.addEventListener('click', handleAvatarUpload);
    }
    
    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', handleAvatarRemove);
    }
    
    // Password toggle buttons
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const input = e.currentTarget.parentElement.querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
        });
    });
    
    // Character counters
    const bioInput = document.getElementById('profile-bio');
    const skillsInput = document.getElementById('profile-skills');
    const bioCount = document.getElementById('bio-count');
    const skillsCount = document.getElementById('skills-count');
    
    if (bioInput && bioCount) {
        bioInput.addEventListener('input', () => {
            bioCount.textContent = bioInput.value.length;
        });
    }
    
    if (skillsInput && skillsCount) {
        skillsInput.addEventListener('input', () => {
            skillsCount.textContent = skillsInput.value.length;
        });
    }
    
    // Delete account
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            deleteAccountModal.classList.remove('hidden');
        });
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleAccountDelete);
    }
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Special handling for activity tab
            if (targetTab === 'activity') {
                loadUserActivity();
            }
        });
    });
}

async function loadUserData() {
    try {
        // Populate profile form
        const fullNameInput = document.getElementById('profile-full-name');
        const emailInput = document.getElementById('profile-email');
        const bioInput = document.getElementById('profile-bio');
        const skillsInput = document.getElementById('profile-skills');
        
        if (fullNameInput) fullNameInput.value = currentUser.full_name || '';
        if (emailInput) emailInput.value = currentUser.email || '';
        if (bioInput) {
            bioInput.value = currentUser.bio || '';
            document.getElementById('bio-count').textContent = (currentUser.bio || '').length;
        }
        if (skillsInput) {
            skillsInput.value = currentUser.skills || '';
            document.getElementById('skills-count').textContent = (currentUser.skills || '').length;
        }
        
        // Populate preferences form
        const emailNotifications = document.getElementById('email-notifications');
        const pushNotifications = document.getElementById('push-notifications');
        const privacyLevel = document.getElementById('privacy-level');
        
        if (emailNotifications) emailNotifications.checked = currentUser.email_notifications !== false;
        if (pushNotifications) pushNotifications.checked = currentUser.push_notifications !== false;
        if (privacyLevel) privacyLevel.value = currentUser.privacy_level || 'public';
        
        // Load avatar
        if (currentUser.avatar_url) {
            showCurrentAvatar(currentUser.avatar_url);
        } else {
            showAvatarPlaceholder();
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showMessage('Error loading user data', 'error');
    }
}

function showCurrentAvatar(avatarUrl) {
    if (currentAvatarImg && avatarPlaceholder && removeAvatarBtn) {
        currentAvatarImg.src = CONFIG.apiUrl(avatarUrl);
        currentAvatarImg.classList.remove('hidden');
        avatarPlaceholder.classList.add('hidden');
        removeAvatarBtn.classList.remove('hidden');
    }
}

function showAvatarPlaceholder() {
    if (currentAvatarImg && avatarPlaceholder && removeAvatarBtn) {
        currentAvatarImg.classList.add('hidden');
        avatarPlaceholder.classList.remove('hidden');
        removeAvatarBtn.classList.add('hidden');
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('profile-submit-btn');
    const submitText = submitBtn?.querySelector('.submit-text');
    const submitLoading = submitBtn?.querySelector('.submit-loading');
    
    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.classList.add('hidden');
    if (submitLoading) submitLoading.classList.remove('hidden');
    
    try {
        const formData = new FormData(profileForm);
        const data = Object.fromEntries(formData);
        
        const response = await fetch(CONFIG.apiUrl('api/users/me/profile'), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to update profile');
        }
        
        // Update current user data
        currentUser = { ...currentUser, ...result.user };
        
        // Update user name in nav
        if (userNameSpan) {
            userNameSpan.textContent = currentUser.full_name;
        }
        
        showMessage('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage(error.message, 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.classList.remove('hidden');
        if (submitLoading) submitLoading.classList.add('hidden');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('password-submit-btn');
    const submitText = submitBtn?.querySelector('.submit-text');
    const submitLoading = submitBtn?.querySelector('.submit-loading');
    
    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.classList.add('hidden');
    if (submitLoading) submitLoading.classList.remove('hidden');
    
    try {
        const formData = new FormData(passwordForm);
        const data = Object.fromEntries(formData);
        
        // Client-side validation
        if (data.new_password !== data.confirm_password) {
            throw new Error('New passwords do not match');
        }
        
        if (data.new_password.length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }
        
        const response = await fetch(CONFIG.apiUrl('api/users/me/password'), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to change password');
        }
        
        showMessage('Password changed successfully!', 'success');
        passwordForm.reset();
        
    } catch (error) {
        console.error('Error changing password:', error);
        showMessage(error.message, 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.classList.remove('hidden');
        if (submitLoading) submitLoading.classList.add('hidden');
    }
}

async function handlePreferencesUpdate(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('preferences-submit-btn');
    const submitText = submitBtn?.querySelector('.submit-text');
    const submitLoading = submitBtn?.querySelector('.submit-loading');
    
    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.classList.add('hidden');
    if (submitLoading) submitLoading.classList.remove('hidden');
    
    try {
        const formData = new FormData(preferencesForm);
        const data = {
            email_notifications: formData.has('email_notifications'),
            push_notifications: formData.has('push_notifications'),
            privacy_level: formData.get('privacy_level')
        };
        
        const response = await fetch(CONFIG.apiUrl('api/users/me/preferences'), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to update preferences');
        }
        
        // Update current user data
        currentUser = { ...currentUser, ...result.preferences };
        
        showMessage('Preferences updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating preferences:', error);
        showMessage(error.message, 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.classList.remove('hidden');
        if (submitLoading) submitLoading.classList.add('hidden');
    }
}

function handleAvatarDragOver(e) {
    e.preventDefault();
    avatarUploadZone.classList.add('dragover');
}

function handleAvatarDragLeave(e) {
    e.preventDefault();
    avatarUploadZone.classList.remove('dragover');
}

function handleAvatarDrop(e) {
    e.preventDefault();
    avatarUploadZone.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        handleAvatarFile(files[0]);
    }
}

function handleAvatarSelection(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        handleAvatarFile(file);
    }
}

function handleAvatarFile(file) {
    selectedAvatar = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        if (currentAvatarImg) {
            currentAvatarImg.src = e.target.result;
            currentAvatarImg.classList.remove('hidden');
            if (avatarPlaceholder) {
                avatarPlaceholder.classList.add('hidden');
            }
        }
    };
    reader.readAsDataURL(file);
    
    // Show upload button
    if (uploadAvatarBtn) {
        uploadAvatarBtn.classList.remove('hidden');
    }
}

async function handleAvatarUpload() {
    if (!selectedAvatar) return;
    
    const uploadBtn = uploadAvatarBtn;
    const uploadText = uploadBtn?.querySelector('.upload-text');
    const uploadLoading = uploadBtn?.querySelector('.upload-loading');
    
    if (uploadBtn) uploadBtn.disabled = true;
    if (uploadText) uploadText.classList.add('hidden');
    if (uploadLoading) uploadLoading.classList.remove('hidden');
    
    try {
        const formData = new FormData();
        formData.append('avatar', selectedAvatar);
        
        const response = await fetch(CONFIG.apiUrl('api/users/me/avatar'), {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to upload avatar');
        }
        
        // Update current user data
        currentUser.avatar_url = result.avatar_url;
        
        // Update UI
        showCurrentAvatar(result.avatar_url);
        if (uploadBtn) uploadBtn.classList.add('hidden');
        
        selectedAvatar = null;
        avatarInput.value = '';
        
        showMessage('Avatar uploaded successfully!', 'success');
        
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showMessage(error.message, 'error');
    } finally {
        if (uploadBtn) uploadBtn.disabled = false;
        if (uploadText) uploadText.classList.remove('hidden');
        if (uploadLoading) uploadLoading.classList.add('hidden');
    }
}

async function handleAvatarRemove() {
    try {
        const response = await fetch(CONFIG.apiUrl('api/users/me/avatar'), {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to remove avatar');
        }
        
        // Update current user data
        currentUser.avatar_url = null;
        
        // Update UI
        showAvatarPlaceholder();
        
        showMessage('Avatar removed successfully!', 'success');
        
    } catch (error) {
        console.error('Error removing avatar:', error);
        showMessage(error.message, 'error');
    }
}

async function loadUserActivity() {
    const activityLoading = document.getElementById('activity-loading');
    const activityList = document.getElementById('activity-list');
    const noActivity = document.getElementById('no-activity');
    
    if (activityLoading) activityLoading.classList.remove('hidden');
    if (activityList) activityList.classList.add('hidden');
    if (noActivity) noActivity.classList.add('hidden');
    
    try {
        const response = await fetch(CONFIG.apiUrl('api/users/me/activity?limit=20'), {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load activity');
        }
        
        const data = await response.json();
        const activities = data.activities || [];
        
        if (activities.length === 0) {
            if (noActivity) noActivity.classList.remove('hidden');
        } else {
            displayActivity(activities);
            if (activityList) activityList.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error loading activity:', error);
        if (noActivity) {
            noActivity.textContent = 'Error loading activity';
            noActivity.classList.remove('hidden');
        }
    } finally {
        if (activityLoading) activityLoading.classList.add('hidden');
    }
}

function displayActivity(activities) {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'flex items-center gap-3 p-4 bg-gray-50 rounded-lg';
        
        const icon = getActivityIcon(activity.type);
        const date = new Date(activity.activity_date).toLocaleDateString();
        
        activityItem.innerHTML = `
            <div class="flex-shrink-0">
                ${icon}
            </div>
            <div class="flex-1">
                <p class="text-sm text-gray-900">${escapeHtml(activity.description)}</p>
                <p class="text-xs text-gray-500">${date}</p>
            </div>
        `;
        
        activityList.appendChild(activityItem);
    });
}

function getActivityIcon(type) {
    switch (type) {
        case 'event_attendance':
            return '<div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
        case 'resource_upload':
            return '<div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg></div>';
        case 'message_sent':
            return '<div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg></div>';
        default:
            return '<div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>';
    }
}

async function handleAccountDelete() {
    const password = document.getElementById('delete-password').value;
    
    if (!password) {
        showMessage('Password is required to delete account', 'error');
        return;
    }
    
    const deleteBtn = confirmDeleteBtn;
    const deleteText = deleteBtn?.querySelector('.delete-text');
    const deleteLoading = deleteBtn?.querySelector('.delete-loading');
    
    if (deleteBtn) deleteBtn.disabled = true;
    if (deleteText) deleteText.classList.add('hidden');
    if (deleteLoading) deleteLoading.classList.remove('hidden');
    
    try {
        const response = await fetch(CONFIG.apiUrl('api/users/me/account'), {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to delete account');
        }
        
        showMessage('Account deleted successfully. Redirecting...', 'success');
        
        // Redirect to home page after 2 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        
    } catch (error) {
        console.error('Error deleting account:', error);
        showMessage(error.message, 'error');
    } finally {
        if (deleteBtn) deleteBtn.disabled = false;
        if (deleteText) deleteText.classList.remove('hidden');
        if (deleteLoading) deleteLoading.classList.add('hidden');
    }
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
        window.location.href = '/login.html';
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
window.closeDeleteModal = function() {
    if (deleteAccountModal) {
        deleteAccountModal.classList.add('hidden');
        document.getElementById('delete-password').value = '';
    }
};
