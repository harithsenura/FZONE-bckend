const mongoose = require('mongoose');
const Post = require('./models/Post');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Fzone:12345@fzone.a4k19.mongodb.net/?retryWrites=true&w=majority&appName=Fzone');
  const count = await Post.countDocuments();
  console.log("Total posts in DB:", count);
  const latest = await Post.find().sort({ createdAt: -1 }).limit(1).lean();
  console.log("Latest post:", JSON.stringify(latest, null, 2));
  process.exit(0);
}
check();
