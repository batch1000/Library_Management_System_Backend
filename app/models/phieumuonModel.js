const mongoose = require("mongoose");

const PhieuMuonSchema = new mongoose.Schema(
  {
    MaDocGia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocGia",
      required: true,
    },

    // Trạng thái chung của phiếu mượn
    TrangThai: {
      type: String,
      enum: ["pending", "processing", "approved", "overdue", "completed"],
      default: "pending",
    },

    NgayTao: { type: Date, default: Date.now },
    NgayDuyet: { type: Date, default: null },
    NgayHoanThanh: { type: Date, default: null },
  },
  {
    timestamps: true,
    
  }
);

module.exports = mongoose.model("PhieuMuon", PhieuMuonSchema);
