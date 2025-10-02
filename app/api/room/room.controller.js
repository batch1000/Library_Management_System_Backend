const roomService = require("./room.service");
const {
  uploadToCloudinary,
  deleteImageFromCloudinary,
} = require("../../services/cloudinary.service");

async function addRoom(req, res) {
  try {
    const { TenPhong, LoaiPhong, SucChua, ViTri, KhungGio } = req.body;

    // Trim dữ liệu chuỗi
    const roomData = {
      TenPhong: TenPhong ? TenPhong.trim() : null,
      LoaiPhong: LoaiPhong ? LoaiPhong.trim() : null,
      SucChua: SucChua,
      ViTri: ViTri ? ViTri.trim() : null,
      KhungGio: KhungGio, // THÊM MỚI
    };
    // Kiểm tra dữ liệu bắt buộc
    if (!roomData.TenPhong || !roomData.LoaiPhong || !roomData.SucChua) {
      return res
        .status(400)
        .send("Thiếu dữ liệu: TenPhong, LoaiPhong hoặc SucChua");
    }

    // THÊM MỚI - Kiểm tra KhungGio
    if (
      !roomData.KhungGio ||
      !Array.isArray(roomData.KhungGio) ||
      roomData.KhungGio.length === 0
    ) {
      return res
        .status(400)
        .send("Thiếu dữ liệu: Phòng phải có ít nhất một khung giờ");
    }

    // THÊM MỚI - Validate từng khung giờ
    for (const slot of roomData.KhungGio) {
      if (!slot.GioBatDau || !slot.GioKetThuc) {
        return res
          .status(400)
          .send("Mỗi khung giờ phải có GioBatDau và GioKetThuc");
      }

      // Kiểm tra logic thời gian
      if (slot.GioBatDau >= slot.GioKetThuc) {
        return res.status(400).send("GioBatDau phải nhỏ hơn GioKetThuc");
      }
    }

    // Gọi service để thêm phòng
    const result = await roomService.addRoom(roomData);

    if (!result) {
      console.log("Thêm phòng thất bại:", roomData);
      return res.status(500).send("Thêm phòng thất bại");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi thêm phòng:", error);
    res.status(500).send("Lỗi khi thêm phòng: " + error.message);
  }
}

async function getAllRoom(req, res) {
  try {
    const result = await roomService.getAllRoom();

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy phòng học nào");
    }
    // console.log("/////////////GetAllRoom/////////////");
    // console.log(JSON.stringify(result, null, 2));
    // console.log("/////////////End GetAllRoom/////////////")
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phòng:", error);
    res.status(500).send("Lỗi khi lấy danh sách phòng");
  }
}

async function updateRoom(req, res) {
  try {
    const { _id, TenPhong, LoaiPhong, SucChua, ViTri, KhungGio } = req.body; // THÊM KhungGio

    if (!_id) {
      return res.status(400).send("Thiếu dữ liệu: _id");
    }

    // Trim dữ liệu chuỗi
    const roomData = {
      _id,
      TenPhong: TenPhong ? TenPhong.trim() : null,
      LoaiPhong: LoaiPhong ? LoaiPhong.trim() : null,
      SucChua: SucChua,
      ViTri: ViTri ? ViTri.trim() : null,
      KhungGio: KhungGio, // THÊM DÒNG NÀY
    };

    // Kiểm tra dữ liệu bắt buộc
    if (!roomData.TenPhong || !roomData.LoaiPhong || !roomData.SucChua) {
      return res
        .status(400)
        .send("Thiếu dữ liệu: TenPhong, LoaiPhong hoặc SucChua");
    }

    // THÊM ĐOẠN NÀY - Kiểm tra KhungGio
    if (
      !roomData.KhungGio ||
      !Array.isArray(roomData.KhungGio) ||
      roomData.KhungGio.length === 0
    ) {
      return res
        .status(400)
        .send("Thiếu dữ liệu: Phòng phải có ít nhất một khung giờ");
    }

    // Validate từng khung giờ
    for (const slot of roomData.KhungGio) {
      if (!slot.GioBatDau || !slot.GioKetThuc) {
        return res
          .status(400)
          .send("Mỗi khung giờ phải có GioBatDau và GioKetThuc");
      }

      if (slot.GioBatDau >= slot.GioKetThuc) {
        return res.status(400).send("GioBatDau phải nhỏ hơn GioKetThuc");
      }
    }
    // HẾT ĐOẠN THÊM

    // Gọi service để cập nhật phòng
    const result = await roomService.updateRoom(roomData);

    if (!result) {
      console.log("Cập nhật phòng thất bại:", roomData);
      return res.status(500).send("Cập nhật phòng thất bại");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi cập nhật phòng:", error);
    res.status(500).send("Lỗi khi cập nhật phòng");
  }
}

async function deleteRoom(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).send("Thiếu dữ liệu: id");
    }

    const result = await roomService.deleteRoom(id);

    if (!result) {
      console.log("Xóa phòng thất bại, id:", id);
      return res.status(404).send("Không tìm thấy phòng để xóa");
    }

    res.json({ message: "Xóa phòng thành công", deletedRoom: result });
  } catch (error) {
    console.error("Lỗi khi xóa phòng:", error);
    res.status(500).send("Lỗi khi xóa phòng");
  }
}

