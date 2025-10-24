const mongoose = require("mongoose");

const PhongHoc = require("../../models/phonghocModel");
const ViTriPhong = require("../../models/vitriphongModel");
const TheoDoiDatPhong = require("../../models/theodoimuonphongModel");
const QuyDinhPhongHoc = require("../../models/quydinhphonghocModel");
const DocGia = require("../../models/docgiaModel");

const notificationService = require("../notification/notification.service");

const {
  deleteImageFromCloudinary,
} = require("../../services/cloudinary.service");

async function generateMaPhong() {
  // Tìm phòng có MaPhong lớn nhất (dựa theo sort giảm dần)
  const lastRoom = await PhongHoc.findOne().sort({ MaPhong: -1 }).lean();

  if (!lastRoom || !lastRoom.MaPhong) {
    return "P0001";
  }

  // Lấy số từ MaPhong, ví dụ "P0007" -> 7
  const lastNumber = parseInt(lastRoom.MaPhong.replace("P", ""), 10);

  // Tăng thêm 1
  const newNumber = lastNumber + 1;

  // Format lại với padding 4 số (ví dụ: 8 -> "0008")
  const newMaPhong = "P" + newNumber.toString().padStart(4, "0");

  return newMaPhong;
}

async function addRoom(roomData) {
  if (!roomData.TenPhong || !roomData.LoaiPhong || !roomData.SucChua || !roomData.TienIch) {
    throw new Error("Thiếu thông tin để thêm phòng học.");
  }

  const maPhong = await generateMaPhong();

  let viTriId = null;
  if (roomData.ViTri) {
    let viTriDoc = await ViTriPhong.findOne({ ViTri: roomData.ViTri.trim() });
    if (!viTriDoc) {
      viTriDoc = new ViTriPhong({ ViTri: roomData.ViTri.trim() });
      viTriDoc = await viTriDoc.save();
    }
    viTriId = viTriDoc._id;
  }

  // SỬA - Tạo danh sách chỗ ngồi theo logic đúng
  const choNgoi = [];
  if (roomData.SucChua > 0) {
    const soCho = roomData.SucChua;
    
    // SỬA - Tính số cột và số hàng đúng
    // Ưu tiên chia đều theo hàng ngang
    const soCot = Math.ceil(Math.sqrt(soCho * 1.5)); // Tăng tỷ lệ ngang
    const soHang = Math.ceil(soCho / soCot);
    
    let soChoHienTai = 1;
    for (let hang = 0; hang < soHang; hang++) {
      for (let cot = 0; cot < soCot; cot++) {
        if (soChoHienTai > soCho) break;
        
        const hangChu = String.fromCharCode(65 + hang); // A, B, C...
        const tenCho = `${hangChu}${cot + 1}`;
        
        choNgoi.push({
          SoCho: soChoHienTai,
          HangDoc: hang + 1,      // Hàng dọc (A=1, B=2...)
          HangNgang: cot + 1,     // Cột ngang (1, 2, 3...)
          TenCho: tenCho
        });
        
        soChoHienTai++;
      }
    }
  }

  const newRoom = new PhongHoc({
    MaPhong: maPhong,
    TenPhong: roomData.TenPhong,
    LoaiPhong: roomData.LoaiPhong,
    SucChua: roomData.SucChua,
    ViTri: viTriId,
    TienIch: roomData.TienIch,
    ChoNgoi: choNgoi
  });

  const savedRoom = await newRoom.save();
  return savedRoom;
}

async function getAllRoom() {
  try {
    // Lấy tất cả phòng học kèm vị trí
    const rooms = await PhongHoc.find().populate("ViTri").lean();
    return rooms;
  } catch (err) {
    console.error("Lỗi khi lấy danh sách phòng:", err);
    throw err;
  }
}

