const mongoose = require('mongoose');

const NhaXuatBanSchema = new mongoose.Schema({
    MaNXB: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    TenNXB: {
        type: String,
        required: true,
        trim: true
    },
    DiaChi: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('NhaXuatBan', NhaXuatBanSchema);