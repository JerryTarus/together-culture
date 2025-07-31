// Constants and configuration
const API_BASE = '/api';
let currentPage = 1;
let totalPages = 1;
let currentSearch = '';
let currentStatus = 'all';
let isLoading = false;

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Events page loaded');

    // Check authentication and role
    if (!checkAuth() || !checkAdminRole()) {
        return;
    }

    // Initialize event listeners
    initializeEventListeners();

    // Load events
    await loadEvents();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Check admin role
function checkAdminRole() {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        showMessage('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = '/member_dashboard.html';
        }, 2000);
        return false;
    }
    return true;
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
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
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
        showMessage('Failed to load events. Please try again.', 'error');
    } finally {
        isLoading = false;
    }
}

// Display events in the UI
function displayEvents(events) {
    const container = document.getElementById('eventsContainer');
    if (!container) return;

    if (!events || events.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-calendar-times text-3xl text-gray-400 mb-4"></i>
                <p class="text-gray-600">No events found.</p>
                <button onclick="openCreateEventModal()" class="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                    Create First Event
                </button>
            </div>
        `;
        return;
    }

    const eventsHtml = events.map(event => {
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

        return `
            <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold text-gray-900 mb-2">${escapeHtml(event.title)}</h3>
                        <p class="text-gray-600 mb-3">${escapeHtml(event.description)}</p>
                        <div class="flex flex-wrap gap-4 text-sm text-gray-500">
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
                    </div>
                </div>
                <div class="flex justify-end space-x-2">
                    <button onclick="viewEvent(${event.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-eye mr-1"></i> View
                    </button>
                    <button onclick="editEvent(${event.id})" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button onclick="deleteEvent(${event.id})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-trash mr-1"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');

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
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
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
        showMessage('Failed to load event details', 'error');
    }
}

// View event details
async function viewEvent(eventId) {
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
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
        showMessage('Failed to load event details', 'error');
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
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete event');
        }

        const data = await response.json();
        if (data.success) {
            showMessage('Event deleted successfully', 'success');
            await loadEvents(); // Reload events
        } else {
            throw new Error(data.message || 'Failed to delete event');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        showMessage('Failed to delete event', 'error');
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
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showMessage('Event created successfully!', 'success');
            closeModals();
            form.reset();
            await loadEvents(); // Reload events
        } else {
            throw new Error(data.message || 'Failed to create event');
        }
    } catch (error) {
        console.error('Error saving event:', error);
        showMessage('Failed to create event. Please try again.', 'error');
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
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            throw new Error('Failed to update event');
        }

        const data = await response.json();

        if (data.success) {
            showMessage('Event updated successfully!', 'success');
            closeModals();
            await loadEvents(); // Reload events
        } else {
            throw new Error(data.message || 'Failed to update event');
        }
    } catch (error) {
        console.error('Error updating event:', error);
        showMessage('Failed to update event. Please try again.', 'error');
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

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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