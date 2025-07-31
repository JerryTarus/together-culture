
// frontend/js/events.js

// Global state
let currentUser = null;
let currentEvents = [];
let currentPage = 1;
let totalPages = 1;
let currentView = 'list'; // 'list' or 'calendar'
let currentFilters = {
    search: '',
    status: 'all',
    sortBy: 'date',
    sortOrder: 'DESC'
};
let currentCalendarDate = new Date();
let editingEventId = null;

// DOM Elements
let eventsContainer, loadingElement, noEventsElement, paginationElement;
let searchInput, statusFilter, sortFilter;
let listViewBtn, calendarViewBtn;
let createEventBtn, floatingCreateBtn, createFirstEventBtn;
let eventModal, eventFormModal;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Events page loaded');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Check authentication
    if (!(await checkAuthentication())) {
        return;
    }

    // Initialize event listeners
    initializeEventListeners();
    
    // Load initial data
    await loadEvents();
    
    // Set minimum date for event creation
    setMinDate();
});

function initializeDOMElements() {
    eventsContainer = document.getElementById('events-container');
    loadingElement = document.getElementById('events-loading');
    noEventsElement = document.getElementById('no-events');
    paginationElement = document.getElementById('pagination');
    
    searchInput = document.getElementById('search-input');
    statusFilter = document.getElementById('status-filter');
    sortFilter = document.getElementById('sort-filter');
    
    listViewBtn = document.getElementById('list-view-btn');
    calendarViewBtn = document.getElementById('calendar-view-btn');
    
    createEventBtn = document.getElementById('create-event-btn');
    floatingCreateBtn = document.getElementById('floating-create-btn');
    createFirstEventBtn = document.getElementById('create-first-event-btn');
    
    eventModal = document.getElementById('event-modal');
    eventFormModal = document.getElementById('event-form-modal');
}

async function checkAuthentication() {
    try {
        const userRes = await fetch(CONFIG.apiUrl('api/users/me'), {
            credentials: 'include'
        });
        
        if (!userRes.ok) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = './login.html';
            return false;
        }

        const userObj = await userRes.json();
        currentUser = userObj.user;
        console.log('User authenticated:', currentUser.email);

        // Set user name in header
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = currentUser.full_name;

        // Show admin features if user is admin
        if (currentUser.role === 'admin') {
            createEventBtn?.classList.remove('hidden');
            floatingCreateBtn?.classList.remove('hidden');
            createFirstEventBtn?.classList.remove('hidden');
        }

        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = './login.html';
        return false;
    }
}

function initializeEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // View toggle buttons
    listViewBtn?.addEventListener('click', () => switchView('list'));
    calendarViewBtn?.addEventListener('click', () => switchView('calendar'));

    // Create event buttons
    createEventBtn?.addEventListener('click', openCreateEventModal);
    floatingCreateBtn?.addEventListener('click', openCreateEventModal);
    createFirstEventBtn?.addEventListener('click', openCreateEventModal);

    // Filter inputs
    searchInput?.addEventListener('input', debounce(handleFilterChange, 300));
    statusFilter?.addEventListener('change', handleFilterChange);
    sortFilter?.addEventListener('change', handleFilterChange);

    // Clear filters
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    clearFiltersBtn?.addEventListener('click', clearAllFilters);

    // Pagination
    const prevMobile = document.getElementById('prev-mobile');
    const nextMobile = document.getElementById('next-mobile');
    const prevDesktop = document.getElementById('prev-desktop');
    const nextDesktop = document.getElementById('next-desktop');

    prevMobile?.addEventListener('click', () => changePage(currentPage - 1));
    nextMobile?.addEventListener('click', () => changePage(currentPage + 1));
    prevDesktop?.addEventListener('click', () => changePage(currentPage - 1));
    nextDesktop?.addEventListener('click', () => changePage(currentPage + 1));

    // Calendar navigation
    const prevMonth = document.getElementById('prev-month');
    const nextMonth = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');

    prevMonth?.addEventListener('click', () => changeCalendarMonth(-1));
    nextMonth?.addEventListener('click', () => changeCalendarMonth(1));
    todayBtn?.addEventListener('click', goToToday);

    // Event form
    const eventForm = document.getElementById('event-form');
    eventForm?.addEventListener('submit', handleEventFormSubmit);
}

