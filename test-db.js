const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://Fzone:12345@fzone.a4k19.mongodb.net/?retryWrites=true&w=majority&appName=Fzone');

const FriendRequest = mongoose.model('FriendRequest', new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String
}));

const User = mongoose.model('User', new mongoose.Schema({
  name: String
}));

async function run() {
  const reqs = await FriendRequest.find({ status: 'accepted' }).populate('fromUser toUser', 'name');
  console.log("Total accepted requests:", reqs.length);
  for (let r of reqs) {
    console.log(`${r.fromUser?.name} -> ${r.toUser?.name} [${r._id}]`);
  }
  process.exit(0);
}
run();
