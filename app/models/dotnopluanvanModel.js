const mongoose = require("mongoose");

const DotNopLuanVanSchema = new mongoose.Schema(
  {
    TenDot: {
      type: String,
      required: true,
      trim: true,
    },

    ThoiGianMoNop: {
      type: Date,
      required: true,
    },

    ThoiGianDongNop: {
      type: Date,
      required: true,
    },

    TrangThai: {
      type: String,
      enum: ["Đang mở", "Đã đóng", "Chưa mở"],
      default: "Chưa mở",
    },

    KyHoc: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KyHoc",
      required: true,
    },

    NamHoc: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NamHoc",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DotNopLuanVan", DotNopLuanVanSchema);
