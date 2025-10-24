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

  NgayDuyet: {
    type: Date,
    default: null
  },

  GioBatDau: {
    type: String,
    required: true
  },

  GioKetThuc: {
    type: String,
    required: true
  },

  TrangThai: {
    type: String,
    enum: [
      'waiting_members',
      'pending',    // Chờ duyệt
      'approved',   // Đã duyệt
      'denied',     // Bị từ chối
      'canceled',    // Người dùng hủy
      'checked_in',  // Đã nhận phòng
      'no_show'      // Không nhận phòng
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
  //Phòng nhóm
  ThanhVien: [
    {
      DocGia: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocGia'
      },
      TrangThai: {
        type: String,
        enum: ['invited', 'accepted', 'declined'],
        default: 'invited'
      }
    }
  ],

  ChoNgoiDaChon: {
    type: [Number], // Mảng số chỗ đã chọn [1, 2, 3]
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TheoDoiDatPhong', TheoDoiDatPhongSchema);