async function updateRoom(roomData) {
  if (
    !roomData._id ||
    !roomData.TenPhong ||
    !roomData.LoaiPhong ||
    !roomData.SucChua ||
    !roomData.TienIch
  ) {
    throw new Error("Thiếu thông tin để cập nhật phòng học.");
  }

  let viTriId = null;
  if (roomData.ViTri) {
    let viTriDoc = await ViTriPhong.findOne({ ViTri: roomData.ViTri.trim() });
    if (!viTriDoc) {
      viTriDoc = new ViTriPhong({ ViTri: roomData.ViTri.trim() });
      viTriDoc = await viTriDoc.save();
    }
    viTriId = viTriDoc._id;
  }

  const oldRoom = await PhongHoc.findById(roomData._id);
  
  // SỬA - Nếu sức chứa thay đổi, tạo lại danh sách chỗ ngồi
  let choNgoi = oldRoom.ChoNgoi || [];
  if (oldRoom.SucChua !== roomData.SucChua) {
    choNgoi = [];
    const soCho = roomData.SucChua;
    
    // SỬA - Logic tính toán giống addRoom
    const soCot = Math.ceil(Math.sqrt(soCho * 1.5));
    const soHang = Math.ceil(soCho / soCot);
    
    let soChoHienTai = 1;
    for (let hang = 0; hang < soHang; hang++) {
      for (let cot = 0; cot < soCot; cot++) {
        if (soChoHienTai > soCho) break;
        
        const hangChu = String.fromCharCode(65 + hang);
        const tenCho = `${hangChu}${cot + 1}`;
        
        choNgoi.push({
          SoCho: soChoHienTai,
          HangDoc: hang + 1,
          HangNgang: cot + 1,
          TenCho: tenCho
        });
        
        soChoHienTai++;
      }
    }
  }

  const updateData = {
    TenPhong: roomData.TenPhong,
    LoaiPhong: roomData.LoaiPhong,
    SucChua: roomData.SucChua,
    ViTri: viTriId,
    TienIch: roomData.TienIch,
    ChoNgoi: choNgoi
  };

  const updatedRoom = await PhongHoc.findByIdAndUpdate(
    roomData._id,
    updateData,
    { new: true }
  );

  return updatedRoom;
}

async function deleteRoom(roomId) {
  if (!roomId) {
    throw new Error("Thiếu thông tin _id để xóa phòng học.");
  }

  const room = await PhongHoc.findById(roomId);
  if (!room) {
    throw new Error("Không tìm thấy phòng học để xóa.");
  }

  // Xóa TẤT CẢ booking (kể cả active) - CẢNH BÁO: Có thể ảnh hưởng người dùng
  await TheoDoiDatPhong.deleteMany({ PhongHoc: roomId });

  // Xóa phòng
  const deletedRoom = await PhongHoc.findByIdAndDelete(roomId);

  // Xóa vị trí nếu không còn dùng
  if (deletedRoom.ViTri) {
    const roomsUsingLocation = await PhongHoc.countDocuments({ 
      ViTri: deletedRoom.ViTri 
    });
    
    if (roomsUsingLocation === 0) {
      await ViTriPhong.findByIdAndDelete(deletedRoom.ViTri);
    }
  }

  return deletedRoom;
}