async function handleLogout(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
        await fetch(CONFIG.apiUrl('api/auth/logout'), { 
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = './login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = './login.html';
    }
}

function switchView(view) {
    currentView = view;
    
    if (view === 'list') {
        document.getElementById('list-view').classList.remove('hidden');
        document.getElementById('calendar-view').classList.add('hidden');
        
        listViewBtn.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
        listViewBtn.classList.remove('text-gray-500');
        calendarViewBtn.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
        calendarViewBtn.classList.add('text-gray-500');
    } else {
        document.getElementById('list-view').classList.add('hidden');
        document.getElementById('calendar-view').classList.remove('hidden');
        
        calendarViewBtn.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
        calendarViewBtn.classList.remove('text-gray-500');
        listViewBtn.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
        listViewBtn.classList.add('text-gray-500');
        
        renderCalendar();
    }
}

function handleFilterChange() {
    currentFilters.search = searchInput?.value || '';
    currentFilters.status = statusFilter?.value || 'all';
    currentFilters.sortBy = sortFilter?.value || 'date';
    
    currentPage = 1;
    loadEvents();
}

function clearAllFilters() {
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'all';
    if (sortFilter) sortFilter.value = 'date';
    
    currentFilters = {
        search: '',
        status: 'all',
        sortBy: 'date',
        sortOrder: 'DESC'
    };
    
    currentPage = 1;
    loadEvents();
}

async function loadEvents() {
    showLoading();
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            search: currentFilters.search,
            status: currentFilters.status,
            sortBy: currentFilters.sortBy,
            sortOrder: currentFilters.sortOrder
        });

        const response = await fetch(CONFIG.apiUrl(`api/events?${params}`), {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        currentEvents = data.events || [];
        
        if (data.pagination) {
            currentPage = data.pagination.page;
            totalPages = data.pagination.totalPages;
        }

        hideLoading();
        
        if (currentView === 'list') {
            renderEventsList();
            renderPagination(data.pagination);
        } else {
            renderCalendar();
        }

    } catch (error) {
        console.error('Error loading events:', error);
        hideLoading();
        showError('Failed to load events. Please try again.');
    }
}

function showLoading() {
    loadingElement?.classList.remove('hidden');
    eventsContainer?.classList.add('hidden');
    noEventsElement?.classList.add('hidden');
    paginationElement?.classList.add('hidden');
}

function hideLoading() {
    loadingElement?.classList.add('hidden');
}

function renderEventsList() {
    if (!eventsContainer) return;

    if (currentEvents.length === 0) {
        eventsContainer.classList.add('hidden');
        noEventsElement?.classList.remove('hidden');
        return;
    }

    eventsContainer.classList.remove('hidden');
    noEventsElement?.classList.add('hidden');

    eventsContainer.innerHTML = currentEvents.map(event => createEventCard(event)).join('');
}

function createEventCard(event) {
    const eventDate = new Date(`${event.date} ${event.time}`);
    const isUpcoming = eventDate > new Date();
    const isFull = event.registered_count >= event.capacity;
    
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const statusClass = isUpcoming ? 'upcoming' : 'past';
    const capacityStatus = isFull ? 'status-full' : 'status-available';
    const timeStatus = isUpcoming ? 'status-upcoming' : 'status-past';

    return `
        <div class="event-card ${statusClass} bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer" onclick="openEventModal(${event.id})">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-3">
                        <h3 class="text-xl font-semibold text-gray-900">${escapeHtml(event.title)}</h3>
                        <span class="status-badge ${timeStatus}">
                            ${isUpcoming ? 'Upcoming' : 'Past'}
                        </span>
                        ${isFull ? '<span class="status-badge status-full">Full</span>' : ''}
                    </div>
                    
                    <p class="text-gray-600 mb-4 line-clamp-2">${escapeHtml(event.description)}</p>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div class="flex items-center text-gray-500">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            ${formattedDate}
                        </div>
                        <div class="flex items-center text-gray-500">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            ${formattedTime}
                        </div>
                        <div class="flex items-center text-gray-500">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            </svg>
                            ${escapeHtml(event.location)}
                        </div>
                        <div class="flex items-center text-gray-500">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                            ${event.registered_count}/${event.capacity}
                        </div>
                    </div>
                </div>
                
                <div class="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-48">
                    ${event.is_user_registered ? 
                        `<span class="px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-lg text-center">Registered</span>` :
                        isUpcoming && !isFull ? 
                            `<button onclick="event.stopPropagation(); registerForEvent(${event.id})" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Register</button>` :
                            ''
                    }
                    ${currentUser && currentUser.role === 'admin' ? 
                        `<div class="flex gap-1">
                            <button onclick="event.stopPropagation(); editEvent(${event.id})" class="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">Edit</button>
                            <button onclick="event.stopPropagation(); deleteEvent(${event.id})" class="flex-1 px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors">Delete</button>
                        </div>` : ''
                    }
                </div>
            </div>
        </div>
    `;
}

