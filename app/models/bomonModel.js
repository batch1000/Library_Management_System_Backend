const mongoose = require("mongoose");

const BoMonSchema = new mongoose.Schema(
  {
    TenBoMon: {
      type: String,
      required: true,
      trim: true,
    },
    MaKhoa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Khoa",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BoMon", BoMonSchema);
