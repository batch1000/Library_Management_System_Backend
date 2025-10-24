const roomService = require("./room.service");
const {
  uploadToCloudinary,
  deleteImageFromCloudinary,
} = require("../../services/cloudinary.service");

async function addRoom(req, res) {
  try {
    const { TenPhong, LoaiPhong, SucChua, ViTri, TienIch} = req.body;

    // Trim dữ liệu chuỗi
    const roomData = {
      TenPhong: TenPhong ? TenPhong.trim() : null,
      LoaiPhong: LoaiPhong ? LoaiPhong.trim() : null,
      SucChua: SucChua,
      ViTri: ViTri ? ViTri.trim() : null,
      TienIch: TienIch ? TienIch.trim() : null,
    };
    // Kiểm tra dữ liệu bắt buộc
    if (!roomData.TenPhong || !roomData.LoaiPhong || !roomData.SucChua || !roomData.TienIch) {
      return res
        .status(400)
        .send("Thiếu dữ liệu: TenPhong, LoaiPhong hoặc SucChua");
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
    const { _id, TenPhong, LoaiPhong, SucChua, ViTri, TienIch} = req.body; // THÊM KhungGio

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
      TienIch: TienIch ? TienIch.trim() : null,
    };

    // Kiểm tra dữ liệu bắt buộc
    if (!roomData.TenPhong || !roomData.LoaiPhong || !roomData.SucChua  || !roomData.TienIch) {
      return res
        .status(400)
        .send("Thiếu dữ liệu: TenPhong, LoaiPhong hoặc SucChua");
    }

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
    // console.log(JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đặt phòng theo userId:", error);
    res.status(500).send("Lỗi khi lấy danh sách đặt phòng");
  }
}

async function createBooking(req, res) {
  try {
    const { 
      _idDocGia, 
      PhongHoc, 
      NgaySuDung, 
      GioBatDau, 
      GioKetThuc, 
      ThanhVien,
      ChoNgoiDaChon // THÊM dòng này
    } = req.body;

    // THÊM validation
    if (!ChoNgoiDaChon || !Array.isArray(ChoNgoiDaChon) || ChoNgoiDaChon.length === 0) {
      return res.status(400).send("Vui lòng chọn chỗ ngồi");
    }

    if (!GioBatDau || !GioKetThuc) {
      return res.status(400).send("Thiếu thông tin giờ bắt đầu hoặc giờ kết thúc");
    }

    const bookingData = {
      DocGia: _idDocGia,
      PhongHoc: PhongHoc,
      NgaySuDung: new Date(NgaySuDung),
      GioBatDau: GioBatDau.trim(),
      GioKetThuc: GioKetThuc.trim(),
      ThanhVien: ThanhVien || [],
      ChoNgoiDaChon: ChoNgoiDaChon // THÊM dòng này
    };

    const result = await roomService.createBooking(bookingData);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi tạo booking:", error);
    
    // THÊM xử lý lỗi cụ thể
    if (error.message.includes("Chỗ ngồi")) {
      return res.status(409).send(error.message);
    }
    
    if (error.message.includes("Khung giờ này đã có người đặt")) {
      return res.status(409).send(error.message);
    }
    
    res.status(500).send("Lỗi khi tạo booking: " + error.message);
  }
}

