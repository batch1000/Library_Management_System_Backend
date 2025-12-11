const mongoose = require("mongoose");

const ShelfSchema = new mongoose.Schema(
  {
    MaDocGia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocGia",
      required: true,
      unique: true,
    },

    DanhSachSach: [
      {
        MaSach: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Sach",
          required: true,
        },
        NgayThem: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("TuSach", ShelfSchema);