// frontend/js/events.js

// Global state
let currentPage = 1;
let currentFilters = {
    search: '',
    status: 'all',
    sortBy: 'date',
    sortOrder: 'ASC'
};
let currentView = 'list';
let currentUser = null;
let currentEvents = [];
let editingEventId = null;
let currentCalendarDate = new Date();

// DOM Elements
let eventsContainer, eventsLoading, noEventsDiv, paginationDiv;
let searchInput, statusFilter, sortFilter;
let listView, calendarView, listViewBtn, calendarViewBtn;
let createEventBtn, eventModal, eventFormModal;
let userNameSpan, logoutBtn;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Events page loaded');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Check authentication
    await checkAuthentication();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    await loadEvents();
    
    // Setup calendar
    updateCalendarView();
});

function initializeDOMElements() {
    // Main containers
    eventsContainer = document.getElementById('events-container');
    eventsLoading = document.getElementById('events-loading');
    noEventsDiv = document.getElementById('no-events');
    paginationDiv = document.getElementById('pagination');
    
    // Filters
    searchInput = document.getElementById('search-input');
    statusFilter = document.getElementById('status-filter');
    sortFilter = document.getElementById('sort-filter');
    
    // Views
    listView = document.getElementById('list-view');
    calendarView = document.getElementById('calendar-view');
    listViewBtn = document.getElementById('list-view-btn');
    calendarViewBtn = document.getElementById('calendar-view-btn');
    
    // Buttons
    createEventBtn = document.getElementById('create-event-btn');
    
    // Modals
    eventModal = document.getElementById('event-modal');
    eventFormModal = document.getElementById('event-form-modal');
    
    // User elements
    userNameSpan = document.getElementById('user-name');
    logoutBtn = document.getElementById('logout-btn');
}

async function checkAuthentication() {
    try {
        const response = await fetch(CONFIG.apiUrl('api/users/me'), {
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.log('Not authenticated, redirecting to login');
            window.location.href = './login.html';
            return;
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // Update UI based on user role
        if (userNameSpan) {
            userNameSpan.textContent = currentUser.full_name;
        }
        
        // Show create button for admins
        if (currentUser.role === 'admin' && createEventBtn) {
            createEventBtn.classList.remove('hidden');
        }
        
        // Update navigation links based on user role
        updateNavigationLinks();
        
        console.log('User authenticated:', currentUser.email, 'Role:', currentUser.role);
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = './login.html';
    }
}

function updateNavigationLinks() {
    // Update dashboard link based on user role
    const dashboardLink = document.querySelector('a[href="./member_dashboard.html"]');
    if (dashboardLink && currentUser && currentUser.role === 'admin') {
        dashboardLink.href = './admin_dashboard.html';
        dashboardLink.textContent = 'Admin Dashboard';
    }
    
    // Also update any other dashboard links
    const allDashboardLinks = document.querySelectorAll('a[href*="dashboard"]');
    allDashboardLinks.forEach(link => {
        if (currentUser && currentUser.role === 'admin' && link.href.includes('member_dashboard')) {
            link.href = './admin_dashboard.html';
        }
    });
}

function setupEventListeners() {
    // Search and filters with autocomplete
    if (searchInput) {
        setupSearchAutocomplete();
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentFilters.status = statusFilter.value;
            currentPage = 1;
            loadEvents();
        });
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            currentFilters.sortBy = sortFilter.value;
            currentPage = 1;
            loadEvents();
        });
    }
    
    // Clear filters
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // View toggle
    if (listViewBtn) {
        listViewBtn.addEventListener('click', () => switchView('list'));
    }
    if (calendarViewBtn) {
        calendarViewBtn.addEventListener('click', () => switchView('calendar'));
    }
    
    // Create event
    if (createEventBtn) {
        createEventBtn.addEventListener('click', () => openEventForm());
    }
    
    // Event form
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventSubmit);
    }
    
    // Calendar navigation
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            updateCalendarView();
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            updateCalendarView();
        });
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Pagination
    setupPaginationListeners();
}

