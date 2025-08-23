const mongoose = require('mongoose');

const TheLoaiSachSchema = new mongoose.Schema({
    TenTheLoai: {
        type: String,
        required: true,
        trim: true,
        unique: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TheLoaiSach', TheLoaiSachSchema);
