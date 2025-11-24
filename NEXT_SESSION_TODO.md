# Next Session To-Do

This file outlines the remaining tasks for implementing the chat system feature.

## Phase 2: Chat System (Continued)

### 1. Backend (Routes and Logic):

*   **Integrate `socket.io`:**
    *   Install `socket.io` (if not already done).
    *   Integrate `socket.io` with the existing Express server in `src/app.js`. This typically involves passing the HTTP server instance to `socket.io`.
*   **Chat Routes:**
    *   Create a new router file `src/routes/chat.js` (or extend `marketplace.js` if preferred, but a separate file is cleaner for chat-specific logic).
    *   Implement a `GET /chat/:itemId` route to render the chat interface for a specific marketplace item. This route should fetch existing chat messages and relevant item/user information.
*   **Socket.IO Events:**
    *   Implement server-side Socket.IO event handlers for:
        *   `join_chat`: When a user connects to a specific chat room (e.g., for an item).
        *   `send_message`: When a user sends a new message. This should save the message to the `chat_messages` table and then broadcast it to other users in the same chat room.
        *   `receive_message`: (Client-side event, but server needs to emit it).

### 2. Frontend (Views and JS):

*   **Create `views/chat.ejs`:**
    *   Design the chat interface, including:
        *   Display area for messages.
        *   Input field for new messages.
        *   Send button.
        *   Display of sender/receiver names.
*   **Client-side JavaScript:**
    *   Add JavaScript code (likely in `public/js/main.js` or a new `public/js/chat.js`) to:
        *   Establish a WebSocket connection to the `socket.io` server.
        *   Join the appropriate chat room when the `chat.ejs` page loads.
        *   Handle sending messages (emitting `send_message` event).
        *   Handle receiving messages (listening for `receive_message` event) and displaying them in the UI.
        *   Ensure messages are displayed securely and clearly.

---
**Note:** Before starting Phase 2, ensure `socket.io` is installed (`npm install socket.io`).