async function getAllBookRoomByUserId(userId) {
  try {
    const bookings = await TheoDoiDatPhong.find({ DocGia: userId })
      .populate({
        path: "PhongHoc",
        populate: { path: "ViTri", model: "ViTriPhong" },
      })
      .populate({
        path: "ThanhVien.DocGia",
        model: "DocGia",
        select: "_id MaDocGia HoLot Ten",
      })
      .lean();

    return bookings.map(function (b) {
      var thanhVienList = [];

      if (b.ThanhVien && Array.isArray(b.ThanhVien)) {
        thanhVienList = b.ThanhVien.map(function (tv) {
          var docGiaInfo = null;
          if (tv.DocGia) {
            var hoLot = tv.DocGia.HoLot ? tv.DocGia.HoLot : "";
            var ten = tv.DocGia.Ten ? tv.DocGia.Ten : "";
            docGiaInfo = {
              _id: tv.DocGia._id,
              MaDocGia: tv.DocGia.MaDocGia,
              HoTen: (hoLot + " " + ten).trim(),
            };
          }
          return {
            _id: tv._id,
            TrangThai: tv.TrangThai,
            DocGia: docGiaInfo,
          };
        });
      }

      return {
        _id: b._id,
        NgayDat: b.NgayDat,
        NgaySuDung: b.NgaySuDung,
        GioBatDau: b.GioBatDau,
        GioKetThuc: b.GioKetThuc,
        TrangThai: b.TrangThai,
        ChoNgoiDaChon: b.ChoNgoiDaChon || [],
        PhongHoc: b.PhongHoc
          ? {
              _id: b.PhongHoc._id,
              MaPhong: b.PhongHoc.MaPhong,
              TenPhong: b.PhongHoc.TenPhong,
              LoaiPhong: b.PhongHoc.LoaiPhong,
              SucChua: b.PhongHoc.SucChua,
              ViTri: b.PhongHoc.ViTri,
              TienIch: b.PhongHoc.TienIch || 'Chưa có thông tin',
              ChoNgoi: b.PhongHoc.ChoNgoi || [],
            }
          : null,
        ThanhVien: thanhVienList,
      };
    });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách đặt phòng theo userId:", err);
    throw err;
  }
}

async function createBooking(bookingData) {
  // THÊM - Validate chỗ ngồi
  if (!bookingData.ChoNgoiDaChon || bookingData.ChoNgoiDaChon.length === 0) {
    throw new Error("Vui lòng chọn chỗ ngồi");
  }

  // THÊM - Validate số lượng chỗ với số người
  const soNguoi = 1 + (bookingData.ThanhVien ? bookingData.ThanhVien.length : 0);
  if (bookingData.ChoNgoiDaChon.length !== soNguoi) {
    throw new Error(`Số chỗ chọn (${bookingData.ChoNgoiDaChon.length}) phải bằng số người (${soNguoi})`);
  }

  // THÊM - Kiểm tra chỗ ngồi có tồn tại trong phòng không
  const room = await PhongHoc.findById(bookingData.PhongHoc);
  if (!room) {
    throw new Error("Không tìm thấy phòng học");
  }

  const validSeats = room.ChoNgoi.map(cho => cho.SoCho);
  const invalidSeats = bookingData.ChoNgoiDaChon.filter(cho => !validSeats.includes(cho));
  if (invalidSeats.length > 0) {
    throw new Error(`Chỗ ngồi không hợp lệ: ${invalidSeats.join(', ')}`);
  }

  // THÊM - Kiểm tra chỗ ngồi đã bị đặt chưa
  const conflictBooking = await TheoDoiDatPhong.findOne({
    PhongHoc: bookingData.PhongHoc,
    NgaySuDung: bookingData.NgaySuDung,
    TrangThai: { $in: ['pending', 'approved', 'waiting_members'] },
    $or: [
      {
        $and: [
          { GioBatDau: { $lt: bookingData.GioKetThuc } },
          { GioKetThuc: { $gt: bookingData.GioBatDau } }
        ]
      }
    ],
    // THÊM - Kiểm tra trùng chỗ ngồi
    ChoNgoiDaChon: { $in: bookingData.ChoNgoiDaChon }
  });

  if (conflictBooking) {
    const trungCho = conflictBooking.ChoNgoiDaChon.filter(cho => 
      bookingData.ChoNgoiDaChon.includes(cho)
    );
    throw new Error(`Chỗ ngồi ${trungCho.join(', ')} đã có người đặt trong khung giờ này`);
  }

  // Phần validation giờ giữ nguyên
  if (!bookingData.GioBatDau || !bookingData.GioKetThuc) {
    throw new Error("Thiếu thông tin giờ bắt đầu hoặc giờ kết thúc");
  }

  if (bookingData.GioBatDau >= bookingData.GioKetThuc) {
    throw new Error("Giờ bắt đầu phải nhỏ hơn giờ kết thúc");
  }

  let thanhVienData = [];
  let trangThai = "pending";

  if (bookingData.ThanhVien && bookingData.ThanhVien.length > 0) {
    thanhVienData = bookingData.ThanhVien.map((memberId) => ({
      DocGia: memberId,
      TrangThai: "invited",
    }));
    trangThai = "waiting_members";
  }

  const newBooking = new TheoDoiDatPhong({
    NgaySuDung: bookingData.NgaySuDung,
    GioBatDau: bookingData.GioBatDau,
    GioKetThuc: bookingData.GioKetThuc,
    PhongHoc: bookingData.PhongHoc,
    DocGia: bookingData.DocGia,
    ThanhVien: thanhVienData,
    TrangThai: trangThai,
    ChoNgoiDaChon: bookingData.ChoNgoiDaChon // THÊM dòng này
  });

  const savedBooking = await newBooking.save();

  await savedBooking.populate([
    { path: "PhongHoc" },
    { path: "DocGia" },
    { path: "ThanhVien.DocGia" },
  ]);

  return savedBooking;
}

