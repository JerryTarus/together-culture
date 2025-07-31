// frontend/js/admin.js
document.addEventListener('DOMContentLoaded', async () => {
    // Page Elements
    const loader = document.getElementById('loader');
    const rootEl = document.getElementById('root');
    const logoutButton = document.getElementById('logout-button');

    // --- 1. VERIFY ADMIN STATUS & GET USER INFO ---
    try {
        const userRes = await fetch(CONFIG.apiUrl('api/users/me'));

        if (!userRes.ok) { // Not logged in
            window.location.href = './login.html';
            return;
        }

        const userObj = await userRes.json();
        const user = userObj.user;

        if (!user || user.role !== 'admin') { // Not an admin
            alert('Access Denied: You do not have permission to view this page.');
            window.location.href = './member_dashboard.html';
            return;
        }

        document.getElementById('user-name').textContent = user.full_name;
        // Set user name in header (new nav)
        const userNameHeader = document.getElementById('user-name-header');
        if (userNameHeader) userNameHeader.textContent = user.full_name;
        // Attach logout to header button
        const logoutHeaderBtn = document.getElementById('logout-button-header');
        if (logoutHeaderBtn) {
            logoutHeaderBtn.addEventListener('click', async () => {
                try {
                    await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST' });
                    window.location.href = './login.html';
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            });
        }

    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = './login.html';
        return;
    }

    // --- 2. FETCH DASHBOARD STATS ---
    async function loadDashboardStats() {
        try {
            const statsRes = await fetch(CONFIG.apiUrl('api/admin/stats'));
            if (!statsRes.ok) throw new Error('Failed to fetch stats');
            const stats = await statsRes.json();

            document.getElementById('total-members').textContent = stats.total_members;
            document.getElementById('total-events').textContent = stats.total_events;
            document.getElementById('total-visits').textContent = stats.total_visits;
            document.getElementById('total-resources').textContent = stats.total_resources;

            // Load additional stats
            await loadAdditionalStats();
            // Hide loader and show root after stats are loaded
            if (loader) loader.style.display = 'none';
            if (rootEl) rootEl.classList.remove('hidden');

        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            showToast('Could not load dashboard data.', 'error');
        }
    }

    // --- 3. LOAD DASHBOARD STATS ON PAGE LOAD ---
    await loadDashboardStats();

    // Load additional statistics
    async function loadAdditionalStats() {
        try {
            // Get new members in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const [newMembersRes, activeEventsRes, avgAttendanceRes] = await Promise.all([
                fetch(CONFIG.apiUrl(`api/users/status/approved`)),
                fetch(CONFIG.apiUrl('api/events')),
                fetch(CONFIG.apiUrl('api/events/attendance-stats'))
            ]);

            const newMembers = newMembersRes.ok ? await newMembersRes.json() : [];
            const activeEvents = activeEventsRes.ok ? await activeEventsRes.json() : [];
            const avgAttendance = avgAttendanceRes.ok ? await avgAttendanceRes.json() : { average: 0 };

            // Count new members in last 30 days
            const recentMembers = newMembers.filter(member => 
                new Date(member.created_at) >= thirtyDaysAgo
            ).length;

            // Count active events (upcoming)
            const upcomingEvents = activeEvents.filter(event => 
                new Date(event.event_date) >= new Date()
            ).length;

            document.getElementById('new-members').textContent = recentMembers;
            document.getElementById('active-events').textContent = upcomingEvents;
            document.getElementById('avg-attendance').textContent = Math.round(avgAttendance.average || 0);

        } catch (error) {
            console.error('Failed to load additional stats:', error);
        }
    }

    // --- 3. FETCH AND RENDER PENDING USERS ---
    async function loadPendingUsers() {
        const container = document.getElementById('pending-users-table-container');
        const countElement = document.getElementById('pending-count');

        container.innerHTML = '<div class="text-gray-500">Loading pending users...</div>';

        try {
            const res = await fetch(CONFIG.apiUrl('api/users/status/pending'));
            if (!res.ok) throw new Error('Failed to fetch pending users');

            const users = await res.json();

            // Update count
            countElement.textContent = users.length;

            if (!Array.isArray(users) || users.length === 0) {
                container.innerHTML = '<div class="text-gray-500">No pending users at this time.</div>';
                return;
            }

            let tableHtml = `
                <div class="overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-200">
                                <th class="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                                <th class="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                                <th class="px-4 py-3 text-left font-semibold text-gray-700">Registered</th>
                                <th class="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            for (const user of users) {
                const registerDate = new Date(user.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                tableHtml += `
                    <tr class="border-b border-gray-100 hover:bg-gray-50">
                        <td class="px-4 py-3">${user.full_name}</td>
                        <td class="px-4 py-3 text-gray-600">${user.email}</td>
                        <td class="px-4 py-3 text-gray-500">${registerDate}</td>
                        <td class="px-4 py-3">
                            <div class="flex gap-2 justify-center">
                                <button class="approve-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors" data-user-id="${user.id}">
                                    Approve
                                </button>
                                <button class="reject-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors" data-user-id="${user.id}">
                                    Reject
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }

            tableHtml += '</tbody></table></div>';
            container.innerHTML = tableHtml;

            // Attach button handlers
            container.querySelectorAll('.approve-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const userId = btn.getAttribute('data-user-id');
                    btn.disabled = true;
                    btn.textContent = 'Approving...';

                    try {
                        const res = await fetch(CONFIG.apiUrl(`api/users/${userId}/approve`), { method: 'PATCH' });
                        if (!res.ok) throw new Error('Failed to approve user');

                        showToast('User approved successfully', 'success');
                        loadPendingUsers();
                    } catch (err) {
                        showToast('Failed to approve user', 'error');
                        btn.disabled = false;
                        btn.textContent = 'Approve';
                    }
                });
            });

            container.querySelectorAll('.reject-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const userId = btn.getAttribute('data-user-id');
                    btn.disabled = true;
                    btn.textContent = 'Rejecting...';

                    try {
                        const res = await fetch(CONFIG.apiUrl(`api/users/${userId}/reject`), { method: 'PATCH' });
                        if (!res.ok) throw new Error('Failed to reject user');

                        showToast('User rejected successfully', 'success');
                        loadPendingUsers();
                    } catch (err) {
                        showToast('Failed to reject user', 'error');
                        btn.disabled = false;
                        btn.textContent = 'Reject';
                    }
                });
            });

        } catch (err) {
            container.innerHTML = '<div class="text-red-500">Error loading pending users.</div>';
        }
    }

    // --- 4. LOAD RECENT ACTIVITY ---
    async function loadRecentActivity() {
        try {
            const response = await fetch(CONFIG.apiUrl('api/admin/recent-activity'), {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load recent activity');
            }

            const activities = await response.json();
            displayRecentActivity(activities);

        } catch (error) {
            console.error('Error loading recent activity:', error);
            const container = document.getElementById('recent-activity');
            if (container) {
                container.innerHTML = '<p class="text-gray-500 text-sm">Unable to load recent activity</p>';
            }
        }
    }

    function displayRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No recent activity</p>';
            return;
        }

        container.innerHTML = activities.map(activity => `
        <div class="flex items-start space-x-3 py-2">
            <div class="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
            <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900">${escapeHtml(activity.description)}</p>
                <p class="text-xs text-gray-500">${formatTimeAgo(activity.created_at)}</p>
            </div>
        </div>
    `).join('');
    }

    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
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

    // --- 5. LOAD RECENT MEMBERS ---
    async function loadRecentMembers() {
        const container = document.getElementById('recent-members');
        container.innerHTML = '<div class="text-gray-500 text-sm">Loading recent members...</div>';

        try {
            const res = await fetch(CONFIG.apiUrl('api/users'));
            if (!res.ok) throw new Error('Failed to fetch recent members');

            const members = await res.json();

            if (!Array.isArray(members) || members.length === 0) {
                container.innerHTML = '<div class="text-gray-500 text-sm">No members to display.</div>';
                return;
            }

            let membersHtml = '';
            members.slice(0, 5).forEach(member => {
                const joinDate = new Date(member.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });

                const statusColor = member.status === 'approved' ? 'text-green-600' : 
                                  member.status === 'pending' ? 'text-yellow-600' : 'text-red-600';

                membersHtml += `
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-900">${member.full_name}</p>
                            <p class="text-xs text-gray-500">${joinDate}</p>
                        </div>
                        <span class="text-xs font-medium ${statusColor} capitalize">${member.status}</span>
                    </div>
                `;
            });

            container.innerHTML = membersHtml;

        } catch (error) {
            console.error('Error loading recent members:', error);
            container.innerHTML = '<div class="text-gray-500 text-sm">Could not load recent members.</div>';
        }
    }

    // Toast notification helper
    function showToast(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const color = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-gray-700';
        const toast = document.createElement('div');
        toast.className = `${color} text-white px-4 py-2 rounded shadow mb-2 animate-fade-in`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 2500);
    }

    // Initial load
    await loadDashboardStats();
    await loadPendingUsers();
    await loadRecentActivity();
    await loadRecentMembers();

    // --- 6. HIDE LOADER AND SHOW PAGE ---
    loader.classList.add('hidden');
    rootEl.classList.remove('hidden');

    // --- 7. LOGOUT BUTTON ---
    logoutButton.addEventListener('click', async () => {
        try {
            await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST' });
            window.location.href = './login.html';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });

    // --- 8. PROPER NAVIGATION HANDLING ---
    // Ensure navigation links work properly without interfering with logout
    const navLinks = document.querySelectorAll('nav a[href], aside a[href], header a[href]');
    navLinks.forEach(link => {
        // Remove any existing event listeners that might interfere
        link.addEventListener('click', (e) => {
            // Allow normal navigation, just stop propagation to prevent bubbling
            e.stopPropagation();

            // For events links specifically, ensure they navigate properly
            if (link.href.includes('events.html')) {
                e.preventDefault();
                window.location.href = './events.html';
            }
        });
    });

    // Ensure logout buttons are properly isolated
    const logoutButtons = document.querySelectorAll('#logout-button, #logout-button-header');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
    });

    // Navigation event listeners
    const eventsBtn = document.getElementById('eventsBtn');
    const sidebarEventsBtn = document.getElementById('sidebarEventsBtn');

    if (eventsBtn) {
        eventsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = './events.html';
        });
    }

    if (sidebarEventsBtn) {
        sidebarEventsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = './events.html';
        });
    }
});