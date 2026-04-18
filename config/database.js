const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://verstacklk_db_user:Toolup1217@cluster0.uzck9rd.mongodb.net/';
    
    await mongoose.connect(mongoURI, {
      family: 4, // Force IPv4 to resolve ENOTFOUND issues
    });

    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