async function getAllBookRoomAdmin() {
  try {
    const bookings = await TheoDoiDatPhong.find()
      .populate({
        path: "PhongHoc",
        populate: { path: "ViTri" } 
      })
      .populate("DocGia")
      .populate("ThanhVien.DocGia")
      .lean();

    return bookings.map((b) => ({
      _id: b._id,
      NgayDat: b.NgayDat,
      NgaySuDung: b.NgaySuDung,
      GioBatDau: b.GioBatDau,
      GioKetThuc: b.GioKetThuc,
      TrangThai: b.TrangThai,
      ChoNgoiDaChon: b.ChoNgoiDaChon || [],

      PhongHoc: b.PhongHoc
        ? {
            _id: b.PhongHoc._id,
            MaPhong: b.PhongHoc.MaPhong,
            TenPhong: b.PhongHoc.TenPhong,
            LoaiPhong: b.PhongHoc.LoaiPhong,
            SucChua: b.PhongHoc.SucChua,
            TienIch: b.PhongHoc.TienIch || '',
            ChoNgoi: b.PhongHoc.ChoNgoi || [], 
            ViTri: b.PhongHoc.ViTri 
          }
        : null,

      DocGia: b.DocGia
        ? {
            _id: b.DocGia._id,
            MaDocGia: b.DocGia.MaDocGia,
            HoLot: b.DocGia.HoLot,
            Ten: b.DocGia.Ten,
          }
        : null,

      // THÊM phần này để trả về thành viên
      ThanhVien:
        b.ThanhVien && b.ThanhVien.length > 0
          ? b.ThanhVien.map((tv) => ({
              DocGia: tv.DocGia
                ? {
                    _id: tv.DocGia._id,
                    MaDocGia: tv.DocGia.MaDocGia,
                    HoLot: tv.DocGia.HoLot,
                    Ten: tv.DocGia.Ten,
                  }
                : null,
              TrangThai: tv.TrangThai,
            }))
          : [],
    }));
  } catch (err) {
    console.error("Lỗi khi lấy danh sách đặt phòng (Admin):", err);
    throw err;
  }
}

