const bcrypt = require('bcryptjs');

const TaiKhoan = require('../../models/taikhoanModel');
const DocGia = require('../../models/docgiaModel');
const NhanVien = require('../../models/nhanvienModel');

async function login(data) {
  const { username, password } = data;

  let user = await TaiKhoan.findOne({ username }).populate('MaDocGia');
  if (user) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return {
      _id: user.MaDocGia._id,
      role: "User",
      hoTen: `${user.MaDocGia.HoLot} ${user.MaDocGia.Ten}`
    };
  }

  const nv = await NhanVien.findOne({ Username: username });
  if (nv) {
    const isMatch = await bcrypt.compare(password, nv.Password);
    if (!isMatch) return null;

    return {
      _id: nv._id,
      role: "Admin",
      hoTen: nv.HoTenNV
    };
  }

  return null;
}


async function generateMaDocGia() {
  const latestDocGia = await DocGia.findOne().sort({ createdAt: -1 }).exec();
  let nextNumber = 1;

  if (latestDocGia && latestDocGia.MaDocGia) {
    const match = latestDocGia.MaDocGia.match(/DG(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return nextNumber < 10000
    ? `DG${nextNumber.toString().padStart(4, '0')}` 
    : `DG${nextNumber}`;
}

async function signup(data) {
  try {
    const maDocGia = await generateMaDocGia();

    const docGia = new DocGia({
      MaDocGia: maDocGia,
      HoLot: data.HoLot,
      Ten: data.Ten,
      NgaySinh: data.NgaySinh,
      Phai: data.Phai,
      DiaChi: data.DiaChi,
      DienThoai: data.DienThoai
    });

    const savedDocGia = await docGia.save();

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const taiKhoan = new TaiKhoan({
      username: data.username,
      password: hashedPassword,
      MaDocGia: savedDocGia._id
    });

    const savedTaiKhoan = await taiKhoan.save();

    return savedTaiKhoan;
  } catch (err) {
    console.error("Error signup service:", err.message);
    throw err;
  }
}

module.exports = { login, signup };
