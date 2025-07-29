// frontend/js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', handleTogglePassword);
        }
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

function handleTogglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeOffIcon = document.getElementById('eye-off-icon');
    if (!passwordInput) return;
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (eyeIcon) eyeIcon.classList.add('hidden');
        if (eyeOffIcon) eyeOffIcon.classList.remove('hidden');
    } else {
        passwordInput.type = 'password';
        if (eyeIcon) eyeIcon.classList.remove('hidden');
        if (eyeOffIcon) eyeOffIcon.classList.add('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('Login form submitted'); // Debug log
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    const loginButton = document.getElementById('login-button');
    const messageDiv = document.getElementById('error-message');
    
    // Validate inputs
    if (!email || !password) {
        showErrorMessage('Please enter both email and password.');
        return;
    }
    
    loginButton.disabled = true;
    loginButton.textContent = 'Logging in...';
    messageDiv.classList.add('hidden');
    
    try {
        // Check if CONFIG is available
        if (typeof CONFIG === 'undefined') {
            throw new Error('Configuration not loaded. Please refresh the page.');
        }
        
        const apiUrl = CONFIG.apiUrl('api/auth/login');
        console.log('Making request to:', apiUrl); // Debug log
        
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify({ email, password, rememberMe }),
        });
        
        console.log('Response status:', res.status); // Debug log
        
        if (!res.ok) {
            let errorMessage = 'Login failed. Please try again.';
            
            try {
                const data = await res.json();
                console.log('Error response data:', data); // Debug log
                
                if (data.message) {
                    errorMessage = data.message;
                }
                
                // Handle specific status errors
                if (data.errors && data.errors.status) {
                    if (data.errors.status === 'pending') {
                        showMessage('Your account is pending admin approval. You will be able to log in once approved.', 'warning', 5000);
                    } else if (data.errors.status === 'rejected' || data.errors.status === 'disabled') {
                        showMessage('Your account has been rejected or disabled. Please contact support.', 'error', 5000);
                    } else {
                        showMessage(data.message, 'warning', 5000);
                    }
                } else {
                    showErrorMessage(errorMessage);
                }
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                showErrorMessage('Server error. Please try again later.');
            }
            
            loginButton.disabled = false;
            loginButton.textContent = 'Log In';
            return;
        }
        
        const data = await res.json();
        console.log('Login successful:', data); // Debug log
        
        // Show success message
        showMessage('Login successful! Redirecting...', 'success', 2000);
        
        // Redirect based on role
        setTimeout(() => {
            const redirectUrl = data.user.role === 'admin' ? '/admin_dashboard.html' : '/member_dashboard.html';
            console.log('Redirecting to:', redirectUrl);
            window.location.href = redirectUrl;
        }, 1000);

    } catch (error) {
        console.error('Login error:', error); // Debug log
        
        let errorMessage = 'Network error. Please check your connection and try again.';
        if (error.message) {
            errorMessage = error.message;
        }
        
        showErrorMessage(errorMessage);
        loginButton.disabled = false;
        loginButton.textContent = 'Log In';
    }
}

function showErrorMessage(message) {
    const messageDiv = document.getElementById('error-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden');
        messageDiv.setAttribute('tabindex', '-1');
        messageDiv.focus();
    } else {
        // Fallback to toast if error div not found
        showMessage(message, 'error', 5000);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    console.log('Register form submitted'); // Debug log
    
    const registerButton = document.getElementById('register-button');
    const messageDiv = document.getElementById('message-div');
    
    registerButton.disabled = true;
    registerButton.textContent = 'Creating Account...';
    if (messageDiv) messageDiv.classList.add('hidden');
    
    const full_name = document.getElementById('full_name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirm_password = document.getElementById('confirm_password').value;
    
    if (password !== confirm_password) {
        showMessage('Passwords do not match.', 'error');
        registerButton.disabled = false;
        registerButton.textContent = 'Create Account';
        document.getElementById('confirm_password').focus();
        return;
    }
    
    try {
        // Check if CONFIG is available
        if (typeof CONFIG === 'undefined') {
            throw new Error('Configuration not loaded. Please refresh the page.');
        }
        
        const res = await fetch(CONFIG.apiUrl('api/auth/register'), {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify({ full_name, email, password }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            let errorMsg = data.message || 'Failed to register.';
            if (data.errors) {
                errorMsg += '\n' + Object.entries(data.errors)
                    .filter(([k, v]) => v)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('\n');
            }
            // If message is about pending approval, show as yellow toast
            if (data.message && data.message.toLowerCase().includes('pending')) {
                showMessage(data.message, 'warning', 5000);
            } else {
                showMessage(errorMsg, 'error', 5000);
            }
            registerButton.disabled = false;
            registerButton.textContent = 'Create Account';
            return;
        }
        
        showMessage(data.message, 'success', 5000);
        setTimeout(() => { window.location.href = '/login.html'; }, 2500);
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage(error.message || 'Network error. Please try again.', 'error');
        registerButton.disabled = false;
        registerButton.textContent = 'Create Account';
    }
}

function showMessage(message, type = 'info', duration = 3000) {
    // type: 'success', 'error', 'warning', 'info'
    console.log('Showing message:', message, type); // Debug log

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
    let icon = '';
    if (type === 'warning') {
        icon = '<svg class="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"/></svg>';
    } else if (type === 'success') {
        icon = '<svg class="w-5 h-5 text-green-300 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
    } else if (type === 'error') {
        icon = '<svg class="w-5 h-5 text-red-300 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    }
    
    toast.className = `mb-2 px-6 py-3 rounded shadow-lg text-white font-medium flex items-center gap-2 animate-fade-in ${type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : type === 'warning' ? 'bg-yellow-500' : 'bg-brand-primary'}`;
    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => { 
        toast.classList.add('opacity-0'); 
        setTimeout(() => toast.remove(), 500); 
    }, duration);
}