async function approveBooking(bookingId) {
  if (!bookingId) {
    throw new Error("Thiếu bookingId để duyệt.");
  }

  // Tìm booking cần duyệt
  const booking = await TheoDoiDatPhong.findById(bookingId).populate(
    "PhongHoc"
  );

  if (!booking) {
    throw new Error("Không tìm thấy booking.");
  }

  if (booking.TrangThai !== "pending") {
    throw new Error("Chỉ có thể duyệt booking đang ở trạng thái pending.");
  }

  // ===== TÌM VÀ TỪ CHỐI TẤT CẢ BOOKING PENDING KHÁC TRÙNG PHÒNG, NGÀY, GIỜ =====
  const conflictingBookings = await TheoDoiDatPhong.find({
    _id: { $ne: bookingId }, // Không phải booking hiện tại
    PhongHoc: booking.PhongHoc,
    NgaySuDung: booking.NgaySuDung,
    TrangThai: "pending", // Chỉ lấy pending
  }).populate("PhongHoc");

  // Lọc các booking trùng giờ
  const pendingConflicts = conflictingBookings.filter((b) =>
    checkTimeOverlap(
      booking.GioBatDau,
      booking.GioKetThuc,
      b.GioBatDau,
      b.GioKetThuc
    )
  );

  // Từ chối tất cả booking pending trùng giờ
  for (const conflictBooking of pendingConflicts) {
    conflictBooking.TrangThai = "denied";
    await conflictBooking.save();

    // Gửi thông báo cho người bị từ chối
    try {
      await notificationService.createNotification({
        DocGia: conflictBooking.DocGia,
        TieuDe: "Đặt phòng bị từ chối",
        NoiDung: `Đặt phòng ${
          conflictBooking.PhongHoc.TenPhong || "phòng học"
        } vào ngày ${conflictBooking.NgaySuDung.toLocaleDateString(
          "vi-VN"
        )} lúc ${conflictBooking.GioBatDau} - ${
          conflictBooking.GioKetThuc
        } đã bị từ chối do phòng đã được đặt bởi người khác.`,
        LoaiThongBao: "error",
      });
    } catch (notifErr) {
      console.error(
        `Lỗi tạo thông báo cho booking ${conflictBooking._id}:`,
        notifErr.message
      );
    }
  }

  // ===== DUYỆT BOOKING =====
  const updatedBooking = await TheoDoiDatPhong.findByIdAndUpdate(
    bookingId,
    {
      TrangThai: "approved",
      NgayDuyet: new Date(),
    },
    { new: true }
  ).populate("PhongHoc");

  return updatedBooking;
}

async function denyBooking(bookingId) {
  if (!bookingId) {
    throw new Error("Thiếu bookingId để từ chối.");
  }

  const updatedBooking = await TheoDoiDatPhong.findByIdAndUpdate(
    bookingId,
    {
      TrangThai: "denied",
      NgayDuyet: new Date(),
    },
    { new: true }
  );

  return updatedBooking;
}

async function cancelBooking(bookingId) {
  if (!bookingId) {
    throw new Error("Thiếu bookingId để hủy.");
  }

  const updatedBooking = await TheoDoiDatPhong.findByIdAndUpdate(
    bookingId,
    {
      TrangThai: "canceled",
      NgayDuyet: new Date(),
    },
    { new: true }
  );

  return updatedBooking;
}

async function checkInRoom(bookingId) {
  if (!bookingId) {
    throw new Error("Thiếu bookingId để check-in.");
  }

  const updatedBooking = await TheoDoiDatPhong.findByIdAndUpdate(
    bookingId,
    {
      TrangThai: "checked_in",
    },
    { new: true }
  );

  return updatedBooking;
}

async function getBookedTimeSlotForRoom(roomId) {
  if (!roomId) {
    throw new Error("Thiếu thông tin: roomId");
  }

  // Lấy tất cả các booking đã duyệt của phòng đó
  const bookedSlots = await TheoDoiDatPhong.find({
    PhongHoc: roomId,
    TrangThai: "approved",
  }).select("NgaySuDung GioBatDau GioKetThuc -_id");

  return bookedSlots;
}

async function getRoomRule() {
  try {
    const rule = await QuyDinhPhongHoc.findOne().sort({ updatedAt: -1 }).exec();
    return rule;
  } catch (error) {
    console.error("Lỗi service: getRoomRule", error);
    throw error;
  }
}

