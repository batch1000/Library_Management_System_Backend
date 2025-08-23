const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/booklend', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Kết nối MongoDB thành công");
    } catch (err) {
        console.error("Lỗi kết nối MongoDB:", err.message);
    }
};

module.exports = connectDB;
