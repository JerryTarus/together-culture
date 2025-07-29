// frontend/js/settings.js
document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;

    // Element selectors
    const sidebarNav = document.getElementById('sidebar-nav');
    const logoutButton = document.getElementById('logout-button');
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    
    // Profile form elements
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileBio = document.getElementById('profile-bio');
    const profileSkills = document.getElementById('profile-skills');
    
    // Password form elements
    const currentPassword = document.getElementById('current-password');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    
    // Account info elements
    const accountRole = document.getElementById('account-role');
    const memberSince = document.getElementById('member-since');

    async function initialize() {
        await fetchCurrentUser();
        buildSidebar();
        populateUserData();
        setupEventListeners();
    }

    async function fetchCurrentUser() {
        try {
            const res = await fetch(CONFIG.apiUrl('api/users/me'));
            if (!res.ok) window.location.href = '/login.html';
            currentUser = await res.json();
        } catch (error) {
            window.location.href = '/login.html';
        }
    }

    function buildSidebar() {
        const commonLinks = `
            <a href="/events.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Events</a>
            <a href="/resources.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Resources</a>
            <a href="/messages.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Messages</a>
            <a href="/settings.html" class="flex items-center p-3 my-1 bg-brand-beige text-brand-primary rounded-lg font-semibold">Settings</a>
        `;

        if (currentUser.role === 'admin') {
            sidebarNav.innerHTML = `
                <a href="/admin_dashboard.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Dashboard</a>
                <a href="/member_directory.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Members</a>
                ${commonLinks}
            `;
        } else {
            sidebarNav.innerHTML = `
                <a href="/member_dashboard.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Dashboard</a>
                ${commonLinks}
            `;
        }
    }

    function populateUserData() {
        // Profile form
        profileName.value = currentUser.full_name || '';
        profileEmail.value = currentUser.email || '';
        profileBio.value = currentUser.bio || '';
        profileSkills.value = currentUser.skills || '';
        
        // Account info
        accountRole.textContent = currentUser.role || '';
        memberSince.textContent = new Date(currentUser.created_at).toLocaleDateString();
    }

    function setupEventListeners() {
        logoutButton.addEventListener('click', handleLogout);
        profileForm.addEventListener('submit', handleProfileUpdate);
        passwordForm.addEventListener('submit', handlePasswordChange);
    }

    // Toast notification utility
    function showToast(message, type = 'info', duration = 3000) {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.position = 'fixed';
            container.style.top = '1.5rem';
            container.style.right = '1.5rem';
            container.style.zIndex = '9999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'flex-end';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `mb-2 px-6 py-3 rounded shadow-lg text-white font-medium flex items-center gap-2 animate-fade-in ${type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-brand-primary'}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 500); }, duration);
    }

    async function handleProfileUpdate(e) {
        e.preventDefault();
        
        const profileData = {
            full_name: profileName.value.trim(),
            email: profileEmail.value.trim(),
            bio: profileBio.value.trim(),
            skills: profileSkills.value.trim()
        };
        
        if (!profileData.full_name || !profileData.email) {
            showToast('Name and email are required.', 'error');
            return;
        }
        
        try {
            const res = await fetch(CONFIG.apiUrl('api/users/me/profile'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            showToast('Profile updated successfully!', 'success');
            
            // Update current user data
            currentUser = { ...currentUser, ...profileData };
        } catch (error) {
            showToast('Error updating profile: ' + error.message, 'error');
        }
    }

    async function handlePasswordChange(e) {
        e.preventDefault();
        
        const currentPwd = currentPassword.value;
        const newPwd = newPassword.value;
        const confirmPwd = confirmPassword.value;
        
        if (!currentPwd || !newPwd || !confirmPwd) {
            showToast('All password fields are required.', 'error');
            return;
        }
        
        if (newPwd !== confirmPwd) {
            showToast('New passwords do not match.', 'error');
            return;
        }
        
        if (newPwd.length < 6) {
            showToast('New password must be at least 6 characters long.', 'error');
            return;
        }
        
        try {
            const res = await fetch(CONFIG.apiUrl('api/users/change-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: currentPwd,
                    newPassword: newPwd
                })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            showToast('Password changed successfully!', 'success');
            passwordForm.reset();
        } catch (error) {
            showToast('Error changing password: ' + error.message, 'error');
        }
    }

    async function handleLogout() {
        await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST' });
        window.location.href = '/login.html';
    }

    initialize();
});

// Function to toggle password visibility
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    
    if (field.type === 'password') {
        field.type = 'text';
        button.textContent = '🙈';
    } else {
        field.type = 'password';
        button.textContent = '👁️';
    }
}
