const mongoose = require("mongoose");

const PhongHoc = require("../../models/phonghocModel");
const ViTriPhong = require("../../models/vitriphongModel");
const KhungGio = require("../../models/khunggioModel");
const TheoDoiDatPhong = require("../../models/theodoimuonphongModel");
const QuyDinhPhongHoc = require("../../models/quydinhphonghocModel");
const DocGia = require("../../models/docgiaModel");

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
  if (!roomData.TenPhong || !roomData.LoaiPhong || !roomData.SucChua) {
    throw new Error("Thiếu thông tin để thêm phòng học.");
  }

  // THÊM MỚI - Validate KhungGio
  if (
    !roomData.KhungGio ||
    !Array.isArray(roomData.KhungGio) ||
    roomData.KhungGio.length === 0
  ) {
    throw new Error("Phòng học phải có ít nhất một khung giờ.");
  }

  const maPhong = await generateMaPhong();

  let viTriId = null;
  if (roomData.ViTri) {
    // Tìm vị trí đã tồn tại chưa
    let viTriDoc = await ViTriPhong.findOne({ ViTri: roomData.ViTri.trim() });

    if (!viTriDoc) {
      // Nếu chưa có thì tạo mới
      viTriDoc = new ViTriPhong({ ViTri: roomData.ViTri.trim() });
      viTriDoc = await viTriDoc.save();
    }

    viTriId = viTriDoc._id;
  }

  // Tạo phòng học
  const newRoom = new PhongHoc({
    MaPhong: maPhong,
    TenPhong: roomData.TenPhong,
    LoaiPhong: roomData.LoaiPhong,
    SucChua: roomData.SucChua,
    ViTri: viTriId,
  });

  const savedRoom = await newRoom.save();

  // THÊM MỚI - Tạo các khung giờ cho phòng
  const khungGioPromises = roomData.KhungGio.map((slot) => {
    const khungGio = new KhungGio({
      PhongHoc: savedRoom._id,
      GioBatDau: slot.GioBatDau,
      GioKetThuc: slot.GioKetThuc,
    });
    return khungGio.save();
  });

  await Promise.all(khungGioPromises);

  return savedRoom;
}

async function getAllRoom() {
  try {
    // Lấy tất cả phòng học kèm vị trí
    const rooms = await PhongHoc.find().populate("ViTri").lean();

    // Lấy danh sách khung giờ theo từng phòng
    const roomIds = rooms.map((r) => r._id);
    const allTimeSlots = await KhungGio.find({
      PhongHoc: { $in: roomIds },
    }).lean();

    // Gắn khung giờ vào từng phòng
    const roomsWithSlots = rooms.map((room) => {
      const slots = allTimeSlots.filter(
        (slot) => String(slot.PhongHoc) === String(room._id)
      );
      return {
        ...room,
        KhungGio: slots.map((s) => ({
          GioBatDau: s.GioBatDau,
          GioKetThuc: s.GioKetThuc,
          _id: s._id,
        })),
      };
    });

    return roomsWithSlots;
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
    !roomData.SucChua
  ) {
    throw new Error("Thiếu thông tin để cập nhật phòng học.");
  }

  // THÊM MỚI - Validate KhungGio
  if (
    !roomData.KhungGio ||
    !Array.isArray(roomData.KhungGio) ||
    roomData.KhungGio.length === 0
  ) {
    throw new Error("Phòng học phải có ít nhất một khung giờ.");
  }

  let viTriId = null;
  if (roomData.ViTri) {
    // Tìm vị trí đã tồn tại chưa
    let viTriDoc = await ViTriPhong.findOne({ ViTri: roomData.ViTri.trim() });

    if (!viTriDoc) {
      // Nếu chưa có thì tạo mới
      viTriDoc = new ViTriPhong({ ViTri: roomData.ViTri.trim() });
      viTriDoc = await viTriDoc.save();
    }

    viTriId = viTriDoc._id;
  }

  // Tạo object cập nhật
  const updateData = {
    TenPhong: roomData.TenPhong,
    LoaiPhong: roomData.LoaiPhong,
    SucChua: roomData.SucChua,
    ViTri: viTriId,
  };

  const updatedRoom = await PhongHoc.findByIdAndUpdate(
    roomData._id,
    updateData,
    { new: true } // trả về document sau khi cập nhật
  );

  // THÊM MỚI - Xóa tất cả khung giờ cũ của phòng này
  await KhungGio.deleteMany({ PhongHoc: roomData._id });

  // THÊM MỚI - Tạo lại các khung giờ mới
  const khungGioPromises = roomData.KhungGio.map((slot) => {
    const khungGio = new KhungGio({
      PhongHoc: roomData._id,
      GioBatDau: slot.GioBatDau,
      GioKetThuc: slot.GioKetThuc,
    });
    return khungGio.save();
  });

  await Promise.all(khungGioPromises);
  // HẾT PHẦN THÊM MỚI

  return updatedRoom;
}

