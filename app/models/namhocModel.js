const mongoose = require('mongoose');

const NamHocSchema = new mongoose.Schema({
    TenNamHoc: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('NamHoc', NamHocSchema);
