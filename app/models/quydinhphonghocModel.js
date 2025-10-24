const mongoose = require("mongoose");

const quyDinhPhongHocSchema = new mongoose.Schema({
  bookingLeadTime: { type: Number, default: 2 },
  bookingLeadTimeLecturer: { type: Number, default: 7 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QuyDinhPhongHoc", quyDinhPhongHocSchema);
