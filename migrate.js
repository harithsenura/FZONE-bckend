require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const Post = require('./models/Post');
const User = require('./models/User');
const connectDB = require('./config/database');

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function migrate() {
  try {
    await connectDB();
    console.log('🚀 Connected to MongoDB for migration...');
    console.log(`📂 Using collection: ${Post.collection.name}`);

    // 1. Migrate Posts
    console.log('🔍 Counting posts with images...');
    const count = await Post.countDocuments({ images: { $exists: true, $ne: [] } });
    console.log(`📊 Total posts with images: ${count}`);

    const cursor = Post.find({ images: { $exists: true, $ne: [] } }).select('images').cursor();
    console.log(`🔍 Processing posts. Checking for Base64...`);

    for (let postData = await cursor.next(); postData != null; postData = await cursor.next()) {
      let updated = false;
      const newImages = [];

      for (let img of postData.images) {
        if (img.startsWith('data:image')) {
          console.log(`📤 Uploading old post image for post ${postData._id} to Cloudinary...`);
          const result = await cloudinary.uploader.upload(img, {
            folder: 'migrated_posts'
          });
          newImages.push(result.secure_url);
          updated = true;
        } else {
          newImages.push(img);
        }
      }

      if (updated) {
        await Post.findByIdAndUpdate(postData._id, { images: newImages });
        console.log(`✅ Post ${postData._id} updated with Cloudinary URLs.`);
      }
    }

    // 2. Migrate User Avatars
    const users = await User.find({ avatar: { $regex: /^data:image/ } });
    console.log(`🔍 Found ${users.length} users with Base64 avatars. Migrating...`);

    for (let user of users) {
      console.log(`📤 Uploading avatar for user: ${user.name}`);
      const result = await cloudinary.uploader.upload(user.avatar, {
        folder: 'migrated_avatars'
      });
      user.avatar = result.secure_url;
      await user.save();
      console.log(`✅ User ${user.name} avatar updated.`);
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
