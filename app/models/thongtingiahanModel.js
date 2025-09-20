const mongoose = require('mongoose');

const ThongTinGiaHanSchema = new mongoose.Schema({
    MaThe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TheThuVien',
        required: true
    },
    NgayGiaHan: {
        type: Date,
        default: null
    },
    PhiGiaHan: {
        type: Number,
        required: true,
        min: 0
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('ThongTinGiaHan', ThongTinGiaHanSchema);
