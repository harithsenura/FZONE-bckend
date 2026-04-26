const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    index: true, // For faster queries
  },
  senderId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
});

// Index for faster queries by chatId and timestamp
messageSchema.index({ chatId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
