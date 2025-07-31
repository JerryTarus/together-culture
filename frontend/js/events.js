// Constants and configuration
const API_BASE = '/api';
let currentPage = 1;
let totalPages = 1;
let currentSearch = '';
let currentStatus = 'all';
let isLoading = false;

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    // Page Elements
    const loader = document.getElementById('loader');
    const rootEl = document.getElementById('root');
    const logoutButton = document.getElementById('logout-button');

    // --- 1. VERIFY USER STATUS & GET USER INFO ---
    try {
        const userRes = await fetch(CONFIG.apiUrl('api/users/me'), { credentials: 'include' });
        if (!userRes.ok) {
            window.location.href = './login.html';
            return;
        }
        const userObj = await userRes.json();
        const user = userObj.user || userObj;
        if (!user || user.status !== 'approved') {
            alert('Access Denied: Your account is not approved.');
            window.location.href = './login.html';
            return;
        }
        // Set user name in sidebar and header
        const userNameSidebar = document.getElementById('user-name');
        if (userNameSidebar) userNameSidebar.textContent = user.full_name;
        const userNameHeader = document.getElementById('user-name-header');
        if (userNameHeader) userNameHeader.textContent = user.full_name;
        // Attach logout to header button
        const logoutHeaderBtn = document.getElementById('logout-button-header');
        if (logoutHeaderBtn) {
            logoutHeaderBtn.addEventListener('click', async () => {
                try {
                    await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST', credentials: 'include' });
                    window.location.href = './login.html';
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            });
        }
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST', credentials: 'include' });
                    window.location.href = './login.html';
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            });
        }
        // Hide loader, show root
        if (loader) loader.classList.add('hidden');
        if (rootEl) rootEl.classList.remove('hidden');
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = './login.html';
        return;
    }

    console.log('Events page loaded');

    // Cookie/session-based authentication and user check
    const isAuthenticated = await checkAuthAndRole();
    if (!isAuthenticated) {
        return;
    }

    // Initialize event listeners
    initializeEventListeners();

    // Load events
    await loadEvents();
});

// Cookie/session-based authentication and admin check
let currentUser = null;

async function checkAuthAndRole() {
    try {
        const res = await fetch('/api/users/me', {
            method: 'GET',
            credentials: 'include'
        });
        if (!res.ok) {
            window.location.href = '/login.html';
            return false;
        }
        const data = await res.json();
        currentUser = data.user || data;
        if (!currentUser || currentUser.status !== 'approved') {
            showMessage('Access denied. Only approved members can access events.', 'error');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
            return false;
        }
        // Set global role for UI logic
        window.isAdmin = currentUser.role === 'admin';
        window.isMember = currentUser.role === 'member';
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return false;
    }
}

// Initialize all event listeners
function initializeEventListeners() {
    // Create event form
    const createEventForm = document.getElementById('createEventForm');
    if (createEventForm) {
        createEventForm.addEventListener('submit', handleEventSubmit);
    }

    // Edit event form
    const editEventForm = document.getElementById('editEventForm');
    if (editEventForm) {
        editEventForm.addEventListener('submit', handleEditEventSubmit);
    }

    // Search and filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearch = e.target.value;
                currentPage = 1;
                loadEvents();
            }, 500);
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentStatus = e.target.value;
            currentPage = 1;
            loadEvents();
        });
    }

    // Modal close buttons
    document.querySelectorAll('[data-modal-close]').forEach(button => {
        button.addEventListener('click', closeModals);
    });

    // Create event button
    const createEventBtn = document.getElementById('createEventBtn');
    if (createEventBtn) {
        createEventBtn.addEventListener('click', () => {
            openCreateEventModal();
        });
    }
}

