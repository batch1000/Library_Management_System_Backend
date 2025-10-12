const mongoose = require("mongoose");

const SinhVien = require("../../models/sinhvienModel");
const NienKhoa = require("../../models/nienkhoaModel");
const NganhHoc = require("../../models/nganhhocModel");
const Khoa = require("../../models/khoaModel");
const Lop = require("../../models/lopModel");
const DocGia = require("../../models/docgiaModel");
const TheThuVien = require("../../models/thethuvienModel");
const ThongTinGiaHan = require("../../models/thongtingiahanModel");
const ThongTinCapLaiThe = require("../../models/thongtincaplaitheModel");
const QuyDinhThuVien = require("../../models/quydinhthuvienModel");

const notificationService = require("../notification/notification.service");

async function getLibraryCard(MaDocGia) {
  try {
    if (!MaDocGia) throw new Error("Chưa cung cấp MaDocGia");

    // 1. Tìm thẻ thư viện theo DocGia
    const card = await TheThuVien.findOne({ DocGia: MaDocGia }).populate({
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
    const history = await ThongTinGiaHan.find({ MaThe: card._id }).sort({
      NgayGiaHan: -1,
    }); // mới nhất trước

    // Chuẩn hóa dữ liệu giống bên admin
    const extendHistory = history.map((item) => ({
      NgayGiaHan: item.NgayGiaHan,
      PhiGiaHan: item.PhiGiaHan,
    }));

    // 4. Lấy toàn bộ lịch sử cấp lại thẻ
    const reissueHistory = await ThongTinCapLaiThe.find({
      MaThe: card._id,
    }).sort({
      NgayYeuCau: -1,
    });

    // Chuẩn hóa dữ liệu giống bên admin
    const reissueList = reissueHistory.map((item) => ({
      NgayYeuCau: item.NgayYeuCau,
      NgayDuyet: item.NgayDuyet,
      NgayCapLai: item.NgayCapLai,
      PhiCapLai: item.PhiCapLai,
      TrangThai: item.TrangThai,
    }));

    return {
      cardInfo: card || null,
      studentInfo: student || null,
      extendHistory,
      reissueHistory: reissueList,
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
    const info = await ThongTinGiaHan.find()
      .populate({
        path: "MaThe",
        populate: {
          path: "DocGia",
          select: "HoLot Ten DoiTuong",
        },
      })
      .sort({ NgayGiaHan: 1 });

    // Gom nhóm theo thẻ
    const grouped = {};
    for (const item of info) {
      const card = item.MaThe;
      if (!card) continue;

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

      // Luôn thêm lịch sử (kể cả NgayGiaHan = null)
      grouped[card._id].extendHistory.push({
        NgayGiaHan: item.NgayGiaHan,
        PhiGiaHan: item.PhiGiaHan,
      });
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
    ).populate("DocGia");

    if (!updatedCard) {
      throw new Error("Không tìm thấy thẻ thư viện");
    }

    // Cập nhật NgayGiaHan trong ThongTinGiaHan
    const updatedExtendInfo = await ThongTinGiaHan.findOneAndUpdate(
      { MaThe: cardId, NgayGiaHan: null },
      { NgayGiaHan: currentDate },
      { new: true }
    );

    // Tạo thông báo cho độc giả
    if (updatedCard.DocGia) {
      const ngayHetHanMoi = newExpiryDate.toLocaleDateString("vi-VN");

      await notificationService.createNotification({
        DocGia: updatedCard.DocGia._id,
        TieuDe: "Gia hạn thẻ thư viện thành công",
        NoiDung: `Thẻ thư viện của bạn đã được gia hạn thành công. Ngày hết hạn mới: ${ngayHetHanMoi}.`,
        LoaiThongBao: "success",
      });
    }

    return updatedExtendInfo;
  } catch (error) {
    throw error;
  }
}

async function updateAvatar(studentId, imageUrl) {
  try {
    const updated = await SinhVien.findByIdAndUpdate(
      studentId,
      { Avatar: imageUrl },
      { new: true }
    );

    return updated;
  } catch (err) {
    console.error("Lỗi service updateAvatar:", err);
    throw err;
  }
}

async function requestCardReprint(MaThe) {
  try {
    const rule = await QuyDinhThuVien.findOne();
    let reissueFee = 50000;

    if (rule && rule.reissueFee) {
      reissueFee = rule.reissueFee;
    }

    const request = await ThongTinCapLaiThe.create({
      MaThe,
      TrangThai: "pending",
      NgayCapLai: null, // chưa cấp lại
      NgayYeuCau: new Date(),
      PhiCapLai: reissueFee, // nếu muốn, có thể để 0
    });

    return request;
  } catch (err) {
    console.error("Lỗi tạo yêu cầu in lại thẻ:", err);
    throw err;
  }
}

async function getStatusCardReprint(MaThe) {
  try {
    // tìm bản ghi in lại thẻ gần nhất của thẻ này
    const request = await ThongTinCapLaiThe.findOne({ MaThe })
      .sort({ createdAt: -1 }) // lấy bản ghi mới nhất
      .select("TrangThai NgayCapLai PhiCapLai createdAt");

    // nếu chưa có yêu cầu in lại nào
    if (!request) {
      return { TrangThai: "no_request" };
    }

    return request;
  } catch (err) {
    console.error("Lỗi lấy trạng thái in lại thẻ:", err);
    throw err;
  }
}

async function getAllInfoRenewCard() {
  try {
    const info = await ThongTinCapLaiThe.find()
      .populate({
        path: "MaThe",
        populate: {
          path: "DocGia",
          select: "HoLot Ten DoiTuong",
        },
      })
      .sort({ NgayCapLai: -1 });

    // Gom nhóm theo thẻ
    const grouped = {};
    for (const item of info) {
      const card = item.MaThe;
      if (!card) continue;

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
          reissueHistory: [], // lịch sử cấp lại thẻ
        };
      }

      // Luôn thêm lịch sử (kể cả NgayCapLai = null)
      grouped[card._id].reissueHistory.push({
        NgayYeuCau: item.NgayYeuCau,
        NgayDuyet: item.NgayDuyet,
        NgayCapLai: item.NgayCapLai,
        PhiCapLai: item.PhiCapLai,
        TrangThai: item.TrangThai,
      });
    }

    return Object.values(grouped);
  } catch (error) {
    console.error("Lỗi trong service getAllInfoRenewCard:", error);
    throw error;
  }
}

async function approveReissueCard(maThe) {
  try {
    // tìm yêu cầu mới nhất theo MaThe
    const request = await ThongTinCapLaiThe.findOneAndUpdate(
      { MaThe: maThe },
      {
        TrangThai: "approve",
        NgayDuyet: new Date(),
      },
      {
        new: true,
        sort: { createdAt: -1 }, // lấy bản ghi mới nhất
      }
    ).populate({
      path: "MaThe",
      populate: {
        path: "DocGia",
      },
    });

    if (!request) {
      throw new Error("Không tìm thấy yêu cầu cấp lại thẻ");
    }

    if (request.MaThe && request.MaThe.DocGia) {
      await notificationService.createNotification({
        DocGia: request.MaThe.DocGia._id,
        TieuDe: "Yêu cầu làm lại thẻ được duyệt",
        NoiDung: `Yêu cầu làm lại thẻ thư viện của bạn đã được phê duyệt. Vui lòng đến thư viện để nhận thẻ mới.`,
        LoaiThongBao: "success",
      });
    }

    return request;
  } catch (err) {
    console.error("Lỗi duyệt yêu cầu cấp lại thẻ:", err);
    throw err;
  }
}

async function printCard(maThe) {
  try {
    // tìm yêu cầu mới nhất theo MaThe và cập nhật thành printed
    const request = await ThongTinCapLaiThe.findOneAndUpdate(
      { MaThe: maThe, TrangThai: "approve" }, // chỉ in khi đã duyệt
      {
        TrangThai: "printed",
        NgayCapLai: new Date(),
      },
      {
        new: true,
        sort: { createdAt: -1 }, // lấy bản ghi mới nhất
      }
    );

    if (!request) {
      throw new Error("Không tìm thấy yêu cầu in lại thẻ hợp lệ");
    }

    return request;
  } catch (err) {
    console.error("Lỗi in lại thẻ:", err);
    throw err;
  }
}

async function denyReissueCard(maThe) {
  try {
    // tìm yêu cầu mới nhất theo MaThe và cập nhật thành "denied"
    const request = await ThongTinCapLaiThe.findOneAndUpdate(
      { MaThe: maThe },
      {
        TrangThai: "denied",
      },
      {
        new: true,
        sort: { createdAt: -1 }, // lấy bản ghi mới nhất
      }
    ).populate({
      path: 'MaThe',
      populate: {
        path: 'DocGia'
      }
    });

    if (!request) {
      throw new Error("Không tìm thấy yêu cầu cấp lại thẻ");
    }

    // Tạo thông báo cho độc giả
    if (request.MaThe && request.MaThe.DocGia) {
      await notificationService.createNotification({
        DocGia: request.MaThe.DocGia._id,
        TieuDe: 'Yêu cầu làm lại thẻ bị từ chối',
        NoiDung: `Yêu cầu làm lại thẻ thư viện của bạn đã bị từ chối.`,
        LoaiThongBao: 'error',
      });
    }

    return request;
  } catch (err) {
    console.error("Lỗi từ chối yêu cầu cấp lại thẻ:", err);
    throw err;
  }
}

async function getCardRule() {
  try {
    const rule = await QuyDinhThuVien.findOne().sort({ updatedAt: -1 }).exec();
    return rule;
  } catch (error) {
    console.error("Lỗi service: getCardRule", error);
    throw error;
  }
}

async function updateCardRule(ruleUpdates) {
  try {
    const updatedRule = await QuyDinhThuVien.findOneAndUpdate(
      {},
      {
        $set: {
          ...ruleUpdates,
          updatedAt: new Date(),
        },
      },
      {
        new: true, // trả về document sau khi update
        upsert: true, // nếu chưa có thì tạo mới
      }
    );

    return updatedRule;
  } catch (err) {
    console.error("❌ Lỗi service updateCardRule:", err);
    throw err;
  }
}

module.exports = {
  getLibraryCard,
  createLibraryCard,
  getAllInfoExpireCard,
  renewLibraryCard,
  updateAvatar,
  requestCardReprint,
  getStatusCardReprint,
  getAllInfoRenewCard,
  approveReissueCard,
  printCard,
  denyReissueCard,
  getCardRule,
  updateCardRule,
};
