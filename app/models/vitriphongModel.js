const mongoose = require('mongoose');

const ViTriPhongSchema = new mongoose.Schema({
  ViTri: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ViTriPhong', ViTriPhongSchema);