async function getAllBookRoomAdmin(req, res) {
  try {
    const result = await roomService.getAllBookRoomAdmin();

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy lịch đặt phòng nào");
    }
    // console.log(JSON.stringify(result, null, 2));
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

async function checkInRoom(req, res) {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).send("Thiếu bookingId để check-in");
    }
    
    const result = await roomService.checkInRoom(bookingId);

    if (!result) {
      console.log("Check-in thất bại:", bookingId);
      return res.status(500).send("Check-in thất bại");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi check-in:", error);
    res.status(500).send("Lỗi khi check-in: " + error.message);
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

async function getRoomRule(req, res) {
  try {
    const rule = await roomService.getRoomRule();
    return res.status(200).json(rule);
  } catch (error) {
    console.error("Lỗi khi lấy quy định phòng học:", error);
    throw error;
  }
}

async function updateRoomRule(req, res) {
  try {
    const { bookingLeadTime, bookingLeadTimeLecturer } = req.body;

    // Gọi service để cập nhật quy định phòng học
    const updatedRule = await roomService.updateRoomRule({
      bookingLeadTime,
      bookingLeadTimeLecturer,
    });

    res.status(200).json(updatedRule);
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật quy định phòng học:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật quy định phòng học" });
  }
}

async function searchMemberByCode(req, res) {
  try {
    const { MaDocGia } = req.body;

    // Kiểm tra dữ liệu bắt buộc
    if (!MaDocGia) {
      return res.status(400).send("Thiếu dữ liệu: MaDocGia");
    }

    // Gọi service để tìm độc giả theo mã
    const result = await roomService.searchMemberByCode(MaDocGia);

    // Nếu không tìm thấy
    if (!result) {
      return res.status(404).json({ message: "Không tìm thấy độc giả" });
    }

    // Nếu tìm thấy thì trả về
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi tìm độc giả theo mã:", error);
    res.status(500).send("Lỗi khi tìm độc giả: " + error.message);
  }
}

async function getMyInvitations(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).send("Thiếu userId");
    }
    
    const result = await roomService.getMyInvitations(userId);

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy lời mời nào");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách lời mời:", error);
    res.status(500).send("Lỗi khi lấy danh sách lời mời");
  }
}

async function respondToInvitation(req, res) {
  try {
    const { bookingId, memberId, status } = req.body;

    if (!bookingId || !memberId || !status) {
      return res.status(400).send("Thiếu dữ liệu: bookingId, memberId hoặc status");
    }

    const result = await roomService.respondToInvitation(bookingId, memberId, status);

    if (!result) {
      return res.status(404).send("Không tìm thấy lời mời phù hợp");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi cập nhật lời mời:", error);

    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    res.status(500).send("Lỗi khi cập nhật lời mời");
  }
}

async function checkMemberConflict(req, res) {
  try {
    const { memberId, ngaySuDung, gioBatDau, gioKetThuc } = req.body;

    // Validate input
    if (!memberId || !ngaySuDung || !gioBatDau || !gioKetThuc) {
      return res.status(400).send("Thiếu thông tin kiểm tra (memberId, ngaySuDung, gioBatDau, gioKetThuc)");
    }

    const result = await roomService.checkMemberConflict(
      memberId,
      ngaySuDung,
      gioBatDau,
      gioKetThuc
    );

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi kiểm tra đụng độ lịch thành viên:", error);
    res.status(500).send("Lỗi khi kiểm tra đụng độ lịch");
  }
}

async function getBookingsAsMember(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).send("Thiếu userId");
    }

    const result = await roomService.getBookingsAsMember(userId);

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy lịch đặt phòng nào");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đặt phòng với tư cách thành viên:", error);
    res.status(500).send("Lỗi khi lấy danh sách đặt phòng");
  }
}

async function getAvailableSeats(req, res) {
  try {
    const { phongHocId, ngaySuDung, gioBatDau, gioKetThuc } = req.body;

    if (!phongHocId || !ngaySuDung || !gioBatDau || !gioKetThuc) {
      return res.status(400).send("Thiếu thông tin: phongHocId, ngaySuDung, gioBatDau, gioKetThuc");
    }

    const result = await roomService.getAvailableSeats(
      phongHocId, 
      ngaySuDung, 
      gioBatDau, 
      gioKetThuc
    );

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách chỗ trống:", error);
    res.status(500).send("Lỗi khi lấy danh sách chỗ trống: " + error.message);
  }
}

async function getRoomById(req, res) {
  try {
    const { roomId } = req.body;
    
    if (!roomId) {
      return res.status(400).send("Thiếu roomId");
    }
    
    const result = await roomService.getRoomById(roomId);
    
    if (!result) {
      return res.status(404).send("Không tìm thấy phòng");
    }
    
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin phòng:", error);
    res.status(500).send("Lỗi khi lấy thông tin phòng");
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
