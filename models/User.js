const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  profilePhoto: { type: String },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  savedPasswords: [{ title: String, password: String }]
});

module.exports = mongoose.model('User', userSchema);
