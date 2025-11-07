const mongoose = require("mongoose");

const BaoCaoThongKeSchema = new mongoose.Schema(
  {
    TieuDe: {
      type: String,
      required: true,
      trim: true,
    },
    NguoiNop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NhanVien",
      required: true,
    },
    TrangThai: {
      type: String,
      enum: ["Đã nộp"],
      default: "Đã nộp",
    },
    LoaiBaoCao: {
      type: String,
      enum: ["Ngày", "Tuần", "Tháng", "Quý", "Năm"],
      required: true,
    },
    TepDinhKem: {
      type: String, // có thể lưu URL file báo cáo (PDF, Excel, v.v.)
      default: "",
    },
  },
  {
    timestamps: true, // tự động thêm createdAt, updatedAt
  }
);

module.exports = mongoose.model("BaoCaoThongKe", BaoCaoThongKeSchema);
