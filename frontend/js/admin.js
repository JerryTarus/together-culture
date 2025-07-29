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
            window.location.href = '/login.html';
            return;
        }

        const userObj = await userRes.json();
        const user = userObj.user;
        
        if (!user || user.role !== 'admin') { // Not an admin
            alert('Access Denied: You do not have permission to view this page.');
            window.location.href = '/member_dashboard.html';
            return;
        }

        document.getElementById('user-name').textContent = user.full_name;

    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return;
    }

    // --- 2. FETCH DASHBOARD STATS ---
    async function loadDashboardStats() {
        try {
            const [statsRes, resourcesRes] = await Promise.all([
                fetch(CONFIG.apiUrl('api/admin/stats')),
                fetch(CONFIG.apiUrl('api/resources/count'))
            ]);

            if (!statsRes.ok) throw new Error('Failed to fetch stats');
            if (!resourcesRes.ok) throw new Error('Failed to fetch resources');

            const stats = await statsRes.json();
            const resources = await resourcesRes.json();

            document.getElementById('total-members').textContent = stats.totalMembers;
            document.getElementById('total-events').textContent = stats.totalEvents;
            document.getElementById('total-visits').textContent = stats.totalVisits;
            document.getElementById('total-resources').textContent = resources.count;

            // Load additional stats
            await loadAdditionalStats();

        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            showToast('Could not load dashboard data.', 'error');
        }
    }

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
        const container = document.getElementById('recent-activity');
        container.innerHTML = '<div class="text-gray-500">Loading recent activity...</div>';
        
        try {
            const res = await fetch(CONFIG.apiUrl('api/admin/recent-activity'));
            if (!res.ok) throw new Error('Failed to fetch recent activity');
            
            const activities = await res.json();
            
            if (!Array.isArray(activities) || activities.length === 0) {
                container.innerHTML = '<div class="text-gray-500">No recent activity to display.</div>';
                return;
            }
            
            let activitiesHtml = '';
            activities.slice(0, 5).forEach(activity => {
                const activityDate = new Date(activity.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                activitiesHtml += `
                    <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
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
            container.innerHTML = '<div class="text-gray-500">Could not load recent activity.</div>';
        }
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
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });
});