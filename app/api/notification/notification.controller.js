const notificationService = require("./notification.service");

async function createNotification(req, res) {
  try {
    const { DocGia, TieuDe, NoiDung, LoaiThongBao } = req.body;

    // Chuẩn hóa dữ liệu chuỗi (trim)
    const data = {
      DocGia: DocGia ? DocGia.trim() : null,
      TieuDe: TieuDe ? TieuDe.trim() : null,
      NoiDung: NoiDung ? NoiDung.trim() : null,
      LoaiThongBao: LoaiThongBao ? LoaiThongBao.trim() : "info",
    };

    // Kiểm tra dữ liệu bắt buộc
    if (!data.DocGia || !data.TieuDe || !data.NoiDung) {
      return res.status(400).send("Thiếu dữ liệu: DocGia, TieuDe hoặc NoiDung");
    }

    // Kiểm tra loại thông báo hợp lệ
    const validTypes = ["success", "warning", "error", "info"];
    if (!validTypes.includes(data.LoaiThongBao)) {
      return res
        .status(400)
        .send(
          "Loại thông báo không hợp lệ (chỉ nhận: success, warning, error, info)"
        );
    }

    // Gọi service để tạo thông báo
    const result = await notificationService.createNotification(data);

    if (!result) {
      console.log("Tạo thông báo thất bại:", data);
      return res.status(500).send("Tạo thông báo thất bại");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi tạo thông báo:", error);
    res.status(500).send("Lỗi khi tạo thông báo: " + error.message);
  }
}

async function getAllNotificationByUserId(req, res) {
  try {
    const { DocGia } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!DocGia || !DocGia.trim()) {
      return res.status(400).send("Thiếu dữ liệu: DocGia");
    }

    // Gọi service lấy danh sách thông báo
    const notifications = await notificationService.getAllNotificationByUserId(
      DocGia.trim()
    );

    if (!notifications || notifications.length === 0) {
      return res
        .status(404)
        .send("Không tìm thấy thông báo nào cho người dùng này");
    }

    res.json(notifications);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách thông báo:", error);
    res.status(500).send("Lỗi khi lấy danh sách thông báo: " + error.message);
  }
}

async function markMultipleAsRead(req, res) {
  try {
    const { notificationIds } = req.body;
    
    // Kiểm tra dữ liệu đầu vào
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).send("Thiếu dữ liệu: notificationIds hoặc danh sách rỗng");
    }

    // Gọi service cập nhật thông báo
    const result = await notificationService.markMultipleAsRead(notificationIds);

    if (!result || result.modifiedCount === 0) {
      return res.status(404).send("Không tìm thấy thông báo nào để cập nhật");
    }

    res.json({
      message: "Đã đánh dấu thông báo là đã đọc",
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật thông báo:", error);
    res.status(500).send("Lỗi khi cập nhật thông báo: " + error.message);
  }
}

module.exports = {
  createNotification,
  getAllNotificationByUserId,
  markMultipleAsRead
};
