const mongoose = require("mongoose");

const NhanVienSchema = new mongoose.Schema(
  {
    Msnv: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    HoTenNV: {
      type: String,
      required: true,
      trim: true,
    },
    Username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    Password: {
      type: String,
      required: true,
    },
    ChucVu: {
      type: String,
      required: true,
      trim: true,
    },
    DiaChi: {
      type: String,
      required: true,
      trim: true,
    },
    SoDienThoai: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NhanVien", NhanVienSchema);
