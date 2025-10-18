const mongoose = require("mongoose");

const libraryRuleSchema = new mongoose.Schema(
  {
    renewalFee: {
      type: Number,
      required: true,
      default: 25000, // phí gia hạn
    },
    reissueFee: {
      type: Number,
      required: true,
      default: 50000, // phí cấp lại thẻ
    },
    printWaitingDays: {
      type: Number,
      required: true,
      default: 3, // số ngày chờ in thẻ nếu như không đến in
    },
    cardValidityDays: {
      type: Number,
      required: true,
      default: 365, // số ngày thẻ có hiệu lực (mặc định 1 năm)
    },

    renewalFeeLecturer: {
      type: Number,
      required: true,
      default: 0, // miễn phí gia hạn
    },
    reissueFeeLecturer: {
      type: Number,
      required: true,
      default: 50000, // ưu ái hơn sinh viên
    },
    printWaitingDaysLecturer: {
      type: Number,
      required: true,
      default: 7, // số ngày chờ in thẻ nếu như không đến in
    },
    cardValidityDaysLecturer: {
      type: Number,
      required: true,
      default: 730, // 2 năm
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("QuyDinhThuVien", libraryRuleSchema);
