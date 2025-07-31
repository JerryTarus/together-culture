// frontend/js/events.js

let currentPage = 1;
let currentLimit = 10;
let currentSearch = '';
let currentStatus = 'all';
let currentSortBy = 'date';
let currentSortOrder = 'DESC';
let isAdmin = false;
let editingEventId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Events page loaded');

    try {
        await checkAuth();
        await loadEvents();
        initializeEventListeners();
    } catch (error) {
        console.error('Error initializing events page:', error);
        showMessage('Failed to initialize page', 'error');
    }
});

// Check authentication and user role
async function checkAuth() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('User authenticated:', data.email);

        isAdmin = data.role === 'admin';
        updateUserInfo(data);

        // Show/hide admin-only elements
        const createBtn = document.getElementById('createEventBtn');
        if (createBtn) {
            createBtn.style.display = isAdmin ? 'flex' : 'none';
        }

    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/login.html';
    }
}

// Update user info in header
function updateUserInfo(user) {
    const userEmailEl = document.getElementById('userEmail');
    const userRoleEl = document.getElementById('userRole');

    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userRoleEl) userRoleEl.textContent = user.role;
}

// Initialize event listeners
function initializeEventListeners() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('-translate-x-full');
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Search and filters
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');

    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearch = this.value;
                currentPage = 1;
                loadEvents();
            }, 300);
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentStatus = this.value;
            currentPage = 1;
            loadEvents();
        });
    }

    if (sortBy) {
        sortBy.addEventListener('change', function() {
            currentSortBy = this.value;
            currentPage = 1;
            loadEvents();
        });
    }

    if (sortOrder) {
        sortOrder.addEventListener('change', function() {
            currentSortOrder = this.value;
            currentPage = 1;
            loadEvents();
        });
    }

    // Modal controls
    const createEventBtn = document.getElementById('createEventBtn');
    const eventModal = document.getElementById('eventModal');
    const cancelEventBtn = document.getElementById('cancelEventBtn');
    const eventForm = document.getElementById('eventForm');
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    const eventDetailsModal = document.getElementById('eventDetailsModal');

    if (createEventBtn) {
        createEventBtn.addEventListener('click', openCreateEventModal);
    }

    if (cancelEventBtn) {
        cancelEventBtn.addEventListener('click', closeEventModal);
    }

    if (eventForm) {
        eventForm.addEventListener('submit', handleEventSubmit);
    }

    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', closeEventDetailsModal);
    }

    // Close modals when clicking outside
    if (eventModal) {
        eventModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEventModal();
            }
        });
    }

    if (eventDetailsModal) {
        eventDetailsModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEventDetailsModal();
            }
        });
    }
}

