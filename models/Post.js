const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  text: { 
    type: String, 
    default: '' 
  },
  images: [{ 
    type: String // We will store Base64 strings here
  }],
  likesCount: { 
    type: Number, 
    default: 0 
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    user: { type: String, required: true },
    avatar: { type: String },
    text: { type: String, required: true },
    time: { type: Date, default: Date.now },
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null }
  }],
}, { timestamps: true });

postSchema.index({ "user._id": 1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
