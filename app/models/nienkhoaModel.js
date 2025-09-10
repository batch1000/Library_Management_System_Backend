const mongoose = require('mongoose');

const NienKhoaSchema = new mongoose.Schema({
    TenNienKhoa: {
        type: String,
        required: true,
        trim: true
    },
    NamBatDau: {
        type: Number,
        required: true,
        min: 1900 
    },
    NamKetThuc: {
        type: Number,
        required: true,
        validate: {
            validator: function (value) {
                return value > this.NamBatDau;
            },
            message: 'Năm kết thúc phải lớn hơn năm bắt đầu'
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('NienKhoa', NienKhoaSchema);
