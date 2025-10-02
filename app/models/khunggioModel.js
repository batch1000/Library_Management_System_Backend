const mongoose = require('mongoose');

const KhungGioSchema = new mongoose.Schema({
  PhongHoc: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PhongHoc',
    required: true
  },
  GioBatDau: {
    type: String, 
    required: true
  },
  GioKetThuc: {
    type: String,  
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('KhungGio', KhungGioSchema);