async function deleteRoom(roomId) {
  if (!roomId) {
    throw new Error("Thiếu thông tin _id để xóa phòng học.");
  }

  // Xóa phòng theo _id
  const deletedRoom = await PhongHoc.findByIdAndDelete(roomId);

  return deletedRoom; // nếu null thì controller sẽ xử lý trả 404
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
        PhongHoc: b.PhongHoc
          ? {
              _id: b.PhongHoc._id,
              MaPhong: b.PhongHoc.MaPhong,
              TenPhong: b.PhongHoc.TenPhong,
              LoaiPhong: b.PhongHoc.LoaiPhong,
              SucChua: b.PhongHoc.SucChua,
              ViTri: b.PhongHoc.ViTri,
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
  let thanhVienData = [];
  let trangThai = "pending"; // ← Mặc định là pending (phòng cá nhân)

  if (bookingData.ThanhVien && bookingData.ThanhVien.length > 0) {
    thanhVienData = bookingData.ThanhVien.map((memberId) => ({
      DocGia: memberId,
      TrangThai: "invited",
    }));

    trangThai = "waiting_members"; // ← Phòng nhóm chờ thành viên chấp nhận
  }

  const newBooking = new TheoDoiDatPhong({
    NgaySuDung: bookingData.NgaySuDung,
    GioBatDau: bookingData.GioBatDau,
    GioKetThuc: bookingData.GioKetThuc,
    PhongHoc: bookingData.PhongHoc,
    DocGia: bookingData.DocGia,
    ThanhVien: thanhVienData,
    TrangThai: trangThai, // ← SỬA: Dùng biến trangThai động
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
      .populate("PhongHoc")
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

      PhongHoc: b.PhongHoc
        ? {
            _id: b.PhongHoc._id,
            MaPhong: b.PhongHoc.MaPhong,
            TenPhong: b.PhongHoc.TenPhong,
            LoaiPhong: b.PhongHoc.LoaiPhong,
            SucChua: b.PhongHoc.SucChua,
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

  // Tìm booking và cập nhật trạng thái
  const updatedBooking = await TheoDoiDatPhong.findByIdAndUpdate(
    bookingId,
    {
      TrangThai: "approved",
      NgayDuyet: new Date(),
    },
    { new: true } // Trả về document sau khi update
  );

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
              }
            : null,
          NgaySuDung: booking.NgaySuDung,
          GioBatDau: booking.GioBatDau,
          GioKetThuc: booking.GioKetThuc,
          TrangThai: myMemberInfo.TrangThai, // invited / accepted / declined
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

    // Tìm thành viên trong danh sách ThanhVien
    const member = booking.ThanhVien.find(
      (tv) => tv.DocGia && tv.DocGia.toString() === memberId
    );
    if (!member) return null;

    // Cập nhật trạng thái của thành viên đó
    member.TrangThai = status;

    // Kiểm tra tổng thể các thành viên
    const allAccepted = booking.ThanhVien.every(
      (tv) => tv.TrangThai === "accepted"
    );
    const anyDeclined = booking.ThanhVien.some(
      (tv) => tv.TrangThai === "declined"
    );

    // Cập nhật trạng thái tổng thể của booking
    if (anyDeclined) {
      booking.TrangThai = "canceled";
    } else if (allAccepted) {
      booking.TrangThai = "pending";
    }

    // Lưu thay đổi
    await booking.save();

    return booking;
  } catch (err) {
    console.error("Lỗi khi cập nhật lời mời:", err);
    throw err;
  }
}

// Hàm helper kiểm tra trùng giờ
function checkTimeOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

async function checkMemberConflict(memberId, ngaySuDung, gioBatDau, gioKetThuc) {
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
        $lte: endOfDay
      },
      TrangThai: { $in: ['pending', 'approved'] }
    }).lean();

    // Kiểm tra xem có đụng độ giờ không
    let hasConflict = false;
    let conflictDetails = null;

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      
      // Kiểm tra trùng giờ
      if (checkTimeOverlap(gioBatDau, gioKetThuc, booking.GioBatDau, booking.GioKetThuc)) {
        hasConflict = true;
        conflictDetails = {
          bookingId: booking._id,
          gioBatDau: booking.GioBatDau,
          gioKetThuc: booking.GioKetThuc
        };
        break;
      }
    }

    // Kiểm tra thêm: memberId có là thành viên của booking nào khác không
    const memberBookings = await TheoDoiDatPhong.find({
      'ThanhVien.DocGia': memberId,
      'ThanhVien.TrangThai': { $in: ['invited', 'accepted'] },
      NgaySuDung: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      TrangThai: { $in: ['pending', 'approved'] }
    }).lean();

    if (!hasConflict && memberBookings.length > 0) {
      for (let i = 0; i < memberBookings.length; i++) {
        const booking = memberBookings[i];
        
        if (checkTimeOverlap(gioBatDau, gioKetThuc, booking.GioBatDau, booking.GioKetThuc)) {
          hasConflict = true;
          conflictDetails = {
            bookingId: booking._id,
            gioBatDau: booking.GioBatDau,
            gioKetThuc: booking.GioKetThuc,
            isMember: true
          };
          break;
        }
      }
    }

    return {
      hasConflict: hasConflict,
      conflictDetails: conflictDetails
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
      'ThanhVien.DocGia': userId,
      'ThanhVien.TrangThai': 'accepted' // Chỉ lấy booking đã chấp nhận
    })
      .populate({
        path: "PhongHoc",
        populate: { path: "ViTri", model: "ViTriPhong" },
      })
      .populate({
        path: "DocGia", // Người đặt phòng
        model: "DocGia",
        select: "_id MaDocGia HoLot Ten"
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
          HoTen: (hoLot + " " + ten).trim()
        };
      }

      return {
        _id: b._id,
        NgayDat: b.NgayDat,
        NgaySuDung: b.NgaySuDung,
        GioBatDau: b.GioBatDau,
        GioKetThuc: b.GioKetThuc,
        TrangThai: b.TrangThai,
        PhongHoc: b.PhongHoc
          ? {
              _id: b.PhongHoc._id,
              MaPhong: b.PhongHoc.MaPhong,
              TenPhong: b.PhongHoc.TenPhong,
              LoaiPhong: b.PhongHoc.LoaiPhong,
              SucChua: b.PhongHoc.SucChua,
              ViTri: b.PhongHoc.ViTri,
            }
          : null,
        DocGia: nguoiDatPhong, // Thông tin người đặt phòng
        ThanhVien: thanhVienList,
      };
    });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách đặt phòng với tư cách thành viên:", err);
    throw err;
  }
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
  getBookingsAsMember
};
