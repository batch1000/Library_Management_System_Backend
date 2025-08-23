const mongoose = require('mongoose');

const DanhGiaSachSchema = new mongoose.Schema({
    SoSao: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    BinhLuan: {
        type: String,
        trim: true
    },
    NgayDanhGia: {
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

module.exports = mongoose.model('DanhGiaSach', DanhGiaSachSchema);
