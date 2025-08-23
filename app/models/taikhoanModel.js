const mongoose = require('mongoose');

const TaiKhoanSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    MaDocGia: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocGia',
        required: true,
        unique: true
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('TaiKhoan', TaiKhoanSchema);
