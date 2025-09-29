const mongoose = require('mongoose');

const TheoDoiDatPhongSchema = new mongoose.Schema({
  NgayDat: {
    type: Date,
    default: Date.now
  },

  NgaySuDung: {
    type: Date,
    required: true
  },

  KhungGioBatDau: {
    type: String,
    required: true
  },

  KhungGioKetThuc: {
    type: String,
    required: true
  },

  TrangThai: {
    type: String,
    enum: [
      'pending',    // Chờ duyệt
      'approved',   // Đã duyệt
      'denied',     // Bị từ chối
      'canceled'    // Người dùng hủy
    ],
    default: 'pending'
  },

  PhongHoc: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PhongHoc',
    required: true
  },

  DocGia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocGia',
    required: true
  },

  NhanVien: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NhanVien',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TheoDoiDatPhong', TheoDoiDatPhongSchema);
