
let currentUser = null;
let conversations = [];
let currentConversation = null;
let messages = [];
let allMembers = [];

// DOM Elements
let conversationsList, messagesContainer, messageInput, sendButton;
let userNameSpan, logoutBtn, memberSearchInput, membersList;

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
    await Promise.all([
        loadConversations(),
        loadAllMembers()
    ]);
});

function initializeDOMElements() {
    conversationsList = document.getElementById('conversations-list');
    messagesContainer = document.getElementById('messages-container');
    messageInput = document.getElementById('message-input');
    sendButton = document.getElementById('send-btn');
    userNameSpan = document.getElementById('user-name');
    logoutBtn = document.getElementById('logout-btn');
    memberSearchInput = document.getElementById('member-search');
    membersList = document.getElementById('members-list');
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
        currentUser = data.user || data;
        
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
    const dashboardLink = document.getElementById('dashboard-link');
    if (dashboardLink && currentUser && currentUser.role === 'admin') {
        dashboardLink.href = './admin_dashboard.html';
        dashboardLink.textContent = 'Admin Dashboard';
    }
}

function setupEventListeners() {
    // Message form submission
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', handleMessageSubmit);
    }
    
    // Message input character count
    if (messageInput) {
        messageInput.addEventListener('input', updateCharCount);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleMessageSubmit(e);
            }
        });
    }
    
    // Member search
    if (memberSearchInput) {
        memberSearchInput.addEventListener('input', handleMemberSearch);
    }
    
    // Conversation info and leave buttons
    const conversationInfoBtn = document.getElementById('conversation-info-btn');
    const leaveConversationBtn = document.getElementById('leave-conversation-btn');
    
    if (conversationInfoBtn) {
        conversationInfoBtn.addEventListener('click', showConversationInfo);
    }
    
    if (leaveConversationBtn) {
        leaveConversationBtn.addEventListener('click', leaveConversation);
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
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
        
        allMembers = await response.json();
        // Filter out current user and only show approved members
        allMembers = allMembers.filter(member => 
            member.id !== currentUser.id && member.status === 'approved'
        );
        
        renderMembersList();
        
    } catch (error) {
        console.error('Error loading members:', error);
        showMessage('Failed to load members.', 'error');
    }
}

