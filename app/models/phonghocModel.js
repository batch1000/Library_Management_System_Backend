const mongoose = require('mongoose');

const PhongHocSchema = new mongoose.Schema({
  MaPhong: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  TenPhong: {
    type: String,
    required: true,
    trim: true
  },
  LoaiPhong: {
    type: String,
    enum: ['Nhóm', 'Cá nhân'],
    required: true
  },
  SucChua: {
    type: Number,
    required: true
  },
  ViTri: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PhongHoc', PhongHocSchema);
