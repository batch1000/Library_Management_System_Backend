const mongoose = require('mongoose');

const TheThuVienSchema = new mongoose.Schema({
    MaThe: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    DocGia: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocGia',
        required: true,
        unique: true  
    },
    NgayCap: {
        type: Date,
        required: true,
        default: Date.now
    },
    NgayHetHan: {
        type: Date,
        required: true
    },
    TrangThai: {
        type: String,
        enum: ['Hoạt động', 'Hết hạn', 'Bị khóa'],
        default: 'Hoạt động'
    },
    NgayKiemTraHetHan: { 
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TheThuVien', TheThuVienSchema);
