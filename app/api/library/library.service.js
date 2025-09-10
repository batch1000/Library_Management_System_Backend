const mongoose = require("mongoose");

const SinhVien = require("../../models/sinhvienModel");
const NienKhoa = require("../../models/nienkhoaModel");
const NganhHoc = require("../../models/nganhhocModel");
const Khoa = require("../../models/khoaModel");
const Lop = require("../../models/lopModel");
const DocGia = require("../../models/docgiaModel");
const TheThuVien = require("../../models/thethuvienModel");
const ThongTinGiaHan = require("../../models/thongtingiahanModel");

async function getLibraryCard(MaDocGia) {
  try {
    if (!MaDocGia) throw new Error("Chưa cung cấp MaDocGia");

    // 1. Tìm thẻ thư viện theo DocGia
    const card = await TheThuVien.findOne({ DocGia: MaDocGia })
      .populate({
        path: "DocGia",
        select: "HoTen CMND",
      });

    if (!card) {
      return { message: "Không tìm thấy thẻ thư viện" };
    }

    // 2. Tìm thông tin sinh viên
    const student = await SinhVien.findOne({ MaDocGia: MaDocGia })
      .populate("MaLop", "TenLop")
      .populate({
        path: "MaNganhHoc",
        select: "TenNganh Khoa",
        populate: {
          path: "Khoa",
          select: "TenKhoa",
        },
      })
      .populate("MaNienKhoa", "TenNienKhoa");

    // 3. Lấy toàn bộ lịch sử gia hạn của thẻ
    const history = await ThongTinGiaHan.find({ MaThe: card._id })
      .sort({ NgayGiaHan: -1 }); // mới nhất trước

    // Chuẩn hóa dữ liệu giống bên admin
    const extendHistory = history.map((item) => ({
      NgayGiaHan: item.NgayGiaHan,
      PhiGiaHan: item.PhiGiaHan,
    }));

    return {
      cardInfo: card || null,
      studentInfo: student || null,
      extendHistory, // luôn trả về mảng (có thể rỗng nếu chưa gia hạn lần nào)
    };
  } catch (error) {
    console.error("Lỗi trong service getLibraryCard:", error);
    throw error;
  }
}

async function createLibraryCard(DocGiaId) {
  try {
    if (!DocGiaId) throw new Error("Chưa cung cấp DocGiaId");

    // 1. Kiểm tra DocGia có tồn tại không
    const docGia = await DocGia.findById(DocGiaId);
    if (!docGia) {
      throw new Error(`Không tìm thấy độc giả với _id = ${DocGiaId}`);
    }

    // 2. Kiểm tra độc giả đã có thẻ chưa
    const existingCard = await TheThuVien.findOne({ DocGia: docGia._id });
    if (existingCard) {
      return { message: "Độc giả này đã có thẻ thư viện", card: existingCard };
    }

    // 3. Sinh MaThe từ MaDocGia trong schema
    const maDocGiaStr = docGia.MaDocGia; // ví dụ: "DG0001"
    const match = maDocGiaStr.match(/\d+$/);
    if (!match) throw new Error("MaDocGia không hợp lệ, không có số cuối");
    const numberPart = match[0]; // VD: "0001"
    const MaThe = `LC${numberPart}`;

    // 4. Xác định ngày cấp & ngày hết hạn (VD: 1 năm sau)
    const ngayCap = new Date();
    const ngayHetHan = new Date(ngayCap);
    ngayHetHan.setFullYear(ngayCap.getFullYear() + 1);

    // 5. Tạo thẻ
    const newCard = await TheThuVien.create({
      MaThe,
      DocGia: docGia._id,
      NgayCap: ngayCap,
      NgayHetHan: ngayHetHan,
      TrangThai: "Hoạt động",
    });

    return newCard;
  } catch (error) {
    console.error("Lỗi khi tạo thẻ thư viện:", error);
    throw error;
  }
}

async function getAllInfoExpireCard() {
  try {
    const today = new Date();

    const info = await ThongTinGiaHan.find()
      .populate({
        path: "MaThe",
        populate: {
          path: "DocGia",
          select: "HoLot Ten DoiTuong",
        },
      })
      .sort({ NgayGiaHan: 1 });

    const grouped = {};
    for (const item of info) {
      const card = item.MaThe;
      if (!card) continue;

      if (card.NgayHetHan < today || card.TrangThai === "Hết hạn") {
        if (!grouped[card._id]) {
          let student = null;
          if (card.DocGia && card.DocGia._id) {
            student = await SinhVien.findOne({ MaDocGia: card.DocGia._id })
              .populate("MaLop", "TenLop")
              .populate({
                path: "MaNganhHoc",
                select: "TenNganh Khoa",
                populate: { path: "Khoa", select: "TenKhoa" },
              })
              .populate("MaNienKhoa", "TenNienKhoa");
          }

          grouped[card._id] = {
            cardInfo: card,
            studentInfo: student,
            extendHistory: [],
          };
        }

        // ✅ Luôn thêm vào lịch sử (kể cả khi NgayGiaHan = null)
        grouped[card._id].extendHistory.push({
          NgayGiaHan: item.NgayGiaHan, // có thể null
          PhiGiaHan: item.PhiGiaHan,
        });
      }
    }

    return Object.values(grouped);
  } catch (error) {
    console.error("Lỗi trong service getAllInfoExpireCard:", error);
    throw error;
  }
}

async function renewLibraryCard(cardId) {
  try {
    const currentDate = new Date();
    // Tính ngày hết hạn mới (gia hạn 1 năm)
    const newExpiryDate = new Date(currentDate);
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

    // Cập nhật thông tin thẻ thư viện
    const updatedCard = await TheThuVien.findByIdAndUpdate(
      cardId,
      {
        TrangThai: "Hoạt động",
        NgayCap: currentDate,
        NgayHetHan: newExpiryDate,
        NgayKiemTraHetHan: null, // Reset ngày kiểm tra hết hạn
      },
      { new: true }
    );

    if (!updatedCard) {
      throw new Error("Không tìm thấy thẻ thư viện");
    }

    // Cập nhật NgayGiaHan trong ThongTinGiaHan
    const updatedExtendInfo = await ThongTinGiaHan.findOneAndUpdate(
      { MaThe: cardId, NgayGiaHan: null },
      { NgayGiaHan: currentDate },
      { new: true }
    );

    return updatedExtendInfo;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getLibraryCard,
  createLibraryCard,
  getAllInfoExpireCard,
  renewLibraryCard,
};
