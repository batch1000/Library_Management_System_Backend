const mongoose = require("mongoose");

const GiangVienSchema = new mongoose.Schema(
  {
    MaCanBo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    Avatar: {
      type: String,
      trim: true,
    },
    HocVi: {
      type: String,
      enum: ["Thạc sĩ", "Tiến sĩ", "Phó giáo sư", "Giáo sư"],
      required: true,
    },
    MaBoMon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BoMon",
      required: false,
    },
    MaDocGia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocGia",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GiangVien", GiangVienSchema);
