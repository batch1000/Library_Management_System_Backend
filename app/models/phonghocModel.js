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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ViTriPhong',
    required: false
  },

  TienIch: {
    type: String,
    trim: true,
    default: ''
  },

  ChoNgoi: {
    type: [
      {
        SoCho: { type: Number, required: true },     // Số thứ tự chỗ (1, 2, 3, ...)
        HangDoc: { type: Number, required: true },   // Hàng dọc (A=1, B=2, C=3, ...)
        HangNgang: { type: Number, required: true }, // Hàng ngang (1, 2, 3, ...)
        TenCho: { type: String, required: true }     // Tên hiển thị (A1, A2, B1, ...)
      }
    ],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PhongHoc', PhongHocSchema);
