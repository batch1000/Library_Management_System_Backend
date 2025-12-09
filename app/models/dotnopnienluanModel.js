const mongoose = require("mongoose");

const DotNopNienLuanSchema = new mongoose.Schema(
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

    SoLuongPhaiNop: {
      type: Number,
      required: true,
      min: 0,
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

    MaGiangVien: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocGia", // Giảng viên tạo đợt
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DotNopNienLuan", DotNopNienLuanSchema);