// Load events from API
async function loadEvents() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: currentLimit,
            search: currentSearch,
            status: currentStatus,
            sortBy: currentSortBy,
            sortOrder: currentSortOrder
        });

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/events?${params}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            displayEvents(data.data);
            displayPagination(data.pagination);
        } else {
            throw new Error(data.message || 'Failed to load events');
        }

    } catch (error) {
        console.error('Error loading events:', error);
        showMessage('Failed to load events. Please try again.', 'error');

        const container = document.getElementById('eventsContainer');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-circle text-3xl text-red-400 mb-4"></i>
                    <p class="text-gray-600">Failed to load events. Please try again.</p>
                    <button onclick="loadEvents()" class="mt-2 text-blue-600 hover:text-blue-700">Retry</button>
                </div>
            `;
        }
    }
}

// Display events in the UI
function displayEvents(events) {
    const container = document.getElementById('eventsContainer');
    if (!container) return;

    if (events.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-calendar-alt text-3xl text-gray-400 mb-4"></i>
                <p class="text-gray-600">No events found</p>
            </div>
        `;
        return;
    }

    const eventsHTML = events.map(event => {
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = eventDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusColor = {
            'active': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800',
            'pending': 'bg-yellow-100 text-yellow-800'
        };

        const isPast = event.is_past;
        const spotsRemaining = event.spots_remaining;
        const capacity = event.capacity;

        return `
            <div class="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow ${isPast ? 'opacity-75' : ''}" data-event-id="${event.id}">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h4 class="text-lg font-semibold text-gray-900 mb-2">${escapeHtml(event.title)}</h4>
                        <p class="text-gray-600 mb-3">${escapeHtml(event.description)}</p>

                        <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div class="flex items-center">
                                <i class="fas fa-calendar mr-2 text-gray-400"></i>
                                <span>${formattedDate} at ${formattedTime}</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-map-marker-alt mr-2 text-gray-400"></i>
                                <span>${escapeHtml(event.location)}</span>
                            </div>
                            ${capacity ? `
                                <div class="flex items-center">
                                    <i class="fas fa-users mr-2 text-gray-400"></i>
                                    <span>${event.attending_count}/${capacity} attending</span>
                                    ${spotsRemaining !== null ? `<span class="ml-1">(${spotsRemaining} spots left)</span>` : ''}
                                </div>
                            ` : `
                                <div class="flex items-center">
                                    <i class="fas fa-users mr-2 text-gray-400"></i>
                                    <span>${event.attending_count} attending</span>
                                </div>
                            `}
                        </div>
                    </div>

                    <div class="flex items-center space-x-2 ml-4">
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${statusColor[event.status] || 'bg-gray-100 text-gray-800'}">
                            ${event.status}
                        </span>
                        ${isPast ? '<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Past</span>' : ''}
                    </div>
                </div>

                <div class="flex justify-between items-center">
                    <button onclick="viewEventDetails(${event.id})" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View Details
                    </button>

                    <div class="flex space-x-2">
                        ${!isPast && !isAdmin ? `
                            <button onclick="handleRSVP(${event.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                RSVP
                            </button>
                        ` : ''}

                        ${isAdmin ? `
                            <button onclick="editEvent(${event.id})" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                Edit
                            </button>
                            <button onclick="deleteEvent(${event.id})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = eventsHTML;
}

// Display pagination
function displayPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    const { page, totalPages, total } = pagination;

    if (totalPages <= 1) {
        container.innerHTML = `
            <div class="text-sm text-gray-600">
                Showing ${total} event${total !== 1 ? 's' : ''}
            </div>
        `;
        return;
    }

    let paginationHTML = `
        <div class="flex items-center justify-between">
            <div class="text-sm text-gray-600">
                Showing page ${page} of ${totalPages} (${total} total events)
            </div>
            <div class="flex space-x-2">
    `;

    // Previous button
    if (page > 1) {
        paginationHTML += `
            <button onclick="changePage(${page - 1})" class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Previous
            </button>
        `;
    }

    // Page numbers
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
        paginationHTML += `
            <button onclick="changePage(1)" class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">1</button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="px-2 text-gray-500">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" class="px-3 py-1 text-sm ${i === page ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'} rounded-lg transition-colors">
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="px-2 text-gray-500">...</span>`;
        }
        paginationHTML += `
            <button onclick="changePage(${totalPages})" class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">${totalPages}</button>
        `;
    }

    // Next button
    if (page < totalPages) {
        paginationHTML += `
            <button onclick="changePage(${page + 1})" class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Next
            </button>
        `;
    }

    paginationHTML += `
            </div>
        </div>
    `;

    container.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    currentPage = page;
    loadEvents();
}

// Open create event modal
function openCreateEventModal() {
    editingEventId = null;
    document.getElementById('modalTitle').textContent = 'Create New Event';
    document.getElementById('eventForm').reset();

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('eventDate').value = today;

    document.getElementById('eventModal').classList.remove('hidden');
}

// Open edit event modal
async function editEvent(eventId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/events/${eventId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            const event = data.data;
            editingEventId = eventId;

            document.getElementById('modalTitle').textContent = 'Edit Event';
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDescription').value = event.description;

            const eventDate = new Date(event.date);
            document.getElementById('eventDate').value = eventDate.toISOString().split('T')[0];
            document.getElementById('eventTime').value = eventDate.toTimeString().slice(0, 5);

            document.getElementById('eventLocation').value = event.location;
            document.getElementById('eventCapacity').value = event.capacity || '';
            document.getElementById('eventStatus').value = event.status;

            document.getElementById('eventModal').classList.remove('hidden');
        } else {
            throw new Error(data.message || 'Failed to load event');
        }

    } catch (error) {
        console.error('Error loading event for editing:', error);
        showMessage('Failed to load event details', 'error');
    }
}

// Close event modal
function closeEventModal() {
    document.getElementById('eventModal').classList.add('hidden');
    editingEventId = null;
}

