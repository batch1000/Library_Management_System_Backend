const mongoose = require("mongoose");

const SinhVienSchema = new mongoose.Schema(
  {
    MaSinhVien: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    Avatar: {
      type: String,
      required: false,
      trim: true,
    },
    HeDaoTao: {
      type: String,
      enum: ["Chính quy", "Chất lượng cao", "Vừa học vừa làm"],
      required: true,
    },
    MaNienKhoa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NienKhoa",
      required: true,
    },
    MaNganhHoc: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NganhHoc",
      required: true,
    },
    MaDocGia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocGia",
      required: true,
    },
    MaLop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lop",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SinhVien", SinhVienSchema);
