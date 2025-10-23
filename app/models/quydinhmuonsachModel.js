const mongoose = require("mongoose");

const quyDinhMuonSachSchema = new mongoose.Schema({
  maxBooks: { type: Number, default: 6 }, // Số sách được mượn tối đa
  maxBooksPerDay: { type: Number, default: 3 }, // Số sách được mượn tối đa trong ngày
  borrowDuration: { type: Number, default: 7 }, // Số ngày mượn tối đa (mặc định 7 ngày)
  pickupDeadline: { type: Number, default: 3 }, // Hạn nhận sách (số ngày kể từ lúc duyệt yêu cầu)
  renewalDuration: { type: Number, default: 3 }, // Số ngày gia hạn

  maxBooksLecturer: { type: Number, default: 10 }, // Số sách được mượn tối đa
  maxBooksPerDayLecturer: { type: Number, default: 5 }, // Số sách được mượn tối đa trong ngày
  borrowDurationLecturer: { type: Number, default: 14 }, // Số ngày mượn tối đa
  pickupDeadlineLecturer: { type: Number, default: 5 }, // Hạn nhận sách
  renewalDurationLecturer: { type: Number, default: 5 }, // Số ngày gia hạn
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QuyDinhMuonSach", quyDinhMuonSachSchema);