async function updateRoomRule(ruleUpdates) {
  try {
    const updatedRule = await QuyDinhPhongHoc.findOneAndUpdate(
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
    console.error("❌ Lỗi service updateRoomRule:", err);
    throw err;
  }
}

async function searchMemberByCode(MaDocGia) {
  if (!MaDocGia) {
    throw new Error("Thiếu thông tin: MaDocGia");
  }

  // Tìm độc giả theo mã (MaDocGia)
  const member = await DocGia.findOne({ MaDocGia }).lean();

  return member; // có thể là null nếu không tìm thấy
}

async function getMyInvitations(userId) {
  try {
    // Tìm tất cả booking có chứa userId trong danh sách Thành Viên
    const invitations = await TheoDoiDatPhong.find({
      "ThanhVien.DocGia": userId,
    })
      .populate({
        path: "PhongHoc",
        select: "_id MaPhong TenPhong",
      })
      .populate({
        path: "DocGia", // người mời (chủ phòng)
        select: "_id HoLot Ten",
      })
      .lean();

    // Xử lý dữ liệu trả về cho frontend
    return invitations.flatMap((booking) => {
      // Tìm trong danh sách thành viên đúng userId
      const myMemberInfo = booking.ThanhVien.find(
        (tv) => tv.DocGia && tv.DocGia.toString() === userId
      );

      if (!myMemberInfo) return []; // Không có lời mời của user này trong booking

      return [
        {
          _id: booking._id, // giữ lại để frontend dùng nếu cần
          bookingId: booking._id,
          PhongHoc: booking.PhongHoc
            ? {
                _id: booking.PhongHoc._id,
                MaPhong: booking.PhongHoc.MaPhong,
                TenPhong: booking.PhongHoc.TenPhong,
                ChoNgoi: booking.PhongHoc.ChoNgoi || [],
              }
            : null,
          NgaySuDung: booking.NgaySuDung,
          GioBatDau: booking.GioBatDau,
          GioKetThuc: booking.GioKetThuc,
          TrangThai: myMemberInfo.TrangThai,
          ChoNgoiDaChon: booking.ChoNgoiDaChon || [],
          DocGia: booking.DocGia
            ? {
                _id: booking.DocGia._id,
                HoLot: booking.DocGia.HoLot,
                Ten: booking.DocGia.Ten,
              }
            : null,
        },
      ];
    });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách lời mời:", err);
    throw err;
  }
}

async function respondToInvitation(bookingId, memberId, status) {
  try {
    const booking = await TheoDoiDatPhong.findById(bookingId);
    if (!booking) return null;

    const member = booking.ThanhVien.find(
      (tv) => tv.DocGia && tv.DocGia.toString() === memberId
    );
    if (!member) return null;

    // ⭐ THÊM: Kiểm tra đụng độ khi status là 'accepted'
    if (status === "accepted") {
      const conflictCheck = await checkMemberConflict(
        memberId,
        booking.NgaySuDung,
        booking.GioBatDau,
        booking.GioKetThuc
      );

      if (conflictCheck.hasConflict) {
        const error = new Error("CONFLICT");
        error.status = 409;
        throw error;
      }
    }

    member.TrangThai = status;

    const allAccepted = booking.ThanhVien.every(
      (tv) => tv.TrangThai === "accepted"
    );
    const anyDeclined = booking.ThanhVien.some(
      (tv) => tv.TrangThai === "declined"
    );

    if (anyDeclined) {
      booking.TrangThai = "canceled";
    } else if (allAccepted) {
      booking.TrangThai = "pending";
    }

    await booking.save();
    return booking;
  } catch (err) {
    console.error("Lỗi khi cập nhật lời mời:", err);
    throw err;
  }
}

function checkTimeOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

async function checkMemberConflict(
  memberId,
  ngaySuDung,
  gioBatDau,
  gioKetThuc
) {
  try {
    // Chuyển ngaySuDung thành Date object để so sánh
    const checkDate = new Date(ngaySuDung);
    const startOfDay = new Date(checkDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(checkDate.setHours(23, 59, 59, 999));

    // Tìm tất cả booking của memberId trong ngày đó với status active
    const bookings = await TheoDoiDatPhong.find({
      DocGia: memberId,
      NgaySuDung: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      TrangThai: { $in: ["pending", "approved"] },
    }).lean();

    // Kiểm tra xem có đụng độ giờ không
    let hasConflict = false;
    let conflictDetails = null;

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];

      // Kiểm tra trùng giờ
      if (
        checkTimeOverlap(
          gioBatDau,
          gioKetThuc,
          booking.GioBatDau,
          booking.GioKetThuc
        )
      ) {
        hasConflict = true;
        conflictDetails = {
          bookingId: booking._id,
          gioBatDau: booking.GioBatDau,
          gioKetThuc: booking.GioKetThuc,
        };
        break;
      }
    }

    // Kiểm tra thêm: memberId có là thành viên của booking nào khác không
    const memberBookings = await TheoDoiDatPhong.find({
      "ThanhVien.DocGia": memberId,
      "ThanhVien.TrangThai": { $in: ["invited", "accepted"] },
      NgaySuDung: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      TrangThai: { $in: ["pending", "approved"] },
    }).lean();

    if (!hasConflict && memberBookings.length > 0) {
      for (let i = 0; i < memberBookings.length; i++) {
        const booking = memberBookings[i];

        if (
          checkTimeOverlap(
            gioBatDau,
            gioKetThuc,
            booking.GioBatDau,
            booking.GioKetThuc
          )
        ) {
          hasConflict = true;
          conflictDetails = {
            bookingId: booking._id,
            gioBatDau: booking.GioBatDau,
            gioKetThuc: booking.GioKetThuc,
            isMember: true,
          };
          break;
        }
      }
    }

    return {
      hasConflict: hasConflict,
      conflictDetails: conflictDetails,
    };
  } catch (err) {
    console.error("Lỗi khi kiểm tra đụng độ lịch thành viên:", err);
    throw err;
  }
}

