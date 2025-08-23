const mongoose = require('mongoose');

const SachSchema = new mongoose.Schema({
    MaSach: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    TenSach: {
        type: String,
        required: true,
        trim: true
    },
    DonGia: {
        type: Number,
        required: true,
        min: 0
    },
    SoQuyen: {
        type: Number,
        required: true,
        min: 0
    },
    NamXuatBan: {
        type: Number,
        required: true
    },
    TacGia: {
        type: String,
        required: true,
        trim: true
    },
    Image: {
        type: String,
        required: true,
        trim: true
    },
    MoTaSach: {
        type: String,
        required: true,
        trim: true
    },
    MaNXB: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NhaXuatBan',
        required: true
    },
    MaTheLoai: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TheLoaiSach',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Sach', SachSchema);
