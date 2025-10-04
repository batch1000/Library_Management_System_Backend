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
      default: 3, // số ngày chờ in thẻ
    },
    cardValidityDays: {
      type: Number,
      required: true,
      default: 365, // số ngày thẻ có hiệu lực (mặc định 1 năm)
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("QuyDinhThuVien", libraryRuleSchema);