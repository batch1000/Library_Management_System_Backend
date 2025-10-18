const mongoose = require("mongoose");
const fs = require("fs");
const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");

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
const GiangVien = require("../../models/giangvienModel");
const BoMon = require("../../models/bomonModel");
const TaiKhoan = require("../../models/taikhoanModel");

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
    let student = await SinhVien.findOne({ MaDocGia: MaDocGia })
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

    let lecturer = null;
    if (!student) {
      // Nếu không phải sinh viên thì tìm giảng viên
      lecturer = await GiangVien.findOne({ MaDocGia: MaDocGia }).populate({
        path: "MaBoMon",
        select: "TenBoMon MaKhoa",
        populate: {
          path: "MaKhoa",
          select: "TenKhoa",
        },
      });
    }

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
      studentInfo: student || lecturer || null,
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

    // 4. Lấy quy định thư viện hiện tại (chỉ nên có 1 bản ghi)
    const rule = await QuyDinhThuVien.findOne();
    if (!rule) {
      throw new Error("Chưa thiết lập quy định thư viện trong hệ thống");
    }

    // 5. Xác định ngày cấp & ngày hết hạn dựa theo số ngày hiệu lực trong quy định
    const ngayCap = new Date();
    const ngayHetHan = new Date(ngayCap);

    let soNgayHieuLuc;
    if (docGia.DoiTuong === "Giảng viên") {
      soNgayHieuLuc = rule.cardValidityDaysLecturer;
    } else if (docGia.DoiTuong === "Sinh viên") {
      soNgayHieuLuc = rule.cardValidityDays;
    } else {
      soNgayHieuLuc = 30;
    }

    ngayHetHan.setDate(ngayCap.getDate() + soNgayHieuLuc);

    // 6. Tạo thẻ
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

    const grouped = {};
    for (const item of info) {
      const card = item.MaThe;
      if (!card) continue;

      if (!grouped[card._id]) {
        let additionalInfo = null;

        if (card.DocGia && card.DocGia._id) {
          if (card.DocGia.DoiTuong === "Sinh viên") {
            additionalInfo = await SinhVien.findOne({
              MaDocGia: card.DocGia._id,
            })
              .populate("MaLop", "TenLop")
              .populate({
                path: "MaNganhHoc",
                select: "TenNganh Khoa",
                populate: { path: "Khoa", select: "TenKhoa" },
              })
              .populate("MaNienKhoa", "TenNienKhoa");
          } else if (card.DocGia.DoiTuong === "Giảng viên") {
            additionalInfo = await GiangVien.findOne({
              MaDocGia: card.DocGia._id,
            }).populate({
              path: "MaBoMon",
              select: "TenBoMon MaKhoa",
              populate: { path: "MaKhoa", select: "TenKhoa" },
            });
          }
        }

        grouped[card._id] = {
          cardInfo: card,
          studentInfo: additionalInfo,
          extendHistory: [],
        };
      }

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
    // Lấy quy định hiện tại
    const quyDinh = await QuyDinhThuVien.findOne({});
    if (!quyDinh) throw new Error("Chưa có quy định thư viện");

    // Lấy thông tin thẻ và độc giả
    const card = await TheThuVien.findById(cardId).populate("DocGia");
    if (!card || !card.DocGia)
      throw new Error("Không tìm thấy thẻ hoặc độc giả");

    // Xác định số ngày hiệu lực theo đối tượng
    let validityDays;
    if (card.DocGia.DoiTuong === "Giảng viên") {
      validityDays = quyDinh.cardValidityDaysLecturer;
    } else {
      validityDays = quyDinh.cardValidityDays;
    }

    // Tính ngày hết hạn mới
    const newExpiryDate = new Date(currentDate);
    newExpiryDate.setDate(newExpiryDate.getDate() + validityDays);

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
    // 1️⃣ Thử cập nhật trong SinhVien trước
    let updated = await SinhVien.findByIdAndUpdate(
      studentId,
      { Avatar: imageUrl },
      { new: true }
    );

    // 2️⃣ Nếu không tìm thấy trong SinhVien thì thử trong GiangVien
    if (!updated) {
      updated = await GiangVien.findByIdAndUpdate(
        studentId,
        { Avatar: imageUrl },
        { new: true }
      );
    }

    // 3️⃣ Nếu vẫn không có thì báo lỗi
    if (!updated) {
      throw new Error("Không tìm thấy sinh viên hoặc giảng viên với ID này");
    }

    return updated;
  } catch (err) {
    console.error("Lỗi service updateAvatar:", err);
    throw err;
  }
}

