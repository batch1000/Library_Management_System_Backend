const mongoose = require('mongoose');

const DocGiaSchema = new mongoose.Schema({
  MaDocGia: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  HoLot: {
    type: String,
    required: true,
    trim: true
  },
  Ten: {
    type: String,
    required: true,
    trim: true
  },
  NgaySinh: {
    type: Date,
    required: true
  },
  Phai: {
    type: String,
    enum: ['Nam', 'Nữ'],
    required: true
  },
  DiaChi: {
    type: String,
    required: true
  },
  DienThoai: {
    type: String,
    required: true,
    match: /^[0-9]{9,11}$/
  },
  DoiTuong: {
    type: String,
    enum: ['Sinh viên', 'Giảng viên', 'Khách'],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DocGia', DocGiaSchema);