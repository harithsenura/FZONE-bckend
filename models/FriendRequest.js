const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  }
}, {
  timestamps: true
});

friendRequestSchema.index({ fromUser: 1, toUser: 1 });
friendRequestSchema.index({ status: 1 });
friendRequestSchema.index({ toUser: 1, status: 1 }); // Compound index for fast pending requests lookup

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
