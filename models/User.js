const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true },
    role:       { type: String, enum: ['admin', 'chef_projet', 'employe'], default: 'employe' },
    department: { type: String, default: '' },
    phone:      { type: String, default: '' },
    bio:        { type: String, default: '', maxlength: 500 },
    avatar:     { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);