async function requestCardReprint(MaThe) {
  try {
    const rule = await QuyDinhThuVien.findOne();

    let reissueFee;
    // Lấy thẻ và thông tin độc giả
    const card = await TheThuVien.findById(MaThe).populate("DocGia");
    if (!card || !card.DocGia)
      throw new Error("Không tìm thấy thẻ hoặc độc giả");

    // Xác định phí cấp lại theo đối tượng
    if (card.DocGia.DoiTuong === "Giảng viên") {
      reissueFee = rule ? rule.reissueFeeLecturer : 10000;
    } else {
      reissueFee = rule ? rule.reissueFee : 10000;
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

    const grouped = {};
    for (const item of info) {
      const card = item.MaThe;
      if (!card) continue;

      if (!grouped[card._id]) {
        let additionalInfo = null;

        if (card.DocGia && card.DocGia._id) {
          // Kiểm tra đối tượng là Sinh viên hay Giảng viên
          if (card.DocGia.DoiTuong === "Sinh viên") {
            additionalInfo = await SinhVien.findOne({
              MaDocGia: card.DocGia._id,
            })
              .populate("MaLop", "TenLop")
              .populate({
                path: "MaNganhHoc",
                select: "TenNganh Khoa",
                populate: { path: "Khoa", select: "TenKhoa" },
              })
              .populate("MaNienKhoa", "TenNienKhoa");
          } else if (card.DocGia.DoiTuong === "Giảng viên") {
            additionalInfo = await GiangVien.findOne({
              MaDocGia: card.DocGia._id,
            }).populate({
              path: "MaBoMon",
              select: "TenBoMon MaKhoa",
              populate: { path: "MaKhoa", select: "TenKhoa" },
            });
          }
        }

        grouped[card._id] = {
          cardInfo: card,
          studentInfo: additionalInfo, // Đổi tên này thành additionalInfo sẽ tốt hơn
          reissueHistory: [],
        };
      }

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
      path: "MaThe",
      populate: {
        path: "DocGia",
      },
    });

    if (!request) {
      throw new Error("Không tìm thấy yêu cầu cấp lại thẻ");
    }

    // Tạo thông báo cho độc giả
    if (request.MaThe && request.MaThe.DocGia) {
      await notificationService.createNotification({
        DocGia: request.MaThe.DocGia._id,
        TieuDe: "Yêu cầu làm lại thẻ bị từ chối",
        NoiDung: `Yêu cầu làm lại thẻ thư viện của bạn đã bị từ chối.`,
        LoaiThongBao: "error",
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

async function getAllLibraryCards() {
  try {
    const cards = await TheThuVien.find()
      .populate({
        path: "DocGia",
        select: "HoLot Ten MaDocGia NgaySinh Phai DiaChi DienThoai DoiTuong",
      })
      .sort({ createdAt: -1 });

    const cardsWithDetails = await Promise.all(
      cards.map(async (card) => {
        const cardObj = card.toObject();

        // Tìm trong sinh viên
        let studentInfo = await SinhVien.findOne({ MaDocGia: card.DocGia._id })
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

        // Nếu không phải sinh viên thì tìm giảng viên
        let lecturerInfo = null;
        if (!studentInfo) {
          lecturerInfo = await GiangVien.findOne({
            MaDocGia: card.DocGia._id,
          }).populate({
            path: "MaBoMon",
            select: "TenBoMon MaKhoa",
            populate: {
              path: "MaKhoa",
              select: "TenKhoa",
            },
          });
        }

        // Lấy lịch sử gia hạn
        const extendHistory = await ThongTinGiaHan.find({
          MaThe: card._id,
        }).sort({
          NgayGiaHan: -1,
        });

        // Lấy lịch sử cấp lại thẻ
        const reissueHistory = await ThongTinCapLaiThe.find({
          MaThe: card._id,
        }).sort({
          NgayYeuCau: -1,
        });

        return {
          ...cardObj,
          additionalInfo: studentInfo || lecturerInfo || null,
          extendHistory: extendHistory.map((item) => ({
            NgayGiaHan: item.NgayGiaHan,
            PhiGiaHan: item.PhiGiaHan,
          })),
          reissueHistory: reissueHistory.map((item) => ({
            NgayYeuCau: item.NgayYeuCau,
            NgayDuyet: item.NgayDuyet,
            NgayCapLai: item.NgayCapLai,
            PhiCapLai: item.PhiCapLai,
            TrangThai: item.TrangThai,
          })),
        };
      })
    );

    return cardsWithDetails;
  } catch (error) {
    console.error("Lỗi trong service getAllLibraryCards:", error);
    throw error;
  }
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
    ? `DG${nextNumber.toString().padStart(4, "0")}`
    : `DG${nextNumber}`;
}

async function uploadLibraryCardsExcelForLecturers(file) {
  try {
    if (!file) {
      throw new Error("Không có file được upload");
    }

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let created = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (!row || row.length === 0 || !row[0]) continue;

      try {
        const [
          MaCanBo,
          HoLot,
          Ten,
          NgaySinh,
          Phai,
          DiaChi,
          DienThoai,
          EmailRow,
          HocVi,
          BoMonRow,
          KhoaRow,
        ] = row;

        let NgaySinhProcess = null;
        if (!isNaN(NgaySinh)) {
          NgaySinhProcess = new Date((NgaySinh - 25569) * 86400 * 1000);
        } else if (typeof NgaySinh === "string") {
          NgaySinhProcess = new Date(NgaySinh);
        }

        const existingLecturer = await GiangVien.findOne({ MaCanBo });
        if (existingLecturer) {
          continue;
        }

        let khoaDoc = await Khoa.findOne({ TenKhoa: KhoaRow });
        if (!khoaDoc) {
          khoaDoc = await Khoa.create({ TenKhoa: KhoaRow });
        }

        let boMonDoc = await BoMon.findOne({
          TenBoMon: BoMonRow,
          MaKhoa: khoaDoc._id,
        });
        if (!boMonDoc) {
          boMonDoc = await BoMon.create({
            TenBoMon: BoMonRow,
            MaKhoa: khoaDoc._id,
          });
        }

        const maDocGia = await generateMaDocGia();
        const docGia = await DocGia.create({
          MaDocGia: maDocGia,
          HoLot: HoLot,
          Ten: Ten,
          NgaySinh: NgaySinhProcess,
          Phai: Phai,
          DiaChi: DiaChi,
          DienThoai: DienThoai,
          Email: EmailRow, 
          DoiTuong: "Giảng viên",
        });

        await GiangVien.create({
          MaCanBo: MaCanBo,
          Avatar: "",
          HocVi: HocVi,
          MaBoMon: boMonDoc._id,
          MaDocGia: docGia._id,
        });

        const hashedPassword = await bcrypt.hash(MaCanBo, 10);
        await TaiKhoan.create({
          username: MaCanBo,
          password: hashedPassword,
          status: "active",
          MaDocGia: docGia._id,
        });

        await createLibraryCard(docGia._id);
        created++;
      } catch (error) {
        throw new Error(`Lỗi tại dòng ${i + 1}: ${error.message}`);
      }
    }

    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return { created };
  } catch (error) {
    console.error(
      "Lỗi trong service uploadLibraryCardsExcelForLecturers:",
      error
    );

    if (file && file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    throw error;
  }
}

async function uploadLibraryCardsExcelForStudents(file) {
  try {
    if (!file) {
      throw new Error("Không có file được upload");
    }

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let created = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (!row || row.length === 0 || !row[0]) continue;

      try {
        const [
          MaSinhVienRow,
          HoLotRow,
          TenRow,
          NgaySinhRow,
          PhaiRow,
          DiaChiRow,
          DienThoaiRow,
          EmailRow,
          HeDaoTaoRow,
          NienKhoaRow,
          NamHocRow,
          LopRow,
          NganhHocRow,
          KhoaRow
        ] = row;

        // console.log({
        //   MaSinhVienRow,
        //   HoLotRow,
        //   TenRow,
        //   NgaySinhRow,
        //   PhaiRow,
        //   DiaChiRow,
        //   DienThoaiRow,
        //   EmailRow,
        //   HeDaoTaoRow,
        //   NienKhoaRow,
        //   NamHocRow,
        //   LopRow,
        //   NganhHocRow,
        //   KhoaRow
        // });

        let NgaySinhProcess = null;
        if (!isNaN(NgaySinhRow)) {
          NgaySinhProcess = new Date((NgaySinhRow - 25569) * 86400 * 1000);
        } else if (typeof NgaySinhRow === "string") {
          NgaySinhProcess = new Date(NgaySinhRow);
        }

        const existingStudent = await SinhVien.findOne({ MaSinhVien: MaSinhVienRow });
        if (existingStudent) {
          continue;
        }

        const [NamBatDau, NamKetThuc] = NamHocRow.split("-").map(Number);

        let nienKhoaDoc = await NienKhoa.findOne({ TenNienKhoa: NienKhoaRow });
        if (!nienKhoaDoc) {
          nienKhoaDoc = await NienKhoa.create({
            TenNienKhoa: NienKhoaRow,
            NamBatDau: NamBatDau,
            NamKetThuc: NamKetThuc,
          });
        }

        let khoaDoc = await Khoa.findOne({ TenKhoa: KhoaRow });
        if (!khoaDoc) {
          khoaDoc = await Khoa.create({ TenKhoa: KhoaRow });
        }

        let nganhHocDoc = await NganhHoc.findOne({
          TenNganh: NganhHocRow,
          Khoa: khoaDoc._id,
        });
        if (!nganhHocDoc) {
          nganhHocDoc = await NganhHoc.create({
            TenNganh: NganhHocRow,
            Khoa: khoaDoc._id,
          });
        }

        let lopDoc = await Lop.findOne({ TenLop: LopRow });
        if (!lopDoc) {
          lopDoc = await Lop.create({ TenLop: LopRow });
        }

        const maDocGia = await generateMaDocGia();
        const docGia = await DocGia.create({
          MaDocGia: maDocGia,
          HoLot: HoLotRow,
          Ten: TenRow,
          NgaySinh: NgaySinhProcess,
          Phai: PhaiRow,
          DiaChi: DiaChiRow,
          DienThoai: DienThoaiRow,
          Email: EmailRow || '',
          DoiTuong: "Sinh viên",
        });

        await SinhVien.create({
          MaSinhVien: MaSinhVienRow,
          Avatar: "",
          HeDaoTao: HeDaoTaoRow,
          MaNienKhoa: nienKhoaDoc._id,
          MaNganhHoc: nganhHocDoc._id,
          MaDocGia: docGia._id,
          MaLop: lopDoc._id,
        });

        const hashedPassword = await bcrypt.hash(MaSinhVienRow, 10);
        await TaiKhoan.create({
          username: MaSinhVienRow,
          password: hashedPassword,
          status: "active",
          MaDocGia: docGia._id,
        });

        await createLibraryCard(docGia._id);
        created++;
      } catch (error) {
        throw new Error(`Lỗi tại dòng ${i + 1}: ${error.message}`);
      }
    }

    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return { created };
  } catch (error) {
    console.error(
      "Lỗi trong service uploadLibraryCardsExcelForStudents:",
      error
    );

    if (file && file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    throw error;
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
  getAllLibraryCards,
  uploadLibraryCardsExcelForLecturers,
  uploadLibraryCardsExcelForStudents
};
