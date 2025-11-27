
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle'); // Changed ID to match new HTML
    const body = document.body;

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
    } else {
        // Set default theme if none saved (e.g., from system preference or default dark)
        body.setAttribute('data-theme', 'dark');
    }

    themeToggle.addEventListener('click', () => {
        if (body.getAttribute('data-theme') === 'light') {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });

    // Promo Banner Visibility Logic
    const promoBanner = document.getElementById('promoBanner');
    if (promoBanner) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 0) {
                promoBanner.classList.add('promo-banner-hidden');
            } else {
                promoBanner.classList.remove('promo-banner-hidden');
            }
        });
    }

    // Chat functionality
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        const socket = io();
        const itemId = document.getElementById('itemId').value;
        const currentUserId = document.getElementById('userId').value;
        const messagesContainer = document.getElementById('messages');
        const chatForm = document.getElementById('chat-form');
        const messageInput = document.getElementById('message-input');

        // Join the chat room for the specific item
        socket.emit('join_chat', itemId);

        // Handle form submission to send a message
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = messageInput.value;
            if (message.trim()) {
                socket.emit('send_message', { itemId, message });
                messageInput.value = '';
            }
        });

        // Listen for incoming messages
        socket.on('receive_message', (data) => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            
            // Check if the message is from the current user
            if (data.sender_id == currentUserId) {
                messageElement.classList.add('own-message');
            }
            
            messageElement.innerHTML = `<strong>${data.username}:</strong> ${data.message}`;
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to the bottom
        });
    }
});
