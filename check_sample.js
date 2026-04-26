require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('./models/Post');
const connectDB = require('./config/database');

async function check() {
  await connectDB();
  const post = await Post.findOne({ images: { $exists: true, $ne: [] } }).lean();
  if (post && post.images && post.images.length > 0) {
    console.log('Post ID:', post._id);
    console.log('Image starts with:', post.images[0].substring(0, 100));
  } else {
    console.log('No posts with images found.');
  }
  process.exit(0);
}
check();
