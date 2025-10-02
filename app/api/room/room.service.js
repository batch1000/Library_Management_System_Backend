const mongoose = require("mongoose");

const PhongHoc = require("../../models/phonghocModel");
const ViTriPhong = require("../../models/vitriphongModel");
const KhungGio = require("../../models/khunggioModel");
const TheoDoiDatPhong = require("../../models/theodoimuonphongModel");

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
    // Tìm tất cả booking có DocGia = userId
    const bookings = await TheoDoiDatPhong.find({ DocGia: userId })
      .populate({
        path: "PhongHoc",
        populate: {
          path: "ViTri", // Populate thêm ViTri
          model: "ViTriPhong",
        },
      })
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
            ViTri: b.PhongHoc.ViTri, // Thêm dòng này - giờ đã có full object ViTri
          }
        : null,
    }));
  } catch (err) {
    console.error("Lỗi khi lấy danh sách đặt phòng theo userId:", err);
    throw err;
  }
}

async function createBooking(bookingData) {
  if (
    !bookingData.DocGia ||
    !bookingData.PhongHoc ||
    !bookingData.NgaySuDung ||
    !bookingData.GioBatDau ||
    !bookingData.GioKetThuc
  ) {
    throw new Error("Thiếu thông tin để tạo booking.");
  }

  // Tạo đối tượng booking mới
  const newBooking = new TheoDoiDatPhong({
    NgaySuDung: bookingData.NgaySuDung,
    GioBatDau: bookingData.GioBatDau,
    GioKetThuc: bookingData.GioKetThuc,
    PhongHoc: bookingData.PhongHoc,
    DocGia: bookingData.DocGia,
    TrangThai: "pending", // Mặc định
  });

  // Lưu booking
  const savedBooking = await newBooking.save();

  return savedBooking;
}

async function getAllBookRoomAdmin() {
  try {
    // Lấy tất cả lịch đặt phòng, populate cả PhongHoc, DocGia, NhanVien
    const bookings = await TheoDoiDatPhong.find()
      .populate("PhongHoc")
      .populate("DocGia")
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
  cancelBooking
};
