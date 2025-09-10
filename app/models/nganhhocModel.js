const mongoose = require('mongoose');

const NganhHocSchema = new mongoose.Schema({
  TenNganh: {
    type: String,
    required: true,
    trim: true
  },
  Khoa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Khoa',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('NganhHoc', NganhHocSchema);
