const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const Message = require('./models/Message');
const User = require('./models/User');
const Post = require('./models/Post');
const FriendRequest = require('./models/FriendRequest');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: "*", // In production, specify your React Native app URL
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
connectDB();

// REST API Routes

// ========== Authentication Routes ==========

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Validation
    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ error: 'Please provide name, email, mobile, and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      mobile,
      password,
    });

    await user.save();

    // Return user without password
    const userResponse = user.toJSON();

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return user without password
    const userResponse = user.toJSON();

    res.json({
      message: 'Login successful',
      user: userResponse,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get user by ID
app.get('/api/auth/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
app.put('/api/auth/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { avatar, bio } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Search Users
app.get('/api/users/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    
    const users = await User.find({
      name: { $regex: q, $options: 'i' }
    }).select('name avatar bio').limit(10);
    
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// ========== Friendship Routes ==========

// Get friend status
app.get('/api/friends/status/:userId', async (req, res) => {
  try {
    const fromUserId = req.query.currentUserId;
    if (!fromUserId) return res.status(400).json({ error: 'currentUserId required' });
    const toUserId = req.params.userId;

    const request = await FriendRequest.findOne({
      $or: [
        { fromUser: fromUserId, toUser: toUserId },
        { fromUser: toUserId, toUser: fromUserId }
      ]
    });

    if (!request) {
      return res.json({ status: 'none' });
    }

    if (request.status === 'accepted') {
      return res.json({ status: 'friends' });
    }

    if (request.fromUser.toString() === fromUserId) {
      return res.json({ status: 'requested' });
    }

    res.json({ status: 'pending' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send friend request
app.post('/api/friends/request', async (req, res) => {
  try {
    const { toUserId, fromUserId: passedFromId } = req.body;
    const fromUserId = passedFromId || "66275896e95bf0885e3a89a1"; // Current logged in user

    const existingRequest = await FriendRequest.findOne({
      fromUser: fromUserId,
      toUser: toUserId
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Request already sent' });
    }

    const newRequest = new FriendRequest({
      fromUser: fromUserId,
      toUser: toUserId
    });

    await newRequest.save();
    
    // Real-time Notification
    io.emit('new_friend_request', { 
      toUserId, 
      fromUserId 
    });

    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all pending requests
app.get('/api/friends/requests', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const requests = await FriendRequest.find({
      toUser: userId,
      status: 'pending'
    }).populate('fromUser', 'name avatar');
    
    // Filter out requests where user might have been deleted (null fromUser)
    const validRequests = requests.filter(r => r.fromUser !== null);
    
    res.json(validRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept request
app.post('/api/friends/accept', async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FriendRequest.findById(requestId);
    
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    request.status = 'accepted';
    await request.save();
    
    res.json({ message: 'Request accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Post Routes ==========

// Create a new post
app.post('/api/posts', async (req, res) => {
  try {
    const { userId, userName, userAvatar, text, images } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ error: 'User info is required' });
    }

    if (!text && (!images || images.length === 0)) {
       return res.status(400).json({ error: 'Post must contain text or images' });
    }

    const post = new Post({
      user: {
        _id: userId,
        name: userName,
        avatar: userAvatar || '',
      },
      text: text || '',
      images: images || [],
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(20);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get posts by a specific user
app.get('/api/posts/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ "user._id": userId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// Delete a post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await Post.findByIdAndDelete(id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Toggle like for a post
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Toggle logic
    const likesIndex = post.likes.indexOf(userId);
    if (likesIndex === -1) {
      // Like
      post.likes.push(userId);
      post.likesCount = post.likes.length;
    } else {
      // Unlike
      post.likes.splice(likesIndex, 1);
      post.likesCount = post.likes.length;
    }

    await post.save();
    res.json({ 
      likesCount: post.likesCount, 
      isLiked: post.likes.includes(userId) 
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Add a comment to a post
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { user, avatar, text } = req.body;

    if (!user || !text) {
      return res.status(400).json({ error: 'Username and comment text are required' });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const newComment = {
      user,
      avatar: avatar || '',
      text,
      time: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    // Return the newly created comment object (including generated _id)
    res.status(201).json(post.comments[post.comments.length - 1]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ========== Chat Routes ==========

// Get messages for a specific chat
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chatId })
      .sort({ timestamp: 1 }) // Sort by timestamp ascending (oldest first)
      .limit(100); // Limit to last 100 messages

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message (can also be used via REST)
app.post('/api/messages', async (req, res) => {
  try {
    const { chatId, senderId, senderName, text } = req.body;

    if (!chatId || !senderId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const message = new Message({
      chatId,
      senderId,
      senderName: senderName || 'Unknown',
      text,
      timestamp: new Date(),
    });

    await message.save();

    // Emit to all clients in this chat room
    io.to(chatId).emit('newMessage', message);

    res.json(message);
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Join a chat room
  socket.on('joinChat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat: ${chatId}`);
  });

  // Leave a chat room
  socket.on('leaveChat', (chatId) => {
    socket.leave(chatId);
    console.log(`User ${socket.id} left chat: ${chatId}`);
  });

  // Handle new message
  socket.on('sendMessage', async (data) => {
    try {
      const { chatId, senderId, senderName, text } = data;

      if (!chatId || !senderId || !text) {
        return socket.emit('error', { message: 'Missing required fields' });
      }

      const message = new Message({
        chatId,
        senderId,
        senderName: senderName || 'Unknown',
        text,
        timestamp: new Date(),
      });

      await message.save();

      // Broadcast to all clients in this chat room (including sender)
      io.to(chatId).emit('newMessage', message);
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { chatId, senderName, isTyping } = data;
    socket.to(chatId).emit('userTyping', { senderName, isTyping });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const localIp = Object.values(networkInterfaces)
    .flat()
    .find(i => i.family === 'IPv4' && !i.internal)?.address || 'localhost';
    
  console.log(`🚀 Server running on http://${localIp}:${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
});
