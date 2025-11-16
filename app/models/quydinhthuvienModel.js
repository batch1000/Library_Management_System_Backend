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
      default: 3, // số ngày chờ in thẻ nếu như không đến in sẽ bị huỷ in
    },
    cardValidityDays: {
      type: Number,
      required: true,
      default: 365, // số ngày thẻ có hiệu lực (mặc định 1 năm)
    },

    renewalFeeLecturer: {
      type: Number,
      required: true,
      default: 0, // miễn phí gia hạn cho giảng viên
    },
    reissueFeeLecturer: {
      type: Number,
      required: true,
      default: 50000, // phí cấp lại thẻ cho giảng viên
    },
    printWaitingDaysLecturer: {
      type: Number,
      required: true,
      default: 7, // số ngày chờ in thẻ nếu như không đến in sẽ bị huỷ in đối với giảng viên
    },
    cardValidityDaysLecturer: {
      type: Number,
      required: true,
      default: 730, // số ngày thẻ có hiệu lực (mặc định 2 năm) đối với giảng viên
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("QuyDinhThuVien", libraryRuleSchema);
