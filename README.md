# Chat Backend Server

MongoDB + Socket.io backend for real-time chat functionality.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (optional - MongoDB URI is hardcoded in config):
```bash
cp .env.example .env
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### GET `/api/messages/:chatId`
Get all messages for a specific chat room.

### POST `/api/messages`
Send a message (can also use Socket.io).

## Socket.io Events

### Client → Server:
- `joinChat(chatId)` - Join a chat room
- `leaveChat(chatId)` - Leave a chat room
- `sendMessage(data)` - Send a new message
- `typing(data)` - Send typing indicator

### Server → Client:
- `newMessage(message)` - Receive a new message
- `userTyping(data)` - Receive typing indicator

## MongoDB Connection

The server connects to MongoDB Atlas using the provided connection string.
Messages are stored in the `messages` collection with the following schema:
- chatId (String)
- senderId (String)
- senderName (String)
- text (String)
- timestamp (Date)
