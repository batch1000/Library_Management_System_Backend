// const BaoCaoThongKeModel = require("./app/models/docgiaModel");
// const TaiKhoan = require("./app/models/docgiaModel");
// const NhanVien = require("./app/models/nhanvienModel");
// const ThongBaoDocGia = require("./app/models/thongbaodocgiaModel");
const BoMon = require("./app/models/bomonModel");
const DanhGiaSach = require("./app/models/danhgiasachModel");
const DocGia = require("./app/models/docgiaModel");
const DotNopLuanVan = require("./app/models/dotnopluanvanModel");
const DotNopNienLuan = require("./app/models/dotnopnienluanModel");
const GiangVien = require("./app/models/giangvienModel");
const Khoa = require("./app/models/khoaModel");
const KyHoc = require("./app/models/kyhocModel");
const Lop = require("./app/models/lopModel");
const LuanVan = require("./app/models/luanvanModel");
const NamHoc = require("./app/models/namhocModel");
const NganhHoc = require("./app/models/nganhhocModel");
const NhaXuatBan = require("./app/models/nhaxuatbanModel");
const NienKhoa = require("./app/models/nienkhoaModel");
const NienLuan = require("./app/models/nienluanModel");
const PhongHoc = require("./app/models/phonghocModel");
const QuyDinhMuonSach = require("./app/models/quydinhmuonsachModel");
const QuyDinhPhatSach = require("./app/models/quydinhphatsachModel");
const QuyDinhPhongHoc = require("./app/models/quydinhphonghocModel");
const QuyDinhThuVien = require("./app/models/quydinhthuvienModel");
const Sach = require("./app/models/sachModel");
const SinhVien = require("./app/models/sinhvienModel");
const TheLoaiSach = require("./app/models/theloaisachModel");
const TheoDoiMuonPhong = require("./app/models/theodoimuonphongModel");
const TheoDoiMuonSach = require("./app/models/theodoimuonsachModel");
const TheoDoiXemSach = require("./app/models/theodoixemsachModel");
const TheThuVienModel = require("./app/models/thethuvienModel");
const ThongTinCapLaiThe = require("./app/models/thongtincaplaitheModel");
const ThongTinGiaHan = require("./app/models/thongtingiahanModel");
const ViTriPhong = require("./app/models/vitriphongModel");
const YeuThichSach = require("./app/models/yeuthichsachModel");

async function sendDatabaseToChatBot() {
  const collections = {
    BoMon,
    DanhGiaSach,
    DocGia,
    DotNopLuanVan,
    DotNopNienLuan,
    GiangVien,
    Khoa,
    KyHoc,
    Lop,
    LuanVan,
    NamHoc,
    NganhHoc,
    NhaXuatBan,
    NienKhoa,
    NienLuan,
    PhongHoc,
    QuyDinhMuonSach,
    QuyDinhPhatSach,
    QuyDinhPhongHoc,
    QuyDinhThuVien,
    Sach,
    SinhVien,
    TheLoaiSach,
    TheoDoiMuonPhong,
    TheoDoiMuonSach,
    TheoDoiXemSach,
    TheThuVienModel,
    ThongTinCapLaiThe,
    ThongTinGiaHan,
    ViTriPhong,
    YeuThichSach,
  };

  const allData = {};

  for (const [name, model] of Object.entries(collections)) {
    try {
      allData[name] = await model.find({}).lean();
    } catch (err) {
      console.error(`❌ Lỗi khi lấy dữ liệu ${name}:`, err.message);
    }
  }

  return allData;
}

module.exports = {
    sendDatabaseToChatBot
};
