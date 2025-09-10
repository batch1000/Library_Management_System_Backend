const mongoose = require('mongoose');

const ThongTinCapLaiTheSchema = new mongoose.Schema({
    MaThe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TheThuVien',
        required: true
    },
    PhiCapLai: {
        type: Number,
        required: true,
        min: 0
    },
    NgayCapLai: {
        type: Date
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('ThongTinCapLaiThe', ThongTinCapLaiTheSchema);
