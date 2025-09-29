const mongoose = require('mongoose');

const LuanVanSchema = new mongoose.Schema({
    TieuDeTai: {
        type: String,
        required: true,
        trim: true
    },

    MaDocGia: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DocGia",
        required: true
    },

    BacDaoTao: {
        type: String,
        enum: ["Đại học", "Thạc sĩ", "Tiến sĩ"],
        required: true
    },

    NamBaoVe: {
        type: Number
    },
    
    GiaoVienHuongDan: {
        type: String,
        trim: true
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
        default: null
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('LuanVan', LuanVanSchema);
//NgayNop la NgayDuyet
