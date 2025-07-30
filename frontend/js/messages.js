// frontend/js/messages.js

let currentUser = null;
let currentConversation = null;
let allMembers = [];
let conversations = [];

// DOM Elements
let membersContainer, conversationsContainer, chatContainer;
let membersList, chatMessages, messageInput, sendButton;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Messages page loaded');

    // Initialize DOM elements
    initializeDOMElements();

    // Check authentication
    await checkAuthentication();

    // Load initial data
    await Promise.all([
        loadAllMembers(),
        loadConversations()
    ]);

    // Setup event listeners
    setupEventListeners();
});

function initializeDOMElements() {
    membersContainer = document.getElementById('members-container');
    conversationsContainer = document.getElementById('conversations-container');
    chatContainer = document.getElementById('chat-container');
    membersList = document.getElementById('members-list');
    chatMessages = document.getElementById('chat-messages');
    messageInput = document.getElementById('message-input');
    sendButton = document.getElementById('send-button');
}

async function checkAuthentication() {
    try {
        const response = await fetch(CONFIG.apiUrl('api/users/me'), {
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        currentUser = data.user;

        // Update user name in UI
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = currentUser.full_name;
        }

        // Update dashboard link based on role
        const dashboardLink = document.getElementById('dashboard-link');
        if (dashboardLink && currentUser.role === 'admin') {
            dashboardLink.href = './admin_dashboard.html';
        }

        console.log('User authenticated:', currentUser.email, 'Role:', currentUser.role);
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/login.html';
    }
}

async function loadAllMembers() {
    try {
        const response = await fetch(CONFIG.apiUrl('api/users'), {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load members');
        }

        const members = await response.json();
        allMembers = members.filter(member => member.id !== currentUser.id && member.status === 'approved');

        displayMembers(allMembers);

    } catch (error) {
        console.error('Error loading members:', error);
        showMessage('Failed to load members', 'error');
    }
}

function displayMembers(members) {
    if (!membersList) return;

    if (members.length === 0) {
        membersList.innerHTML = '<div class="p-4 text-gray-500 text-center">No members available</div>';
        return;
    }

    membersList.innerHTML = '';

    members.forEach(member => {
        const memberItem = document.createElement('div');
        memberItem.className = 'member-item p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors';
        memberItem.onclick = () => startConversation(member);

        memberItem.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-semibold">
                    ${member.full_name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${escapeHtml(member.full_name)}</h4>
                    <p class="text-sm text-gray-500">${escapeHtml(member.email)}</p>
                </div>
                <div class="text-sm text-gray-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>
            </div>
        `;

        membersList.appendChild(memberItem);
    });
}

async function loadConversations() {
    try {
        const response = await fetch(CONFIG.apiUrl('api/messages/conversations'), {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }

        conversations = await response.json();
        displayConversations(conversations);

    } catch (error) {
        console.error('Error loading conversations:', error);
        // Don't show error for conversations as it's optional
    }
}

function displayConversations(conversations) {
    if (!conversationsContainer) return;

    if (conversations.length === 0) {
        conversationsContainer.innerHTML = '<div class="p-4 text-gray-500 text-center">No conversations yet</div>';
        return;
    }

    conversationsContainer.innerHTML = '';

    conversations.forEach(conversation => {
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors';
        conversationItem.onclick = () => openConversation(conversation);

        const otherUser = conversation.other_user;
        const lastMessage = conversation.last_message;

        conversationItem.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-semibold">
                    ${otherUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${escapeHtml(otherUser.full_name)}</h4>
                    <p class="text-sm text-gray-500 truncate">${lastMessage ? escapeHtml(lastMessage.content) : 'No messages yet'}</p>
                </div>
                <div class="text-xs text-gray-400">
                    ${lastMessage ? formatTime(lastMessage.sent_at) : ''}
                </div>
            </div>
        `;

        conversationsContainer.appendChild(conversationItem);
    });
}

async function startConversation(member) {
    currentConversation = {
        other_user: member,
        messages: []
    };

    // Show chat container
    if (chatContainer) {
        chatContainer.classList.remove('hidden');
    }

    // Update chat header
    const chatHeader = document.getElementById('chat-header');
    if (chatHeader) {
        chatHeader.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center font-semibold">
                    ${member.full_name.charAt(0).toUpperCase()}
                </div>
                <h3 class="font-semibold text-gray-900">${escapeHtml(member.full_name)}</h3>
            </div>
        `;
    }

    // Enable message input and send button
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = `Type a message to ${member.full_name}...`;
    }
    if (sendButton) {
        sendButton.disabled = false;
    }

    // Load messages for this conversation
    await loadMessages(member.id);
}

async function openConversation(conversation) {
    currentConversation = conversation;

    // Show chat container
    if (chatContainer) {
        chatContainer.classList.remove('hidden');
    }

    // Update chat header
    const chatHeader = document.getElementById('chat-header');
    if (chatHeader) {
        chatHeader.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center font-semibold">
                    ${conversation.other_user.full_name.charAt(0).toUpperCase()}
                </div>
                <h3 class="font-semibold text-gray-900">${escapeHtml(conversation.other_user.full_name)}</h3>
            </div>
        `;
    }

    // Enable message input and send button
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = `Type a message to ${conversation.other_user.full_name}...`;
    }
    if (sendButton) {
        sendButton.disabled = false;
    }

    // Load messages for this conversation
    await loadMessages(conversation.other_user.id);
}

async function loadMessages(otherUserId) {
    try {
        const response = await fetch(CONFIG.apiUrl(`api/messages/conversation/${otherUserId}`), {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load messages');
        }

        const messages = await response.json();
        displayMessages(messages);

    } catch (error) {
        console.error('Error loading messages:', error);
        if (chatMessages) {
            chatMessages.innerHTML = '<div class="p-4 text-gray-500 text-center">Failed to load messages</div>';
        }
    }
}

function displayMessages(messages) {
    if (!chatMessages) return;

    if (messages.length === 0) {
        chatMessages.innerHTML = '<div class="p-4 text-gray-500 text-center">No messages yet. Start the conversation!</div>';
        return;
    }

    chatMessages.innerHTML = '';

    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        const isOwnMessage = message.sender_id === currentUser.id;

        messageDiv.className = `message-item mb-4 ${isOwnMessage ? 'text-right' : 'text-left'}`;

        messageDiv.innerHTML = `
            <div class="inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwnMessage 
                    ? 'bg-brand-primary text-white' 
                    : 'bg-gray-200 text-gray-900'
            }">
                <p class="text-sm">${escapeHtml(message.content)}</p>
                <p class="text-xs mt-1 ${isOwnMessage ? 'text-brand-primary-light' : 'text-gray-500'}">
                    ${formatTime(message.sent_at)}
                </p>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    if (!currentConversation || !messageInput || !messageInput.value.trim()) {
        return;
    }

    const content = messageInput.value.trim();
    const receiverId = currentConversation.other_user.id;

    try {
        const response = await fetch(CONFIG.apiUrl('api/messages'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                receiver_id: currentConversation.other_user.id,
                content: content
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        const result = await response.json();

        // Clear input
        messageInput.value = '';

        // Add message to UI immediately
        const message = {
            id: result.id || Date.now(),
            content: content,
            sender_id: currentUser.id,
            receiver_id: currentConversation.other_user.id,
            sent_at: new Date().toISOString(),
            sender_name: currentUser.full_name
        };

        // Add to current conversation messages
        if (!currentConversation.messages) {
            currentConversation.messages = [];
        }
        currentConversation.messages.push(message);

        addMessageToChat(message);

        // Update conversations list to show latest message
        await loadConversations();

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (error) {
        console.error('Error sending message:', error);
        showMessage('Failed to send message', 'error');
    }
}

function setupEventListeners() {
    // Send button
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    // Message input - send on Enter
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Search members
    const searchInput = document.getElementById('search-members');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filteredMembers = allMembers.filter(member => 
                member.full_name.toLowerCase().includes(query) ||
                member.email.toLowerCase().includes(query)
            );
            displayMembers(filteredMembers);
        });
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
        localStorage.clear();
        sessionStorage.clear();
        showMessage('Logged out successfully. Redirecting...', 'success', 1500);
        setTimeout(() => {
            window.location.href = '/';
        }, 1600);
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function showMessage(message, type = 'info', duration = 3000) {
    // Create notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } text-white`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, duration);
}