function renderPagination(pagination) {
    if (!pagination || pagination.totalPages <= 1) {
        paginationElement?.classList.add('hidden');
        return;
    }

    paginationElement?.classList.remove('hidden');

    // Update pagination info
    const showingFrom = document.getElementById('showing-from');
    const showingTo = document.getElementById('showing-to');
    const totalEvents = document.getElementById('total-events');

    if (showingFrom) showingFrom.textContent = ((pagination.page - 1) * pagination.limit) + 1;
    if (showingTo) showingTo.textContent = Math.min(pagination.page * pagination.limit, pagination.total);
    if (totalEvents) totalEvents.textContent = pagination.total;

    // Update pagination buttons
    const prevButtons = document.querySelectorAll('#prev-mobile, #prev-desktop');
    const nextButtons = document.querySelectorAll('#next-mobile, #next-desktop');

    prevButtons.forEach(btn => {
        btn.disabled = pagination.page <= 1;
        btn.classList.toggle('opacity-50', pagination.page <= 1);
        btn.classList.toggle('cursor-not-allowed', pagination.page <= 1);
    });

    nextButtons.forEach(btn => {
        btn.disabled = pagination.page >= pagination.totalPages;
        btn.classList.toggle('opacity-50', pagination.page >= pagination.totalPages);
        btn.classList.toggle('cursor-not-allowed', pagination.page >= pagination.totalPages);
    });

    // Render page numbers
    const pageNumbers = document.getElementById('page-numbers');
    if (pageNumbers) {
        pageNumbers.innerHTML = generatePageNumbers(pagination.page, pagination.totalPages);
    }
}

