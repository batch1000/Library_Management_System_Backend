const mongoose = require('mongoose');

const KyHocSchema = new mongoose.Schema({
    TenKyHoc: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('KyHoc', KyHocSchema);
