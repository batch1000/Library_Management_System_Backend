const bcrypt = require('bcryptjs');

const TaiKhoan = require('../../models/taikhoanModel');
const DocGia = require('../../models/docgiaModel');
const NhanVien = require('../../models/nhanvienModel');
const TheoDoiMuonSach = require('../../models/theodoimuonsachModel');
const TheThuVien = require('../../models/thethuvienModel');

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

async function login(data) {
  const { username, password } = data;

  let user = await TaiKhoan.findOne({ username }).populate('MaDocGia');
  if (user) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    // Lấy thẻ thư viện
    const card = await TheThuVien.findOne({ DocGia: user.MaDocGia._id });

    return {
      _id: user.MaDocGia._id,
      role: "User",
      userType: user.MaDocGia.DoiTuong,
      hoTen: `${user.MaDocGia.HoLot} ${user.MaDocGia.Ten}`,
      cardStatus: card.TrangThai || null,
    };
  }

  const nv = await NhanVien.findOne({ Username: username });
  if (nv) {
    const isMatch = await bcrypt.compare(password, nv.Password);
    if (!isMatch) return null;

    return {
      _id: nv._id,
      role: nv.ChucVu === "Thủ Thư" ? "Admin" : nv.ChucVu === "Quản Lý" ? "Manager" : "Staff",
      hoTen: nv.HoTenNV
    };
  }

  return null;
}

async function updateStatusAccount(data) {
  const { maDocGia } = data; // nhận vào id độc giả

  // Lấy tất cả bản ghi mượn sách của độc giả
  const records = await TheoDoiMuonSach.find({ MaDocGia: maDocGia });

  // Kiểm tra xem còn nợ phí hay không
  let conNo = records.some(r => {
    const tongPhi = (r.PhiQuaHan || 0) + (r.PhiBoiThuong || 0);
    return !r.DaThanhToan && tongPhi > 0;
  });

  const newStatus = conNo ? 'suspended' : 'active';

  // Cập nhật status của tài khoản
  const updated = await TaiKhoan.findOneAndUpdate(
    { MaDocGia: maDocGia },
    { status: newStatus },
    { new: true }
  ).populate('MaDocGia');

  if (!updated) {
    throw new Error("Không tìm thấy tài khoản để cập nhật");
  }

  return updated;
}


module.exports = { login, signup, updateStatusAccount };
