const mongoose = require('mongoose');

const LopSchema = new mongoose.Schema({
    TenLop: {
        type: String,
        required: true,
        trim: true,
        unique: true 
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lop', LopSchema);