function renderMembersList(filteredMembers = allMembers) {
    if (!membersList) return;
    
    if (filteredMembers.length === 0) {
        membersList.innerHTML = '<div class="p-2 text-sm text-gray-500">No members found</div>';
        membersList.classList.add('hidden');
        return;
    }
    
    const membersHtml = filteredMembers.slice(0, 10).map(member => `
        <div class="member-item p-2 hover:bg-gray-100 cursor-pointer border-b" data-member-id="${member.id}">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    ${member.full_name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <div class="font-medium text-sm">${escapeHtml(member.full_name)}</div>
                    <div class="text-xs text-gray-500">${escapeHtml(member.email)}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    membersList.innerHTML = membersHtml;
    membersList.classList.remove('hidden');
    
    // Add click listeners to member items
    membersList.querySelectorAll('.member-item').forEach(item => {
        item.addEventListener('click', () => {
            const memberId = parseInt(item.dataset.memberId);
            startConversationWithMember(memberId);
        });
    });
}

function handleMemberSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        membersList.classList.add('hidden');
        return;
    }
    
    const filteredMembers = allMembers.filter(member => 
        member.full_name.toLowerCase().includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm)
    );
    
    renderMembersList(filteredMembers);
}

async function startConversationWithMember(memberId) {
    try {
        // Hide member search results
        membersList.classList.add('hidden');
        memberSearchInput.value = '';
        
        // Check if conversation already exists
        const existingConversation = conversations.find(conv => 
            conv.type === 'direct' && 
            conv.participants.some(p => p.id === memberId)
        );
        
        if (existingConversation) {
            selectConversation(existingConversation);
            return;
        }
        
        // Create new conversation
        const response = await fetch(CONFIG.apiUrl('api/messages/conversations'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                type: 'direct',
                participant_ids: [memberId]
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create conversation');
        }
        
        const result = await response.json();
        
        // Reload conversations and select the new one
        await loadConversations();
        const newConversation = conversations.find(c => c.id === result.conversation.id);
        if (newConversation) {
            selectConversation(newConversation);
        }
        
    } catch (error) {
        console.error('Error starting conversation:', error);
        showMessage('Failed to start conversation.', 'error');
    }
}

async function loadConversations() {
    try {
        // Show loading state
        document.getElementById('conversations-loading').classList.remove('hidden');
        conversationsList.classList.add('hidden');
        document.getElementById('no-conversations').classList.add('hidden');
        
        const response = await fetch(CONFIG.apiUrl('api/messages/conversations'), {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }
        
        const data = await response.json();
        conversations = data.conversations || [];
        
        // Hide loading state
        document.getElementById('conversations-loading').classList.add('hidden');
        
        if (conversations.length === 0) {
            document.getElementById('no-conversations').classList.remove('hidden');
        } else {
            displayConversations();
        }
        
    } catch (error) {
        console.error('Error loading conversations:', error);
        document.getElementById('conversations-loading').classList.add('hidden');
        showMessage('Failed to load conversations.', 'error');
    }
}

function displayConversations() {
    if (!conversationsList) return;
    
    conversationsList.classList.remove('hidden');
    
    const conversationsHtml = conversations.map(conversation => {
        const otherParticipants = conversation.participants.filter(p => p.id !== currentUser.id);
        const displayName = conversation.title || otherParticipants.map(p => p.full_name).join(', ') || 'Unknown';
        const isSelected = currentConversation && currentConversation.id === conversation.id;
        
        return `
            <div class="conversation-item p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${isSelected ? 'active' : ''}"
                 onclick="selectConversation(${JSON.stringify(conversation).replace(/"/g, '&quot;')})">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center text-white font-medium">
                        ${displayName.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-medium text-gray-900 truncate">${escapeHtml(displayName)}</h3>
                        ${conversation.last_message ? `
                            <p class="text-sm text-gray-500 truncate">${escapeHtml(conversation.last_message.content)}</p>
                            <p class="text-xs text-gray-400">${formatDate(new Date(conversation.last_message.created_at))}</p>
                        ` : '<p class="text-sm text-gray-500">No messages yet</p>'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    conversationsList.innerHTML = conversationsHtml;
}

async function selectConversation(conversation) {
    currentConversation = conversation;
    
    // Update UI
    document.getElementById('welcome-state').classList.add('hidden');
    document.getElementById('chat-container').classList.remove('hidden');
    displayConversations(); // Refresh to show selection
    
    // Update chat header
    const otherParticipants = conversation.participants.filter(p => p.id !== currentUser.id);
    const displayName = conversation.title || otherParticipants.map(p => p.full_name).join(', ') || 'Unknown';
    
    document.getElementById('chat-avatar').textContent = displayName.charAt(0).toUpperCase();
    document.getElementById('chat-title').textContent = displayName;
    document.getElementById('chat-subtitle').textContent = `${conversation.participants.length} participants`;
    
    // Load messages for this conversation
    await loadMessages(conversation.id);
}

async function loadMessages(conversationId) {
    try {
        // Show loading state
        document.getElementById('messages-loading').classList.remove('hidden');
        document.getElementById('messages-container').classList.add('hidden');
        
        const response = await fetch(CONFIG.apiUrl(`api/messages/conversations/${conversationId}/messages`), {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        
        const data = await response.json();
        messages = data.messages || [];
        
        // Hide loading state
        document.getElementById('messages-loading').classList.add('hidden');
        document.getElementById('messages-container').classList.remove('hidden');
        
        displayMessages();
        
    } catch (error) {
        console.error('Error loading messages:', error);
        document.getElementById('messages-loading').classList.add('hidden');
        showMessage('Failed to load messages.', 'error');
    }
}

function displayMessages() {
    if (!messagesContainer || !currentConversation) return;
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-500">
                <div class="text-center">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    <p class="mt-2">No messages yet. Start the conversation!</p>
                </div>
            </div>
        `;
        return;
    }
    
    const messagesHtml = messages.map(message => {
        const isSent = message.sender_id === currentUser.id;
        return `
            <div class="flex ${isSent ? 'justify-end' : 'justify-start'} mb-4">
                <div class="message-bubble ${isSent ? 'message-sent' : 'message-received'} px-4 py-2 rounded-lg">
                    <p class="text-sm">${escapeHtml(message.content)}</p>
                    <div class="flex items-center justify-between mt-1 gap-2">
                        ${!isSent ? `<span class="text-xs opacity-75">${escapeHtml(message.sender_name)}</span>` : ''}
                        <span class="text-xs opacity-75">${formatTime(new Date(message.created_at))}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    messagesContainer.innerHTML = messagesHtml;
    
    // Scroll to bottom
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

async function handleMessageSubmit(e) {
    e.preventDefault();
    
    if (!currentConversation || !messageInput) return;
    
    const content = messageInput.value.trim();
    if (!content) return;
    
    // Disable send button
    if (sendButton) {
        sendButton.disabled = true;
    }
    
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
        updateCharCount();
        
        // Reload messages and conversations
        await Promise.all([
            loadMessages(currentConversation.id),
            loadConversations()
        ]);
        
    } catch (error) {
        console.error('Error sending message:', error);
        showMessage('Failed to send message.', 'error');
    } finally {
        // Re-enable send button
        if (sendButton) {
            sendButton.disabled = false;
        }
    }
}

function updateCharCount() {
    const charCountEl = document.getElementById('char-count');
    if (charCountEl && messageInput) {
        const count = messageInput.value.length;
        charCountEl.textContent = `${count}/1000`;
        
        if (sendButton) {
            sendButton.disabled = count === 0 || count > 1000;
        }
    }
}

function showConversationInfo() {
    if (!currentConversation) return;
    
    const modal = document.getElementById('conversation-info-modal');
    const content = document.getElementById('conversation-info-content');
    
    if (modal && content) {
        const participants = currentConversation.participants.map(p => 
            `<div class="flex items-center gap-2 py-2">
                <div class="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white text-sm">
                    ${p.full_name.charAt(0).toUpperCase()}
                </div>
                <span>${escapeHtml(p.full_name)} ${p.id === currentUser.id ? '(You)' : ''}</span>
            </div>`
        ).join('');
        
        content.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h4 class="font-medium text-gray-900">Participants</h4>
                    <div class="mt-2">${participants}</div>
                </div>
                <div>
                    <h4 class="font-medium text-gray-900">Created</h4>
                    <p class="text-sm text-gray-600">${formatDate(new Date(currentConversation.created_at))}</p>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }
}

async function leaveConversation() {
    if (!currentConversation) return;
    
    if (!confirm('Are you sure you want to leave this conversation?')) {
        return;
    }
    
    try {
        const response = await fetch(CONFIG.apiUrl(`api/messages/conversations/${currentConversation.id}`), {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to leave conversation');
        }
        
        // Reset UI and reload conversations
        currentConversation = null;
        document.getElementById('chat-container').classList.add('hidden');
        document.getElementById('welcome-state').classList.remove('hidden');
        
        await loadConversations();
        showMessage('Left conversation successfully.', 'success');
        
    } catch (error) {
        console.error('Error leaving conversation:', error);
        showMessage('Failed to leave conversation.', 'error');
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

// Modal functions
function closeConversationInfoModal() {
    const modal = document.getElementById('conversation-info-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
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
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
        type === 'error' ? 'bg-red-600' : 
        type === 'success' ? 'bg-green-600' : 
        'bg-blue-600'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// Global functions
window.selectConversation = selectConversation;
window.closeConversationInfoModal = closeConversationInfoModal;
