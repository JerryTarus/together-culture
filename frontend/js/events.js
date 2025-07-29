// frontend/js/events.js
document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let events = [];
    let members = [];
    let selectedEventId = null;

    // Element selectors
    const sidebarNav = document.getElementById('sidebar-nav');
    const logoutButton = document.getElementById('logout-button');
    const createEventButton = document.getElementById('create-event-button');
    const eventsList = document.getElementById('events-list');
    const visitTrackingSection = document.getElementById('visit-tracking-section');
    const visitTrackingContent = document.getElementById('visit-tracking-content');
    
    // Modal elements
    const createEventModal = document.getElementById('create-event-modal');
    const createEventForm = document.getElementById('create-event-form');
    const cancelCreateEvent = document.getElementById('cancel-create-event');
    const visitModal = document.getElementById('visit-modal');
    const visitForm = document.getElementById('visit-form');
    const cancelVisit = document.getElementById('cancel-visit');
    const visitMemberSelect = document.getElementById('visit-member');

    async function initialize() {
        await fetchCurrentUser();
        buildSidebar();
        await fetchEvents();
        await fetchMembers();
        renderEvents();
        setupEventListeners();
        
        // Set today's date as default for forms
        document.getElementById('visit-date').value = new Date().toISOString().split('T')[0];
    }

    async function fetchCurrentUser() {
        try {
            const res = await fetch(CONFIG.apiUrl('api/users/me'));
            if (!res.ok) window.location.href = '/login.html';
            currentUser = await res.json();
        } catch (error) {
            window.location.href = '/login.html';
        }
    }

    function buildSidebar() {
        const commonLinks = `
            <a href="/events.html" class="flex items-center p-3 my-1 bg-brand-beige text-brand-primary rounded-lg font-semibold">Events</a>
            <a href="/resources.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Resources</a>
            <a href="/messages.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Messages</a>
            <a href="/settings.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Settings</a>
        `;

        if (currentUser.role === 'admin') {
            sidebarNav.innerHTML = `
                <a href="/admin_dashboard.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Dashboard</a>
                <a href="/member_directory.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Members</a>
                ${commonLinks}
            `;
            createEventButton.classList.remove('hidden');
            visitTrackingSection.classList.remove('hidden');
        } else {
            sidebarNav.innerHTML = `
                <a href="/member_dashboard.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Dashboard</a>
                ${commonLinks}
            `;
        }
    }

    async function fetchEvents() {
        try {
            const res = await fetch(CONFIG.apiUrl('api/events'));
            events = await res.json();
        } catch (error) {
            console.error('Error fetching events:', error);
            events = [];
        }
    }

    async function fetchMembers() {
        if (currentUser.role !== 'admin') return;
        try {
            const res = await fetch(CONFIG.apiUrl('api/users'));
            members = await res.json();
            populateMemberSelect();
        } catch (error) {
            console.error('Error fetching members:', error);
            members = [];
        }
    }

    function populateMemberSelect() {
        visitMemberSelect.innerHTML = '<option value="">Select a member...</option>';
        members.forEach(member => {
            if (member.role === 'member') {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = `${member.full_name} (${member.email})`;
                visitMemberSelect.appendChild(option);
            }
        });
    }

    function renderEvents() {
        if (events.length === 0) {
            eventsList.innerHTML = '<div class="text-gray-400">No events found.</div>';
            return;
        }

        eventsList.innerHTML = '';
        events.forEach(event => {
            const eventCard = document.createElement('div');
            const isFull = event.capacity > 0 && event.registrations >= event.capacity;
            eventCard.className = 'border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow';
            eventCard.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="text-lg font-semibold text-gray-800">${event.title}</h4>
                        <p class="text-gray-600 mt-1">${event.description}</p>
                        <div class="flex gap-4 text-sm text-gray-500 mt-2">
                            <span>📅 ${new Date(event.event_date).toLocaleDateString()}</span>
                            <span>📍 ${event.location}</span>
                        </div>
                        <div class="flex gap-4 text-sm mt-2">
                            <span class="font-medium">Capacity:</span>
                            <span>${event.capacity > 0 ? `${event.registrations} / ${event.capacity}` : 'Unlimited'}</span>
                            ${isFull ? '<span class="text-red-600 font-semibold">Full</span>' : ''}
                        </div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        ${currentUser.role === 'admin' ? `
                            <button class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600" onclick="viewVisits(${event.id})">
                                View Visits
                            </button>
                            <button class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600" onclick="${isFull ? '' : `recordVisit(${event.id})`}" ${isFull ? 'disabled style="opacity:0.6;cursor:not-allowed" title="Event is full"' : ''}>
                                Record Visit
                            </button>
                            <button class="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600" onclick="editEvent(${event.id})">
                                Edit
                            </button>
                            <button class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600" onclick="deleteEvent(${event.id})">
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            eventsList.appendChild(eventCard);
        });
    }

    async function viewVisits(eventId) {
        selectedEventId = eventId;
        const event = events.find(e => e.id === eventId);
        
        try {
            const res = await fetch(CONFIG.apiUrl(`api/events/${eventId}/visits`));
            const visits = await res.json();
            
            visitTrackingContent.innerHTML = `
                <div class="border-b pb-4 mb-4">
                    <h4 class="text-lg font-semibold">${event.title} - Visits</h4>
                    <p class="text-gray-600">${new Date(event.event_date).toLocaleDateString()} at ${event.location}</p>
                </div>
                <div class="space-y-2">
                    ${visits.length === 0 ? 
                        '<div class="text-gray-400">No visits recorded yet.</div>' :
                        visits.map(visit => `
                            <div class="flex justify-between items-center bg-gray-50 p-3 rounded">
                                <div>
                                    <span class="font-medium">${visit.full_name}</span>
                                    <span class="text-gray-600 ml-2">(${visit.email})</span>
                                    <div class="text-sm text-gray-500">Visited: ${new Date(visit.visit_date).toLocaleDateString()}</div>
                                </div>
                                <button class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600" onclick="deleteVisit(${eventId}, ${visit.id})">
                                    Remove
                                </button>
                            </div>
                        `).join('')
                    }
                </div>
            `;
        } catch (error) {
            visitTrackingContent.innerHTML = '<div class="text-red-500">Error loading visits.</div>';
        }
    }

    async function recordVisit(eventId) {
        // Prevent opening modal if event is full
        const event = events.find(ev => ev.id === eventId);
        if (event && event.capacity > 0 && event.registrations >= event.capacity) {
            alert('Event is full. Registration is closed.');
            return;
        }

        selectedEventId = eventId;
        visitModal.classList.remove('hidden');
    }

    function editEvent(eventId) {
        const event = events.find(e => e.id === eventId);
        if (!event) return;
        
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.description;
        document.getElementById('event-date').value = event.event_date.split('T')[0];
        document.getElementById('event-location').value = event.location;
        document.getElementById('event-capacity').value = event.capacity > 0 ? event.capacity : '';
        
        // Store event ID for updating
        createEventForm.dataset.eventId = eventId;
        createEventModal.classList.remove('hidden');
    }

    async function deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event? This will also delete all associated visits.')) {
            return;
        }
        
        try {
            const res = await fetch(CONFIG.apiUrl(`api/events/${eventId}`), { method: 'DELETE' });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message);
            
            alert('Event deleted successfully');
            await fetchEvents();
            renderEvents();
            
            // Clear visit tracking if this event was selected
            if (selectedEventId === eventId) {
                visitTrackingContent.innerHTML = '<p class="text-gray-500">Select an event above to view and manage visits.</p>';
            }
        } catch (error) {
            alert('Error deleting event: ' + error.message);
        }
    }

    async function deleteVisit(eventId, visitId) {
        if (!confirm('Are you sure you want to remove this visit record?')) {
            return;
        }
        
        try {
            const res = await fetch(CONFIG.apiUrl(`api/events/${eventId}/visits/${visitId}`), { method: 'DELETE' });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message);
            
            alert('Visit removed successfully');
            viewVisits(eventId); // Refresh the visits list
        } catch (error) {
            alert('Error removing visit: ' + error.message);
        }
    }

    function setupEventListeners() {
        logoutButton.addEventListener('click', handleLogout);
        
        createEventButton.addEventListener('click', () => {
            // Clear form and remove event ID
            createEventForm.reset();
            delete createEventForm.dataset.eventId;
            createEventModal.classList.remove('hidden');
        });
        
        cancelCreateEvent.addEventListener('click', () => {
            createEventModal.classList.add('hidden');
        });
        
        createEventForm.addEventListener('submit', handleEventSubmit);
        
        cancelVisit.addEventListener('click', () => {
            visitModal.classList.add('hidden');
        });
        
        visitForm.addEventListener('submit', handleVisitSubmit);
        
        // Close modals on background click
        createEventModal.addEventListener('click', (e) => {
            if (e.target === createEventModal) {
                createEventModal.classList.add('hidden');
            }
        });
        
        visitModal.addEventListener('click', (e) => {
            if (e.target === visitModal) {
                visitModal.classList.add('hidden');
            }
        });
    }

    async function handleEventSubmit(e) {
        e.preventDefault();
        
        const capVal = document.getElementById('event-capacity').value;
        const eventData = {
            title: document.getElementById('event-title').value,
            description: document.getElementById('event-description').value,
            event_date: document.getElementById('event-date').value,
            location: document.getElementById('event-location').value,
            capacity: capVal ? parseInt(capVal, 10) : null
        };
        
        try {
            const eventId = createEventForm.dataset.eventId;
            const url = eventId ? CONFIG.apiUrl(`api/events/${eventId}`) : CONFIG.apiUrl('api/events');
            const method = eventId ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            alert(eventId ? 'Event updated successfully' : 'Event created successfully');
            createEventModal.classList.add('hidden');
            await fetchEvents();
            renderEvents();
        } catch (error) {
            alert('Error saving event: ' + error.message);
        }
    }

    async function handleVisitSubmit(e) {
        e.preventDefault();
        
        const visitData = {
            user_id: parseInt(visitMemberSelect.value),
            visit_date: document.getElementById('visit-date').value
        };
        
        try {
            const res = await fetch(CONFIG.apiUrl(`api/events/${selectedEventId}/visits`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(visitData)
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            alert('Visit recorded successfully');
            visitModal.classList.add('hidden');
            visitForm.reset();
            document.getElementById('visit-date').value = new Date().toISOString().split('T')[0];
            
            // Refresh visits if currently viewing this event
            viewVisits(selectedEventId);
        } catch (error) {
            alert('Error recording visit: ' + error.message);
        }
    }

    async function handleLogout() {
        await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST' });
        window.location.href = '/login.html';
    }

    // Make functions global for onclick handlers
    window.viewVisits = viewVisits;
    window.recordVisit = recordVisit;
    window.editEvent = editEvent;
    window.deleteEvent = deleteEvent;
    window.deleteVisit = deleteVisit;

    initialize();
});
