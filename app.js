const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./app/api/auth/auth.routes"));
app.use("/api/book", require("./app/api/book/book.routes"));
app.use("/api/library", require("./app/api/library/library.routes"));
app.use("/api/room", require("./app/api/room/room.routes"));
app.use(
  "/api/notification",
  require("./app/api/notification/notification.routes")
);

module.exports = app;

const notificationService = require("./app/api/notification/notification.service");
const DocGia = require("./app/models/docgiaModel");

// Auto check hạn của thẻ thư viện
const TheThuVien = require("./app/models/thethuvienModel");
const ThongTinGiaHan = require("./app/models/thongtingiahanModel");
const QuyDinhThuVien = require("./app/models/quydinhthuvienModel");

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

(async () => {
  try {
    const now = new Date();
    const today = normalizeDate(now);

    // Lấy các thẻ đang hoạt động, hết hạn nhưng chưa được check hôm nay
    const expiredCards = await TheThuVien.find({
      TrangThai: "Hoạt động",
      NgayHetHan: { $lt: now },
      $or: [{ NgayKiemTraHetHan: null }, { NgayKiemTraHetHan: { $lt: today } }],
    });

    let updatedCount = 0;

    // Lấy quy định thư viện (chỉ nên có 1 bản ghi)
    const rule = await QuyDinhThuVien.findOne();

    for (const card of expiredCards) {
      // 🔹 Lấy thông tin độc giả để biết là GV hay SV
      const docGia = await DocGia.findById(card.DocGia);
      if (!docGia) {
        console.warn(`⚠️ Không tìm thấy DocGia cho thẻ ${card.MaThe}`);
        continue;
      }

      // 🔹 Xác định phí gia hạn theo đối tượng
      let renewalFee = 10000; // fallback mặc định
      if (rule) {
        if (docGia.DoiTuong === "Giảng viên") {
          renewalFee = rule.renewalFeeLecturer;
        } else if (docGia.DoiTuong === "Sinh viên") {
          renewalFee = rule.renewalFee;
        }
      }

      // 🔹 Cập nhật trạng thái thẻ
      card.TrangThai = "Hết hạn";
      card.NgayKiemTraHetHan = now;
      await card.save();

      // 🔹 Ghi log gia hạn
      await ThongTinGiaHan.create({
        MaThe: card._id,
        PhiGiaHan: renewalFee,
      });

      // 🔹 Gửi thông báo
      try {
        await notificationService.createNotification({
          DocGia: card.DocGia,
          TieuDe: "Thẻ thư viện hết hạn",
          NoiDung: `Thẻ thư viện của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng dịch vụ. Phí gia hạn: ${renewalFee.toLocaleString(
            "vi-VN"
          )}đ`,
          LoaiThongBao: "error",
        });
      } catch (notifErr) {
        console.error(
          `Lỗi tạo thông báo cho thẻ ${card.MaThe}:`,
          notifErr.message
        );
      }

      updatedCount++;
    }

    if (updatedCount > 0) {
      console.log(
        `✅ Đã cập nhật trạng thái "Hết hạn" cho ${updatedCount} thẻ`
      );
    } else {
      console.log("✅ Hôm nay đã kiểm tra thẻ hết hạn rồi");
    }
  } catch (err) {
    console.error("❌ Lỗi khi kiểm tra thẻ hết hạn:", err.message);
  }
})();

// Auto check quá hạn in thẻ
const ThongTinCapLaiThe = require("./app/models/thongtincaplaitheModel");

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

(async () => {
  try {
    const quyDinh = await QuyDinhThuVien.findOne({});
    if (!quyDinh) throw new Error("Chưa có quy định thư viện");

    // Lấy tất cả yêu cầu cấp lại thẻ đã được duyệt nhưng chưa in
    // ✅ POPULATE NGAY TỪ ĐẦU
    const approvedRequests = await ThongTinCapLaiThe.find({
      TrangThai: "approve",
      NgayDuyet: { $ne: null },
    }).populate({
      path: "MaThe",
      select: "DocGia MaThe", // Chỉ lấy field cần thiết
    });

    const today = normalizeDate(new Date());
    let hasLate = false;

    for (const request of approvedRequests) {
      const ngayDuyet = normalizeDate(request.NgayDuyet);

      let printWaitingDays;
      if (request.MaThe && request.MaThe.DocGia) {
        const docGia = await DocGia.findById(request.MaThe.DocGia).select(
          "DoiTuong"
        );
        if (docGia) {
          if (docGia.DoiTuong === "Giảng viên") {
            printWaitingDays = quyDinh.printWaitingDaysLecturer;
          } else {
            printWaitingDays = quyDinh.printWaitingDays;
          }
        }
      }

      const diffTime = today.getTime() - ngayDuyet.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays > printWaitingDays) {
        // ✅ TẠO THÔNG BÁO TRƯỚC KHI SAVE (vì đã có dữ liệu populate)
        try {
          if (request.MaThe && request.MaThe.DocGia) {
            await notificationService.createNotification({
              DocGia: request.MaThe.DocGia,
              TieuDe: "Yêu cầu cấp lại thẻ bị từ chối",
              NoiDung: `Yêu cầu cấp lại thẻ thư viện của bạn đã bị từ chối do quá thời gian chờ in (${printWaitingDays} ngày). Vui lòng liên hệ thư viện để được hỗ trợ.`,
              LoaiThongBao: "error",
            });
          }
        } catch (notifErr) {
          console.error(
            `Lỗi tạo thông báo cho yêu cầu ${request._id}:`,
            notifErr.message
          );
        }

        // Quá hạn chờ in thẻ → chuyển sang denied
        request.TrangThai = "denied";
        await request.save();

        console.log(
          `Yêu cầu cấp lại thẻ ${request._id} đã quá hạn in, chuyển sang denied`
        );

        hasLate = true;
      }
    }

    if (!hasLate) {
      console.log("✅ Không có yêu cầu cấp lại thẻ nào quá hạn in.");
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra tự động printWaitingDays:", err);
  }
})();

//Auto check quá hạn nhận sách
const TheoDoiMuonSach = require("./app/models/theodoimuonsachModel");
const QuyDinhMuonSach = require("./app/models/quydinhmuonsachModel");
const { updateBorrowStatus } = require("./app/api/book/book.service");

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

(async () => {
  try {
    const quyDinh = await QuyDinhMuonSach.findOne({});
    // Lấy tất cả yêu cầu đang ở trạng thái processing
    const processingRequests = await TheoDoiMuonSach.find({
      TrangThai: "processing",
      NgayDuyet: { $ne: null },
    })
      .populate("MaSach", "TenSach")
      .populate("MaDocGia", "DoiTuong");

    const today = normalizeDate(new Date());
    let hasLate = false;

    for (const request of processingRequests) {
      const doiTuong = request.MaDocGia.DoiTuong;
      const pickupDeadlineDays =
        doiTuong === "Giảng viên"
          ? quyDinh
            ? quyDinh.pickupDeadlineLecturer
            : 0
          : quyDinh
          ? quyDinh.pickupDeadline
          : 0;

      const ngayDuyet = normalizeDate(request.NgayDuyet);

      const diffTime = today.getTime() - ngayDuyet.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays > pickupDeadlineDays) {
        // Quá hạn pickupDeadline → chuyển sang denied
        await updateBorrowStatus(request._id, null, "denied"); // adminId null vì tự động
        console.log(
          `Yêu cầu ${request._id} đã quá hạn nhận sách, chuyển sang denied`
        );
        hasLate = true;

        //Tạo thông báo
        try {
          const sach = request.MaSach.TenSach;
          await notificationService.createNotification({
            DocGia: request.MaDocGia._id,
            TieuDe: "Yêu cầu mượn sách bị hủy do quá hạn nhận",
            NoiDung: `Yêu cầu mượn sách "${sach}" đã bị hủy vì bạn không đến nhận trong ${pickupDeadlineDays} ngày kể từ khi được duyệt.`,
            LoaiThongBao: "warning",
          });
        } catch (notifyErr) {
          console.error("❌ Lỗi khi tạo thông báo:", notifyErr);
        }
      }
    }

    if (!hasLate) {
      console.log("✅ Không có yêu cầu mượn nào quá hạn nhận sách.");
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra tự động pickupDeadline:", err);
  }
})();