async function getBookingsAsMember(userId) {
  try {
    // Tìm các booking mà userId là thành viên
    const bookings = await TheoDoiDatPhong.find({
      "ThanhVien.DocGia": userId,
      "ThanhVien.TrangThai": "accepted", // Chỉ lấy booking đã chấp nhận
    })
      .populate({
        path: "PhongHoc",
        populate: { path: "ViTri", model: "ViTriPhong" },
      })
      .populate({
        path: "DocGia", // Người đặt phòng
        model: "DocGia",
        select: "_id MaDocGia HoLot Ten",
      })
      .populate({
        path: "ThanhVien.DocGia",
        model: "DocGia",
        select: "_id MaDocGia HoLot Ten",
      })
      .lean();

    return bookings.map(function (b) {
      var thanhVienList = [];

      if (b.ThanhVien && Array.isArray(b.ThanhVien)) {
        thanhVienList = b.ThanhVien.map(function (tv) {
          var docGiaInfo = null;
          if (tv.DocGia) {
            var hoLot = tv.DocGia.HoLot ? tv.DocGia.HoLot : "";
            var ten = tv.DocGia.Ten ? tv.DocGia.Ten : "";
            docGiaInfo = {
              _id: tv.DocGia._id,
              MaDocGia: tv.DocGia.MaDocGia,
              HoTen: (hoLot + " " + ten).trim(),
            };
          }
          return {
            _id: tv._id,
            TrangThai: tv.TrangThai,
            DocGia: docGiaInfo,
          };
        });
      }

      // Thông tin người đặt phòng
      var nguoiDatPhong = null;
      if (b.DocGia) {
        var hoLot = b.DocGia.HoLot ? b.DocGia.HoLot : "";
        var ten = b.DocGia.Ten ? b.DocGia.Ten : "";
        nguoiDatPhong = {
          _id: b.DocGia._id,
          MaDocGia: b.DocGia.MaDocGia,
          HoLot: b.DocGia.HoLot,
          Ten: b.DocGia.Ten,
          HoTen: (hoLot + " " + ten).trim(),
        };
      }

      return {
        _id: b._id,
        NgayDat: b.NgayDat,
        NgaySuDung: b.NgaySuDung,
        GioBatDau: b.GioBatDau,
        GioKetThuc: b.GioKetThuc,
        TrangThai: b.TrangThai,
        ChoNgoiDaChon: b.ChoNgoiDaChon || [],
        PhongHoc: b.PhongHoc
          ? {
              _id: b.PhongHoc._id,
              MaPhong: b.PhongHoc.MaPhong,
              TenPhong: b.PhongHoc.TenPhong,
              LoaiPhong: b.PhongHoc.LoaiPhong,
              SucChua: b.PhongHoc.SucChua,
              ViTri: b.PhongHoc.ViTri,
              TienIch: b.PhongHoc.TienIch || 'Chưa có thông tin',
              ChoNgoi: b.PhongHoc.ChoNgoi || [],
            }
          : null,
        DocGia: nguoiDatPhong, // Thông tin người đặt phòng
        ThanhVien: thanhVienList,
      };
    });
  } catch (err) {
    console.error(
      "Lỗi khi lấy danh sách đặt phòng với tư cách thành viên:",
      err
    );
    throw err;
  }
}

