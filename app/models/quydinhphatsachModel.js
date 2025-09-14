const mongoose = require("mongoose");

const quyDinhPhatSachSchema = new mongoose.Schema({
  coefLost: { type: Number, default: 1.3 }, // Hệ số mất sách
  feeManage: { type: Number, default: 50000 }, // Phụ phí quản lý
  coefDamageLight: { type: Number, default: 20 }, // % hư nhẹ
  feeLate: { type: Number, default: 5000 }, // phí quá hạn
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QuyDinhPhatSach", quyDinhPhatSachSchema);
