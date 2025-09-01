const mongoose = require('mongoose');

const TheoDoiMuonSachSchema = new mongoose.Schema({
  SoLuong: {
    type: Number,
    required: true,
  },

  NgayMuon: {
    type: Date,
    required: false,
    default: null
  },

  NgayTra: {
    type: Date,
    required: false,
    default: null
  },

  NgayGhiNhanTra: {  
    type: Date,
    required: false,
    default: null
  },
  
  DaGiaHan: {
    type: Boolean,
    default: false
  },
  
  TrangThai: {
    type: String,
    enum: [
      'pending',    // Chờ duyệt
      'approved',   // Đã duyệt
      'denied',     // Bị từ chối
      'returned',   // Đã trả
      'overdue'     // Quá hạn
    ],
    default: 'pending'
  },

  TinhTrangSach: {
    type: String,
    default: ''
  },
  
  NgayCapNhatTinhTrangSach: { 
    type: Date, 
    default: null 
  },

  PhiBoiThuong: {
    type: Number,
    default: 0
  },

  PhiQuaHan: {
    type: Number,
    default: 0
  },

  NgayGhiNhanQuaHan: {
    type: Date,
    default: null
  }, 
  
  DaThanhToan: {
    type: Boolean,
    default: false
  },

  MaSach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sach',
    required: true
  },

  MaDocGia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocGia',
    required: true
  },

  Msnv: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NhanVien',
    required: false,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TheoDoiMuonSach', TheoDoiMuonSachSchema);
