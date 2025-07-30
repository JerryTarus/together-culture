// frontend/js/messages.js
// Refactored for conversation-based messaging

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let conversations = [];
    let members = [];
    let selectedConversationId = null;
    let selectedOtherUser = null;

    // Element selectors (assumes new HTML structure)
    const sidebarNav = document.getElementById('sidebar-nav');
    const logoutButton = document.getElementById('logout-button');
    const conversationList = document.getElementById('conversation-list');
    const memberDirectory = document.getElementById('member-directory');
    const chatWindow = document.getElementById('chat-window');
    const chatHeader = document.getElementById('chat-header');
    const chatHeaderName = document.getElementById('chat-header-name');
    const chatAvatar = document.getElementById('chat-avatar');
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const emojiBtn = document.getElementById('emoji-btn');
    const typingIndicator = document.getElementById('typing-indicator');
    const chatNotifications = document.getElementById('chat-notifications');

    async function initialize() {
        await fetchCurrentUser();
        buildSidebar();
        await fetchMembers();
        await fetchConversations();
        renderMemberDirectory();
        renderConversationList();
        setupEventListeners();
    }

    async function fetchCurrentUser() {
        try {
            const res = await fetch(CONFIG.apiUrl('api/users/me'));
            if (!res.ok) window.location.href = './login.html';
            currentUser = await res.json();
        } catch (error) {
            window.location.href = './login.html';
        }
    }

    function buildSidebar() {
        const commonLinks = `
            <a href="./events.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Events</a>
            <a href="./resources.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Resources</a>
            <a href="./messages.html" class="flex items-center p-3 my-1 bg-brand-beige text-brand-primary rounded-lg font-semibold">Messages</a>
            <a href="./settings.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Settings</a>
        `;
        if (currentUser.role === 'admin') {
            sidebarNav.innerHTML = `
                <a href="./admin_dashboard.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Dashboard</a>
                <a href="./member_directory.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Members</a>
                ${commonLinks}
            `;
        } else {
            sidebarNav.innerHTML = `
                <a href="./member_dashboard.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Dashboard</a>
                ${commonLinks}
            `;
        }
        
        // Update navigation links in header
        updateHeaderNavigation();
    }
    
    function updateHeaderNavigation() {
        // Update dashboard link in header navigation
        const dashboardLink = document.querySelector('a[href="./member_dashboard.html"]');
        if (dashboardLink && currentUser && currentUser.role === 'admin') {
            dashboardLink.href = './admin_dashboard.html';
        }
    }

    async function fetchMembers() {
        try {
            const res = await fetch(CONFIG.apiUrl('api/users'));
            members = await res.json();
        } catch (error) {
            members = [];
        }
    }

    async function fetchConversations() {
        try {
            const res = await fetch(CONFIG.apiUrl('api/messages/conversations'));
            conversations = await res.json();
            
            // For each conversation, fetch unread message count
            for (let conv of conversations) {
                try {
                    const otherUserId = conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id;
                    const messagesRes = await fetch(CONFIG.apiUrl(`api/messages/conversations/${conv.id}`));
                    const messages = await messagesRes.json();
                    
                    // Count unread messages from the other user
                    conv.unreadCount = messages.filter(msg => 
                        msg.sender_id !== currentUser.id && !msg.read_status
                    ).length;
                } catch (error) {
                    conv.unreadCount = 0;
                }
            }
        } catch (error) {
            conversations = [];
        }
    }

    function renderMemberDirectory() {
        memberDirectory.innerHTML = '';
        members.filter(u => u.id !== currentUser.id).forEach(user => {
            const btn = document.createElement('div');
            btn.className = 'flex items-center gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer group';
            btn.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 group-hover:bg-blue-200 transition">${getInitials(user.full_name)}</div>
                <span class="font-medium text-gray-700">${user.full_name}</span>
            `;
            btn.onclick = () => startConversationWith(user);
            memberDirectory.appendChild(btn);
        });
    }

    function renderConversationList() {
        conversationList.innerHTML = '';
        if (conversations.length === 0) {
            conversationList.innerHTML = '<div class="text-gray-500 p-2">No conversations yet.</div>';
            return;
        }
        conversations.forEach(conv => {
            const otherUserId = conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id;
            const otherUser = members.find(u => u.id === otherUserId);
            if (!otherUser) return;
            const unread = conv.unreadCount || 0;
            const btn = document.createElement('div');
            btn.className = 'flex items-center gap-3 p-2 rounded hover:bg-brand-beige cursor-pointer relative group';
            btn.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 group-hover:bg-blue-200 transition">${getInitials(otherUser.full_name)}</div>
                <span class="font-medium text-gray-700">${otherUser.full_name}</span>
                ${unread > 0 ? `<span class="absolute right-3 top-2 bg-brand-primary text-white text-xs rounded-full px-2 py-0.5 animate-pulse">${unread}</span>` : ''}
            `;
            btn.onclick = () => openConversation(conv.id, otherUser.id, otherUser.full_name);
            btn.appendChild(nameSpan);
            
            if (conv.unreadCount > 0) {
                const unreadBadge = document.createElement('span');
                unreadBadge.className = 'bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center';
                unreadBadge.textContent = conv.unreadCount;
                btn.appendChild(unreadBadge);
            }
            
            btn.onclick = () => openConversation(conv.id, otherUserId, otherUserName);
            conversationList.appendChild(btn);
        });
    }

    async function startConversationWith(user) {
        try {
            const res = await fetch(CONFIG.apiUrl('api/messages/start'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ other_user_id: user.id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            await fetchConversations();
            renderConversationList();
            openConversation(data.conversation_id, user.id, user.full_name);
        } catch (error) {
            alert('Could not start conversation: ' + error.message);
        }
    }

    async function openConversation(conversationId, otherUserId, otherUserName) {
        selectedConversationId = conversationId;
        selectedOtherUser = { id: otherUserId, name: otherUserName };
        chatHeader.textContent = `Chat with ${otherUserName}`;
        chatWindow.classList.remove('hidden');
        await loadMessages();
        
        // Mark conversation as read
        try {
            await fetch(CONFIG.apiUrl(`api/messages/conversations/${conversationId}/read`), {
                method: 'PATCH'
            });
            // Refresh conversation list to update unread indicators
            await fetchConversations();
            renderConversationList();
        } catch (error) {
            console.error('Error marking conversation as read:', error);
        }
    }

    async function loadMessages() {
        chatMessages.innerHTML = '<div class="text-gray-400">Loading...</div>';
        try {
            const res = await fetch(CONFIG.apiUrl(`api/messages/conversations/${selectedConversationId}`));
            const msgs = await res.json();
            if (!res.ok) throw new Error(msgs.message);
            chatMessages.innerHTML = '';
            if (msgs.length === 0) {
                chatMessages.innerHTML = '<div class="text-gray-400">No messages yet.</div>';
                return;
            }
            msgs.forEach(msg => {
                const isMine = msg.sender_id === currentUser.id;
                const initials = getInitials(msg.sender_name || 'U');
                const bubble = document.createElement('div');
                bubble.className = `my-2 flex ${isMine ? 'justify-end' : 'justify-start'}`;
                bubble.innerHTML = `
                  ${!isMine ? `<div class='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 mr-2'>${initials}</div>` : ''}
                  <div class="max-w-[70%] px-4 py-2 rounded-lg shadow ${isMine ? 'bg-gradient-to-br from-brand-primary to-blue-400 text-white' : 'bg-gray-100 text-gray-800'}">
                    <div class="text-xs ${isMine ? 'text-blue-200' : 'text-gray-400'}">${msg.sender_name}</div>
                    <div>${msg.message}</div>
                    <div class="text-xs ${isMine ? 'text-blue-200' : 'text-gray-400'} text-right">${new Date(msg.sent_at).toLocaleTimeString()}</div>
                  </div>
                  ${isMine ? `<div class='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 ml-2'>${initials}</div>` : ''}
                `;
                chatMessages.appendChild(bubble);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch (error) {
            chatMessages.innerHTML = '<div class="text-red-500">Could not load messages.</div>';
        }
    }

    // --- Emoji Picker ---
    if (emojiBtn && chatInput) {
        emojiBtn.addEventListener('click', () => {
            // Native emoji picker (works in most browsers)
            chatInput.focus();
            if (window.navigator && window.navigator.userActivation) {
                // fallback: insert emoji
                chatInput.value += '😊';
            } else {
                // fallback: insert emoji
                chatInput.value += '😊';
            }
        });
    }

    // --- Typing Indicator (simulated for demo) ---
    if (chatInput && typingIndicator) {
        let typingTimeout;
        chatInput.addEventListener('input', () => {
            typingIndicator.textContent = 'Typing...';
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                typingIndicator.textContent = '';
            }, 1200);
        });
    }

    // --- Chat Notifications (demo) ---
    function showChatNotification(msg) {
        if (chatNotifications) {
            chatNotifications.textContent = msg;
            chatNotifications.classList.remove('hidden');
            setTimeout(() => {
                chatNotifications.classList.add('hidden');
            }, 2000);
        }
    }

    // --- Helper: Get Initials ---
    function getInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
    }

    function setupEventListeners() {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!chatInput.value.trim()) return;
            await sendMessage(chatInput.value.trim());
            chatInput.value = '';
        });
        logoutButton.addEventListener('click', handleLogout);
    }

    async function sendMessage(text) {
        if (!selectedConversationId) return;
        try {
            const res = await fetch(CONFIG.apiUrl(`api/messages/conversations/${selectedConversationId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            await loadMessages();
        } catch (error) {
            alert('Could not send message: ' + error.message);
        }
    }

    async function handleLogout() {
        await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST' });
        window.location.href = './login.html';
    }

    initialize();
});