function generatePageNumbers(currentPage, totalPages) {
    let pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        if (currentPage <= 3) {
            pages = [1, 2, 3, 4, '...', totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    return pages.map(page => {
        if (page === '...') {
            return '<span class="px-3 py-2 text-gray-500">...</span>';
        }
        
        const isActive = page === currentPage;
        return `
            <button onclick="changePage(${page})" 
                    class="px-3 py-2 text-sm font-medium ${isActive ? 
                        'bg-blue-600 text-white' : 
                        'text-gray-500 hover:bg-gray-50'} border border-gray-300 ${isActive ? 'border-blue-600' : ''}">
                ${page}
            </button>
        `;
    }).join('');
}

function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    loadEvents();
}

// Calendar functions
function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarMonth = document.getElementById('calendar-month');
    
    if (!calendarGrid || !calendarMonth) return;

    // Update month display
    calendarMonth.textContent = currentCalendarDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    // Generate calendar days
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (days.length < 42) { // 6 weeks * 7 days
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    calendarGrid.innerHTML = days.map(day => {
        const isCurrentMonth = day.getMonth() === month;
        const isToday = day.toDateString() === new Date().toDateString();
        const dayEvents = getEventsForDate(day);
        
        return `
            <div class="calendar-day ${dayEvents.length > 0 ? 'has-events' : ''} ${!isCurrentMonth ? 'text-gray-400' : ''}" 
                 onclick="openDayModal('${day.toISOString()}')">
                <div class="p-3">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}">${day.getDate()}</span>
                    </div>
                    <div class="space-y-1">
                        ${dayEvents.slice(0, 3).map(event => `
                            <div class="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate" title="${escapeHtml(event.title)}">
                                <span class="event-dot bg-blue-600"></span>
                                ${escapeHtml(event.title)}
                            </div>
                        `).join('')}
                        ${dayEvents.length > 3 ? `<div class="text-xs text-gray-500">+${dayEvents.length - 3} more</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getEventsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return currentEvents.filter(event => event.date === dateStr);
}

function changeCalendarMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar();
}

function goToToday() {
    currentCalendarDate = new Date();
    renderCalendar();
}

function openDayModal(dateStr) {
    const date = new Date(dateStr);
    const dayEvents = getEventsForDate(date);
    
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalActions = document.getElementById('modal-actions');

    if (modalTitle) modalTitle.textContent = `Events for ${formattedDate}`;
    
    if (modalContent) {
        if (dayEvents.length === 0) {
            modalContent.innerHTML = '<p class="text-gray-500">No events scheduled for this day.</p>';
        } else {
            modalContent.innerHTML = `
                <div class="space-y-3">
                    ${dayEvents.map(event => {
                        const eventTime = new Date(`${event.date} ${event.time}`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        });
                        return `
                            <div class="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50" onclick="closeEventModal(); openEventModal(${event.id})">
                                <div class="flex items-center justify-between mb-2">
                                    <h4 class="font-medium text-gray-900">${escapeHtml(event.title)}</h4>
                                    <span class="text-sm text-gray-500">${eventTime}</span>
                                </div>
                                <p class="text-sm text-gray-600 mb-2">${escapeHtml(event.description)}</p>
                                <div class="text-xs text-gray-500">
                                    📍 ${escapeHtml(event.location)} • ${event.registered_count}/${event.capacity} registered
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }

    if (modalActions) {
        modalActions.innerHTML = `
            <button onclick="closeEventModal()" class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Close
            </button>
        `;
    }

    eventModal?.classList.remove('hidden');
}

// Event modal functions
async function openEventModal(eventId) {
    try {
        const response = await fetch(CONFIG.apiUrl(`api/events/${eventId}`), {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch event details');
        }

        const event = await response.json();
        displayEventModal(event);
    } catch (error) {
        console.error('Error loading event details:', error);
        showError('Failed to load event details.');
    }
}

function displayEventModal(event) {
    const eventDate = new Date(`${event.date} ${event.time}`);
    const isUpcoming = eventDate > new Date();
    const isFull = event.registered_count >= event.capacity;
    
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalActions = document.getElementById('modal-actions');

    if (modalTitle) modalTitle.textContent = event.title;
    
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="space-y-4">
                <div class="flex flex-wrap gap-2">
                    <span class="status-badge ${isUpcoming ? 'status-upcoming' : 'status-past'}">
                        ${isUpcoming ? 'Upcoming' : 'Past Event'}
                    </span>
                    ${isFull ? '<span class="status-badge status-full">Full</span>' : '<span class="status-badge status-available">Available</span>'}
                </div>
                
                <p class="text-gray-700">${escapeHtml(event.description)}</p>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-t border-gray-200">
                    <div class="flex items-center text-gray-600">
                        <svg class="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <div>
                            <div class="font-medium">Date</div>
                            <div class="text-sm">${formattedDate}</div>
                        </div>
                    </div>
                    
                    <div class="flex items-center text-gray-600">
                        <svg class="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div>
                            <div class="font-medium">Time</div>
                            <div class="text-sm">${formattedTime}</div>
                        </div>
                    </div>
                    
                    <div class="flex items-center text-gray-600">
                        <svg class="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        </svg>
                        <div>
                            <div class="font-medium">Location</div>
                            <div class="text-sm">${escapeHtml(event.location)}</div>
                        </div>
                    </div>
                    
                    <div class="flex items-center text-gray-600">
                        <svg class="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        <div>
                            <div class="font-medium">Capacity</div>
                            <div class="text-sm">${event.registered_count}/${event.capacity} registered</div>
                        </div>
                    </div>
                </div>
                
                ${event.registrations && event.registrations.length > 0 ? `
                    <div class="border-t border-gray-200 pt-4">
                        <h4 class="font-medium text-gray-900 mb-3">Registered Attendees (${event.registrations.length})</h4>
                        <div class="max-h-32 overflow-y-auto space-y-2">
                            ${event.registrations.map(reg => `
                                <div class="flex items-center text-sm text-gray-600">
                                    <div class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                        ${reg.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    ${escapeHtml(reg.full_name)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    if (modalActions) {
        let actions = [];
        
        if (event.is_user_registered) {
            actions.push(`
                <button onclick="unregisterFromEvent(${event.id})" class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors">
                    Unregister
                </button>
            `);
        } else if (isUpcoming && !isFull) {
            actions.push(`
                <button onclick="registerForEvent(${event.id})" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                    Register for Event
                </button>
            `);
        }
        
        if (currentUser && currentUser.role === 'admin') {
            actions.push(`
                <button onclick="editEvent(${event.id})" class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors">
                    Edit Event
                </button>
            `);
            actions.push(`
                <button onclick="deleteEvent(${event.id})" class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors">
                    Delete Event
                </button>
            `);
        }
        
        actions.push(`
            <button onclick="closeEventModal()" class="px-6 py-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 font-medium transition-colors">
                Close
            </button>
        `);
        
        modalActions.innerHTML = actions.join('');
    }

    eventModal?.classList.remove('hidden');
}

function closeEventModal() {
    eventModal?.classList.add('hidden');
}

// Event registration functions
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

        showSuccess('Successfully registered for event!');
        await loadEvents();
        closeEventModal();
    } catch (error) {
        console.error('Error registering for event:', error);
        showError(error.message || 'Failed to register for event.');
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

        showSuccess('Successfully unregistered from event.');
        await loadEvents();
        closeEventModal();
    } catch (error) {
        console.error('Error unregistering from event:', error);
        showError(error.message || 'Failed to unregister from event.');
    }
}

// Event form functions
function openCreateEventModal() {
    editingEventId = null;
    const formTitle = document.getElementById('form-modal-title');
    const saveBtn = document.getElementById('save-event-btn');
    const saveText = saveBtn?.querySelector('.save-text');
    
    if (formTitle) formTitle.textContent = 'Create New Event';
    if (saveText) saveText.textContent = 'Create Event';
    
    resetEventForm();
    eventFormModal?.classList.remove('hidden');
}

async function editEvent(eventId) {
    try {
        const response = await fetch(CONFIG.apiUrl(`api/events/${eventId}`), {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch event details');
        }

        const event = await response.json();
        editingEventId = eventId;
        
        const formTitle = document.getElementById('form-modal-title');
        const saveBtn = document.getElementById('save-event-btn');
        const saveText = saveBtn?.querySelector('.save-text');
        
        if (formTitle) formTitle.textContent = 'Edit Event';
        if (saveText) saveText.textContent = 'Update Event';
        
        populateEventForm(event);
        closeEventModal();
        eventFormModal?.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading event for editing:', error);
        showError('Failed to load event details for editing.');
    }
}

function populateEventForm(event) {
    const titleInput = document.getElementById('event-title');
    const descInput = document.getElementById('event-description');
    const dateInput = document.getElementById('event-date');
    const timeInput = document.getElementById('event-time');
    const locationInput = document.getElementById('event-location');
    const capacityInput = document.getElementById('event-capacity');

    if (titleInput) titleInput.value = event.title || '';
    if (descInput) descInput.value = event.description || '';
    if (dateInput) dateInput.value = event.date || '';
    if (timeInput) timeInput.value = event.time || '';
    if (locationInput) locationInput.value = event.location || '';
    if (capacityInput) capacityInput.value = event.capacity || '';
}

function resetEventForm() {
    const form = document.getElementById('event-form');
    if (form) form.reset();
    setMinDate();
}

function setMinDate() {
    const dateInput = document.getElementById('event-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
}

function closeEventFormModal() {
    eventFormModal?.classList.add('hidden');
    editingEventId = null;
}

async function handleEventFormSubmit(e) {
    e.preventDefault();
    
    const saveBtn = document.getElementById('save-event-btn');
    const saveText = saveBtn?.querySelector('.save-text');
    const saveLoading = saveBtn?.querySelector('.save-loading');
    
    // Show loading state
    if (saveText) saveText.classList.add('hidden');
    if (saveLoading) saveLoading.classList.remove('hidden');
    if (saveBtn) saveBtn.disabled = true;

    try {
        const formData = {
            title: document.getElementById('event-title')?.value,
            description: document.getElementById('event-description')?.value,
            date: document.getElementById('event-date')?.value,
            time: document.getElementById('event-time')?.value,
            location: document.getElementById('event-location')?.value,
            capacity: parseInt(document.getElementById('event-capacity')?.value)
        };

        const url = editingEventId ? 
            CONFIG.apiUrl(`api/events/${editingEventId}`) : 
            CONFIG.apiUrl('api/events');
        
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

        const successMessage = editingEventId ? 'Event updated successfully!' : 'Event created successfully!';
        showSuccess(successMessage);
        
        closeEventFormModal();
        await loadEvents();
        
    } catch (error) {
        console.error('Error saving event:', error);
        showError(error.message || 'Failed to save event.');
    } finally {
        // Reset loading state
        if (saveText) saveText.classList.remove('hidden');
        if (saveLoading) saveLoading.classList.add('hidden');
        if (saveBtn) saveBtn.disabled = false;
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
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

        showSuccess('Event deleted successfully.');
        closeEventModal();
        await loadEvents();
    } catch (error) {
        console.error('Error deleting event:', error);
        showError(error.message || 'Failed to delete event.');
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
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${type === 'success' ? 
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' :
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
                }
            </svg>
            ${message}
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);

    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Global functions for onclick handlers
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.closeEventFormModal = closeEventFormModal;
window.registerForEvent = registerForEvent;
window.unregisterFromEvent = unregisterFromEvent;
window.editEvent = editEvent;
window.deleteEvent = deleteEvent;
window.changePage = changePage;
window.openDayModal = openDayModal;
