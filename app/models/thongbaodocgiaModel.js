const mongoose = require("mongoose");

const ThongBaoDocGiaSchema = new mongoose.Schema(
  {
    DocGia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocGia", 
      required: true,
    },
    TieuDe: {
      type: String,
      required: true,
      trim: true,
    },
    NoiDung: {
      type: String,
      required: true,
      trim: true,
    },
    DaDoc: {
      type: Boolean,
      default: false,
    },
    LoaiThongBao: {
      type: String,
      enum: ["success", "warning", "error", "info"],
      default: "Khác",
    },
  },
  {
    timestamps: true, // tự tạo createdAt và updatedAt
  }
);

module.exports = mongoose.model("ThongBaoDocGia", ThongBaoDocGiaSchema);
