
// frontend/js/messages.js

// Global state
let currentUser = null;
let conversations = [];
let currentConversation = null;
let messages = [];

// DOM Elements
let conversationsList, messagesContainer, messageInput, sendButton;
let newConversationModal, newConversationForm;
let userNameSpan, logoutBtn;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Messages page loaded');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Check authentication
    await checkAuthentication();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    await loadConversations();
});

function initializeDOMElements() {
    conversationsList = document.getElementById('conversations-list');
    messagesContainer = document.getElementById('messages-container');
    messageInput = document.getElementById('message-input');
    sendButton = document.getElementById('send-button');
    newConversationModal = document.getElementById('new-conversation-modal');
    newConversationForm = document.getElementById('new-conversation-form');
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
        
        // Update UI based on user info
        if (userNameSpan) {
            userNameSpan.textContent = currentUser.full_name;
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
    // Send message
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // New conversation
    const newConversationBtn = document.getElementById('new-conversation-btn');
    if (newConversationBtn) {
        newConversationBtn.addEventListener('click', openNewConversationModal);
    }
    
    // New conversation form
    if (newConversationForm) {
        newConversationForm.addEventListener('submit', handleNewConversation);
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function loadConversations() {
    try {
        const response = await fetch(CONFIG.apiUrl('api/messages/conversations'), {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }
        
        const data = await response.json();
        conversations = data.conversations || [];
        
        displayConversations();
        
        // Load first conversation if exists
        if (conversations.length > 0) {
            selectConversation(conversations[0]);
        }
        
    } catch (error) {
        console.error('Error loading conversations:', error);
        showMessage('Failed to load conversations.', 'error');
    }
}

function displayConversations() {
    if (!conversationsList) return;
    
    if (conversations.length === 0) {
        conversationsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <p>No conversations yet</p>
                <button onclick="openNewConversationModal()" class="mt-2 text-brand-primary hover:underline">Start a conversation</button>
            </div>
        `;
        return;
    }
    
    conversationsList.innerHTML = conversations.map(conversation => `
        <div class="conversation-item p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${currentConversation && currentConversation.id === conversation.id ? 'bg-blue-50' : ''}"
             onclick="selectConversation(${JSON.stringify(conversation).replace(/"/g, '&quot;')})">
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <h3 class="font-medium text-gray-900">${escapeHtml(conversation.title)}</h3>
                    <p class="text-sm text-gray-600 mt-1">${conversation.participants.map(p => p.full_name).join(', ')}</p>
                    ${conversation.last_message ? `
                        <p class="text-xs text-gray-500 mt-1 truncate">${escapeHtml(conversation.last_message.content)}</p>
                    ` : ''}
                </div>
                <div class="text-xs text-gray-400">
                    ${conversation.last_message ? formatDate(new Date(conversation.last_message.created_at)) : ''}
                </div>
            </div>
        </div>
    `).join('');
}

async function selectConversation(conversation) {
    currentConversation = conversation;
    
    // Update UI
    displayConversations(); // Refresh to show selection
    
    // Load messages for this conversation
    await loadMessages(conversation.id);
}

async function loadMessages(conversationId) {
    try {
        const response = await fetch(CONFIG.apiUrl(`api/messages/conversations/${conversationId}/messages`), {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        
        const data = await response.json();
        messages = data.messages || [];
        
        displayMessages();
        
    } catch (error) {
        console.error('Error loading messages:', error);
        showMessage('Failed to load messages.', 'error');
    }
}

function displayMessages() {
    if (!messagesContainer || !currentConversation) return;
    
    const messagesHtml = messages.map(message => `
        <div class="message-item mb-4 ${message.sender_id === currentUser.id ? 'text-right' : 'text-left'}">
            <div class="inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender_id === currentUser.id 
                    ? 'bg-brand-primary text-white' 
                    : 'bg-gray-200 text-gray-900'
            }">
                <p class="text-sm">${escapeHtml(message.content)}</p>
                <p class="text-xs mt-1 opacity-75">${formatTime(new Date(message.created_at))}</p>
            </div>
            ${message.sender_id !== currentUser.id ? `
                <p class="text-xs text-gray-500 mt-1">${escapeHtml(message.sender_name)}</p>
            ` : ''}
        </div>
    `).join('');
    
    messagesContainer.innerHTML = messagesHtml;
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendMessage() {
    if (!currentConversation || !messageInput) return;
    
    const content = messageInput.value.trim();
    if (!content) return;
    
    try {
        const response = await fetch(CONFIG.apiUrl(`api/messages/conversations/${currentConversation.id}/messages`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        
        messageInput.value = '';
        
        // Reload messages
        await loadMessages(currentConversation.id);
        
        // Refresh conversations to update last message
        await loadConversations();
        
    } catch (error) {
        console.error('Error sending message:', error);
        showMessage('Failed to send message.', 'error');
    }
}

function openNewConversationModal() {
    if (newConversationModal) {
        newConversationModal.classList.remove('hidden');
        loadUsersForConversation();
    }
}

function closeNewConversationModal() {
    if (newConversationModal) {
        newConversationModal.classList.add('hidden');
    }
}

async function loadUsersForConversation() {
    try {
        const response = await fetch(CONFIG.apiUrl('api/users'), {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        
        const users = await response.json();
        const participantsSelect = document.getElementById('conversation-participants');
        
        if (participantsSelect) {
            participantsSelect.innerHTML = users
                .filter(user => user.id !== currentUser.id && user.status === 'approved')
                .map(user => `
                    <option value="${user.id}">${escapeHtml(user.full_name)} (${escapeHtml(user.email)})</option>
                `).join('');
        }
        
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Failed to load users.', 'error');
    }
}

async function handleNewConversation(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const title = formData.get('title');
    const participantIds = Array.from(formData.getAll('participants'));
    
    if (!title || participantIds.length === 0) {
        showMessage('Please provide a title and select participants.', 'error');
        return;
    }
    
    try {
        const response = await fetch(CONFIG.apiUrl('api/messages/conversations'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                title,
                participant_ids: participantIds
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create conversation');
        }
        
        const newConversation = await response.json();
        
        closeNewConversationModal();
        await loadConversations();
        
        // Select the new conversation
        const conversation = conversations.find(c => c.id === newConversation.conversation.id);
        if (conversation) {
            selectConversation(conversation);
        }
        
        showMessage('Conversation created successfully!', 'success');
        
    } catch (error) {
        console.error('Error creating conversation:', error);
        showMessage('Failed to create conversation.', 'error');
    }
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
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(date) {
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

// Global functions
window.selectConversation = selectConversation;
window.openNewConversationModal = openNewConversationModal;
window.closeNewConversationModal = closeNewConversationModal;
