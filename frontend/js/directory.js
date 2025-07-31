document.addEventListener('DOMContentLoaded', () => {
    // Page elements
    const tableBody = document.getElementById('members-table-body');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const logoutButton = document.querySelector('#logout-button') || document.querySelector('#logout-button-placeholder');
    const activityModal = document.getElementById('activity-modal');
    const activityContent = document.getElementById('activity-content');
    const activityModalTitle = document.getElementById('activity-modal-title');
    const closeActivityButton = document.getElementById('close-activity-button');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const exportCsvBtn = document.getElementById('export-csv');
    const notificationContainer = document.getElementById('notification-container');

    // Toast notification utility
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `mb-2 px-6 py-3 rounded shadow-lg text-white font-medium flex items-center gap-2 animate-fade-in ${type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-brand-primary'}`;
        toast.innerHTML = `<span>${message}</span>`;
        notificationContainer.appendChild(toast);
        setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 500); }, duration);
    }

    // State for all members
    let allMembers = [];
    let filteredMembers = [];
    let currentUser = null;

    // Get current user info first
    const getCurrentUser = async () => {
        try {
            const res = await fetch(CONFIG.apiUrl('api/users/me'));
            if (res.ok) {
                const data = await res.json();
                currentUser = data.user;
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
    };

    // Fetch and display all members when the page loads
    const fetchAndRenderMembers = async () => {
        try {
            const res = await fetch(CONFIG.apiUrl('api/users'));
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    showToast('Access Denied. Redirecting to login.', 'error');
                    setTimeout(() => window.location.href = './login.html', 1500);
                }
                throw new Error('Could not fetch members');
            }
            allMembers = await res.json();
            filteredMembers = allMembers;
            renderTable(filteredMembers);
        } catch (error) {
            console.error('Error fetching members:', error);
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-red-500">Error loading members.</td></tr>`;
            showToast('Error loading members.', 'error');
        }
    };

    // Function to render the table rows from member data
    const renderTable = (members) => {
        if (members.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8">No members found.</td></tr>`;
            return;
        }
        tableBody.innerHTML = '';
        members.forEach(member => {
            const joinedDate = new Date(member.created_at).toLocaleDateString();
            const row = `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-4 font-medium">${member.full_name}</td>
                    <td class="p-4">${member.email} <button class="copy-email-btn ml-2 text-xs text-gray-400 hover:text-brand-primary" data-email="${member.email}" title="Copy Email">📋</button></td>
                    <td class="p-4 capitalize">${member.role}</td>
                    <td class="p-4">${joinedDate}</td>
                    <td class="p-4 space-x-2">
                        ${currentUser && currentUser.role === 'admin' ? `<button class="view-btn text-blue-600 hover:underline" data-id="${member.id}">View</button>` : `<button class="edit-btn text-blue-600 hover:underline" data-id="${member.id}">Edit</button>`}
                        ${member.id !== currentUser.id ? `<button class="delete-btn text-red-600 hover:underline" data-id="${member.id}">Delete</button>` : ''}
                        ${member.role === 'member' ? `<button class="activity-btn text-green-600 hover:underline" data-id="${member.id}" data-name="${member.full_name}">Activity</button>` : ''}
                    </td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    // Filter members by search input
    function filterMembers() {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            filteredMembers = allMembers;
        } else {
            filteredMembers = allMembers.filter(member =>
                member.full_name.toLowerCase().includes(query) ||
                member.email.toLowerCase().includes(query) ||
                member.role.toLowerCase().includes(query)
            );
        }
        renderTable(filteredMembers);
        clearSearchBtn.classList.toggle('hidden', !query);
    }

    searchInput.addEventListener('input', filterMembers);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterMembers();
    });

    // --- EVENT LISTENERS ---

    // Use event delegation for edit and delete buttons
    tableBody.addEventListener('click', async (e) => {
        const target = e.target;
        const userId = target.dataset.id;

        // Handle COPY EMAIL button
        if (target.classList.contains('copy-email-btn')) {
            navigator.clipboard.writeText(target.dataset.email).then(() => {
                showToast('Email copied to clipboard!', 'success');
            });
            return;
        }

        // Handle DELETE button click
        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                try {
                    const res = await fetch(CONFIG.apiUrl(`api/users/${userId}`), { method: 'DELETE' });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message);
                    showToast('User deleted successfully.', 'success');
                    fetchAndRenderMembers(); // Refresh the table
                } catch (error) {
                    showToast(`Error: ${error.message}`, 'error');
                }
            }
        }

        // Handle EDIT button click
        if (target.classList.contains('edit-btn')) {
            try {
                const res = await fetch(CONFIG.apiUrl(`api/users/${userId}`));
                if (!res.ok) throw new Error('Could not fetch user details.');
                const user = await res.json();
                // Populate and show the modal for editing
                document.getElementById('edit-user-id').value = user.id;
                document.getElementById('edit-full-name').value = user.full_name;
                document.getElementById('edit-email').value = user.email;
                document.getElementById('edit-role').value = user.role;
                document.getElementById('edit-bio').value = user.bio || '';
                document.getElementById('edit-skills').value = user.skills || '';
                // Enable all fields for editing
                document.getElementById('edit-full-name').disabled = false;
                document.getElementById('edit-email').disabled = false;
                document.getElementById('edit-role').disabled = false;
                document.getElementById('edit-bio').disabled = false;
                document.getElementById('edit-skills').disabled = false;
                document.getElementById('save-edit-btn').classList.remove('hidden');
                editModal.classList.remove('hidden');
            } catch (error) {
                 alert(`Error: ${error.message}`);
            }
        }

        // Handle VIEW button click for admin
        if (target.classList.contains('view-btn')) {
            try {
                const res = await fetch(CONFIG.apiUrl(`api/users/${userId}`));
                if (!res.ok) throw new Error('Could not fetch user details.');
                const user = await res.json();
                // Populate and show the modal for viewing (read-only)
                document.getElementById('edit-user-id').value = user.id;
                document.getElementById('edit-full-name').value = user.full_name;
                document.getElementById('edit-email').value = user.email;
                document.getElementById('edit-role').value = user.role;
                document.getElementById('edit-bio').value = user.bio || '';
                document.getElementById('edit-skills').value = user.skills || '';
                // Disable all fields for view-only
                document.getElementById('edit-full-name').disabled = true;
                document.getElementById('edit-email').disabled = true;
                document.getElementById('edit-role').disabled = true;
                document.getElementById('edit-bio').disabled = true;
                document.getElementById('edit-skills').disabled = true;
                document.getElementById('save-edit-btn').classList.add('hidden');
                editModal.classList.remove('hidden');
            } catch (error) {
                 alert(`Error: ${error.message}`);
            }
        }

        // Handle ACTIVITY button click
        if (target.classList.contains('activity-btn')) {
            const memberName = target.dataset.name;
            await showMemberActivity(userId, memberName);
        }
    });

    // Handle Edit Form Submission
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('edit-user-id').value;
        const updatedData = {
            full_name: document.getElementById('edit-full-name').value,
            email: document.getElementById('edit-email').value,
            role: document.getElementById('edit-role').value,
            bio: document.getElementById('edit-bio').value,
            skills: document.getElementById('edit-skills').value,
        };

        try {
            const res = await fetch(CONFIG.apiUrl(`api/users/${userId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            if (!res.ok) throw new Error('Could not update member.');
            showToast('Member updated successfully.', 'success');
            editModal.classList.add('hidden');
            fetchAndRenderMembers();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    // Cancel button in modal
    cancelEditButton.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    // Function to show member activity
    const showMemberActivity = async (userId, memberName) => {
        activityModalTitle.textContent = `${memberName} - Activity Log`;
        activityContent.innerHTML = '<div class="text-center p-8">Loading activity...</div>';
        activityModal.classList.remove('hidden');

        try {
            // Fetch visits
            const visitsRes = await fetch(CONFIG.apiUrl(`api/events/visits/user/${userId}`));
            const visits = await visitsRes.json();

            // Fetch messages (conversations where user is involved)
            const messagesRes = await fetch(CONFIG.apiUrl(`api/messages/conversations`));
            const conversations = await messagesRes.json();
            const userConversations = conversations.filter(conv => 
                conv.user1_id == userId || conv.user2_id == userId
            );

            let activityHtml = '';

            // Visits section
            activityHtml += `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold mb-3">Event Visits (${visits.length})</h3>
                    ${visits.length === 0 ? 
                        '<div class="text-gray-500 italic">No visits recorded</div>' :
                        `<div class="space-y-2">
                            ${visits.map(visit => `
                                <div class="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                                    <div class="font-medium">${visit.event_title}</div>
                                    <div class="text-sm text-gray-600">${visit.event_description}</div>
                                    <div class="text-sm text-gray-500 mt-1">
                                        📅 Event Date: ${new Date(visit.event_date).toLocaleDateString()} | 
                                        📍 ${visit.location} | 
                                        ✓ Visited: ${new Date(visit.visit_date).toLocaleDateString()}
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                </div>
            `;

            // Conversations section
            activityHtml += `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold mb-3">Conversations (${userConversations.length})</h3>
                    ${userConversations.length === 0 ? 
                        '<div class="text-gray-500 italic">No conversations</div>' :
                        `<div class="space-y-2">
                            ${userConversations.map(conv => {
                                const otherUserName = conv.user1_id == userId ? conv.user2_name : conv.user1_name;
                                return `
                                    <div class="bg-gray-50 p-3 rounded border-l-4 border-green-500">
                                        <div class="font-medium">Chat with ${otherUserName}</div>
                                        <div class="text-sm text-gray-500">
                                            Started: ${new Date(conv.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>`
                    }
                </div>
            `;

            activityContent.innerHTML = activityHtml;

        } catch (error) {
            console.error('Error loading member activity:', error);
            activityContent.innerHTML = '<div class="text-red-500 p-4">Error loading member activity.</div>';
        }
    };

    // Close activity modal
    closeActivityButton.addEventListener('click', () => {
        activityModal.classList.add('hidden');
    });

    // Logout function
    async function logout() {
        try {
            const response = await fetch(`${CONFIG.apiUrl('api/auth/logout')}`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                window.location.href = '/login.html';
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if logout request fails
            window.location.href = '/login.html';
        }
    }

    // Logout button
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST' });
            // Clear any local storage/session data
            localStorage.clear();
            sessionStorage.clear();

            // Show logout message and redirect to homepage
            showMessage('Logged out successfully. Redirecting...', 'success', 1500);
            setTimeout(() => {
                window.location.href = '/';
            }, 1600);
        });
    }

    // Export CSV
    exportCsvBtn.addEventListener('click', () => {
        if (!filteredMembers.length) {
            showToast('No members to export.', 'error');
            return;
        }
        const csvRows = [
            ['Full Name', 'Email', 'Role', 'Joined'],
            ...filteredMembers.map(m => [
                m.full_name,
                m.email,
                m.role,
                new Date(m.created_at).toLocaleDateString()
            ])
        ];
        const csvContent = csvRows.map(row => row.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `members_export_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV export started.', 'success');
    });

    // Initial load
    const initPage = async () => {
        await getCurrentUser();
        await fetchAndRenderMembers();
    };

    initPage();
});