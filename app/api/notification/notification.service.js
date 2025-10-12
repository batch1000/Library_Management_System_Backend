const mongoose = require("mongoose");

const ThongBaoDocGia = require("../../models/thongbaodocgiaModel");

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
  return savedNotification;
}

async function getAllNotificationByUserId(DocGiaId) {
  if (!DocGiaId) {
    throw new Error("Thiếu mã DocGia để truy vấn thông báo.");
  }

  // Lấy danh sách thông báo của người dùng, sắp xếp mới nhất lên đầu
  const notifications = await ThongBaoDocGia.find({ DocGia: DocGiaId })
    .sort({ createdAt: -1 })
    .lean();

  return notifications;
}

async function markMultipleAsRead(notificationIds) {
  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
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
  markMultipleAsRead
};