// Load events from the API
async function loadEvents() {
    if (isLoading) return;

    try {
        isLoading = true;
        showLoadingState();

        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            search: currentSearch,
            status: currentStatus,
            sortBy: 'event_date',
            sortOrder: 'DESC'
        });

        console.log('Fetching events with params:', params.toString());

        const response = await fetch(`${API_BASE}/events?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Events loaded:', data);

        if (data.success) {
            displayEvents(data.data);
            updatePagination(data.pagination);
        } else {
            throw new Error(data.message || 'Failed to load events');
        }
    } catch (error) {
        console.error('Error loading events:', error);
        showErrorState();
        showToast('Failed to load events. Please try again.', 'error');
    } finally {
        isLoading = false;
    }
}

// Display events in a visually rich, responsive card layout for admin
function displayEvents(events) {
    const container = document.getElementById('eventsContainer');
    if (!container) return;

    if (!events || events.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16">
                <i class="fas fa-calendar-times text-4xl text-gray-300 mb-4"></i>
                <p class="text-lg text-gray-500 mb-4">No events found.</p>
                <button onclick="openCreateEventModal()" class="mt-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-base font-semibold shadow">
                    <i class="fas fa-plus mr-2"></i> Create First Event
                </button>
            </div>
        `;
        return;
    }

    // Responsive grid for event cards
    let eventsHtml = '<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">';
    eventsHtml += events.map(event => {
        const eventDate = new Date(event.event_date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = eventDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const now = new Date();
        const isPast = eventDate < now;
        const badge = isPast
            ? '<span class="inline-block px-2 py-1 text-xs font-semibold bg-gray-200 text-gray-600 rounded-full mr-2">Past</span>'
            : '<span class="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full mr-2">Upcoming</span>';

        return `
            <div class="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 flex flex-col h-full">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        ${badge}
                        <span class="text-xs text-gray-400">#${event.id}</span>
                    </div>
                    <div class="flex space-x-1">
                        <button onclick="viewEvent(${event.id})" title="View" class="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition"><i class="fas fa-eye"></i></button>
${window.isAdmin ? `
  <button onclick="editEvent(${event.id})" title="Edit" class="p-2 rounded-full bg-green-50 hover:bg-green-100 text-green-600 transition"><i class="fas fa-edit"></i></button>
  <button onclick="deleteEvent(${event.id})" title="Delete" class="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition"><i class="fas fa-trash"></i></button>
` : ''}
${window.isMember ? `
  <button onclick="rsvpEvent(${event.id})" title="RSVP" class="p-2 rounded-full bg-green-50 hover:bg-green-100 text-green-600 transition" ${event.user_rsvp_status === 'attending' ? 'disabled' : ''}><i class="fas fa-check"></i></button>
  <button onclick="cancelRsvpEvent(${event.id})" title="Cancel RSVP" class="p-2 rounded-full bg-yellow-50 hover:bg-yellow-100 text-yellow-600 transition" ${event.user_rsvp_status !== 'attending' ? 'disabled' : ''}><i class="fas fa-times"></i></button>
` : ''}
                    </div>
                </div>
                <div class="flex-1 flex flex-col">
                    <h3 class="text-lg md:text-xl font-bold text-gray-900 mb-1">${escapeHtml(event.title)}</h3>
                    <p class="text-gray-600 mb-3 line-clamp-3 min-h-[60px]">${escapeHtml(event.description)}</p>
                    <div class="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
                        <div class="flex items-center">
                            <i class="fas fa-calendar mr-2"></i>
                            ${formattedDate}
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-clock mr-2"></i>
                            ${formattedTime}
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-map-marker-alt mr-2"></i>
                            ${escapeHtml(event.location)}
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-users mr-2"></i>
                            ${event.rsvp_count || 0}${event.capacity ? `/${event.capacity}` : ''} attending
                        </div>
                    </div>
                    <div class="mt-auto flex flex-wrap gap-2">
                        ${event.capacity ? `<span class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">Capacity: ${event.capacity}</span>` : ''}
                        <span class="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Event ID: ${event.id}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    eventsHtml += '</div>';

    container.innerHTML = eventsHtml;
}

// Show loading state
function showLoadingState() {
    const container = document.getElementById('eventsContainer');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-500 mb-4"></i>
                <p class="text-gray-600">Loading events...</p>
            </div>
        `;
    }
}

// Show error state
function showErrorState() {
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

// Update pagination
function updatePagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer || !pagination) return;

    totalPages = pagination.pages;
    currentPage = pagination.page;

    let paginationHtml = '<div class="flex justify-center items-center space-x-2 mt-6">';

    // Previous button
    if (currentPage > 1) {
        paginationHtml += `
            <button onclick="changePage(${currentPage - 1})" class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Previous
            </button>
        `;
    }

    // Page numbers
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const isActive = i === currentPage;
        paginationHtml += `
            <button onclick="changePage(${i})" class="px-3 py-2 text-sm rounded-md ${isActive ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}">
                ${i}
            </button>
        `;
    }

    // Next button
    if (currentPage < totalPages) {
        paginationHtml += `
            <button onclick="changePage(${currentPage + 1})" class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Next
            </button>
        `;
    }

    paginationHtml += '</div>';
    paginationContainer.innerHTML = paginationHtml;
}

// Change page
function changePage(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        loadEvents();
    }
}

// Open create event modal
function openCreateEventModal() {
    const modal = document.getElementById('createEventModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('createEventForm').reset();
    }
}

// Open edit event modal
async function editEvent(eventId) {
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch event details');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch event details');
        }

        const event = data.data;

        // Populate edit form
        document.getElementById('editEventId').value = event.id;
        document.getElementById('editTitle').value = event.title;
        document.getElementById('editDescription').value = event.description;

        // Format date for input field
        const eventDate = new Date(event.event_date);
        const formattedDateTime = eventDate.toISOString().slice(0, 16);
        document.getElementById('editEventDate').value = formattedDateTime;

        document.getElementById('editLocation').value = event.location;
        document.getElementById('editCapacity').value = event.capacity || '';

        // Show modal
        const modal = document.getElementById('editEventModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading event for editing:', error);
        showToast('Failed to load event details', 'error');
    }
}

// View event details
async function viewEvent(eventId) {
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch event details');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch event details');
        }

        const event = data.data;

        // Populate view modal
        const eventDate = new Date(event.event_date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        document.getElementById('viewEventTitle').textContent = event.title;
        document.getElementById('viewEventDescription').textContent = event.description;
        document.getElementById('viewEventDate').textContent = formattedDate;
        document.getElementById('viewEventLocation').textContent = event.location;
        document.getElementById('viewEventCapacity').textContent = event.capacity ? `${event.rsvp_count || 0}/${event.capacity}` : event.rsvp_count || 0;

        // Show RSVPs if available
        const rsvpsList = document.getElementById('viewEventRsvps');
        if (rsvpsList && event.rsvps) {
            if (event.rsvps.length > 0) {
                rsvpsList.innerHTML = event.rsvps.map(rsvp => `
                    <div class="flex justify-between items-center py-2 border-b">
                        <span>${escapeHtml(rsvp.full_name)}</span>
                        <span class="text-sm text-gray-500">${rsvp.status}</span>
                    </div>
                `).join('');
            } else {
                rsvpsList.innerHTML = '<p class="text-gray-500">No RSVPs yet</p>';
            }
        }

        // Show modal
        const modal = document.getElementById('viewEventModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading event details:', error);
        showToast('Failed to load event details', 'error');
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete event');
        }

        const data = await response.json();
        if (data.success) {
            showToast('Event deleted successfully', 'success');
            await loadEvents(); // Reload events
        } else {
            throw new Error(data.message || 'Failed to delete event');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        showToast('Failed to delete event', 'error');
    }
}

// Handle create event form submission
async function handleEventSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';

        const eventData = {
            title: formData.get('title'),
            description: formData.get('description'),
            event_date: formData.get('event_date'),
            location: formData.get('location'),
            capacity: formData.get('capacity') ? parseInt(formData.get('capacity')) : null
        };

        console.log('Creating event with data:', eventData);

        const response = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showToast('Event created successfully!', 'success');
            closeModals();
            form.reset();
            await loadEvents(); // Reload events
        } else {
            throw new Error(data.message || 'Failed to create event');
        }
    } catch (error) {
        console.error('Error saving event:', error);
        showToast('Failed to create event. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save mr-2"></i>Create Event';
    }
}

// Handle edit event form submission
async function handleEditEventSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const eventId = formData.get('eventId');

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Updating...';

        const eventData = {
            title: formData.get('title'),
            description: formData.get('description'),
            event_date: formData.get('event_date'),
            location: formData.get('location'),
            capacity: formData.get('capacity') ? parseInt(formData.get('capacity')) : null
        };

        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            throw new Error('Failed to update event');
        }

        const data = await response.json();

        if (data.success) {
            showToast('Event updated successfully!', 'success');
            closeModals();
            await loadEvents(); // Reload events
        } else {
            throw new Error(data.message || 'Failed to update event');
        }
    } catch (error) {
        console.error('Error updating event:', error);
        showToast('Failed to update event. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save mr-2"></i>Update Event';
    }
}

// Close all modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// RSVP to an event (for members)
async function rsvpEvent(eventId) {
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ status: 'attending' })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Failed to RSVP');
        showToast('RSVP successful!', 'success');
        await loadEvents();
    } catch (error) {
        showToast(error.message || 'Failed to RSVP', 'error');
    }
}

// Cancel RSVP to an event (for members)
async function cancelRsvpEvent(eventId) {
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ status: 'cancelled' })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Failed to cancel RSVP');
        showToast('RSVP cancelled.', 'success');
        await loadEvents();
    } catch (error) {
        showToast(error.message || 'Failed to cancel RSVP', 'error');
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toast notification helper (admin style)
function showToast(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const color = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-gray-700';
    const toast = document.createElement('div');
    toast.className = `${color} text-white px-4 py-2 rounded shadow mb-2 animate-fade-in`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2500);
}

// Show message function
function showMessage(message, type = 'info', duration = 5000) {
    // Remove existing messages
    const existingMessage = document.querySelector('.message-toast');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message-toast fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-opacity duration-300`;

    // Set colors based on type
    let bgColor, textColor, icon;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            textColor = 'text-white';
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            bgColor = 'bg-red-500';
            textColor = 'text-white';
            icon = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            bgColor = 'bg-yellow-500';
            textColor = 'text-white';
            icon = 'fas fa-exclamation-triangle';
            break;
        default:
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
            icon = 'fas fa-info-circle';
    }

    messageEl.className += ` ${bgColor} ${textColor}`;
    messageEl.innerHTML = `
        <div class="flex items-center">
            <i class="${icon} mr-2"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 hover:opacity-75">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(messageEl);

    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.opacity = '0';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.remove();
                    }
                }, 300);
            }
        }, duration);
    }
}