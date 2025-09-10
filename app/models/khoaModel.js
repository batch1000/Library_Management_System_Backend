const mongoose = require('mongoose');

const KhoaSchema = new mongoose.Schema({
  TenKhoa: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Khoa', KhoaSchema);