// Auto check sách mượn quá hạn
(async () => {
  try {
    const today = normalizeDate(new Date());
    let hasLog = false;

    // Lấy tất cả lượt mượn đang ở trạng thái "approved"
    const approvedBorrows = await TheoDoiMuonSach.find({
      TrangThai: "approved",
      NgayTra: { $ne: null }, // có ngày trả
    })
      .populate("MaSach", "TenSach")
      .populate("MaDocGia", "_id HoTen");

    for (const borrow of approvedBorrows) {
      const ngayTra = normalizeDate(borrow.NgayTra);

      const diffDays = Math.floor(
        (ngayTra.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // --- TH1: Còn 2 ngày ---
      if (diffDays === 2) {
        hasLog = true;
        await notificationService.createNotification({
          DocGia: borrow.MaDocGia._id,
          TieuDe: "Nhắc nhở trả sách",
          NoiDung: `Sách "${borrow.MaSach.TenSach}" còn 2 ngày nữa đến hạn trả.`,
          LoaiThongBao: "info",
        });
      }

      // --- TH2: Còn 1 ngày ---
      else if (diffDays === 1) {
        hasLog = true;
        await notificationService.createNotification({
          DocGia: borrow.MaDocGia._id,
          TieuDe: "Sắp đến hạn trả sách",
          NoiDung: `Sách "${borrow.MaSach.TenSach}" sẽ đến hạn trả vào ngày mai.`,
          LoaiThongBao: "warning",
        });
      }

      // --- TH3: Hôm nay phải trả ---
      else if (diffDays === 0) {
        hasLog = true;
        await notificationService.createNotification({
          DocGia: borrow.MaDocGia._id,
          TieuDe: "Hôm nay là hạn trả sách",
          NoiDung: `Hôm nay là hạn trả sách "${borrow.MaSach.TenSach}". Vui lòng hoàn trả đúng hạn để tránh phát sinh phí.`,
          LoaiThongBao: "warning",
        });
      }

      // --- TH4: Đã quá hạn ---
      else if (diffDays < 0) {
        hasLog = true;

        // Cập nhật trạng thái sang "overdue"
        borrow.TrangThai = "overdue";
        await borrow.save();

        // Gửi thông báo quá hạn
        await notificationService.createNotification({
          DocGia: borrow.MaDocGia._id,
          TieuDe: "Sách mượn đã quá hạn trả",
          NoiDung: `Sách "${
            borrow.MaSach.TenSach
          }" đã quá hạn trả kể từ ngày ${borrow.NgayTra.toLocaleDateString(
            "vi-VN"
          )}. Vui lòng hoàn trả sớm.`,
          LoaiThongBao: "error",
        });
      }
    }

    if (!hasLog) {
      console.log("✅ Không có sách nào sắp đến hạn hoặc quá hạn hôm nay.");
    }
  } catch (err) {
    console.error("❌ Lỗi khi kiểm tra hạn trả sách:", err);
  }
})();

// Auto check phòng "no_show"
const TheoDoiDatPhong = require("./app/models/theodoimuonphongModel");

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

(async () => {
  try {
    const now = new Date();
    const today = normalizeDate(now);

    // Lấy danh sách đặt phòng đã duyệt (approved)
    const approvedBookings = await TheoDoiDatPhong.find({
      TrangThai: "approved",
    }).populate("PhongHoc");

    let countNoShow = 0;

    for (const booking of approvedBookings) {
      const ngaySuDung = normalizeDate(new Date(booking.NgaySuDung));

      // Nếu ngày sử dụng < hôm nay → no_show
      if (ngaySuDung < today) {
        booking.TrangThai = "no_show";
        await booking.save();
        console.log(
          `📅 Đặt phòng ${booking._id} đã quá ngày sử dụng, chuyển sang no_show`
        );
        countNoShow++;

        // ===== THÊM THÔNG BÁO Ở ĐÂY =====
        try {
          await notificationService.createNotification({
            DocGia: booking.DocGia,
            TieuDe: "Đặt phòng không được sử dụng",
            NoiDung: `Đặt phòng ${
              booking.PhongHoc.TenPhong || "phòng học"
            } ngày ${booking.NgaySuDung.toLocaleDateString(
              "vi-VN"
            )} đã được hủy do bạn chưa đến nhận phòng đúng ngày.`,
            LoaiThongBao: "warning",
          });
        } catch (notifErr) {
          console.error(
            `Lỗi tạo thông báo cho booking ${booking._id}:`,
            notifErr.message
          );
        }

        continue;
      }

      // Nếu ngày sử dụng là hôm nay → kiểm tra giờ kết thúc
      if (ngaySuDung.getTime() === today.getTime()) {
        // Tạo Date object với giờ kết thúc của đặt phòng
        const [endHour, endMinute] = booking.GioKetThuc.split(":").map(Number);
        const endTime = new Date(ngaySuDung);
        endTime.setHours(endHour, endMinute, 0, 0);

        if (now > endTime) {
          booking.TrangThai = "no_show";
          await booking.save();
          console.log(
            `⏰ Đặt phòng ${booking._id} đã qua giờ kết thúc, chuyển sang no_show`
          );
          countNoShow++;

          // ===== THÊM THÔNG BÁO Ở ĐÂY =====
          try {
            await notificationService.createNotification({
              DocGia: booking.DocGia,
              TieuDe: "Đặt phòng không được sử dụng",
              NoiDung: `Đặt phòng ${
                booking.PhongHoc.TenPhong || "phòng học"
              } ngày ${booking.NgaySuDung.toLocaleDateString("vi-VN")} từ ${
                booking.GioBatDau
              } đến ${booking.GioKetThuc} đã bị hủy do bạn không đến sử dụng.`,
              LoaiThongBao: "warning",
            });
          } catch (notifErr) {
            console.error(
              `Lỗi tạo thông báo cho booking ${booking._id}:`,
              notifErr.message
            );
          }
        }
      }
    }

    if (countNoShow > 0) {
      console.log(
        `✅ Đã cập nhật ${countNoShow} lượt đặt phòng sang trạng thái "no_show"`
      );
    } else {
      console.log("✅ Không có phòng nào cần chuyển sang no_show hôm nay.");
    }
  } catch (err) {
    console.error("❌ Lỗi khi auto check no_show:", err.message);
  }
})();

// Auto check phòng pending quá giờ → denied
(async () => {
  try {
    const now = new Date();
    const today = normalizeDate(now);

    // Lấy danh sách đặt phòng đang pending
    const pendingBookings = await TheoDoiDatPhong.find({
      TrangThai: "pending",
    }).populate("PhongHoc");

    let countDenied = 0;

    for (const booking of pendingBookings) {
      const ngaySuDung = normalizeDate(new Date(booking.NgaySuDung));

      // Nếu ngày sử dụng < hôm nay → denied
      if (ngaySuDung < today) {
        booking.TrangThai = "denied";
        await booking.save();
        console.log(
          `📅 Đặt phòng ${booking._id} đã quá ngày sử dụng, chuyển sang denied`
        );
        countDenied++;

        // ===== THÊM THÔNG BÁO =====
        try {
          await notificationService.createNotification({
            DocGia: booking.DocGia,
            TieuDe: "Đặt phòng bị từ chối",
            NoiDung: `Đặt phòng ${
              booking.PhongHoc.TenPhong || "phòng học"
            } vào ngày ${booking.NgaySuDung.toLocaleDateString(
              "vi-VN"
            )} đã bị từ chối do quá thời gian chờ duyệt.`,
            LoaiThongBao: "error",
          });
        } catch (notifErr) {
          console.error(
            `Lỗi tạo thông báo cho booking ${booking._id}:`,
            notifErr.message
          );
        }

        continue;
      }

      // Nếu ngày sử dụng là hôm nay → kiểm tra giờ bắt đầu
      if (ngaySuDung.getTime() === today.getTime()) {
        const [startHour, startMinute] =
          booking.GioBatDau.split(":").map(Number);
        const startTime = new Date(ngaySuDung);
        startTime.setHours(startHour, startMinute, 0, 0);

        if (now >= startTime) {
          booking.TrangThai = "denied";
          await booking.save();
          console.log(
            `⏰ Đặt phòng ${booking._id} đã tới giờ bắt đầu mà chưa duyệt, chuyển sang denied`
          );
          countDenied++;

          // ===== THÊM THÔNG BÁO =====
          try {
            await notificationService.createNotification({
              DocGia: booking.DocGia,
              TieuDe: "Đặt phòng bị từ chối",
              NoiDung: `Đặt phòng ${
                booking.PhongHoc.TenPhong || "phòng học"
              } vào ngày ${booking.NgaySuDung.toLocaleDateString(
                "vi-VN"
              )} lúc ${booking.GioBatDau} - ${
                booking.GioKetThuc
              } đã bị từ chối do chưa được duyệt đúng giờ.`,
              LoaiThongBao: "error",
            });
          } catch (notifErr) {
            console.error(
              `Lỗi tạo thông báo cho booking ${booking._id}:`,
              notifErr.message
            );
          }
        }
      }
    }

    if (countDenied > 0) {
      console.log(
        `✅ Đã cập nhật ${countDenied} lượt đặt phòng sang trạng thái "denied"`
      );
    } else {
      console.log("✅ Không có phòng pending nào cần chuyển sang denied.");
    }
  } catch (err) {
    console.error("❌ Lỗi khi auto check pending → denied:", err.message);
  }
})();

// Auto check phòng waiting_members quá giờ → canceled
(async () => {
  try {
    const now = new Date();
    const today = normalizeDate(now);

    // Lấy danh sách đặt phòng đang waiting_members
    const waitingBookings = await TheoDoiDatPhong.find({
      TrangThai: "waiting_members",
    }).populate("PhongHoc");

    let countCanceled = 0;

    for (const booking of waitingBookings) {
      const ngaySuDung = normalizeDate(new Date(booking.NgaySuDung));

      // Nếu ngày sử dụng < hôm nay → canceled
      if (ngaySuDung < today) {
        // ===== LƯU DANH SÁCH THÀNH VIÊN CHƯA PHẢN HỒI TRƯỚC KHI THAY ĐỔI =====
        const invitedMembers = booking.ThanhVien.filter(
          (member) => member.TrangThai === "invited" && member.DocGia
        );

        // ===== TỰ ĐỘNG DECLINED CÁC THÀNH VIÊN CHƯA PHẢN HỒI =====
        booking.ThanhVien.forEach((member) => {
          if (member.TrangThai === "invited") {
            member.TrangThai = "declined";
          }
        });

        booking.TrangThai = "canceled";
        await booking.save();
        console.log(
          `📅 Đặt phòng ${booking._id} đã quá ngày sử dụng, chuyển sang canceled`
        );
        countCanceled++;

        // ===== THÔNG BÁO CHO NGƯỜI TẠO PHÒNG =====
        try {
          await notificationService.createNotification({
            DocGia: booking.DocGia,
            TieuDe: "Đặt phòng nhóm bị hủy",
            NoiDung: `Đặt phòng nhóm ${
              booking.PhongHoc.TenPhong || "phòng học"
            } vào ngày ${booking.NgaySuDung.toLocaleDateString(
              "vi-VN"
            )} đã bị hủy do quá thời gian chờ thành viên xác nhận.`,
            LoaiThongBao: "error",
          });
        } catch (notifErr) {
          console.error(
            `Lỗi tạo thông báo cho người tạo booking ${booking._id}:`,
            notifErr.message
          );
        }

        // ===== THÔNG BÁO CHO CÁC THÀNH VIÊN CHƯA PHẢN HỒI =====
        for (const member of invitedMembers) {
          try {
            await notificationService.createNotification({
              DocGia: member.DocGia,
              TieuDe: "Lời mời đặt phòng nhóm đã hết hạn",
              NoiDung: `Lời mời tham gia phòng nhóm ${
                booking.PhongHoc.TenPhong || "phòng học"
              } vào ngày ${booking.NgaySuDung.toLocaleDateString(
                "vi-VN"
              )} đã hết hạn do bạn chưa phản hồi.`,
              LoaiThongBao: "warning",
            });
          } catch (notifErr) {
            console.error(
              `Lỗi tạo thông báo cho thành viên ${member.DocGia}:`,
              notifErr.message
            );
          }
        }

        continue;
      }

      // Nếu ngày sử dụng là hôm nay → kiểm tra giờ bắt đầu
      if (ngaySuDung.getTime() === today.getTime()) {
        const [startHour, startMinute] =
          booking.GioBatDau.split(":").map(Number);
        const startTime = new Date(ngaySuDung);
        startTime.setHours(startHour, startMinute, 0, 0);

        if (now >= startTime) {
          // ===== LƯU DANH SÁCH THÀNH VIÊN CHƯA PHẢN HỒI TRƯỚC KHI THAY ĐỔI =====
          const invitedMembers = booking.ThanhVien.filter(
            (member) => member.TrangThai === "invited" && member.DocGia
          );

          // ===== TỰ ĐỘNG DECLINED CÁC THÀNH VIÊN CHƯA PHẢN HỒI =====
          booking.ThanhVien.forEach((member) => {
            if (member.TrangThai === "invited") {
              member.TrangThai = "declined";
            }
          });

          booking.TrangThai = "canceled";
          await booking.save();
          console.log(
            `⏰ Đặt phòng ${booking._id} đã tới giờ bắt đầu mà vẫn chờ thành viên, chuyển sang canceled`
          );
          countCanceled++;

          // ===== THÔNG BÁO CHO NGƯỜI TẠO PHÒNG =====
          try {
            await notificationService.createNotification({
              DocGia: booking.DocGia,
              TieuDe: "Đặt phòng nhóm bị hủy",
              NoiDung: `Đặt phòng nhóm ${
                booking.PhongHoc.TenPhong || "phòng học"
              } vào ngày ${booking.NgaySuDung.toLocaleDateString(
                "vi-VN"
              )} lúc ${booking.GioBatDau} - ${
                booking.GioKetThuc
              } đã bị hủy do chưa đủ thành viên xác nhận đúng giờ.`,
              LoaiThongBao: "error",
            });
          } catch (notifErr) {
            console.error(
              `Lỗi tạo thông báo cho người tạo booking ${booking._id}:`,
              notifErr.message
            );
          }

          // ===== THÔNG BÁO CHO CÁC THÀNH VIÊN CHƯA PHẢN HỒI =====
          for (const member of invitedMembers) {
            try {
              await notificationService.createNotification({
                DocGia: member.DocGia,
                TieuDe: "Lời mời đặt phòng nhóm đã hết hạn",
                NoiDung: `Lời mời tham gia phòng nhóm ${
                  booking.PhongHoc.TenPhong || "phòng học"
                } vào ngày ${booking.NgaySuDung.toLocaleDateString(
                  "vi-VN"
                )} lúc ${booking.GioBatDau} - ${
                  booking.GioKetThuc
                } đã hết hạn do bạn chưa phản hồi.`,
                LoaiThongBao: "warning",
              });
            } catch (notifErr) {
              console.error(
                `Lỗi tạo thông báo cho thành viên ${member.DocGia}:`,
                notifErr.message
              );
            }
          }
        }
      }
    }

    if (countCanceled > 0) {
      console.log(
        `✅ Đã cập nhật ${countCanceled} lượt đặt phòng sang trạng thái "canceled"`
      );
    } else {
      console.log(
        "✅ Không có phòng waiting_members nào cần chuyển sang canceled."
      );
    }
  } catch (err) {
    console.error(
      "❌ Lỗi khi auto check waiting_members → canceled:",
      err.message
    );
  }
})();

// const QuyDinhPhongHoc = require('./app/models/quydinhphonghocModel');
// (async () => {
//   try {
//     // Tạo dữ liệu mẫu (giống default trong schema)
//     const rule = await QuyDinhPhongHoc.create({
//       bookingLeadTime: 2, // Thời hạn đặt trước (số ngày)
//     });

//     console.log("✅ Đã tạo quy định phòng học:");
//     console.log(`bookingLeadTime: ${rule.bookingLeadTime} ngày`);
//   } catch (err) {
//     console.error("❌ Lỗi:", err.message);
//   }
// })();

// const DocGia = require('./app/models/docgiaModel'); // chỉnh lại đường dẫn nếu khác
// (async () => {
//     try {
//         const readers = await DocGia.find();

//         console.log(`📌 Tổng số độc giả: ${readers.length}`);
//         readers.forEach((dg, i) => {
//             console.log(
//                 `${i + 1}. _id: ${dg._id} | Họ tên: ${dg.HoLot} ${dg.Ten}}`
//             );
//         });
//     } catch (err) {
//         console.error("❌ Lỗi:", err.message);
//     }
// })();

// const DocGia = require('./app/models/docgiaModel'); // chỉnh lại đường dẫn nếu khác
// (async () => {
//     try {
//         const readers = await DocGia.find();

//         console.log(`📌 Tổng số độc giả: ${readers.length}`);
//         readers.forEach((dg, i) => {
//             console.log(
// `${i + 1}. _id: ${dg._id} | MaDocGia: ${dg.MaDocGia} | Họ tên: ${dg.HoLot} ${dg.Ten} | Ngày sinh: ${dg.NgaySinh ? dg.NgaySinh.toISOString().split('T')[0] : ''} | Phái: ${dg.Phai} | Địa chỉ: ${dg.DiaChi} | Điện thoại: ${dg.DienThoai} | Đối tượng: ${dg.DoiTuong} | createdAt: ${dg.createdAt} | updatedAt: ${dg.updatedAt}`
//             );
//         });
//     } catch (err) {
//         console.error("❌ Lỗi:", err.message);
//     }
// })();

// const libraryService = require('./app/api/library/library.service');
// const SinhVien = require('./app/models/sinhvienModel');
// const NienKhoa = require('./app/models/nienkhoaModel');
// const NganhHoc = require('./app/models/nganhhocModel');
// const Khoa = require('./app/models/khoaModel');
// const Lop = require('./app/models/lopModel');

// (async () => {
//     const test = [
//         {
//             "MaSinhVien": "B2115409",
//             "Lop": "KTKT2A",
//             "HeDaoTao": "Chính quy",
//             "NienKhoa": "Khóa 46",
//             "NamHoc": "2020-2024",
//             "NganhHoc": "Kế toán",
//             "Khoa": "Kinh tế",
//             "DocGia": "689f390b0ba6ed16dcf4763f"  // DG0011
//         }
//     ]

//   try {
//     for (const item of test) {
//       // 1. Tìm hoặc tạo Khoa
//       let khoa = await Khoa.findOne({ TenKhoa: item.Khoa });
//       if (!khoa) khoa = await Khoa.create({ TenKhoa: item.Khoa });

//       // 2. Tìm hoặc tạo NganhHoc
//       let nganh = await NganhHoc.findOne({ TenNganh: item.NganhHoc, Khoa: khoa._id });
//       if (!nganh) nganh = await NganhHoc.create({ TenNganh: item.NganhHoc, Khoa: khoa._id });

//       // 3. Tìm hoặc tạo NienKhoa
//       let nk = await NienKhoa.findOne({ TenNienKhoa: item.NienKhoa });
//       if (!nk) {
//         // tạm lấy năm từ NamHoc
//         const [namBatDau, namKetThuc] = item.NamHoc.split('-').map(n => parseInt(n));
//         nk = await NienKhoa.create({ TenNienKhoa: item.NienKhoa, NamBatDau: namBatDau, NamKetThuc: namKetThuc });
//       }

//       // 4. Tìm hoặc tạo Lop
//       let lop = await Lop.findOne({ TenLop: item.Lop });
//       if (!lop) lop = await Lop.create({ TenLop: item.Lop });

//       // 5. Tạo SinhVien
//       await SinhVien.create({
//         MaSinhVien: item.MaSinhVien,
//         HeDaoTao: item.HeDaoTao,
//         MaNienKhoa: nk._id,
//         MaNganhHoc: nganh._id,
//         MaDocGia: item.DocGia,   // ObjectId cũ
//         MaLop: lop._id
//       });

//       console.log(`✅ Thêm sinh viên ${item.MaSinhVien} thành công!`);

//       const card = await libraryService.createLibraryCard(item.DocGia);
//       console.log(`📖 Đã tạo thẻ cho sinh viên ${item.MaSinhVien}:`, card.MaThe);
//     }
//   } catch (err) {
//     console.error('❌ Lỗi:', err.message);
//   }
// })();

//----------------------Rating Book 2 Weeks-------------------------
// const DanhGiaSach = require('./app/models/danhgiasachModel');
// const readers = [
//   { username: "thanhTran", id: "687113ca8d3f5218287b7651" },
//   { username: "hoangTran", id: "68951fb83475df14e828916e" },
//   { username: "hainguyen", id: "689f296763a64118d8c26bcc" },
//   { username: "lanNguyen", id: "689f38b3fb95ec1614eba15d" },
//   { username: "namPham", id: "689f38b3fb95ec1614eba162" },
//   { username: "anhLe", id: "689f38b3fb95ec1614eba167" },
//   { username: "hongVo", id: "689f38b3fb95ec1614eba16c" },
//   { username: "phucNguyen", id: "689f390b0ba6ed16dcf4763f" },
//   { username: "maiTran", id: "689f390b0ba6ed16dcf47645" },
//   { username: "dungLe", id: "689f390b0ba6ed16dcf4764a" },
//   { username: "thuPham", id: "689f390b0ba6ed16dcf4764f" },
//   { username: "khoaVu", id: "689f390c0ba6ed16dcf47654" },
//   { username: "bichDo", id: "689f390c0ba6ed16dcf47659" },
//   { username: "tamNgo", id: "689f390c0ba6ed16dcf4765e" },
//   { username: "yenHuynh", id: "689f390c0ba6ed16dcf47663" },
//   { username: "huyBui", id: "689f390c0ba6ed16dcf47668" },
//   { username: "hoaDang", id: "689f390d0ba6ed16dcf4766d" },
//   { username: "lamTruong", id: "689f394afc24c01b60e1cc9f" },
//   { username: "hanhNguyen", id: "689f394afc24c01b60e1cca4" },
//   { username: "quangPhan", id: "689f394bfc24c01b60e1cca9" },
// ];

// const books = [
//   { title: "The Secret Deep", id: "687a67faa9de141afc8ea572" },
//   { title: "Giết con chim nhại", id: "687a9762a9de141afc8ea579" },
//   { title: "Mắt Biếc", id: "687a99b7a9de141afc8ea580" },
//   { title: "The Martian", id: "687a9a9ea9de141afc8ea587" },
//   { title: "The Hobbit", id: "687a9b0fa9de141afc8ea58e" },
//   { title: "1984", id: "687aa878a9de141afc8ea595" },
//   { title: "Tuổi thơ dữ dội", id: "687aa8eaa9de141afc8ea59c" },
//   { title: "Ngồi Khóc Trên Cây", id: "687aa9b0a9de141afc8ea5a0" },
//   { title: "The Shining", id: "687aab5fa9de141afc8ea5a7" },
//   { title: "Dế Mèn phiêu lưu ký", id: "687aac4da9de141afc8ea5ab" },
//   { title: "Becoming", id: "687aaf03a9de141afc8ea5af" },
//   { title: "Tôi thấy hoa vàng trên cỏ xanh", id: "687ab02ca9de141afc8ea5b3" },
//   { title: "The Da Vinci Code", id: "687ab0c9a9de141afc8ea5b7" },
//   { title: "Pride and Prejudice", id: "687ab1bea9de141afc8ea5be" },
//   { title: "Sống Mòn", id: "687ab383a9de141afc8ea5c5" },
//   { title: "Atomic Habits", id: "687b8566c290a2086476f28f" },
//   { title: "Đắc Nhân Tâm", id: "687ba752c290a2086476f301" },
//   { title: "Norwegian Wood", id: "687ba60ac290a2086476f2fa" },
//   { title: "Deep Work", id: "687b7a30c290a2086476f281" },
//   { title: "Dune", id: "687b908fc290a2086476f2d1" },
// ];

// async function createRating(bookId, readerId, stars, customDate) {
//   const existingRating = await DanhGiaSach.findOne({
//     MaSach: bookId,
//     MaDocGia: readerId
//   });
//   if (existingRating) {
//     return null;
//   }
//   const newRating = new DanhGiaSach({
//     MaSach: bookId,
//     MaDocGia: readerId,
//     SoSao: stars,
//     BinhLuan: "",
//     NgayDanhGia: customDate,
//     createdAt: customDate,
//     updatedAt: customDate
//   });
//   return await newRating.save();
// }

// function getRandomBook() {
//   const popularBooks = books.slice(0, 8);
//   const otherBooks = books.slice(8);
//   if (Math.random() < 0.7) {
//     return popularBooks[Math.floor(Math.random() * popularBooks.length)];
//   } else {
//     return otherBooks[Math.floor(Math.random() * otherBooks.length)];
//   }
// }

// function getRandomRating() {
//   const rand = Math.random();
//   if (rand < 0.4) return 5;
//   if (rand < 0.7) return 4;
//   if (rand < 0.85) return 3;
//   if (rand < 0.95) return 2;
//   return 1;
// }

// function getRandomDateInLast14Days() {
//   const now = new Date();
//   let adjustedDaysAgo;
//   const rand = Math.random();

//   if (rand < 0.4) {
//     adjustedDaysAgo = Math.floor(Math.random() * 3) + 1; // 1–3 ngày
//   } else if (rand < 0.7) {
//     adjustedDaysAgo = Math.floor(Math.random() * 4) + 4; // 4–7 ngày
//   } else {
//     adjustedDaysAgo = Math.floor(Math.random() * 7) + 8; // 8–14 ngày
//   }

//   const targetDate = new Date(now);
//   targetDate.setDate(now.getDate() - adjustedDaysAgo);
//   const randomHour = Math.floor(Math.random() * 14) + 8;
//   const randomMinute = Math.floor(Math.random() * 60);
//   targetDate.setHours(randomHour, randomMinute, 0, 0);
//   return targetDate;
// }

// (async () => {
//   try {
//     console.log("Bắt đầu tạo dữ liệu đánh giá sách...\n");
//     let successCount = 0;
//     let duplicateCount = 0;

//     // Bước 1: đảm bảo mỗi sách đều có ít nhất 1 đánh giá
//     for (const book of books) {
//       const randomReader = readers[Math.floor(Math.random() * readers.length)];
//       const stars = getRandomRating();
//       const randomDate = getRandomDateInLast14Days();
//       const result = await createRating(book.id, randomReader.id, stars, randomDate);
//       if (result) {
//         successCount++;
//         const daysAgo = Math.floor((new Date() - randomDate) / (1000 * 60 * 60 * 24));
//         console.log(`${randomReader.username} đã đánh giá "${book.title}" (${stars} sao) - ${daysAgo} ngày trước`);
//       } else {
//         duplicateCount++;
//         console.log(`${randomReader.username} đã đánh giá "${book.title}" trước đó`);
//       }
//       await new Promise(resolve => setTimeout(resolve, 100));
//     }

//     // Bước 2: tạo thêm dữ liệu ngẫu nhiên như code cũ
//     const totalRatings = Math.floor(Math.random() * 41) + 80;
//     for (let i = 0; i < totalRatings; i++) {
//       const randomReader = readers[Math.floor(Math.random() * readers.length)];
//       const randomBook = getRandomBook();
//       const stars = getRandomRating();
//       const randomDate = getRandomDateInLast14Days();
//       const result = await createRating(randomBook.id, randomReader.id, stars, randomDate);
//       if (result) {
//         successCount++;
//         const daysAgo = Math.floor((new Date() - randomDate) / (1000 * 60 * 60 * 24));
//         console.log(`${randomReader.username} đã đánh giá "${randomBook.title}" (${stars} sao) - ${daysAgo} ngày trước`);
//       } else {
//         duplicateCount++;
//         console.log(`${randomReader.username} đã đánh giá "${randomBook.title}" trước đó`);
//       }
//       await new Promise(resolve => setTimeout(resolve, 100));
//     }

//     console.log("\nKết quả:");
//     console.log(`Đánh giá thành công: ${successCount}`);
//     console.log(`Đánh giá trùng lặp: ${duplicateCount}`);
//     console.log(`Tổng: ${successCount + duplicateCount} lần thử`);

//     console.log("\nPhân phối dữ liệu:");
//     console.log("40% dữ liệu: 1-3 ngày trước");
//     console.log("30% dữ liệu: 4-7 ngày trước");
//     console.log("30% dữ liệu: 8-14 ngày trước");
//   } catch (err) {
//     console.error("Lỗi khi chạy script:", err.message);
//   }
// })();

//----------------------Delete All Ratings-------------------------
// const DanhGiaSach = require('./app/models/danhgiasachModel');

// async function deleteAllRatings() {
//     try {
//         const result = await DanhGiaSach.deleteMany({}); // xóa hết
//         console.log(`🗑️ Đã xóa ${result.deletedCount} đánh giá trong hệ thống.`);
//     } catch (err) {
//         console.error("❌ Lỗi khi xóa đánh giá:", err.message);
//     }
// }

// // // Chạy function
// (async () => {
//     await deleteAllRatings();
// })();

// //----------------------View Book-------------------------
// const TheoDoiXemSach = require('./app/models/theodoixemsachModel');

// // Hàm tạo lượt xem trực tiếp vào database
// async function createBookView(bookId, readerId, customDate) {
//     const newView = new TheoDoiXemSach({
//         MaSach: bookId,
//         MaDocGia: readerId,
//         ThoiDiemXem: customDate
//     });

//     const savedView = await newView.save();
//     return savedView;
// }

// const readers = [
//     { username: "thanhTran", id: "687113ca8d3f5218287b7651" },
//     { username: "hoangTran", id: "68951fb83475df14e828916e" },
//     { username: "hainguyen", id: "689f296763a64118d8c26bcc" },
//     { username: "lanNguyen", id: "689f38b3fb95ec1614eba15d" },
//     { username: "namPham", id: "689f38b3fb95ec1614eba162" },
//     { username: "anhLe", id: "689f38b3fb95ec1614eba167" },
//     { username: "hongVo", id: "689f38b3fb95ec1614eba16c" },
//     { username: "phucNguyen", id: "689f390b0ba6ed16dcf4763f" },
//     { username: "maiTran", id: "689f390b0ba6ed16dcf47645" },
//     { username: "dungLe", id: "689f390b0ba6ed16dcf4764a" },
//     { username: "thuPham", id: "689f390b0ba6ed16dcf4764f" },
//     { username: "khoaVu", id: "689f390c0ba6ed16dcf47654" },
//     { username: "bichDo", id: "689f390c0ba6ed16dcf47659" },
//     { username: "tamNgo", id: "689f390c0ba6ed16dcf4765e" },
//     { username: "yenHuynh", id: "689f390c0ba6ed16dcf47663" },
//     { username: "huyBui", id: "689f390c0ba6ed16dcf47668" },
//     { username: "hoaDang", id: "689f390d0ba6ed16dcf4766d" },
//     { username: "lamTruong", id: "689f394afc24c01b60e1cc9f" },
//     { username: "hanhNguyen", id: "689f394afc24c01b60e1cca4" },
//     { username: "quangPhan", id: "689f394bfc24c01b60e1cca9" },
//     { username: "thuyDinh", id: "689f394bfc24c01b60e1ccae" },
//     { username: "phucVu", id: "689f394bfc24c01b60e1ccb3" },
//     { username: "huongLy", id: "689f394bfc24c01b60e1ccb8" },
//     { username: "datNguyen", id: "689f394bfc24c01b60e1ccbd" },
//     { username: "trangBui", id: "689f394cfc24c01b60e1ccc2" },
// ];

// const books = [
//     { title: "The Secret Deep", id: "687a67faa9de141afc8ea572" },
//     { title: "Giết con chim nhại", id: "687a9762a9de141afc8ea579" },
//     { title: "Mắt Biếc", id: "687a99b7a9de141afc8ea580" },
//     { title: "The Martian", id: "687a9a9ea9de141afc8ea587" },
//     { title: "The Hobbit", id: "687a9b0fa9de141afc8ea58e" },
//     { title: "1984", id: "687aa878a9de141afc8ea595" },
//     { title: "Tuổi thơ dữ dội", id: "687aa8eaa9de141afc8ea59c" },
//     { title: "Ngồi Khóc Trên Cây", id: "687aa9b0a9de141afc8ea5a0" },
//     { title: "The Shining", id: "687aab5fa9de141afc8ea5a7" },
//     { title: "Dế Mèn phiêu lưu ký", id: "687aac4da9de141afc8ea5ab" },
//     { title: "Becoming", id: "687aaf03a9de141afc8ea5af" },
//     { title: "Tôi thấy hoa vàng trên cỏ xanh", id: "687ab02ca9de141afc8ea5b3" },
//     { title: "The Da Vinci Code", id: "687ab0c9a9de141afc8ea5b7" },
//     { title: "Pride and Prejudice", id: "687ab1bea9de141afc8ea5be" },
//     { title: "Sống Mòn", id: "687ab383a9de141afc8ea5c5" },
//     { title: "Man's Search for Meaning", id: "687ab5d0a9de141afc8ea5cc" },
//     { title: "A Brief History of Time", id: "687ab6d4a9de141afc8ea5d3" },
//     { title: "The Book Thief", id: "687ab95ba9de141afc8ea5da" },
//     { title: "Atomic Habits", id: "687b8566c290a2086476f28f" },
//     { title: "Deep Work", id: "687b7a30c290a2086476f281" },
//     { title: "Đắc Nhân Tâm", id: "687ba752c290a2086476f301" },
//     { title: "Norwegian Wood", id: "687ba60ac290a2086476f2fa" },
//     { title: "Dune", id: "687b908fc290a2086476f2d1" },
//     { title: "The Name of the Wind", id: "687b9143c290a2086476f2d8" },
//     { title: "Hiểu về trái tim", id: "687ba4a2c290a2086476f2f6" },
//     // => Bạn có tổng cộng 51 sách thì thêm hết vào đây
// ];

// // ✅ Sửa hàm này để random đều toàn bộ sách
// function getRandomBook() {
//     return books[Math.floor(Math.random() * books.length)];
// }

// // Hàm mô phỏng hành vi xem thực tế (một số độc giả active hơn)
// function getRandomReader() {
//     const activeReaders = readers.slice(0, 12); // 12 độc giả active
//     const normalReaders = readers.slice(12);    // 13 độc giả bình thường

//     // 65% cơ hội chọn độc giả active, 35% độc giả bình thường
//     if (Math.random() < 0.65) {
//         return activeReaders[Math.floor(Math.random() * activeReaders.length)];
//     } else {
//         return normalReaders[Math.floor(Math.random() * normalReaders.length)];
//     }
// }

// // Hàm tạo ngày xem phân bố đều trong 2 tuần
// function generateDistributedViewDates(targetCount) {
//     const now = new Date();
//     const twoWeeksAgo = new Date();
//     twoWeeksAgo.setDate(now.getDate() - 14);

//     const dates = [];
//     const totalDays = 14;

//     const dayWeights = [];
//     for (let day = 0; day < totalDays; day++) {
//         const weight = Math.max(0.3, 1 - (day * 0.05));
//         dayWeights.push(weight);
//     }

//     const adjustWeightByDayOfWeek = (date, weight) => {
//         const dayOfWeek = date.getDay();
//         const weekdayMultiplier = {
//             0: 0.7,  1: 1.1,  2: 1.2,  3: 1.3,
//             4: 1.2,  5: 1.1,  6: 0.8
//         };
//         return weight * weekdayMultiplier[dayOfWeek];
//     };

//     for (let day = 0; day < totalDays; day++) {
//         const currentDate = new Date(now);
//         currentDate.setDate(now.getDate() - (totalDays - 1 - day));

//         let weight = dayWeights[day];
//         weight = adjustWeightByDayOfWeek(currentDate, weight);

//         const baseCount = Math.floor(targetCount / totalDays * weight);
//         const randomVariation = Math.floor(Math.random() * 4) - 1;
//         const dayCount = Math.max(1, baseCount + randomVariation);

//         for (let i = 0; i < dayCount; i++) {
//             const viewDate = new Date(currentDate);
//             let hour;
//             const hourRand = Math.random();
//             if (hourRand < 0.15) {
//                 hour = 7 + Math.floor(Math.random() * 2);
//             } else if (hourRand < 0.35) {
//                 hour = 9 + Math.floor(Math.random() * 3);
//             } else if (hourRand < 0.45) {
//                 hour = 12 + Math.floor(Math.random() * 2);
//             } else if (hourRand < 0.7) {
//                 hour = 14 + Math.floor(Math.random() * 4);
//             } else {
//                 hour = 18 + Math.floor(Math.random() * 4);
//             }

//             const minute = Math.floor(Math.random() * 60);
//             viewDate.setHours(hour, minute, 0, 0);
//             dates.push(viewDate);
//         }
//     }

//     for (let i = dates.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [dates[i], dates[j]] = [dates[j], dates[i]];
//     }

//     return dates.slice(0, targetCount);
// }

// // Hàm tạo combinations với khả năng duplicate
// function generateViewCombinations(targetCount) {
//     const combinations = [];
//     for (let i = 0; i < targetCount; i++) {
//         const reader = getRandomReader();
//         const book = getRandomBook();
//         combinations.push({ reader, book });
//     }
//     return combinations;
// }

// (async () => {
//     try {
//         console.log("Bat dau tao du lieu luot xem sach phan bo deu trong 2 tuan...\n");

//         const targetViewCount = 500;
//         let successCount = 0;
//         let errorCount = 0;

//         console.log("Dang tao combinations xem sach...");
//         const combinations = generateViewCombinations(targetViewCount);
//         console.log(`Da tao ${combinations.length} combinations\n`);

//         console.log("Dang tao phan bo ngay xem...");
//         const viewDates = generateDistributedViewDates(targetViewCount);
//         console.log(`Da tao ${viewDates.length} ngay xem phan bo deu\n`);

//         for (let i = 0; i < Math.min(combinations.length, viewDates.length); i++) {
//             try {
//                 const combo = combinations[i];
//                 const viewDate = viewDates[i];

//                 const result = await createBookView(combo.book.id, combo.reader.id, viewDate);

//                 if (result) {
//                     successCount++;
//                     const daysAgo = Math.floor((new Date() - viewDate) / (1000 * 60 * 60 * 24));
//                     const timeStr = viewDate.toLocaleTimeString('vi-VN', {
//                         hour: '2-digit',
//                         minute: '2-digit'
//                     });
//                     console.log(`[${successCount}] ${combo.reader.username} xem "${combo.book.title}" - ${daysAgo} ngay truoc luc ${timeStr}`);
//                 }

//                 if (i % 20 === 0) {
//                     await new Promise(resolve => setTimeout(resolve, 30));
//                 }

//             } catch (error) {
//                 errorCount++;
//                 if (errorCount <= 5) {
//                     console.log(`Loi khi tao luot xem: ${error.message}`);
//                 }
//             }

//             if ((i + 1) % 50 === 0) {
//                 console.log(`--- Da xu ly ${i + 1}/${targetViewCount} luot ---`);
//             }
//         }

//         console.log(`\n${'='.repeat(50)}`);
//         console.log(`KET QUA TAO DU LIEU LUOT XEM SACH`);
//         console.log(`${'='.repeat(50)}`);
//         console.log(`Thanh cong: ${successCount} luot xem`);
//         console.log(`Loi: ${errorCount} luot`);
//         console.log(`Tong cong: ${successCount + errorCount} lan thu`);

//         console.log(`\n${'='.repeat(50)}`);
//         console.log(`THONG KE CHI TIET`);
//         console.log(`${'='.repeat(50)}`);
//         console.log(`Ti le thanh cong: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
//         console.log(`Trung binh moi sach: ~${(successCount / books.length).toFixed(1)} luot xem`);
//         console.log(`Trung binh moi doc gia: ~${(successCount / readers.length).toFixed(1)} luot xem`);

//         console.log(`\nPHAN BO THOI GIAN:`);
//         console.log(`Du lieu duoc phan bo trong 14 ngay qua`);
//         console.log(`Ngay gan day nhieu luot xem hon ngay cu`);
//         console.log(`Gio cao diem: 14h-18h (25%) va 18h-22h (30%)`);
//         console.log(`Thu 4 co nhieu luot xem nhat, chu nhat it nhat`);

//         console.log(`\nPHAN TICH HANH VI:`);
//         console.log(`65% luot xem tu doc gia tich cuc`);
//         console.log(`Random deu tren tat ca sach (khong uu tien sach hot)`);

//     } catch (err) {
//         console.error("Loi chung khi chay script:", err.message);
//     }
// })();

//----------------------Delete All Borrow Records-------------------------
// const TheoDoiMuonSach = require('./app/models/theodoimuonsachModel');

// async function deleteAllBorrowRecords() {
//     try {
//         const result = await TheoDoiMuonSach.deleteMany({}); // xóa hết
//         console.log(`🗑️ Đã xóa ${result.deletedCount} lượt mượn sách trong hệ thống.`);
//     } catch (err) {
//         console.error("❌ Lỗi khi xóa dữ liệu mượn sách:", err.message);
//     }
// }

// // // Chạy function
// (async () => {
//     await deleteAllBorrowRecords();
// })();

// // //----------------------Borrow Book with Duplicate Check-------------------------
// const TheoDoiMuonSach = require('./app/models/theodoimuonsachModel');

// // Hàm cho 1 lượt mượn sách
// async function lendBook(data) {
//     try {
//         const { MaSach, MaDocGia, SoLuongMuon, Msnv, NgayMuonCustom } = data;

//         // Kiểm tra xem độc giả này đã mượn sách này chưa
//         const existingBorrow = await TheoDoiMuonSach.findOne({
//             MaSach: MaSach,
//             MaDocGia: MaDocGia,
//             TrangThai: 'approved' // chỉ check những sách đang được mượn
//         });

//         if (existingBorrow) {
//             throw new Error(`Độc giả đang mượn sách này rồi`);
//         }

//         // Ngày mượn: dùng custom nếu có, không thì random trong 2 tuần gần nhất
//         let ngayMuon;
//         if (NgayMuonCustom) {
//             ngayMuon = NgayMuonCustom;
//         } else {
//             const now = new Date();
//             const twoWeeksAgo = new Date();
//             twoWeeksAgo.setDate(now.getDate() - 14);

//             const randomTime = twoWeeksAgo.getTime() + Math.random() * (now.getTime() - twoWeeksAgo.getTime());
//             ngayMuon = new Date(randomTime);
//         }

//         const NgayTra = new Date(ngayMuon);
//         NgayTra.setDate(ngayMuon.getDate() + 7); // cho mượn 1 tuần

//         const record = new TheoDoiMuonSach({
//             MaSach,
//             MaDocGia,
//             SoLuong: SoLuongMuon,
//             TrangThai: 'approved',
//             Msnv,
//             NgayMuon: ngayMuon,
//             NgayTra: NgayTra,
//             NgayGhiNhanTra: null, // luôn null khi tạo mới
//             DaGiaHan: false
//         });

//         const savedRecord = await record.save();
//         return savedRecord;

//     } catch (err) {
//         console.error('Lỗi khi mượn sách:', err.message);
//         throw err;
//     }
// }

// // ================== DATA ===================
// const readers = [
//     { username: "thanhTran", id: "687113ca8d3f5218287b7651" },
//     { username: "hoangTran", id: "68951fb83475df14e828916e" },
//     { username: "hainguyen", id: "689f296763a64118d8c26bcc" },
//     { username: "lanNguyen", id: "689f38b3fb95ec1614eba15d" },
//     { username: "namPham", id: "689f38b3fb95ec1614eba162" },
//     { username: "anhLe", id: "689f38b3fb95ec1614eba167" },
//     { username: "hongVo", id: "689f38b3fb95ec1614eba16c" },
//     { username: "phucNguyen", id: "689f390b0ba6ed16dcf4763f" },
//     { username: "maiTran", id: "689f390b0ba6ed16dcf47645" },
//     { username: "dungLe", id: "689f390b0ba6ed16dcf4764a" },
//     { username: "thuPham", id: "689f390b0ba6ed16dcf4764f" },
//     { username: "khoaVu", id: "689f390c0ba6ed16dcf47654" },
//     { username: "bichDo", id: "689f390c0ba6ed16dcf47659" },
//     { username: "tamNgo", id: "689f390c0ba6ed16dcf4765e" },
//     { username: "yenHuynh", id: "689f390c0ba6ed16dcf47663" },
//     { username: "huyBui", id: "689f390c0ba6ed16dcf47668" },
//     { username: "hoaDang", id: "689f390d0ba6ed16dcf4766d" },
//     { username: "lamTruong", id: "689f394afc24c01b60e1cc9f" },
//     { username: "hanhNguyen", id: "689f394afc24c01b60e1cca4" },
//     { username: "quangPhan", id: "689f394bfc24c01b60e1cca9" },
//     { username: "thuyDinh", id: "689f394bfc24c01b60e1ccae" },
//     { username: "phucVu", id: "689f394bfc24c01b60e1ccb3" },
//     { username: "huongLy", id: "689f394bfc24c01b60e1ccb8" },
//     { username: "datNguyen", id: "689f394bfc24c01b60e1ccbd" },
//     { username: "trangBui", id: "689f394cfc24c01b60e1ccc2" },
//     { username: "sonHoang", id: "689f394cfc24c01b60e1ccc7" },
//     { username: "ngocDoan", id: "689f394cfc24c01b60e1cccc" },
// ];

// const books = [
//     { title: "The Secret Deep", id: "687a67faa9de141afc8ea572" },
//     { title: "Giết con chim nhại", id: "687a9762a9de141afc8ea579" },
//     { title: "Mắt Biếc", id: "687a99b7a9de141afc8ea580" },
//     { title: "The Martian", id: "687a9a9ea9de141afc8ea587" },
//     { title: "The Hobbit", id: "687a9b0fa9de141afc8ea58e" },
//     { title: "1984", id: "687aa878a9de141afc8ea595" },
//     { title: "Tuổi thơ dữ dội", id: "687aa8eaa9de141afc8ea59c" },
//     { title: "Ngồi Khóc Trên Cây", id: "687aa9b0a9de141afc8ea5a0" },
//     { title: "The Shining", id: "687aab5fa9de141afc8ea5a7" },
//     { title: "Dế Mèn phiêu lưu ký", id: "687aac4da9de141afc8ea5ab" },
//     { title: "Becoming", id: "687aaf03a9de141afc8ea5af" },
//     { title: "Tôi thấy hoa vàng trên cỏ xanh", id: "687ab02ca9de141afc8ea5b3" },
//     { title: "The Da Vinci Code", id: "687ab0c9a9de141afc8ea5b7" },
//     { title: "Pride and Prejudice", id: "687ab1bea9de141afc8ea5be" },
//     { title: "Sống Mòn", id: "687ab383a9de141afc8ea5c5" },
//     { title: "Man's Search for Meaning", id: "687ab5d0a9de141afc8ea5cc" },
//     { title: "A Brief History of Time", id: "687ab6d4a9de141afc8ea5d3" },
//     { title: "The Book Thief", id: "687ab95ba9de141afc8ea5da" },
//     { title: "Atomic Habits", id: "687b8566c290a2086476f28f" },
//     { title: "Deep Work", id: "687b7a30c290a2086476f281" },
//     { title: "Đắc Nhân Tâm", id: "687ba752c290a2086476f301" },
//     { title: "Norwegian Wood", id: "687ba60ac290a2086476f2fa" },
//     { title: "Dune", id: "687b908fc290a2086476f2d1" },
//     { title: "The Name of the Wind", id: "687b9143c290a2086476f2d8" },
// ];

// // ================== FUNCTIONS ===================

// // random reader (giữ phân nhóm như cũ)
// function getRandomReaderForBorrow() {
//     const frequentReaders = readers.slice(0, 10);
//     const normalReaders = readers.slice(10, 20);
//     const occasionalReaders = readers.slice(20);

//     const rand = Math.random();
//     if (rand < 0.5) return frequentReaders[Math.floor(Math.random() * frequentReaders.length)];
//     if (rand < 0.8) return normalReaders[Math.floor(Math.random() * normalReaders.length)];
//     return occasionalReaders[Math.floor(Math.random() * occasionalReaders.length)];
// }

// // random sách từ toàn bộ 51 sách
// function getRandomBookForBorrow() {
//     const randomIndex = Math.floor(Math.random() * books.length);
//     return books[randomIndex];
// }

// // random số lượng
// function getRandomBorrowQuantity() {
//     const rand = Math.random();
//     if (rand < 0.75) return 1;
//     if (rand < 0.95) return 2;
//     return 3;
// }

// // random ngày mượn phân bố 14 ngày
// function generateDistributedBorrowDates(targetCount) {
//     const now = new Date();
//     const twoWeeksAgo = new Date();
//     twoWeeksAgo.setDate(now.getDate() - 14);

//     const dates = [];
//     const totalDays = 14;

//     const dayWeights = {
//         0: 0.8,
//         1: 1.2,
//         2: 1.3,
//         3: 1.4,
//         4: 1.3,
//         5: 1.2,
//         6: 0.9
//     };

//     for (let day = 0; day < totalDays; day++) {
//         const currentDate = new Date(twoWeeksAgo);
//         currentDate.setDate(twoWeeksAgo.getDate() + day);

//         const dayOfWeek = currentDate.getDay();
//         const weight = dayWeights[dayOfWeek];

//         const baseCount = Math.floor(targetCount / totalDays * weight);
//         const randomVariation = Math.floor(Math.random() * 3) - 1;
//         const dayCount = Math.max(1, baseCount + randomVariation);

//         for (let i = 0; i < dayCount; i++) {
//             const borrowDate = new Date(currentDate);
//             const hour = 8 + Math.floor(Math.random() * 9);
//             const minute = Math.floor(Math.random() * 60);

//             borrowDate.setHours(hour, minute, 0, 0);
//             dates.push(borrowDate);
//         }
//     }

//     // shuffle
//     for (let i = dates.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [dates[i], dates[j]] = [dates[j], dates[i]];
//     }

//     return dates.slice(0, targetCount);
// }

// // tránh duplicate combination
// function generateUniqueCombinations(targetCount) {
//     const combinations = [];
//     const used = new Set();
//     let attempts = 0;
//     const maxAttempts = targetCount * 5;

//     while (combinations.length < targetCount && attempts < maxAttempts) {
//         const reader = getRandomReaderForBorrow();
//         const book = getRandomBookForBorrow();
//         const quantity = getRandomBorrowQuantity();

//         const key = `${book.id}-${reader.id}`;
//         if (!used.has(key)) {
//             used.add(key);
//             combinations.push({ reader, book, quantity, key });
//         }
//         attempts++;
//     }
//     return combinations;
// }

// // check trong DB
// async function checkExistingCombination(MaSach, MaDocGia) {
//     try {
//         const existing = await TheoDoiMuonSach.findOne({
//             MaSach: MaSach,
//             MaDocGia: MaDocGia,
//             TrangThai: 'approved'
//         });
//         return !!existing;
//     } catch {
//         return false;
//     }
// }

// // ================== MAIN SCRIPT ===================
// (async () => {
//     try {
//         console.log("Bắt đầu tạo dữ liệu mượn sách...\n");

//         const staffId = "6877b60c14b0cc1b10278e45";
//         const targetSuccessCount = 150;

//         let successCount = 0, errorCount = 0, duplicateCount = 0;

//         console.log("Đang tạo combinations...");
//         const combinations = generateUniqueCombinations(targetSuccessCount * 1.2);
//         console.log(`Đã tạo ${combinations.length} combinations\n`);

//         console.log("Đang tạo phân bố ngày mượn...");
//         const borrowDates = generateDistributedBorrowDates(targetSuccessCount);
//         console.log(`Đã tạo ${borrowDates.length} ngày mượn\n`);

//         for (let i = 0; i < Math.min(combinations.length, borrowDates.length); i++) {
//             try {
//                 const combo = combinations[i];
//                 const borrowDate = borrowDates[i];

//                 const exists = await checkExistingCombination(combo.book.id, combo.reader.id);
//                 if (exists) {
//                     duplicateCount++;
//                     console.log(`Bỏ qua: ${combo.reader.username} đã mượn "${combo.book.title}" rồi`);
//                     continue;
//                 }

//                 const result = await lendBook({
//                     MaSach: combo.book.id,
//                     MaDocGia: combo.reader.id,
//                     SoLuongMuon: combo.quantity,
//                     Msnv: staffId,
//                     NgayMuonCustom: borrowDate
//                 });

//                 if (result) {
//                     successCount++;
//                     const formattedDate = borrowDate.toLocaleDateString('vi-VN');
//                     const formattedTime = borrowDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
//                     console.log(`[${successCount}] ${combo.reader.username} mượn ${combo.quantity} cuốn "${combo.book.title}" - ${formattedDate} ${formattedTime}`);
//                 }

//                 if (i % 10 === 0) {
//                     await new Promise(resolve => setTimeout(resolve, 50));
//                 }

//             } catch (error) {
//                 if (error.message.includes('đang mượn sách này rồi')) {
//                     duplicateCount++;
//                 } else {
//                     errorCount++;
//                     console.log(`Lỗi: ${error.message}`);
//                 }
//             }

//             if (successCount >= targetSuccessCount) {
//                 console.log(`\nĐã đạt target ${targetSuccessCount} lượt mượn, dừng lại.`);
//                 break;
//             }
//         }

//         console.log(`\n${'='.repeat(50)}`);
//         console.log(`KẾT QUẢ`);
//         console.log(`${'='.repeat(50)}`);
//         console.log(`Thành công: ${successCount}`);
//         console.log(`Trùng lặp: ${duplicateCount}`);
//         console.log(`Lỗi khác: ${errorCount}`);
//         console.log(`Tổng: ${successCount + duplicateCount + errorCount}`);

//     } catch (err) {
//         console.error("Lỗi chung khi chạy script:", err.message);
//     }
// })();
