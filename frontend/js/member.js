// frontend/js/member.js
document.addEventListener('DOMContentLoaded', async () => {
    // Selectors for elements
    const userNameEl = document.getElementById('user-name');
    const profileNameEl = document.getElementById('profile-name');
    const profileEmailEl = document.getElementById('profile-email');
    const profileJoinedEl = document.getElementById('profile-joined');
    const profileStatusEl = document.getElementById('profile-status');
    const logoutButton = document.getElementById('logout-button');
    const loader = document.getElementById('loader');
    const rootEl = document.getElementById('root');
    const pendingBanner = document.getElementById('pending-banner');
    const notificationContainer = document.getElementById('notification-container');
    const refreshBtn = document.getElementById('refresh-btn');
    const helpBtn = document.getElementById('help-btn');

    // Toast notification utility
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `mb-2 px-6 py-3 rounded shadow-lg text-white font-medium flex items-center gap-2 animate-fade-in ${type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-brand-primary'}`;
        toast.innerHTML = `<span>${message}</span>`;
        notificationContainer.appendChild(toast);
        setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 500); }, duration);
    }

    // Load user data and dashboard
    async function loadDashboard() {
        try {
            // Fetch user data from our secure endpoint
            const res = await fetch(CONFIG.apiUrl('api/users/me'), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                showToast('Session expired. Please log in again.', 'error');
                setTimeout(() => window.location.href = '/login.html', 1500);
                return;
            }

            const user = await res.json();
            
            // Populate the dashboard with user data
            userNameEl.textContent = user.full_name;
            profileNameEl.textContent = user.full_name;
            profileEmailEl.textContent = user.email;
            profileStatusEl.textContent = user.status || 'approved';
            
            // Format the date nicely
            const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            profileJoinedEl.textContent = joinedDate;

            // Show pending banner if user is pending
            if (user.status === 'pending') {
                pendingBanner.classList.remove('hidden');
            }

            // Load dashboard stats
            await loadDashboardStats();
            
            // Load upcoming events
            await loadUpcomingEvents();
            
            // Load recent activity
            await loadRecentActivity();

            // Hide loader and show page content
            loader.classList.add('hidden');
            rootEl.classList.remove('hidden');

        } catch (error) {
            console.error('Error fetching user data:', error);
            showToast('Could not load dashboard. Please log in again.', 'error');
            setTimeout(() => window.location.href = '/login.html', 1500);
        }
    }

    // Load dashboard statistics
    async function loadDashboardStats() {
        try {
            const [eventsRes, messagesRes, resourcesRes] = await Promise.all([
                fetch(CONFIG.apiUrl('api/events/attended')),
                fetch(CONFIG.apiUrl('api/messages/count')),
                fetch(CONFIG.apiUrl('api/resources/count'))
            ]);

            const eventsAttended = eventsRes.ok ? await eventsRes.json() : { count: 0 };
            const messagesCount = messagesRes.ok ? await messagesRes.json() : { count: 0 };
            const resourcesCount = resourcesRes.ok ? await resourcesRes.json() : { count: 0 };

            document.getElementById('events-attended').textContent = eventsAttended.count || 0;
            document.getElementById('messages-count').textContent = messagesCount.count || 0;
            document.getElementById('resources-count').textContent = resourcesCount.count || 0;

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    // Load upcoming events
    async function loadUpcomingEvents() {
        try {
            const res = await fetch(CONFIG.apiUrl('api/events/upcoming'));
            const events = res.ok ? await res.json() : [];
            
            const container = document.getElementById('upcoming-events');
            
            if (events.length === 0) {
                container.innerHTML = '<div class="text-gray-500">No upcoming events right now. Check back soon!</div>';
                return;
            }

            let eventsHtml = '';
            events.slice(0, 3).forEach(event => {
                const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                
                eventsHtml += `
                    <div class="border-l-4 border-brand-primary pl-4 py-2">
                        <h3 class="font-semibold text-gray-900">${event.title}</h3>
                        <p class="text-sm text-gray-600">${eventDate} • ${event.location}</p>
                        <p class="text-sm text-gray-500 mt-1">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
                    </div>
                `;
            });
            
            container.innerHTML = eventsHtml;

        } catch (error) {
            console.error('Error loading upcoming events:', error);
            document.getElementById('upcoming-events').innerHTML = '<div class="text-gray-500">Could not load events.</div>';
        }
    }

    // Load recent activity
    async function loadRecentActivity() {
        try {
            const res = await fetch(CONFIG.apiUrl('api/users/me/activity'));
            const activities = res.ok ? await res.json() : [];
            
            const container = document.getElementById('recent-activity');
            
            if (activities.length === 0) {
                container.innerHTML = '<div class="text-gray-500">No recent activity to display.</div>';
                return;
            }

            let activitiesHtml = '';
            activities.slice(0, 5).forEach(activity => {
                const activityDate = new Date(activity.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
                
                activitiesHtml += `
                    <div class="flex items-center space-x-3">
                        <div class="w-2 h-2 bg-brand-primary rounded-full"></div>
                        <div class="flex-1">
                            <p class="text-sm text-gray-900">${activity.description}</p>
                            <p class="text-xs text-gray-500">${activityDate}</p>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = activitiesHtml;

        } catch (error) {
            console.error('Error loading recent activity:', error);
            document.getElementById('recent-activity').innerHTML = '<div class="text-gray-500">Could not load activity.</div>';
        }
    }

    // Initialize dashboard
    await loadDashboard();

    // Add event listener for the logout button
    logoutButton.addEventListener('click', async () => {
        try {
            await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST' });
            showToast('Logged out successfully.', 'success');
            setTimeout(() => window.location.href = '/login.html', 800);
        } catch (error) {
            console.error('Logout failed:', error);
            showToast('Logout failed. Please try again.', 'error');
        }
    });

    // Add event listener for refresh button
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<svg class="w-4 h-4 inline mr-2 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Refreshing...';
        
        try {
            await loadDashboardStats();
            await loadUpcomingEvents();
            await loadRecentActivity();
            showToast('Dashboard refreshed successfully.', 'success');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            showToast('Failed to refresh dashboard.', 'error');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Refresh Dashboard';
        }
    });

    // Add event listener for help button
    helpBtn.addEventListener('click', () => {
        showToast('Help feature coming soon! Contact support for assistance.', 'info');
    });
});