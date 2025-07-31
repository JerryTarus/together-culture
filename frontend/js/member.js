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

    let currentUser = null;

    // Toast notification utility
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `mb-2 px-6 py-3 rounded-lg shadow-lg text-white font-medium flex items-center gap-2 animate-fade-in transition-all duration-300 ${
            type === 'error' ? 'bg-red-500' : 
            type === 'success' ? 'bg-green-500' : 
            type === 'warning' ? 'bg-yellow-500' :
            'bg-brand-primary'
        }`;

        const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

        notificationContainer.appendChild(toast);

        // Auto remove with fade out
        setTimeout(() => { 
            toast.classList.add('opacity-0', 'transform', 'translate-x-full'); 
            setTimeout(() => toast.remove(), 300); 
        }, duration);
    }

    // Load user data and dashboard
    async function loadDashboard() {
        try {
            // Fetch user data from our secure endpoint
            const res = await fetch(CONFIG.apiUrl('api/users/me'), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!res.ok) {
                showToast('Session expired. Please log in again.', 'error');
                setTimeout(() => window.location.href = './login.html', 1500);
                return;
            }

            const data = await res.json();
            currentUser = data.user || data;

            // Redirect admin users to admin dashboard
            if (currentUser.role === 'admin') {
                window.location.href = './admin_dashboard.html';
                return;
            }

            // Populate the dashboard with user data
            userNameEl.textContent = currentUser.full_name;
            profileNameEl.textContent = currentUser.full_name;
            profileEmailEl.textContent = currentUser.email;
            profileStatusEl.textContent = currentUser.status || 'approved';

            // Set profile avatar
            const profileAvatar = document.getElementById('profile-avatar');
            if (profileAvatar) {
                profileAvatar.textContent = currentUser.full_name.charAt(0).toUpperCase();
            }

            // Set status color
            profileStatusEl.className = `capitalize font-semibold ${
                currentUser.status === 'approved' ? 'text-green-600' : 
                currentUser.status === 'pending' ? 'text-yellow-600' : 
                'text-red-600'
            }`;

            // Format the date nicely
            const joinedDate = new Date(currentUser.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            profileJoinedEl.textContent = joinedDate;

            // Show pending banner if user is pending
            if (currentUser.status === 'pending') {
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
            setTimeout(() => window.location.href = './login.html', 1500);
        }
    }

    // Load dashboard statistics with proper error handling
    async function loadDashboardStats() {
        try {
            // Fetch all stats in parallel with fallback
            const statsPromises = [
                fetchWithFallback('api/events/attended', { count: 0 }),
                fetchWithFallback('api/messages/count', { count: 0 }),
                fetchWithFallback('api/resources/count', { count: 0 })
            ];

            const [eventsAttended, messagesCount, resourcesCount] = await Promise.all(statsPromises);

            // Update stats with animation
            animateCountUp('events-attended', eventsAttended.count || 0);
            animateCountUp('messages-count', messagesCount.count || 0);
            animateCountUp('resources-count', resourcesCount.count || 0);

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            showToast('Some dashboard statistics could not be loaded.', 'warning');
        }
    }

    // Helper function to fetch with fallback
    async function fetchWithFallback(endpoint, fallback = {}) {
        try {
            const res = await fetch(CONFIG.apiUrl(endpoint), { credentials: 'include' });
            if (res.ok) {
                return await res.json();
            }
            return fallback;
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            return fallback;
        }
    }

    // Animate count up effect
    function animateCountUp(elementId, targetValue, duration = 1000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = 0;
        const increment = targetValue / (duration / 16); // 60fps
        let currentValue = 0;

        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentValue);
        }, 16);
    }

    // Load upcoming events with enhanced display
    async function loadUpcomingEvents() {
        try {
            const res = await fetch(CONFIG.apiUrl('api/events/upcoming'), { credentials: 'include' });
            const events = res.ok ? await res.json() : [];

            const container = document.getElementById('upcoming-events');

            if (events.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <p class="mt-2 text-gray-500">No upcoming events right now.</p>
                        <p class="text-sm text-gray-400">Check back soon for new events!</p>
                    </div>
                `;
                return;
            }

            let eventsHtml = '';
            events.slice(0, 5).forEach((event, index) => {
                const eventDate = new Date(event.event_date);
                const formattedDate = eventDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });

                const formattedTime = eventDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });

                const isToday = eventDate.toDateString() === new Date().toDateString();
                const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

                eventsHtml += `
                    <div class="event-card group relative bg-gradient-to-r from-brand-primary/5 to-blue-50 border border-brand-primary/20 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
                         onclick="window.location.href='./events.html'">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <div class="w-3 h-3 bg-brand-primary rounded-full ${isToday ? 'animate-pulse' : ''}"></div>
                                    <h3 class="font-semibold text-gray-900 group-hover:text-brand-primary transition-colors">
                                        ${escapeHtml(event.title)}
                                    </h3>
                                </div>
                                <div class="space-y-1 text-sm text-gray-600">
                                    <div class="flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        <span class="font-medium">
                                            ${isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formattedDate} • ${formattedTime}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        </svg>
                                        <span>${escapeHtml(event.location)}</span>
                                    </div>
                                </div>
                                <p class="text-sm text-gray-500 mt-2 line-clamp-2">
                                    ${escapeHtml(event.description?.substring(0, 100) || '')}${event.description?.length > 100 ? '...' : ''}
                                </p>
                            </div>
                            ${isToday ? '<div class="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">Today</div>' : ''}
                        </div>
                    </div>
                `;
            });

            container.innerHTML = eventsHtml;

        } catch (error) {
            console.error('Error loading upcoming events:', error);
            document.getElementById('upcoming-events').innerHTML = `
                <div class="text-center py-6">
                    <p class="text-gray-500">Could not load events.</p>
                    <button onclick="loadUpcomingEvents()" class="mt-2 text-brand-primary hover:underline text-sm">Try again</button>
                </div>
            `;
        }
    }

    // Load recent activity with enhanced display
    async function loadRecentActivity() {
        try {
            const res = await fetch(CONFIG.apiUrl('api/users/me/activity'), { credentials: 'include' });
            const activities = res.ok ? await res.json() : [];

            const container = document.getElementById('recent-activity');

            if (activities.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-6">
                        <svg class="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        <p class="mt-2 text-gray-500">No recent activity to display.</p>
                        <p class="text-sm text-gray-400">Start engaging with events and resources!</p>
                    </div>
                `;
                return;
            }

            let activitiesHtml = '';
            activities.slice(0, 5).forEach((activity, index) => {
                const activityDate = new Date(activity.created_at);
                const timeAgo = getTimeAgo(activityDate);

                const activityIcon = getActivityIcon(activity.type);
                const activityColor = getActivityColor(activity.type);

                activitiesHtml += `
                    <div class="activity-item flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 ${activityColor} rounded-full flex items-center justify-center">
                                ${activityIcon}
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm text-gray-900 font-medium">${escapeHtml(activity.description)}</p>
                            <p class="text-xs text-gray-500 mt-1">${timeAgo}</p>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = activitiesHtml;

        } catch (error) {
            console.error('Error loading recent activity:', error);
            document.getElementById('recent-activity').innerHTML = `
                <div class="text-center py-4">
                    <p class="text-gray-500">Could not load activity.</p>
                    <button onclick="loadRecentActivity()" class="mt-2 text-brand-primary hover:underline text-sm">Try again</button>
                </div>
            `;
        }
    }

    // Helper functions
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    function getActivityIcon(type) {
        const icons = {
            event: '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z"></path></svg>',
            message: '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>',
            resource: '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>',
            default: '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path></svg>'
        };
        return icons[type] || icons.default;
    }

    function getActivityColor(type) {
        const colors = {
            event: 'bg-blue-500',
            message: 'bg-green-500',
            resource: 'bg-purple-500',
            default: 'bg-gray-500'
        };
        return colors[type] || colors.default;
    }

    // Check authentication and load dashboard
    async function checkAuthAndLoadDashboard() {
        try {
            console.log('Checking authentication...');
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/me`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.log('Not authenticated, redirecting to login');
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('User authenticated:', data.email, 'Role:', data.role);

            // Store user data
            currentUser = data;

            // Check if user is admin and redirect if needed
            if (data.role === 'admin') {
                console.log('Admin user detected, redirecting to admin dashboard');
                window.location.href = '/admin_dashboard.html';
                return;
            }

            console.log('Loading member dashboard for:', data.email);

            // Update user info in the UI
            updateUserInfo(data);

            // Load dashboard content
            await loadDashboardContent();

            console.log('Member dashboard loaded successfully');

        } catch (error) {
            console.error('Authentication error:', error);
            showToast('Authentication failed. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
    }

    // Load dashboard content
    async function loadDashboardContent() {
        try {
            console.log('Loading dashboard content...');
            await Promise.all([
                loadUpcomingEvents(),
                loadRecentActivity()
            ]);
            console.log('Dashboard content loaded successfully');
        } catch (error) {
            console.error('Error loading dashboard content:', error);
            showToast('Some dashboard content failed to load', 'warning');
        }
    }

    // Initialize dashboard
    // Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Member dashboard page loaded');

    try {
        const isAuthenticated = await checkAuthAndLoadDashboard();
        if (isAuthenticated) {
            await loadDashboard();
            await loadDashboardStats();
            await loadUpcomingEvents();
            await loadRecentActivity();
            console.log('Member dashboard initialization complete');
        }
    } catch (error) {
        console.error('Error initializing member dashboard:', error);
        showToast('Failed to initialize dashboard', 'error');
        // Don't redirect here as checkAuth will handle it
    }
});


    // Add event listener for the logout button
    logoutButton.addEventListener('click', async () => {
        try {
            const response = await fetch(CONFIG.apiUrl('api/auth/logout'), {
                method: 'POST',
                credentials: 'include'
            });

            // Clear any local storage/session data
            localStorage.clear();
            sessionStorage.clear();

            // Show logout message and redirect to homepage
            showToast('Logged out successfully. Redirecting...', 'success', 1500);
            setTimeout(() => {
                window.location.href = '/';
            }, 1600);
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if logout request fails
            window.location.href = '/';
        }
    });

    // Add event listener for refresh button
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        const originalHtml = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<svg class="w-4 h-4 inline mr-2 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Refreshing...';

        try {
            await Promise.all([
                loadDashboardStats(),
                loadUpcomingEvents(),
                loadRecentActivity()
            ]);
            showToast('Dashboard refreshed successfully.', 'success');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            showToast('Failed to refresh dashboard.', 'error');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalHtml;
        }
    });

    // Add event listener for help button
    helpBtn.addEventListener('click', () => {
        showToast('Help feature coming soon! Contact support for assistance.', 'info');
    });

    // Make functions globally accessible for onclick events
    window.loadUpcomingEvents = loadUpcomingEvents;
    window.loadRecentActivity = loadRecentActivity;
});