function setupPaginationListeners() {
    const prevMobile = document.getElementById('prev-mobile');
    const nextMobile = document.getElementById('next-mobile');
    const prevDesktop = document.getElementById('prev-desktop');
    const nextDesktop = document.getElementById('next-desktop');
    
    [prevMobile, prevDesktop].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    loadEvents();
                }
            });
        }
    });
    
    [nextMobile, nextDesktop].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                currentPage++;
                loadEvents();
            });
        }
    });
}

async function loadEvents() {
    try {
        showLoading(true);
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            status: currentFilters.status,
            search: currentFilters.search,
            sortBy: currentFilters.sortBy,
            sortOrder: currentFilters.sortOrder
        });
        
        const response = await fetch(CONFIG.apiUrl(`api/events?${params}`), {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load events');
        }
        
        const data = await response.json();
        currentEvents = data.events;
        
        displayEvents(data.events);
        updatePagination(data.pagination);
        
        // Update calendar if in calendar view
        if (currentView === 'calendar') {
            updateCalendarView();
        }
        
    } catch (error) {
        console.error('Error loading events:', error);
        showMessage('Failed to load events. Please try again.', 'error');
        showNoEvents();
    } finally {
        showLoading(false);
    }
}

function displayEvents(events) {
    if (!eventsContainer) return;
    
    if (events.length === 0) {
        showNoEvents();
        return;
    }
    
    eventsContainer.innerHTML = '';
    eventsContainer.classList.remove('hidden');
    noEventsDiv.classList.add('hidden');
    
    events.forEach(event => {
        const eventCard = createEventCard(event);
        eventsContainer.appendChild(eventCard);
    });
}

function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer';
    
    const eventDate = new Date(event.date);
    const eventTime = event.time ? formatTime(event.time) : '';
    const isUpcoming = eventDate >= new Date();
    const isPast = eventDate < new Date();
    const isFull = event.registered_count >= event.capacity;
    
    card.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(event.title)}</h3>
                    ${isPast ? '<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Past</span>' : ''}
                    ${isFull && isUpcoming ? '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">Full</span>' : ''}
                    ${event.is_user_registered ? '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded-full">Registered</span>' : ''}
                </div>
                <p class="text-gray-600 mb-3 line-clamp-2">${escapeHtml(event.description)}</p>
                <div class="flex items-center gap-4 text-sm text-gray-500">
                    <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span>${formatDate(eventDate)} ${eventTime}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span>${escapeHtml(event.location)}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        <span>${event.registered_count}/${event.capacity}</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 ml-4">
                ${currentUser.role === 'admin' ? `
                    <button onclick="editEvent(${event.id})" class="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="deleteEvent(${event.id}, '${escapeHtml(event.title)}')" class="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                ` : ''}
                <button onclick="viewEvent(${event.id})" class="px-4 py-2 text-sm font-medium text-brand-primary border border-brand-primary rounded-lg hover:bg-brand-primary hover:text-white transition-colors">
                    View Details
                </button>
            </div>
        </div>
    `;
    
    return card;
}

async function viewEvent(eventId) {
    try {
        const response = await fetch(CONFIG.apiUrl(`api/events/${eventId}`), {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load event details');
        }
        
        const event = await response.json();
        showEventModal(event);
        
    } catch (error) {
        console.error('Error loading event details:', error);
        showMessage('Failed to load event details.', 'error');
    }
}

function showEventModal(event) {
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalActions = document.getElementById('modal-actions');
    
    if (!modalTitle || !modalContent || !modalActions) return;
    
    const eventDate = new Date(event.date);
    const eventTime = event.time ? formatTime(event.time) : '';
    const isUpcoming = eventDate >= new Date();
    const isPast = eventDate < new Date();
    const isFull = event.registered_count >= event.capacity;
    const canRegister = isUpcoming && !isFull && !event.is_user_registered;
    const canUnregister = event.is_user_registered;
    
    modalTitle.textContent = event.title;
    
    modalContent.innerHTML = `
        <div class="space-y-4">
            <div>
                <h4 class="font-medium text-gray-900 mb-2">Description</h4>
                <p class="text-gray-600">${escapeHtml(event.description)}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">Date & Time</h4>
                    <p class="text-gray-600">${formatDate(eventDate)} ${eventTime}</p>
                </div>
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">Location</h4>
                    <p class="text-gray-600">${escapeHtml(event.location)}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">Capacity</h4>
                    <p class="text-gray-600">${event.registered_count}/${event.capacity} registered</p>
                </div>
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">Status</h4>
                    <div class="flex gap-1">
                        ${isPast ? '<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Past Event</span>' : ''}
                        ${isFull && isUpcoming ? '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">Full</span>' : ''}
                        ${event.is_user_registered ? '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded-full">You are registered</span>' : ''}
                    </div>
                </div>
            </div>
            ${event.registrations && event.registrations.length > 0 ? `
                <div>
                    <h4 class="font-medium text-gray-900 mb-2">Registered Members (${event.registrations.length})</h4>
                    <div class="max-h-32 overflow-y-auto space-y-1">
                        ${event.registrations.map(reg => `
                            <div class="text-sm text-gray-600">${escapeHtml(reg.full_name)}</div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    modalActions.innerHTML = `
        ${canRegister ? `
            <button onclick="registerForEvent(${event.id})" 
                    class="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors">
                Register
            </button>
        ` : ''}
        ${canUnregister ? `
            <button onclick="unregisterFromEvent(${event.id})" 
                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Unregister
            </button>
        ` : ''}
        <button onclick="closeEventModal()" 
                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Close
        </button>
    `;
    
    eventModal.classList.remove('hidden');
}