async function getAvailableSeats(phongHocId, ngaySuDung, gioBatDau, gioKetThuc) {
  if (!phongHocId || !ngaySuDung || !gioBatDau || !gioKetThuc) {
    throw new Error("Thiếu thông tin để kiểm tra chỗ trống");
  }

  // Lấy thông tin phòng
  const room = await PhongHoc.findById(phongHocId);
  if (!room) {
    throw new Error("Không tìm thấy phòng học");
  }

  // Lấy tất cả chỗ ngồi của phòng
  const allSeats = room.ChoNgoi.map(cho => cho.SoCho);

  // Tìm các booking trùng thời gian
  const conflictBookings = await TheoDoiDatPhong.find({
    PhongHoc: phongHocId,
    NgaySuDung: new Date(ngaySuDung),
    TrangThai: { $in: ['approved'] },
    $or: [
      {
        $and: [
          { GioBatDau: { $lt: gioKetThuc } },
          { GioKetThuc: { $gt: gioBatDau } }
        ]
      }
    ]
  });

  // Lấy danh sách chỗ đã đặt
  const bookedSeats = [];
  conflictBookings.forEach(booking => {
    if (booking.ChoNgoiDaChon && booking.ChoNgoiDaChon.length > 0) {
      bookedSeats.push(...booking.ChoNgoiDaChon);
    }
  });

  // Tính chỗ còn trống
  const availableSeats = allSeats.filter(seat => !bookedSeats.includes(seat));

  return {
    allSeats: room.ChoNgoi,
    bookedSeats: bookedSeats,
    availableSeats: availableSeats,
    totalSeats: allSeats.length,
    availableCount: availableSeats.length
  };
}

async function getRoomById(roomId) {
  if (!roomId) {
    throw new Error("Thiếu roomId");
  }
  
  const room = await PhongHoc.findById(roomId).populate('ViTri').lean();
  return room;
}

module.exports = {
  addRoom,
  getAllRoom,
  updateRoom,
  deleteRoom,
  getAllBookRoomByUserId,
  createBooking,
  getAllBookRoomAdmin,
  approveBooking,
  denyBooking,
  getBookedTimeSlotForRoom,
  cancelBooking,
  getRoomRule,
  updateRoomRule,
  checkInRoom,
  searchMemberByCode,
  getMyInvitations,
  respondToInvitation,
  checkMemberConflict,
  getBookingsAsMember,
  getAvailableSeats,
  getRoomById
};
