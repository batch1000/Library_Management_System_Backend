const mongoose = require('mongoose');

const YeuThichSachSchema = new mongoose.Schema({
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
    NgayThem: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('YeuThichSach', YeuThichSachSchema);