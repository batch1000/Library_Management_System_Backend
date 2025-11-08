const mongoose = require("mongoose");

const ThongBaoDocGia = require("../../models/thongbaodocgiaModel");
const DocGia = require("../../models/docgiaModel");

const { emailSender } = require("../../services/email.service");

async function createNotification(data) {
  if (!data.DocGia || !data.TieuDe || !data.NoiDung) {
    throw new Error("Thiếu thông tin để tạo thông báo.");
  }

  // Kiểm tra loại thông báo hợp lệ
  const validTypes = ["success", "warning", "error", "info"];
  if (!validTypes.includes(data.LoaiThongBao)) {
    throw new Error("Loại thông báo không hợp lệ.");
  }

  // Tạo thông báo mới
  const newNotification = new ThongBaoDocGia({
    DocGia: data.DocGia,
    TieuDe: data.TieuDe,
    NoiDung: data.NoiDung,
    LoaiThongBao: data.LoaiThongBao,
  });

  const savedNotification = await newNotification.save();

  //Gửi mail
  // const docGia = await DocGia.findById(data.DocGia).select("Email HoLot Ten");
  // const emailTest = "learncode10002003@gmail.com";
  // const now = new Date();
  // const timestamp = now.toISOString().replace("T", " ").split(".")[0]; // "2025-11-08 17:45:00"
  // const titleWithTime = `${data.TieuDe} (${timestamp})`;

  // if (docGia && docGia.Email && docGia.Email === emailTest) {
  //   // Gửi email chạy "ngầm", không block luồng chính
  //   setImmediate(() => {
  //     emailSender({
  //       email: docGia.Email,
  //       subject: `Thông báo từ Thư viện: ${titleWithTime}`,
  //       html: `
  //         <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  //           <p>Chào ${docGia.HoLot} ${docGia.Ten},</p>
  
  //           <p>Thư viện xin thông báo đến bạn như sau:</p>
  
  //           <div style="padding: 10px 15px; background-color: #f2f2f2; border-left: 4px solid #007bff; margin: 15px 0;">
  //             <strong>${data.TieuDe}</strong><br/>
  //             ${data.NoiDung}
  //           </div>
  
  //           <p>Kính mong bạn lưu ý và thực hiện theo thông báo nếu cần.</p>
  
  //           <p>Kính gửi,<br/>
  //           Thư viện Readnest</p>
  
  //           <hr/>
  //           <p style="font-size: 0.85em; color: #888;">
  //             Thông báo gửi lúc: ${timestamp}
  //           </p>
  //         </div>
  //       `,
  //     }).catch(err => console.error("Lỗi gửi email:", err));
  //   });
  // }

  return savedNotification;
}

async function getAllNotificationByUserId(DocGiaId) {
  if (!DocGiaId) {
    throw new Error("Thiếu mã DocGia để truy vấn thông báo.");
  }

  // Lấy danh sách thông báo của người dùng, sắp xếp mới nhất lên đầu
  const notifications = await ThongBaoDocGia.find({ DocGia: DocGiaId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  return notifications;
}

async function markMultipleAsRead(notificationIds) {
  if (
    !notificationIds ||
    !Array.isArray(notificationIds) ||
    notificationIds.length === 0
  ) {
    throw new Error("Thiếu danh sách ID thông báo để cập nhật.");
  }

  // Cập nhật nhiều thông báo cùng lúc
  const result = await ThongBaoDocGia.updateMany(
    { _id: { $in: notificationIds } },
    { $set: { DaDoc: true } }
  );

  return result;
}

module.exports = {
  createNotification,
  getAllNotificationByUserId,
  markMultipleAsRead,
};
