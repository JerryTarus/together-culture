// frontend/js/events.js
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Events page loaded');

    // --- 1. AUTHENTICATION CHECK ---
    try {
        const userRes = await fetch(CONFIG.apiUrl('api/users/me'));
        if (!userRes.ok) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = './login.html';
            return;
        }

        const userObj = await userRes.json();
        const user = userObj.user;
        console.log('User authenticated:', user.email);

        // Set user name in header
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = user.full_name;

        // Setup logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST' });
                    window.location.href = './login.html';
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            });
        }

        // Show admin features if user is admin
        if (user.role === 'admin') {
            const createEventBtn = document.getElementById('create-event-btn');
            if (createEventBtn) {
                createEventBtn.classList.remove('hidden');
            }
        }

    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = './login.html';
        return;
    }
});