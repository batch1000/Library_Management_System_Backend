const mongoose = require('mongoose');

const NienLuanSchema = new mongoose.Schema({
    TenDeTai: {
        type: String,
        required: true,
        trim: true
    },

    MaDocGia: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DocGia",
        required: true
    },

    Pdf: {
        type: String,
        required: true,
        trim: true
    },

    Image: {
        type: String,
        trim: true
    },

    TrangThai: {
        type: String,
        enum: ["Chờ duyệt", "Đã duyệt", "Từ chối"],
        default: "Chờ duyệt"
    },

    NgayNop: {
        type: Date,
        default: Date.now
    },

    MaDotNop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DotNopNienLuan",
        required: true
    },

}, { timestamps: true });

module.exports = mongoose.model('NienLuan', NienLuanSchema);