async function registerForEvent(eventId) {
    try {
        const response = await fetch(CONFIG.apiUrl(`api/events/${eventId}/register`), {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to register for event');
        }
        
        showMessage('Successfully registered for event!', 'success');
        closeEventModal();
        await loadEvents();
        
    } catch (error) {
        console.error('Error registering for event:', error);
        showMessage(error.message, 'error');
    }
}

async function unregisterFromEvent(eventId) {
    if (!confirm('Are you sure you want to unregister from this event?')) {
        return;
    }
    
    try {
        const response = await fetch(CONFIG.apiUrl(`api/events/${eventId}/register`), {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to unregister from event');
        }
        
        showMessage('Successfully unregistered from event.', 'success');
        closeEventModal();
        await loadEvents();
        
    } catch (error) {
        console.error('Error unregistering from event:', error);
        showMessage(error.message, 'error');
    }
}

function closeEventModal() {
    if (eventModal) {
        eventModal.classList.add('hidden');
    }
}

function openEventForm(eventData = null) {
    const formTitle = document.getElementById('form-modal-title');
    const saveBtn = document.getElementById('save-event-btn');
    const saveText = saveBtn?.querySelector('.save-text');
    
    editingEventId = eventData ? eventData.id : null;
    
    if (formTitle) {
        formTitle.textContent = eventData ? 'Edit Event' : 'Create Event';
    }
    if (saveText) {
        saveText.textContent = eventData ? 'Update Event' : 'Create Event';
    }
    
    // Populate form if editing
    if (eventData) {
        document.getElementById('event-title').value = eventData.title || '';
        document.getElementById('event-description').value = eventData.description || '';
        document.getElementById('event-date').value = eventData.date || '';
        document.getElementById('event-time').value = eventData.time || '';
        document.getElementById('event-location').value = eventData.location || '';
        document.getElementById('event-capacity').value = eventData.capacity || '';
    } else {
        document.getElementById('event-form').reset();
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('event-date').min = today;
    }
    
    eventFormModal.classList.remove('hidden');
}

async function editEvent(eventId) {
    try {
        const response = await fetch(CONFIG.apiUrl(`api/events/${eventId}`), {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load event for editing');
        }
        
        const event = await response.json();
        openEventForm(event);
        
    } catch (error) {
        console.error('Error loading event for edit:', error);
        showMessage('Failed to load event for editing.', 'error');
    }
}

async function deleteEvent(eventId, eventTitle) {
    if (!confirm(`Are you sure you want to delete the event "${eventTitle}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(CONFIG.apiUrl(`api/events/${eventId}`), {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete event');
        }
        
        showMessage('Event deleted successfully.', 'success');
        await loadEvents();
        
    } catch (error) {
        console.error('Error deleting event:', error);
        showMessage(error.message, 'error');
    }
}

async function handleEventSubmit(e) {
    e.preventDefault();
    
    const saveBtn = document.getElementById('save-event-btn');
    const saveText = saveBtn?.querySelector('.save-text');
    const saveLoading = saveBtn?.querySelector('.save-loading');
    
    if (saveBtn) saveBtn.disabled = true;
    if (saveText) saveText.classList.add('hidden');
    if (saveLoading) saveLoading.classList.remove('hidden');
    
    try {
        const formData = {
            title: document.getElementById('event-title').value,
            description: document.getElementById('event-description').value,
            date: document.getElementById('event-date').value,
            time: document.getElementById('event-time').value,
            location: document.getElementById('event-location').value,
            capacity: parseInt(document.getElementById('event-capacity').value)
        };
        
        const url = editingEventId 
            ? CONFIG.apiUrl(`api/events/${editingEventId}`)
            : CONFIG.apiUrl('api/events');
        const method = editingEventId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save event');
        }
        
        const message = editingEventId ? 'Event updated successfully!' : 'Event created successfully!';
        showMessage(message, 'success');
        closeEventFormModal();
        await loadEvents();
        
    } catch (error) {
        console.error('Error saving event:', error);
        showMessage(error.message, 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (saveText) saveText.classList.remove('hidden');
        if (saveLoading) saveLoading.classList.add('hidden');
    }
}

function closeEventFormModal() {
    if (eventFormModal) {
        eventFormModal.classList.add('hidden');
    }
    editingEventId = null;
}

function switchView(view) {
    currentView = view;
    
    if (view === 'list') {
        listView.classList.remove('hidden');
        calendarView.classList.add('hidden');
        listViewBtn.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
        listViewBtn.classList.remove('text-gray-500');
        calendarViewBtn.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
        calendarViewBtn.classList.add('text-gray-500');
    } else {
        listView.classList.add('hidden');
        calendarView.classList.remove('hidden');
        calendarViewBtn.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
        calendarViewBtn.classList.remove('text-gray-500');
        listViewBtn.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
        listViewBtn.classList.add('text-gray-500');
        updateCalendarView();
    }
}

function updateCalendarView() {
    const calendarMonth = document.getElementById('calendar-month');
    const calendarGrid = document.getElementById('calendar-grid');
    
    if (!calendarMonth || !calendarGrid) return;
    
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    calendarMonth.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
    
    // Clear existing calendar
    calendarGrid.innerHTML = '';
    
    // Get first day of month and number of days
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate calendar days
    const currentDate = new Date(startDate);
    for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
            const dayElement = createCalendarDay(new Date(currentDate));
            calendarGrid.appendChild(dayElement);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        if (currentDate > lastDay && currentDate.getDay() === 0) break;
    }
}

function createCalendarDay(date) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day p-2 min-h-[100px] border border-gray-200';
    
    const isCurrentMonth = date.getMonth() === currentCalendarDate.getMonth();
    const isToday = date.toDateString() === new Date().toDateString();
    
    if (!isCurrentMonth) {
        dayElement.classList.add('bg-gray-50', 'text-gray-400');
    }
    
    if (isToday) {
        dayElement.classList.add('bg-blue-50');
    }
    
    // Find events for this date
    const dateString = date.toISOString().split('T')[0];
    const dayEvents = currentEvents.filter(event => event.date === dateString);
    
    dayElement.innerHTML = `
        <div class="text-sm font-medium ${isToday ? 'text-blue-600' : ''}">${date.getDate()}</div>
        <div class="mt-1 space-y-1">
            ${dayEvents.map(event => `
                <div class="text-xs p-1 bg-brand-primary text-white rounded truncate cursor-pointer" 
                     onclick="viewEvent(${event.id})" title="${escapeHtml(event.title)}">
                    <span class="event-dot bg-white"></span>${escapeHtml(event.title)}
                </div>
            `).join('')}
        </div>
    `;
    
    return dayElement;
}

function clearFilters() {
    currentFilters = {
        search: '',
        status: 'all',
        sortBy: 'date',
        sortOrder: 'ASC'
    };
    currentPage = 1;
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'all';
    if (sortFilter) sortFilter.value = 'date';
    
    loadEvents();
}

function updatePagination(pagination) {
    if (!paginationDiv) return;
    
    if (pagination.totalPages <= 1) {
        paginationDiv.classList.add('hidden');
        return;
    }
    
    paginationDiv.classList.remove('hidden');
    
    // Update showing text
    const showingFrom = document.getElementById('showing-from');
    const showingTo = document.getElementById('showing-to');
    const totalEvents = document.getElementById('total-events');
    
    if (showingFrom) showingFrom.textContent = (pagination.page - 1) * pagination.limit + 1;
    if (showingTo) showingTo.textContent = Math.min(pagination.page * pagination.limit, pagination.total);
    if (totalEvents) totalEvents.textContent = pagination.total;
    
    // Update buttons
    const prevButtons = [document.getElementById('prev-mobile'), document.getElementById('prev-desktop')];
    const nextButtons = [document.getElementById('next-mobile'), document.getElementById('next-desktop')];
    
    prevButtons.forEach(btn => {
        if (btn) {
            btn.disabled = pagination.page <= 1;
            btn.classList.toggle('opacity-50', pagination.page <= 1);
            btn.classList.toggle('cursor-not-allowed', pagination.page <= 1);
        }
    });
    
    nextButtons.forEach(btn => {
        if (btn) {
            btn.disabled = pagination.page >= pagination.totalPages;
            btn.classList.toggle('opacity-50', pagination.page >= pagination.totalPages);
            btn.classList.toggle('cursor-not-allowed', pagination.page >= pagination.totalPages);
        }
    });
    
    // Update page numbers
    const pageNumbers = document.getElementById('page-numbers');
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.totalPages, pagination.page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                i === pagination.page 
                    ? 'z-10 bg-brand-primary border-brand-primary text-white' 
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                loadEvents();
            });
            pageNumbers.appendChild(pageBtn);
        }
    }
}

function showLoading(show) {
    if (show) {
        eventsLoading.classList.remove('hidden');
        eventsContainer.classList.add('hidden');
        noEventsDiv.classList.add('hidden');
    } else {
        eventsLoading.classList.add('hidden');
    }
}

function showNoEvents() {
    eventsContainer.classList.add('hidden');
    noEventsDiv.classList.remove('hidden');
    paginationDiv.classList.add('hidden');
}

async function handleLogout() {
    try {
        await fetch(CONFIG.apiUrl('api/auth/logout'), {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
    window.location.href = './login.html';
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function showMessage(message, type = 'info', duration = 3000) {
    // Prevent infinite recursion if this is already the global showMessage
    if (window.showMessage && window.showMessage !== showMessage && typeof window.showMessage === 'function') {
        window.showMessage(message, type, duration);
        return;
    }
    // Fallback implementation
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message);
}

function setupSearchAutocomplete() {
    const searchInput = document.getElementById('search-input');
    const searchContainer = searchInput.parentElement;
    
    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'hidden absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg';
    dropdown.id = 'search-dropdown';
    searchContainer.style.position = 'relative';
    searchContainer.appendChild(dropdown);
    
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            dropdown.classList.add('hidden');
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(CONFIG.apiUrl(`api/events?search=${encodeURIComponent(query)}&limit=5`), {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    showSearchDropdown(data.events, query);
                }
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

function showSearchDropdown(events, query) {
    const dropdown = document.getElementById('search-dropdown');
    
    if (events.length === 0) {
        dropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">No events found</div>';
    } else {
        dropdown.innerHTML = events.map(event => `
            <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectSearchEvent('${event.title}')">
                <div class="font-medium text-gray-900">${escapeHtml(event.title)}</div>
                <div class="text-sm text-gray-500">${formatDate(new Date(event.date))} • ${escapeHtml(event.location)}</div>
            </div>
        `).join('');
    }
    
    dropdown.classList.remove('hidden');
}

function selectSearchEvent(title) {
    const searchInput = document.getElementById('search-input');
    const dropdown = document.getElementById('search-dropdown');
    
    searchInput.value = title;
    dropdown.classList.add('hidden');
    
    // Trigger search
    currentFilters.search = title;
    currentPage = 1;
    loadEvents();
}

// Global functions for onclick handlers
window.viewEvent = viewEvent;
window.editEvent = editEvent;
window.deleteEvent = deleteEvent;
window.registerForEvent = registerForEvent;
window.unregisterFromEvent = unregisterFromEvent;
window.closeEventModal = closeEventModal;
window.closeEventFormModal = closeEventFormModal;
window.selectSearchEvent = selectSearchEvent;