// Handle event form submission
async function handleEventSubmit(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('saveEventBtn');
    const originalText = saveBtn.textContent;
    
    // Show loading state
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const formData = {
        title: document.getElementById('eventTitle').value.trim(),
        description: document.getElementById('eventDescription').value.trim(),
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        location: document.getElementById('eventLocation').value.trim(),
        capacity: document.getElementById('eventCapacity').value || null,
        status: document.getElementById('eventStatus').value
    };

    try {
        const url = editingEventId 
            ? `${CONFIG.API_BASE_URL}/api/events/${editingEventId}`
            : `${CONFIG.API_BASE_URL}/api/events`;

        const method = editingEventId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showMessage(editingEventId ? 'Event updated successfully!' : 'Event created successfully!', 'success');
            closeEventModal();
            loadEvents();
        } else {
            throw new Error(data.message || 'Failed to save event');
        }

    } catch (error) {
        console.error('Error saving event:', error);
        showMessage('Failed to save event. Please try again.', 'error');
    } finally {
        // Reset button state
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/events/${eventId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showMessage('Event deleted successfully', 'success');
            loadEvents();
        } else {
            throw new Error(data.message || 'Failed to delete event');
        }

    } catch (error) {
        console.error('Error deleting event:', error);
        showMessage('Failed to delete event. Please try again.', 'error');
    }
}

// View event details
async function viewEventDetails(eventId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/events/${eventId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            displayEventDetails(data.data);
            document.getElementById('eventDetailsModal').classList.remove('hidden');
        } else {
            throw new Error(data.message || 'Failed to load event details');
        }

    } catch (error) {
        console.error('Error loading event details:', error);
        showMessage('Failed to load event details', 'error');
    }
}

// Display event details in modal
function displayEventDetails(event) {
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    document.getElementById('detailsTitle').textContent = event.title;

    const content = document.getElementById('eventDetailsContent');
    content.innerHTML = `
        <div class="space-y-4">
            <div>
                <h4 class="font-medium text-gray-900 mb-2">Description</h4>
                <p class="text-gray-600">${escapeHtml(event.description)}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 class="font-medium text-gray-900 mb-2">Date & Time</h4>
                    <p class="text-gray-600">${formattedDate}</p>
                    <p class="text-gray-600">${formattedTime}</p>
                </div>

                <div>
                    <h4 class="font-medium text-gray-900 mb-2">Location</h4>
                    <p class="text-gray-600">${escapeHtml(event.location)}</p>
                </div>

                ${event.capacity ? `
                    <div>
                        <h4 class="font-medium text-gray-900 mb-2">Capacity</h4>
                        <p class="text-gray-600">${event.attending_count}/${event.capacity} attending</p>
                        ${event.spots_remaining !== null ? `<p class="text-sm text-gray-500">${event.spots_remaining} spots remaining</p>` : ''}
                    </div>
                ` : `
                    <div>
                        <h4 class="font-medium text-gray-900 mb-2">Attendees</h4>
                        <p class="text-gray-600">${event.attending_count} attending</p>
                    </div>
                `}

                <div>
                    <h4 class="font-medium text-gray-900 mb-2">Status</h4>
                    <span class="px-2 py-1 text-sm font-medium rounded-full ${
                        event.status === 'active' ? 'bg-green-100 text-green-800' :
                        event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                    }">
                        ${event.status}
                    </span>
                </div>
            </div>

            ${!event.is_past && !isAdmin ? `
                <div class="pt-4 border-t border-gray-200">
                    <button onclick="handleRSVP(${event.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                        RSVP to Event
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Close event details modal
function closeEventDetailsModal() {
    document.getElementById('eventDetailsModal').classList.add('hidden');
}

// Handle RSVP
async function handleRSVP(eventId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ status: 'attending' })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showMessage('RSVP successful!', 'success');
            loadEvents();

            // Close details modal if open
            const detailsModal = document.getElementById('eventDetailsModal');
            if (detailsModal && !detailsModal.classList.contains('hidden')) {
                closeEventDetailsModal();
            }
        } else {
            throw new Error(data.message || 'Failed to RSVP');
        }

    } catch (error) {
        console.error('Error submitting RSVP:', error);
        showMessage('Failed to submit RSVP. Please try again.', 'error');
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/logout`, {
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

// Show message function
function showMessage(message, type = 'info') {
    // Remove any existing message
    const existingMessage = document.querySelector('.message-toast');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message-toast fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-600 text-white' :
        type === 'error' ? 'bg-red-600 text-white' :
        'bg-blue-600 text-white'
    }`;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    // Remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}