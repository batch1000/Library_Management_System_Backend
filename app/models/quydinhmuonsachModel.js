const mongoose = require("mongoose");

const quyDinhMuonSachSchema = new mongoose.Schema({
  maxBooks: { type: Number, default: 6 }, // Số sách được mượn tối đa
  maxBooksPerDay: { type: Number, default: 3 }, // Số sách được mượn tối đa trong ngày
  borrowDuration: { type: Number, default: 7 }, // Số ngày mượn tối đa (mặc định 7 ngày)
  pickupDeadline: { type: Number, default: 3 }, // Hạn nhận sách (số ngày kể từ lúc duyệt yêu cầu)
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QuyDinhMuonSach", quyDinhMuonSachSchema);
