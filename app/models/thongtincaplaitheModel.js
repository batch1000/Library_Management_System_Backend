const mongoose = require('mongoose');

const ThongTinCapLaiTheSchema = new mongoose.Schema({
    MaThe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TheThuVien',
        required: true
    },
    NgayYeuCau: {
        type: Date
    },
    NgayDuyet: {
        type: Date
    },
    PhiCapLai: {
        type: Number,
        required: true,
        min: 0
    },
    NgayCapLai: {
        type: Date
    },
    TrangThai: {
        type: String,
        enum: ['pending', 'approve', 'denied', 'printed'],
        default: 'pending'
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('ThongTinCapLaiThe', ThongTinCapLaiTheSchema);
