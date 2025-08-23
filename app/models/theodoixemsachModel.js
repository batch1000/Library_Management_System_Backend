const mongoose = require('mongoose');

const TheoDoiXemSachSchema = new mongoose.Schema({
    ThoiDiemXem: {
        type: Date,
        required: true,
        default: Date.now
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TheoDoiXemSach', TheoDoiXemSachSchema);