async function getAllBookRoomByUserId(req, res) {
  try {
    const { userId } = req.body; // lấy userId từ body

    if (!userId) {
      return res.status(400).send("Thiếu userId");
    }

    const result = await roomService.getAllBookRoomByUserId(userId);

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy lịch đặt phòng nào");
    }
    // console.log(result);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đặt phòng theo userId:", error);
    res.status(500).send("Lỗi khi lấy danh sách đặt phòng");
  }
}

async function createBooking(req, res) {
  try {
    const { _idDocGia, PhongHoc, NgaySuDung, GioBatDau, GioKetThuc } = req.body;

    // Trim dữ liệu chuỗi
    const bookingData = {
      DocGia: _idDocGia,
      PhongHoc: PhongHoc,
      NgaySuDung: NgaySuDung ? new Date(NgaySuDung) : null,
      GioBatDau: GioBatDau ? GioBatDau.trim() : null,
      GioKetThuc: GioKetThuc ? GioKetThuc.trim() : null,
    };

    // Kiểm tra dữ liệu bắt buộc
    if (
      !bookingData.DocGia ||
      !bookingData.PhongHoc ||
      !bookingData.NgaySuDung ||
      !bookingData.GioBatDau ||
      !bookingData.GioKetThuc
    ) {
      return res
        .status(400)
        .send(
          "Thiếu dữ liệu: DocGia, PhongHoc, NgaySuDung, GioBatDau hoặc GioKetThuc"
        );
    }

    // Validate logic thời gian
    if (bookingData.GioBatDau >= bookingData.GioKetThuc) {
      return res.status(400).send("GioBatDau phải nhỏ hơn GioKetThuc");
    }

    // Gọi service để tạo booking
    const result = await roomService.createBooking(bookingData);

    if (!result) {
      console.log("Tạo booking thất bại:", bookingData);
      return res.status(500).send("Tạo booking thất bại");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi tạo booking:", error);
    res.status(500).send("Lỗi khi tạo booking: " + error.message);
  }
}

async function getAllBookRoomAdmin(req, res) {
  try {
    const result = await roomService.getAllBookRoomAdmin();

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy lịch đặt phòng nào");
    }
    // console.log(result);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đặt phòng (Admin):", error);
    res.status(500).send("Lỗi khi lấy danh sách đặt phòng (Admin)");
  }
}

async function approveBooking(req, res) {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).send("Thiếu bookingId để duyệt");
    }

    // Gọi service để duyệt booking
    const result = await roomService.approveBooking(bookingId);

    if (!result) {
      console.log("Duyệt booking thất bại:", bookingId);
      return res.status(500).send("Duyệt booking thất bại");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi duyệt booking:", error);
    res.status(500).send("Lỗi khi duyệt booking: " + error.message);
  }
}

async function denyBooking(req, res) {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).send("Thiếu bookingId để từ chối");
    }

    // Gọi service để từ chối booking
    const result = await roomService.denyBooking(bookingId);

    if (!result) {
      console.log("Từ chối booking thất bại:", bookingId);
      return res.status(500).send("Từ chối booking thất bại");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi từ chối booking:", error);
    res.status(500).send("Lỗi khi từ chối booking: " + error.message);
  }
}

async function cancelBooking(req, res) {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).send("Thiếu bookingId để hủy");
    }

    const result = await roomService.cancelBooking(bookingId);

    if (!result) {
      console.log("Hủy booking thất bại:", bookingId);
      return res.status(500).send("Hủy booking thất bại");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi hủy booking:", error);
    res.status(500).send("Lỗi khi hủy booking: " + error.message);
  }
}

async function getBookedTimeSlotForRoom(req, res) {
  try {
    const { roomId } = req.body;

    // Kiểm tra dữ liệu bắt buộc
    if (!roomId) {
      return res.status(400).send("Thiếu dữ liệu: roomId");
    }

    // Gọi service để lấy danh sách khung giờ đã duyệt
    const result = await roomService.getBookedTimeSlotForRoom(roomId);

    if (!result || result.length === 0) {
      return res.json([]); // không có lịch thì trả mảng rỗng
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy khung giờ đã đặt:", error);
    res.status(500).send("Lỗi khi lấy khung giờ đã đặt: " + error.message);
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
  cancelBooking,
  getBookedTimeSlotForRoom,
};
