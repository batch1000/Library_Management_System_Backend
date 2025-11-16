const mongoose = require("mongoose");

const quyDinhPhongHocSchema = new mongoose.Schema({
  bookingLeadTime: { type: Number, default: 2 },
  bookingLeadTimeLecturer: { type: Number, default: 7 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QuyDinhPhongHoc", quyDinhPhongHocSchema);

//bookingLeadTime là thời gian đặt trước (ví dụ bookingLeadTime là 3, mà ngày hôm nay là 10/11/2025 đi thì sẽ chỉ đặt phòng đc ở ngày 11/11, 12/11, 13/11
