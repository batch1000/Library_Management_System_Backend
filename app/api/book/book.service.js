const mongoose = require("mongoose");

const Sach = require("../../models/sachModel");
const NhaXuatBan = require("../../models/nhaxuatbanModel");
const TheLoaiSach = require("../../models/theloaisachModel");
const TheoDoiMuonSach = require("../../models/theodoimuonsachModel");
const YeuThichSach = require("../../models/yeuthichsachModel");
const DanhGiaSach = require("../../models/danhgiasachModel");
const TheoDoiXemSach = require("../../models/theodoixemsachModel");
const QuyDinhPhatSach = require("../../models/quydinhphatsachModel");
const QuyDinhMuonSach = require("../../models/quydinhmuonsachModel");
const DocGia = require("../../models/docgiaModel");
const LuanVan = require("../../models/luanvanModel");
const SinhVien = require("../../models/sinhvienModel");
const Khoa = require("../../models/khoaModel");
const DotNopLuanVan = require("../../models/dotnopluanvanModel");
const KyHoc = require("../../models/kyhocModel");
const NamHoc = require("../../models/namhocModel");
const NienLuan = require("../../models/nienluanModel");
const DotNopNienLuan = require("../../models/dotnopnienluanModel");
const GiangVien = require("../../models/giangvienModel");
const BoMon = require("../../models/bomonModel");

const BaoCaoThongKe = require("../../models/baocaothongkeModel");
const NhanVien = require("../../models/nhanvienModel");


const notificationService = require("../notification/notification.service");

const {
  deleteImageFromCloudinary,
} = require("../../services/cloudinary.service");

async function addGenre(genreName) {
  const existing = await TheLoaiSach.findOne({ TenTheLoai: genreName });
  if (existing) {
    return null;
  }

  const newGenre = new TheLoaiSach({ TenTheLoai: genreName });
  const savedGenre = await newGenre.save();

  return savedGenre;
}

async function getAllGenre() {
  return await TheLoaiSach.find().sort({ TenTheLoai: 1 });
}

async function getAllFaculty() {
  return await Khoa.find().sort({ TenKhoa: 1 });
}

async function addFaculty(facultyName) {
  const existing = await Khoa.findOne({ TenKhoa: facultyName });
  if (existing) {
    return null;
  }

  const newFaculty = new Khoa({ TenKhoa: facultyName });
  const savedFaculty = await newFaculty.save();

  return savedFaculty;
}

async function generateMaSach() {
  const latestBook = await Sach.findOne().sort({ createdAt: -1 }).exec();
  let nextNumber = 1;

  if (latestBook && latestBook.MaSach) {
    const match = latestBook.MaSach.match(/S(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return nextNumber < 10000
    ? `S${nextNumber.toString().padStart(4, "0")}`
    : `S${nextNumber}`;
}

async function generateMaNXB() {
  const latestNXB = await NhaXuatBan.findOne().sort({ createdAt: -1 }).exec();
  let nextNumber = 1;

  if (latestNXB && latestNXB.MaNXB) {
    const match = latestNXB.MaNXB.match(/NXB(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return nextNumber < 10000
    ? `NXB${nextNumber.toString().padStart(4, "0")}`
    : `NXB${nextNumber}`;
}

async function getAllBook() {
  try {
    const books = await Sach.find()
      .populate("MaNXB", "TenNXB DiaChi")
      .populate("MaTheLoai", "TenTheLoai")
      .populate("Khoa", "TenKhoa")
      .exec();

    return books;
  } catch (err) {
    console.error("Lỗi khi truy vấn tất cả sách:", err);
    throw err;
  }
}

async function getOneBook(keyword) {
  try {
    let query = {};

    if (/^S\d+$/i.test(keyword)) {
      query.MaSach = keyword.toUpperCase();
    } else {
      query.TenSach = { $regex: `^${keyword}$`, $options: "i" };
    }

    const book = await Sach.findOne(query)
      .populate("MaNXB", "TenNXB DiaChi")
      .populate("MaTheLoai", "TenTheLoai")
      .exec();

    return book;
  } catch (err) {
    console.error("Lỗi khi truy vấn một sách:", err);
    throw err;
  }
}

async function getOneTextBook(keyword) {
  try {
    let query = {
      LoaiSach: "GiaoTrinh", // Chỉ lấy sách có LoaiSach là GiaoTrinh
    };

    // Kiểm tra nếu keyword là mã sách (format: S + số)
    if (/^S\d+$/i.test(keyword)) {
      query.MaSach = keyword.toUpperCase();
    } else {
      // Nếu không phải mã sách thì tìm theo tên
      query.TenSach = { $regex: `^${keyword}$`, $options: "i" };
    }

    const textBook = await Sach.findOne(query)
      .populate("MaNXB", "TenNXB DiaChi")
      .populate("Khoa", "TenKhoa") // Populate Khoa thay vì MaTheLoai
      .exec();

    return textBook;
  } catch (err) {
    console.error("Lỗi khi truy vấn một giáo trình:", err);
    throw err;
  }
}

async function getBookById(id) {
  try {
    const book = await Sach.findById(id)
      .populate("MaNXB", "TenNXB DiaChi")
      .populate("MaTheLoai", "TenTheLoai")
      .populate("Khoa", "TenKhoa")
      .exec();

    return book;
  } catch (err) {
    console.error("Lỗi khi truy vấn sách theo ID:", err);
    throw err;
  }
}

async function addBook(data) {
  try {
    // Xử lý nhà xuất bản
    let nxb = await NhaXuatBan.findOne({ TenNXB: data.TenNXB }).exec();
    if (!nxb) {
      const maNXB = await generateMaNXB();
      nxb = await NhaXuatBan.create({
        MaNXB: maNXB,
        TenNXB: data.TenNXB,
        DiaChi: data.DiaChiNXB || "",
      });
    }

    // Xử lý thể loại
    const theLoai = await TheLoaiSach.findOne({
      TenTheLoai: data.TenTheLoai,
    }).exec();
    if (!theLoai) {
      throw new Error(`Thể loại "${data.TenTheLoai}" không tồn tại`);
    }

    // Tạo mã sách
    const maSach = await generateMaSach();

    // Tạo sách mới
    const newBook = new Sach({
      MaSach: maSach,
      TenSach: data.TenSach,
      DonGia: data.DonGia,
      SoQuyen: data.SoQuyen,
      NamXuatBan: data.NamXuatBan,
      TacGia: data.TacGia,
      MoTaSach: data.MoTaSach,
      Image: data.Image,
      Pdf: data.PdfFile, // ← Thêm PDF
      MaNXB: nxb._id,
      MaTheLoai: theLoai._id,
    });

    const savedBook = await newBook.save();
    return savedBook;
  } catch (err) {
    console.error("Lỗi khi thêm sách:", err);
    throw err;
  }
}

async function updateBook(id, data) {
  try {
    const updateData = {};

    if (data.TenNXB) {
      let nxb = await NhaXuatBan.findOne({ TenNXB: data.TenNXB }).exec();

      if (!nxb) {
        const maNXB = await generateMaNXB();
        nxb = await NhaXuatBan.create({
          MaNXB: maNXB,
          TenNXB: data.TenNXB,
          DiaChi: data.DiaChiNXB || "",
        });
      } else if (data.DiaChiNXB) {
        nxb.DiaChi = data.DiaChiNXB;
        await nxb.save();
      }

      updateData.MaNXB = nxb._id;
    }

    if (data.TenTheLoai) {
      const theLoai = await TheLoaiSach.findOne({
        TenTheLoai: data.TenTheLoai,
      }).exec();
      if (!theLoai) {
        throw new Error(`Thể loại "${data.TenTheLoai}" không tồn tại`);
      }
      updateData.MaTheLoai = theLoai._id;
    }

    if (data.TenSach) updateData.TenSach = data.TenSach;
    if (data.DonGia) updateData.DonGia = Number(data.DonGia);
    if (data.SoQuyen) updateData.SoQuyen = Number(data.SoQuyen);
    if (data.NamXuatBan) updateData.NamXuatBan = Number(data.NamXuatBan);
    if (data.TacGia) updateData.TacGia = data.TacGia;
    if (data.MoTaSach) updateData.MoTaSach = data.MoTaSach;
    if (data.Image) updateData.Image = data.Image;
    if (data.PdfFile) updateData.Pdf = data.PdfFile;

    const updatedBook = await Sach.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return updatedBook;
  } catch (err) {
    console.error("Lỗi khi cập nhật sách:", err);
    throw err;
  }
}

async function addTextBook(data) {
  try {
    // Xử lý nhà xuất bản
    let nxb = await NhaXuatBan.findOne({ TenNXB: data.TenNXB }).exec();
    if (!nxb) {
      const maNXB = await generateMaNXB();
      nxb = await NhaXuatBan.create({
        MaNXB: maNXB,
        TenNXB: data.TenNXB,
        DiaChi: data.DiaChiNXB || "",
      });
    }

    // Xử lý khoa
    let khoa = await Khoa.findOne({ TenKhoa: data.TenKhoa }).exec();
    if (!khoa) {
      khoa = await Khoa.create({ TenKhoa: data.TenKhoa });
    }

    // Generate mã sách
    const maSach = await generateMaSach();

    // Tạo sách giáo trình mới
    const newTextBook = new Sach({
      MaSach: maSach,
      TenSach: data.TenSach,
      DonGia: data.DonGia,
      SoQuyen: data.SoQuyen,
      NamXuatBan: data.NamXuatBan,
      TacGia: data.TacGia,
      MoTaSach: data.MoTaSach,
      Image: data.Image,
      Pdf: data.PdfFile,
      MaNXB: nxb._id,
      LoaiSach: "GiaoTrinh",
      Khoa: khoa._id,
      // KHÔNG có MaTheLoai
    });

    return await newTextBook.save();
  } catch (err) {
    console.error("Lỗi khi thêm giáo trình:", err);
    throw err;
  }
}

async function updateTextBook(id, data) {
  try {
    const updateData = {};

    // Xử lý nhà xuất bản
    if (data.TenNXB) {
      let nxb = await NhaXuatBan.findOne({ TenNXB: data.TenNXB }).exec();

      if (!nxb) {
        const maNXB = await generateMaNXB();
        nxb = await NhaXuatBan.create({
          MaNXB: maNXB,
          TenNXB: data.TenNXB,
          DiaChi: data.DiaChiNXB || "",
        });
      } else if (data.DiaChiNXB) {
        nxb.DiaChi = data.DiaChiNXB;
        await nxb.save();
      }

      updateData.MaNXB = nxb._id;
    }

    // Xử lý khoa
    if (data.TenKhoa) {
      let khoa = await Khoa.findOne({ TenKhoa: data.TenKhoa }).exec();
      if (!khoa) {
        khoa = await Khoa.create({ TenKhoa: data.TenKhoa });
      }
      updateData.Khoa = khoa._id;
    }

    // Các trường khác
    if (data.TenSach) updateData.TenSach = data.TenSach;
    if (data.DonGia) updateData.DonGia = Number(data.DonGia);
    if (data.SoQuyen) updateData.SoQuyen = Number(data.SoQuyen);
    if (data.NamXuatBan) updateData.NamXuatBan = Number(data.NamXuatBan);
    if (data.TacGia) updateData.TacGia = data.TacGia;
    if (data.MoTaSach) updateData.MoTaSach = data.MoTaSach;
    if (data.Image) updateData.Image = data.Image;
    if (data.PdfFile) updateData.Pdf = data.PdfFile;

    const updatedTextBook = await Sach.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return updatedTextBook;
  } catch (err) {
    console.error("Lỗi khi cập nhật giáo trình:", err);
    throw err;
  }
}

function extractPublicIdFromUrl(imageUrl) {
  try {
    console.log("Đang trích xuất publicId từ URL:", imageUrl);

    if (!imageUrl || !imageUrl.includes("cloudinary.com")) {
      console.log("URL không phải từ Cloudinary");
      return null;
    }

    // Tách URL và lấy phần sau '/upload/'
    const parts = imageUrl.split("/upload/");
    if (parts.length < 2) {
      console.log("URL không có phần /upload/");
      return null;
    }

    let pathAfterUpload = parts[1];
    console.log("Path sau upload:", pathAfterUpload);

    // Bỏ version nếu có (vXXXXXXXXXX/)
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, "");
    console.log("Path sau khi bỏ version:", pathAfterUpload);

    // Bỏ các transformations nếu có (như w_500,h_300,c_fill/ etc.)
    const segments = pathAfterUpload.split("/");
    const lastSegment = segments[segments.length - 1];

    // Nếu có nhiều segments và segment cuối có extension, lấy path đầy đủ trừ extension
    let publicId;
    if (segments.length > 1) {
      // Có folder: images/filename.jpg -> images/filename
      publicId = pathAfterUpload.replace(/\.[^/.]+$/, ""); // Bỏ extension cuối
    } else {
      // Không có folder: filename.jpg -> filename
      publicId = lastSegment.replace(/\.[^/.]+$/, "");
    }

    console.log("PublicId được trích xuất:", publicId);
    return publicId;
  } catch (error) {
    console.error("Lỗi khi trích xuất publicId:", error);
    return null;
  }
}

async function deleteBook(id) {
  try {
    const book = await Sach.findById(id);

    if (!book) {
      throw new Error("Không tìm thấy sách để xóa");
    }

    const publicId = extractPublicIdFromUrl(book.Image);

    const result = await Sach.findByIdAndDelete(id);

    if (publicId) {
      try {
        await deleteImageFromCloudinary(publicId);
        console.log("Đã xóa ảnh từ Cloudinary:", publicId);
      } catch (imageError) {
        console.warn("Không thể xóa ảnh từ Cloudinary:", imageError.message);
      }
    } else {
      console.warn("Không thể trích xuất publicId từ URL:", book.Image);
    }

    return result;
  } catch (err) {
    console.error("Lỗi khi xóa sách:", err);
    throw err;
  }
}

async function lendBook(data) {
  try {
    const { MaSach, MaDocGia, SoLuongMuon } = data;

    const record = new TheoDoiMuonSach({
      MaSach,
      MaDocGia,
      SoLuong: SoLuongMuon,
      TrangThai: "pending",
    });

    const savedRecord = await record.save();
    return savedRecord;
  } catch (err) {
    console.error("Lỗi khi mượn sách:", err);
    throw err;
  }
}

async function getInfoLendBook(data) {
  try {
    const { MaSach, MaDocGia } = data;

    const lendRecord = await TheoDoiMuonSach.findOne({
      MaSach,
      MaDocGia,
      TrangThai: {
        $in: ["pending", "approved", "borrowing", "returned", "overdue"],
      },
    }).sort({ createdAt: -1 }); // Lấy record mới nhất
    return lendRecord;
  } catch (err) {
    console.error("Lỗi khi lấy thông tin mượn sách:", err);
    throw err;
  }
}

async function getTrackBorrowBook() {
  try {
    const trackBorrowList = await TheoDoiMuonSach.find()
      .populate({
        path: "MaSach",
        select:
          "MaSach TenSach TacGia DonGia SoQuyen NamXuatBan Image MoTaSach",
      })
      .populate({
        path: "MaDocGia",
        select: "MaDocGia HoLot Ten NgaySinh Phai DiaChi DienThoai",
      })
      .populate({
        path: "Msnv",
        select: "Msnv HoTenNV ChucVu",
      })
      .sort({ createdAt: -1 }); // Sắp xếp theo thời gian tạo mới nhất

    return trackBorrowList;
  } catch (err) {
    console.error("Lỗi khi lấy danh sách theo dõi mượn sách:", err);
    throw err;
  }
}

async function updateBorrowStatus(requestId, adminId, status) {
  try {
    const updateFields = { TrangThai: status };

    if (status !== "overdue") {
      updateFields.Msnv = adminId;
    }

    // Chỉ xử lý logic trừ sách khi chuyển từ processing → approved
    if (status === "approved") {
      // Kiểm tra trạng thái hiện tại
      const currentRequest = await TheoDoiMuonSach.findById(requestId);
      if (!currentRequest) {
        throw new Error("Không tìm thấy yêu cầu mượn");
      }

      // Chỉ xử lý khi chuyển từ processing → approved
      if (currentRequest.TrangThai === "processing") {
        const now = new Date();
        updateFields.NgayMuon = now;

        // Lấy quy định
        const quyDinh = await QuyDinhMuonSach.findOne({});

        // Lấy thông tin độc giả để xác định đối tượng
        const docGia = await DocGia.findById(currentRequest.MaDocGia);
        if (!docGia) {
          throw new Error("Không tìm thấy độc giả");
        }

        // Xác định hạn mượn theo đối tượng
        let duration;
        if (docGia.DoiTuong === "Giảng viên") {
          duration = (quyDinh && quyDinh.borrowDurationLecturer) || 1;
        } else {
          // Mặc định: Sinh viên hoặc khách
          duration = (quyDinh && quyDinh.borrowDuration) || 1;
        }

        updateFields.NgayTra = new Date(
          now.getTime() + duration * 24 * 60 * 60 * 1000
        );

        const sach = await Sach.findById(currentRequest.MaSach);
        if (!sach) {
          throw new Error("Không tìm thấy sách");
        }

        // Kiểm tra đủ số lượng không
        if (sach.SoQuyen < currentRequest.SoLuong) {
          throw new Error("Không đủ số lượng sách để cho mượn");
        }

        // Trừ số lượng sách
        sach.SoQuyen -= currentRequest.SoLuong;
        await sach.save();
      } else {
        throw new Error(
          'Chỉ có thể chuyển sang "approved" từ trạng thái "processing"'
        );
      }
    }

    if (status === "returned") {
      updateFields.NgayGhiNhanTra = new Date();
    }

    if (status === "processing") {
      updateFields.NgayDuyet = new Date();
    }

    const updated = await TheoDoiMuonSach.findByIdAndUpdate(
      requestId,
      updateFields,
      { new: true }
    );

    return updated;
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái mượn sách:", err);
    throw err;
  }
}

async function updateOverdueFee(requestId) {
  const record = await TheoDoiMuonSach.findById(requestId);
  if (!record) return null;

  if (record.TrangThai !== "overdue" || record.DaThanhToan) {
    return record; // không cần cập nhật
  }

  if (!record.NgayTra) return record; // chưa có hạn trả thì bỏ qua

  const now = new Date();
  const daysLate = Math.max(
    0,
    Math.floor((now - record.NgayTra) / (1000 * 60 * 60 * 24))
  );

  const penalty = daysLate * 5000; // mỗi ngày 5k
  record.PhiQuaHan = penalty;

  await record.save();
}

async function updateReturnStatus(requestId, adminId, status, bookCondition) {
  try {
    const request = await TheoDoiMuonSach.findById(requestId).populate(
      "MaDocGia",
      "DoiTuong"
    );
    if (!request) throw new Error("Không tìm thấy yêu cầu mượn");

    const sach = await Sach.findById(request.MaSach);
    if (!sach) throw new Error("Không tìm thấy sách");

    // ====== LẤY QUY ĐỊNH PHẠT TỪ DATABASE ======
    const QuyDinhPhatSach = mongoose.model("QuyDinhPhatSach");
    const penaltyRules = await QuyDinhPhatSach.findOne()
      .sort({ updatedAt: -1 })
      .exec();

    // ✅ XÁC ĐỊNH LOẠI ĐỘC GIẢ
    const doiTuong = request.MaDocGia ? request.MaDocGia.DoiTuong : null;
    const isLecturer = doiTuong === "Giảng viên";

    // ✅ CHỌN QUY ĐỊNH PHẠT DỰA VÀO LOẠI ĐỘC GIẢ
    const rules = penaltyRules
      ? {
          coefLost: isLecturer
            ? penaltyRules.coefLostLecturer
            : penaltyRules.coefLost,
          feeManage: isLecturer
            ? penaltyRules.feeManageLecturer
            : penaltyRules.feeManage,
          coefDamageLight: isLecturer
            ? penaltyRules.coefDamageLightLecturer
            : penaltyRules.coefDamageLight,
          feeLate: isLecturer
            ? penaltyRules.feeLateLecturer
            : penaltyRules.feeLate,
        }
      : {
          // Nếu không có quy định thì dùng mặc định cho sinh viên
          coefLost: 1.3,
          feeManage: 50000,
          coefDamageLight: 20,
          feeLate: 5000,
        };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ====== TÍNH PHÍ QUÁ HẠN ======
    let phiQuaHan = 0;
    if (request.NgayTra && request.NgayTra < today) {
      const dueDate = new Date(request.NgayTra);
      dueDate.setHours(23, 59, 59, 999);

      const daysLate = Math.max(
        0,
        Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24))
      );

      // Sử dụng quy định từ database
      phiQuaHan = daysLate * rules.feeLate * request.SoLuong;
    }

    // ====== XỬ LÝ TÌNH TRẠNG SÁCH ======
    let phiBoiThuong = 0;
    if (bookCondition === "Mất sách") {
      // Sử dụng quy định từ database
      phiBoiThuong =
        request.SoLuong * sach.DonGia * rules.coefLost + rules.feeManage;
    } else if (bookCondition === "Hư sách") {
      // Sử dụng quy định từ database (chuyển % thành decimal)
      phiBoiThuong =
        request.SoLuong * sach.DonGia * (rules.coefDamageLight / 100);
    }

    // ====== CẬP NHẬT TRẠNG THÁI ======
    const updateFields = {
      TrangThai: status,
      Msnv: adminId,
      TinhTrangSach: bookCondition,
      PhiBoiThuong: phiBoiThuong,
      PhiQuaHan: phiQuaHan,
      NgayCapNhatTinhTrangSach: now,
    };

    if (phiQuaHan > 0 || phiBoiThuong > 0) {
      updateFields.DaThanhToan = false;
    }

    if (bookCondition === "Nguyên vẹn") {
      updateFields.NgayGhiNhanTra = now;
      sach.SoQuyen += request.SoLuong;
      await sach.save();
    } else if (bookCondition === "Hư sách") {
      updateFields.NgayGhiNhanTra = now;
    }

    const updated = await TheoDoiMuonSach.findByIdAndUpdate(
      requestId,
      updateFields,
      { new: true }
    );

    return updated;
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái trả sách:", err);
    throw err;
  }
}

async function confirmPaidCompensation(requestId) {
  try {
    const updated = await TheoDoiMuonSach.findByIdAndUpdate(
      requestId,
      {
        DaThanhToan: true,
        NgayGhiNhanThanhToan: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      throw new Error("Không tìm thấy bản ghi mượn sách");
    }

    return updated;
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái thanh toán:", err);
    throw err;
  }
}

async function confirmRepaired(requestId) {
  try {
    // Tìm bản ghi theo dõi mượn sách
    const borrowRecord = await TheoDoiMuonSach.findById(requestId).populate(
      "MaSach"
    );

    if (!borrowRecord) {
      throw new Error("Không tìm thấy bản ghi mượn sách");
    }

    // Kiểm tra xem sách có phải là "Hư sách" không
    if (borrowRecord.TinhTrangSach !== "Hư sách") {
      throw new Error(
        "Chỉ có thể xác nhận sửa cho sách có tình trạng 'Hư sách'"
      );
    }

    // Cập nhật trạng thái đã sửa
    const updated = await TheoDoiMuonSach.findByIdAndUpdate(
      requestId,
      {
        DaSua: true,
      },
      { new: true }
    );

    // Cộng thêm 1 vào số quyển sách (vì sách đã được sửa, có thể cho mượn lại)
    await Sach.findByIdAndUpdate(borrowRecord.MaSach._id, {
      $inc: { SoQuyen: 1 },
    });

    return updated;
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái đã sửa:", err);
    throw err;
  }
}

async function extendBorrowTime(requestId, adminId) {
  try {
    const request = await TheoDoiMuonSach.findById(requestId).populate(
      "MaDocGia",
      "DoiTuong"
    );

    if (!request) {
      throw new Error("Không tìm thấy yêu cầu mượn sách");
    }

    if (request.TrangThai !== "approved") {
      throw new Error("Chỉ có thể gia hạn cho yêu cầu đã được duyệt");
    }

    if (!request.NgayTra) {
      throw new Error("Không có ngày trả hiện tại để gia hạn");
    }

    if (request.DaGiaHan) {
      throw new Error("Yêu cầu này đã được gia hạn trước đó");
    }

    // Lấy quy định gia hạn dựa vào DoiTuong
    const quyDinh = await QuyDinhMuonSach.findOne({});
    const doiTuong = request.MaDocGia ? request.MaDocGia.DoiTuong : null;

    const soNgayGiaHan =
      doiTuong === "Giảng viên"
        ? quyDinh
          ? quyDinh.renewalDurationLecturer
          : 5
        : quyDinh
        ? quyDinh.renewalDuration
        : 3;

    // Tính ngày trả mới
    const newDate = new Date(request.NgayTra);
    newDate.setDate(newDate.getDate() + soNgayGiaHan);

    // Cập nhật
    request.NgayTra = newDate;
    request.Msnv = adminId;
    request.DaGiaHan = true;

    const updated = await request.save();
    return updated;
  } catch (err) {
    console.error("Lỗi khi gia hạn mượn sách:", err);
    throw err;
  }
}

async function checkIfExtendBorrowTime(requestId) {
  try {
    const request = await TheoDoiMuonSach.findById(requestId);

    if (!request) {
      throw new Error("Không tìm thấy yêu cầu mượn sách");
    }

    return {
      DaGiaHan: request.DaGiaHan || false,
    };
  } catch (err) {
    console.error("Lỗi khi kiểm tra gia hạn:", err);
    throw err;
  }
}

async function getBorrowBookOfUser(userId) {
  try {
    const borrowedBooks = await TheoDoiMuonSach.find({ MaDocGia: userId })
      .populate({
        path: "MaSach",
        select:
          "MaSach TenSach TacGia Image MoTaSach DonGia NamXuatBan MaTheLoai",
      })
      .sort({ createdAt: -1 }) // Đảo ngược: mới nhất trước
      .exec();

    return borrowedBooks;
  } catch (error) {
    console.error("Lỗi khi lấy sách đã mượn của user:", error);
    throw error;
  }
}

async function countCurrentBorrowing(MaDocGia) {
  try {
    const result = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          MaDocGia: mongoose.Types.ObjectId(MaDocGia),
          TrangThai: { $in: ["approved", "overdue"] },
        },
      },
      {
        $group: {
          _id: null,
          totalSoLuong: { $sum: "$SoLuong" },
        },
      },
    ]);

    if (result && result.length > 0) {
      return result[0].totalSoLuong;
    } else {
      return 0;
    }
  } catch (err) {
    console.error("Lỗi khi đếm số sách đang mượn:", err);
    throw err;
  }
}

async function countCurrentBorrowingToday(MaDocGia) {
  try {
    // Lấy ngày hôm nay
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          MaDocGia: mongoose.Types.ObjectId(MaDocGia),
          TrangThai: { $in: ["approved", "overdue"] },
          NgayMuon: { $gte: startOfDay, $lte: endOfDay }, // chỉ tính hôm nay
        },
      },
      {
        $group: {
          _id: null,
          totalSoLuong: { $sum: "$SoLuong" },
        },
      },
    ]);

    if (result && result.length > 0) {
      return result[0].totalSoLuong;
    } else {
      return 0;
    }
  } catch (err) {
    console.error("Lỗi khi đếm số sách đang mượn hôm nay:", err);
    throw err;
  }
}

async function countCurrentPending(MaDocGia) {
  try {
    const result = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          MaDocGia: mongoose.Types.ObjectId(MaDocGia),
          TrangThai: "pending", // chỉ lấy pending
        },
      },
      {
        $group: {
          _id: null,
          totalSoLuong: { $sum: "$SoLuong" },
        },
      },
    ]);

    if (result && result.length > 0) {
      return result[0].totalSoLuong;
    } else {
      return 0;
    }
  } catch (err) {
    console.error("Lỗi khi đếm số sách pending:", err);
    throw err;
  }
}

async function countCurrentPendingToDay(MaDocGia) {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          MaDocGia: mongoose.Types.ObjectId(MaDocGia),
          TrangThai: "pending",
          createdAt: { $gte: startOfDay, $lte: endOfDay }, // ✅ dùng createdAt
        },
      },
      {
        $group: {
          _id: null,
          totalSoLuong: { $sum: "$SoLuong" },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalSoLuong : 0;
  } catch (err) {
    console.error("Lỗi khi đếm số sách pending hôm nay:", err);
    throw err;
  }
}

async function deletePending(bookId, readerId) {
  const result = await TheoDoiMuonSach.deleteOne({
    MaSach: bookId,
    MaDocGia: readerId,
    TrangThai: "pending",
  });

  return result.deletedCount > 0;
}

async function addFavoriteBook(bookId, readerId) {
  const newFavorite = new YeuThichSach({
    MaSach: bookId,
    MaDocGia: readerId,
  });
  const savedFavorite = await newFavorite.save();
  return savedFavorite;
}

async function getFavoriteBooks(readerId) {
  const favorites = await YeuThichSach.find({ MaDocGia: readerId }).select(
    "MaSach -_id"
  );

  return favorites.map((f) => f.MaSach);
}

async function deleteFavoriteBook(bookId, readerId) {
  const result = await YeuThichSach.deleteOne({
    MaSach: bookId,
    MaDocGia: readerId,
  });

  return result.deletedCount > 0;
}

async function getRatingByBookAndReader(bookId, readerId) {
  if (!bookId || !readerId) {
    throw new Error("Mã sách và mã độc giả là bắt buộc");
  }

  return await DanhGiaSach.findOne({
    MaSach: bookId,
    MaDocGia: readerId,
  }).populate("MaDocGia", "HoLot Ten");
}

async function getRatingByBook(bookId) {
  if (!bookId) {
    throw new Error("Mã sách là bắt buộc");
  }

  return await DanhGiaSach.find({
    MaSach: bookId,
  }).populate("MaDocGia", "HoLot Ten");
}

async function getAllCommentRating(bookId) {
  if (!bookId) {
    throw new Error("Mã sách là bắt buộc");
  }

  return await DanhGiaSach.find({ MaSach: bookId })
    .populate("MaDocGia", "HoLot Ten") // lấy tên độc giả
    .sort({ NgayDanhGia: -1 }); // sắp xếp mới nhất trước
}

async function addRatingBook(bookId, readerId, stars, comment) {
  if (
    !bookId ||
    !readerId ||
    typeof stars !== "number" ||
    stars < 1 ||
    stars > 5
  ) {
    throw new Error("Dữ liệu đánh giá không hợp lệ. Cần có sao (1-5).");
  }

  const existingRating = await DanhGiaSach.findOne({
    MaSach: bookId,
    MaDocGia: readerId,
  });

  if (existingRating) {
    return null; // Hoặc throw Error nếu muốn báo lỗi
  }

  const newRating = new DanhGiaSach({
    MaSach: bookId,
    MaDocGia: readerId,
    SoSao: stars,
    BinhLuan: comment.trim(),
  });

  const savedRating = await newRating.save();
  return savedRating;
}

async function updateRatingComment(bookId, readerId, comment) {
  if (!bookId || !readerId) {
    throw new Error("Thiếu thông tin MaSach hoặc MaDocGia.");
  }

  const existingRating = await DanhGiaSach.findOne({
    MaSach: bookId,
    MaDocGia: readerId,
  });

  if (!existingRating) {
    return null; // Không tìm thấy để cập nhật
  }

  existingRating.BinhLuan = comment;
  const updatedRating = await existingRating.save();
  return updatedRating;
}

async function deleteRatingBook(bookId, readerId) {
  const result = await DanhGiaSach.deleteOne({
    MaSach: bookId,
    MaDocGia: readerId,
  });

  return result.deletedCount > 0;
}

async function addBookView(bookId, readerId) {
  if (!bookId || !readerId) {
    throw new Error("Thiếu thông tin sách hoặc độc giả để ghi nhận lượt xem.");
  }

  // Tạo một record mới cho lượt xem
  const newView = new TheoDoiXemSach({
    MaSach: bookId,
    MaDocGia: readerId,
  });

  const savedView = await newView.save();
  return savedView;
}

async function getMostViewBook() {
  const topBooks = await TheoDoiXemSach.aggregate([
    {
      $group: {
        _id: "$MaSach",
        totalViews: { $sum: 1 },
      },
    },
    { $sort: { totalViews: -1 } },
    { $limit: 3 },
    {
      $lookup: {
        from: "saches", // tên collection của model Sach (mặc định plural hóa)
        localField: "_id",
        foreignField: "_id",
        as: "bookInfo",
      },
    },
    { $unwind: "$bookInfo" },
    {
      $project: {
        _id: "$bookInfo._id",
        TenSach: "$bookInfo.TenSach",
        TacGia: "$bookInfo.TacGia",
        Image: "$bookInfo.Image",
        totalViews: 1,
      },
    },
  ]);

  return topBooks;
}

async function getTopTenWeekBook(limit = 10) {
  // đảm bảo limit là số dương hợp lệ
  limit = Math.max(1, parseInt(limit) || 10);

  // xác định khoảng thời gian "tuần này" (7 ngày gần nhất)
  let endOfWeek = new Date();
  let startOfWeek = new Date(endOfWeek);
  startOfWeek.setDate(endOfWeek.getDate() - 6); // 7 ngày (bao gồm hôm nay)
  startOfWeek.setHours(0, 0, 0, 0);
  endOfWeek.setHours(23, 59, 59, 999);

  let allScoredBooks = []; // tích lũy sách từ nhiều tuần
  const processedBookIds = new Set(); // tránh trùng lặp

  // Hàm gom dữ liệu 1 tuần
  async function getWeekData(start, end) {
    const viewsAgg = await TheoDoiXemSach.aggregate([
      { $match: { ThoiDiemXem: { $gte: start, $lt: end } } },
      { $group: { _id: "$MaSach", views_7d: { $sum: 1 } } },
    ]);

    const borrowsAgg = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          NgayMuon: { $gte: start, $lt: end },
          TrangThai: { $in: ["approved", "returned"] },
        },
      },
      { $group: { _id: "$MaSach", borrows_7d: { $sum: 1 } } },
    ]);

    const ratingsAgg = await DanhGiaSach.aggregate([
      { $match: { NgayDanhGia: { $gte: start, $lt: end } } },
      { $group: { _id: "$MaSach", ratings_7d: { $sum: 1 } } },
    ]);

    const scoreMap = new Map();

    function ensureEntry(bookIdStr) {
      if (!scoreMap.has(bookIdStr)) {
        scoreMap.set(bookIdStr, { views_7d: 0, borrows_7d: 0, ratings_7d: 0 });
      }
      return scoreMap.get(bookIdStr);
    }

    viewsAgg.forEach((d) => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.views_7d = d.views_7d || 0;
    });

    borrowsAgg.forEach((d) => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.borrows_7d = d.borrows_7d || 0;
    });

    ratingsAgg.forEach((d) => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.ratings_7d = d.ratings_7d || 0;
    });

    const result = [];
    for (const [bookIdStr, counts] of scoreMap.entries()) {
      // Chỉ thêm sách chưa được xử lý (tránh trùng lặp)
      if (!processedBookIds.has(bookIdStr)) {
        const score_week =
          0.3 * (counts.views_7d || 0) +
          0.5 * (counts.borrows_7d || 0) +
          0.2 * (counts.ratings_7d || 0);

        result.push({
          bookIdStr,
          views_7d: counts.views_7d || 0,
          borrows_7d: counts.borrows_7d || 0,
          ratings_7d: counts.ratings_7d || 0,
          score_week,
        });

        processedBookIds.add(bookIdStr);
      }
    }

    return result;
  }

  // Fallback logic: lùi tuần cho đến khi đủ sách
  let tries = 0;
  while (allScoredBooks.length < limit && tries < 12) {
    // tối đa 12 tuần (3 tháng)
    const weekData = await getWeekData(startOfWeek, endOfWeek);

    // Thêm sách từ tuần này vào tổng
    allScoredBooks.push(...weekData);

    // console.log(`Tuần ${startOfWeek.toDateString()} - ${endOfWeek.toDateString()}: +${weekData.length} sách, tổng: ${allScoredBooks.length}/${limit}`);

    // Nếu đã đủ sách thì dừng
    if (allScoredBooks.length >= limit) {
      break;
    }

    // Lùi thêm 1 tuần
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    endOfWeek.setDate(endOfWeek.getDate() - 7);
    tries++;
  }

  // nếu vẫn trống sau khi fallback → trả mảng rỗng
  if (allScoredBooks.length === 0) {
    console.log("Không tìm thấy sách nào trong 12 tuần qua");
    return [];
  }

  // Sort giảm dần theo score_week và cắt top limit
  allScoredBooks.sort((a, b) => b.score_week - a.score_week);
  const topSlice = allScoredBooks.slice(0, limit);

  // console.log(`Lấy được ${topSlice.length}/${limit} sách từ ${tries + 1} tuần`);

  // Lấy thông tin sách từ collection Sach
  const bookIds = topSlice.map((s) => mongoose.Types.ObjectId(s.bookIdStr));

  const bookDocs = await Sach.find({ _id: { $in: bookIds } })
    .select("MaSach TenSach TacGia Image")
    .lean();

  const bookDocMap = new Map(bookDocs.map((b) => [b._id.toString(), b]));

  // Tính số sao trung bình cho từng sách
  const ratingsData = await DanhGiaSach.aggregate([
    { $match: { MaSach: { $in: bookIds } } },
    {
      $group: {
        _id: "$MaSach",
        avgRating: { $avg: "$SoSao" },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  const ratingsMap = new Map(
    ratingsData.map((r) => [
      r._id.toString(),
      {
        avgRating: r.avgRating || 0,
        totalRatings: r.totalRatings || 0,
      },
    ])
  );

  // Gộp thông tin sách vào kết quả trả về, giữ đúng thứ tự của topSlice
  const finalResult = topSlice.map((item) => {
    const doc = bookDocMap.get(item.bookIdStr);
    const rating = ratingsMap.get(item.bookIdStr) || {
      avgRating: 0,
      totalRatings: 0,
    };

    return {
      _id: doc ? doc._id : mongoose.Types.ObjectId(item.bookIdStr),
      MaSach: doc ? doc.MaSach : null,
      TenSach: doc ? doc.TenSach : "",
      TacGia: doc ? doc.TacGia : "",
      Image: doc ? doc.Image : "",
      views_7d: item.views_7d,
      borrows_7d: item.borrows_7d,
      ratings_7d: item.ratings_7d,
      score_week: item.score_week,
      SoSaoTB: parseFloat(rating.avgRating.toFixed(1)), // Làm tròn 1 chữ số thập phân
    };
  });

  return finalResult;
}

async function getTodayBook(limit = 6) {
  // đảm bảo limit là số dương hợp lệ
  limit = Math.max(1, parseInt(limit) || 6);

  // xác định khoảng thời gian "hôm nay"
  let startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  let endOfDay = new Date(startOfDay);
  endOfDay.setDate(startOfDay.getDate() + 1);

  let allScoredBooks = []; // tích lũy sách từ nhiều ngày
  const processedBookIds = new Set(); // tránh trùng lặp

  // Hàm gom dữ liệu 1 ngày
  async function getDayData(start, end) {
    const viewsAgg = await TheoDoiXemSach.aggregate([
      { $match: { ThoiDiemXem: { $gte: start, $lt: end } } },
      { $group: { _id: "$MaSach", views_today: { $sum: 1 } } },
    ]);

    const borrowsAgg = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          NgayMuon: { $gte: start, $lt: end },
          TrangThai: { $in: ["approved", "returned"] },
        },
      },
      { $group: { _id: "$MaSach", borrows_today: { $sum: 1 } } },
    ]);

    const ratingsAgg = await DanhGiaSach.aggregate([
      { $match: { NgayDanhGia: { $gte: start, $lt: end } } },
      { $group: { _id: "$MaSach", ratings_today: { $sum: 1 } } },
    ]);

    const scoreMap = new Map();

    function ensureEntry(bookIdStr) {
      if (!scoreMap.has(bookIdStr)) {
        scoreMap.set(bookIdStr, {
          views_today: 0,
          borrows_today: 0,
          ratings_today: 0,
        });
      }
      return scoreMap.get(bookIdStr);
    }

    viewsAgg.forEach((d) => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.views_today = d.views_today || 0;
    });

    borrowsAgg.forEach((d) => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.borrows_today = d.borrows_today || 0;
    });

    ratingsAgg.forEach((d) => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.ratings_today = d.ratings_today || 0;
    });

    const result = [];
    for (const [bookIdStr, counts] of scoreMap.entries()) {
      // Chỉ thêm sách chưa được xử lý (tránh trùng lặp)
      if (!processedBookIds.has(bookIdStr)) {
        const score_today =
          0.7 * (counts.views_today || 0) +
          0.2 * (counts.borrows_today || 0) +
          0.1 * (counts.ratings_today || 0);

        result.push({
          bookIdStr,
          views_today: counts.views_today || 0,
          borrows_today: counts.borrows_today || 0,
          ratings_today: counts.ratings_today || 0,
          score_today,
        });

        processedBookIds.add(bookIdStr);
      }
    }

    return result;
  }

  // Fallback logic: lùi ngày cho đến khi đủ sách
  let tries = 0;
  while (allScoredBooks.length < limit && tries < 30) {
    const dayData = await getDayData(startOfDay, endOfDay);

    // Thêm sách từ ngày này vào tổng
    allScoredBooks.push(...dayData);

    // console.log(`Ngày ${startOfDay.toDateString()}: +${dayData.length} sách, tổng: ${allScoredBooks.length}/${limit}`);

    // Nếu đã đủ sách thì dừng
    if (allScoredBooks.length >= limit) {
      break;
    }

    // Lùi thêm 1 ngày
    startOfDay.setDate(startOfDay.getDate() - 1);
    endOfDay.setDate(endOfDay.getDate() - 1);
    tries++;
  }

  // nếu vẫn trống sau khi fallback → trả mảng rỗng
  if (allScoredBooks.length === 0) {
    console.log("❌ Không tìm thấy sách nào trong 30 ngày qua");
    return [];
  }

  // Sort giảm dần theo score_today và cắt top limit
  allScoredBooks.sort((a, b) => b.score_today - a.score_today);
  const topSlice = allScoredBooks.slice(0, limit);

  // console.log(`✅ Lấy được ${topSlice.length}/${limit} sách từ ${tries + 1} ngày`);

  // Lấy thông tin sách từ collection Sach
  const bookIds = topSlice.map((s) => mongoose.Types.ObjectId(s.bookIdStr));

  const bookDocs = await Sach.find({ _id: { $in: bookIds } })
    .select("MaSach TenSach TacGia Image")
    .lean();

  const bookDocMap = new Map(bookDocs.map((b) => [b._id.toString(), b]));

  // Tính số sao trung bình cho từng sách
  const ratingsData = await DanhGiaSach.aggregate([
    { $match: { MaSach: { $in: bookIds } } },
    {
      $group: {
        _id: "$MaSach",
        avgRating: { $avg: "$SoSao" },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  const ratingsMap = new Map(
    ratingsData.map((r) => [
      r._id.toString(),
      {
        avgRating: r.avgRating || 0,
        totalRatings: r.totalRatings || 0,
      },
    ])
  );

  // Gộp thông tin sách vào kết quả trả về, giữ đúng thứ tự của topSlice
  const finalResult = topSlice.map((item) => {
    const doc = bookDocMap.get(item.bookIdStr);
    const rating = ratingsMap.get(item.bookIdStr) || {
      avgRating: 0,
      totalRatings: 0,
    };

    return {
      _id: doc ? doc._id : mongoose.Types.ObjectId(item.bookIdStr),
      MaSach: doc ? doc.MaSach : null,
      TenSach: doc ? doc.TenSach : "",
      TacGia: doc ? doc.TacGia : "",
      Image: doc ? doc.Image : "",
      views_today: item.views_today,
      borrows_today: item.borrows_today,
      ratings_today: item.ratings_today,
      score_today: item.score_today,
      SoSaoTB: parseFloat(rating.avgRating.toFixed(1)), // Làm tròn 1 chữ số thập phân
    };
  });

  return finalResult;
}

async function getTrendingBook(limit) {
  // Nếu có truyền limit thì đảm bảo là số dương hợp lệ
  if (limit !== undefined && limit !== null) {
    limit = Math.max(1, parseInt(limit) || 1);
  }

  // xác định khoảng thời gian cho tính growth_rate
  let endOfPeriod = new Date();
  let startOfWeek = new Date(endOfPeriod);
  startOfWeek.setDate(endOfPeriod.getDate() - 6); // 7 ngày gần nhất
  startOfWeek.setHours(0, 0, 0, 0);

  let startOf2Weeks = new Date(endOfPeriod);
  startOf2Weeks.setDate(endOfPeriod.getDate() - 13); // 14 ngày gần nhất
  startOf2Weeks.setHours(0, 0, 0, 0);

  endOfPeriod.setHours(23, 59, 59, 999);

  let allScoredBooks = []; // tích lũy sách từ nhiều tuần
  const processedBookIds = new Set(); // tránh trùng lặp

  // Hàm gom dữ liệu cho tính growth_rate
  async function getPeriodData(start7d, end, start14d) {
    const views7dAgg = await TheoDoiXemSach.aggregate([
      { $match: { ThoiDiemXem: { $gte: start7d, $lt: end } } },
      { $group: { _id: "$MaSach", views_7d: { $sum: 1 } } },
    ]);

    const borrows7dAgg = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          NgayMuon: { $gte: start7d, $lt: end },
          TrangThai: { $in: ["approved", "returned"] },
        },
      },
      { $group: { _id: "$MaSach", borrows_7d: { $sum: 1 } } },
    ]);

    const ratings7dAgg = await DanhGiaSach.aggregate([
      { $match: { NgayDanhGia: { $gte: start7d, $lt: end } } },
      { $group: { _id: "$MaSach", ratings_7d: { $sum: 1 } } },
    ]);

    const views14dAgg = await TheoDoiXemSach.aggregate([
      { $match: { ThoiDiemXem: { $gte: start14d, $lt: end } } },
      { $group: { _id: "$MaSach", views_14d: { $sum: 1 } } },
    ]);

    const borrows14dAgg = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          NgayMuon: { $gte: start14d, $lt: end },
          TrangThai: { $in: ["approved", "returned"] },
        },
      },
      { $group: { _id: "$MaSach", borrows_14d: { $sum: 1 } } },
    ]);

    const ratings14dAgg = await DanhGiaSach.aggregate([
      { $match: { NgayDanhGia: { $gte: start14d, $lt: end } } },
      { $group: { _id: "$MaSach", ratings_14d: { $sum: 1 } } },
    ]);

    const scoreMap = new Map();

    function ensureEntry(bookIdStr) {
      if (!scoreMap.has(bookIdStr)) {
        scoreMap.set(bookIdStr, {
          views_7d: 0,
          borrows_7d: 0,
          ratings_7d: 0,
          views_14d: 0,
          borrows_14d: 0,
          ratings_14d: 0,
        });
      }
      return scoreMap.get(bookIdStr);
    }

    views7dAgg.forEach((d) => {
      const entry = ensureEntry(d._id.toString());
      entry.views_7d = d.views_7d || 0;
    });
    borrows7dAgg.forEach((d) => {
      const entry = ensureEntry(d._id.toString());
      entry.borrows_7d = d.borrows_7d || 0;
    });
    ratings7dAgg.forEach((d) => {
      const entry = ensureEntry(d._id.toString());
      entry.ratings_7d = d.ratings_7d || 0;
    });

    views14dAgg.forEach((d) => {
      const entry = ensureEntry(d._id.toString());
      entry.views_14d = d.views_14d || 0;
    });
    borrows14dAgg.forEach((d) => {
      const entry = ensureEntry(d._id.toString());
      entry.borrows_14d = d.borrows_14d || 0;
    });
    ratings14dAgg.forEach((d) => {
      const entry = ensureEntry(d._id.toString());
      entry.ratings_14d = d.ratings_14d || 0;
    });

    const result = [];
    for (const [bookIdStr, counts] of scoreMap.entries()) {
      if (!processedBookIds.has(bookIdStr)) {
        const recent_activity =
          counts.views_7d + counts.borrows_7d + counts.ratings_7d;
        const total_activity =
          counts.views_14d + counts.borrows_14d + counts.ratings_14d;
        const previous_activity = total_activity - recent_activity;

        let trending_score = 0;

        // CÔNG THỨC MỚI: ANTI-POPULAR + FRESH DISCOVERY

        // Bước 1: Lọc sách - chỉ xét sách chưa quá popular (total < 120)
        if (total_activity >= 120) {
          // console.log(`Loai sach qua popular - Book: ${bookIdStr}, total_activity: ${total_activity} >= 120`);
        }
        // Bước 2: Phải có hoạt động tối thiểu trong 7 ngày gần
        else if (recent_activity < 8) {
          // console.log(`Khong du hoat dong gan day - Book: ${bookIdStr}, recent_activity: ${recent_activity} < 8`);
        }
        // Bước 3: Tính điểm cho sách fresh/trending
        else {
          // Freshness bonus: sách càng ít lịch sử càng được ưu tiên
          const freshness_bonus = Math.max(0.3, (120 - total_activity) / 120);

          // Recent momentum: nhân đôi trọng số hoạt động gần đây
          const recent_momentum = recent_activity * 2;

          // Growth factor: nếu có tăng trưởng thì bonus
          let growth_factor = 1.0;
          if (previous_activity > 0 && recent_activity > previous_activity) {
            growth_factor =
              1 +
              Math.min(
                (recent_activity - previous_activity) / previous_activity,
                1.0
              );
          }

          // Công thức cuối: Fresh Discovery Score
          trending_score = recent_momentum * freshness_bonus * growth_factor;

          // console.log(`Fresh Discovery - Book: ${bookIdStr}, recent: ${recent_activity}, total: ${total_activity}, freshness_bonus: ${freshness_bonus.toFixed(2)}, growth_factor: ${growth_factor.toFixed(2)}, trending_score: ${trending_score.toFixed(3)}`);
        }

        result.push({
          bookIdStr,
          views_7d: counts.views_7d,
          borrows_7d: counts.borrows_7d,
          ratings_7d: counts.ratings_7d,
          views_14d: counts.views_14d,
          borrows_14d: counts.borrows_14d,
          ratings_14d: counts.ratings_14d,
          growth_rate: trending_score,
        });

        processedBookIds.add(bookIdStr);
      }
    }

    return result;
  }

  // Fallback logic: lùi period cho đến khi đủ sách
  let tries = 0;
  while ((!limit || allScoredBooks.length < limit) && tries < 12) {
    const periodData = await getPeriodData(
      startOfWeek,
      endOfPeriod,
      startOf2Weeks
    );
    allScoredBooks.push(...periodData);

    if (limit && allScoredBooks.length >= limit) break;

    startOfWeek.setDate(startOfWeek.getDate() - 14);
    startOf2Weeks.setDate(startOf2Weeks.getDate() - 14);
    endOfPeriod.setDate(endOfPeriod.getDate() - 14);
    tries++;
  }

  if (allScoredBooks.length === 0) {
    return [];
  }

  // Lọc ra chỉ những sách có trending_score > 0
  const validTrendingBooks = allScoredBooks.filter(
    (book) => book.growth_rate > 0
  );

  if (validTrendingBooks.length === 0) {
    return [];
  }

  // Sắp xếp theo growth_rate giảm dần
  validTrendingBooks.sort((a, b) => b.growth_rate - a.growth_rate);

  // Nếu có limit thì slice, nếu không thì lấy hết
  const topSlice = limit
    ? validTrendingBooks.slice(0, limit)
    : validTrendingBooks;

  // Lấy thông tin sách
  const bookIds = topSlice.map((s) => mongoose.Types.ObjectId(s.bookIdStr));
  const bookDocs = await Sach.find({ _id: { $in: bookIds } })
    .select("MaSach TenSach TacGia Image")
    .lean();
  const bookDocMap = new Map(bookDocs.map((b) => [b._id.toString(), b]));

  // Tính số sao trung bình
  const ratingsData = await DanhGiaSach.aggregate([
    { $match: { MaSach: { $in: bookIds } } },
    {
      $group: {
        _id: "$MaSach",
        avgRating: { $avg: "$SoSao" },
        totalRatings: { $sum: 1 },
      },
    },
  ]);
  const ratingsMap = new Map(
    ratingsData.map((r) => [
      r._id.toString(),
      {
        avgRating: r.avgRating || 0,
        totalRatings: r.totalRatings || 0,
      },
    ])
  );

  // Gộp kết quả cuối
  const finalResult = topSlice.map((item) => {
    const doc = bookDocMap.get(item.bookIdStr);
    const rating = ratingsMap.get(item.bookIdStr) || {
      avgRating: 0,
      totalRatings: 0,
    };

    return {
      _id: doc ? doc._id : mongoose.Types.ObjectId(item.bookIdStr),
      MaSach: doc ? doc.MaSach : null,
      TenSach: doc ? doc.TenSach : "",
      TacGia: doc ? doc.TacGia : "",
      Image: doc ? doc.Image : "",
      views_7d: item.views_7d,
      borrows_7d: item.borrows_7d,
      ratings_7d: item.ratings_7d,
      views_14d: item.views_14d,
      borrows_14d: item.borrows_14d,
      ratings_14d: item.ratings_14d,
      growth_rate: parseFloat(item.growth_rate.toFixed(3)),
      SoSaoTB: parseFloat(rating.avgRating.toFixed(1)), // giống getTodayBook
    };
  });

  return finalResult;
}

async function getPopularBook(limit) {
  // Nếu có truyền limit thì đảm bảo là số dương hợp lệ
  if (limit !== undefined && limit !== null) {
    limit = Math.max(1, parseInt(limit) || 1);
  }

  // Lấy tổng views cho mỗi sách
  const viewsAgg = await TheoDoiXemSach.aggregate([
    { $group: { _id: "$MaSach", views: { $sum: 1 } } },
  ]);

  // Lấy tổng borrows cho mỗi sách (chỉ tính approved + returned)
  const borrowsAgg = await TheoDoiMuonSach.aggregate([
    { $match: { TrangThai: { $in: ["approved", "returned"] } } },
    { $group: { _id: "$MaSach", borrows: { $sum: 1 } } },
  ]);

  // Lấy tổng ratings cho mỗi sách
  const ratingsAgg = await DanhGiaSach.aggregate([
    { $group: { _id: "$MaSach", ratings: { $sum: 1 } } },
  ]);

  // Gom dữ liệu lại theo bookId
  const scoreMap = new Map();

  function ensureEntry(bookIdStr) {
    if (!scoreMap.has(bookIdStr)) {
      scoreMap.set(bookIdStr, { views: 0, borrows: 0, ratings: 0 });
    }
    return scoreMap.get(bookIdStr);
  }

  viewsAgg.forEach((d) => {
    const entry = ensureEntry(d._id.toString());
    entry.views = d.views || 0;
  });

  borrowsAgg.forEach((d) => {
    const entry = ensureEntry(d._id.toString());
    entry.borrows = d.borrows || 0;
  });

  ratingsAgg.forEach((d) => {
    const entry = ensureEntry(d._id.toString());
    entry.ratings = d.ratings || 0;
  });

  // Tính score cho từng sách
  const scoredBooks = [];
  for (const [bookIdStr, counts] of scoreMap.entries()) {
    const score =
      0.2 * counts.views + 0.5 * counts.borrows + 0.3 * counts.ratings;
    scoredBooks.push({ bookIdStr, ...counts, score });
  }

  if (scoredBooks.length === 0) {
    return [];
  }

  // Sắp xếp theo score giảm dần
  scoredBooks.sort((a, b) => b.score - a.score);

  // Nếu có limit thì slice, nếu không thì lấy hết
  const topSlice = limit ? scoredBooks.slice(0, limit) : scoredBooks;

  // Lấy thông tin sách
  const bookIds = topSlice.map((s) => mongoose.Types.ObjectId(s.bookIdStr));
  const bookDocs = await Sach.find({ _id: { $in: bookIds } })
    .select("MaSach TenSach TacGia Image DonGia")
    .lean();
  const bookDocMap = new Map(bookDocs.map((b) => [b._id.toString(), b]));

  // Tính số sao trung bình
  const ratingsData = await DanhGiaSach.aggregate([
    { $match: { MaSach: { $in: bookIds } } },
    {
      $group: {
        _id: "$MaSach",
        avgRating: { $avg: "$SoSao" },
        totalRatings: { $sum: 1 },
      },
    },
  ]);
  const ratingsMap = new Map(
    ratingsData.map((r) => [
      r._id.toString(),
      {
        avgRating: r.avgRating || 0,
        totalRatings: r.totalRatings || 0,
      },
    ])
  );

  // Gộp kết quả cuối
  const finalResult = topSlice.map((item) => {
    const doc = bookDocMap.get(item.bookIdStr);
    const rating = ratingsMap.get(item.bookIdStr) || {
      avgRating: 0,
      totalRatings: 0,
    };

    return {
      _id: doc ? doc._id : mongoose.Types.ObjectId(item.bookIdStr),
      MaSach: doc ? doc.MaSach : null,
      TenSach: doc ? doc.TenSach : "",
      TacGia: doc ? doc.TacGia : "",
      Image: doc ? doc.Image : "",
      DonGia: doc ? doc.DonGia : "",
      views: item.views,
      borrows: item.borrows,
      ratings: item.ratings,
      score: parseFloat(item.score.toFixed(3)), // làm tròn 3 chữ số thập phân
      SoSaoTB: parseFloat(rating.avgRating.toFixed(1)), // làm tròn 1 chữ số thập phân
    };
  });

  return finalResult;
}

async function getBookPenaltyRule() {
  try {
    const rule = await QuyDinhPhatSach.findOne().sort({ updatedAt: -1 }).exec();
    return rule;
  } catch (error) {
    console.error("Lỗi service: getBookPenaltyRule", error);
    throw error;
  }
}

async function updateBookPenaltyRule(ruleUpdates) {
  try {
    const updatedRule = await QuyDinhPhatSach.findOneAndUpdate(
      {},
      {
        $set: {
          ...ruleUpdates,
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    return updatedRule;
  } catch (err) {
    console.error("Lỗi service updateBookPenaltyRule:", err);
    throw err;
  }
}

async function getBookBorrowRule() {
  try {
    const rule = await QuyDinhMuonSach.findOne().sort({ updatedAt: -1 }).exec();
    return rule;
  } catch (error) {
    console.error("Lỗi service: getBookBorrowRule", error);
    throw error;
  }
}

async function updateBookBorrowRule(ruleUpdates) {
  try {
    const updatedRule = await QuyDinhMuonSach.findOneAndUpdate(
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
    console.error("❌ Lỗi service updateBookBorrowRule:", err);
    throw err;
  }
}

async function addThesis(data) {
  try {
    const newThesis = new LuanVan({
      TieuDeTai: data.TieuDeTai,
      MaDocGia: data.MaSV,
      BacDaoTao: data.BacDaoTao,
      NamBaoVe: data.NamBaoVe,
      GiaoVienHuongDan: data.GiaoVienHuongDan,
      Pdf: data.Pdf,
      Image: data.Image,
      MaDotNop: data.MaDotNop, // ✅ THÊM dòng này
    });

    const savedThesis = await newThesis.save();
    return savedThesis;
  } catch (err) {
    console.error("Lỗi khi thêm luận văn:", err);
    throw err;
  }
}

async function getOneThesis(userId) {
  try {
    return await LuanVan.findOne({ MaDocGia: userId })
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    throw err;
  }
}

async function getAllThesis() {
  try {
    return await LuanVan.find()
      .populate({
        path: "MaDocGia",
        select: "MaDocGia HoLot Ten",
        populate: {
          path: "SinhVien",
          select: "MaSinhVien Avatar MaNganhHoc",
          populate: {
            path: "MaNganhHoc",
            select: "TenNganh Khoa",
            populate: {
              path: "Khoa",
              select: "TenKhoa",
            },
          },
        },
      })
      // ✅ THÊM ĐOẠN NÀY
      .populate({
        path: "MaDotNop",
        select: "TenDot ThoiGianMoNop ThoiGianDongNop TrangThai KyHoc NamHoc",
        populate: [
          {
            path: "KyHoc",
            select: "TenKyHoc",
          },
          {
            path: "NamHoc",
            select: "TenNamHoc",
          },
        ],
      })
      .lean();
  } catch (err) {
    throw err;
  }
}

async function approveThesis(thesisId) {
  try {
    const thesis = await LuanVan.findByIdAndUpdate(
      thesisId,
      { TrangThai: "Đã duyệt", NgayNop: new Date() },
      { new: true }
    ).populate("MaDocGia"); // ✅ THÊM populate để lấy thông tin DocGia

    if (!thesis) {
      throw new Error("Không tìm thấy luận văn");
    }

    // Tạo thông báo cho độc giả
    if (thesis.MaDocGia) {
      await notificationService.createNotification({
        DocGia: thesis.MaDocGia._id,
        TieuDe: "Luận văn được duyệt",
        NoiDung: `Luận văn "${thesis.TieuDeTai}" của bạn đã được phê duyệt và đưa vào thư viện.`,
        LoaiThongBao: "success",
      });
    }

    return thesis;
  } catch (err) {
    throw err;
  }
}

async function rejectThesis(thesisId) {
  try {
    const thesis = await LuanVan.findByIdAndUpdate(
      thesisId,
      { TrangThai: "Từ chối" },
      { new: true }
    ).populate("MaDocGia"); // ✅ THÊM populate để lấy thông tin DocGia

    if (!thesis) {
      throw new Error("Không tìm thấy luận văn");
    }

    // Tạo thông báo cho độc giả
    if (thesis.MaDocGia) {
      await notificationService.createNotification({
        DocGia: thesis.MaDocGia._id,
        TieuDe: "Luận văn bị từ chối",
        NoiDung: `Luận văn "${thesis.TieuDeTai}" của bạn đã bị từ chối. Vui lòng liên hệ thư viện để biết thêm chi tiết.`,
        LoaiThongBao: "error",
      });
    }

    return thesis;
  } catch (err) {
    throw err;
  }
}

async function updatePenaltyFee(requestId, adminId, newTotalFee, reason) {
  try {
    const request = await TheoDoiMuonSach.findById(requestId);
    if (!request) {
      throw new Error("Không tìm thấy yêu cầu mượn");
    }

    // Kiểm tra đã thanh toán chưa
    if (request.DaThanhToan) {
      throw new Error("Không thể sửa phí sau khi đã thanh toán");
    }

    // Kiểm tra phải có phí mới được sửa
    if (request.PhiBoiThuong === 0 && request.PhiQuaHan === 0) {
      throw new Error("Không có phí để điều chỉnh");
    }

    // Cập nhật thông tin
    const updateFields = {
      TongPhiDaSua: newTotalFee,
      LyDoSua: reason.trim(),
      Msnv: adminId,
    };

    const updated = await TheoDoiMuonSach.findByIdAndUpdate(
      requestId,
      updateFields,
      { new: true }
    ).populate("MaDocGia MaSach");

    return updated;
  } catch (err) {
    console.error("Lỗi khi cập nhật tổng phí phạt:", err);
    throw err;
  }
}

// 1. Tạo đợt nộp luận văn
async function createDotNop(data) {
  try {
    const { ThoiGianMoNop, ThoiGianDongNop } = data;

    // Xác định trạng thái dựa trên thời gian hiện tại
    const now = new Date();
    const moNop = new Date(ThoiGianMoNop);
    const dongNop = new Date(ThoiGianDongNop);

    let trangThai = "Chưa mở";
    if (now >= moNop && now <= dongNop) {
      trangThai = "Đang mở";
    } else if (now > dongNop) {
      trangThai = "Đã đóng";
    }

    const newDotNop = new DotNopLuanVan({
      ...data,
      TrangThai: trangThai,
    });

    const savedDotNop = await newDotNop.save();

    const populatedDotNop = await DotNopLuanVan.findById(savedDotNop._id)
      .populate("KyHoc", "TenKyHoc")
      .populate("NamHoc", "TenNamHoc")
      .lean();

    // ===== GỬI THÔNG BÁO CHO TOÀN BỘ ĐỘC GIẢ =====
    if (trangThai === "Đang mở") {
      const allDocGia = await DocGia.find({}, "_id HoLot Ten DoiTuong");
      console.log(`Đang gửi thông báo đến ${allDocGia.length} độc giả...`);

      const promises = allDocGia.map((dg) =>
        notificationService
          .createNotification({
            DocGia: dg._id,
            TieuDe: "Mở đợt nộp luận văn mới",
            NoiDung: `Đợt "${
              populatedDotNop.TenDot
            }" đã được mở từ ngày ${moNop.toLocaleDateString(
              "vi-VN"
            )} đến ${dongNop.toLocaleDateString(
              "vi-VN"
            )}. Vui lòng truy cập hệ thống để nộp luận văn.`,
            LoaiThongBao: "info",
          })
          .catch((err) => {
            console.error(`Lỗi gửi thông báo cho ${dg._id}:`, err.message);
          })
      );

      await Promise.all(promises);
      console.log("Hoàn tất gửi thông báo cho tất cả độc giả.");
    }

    return await DotNopLuanVan.findById(savedDotNop._id)
      .populate("KyHoc")
      .populate("NamHoc")
      .lean();
  } catch (err) {
    console.error("Lỗi khi tạo đợt nộp:", err);
    throw err;
  }
}

// 2. Lấy tất cả đợt nộp
async function getAllDotNop() {
  try {
    return await DotNopLuanVan.find()
      .populate("KyHoc")
      .populate("NamHoc")
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    throw err;
  }
}

// 3. Cập nhật đợt nộp
async function updateDotNop(dotNopId, updateData) {
  try {
    // Nếu có cập nhật thời gian, tính lại trạng thái
    if (updateData.ThoiGianMoNop || updateData.ThoiGianDongNop) {
      const dotNop = await DotNopLuanVan.findById(dotNopId);
      const now = new Date();
      const moNop = new Date(updateData.ThoiGianMoNop || dotNop.ThoiGianMoNop);
      const dongNop = new Date(
        updateData.ThoiGianDongNop || dotNop.ThoiGianDongNop
      );

      if (now >= moNop && now <= dongNop) {
        updateData.TrangThai = "Đang mở";
      } else if (now > dongNop) {
        updateData.TrangThai = "Đã đóng";
      } else {
        updateData.TrangThai = "Chưa mở";
      }
    }

    const updated = await DotNopLuanVan.findByIdAndUpdate(
      dotNopId,
      updateData,
      { new: true }
    )
      .populate("KyHoc")
      .populate("NamHoc")
      .lean();

    if (!updated) {
      throw new Error("Không tìm thấy đợt nộp");
    }

    return updated;
  } catch (err) {
    throw err;
  }
}

// 4. Xóa đợt nộp
async function deleteDotNop(dotNopId) {
  try {
    // Kiểm tra xem có luận văn nào thuộc đợt này không
    const thesisCount = await LuanVan.countDocuments({ MaDotNop: dotNopId });

    if (thesisCount > 0) {
      throw new Error("Không thể xóa đợt nộp đã có luận văn");
    }

    const deleted = await DotNopLuanVan.findByIdAndDelete(dotNopId);

    if (!deleted) {
      throw new Error("Không tìm thấy đợt nộp");
    }

    return { message: "Xóa đợt nộp thành công" };
  } catch (err) {
    throw err;
  }
}

// 5. Lấy đợt nộp đang mở
async function getActiveDotNop() {
  try {
    const now = new Date();
    return await DotNopLuanVan.findOne({
      TrangThai: "Đang mở",
      ThoiGianMoNop: { $lte: now },
      ThoiGianDongNop: { $gte: now },
    })
      .populate("KyHoc")
      .populate("NamHoc")
      .lean();
  } catch (err) {
    throw err;
  }
}

// 6. Lấy tất cả năm học
async function getAllNamHoc() {
  try {
    return await NamHoc.find().sort({ TenNamHoc: -1 }).lean();
  } catch (err) {
    throw err;
  }
}

// 7. Lấy tất cả kỳ học
async function getAllKyHoc() {
  try {
    return await KyHoc.find().lean();
  } catch (err) {
    throw err;
  }
}

// Thêm kỳ học
async function addKyHoc(TenKyHoc) {
  try {
    const newKyHoc = new KyHoc({
      TenKyHoc: TenKyHoc,
    });

    const saved = await newKyHoc.save();
    return saved;
  } catch (err) {
    console.error("Lỗi khi thêm kỳ học:", err);
    throw err;
  }
}

// Thêm năm học
async function addNamHoc(TenNamHoc) {
  try {
    const newNamHoc = new NamHoc({
      TenNamHoc: TenNamHoc,
    });

    const saved = await newNamHoc.save();
    return saved;
  } catch (err) {
    console.error("Lỗi khi thêm năm học:", err);
    throw err;
  }
}

// ==================== SERVICES NIÊN LUẬN ====================

// 1. Sinh viên nộp niên luận
async function addNienLuan(data) {
  try {
    const newNienLuan = new NienLuan({
      TenDeTai: data.TenDeTai,
      MaDocGia: data.MaDocGia, // ✅ Đúng với controller & model
      Pdf: data.Pdf,
      Image: data.Image,
      MaDotNop: data.MaDotNop,
      TrangThai: data.TrangThai || "Chờ duyệt", // ✅ Thêm fallback
      NgayNop: data.NgayNop || new Date(), // ✅ Thêm fallback
    });

    const savedNienLuan = await newNienLuan.save();
    return savedNienLuan;
  } catch (err) {
    console.error("Lỗi khi thêm niên luận:", err);
    throw err;
  }
}

// 2. Lấy 1 niên luận của sinh viên (lấy mới nhất)
async function getOneNienLuan(userId) {
  try {
    return await NienLuan.findOne({ MaDocGia: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "MaDotNop",
        select:
          "TenDot ThoiGianMoNop ThoiGianDongNop TrangThai KyHoc NamHoc MaGiangVien",
        populate: [
          { path: "KyHoc", select: "TenKyHoc" },
          { path: "NamHoc", select: "TenNamHoc" },
          {
            path: "MaGiangVien",
            select: "HoLot Ten",
          },
        ],
      })
      .lean();
  } catch (err) {
    throw err;
  }
}

// 3. Tạo đợt nộp niên luận (Giảng viên)
async function createDotNopNienLuan(data) {
  try {
    const { ThoiGianMoNop, ThoiGianDongNop } = data;

    // Xác định trạng thái dựa trên thời gian hiện tại
    const now = new Date();
    const moNop = new Date(ThoiGianMoNop);
    const dongNop = new Date(ThoiGianDongNop);

    let trangThai = "Chưa mở";
    if (now >= moNop && now <= dongNop) {
      trangThai = "Đang mở";
    } else if (now > dongNop) {
      trangThai = "Đã đóng";
    }

    const newDotNop = new DotNopNienLuan({
      ...data,
      TrangThai: trangThai,
    });

    const savedDotNop = await newDotNop.save();
    return await DotNopNienLuan.findById(savedDotNop._id)
      .populate("KyHoc")
      .populate("NamHoc")
      .populate("MaGiangVien", "HoLot Ten")
      .lean();
  } catch (err) {
    console.error("Lỗi khi tạo đợt nộp niên luận:", err);
    throw err;
  }
}

// 4. Lấy tất cả đợt nộp niên luận của giảng viên
async function getAllDotNopNienLuan(maGiangVien) {
  try {
    const dotNopList = await DotNopNienLuan.find({ MaGiangVien: maGiangVien })
      .populate("KyHoc")
      .populate("NamHoc")
      .populate("MaGiangVien", "HoLot Ten")
      .sort({ createdAt: -1 })
      .lean();

    // Đếm số lượng niên luận đã nộp cho từng đợt
    const result = await Promise.all(
      dotNopList.map(async (dot) => {
        const soLuongDaNop = await NienLuan.countDocuments({
          MaDotNop: dot._id,
        });
        return {
          ...dot,
          soLuongDaNop,
        };
      })
    );

    return result;
  } catch (err) {
    throw err;
  }
}

// 5. Cập nhật đợt nộp niên luận
async function updateDotNopNienLuan(dotNopId, updateData) {
  try {
    // Nếu có cập nhật thời gian, tính lại trạng thái
    if (updateData.ThoiGianMoNop || updateData.ThoiGianDongNop) {
      const dotNop = await DotNopNienLuan.findById(dotNopId);
      const now = new Date();
      const moNop = new Date(updateData.ThoiGianMoNop || dotNop.ThoiGianMoNop);
      const dongNop = new Date(
        updateData.ThoiGianDongNop || dotNop.ThoiGianDongNop
      );

      if (now >= moNop && now <= dongNop) {
        updateData.TrangThai = "Đang mở";
      } else if (now > dongNop) {
        updateData.TrangThai = "Đã đóng";
      } else {
        updateData.TrangThai = "Chưa mở";
      }
    }

    const updated = await DotNopNienLuan.findByIdAndUpdate(
      dotNopId,
      updateData,
      {
        new: true,
      }
    )
      .populate("KyHoc")
      .populate("NamHoc")
      .populate("MaGiangVien", "HoLot Ten")
      .lean();

    if (!updated) {
      throw new Error("Không tìm thấy đợt nộp niên luận");
    }

    return updated;
  } catch (err) {
    throw err;
  }
}

// 6. Xóa đợt nộp niên luận
async function deleteDotNopNienLuan(dotNopId) {
  try {
    // Kiểm tra xem có niên luận nào thuộc đợt này không
    const nienLuanCount = await NienLuan.countDocuments({ MaDotNop: dotNopId });

    if (nienLuanCount > 0) {
      throw new Error("Không thể xóa đợt nộp đã có niên luận");
    }

    const deleted = await DotNopNienLuan.findByIdAndDelete(dotNopId);

    if (!deleted) {
      throw new Error("Không tìm thấy đợt nộp niên luận");
    }

    return { message: "Xóa đợt nộp niên luận thành công" };
  } catch (err) {
    throw err;
  }
}

// 7. Lấy đợt nộp đang mở của giảng viên
async function getActiveDotNopNienLuan(maGiangVien) {
  try {
    const now = new Date();
    return await DotNopNienLuan.findOne({
      MaGiangVien: maGiangVien,
      TrangThai: "Đang mở",
      ThoiGianMoNop: { $lte: now },
      ThoiGianDongNop: { $gte: now },
    })
      .populate("KyHoc")
      .populate("NamHoc")
      .populate("MaGiangVien", "HoLot Ten")
      .lean();
  } catch (err) {
    throw err;
  }
}

// 7b. Lấy đợt nộp đang mở cho sinh viên (để kiểm tra khi nộp)
async function getActiveDotNopNienLuanForStudent(data) {
  try {
    const { maGiangVien } = data;
    const now = new Date();

    return await DotNopNienLuan.findOne({
      MaGiangVien: maGiangVien,
      TrangThai: "Đang mở",
      ThoiGianMoNop: { $lte: now },
      ThoiGianDongNop: { $gte: now },
    })
      .populate("KyHoc")
      .populate("NamHoc")
      .lean();
  } catch (err) {
    throw err;
  }
}

// 8. Lấy tất cả niên luận theo giảng viên (qua các đợt nộp)
async function getAllNienLuanByGiangVien(maGiangVien) {
  try {
    // Lấy tất cả đợt nộp của giảng viên
    const dotNopList = await DotNopNienLuan.find({
      MaGiangVien: maGiangVien,
    }).select("_id");

    const dotNopIds = dotNopList.map((dot) => dot._id);

    // Lấy tất cả niên luận thuộc các đợt nộp này
    return await NienLuan.find({
      MaDotNop: { $in: dotNopIds },
    })
      .populate({
        path: "MaDocGia",
        select: "MaDocGia HoLot Ten",
        populate: {
          path: "SinhVien",
          select: "MaSinhVien Avatar MaNganhHoc",
          populate: {
            path: "MaNganhHoc",
            select: "TenNganh Khoa",
            populate: {
              path: "Khoa",
              select: "TenKhoa",
            },
          },
        },
      })
      .populate({
        path: "MaDotNop",
        select: "TenDot ThoiGianMoNop ThoiGianDongNop TrangThai KyHoc NamHoc",
        populate: [
          { path: "KyHoc", select: "TenKyHoc" },
          { path: "NamHoc", select: "TenNamHoc" },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    throw err;
  }
}

async function getAllNienLuanCuaKhoa(maGiangVien) {
  try {
    // 1️⃣ Tìm giảng viên tương ứng với MaDocGia (maGiangVien)
    const giangVien = await GiangVien.findOne({ MaDocGia: maGiangVien })
      .populate({
        path: "MaBoMon",
        select: "MaKhoa",
      })
      .lean();

    if (!giangVien) {
      throw new Error(
        "Không tìm thấy giảng viên tương ứng với mã độc giả này."
      );
    }

    const khoaId =
      giangVien && giangVien.MaBoMon && giangVien.MaBoMon.MaKhoa
        ? giangVien.MaBoMon.MaKhoa
        : null;

    if (!khoaId) {
      throw new Error("Giảng viên chưa thuộc khoa nào.");
    }

    // 2️⃣ Lấy toàn bộ niên luận đã duyệt
    const allNienLuan = await NienLuan.find({ TrangThai: "Đã duyệt" })
      .populate({
        path: "MaDocGia",
        select: "MaDocGia HoLot Ten",
        populate: {
          path: "SinhVien",
          select: "MaSinhVien Avatar MaNganhHoc",
          populate: {
            path: "MaNganhHoc",
            select: "TenNganh Khoa",
            populate: {
              path: "Khoa",
              select: "TenKhoa",
            },
          },
        },
      })
      .populate({
        path: "MaDotNop",
        select:
          "TenDot ThoiGianMoNop ThoiGianDongNop TrangThai KyHoc NamHoc MaGiangVien",
        populate: [
          { path: "KyHoc", select: "TenKyHoc" },
          { path: "NamHoc", select: "TenNamHoc" },
          {
            path: "MaGiangVien",
            select: "HoLot Ten DoiTuong",
            model: "DocGia",
            populate: {
              path: "GiangVien",
              select: "MaCanBo Avatar HocVi MaBoMon",
              populate: {
                path: "MaBoMon",
                select: "TenBoMon",
              },
            },
          },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    // 3️⃣ Lọc chỉ những niên luận thuộc khoa của giảng viên
    const nienLuanCuaKhoa = allNienLuan.filter(function (item) {
      if (
        item &&
        item.MaDocGia &&
        item.MaDocGia.SinhVien &&
        item.MaDocGia.SinhVien.MaNganhHoc &&
        item.MaDocGia.SinhVien.MaNganhHoc.Khoa &&
        item.MaDocGia.SinhVien.MaNganhHoc.Khoa._id &&
        khoaId
      ) {
        return (
          String(item.MaDocGia.SinhVien.MaNganhHoc.Khoa._id) === String(khoaId)
        );
      }
      return false;
    });

    return nienLuanCuaKhoa;
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách niên luận của khoa:", err);
    throw err;
  }
}

// 9. Duyệt niên luận
async function approveNienLuan(nienLuanId) {
  try {
    const nienLuan = await NienLuan.findByIdAndUpdate(
      nienLuanId,
      { TrangThai: "Đã duyệt", NgayNop: new Date() },
      { new: true }
    ).populate("MaDocGia");

    if (!nienLuan) {
      throw new Error("Không tìm thấy niên luận");
    }

    // Tạo thông báo cho sinh viên
    if (nienLuan.MaDocGia) {
      await notificationService.createNotification({
        DocGia: nienLuan.MaDocGia._id,
        TieuDe: "Niên luận được duyệt",
        NoiDung: `Niên luận "${nienLuan.TenDeTai}" của bạn đã được phê duyệt.`,
        LoaiThongBao: "success",
      });
    }

    return nienLuan;
  } catch (err) {
    throw err;
  }
}

// 10. Từ chối niên luận
async function rejectNienLuan(nienLuanId) {
  try {
    const nienLuan = await NienLuan.findByIdAndUpdate(
      nienLuanId,
      { TrangThai: "Từ chối" },
      { new: true }
    ).populate("MaDocGia");

    if (!nienLuan) {
      throw new Error("Không tìm thấy niên luận");
    }

    // Tạo thông báo cho sinh viên
    if (nienLuan.MaDocGia) {
      await notificationService.createNotification({
        DocGia: nienLuan.MaDocGia._id,
        TieuDe: "Niên luận bị từ chối",
        NoiDung: `Niên luận "${nienLuan.TenDeTai}" của bạn đã bị từ chối. Vui lòng liên hệ giảng viên để biết thêm chi tiết.`,
        LoaiThongBao: "error",
      });
    }

    return nienLuan;
  } catch (err) {
    throw err;
  }
}

async function getAllGiangVien() {
  try {
    // Tìm tất cả DocGia có DoiTuong là 'Giảng viên'
    const docGiaList = await DocGia.find({ DoiTuong: "Giảng viên" })
      .select("_id HoLot Ten")
      .lean();

    // Populate thông tin GiangVien cho mỗi DocGia
    const result = await Promise.all(
      docGiaList.map(async (docGia) => {
        const giangVien = await GiangVien.findOne({ MaDocGia: docGia._id })
          .select("MaCanBo HocVi")
          .lean();

        return {
          _id: docGia._id,
          HoLot: docGia.HoLot,
          Ten: docGia.Ten,
          GiangVien: giangVien,
        };
      })
    );

    // Chỉ trả về những DocGia có thông tin GiangVien
    return result.filter((item) => item.GiangVien !== null);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách giảng viên:", err);
    throw err;
  }
}

async function getAllActiveDotNopNienLuan(maDocGia) {
  try {
    // Lấy thông tin sinh viên để biết khoa
    const sinhVien = await SinhVien.findOne({ MaDocGia: maDocGia })
      .populate({
        path: "MaNganhHoc",
        populate: {
          path: "Khoa",
        },
      })
      .lean();

    if (!sinhVien || !sinhVien.MaNganhHoc || !sinhVien.MaNganhHoc.Khoa) {
      return [];
    }

    const khoaId = sinhVien.MaNganhHoc.Khoa._id;

    const now = new Date();

    // Tìm tất cả đợt có TrangThai = 'Đang mở'
    // HOẶC (ThoiGianMoNop <= now <= ThoiGianDongNop)
    const dotNopList = await DotNopNienLuan.find({
      $or: [
        { TrangThai: "Đang mở" },
        {
          ThoiGianMoNop: { $lte: now },
          ThoiGianDongNop: { $gte: now },
        },
      ],
    })
      .populate("KyHoc", "TenKyHoc")
      .populate("NamHoc", "TenNamHoc")
      .populate({
        path: "MaGiangVien",
        select: "HoLot Ten DoiTuong",
        populate: {
          path: "GiangVien",
          populate: {
            path: "MaBoMon",
            populate: {
              path: "MaKhoa",
            },
          },
        },
      })
      .sort({ ThoiGianDongNop: 1 }) // Sắp xếp theo hạn nộp gần nhất
      .lean();

    // Lọc chỉ lấy những đợt có MaGiangVien hợp lệ (là Giảng viên) và cùng khoa với sinh viên
    const result = dotNopList.filter((dot) => {
      if (!dot.MaGiangVien || dot.MaGiangVien.DoiTuong !== "Giảng viên") {
        return false;
      }

      // Kiểm tra giảng viên có thuộc cùng khoa không
      const giangVien = dot.MaGiangVien.GiangVien;
      if (!giangVien || !giangVien.MaBoMon || !giangVien.MaBoMon.MaKhoa) {
        return false;
      }

      return giangVien.MaBoMon.MaKhoa._id.toString() === khoaId.toString();
    });

    return result;
  } catch (err) {
    console.error("Lỗi khi lấy danh sách đợt nộp đang mở:", err);
    throw err;
  }
}

async function checkNienLuanSubmission(userId, dotNopId) {
  try {
    const nienLuan = await NienLuan.findOne({
      MaDocGia: userId,
      MaDotNop: dotNopId,
      TrangThai: { $in: ["Chờ duyệt", "Đã duyệt"] },
    })
      .populate("MaDotNop")
      .lean();

    if (!nienLuan) {
      return { hasSubmitted: false, data: null };
    }

    return {
      hasSubmitted: true,
      data: {
        trangThai: nienLuan.TrangThai,
        ngayNop: nienLuan.NgayNop,
        tenDeTai: nienLuan.TenDeTai,
        dotNop: nienLuan.MaDotNop,
      },
    };
  } catch (err) {
    console.error("Lỗi khi kiểm tra niên luận:", err);
    throw err;
  }
}

// Đếm số lượng niên luận đã nộp trong đợt
async function countNienLuanByDotNop(dotNopId) {
  try {
    return await NienLuan.countDocuments({
      MaDotNop: dotNopId,
    });
  } catch (err) {
    console.error("Lỗi khi đếm niên luận:", err);
    throw err;
  }
}

//Statistic
async function getStatisticBook() {
  try {
    // Lấy toàn bộ dữ liệu mượn sách, populate đủ thông tin cần thiết
    const result = await TheoDoiMuonSach.find()
      .populate({
        path: "MaSach",
        select: "MaSach TenSach DonGia SoQuyen NamXuatBan TacGia Image MaTheLoai LoaiSach Khoa", // thêm Khoa
        populate: [
          {
            path: "MaTheLoai",
            select: "TenTheLoai",
          },
          {
            path: "Khoa",
            select: "TenKhoa",
          },
        ],
      })
      .populate({
        path: "MaDocGia",
        select: "MaDocGia HoLot Ten",
      })
      .populate({
        path: "Msnv",
        select: "HoTen MaNhanVien",
      })
      .lean();

    return result;
  } catch (err) {
    console.error("Lỗi khi lấy danh sách thống kê mượn sách:", err);
    throw err;
  }
}


//Report Statistic
async function submitFilePdfReportStatistic(data) {
  try {
    // Kiểm tra nhân viên tồn tại
    const nhanVien = await NhanVien.findById(data.NguoiNop).exec();
    if (!nhanVien) {
      throw new Error("Không tìm thấy nhân viên nộp báo cáo");
    }

    // Tạo mới báo cáo
    const newReport = new BaoCaoThongKe({
      TieuDe: data.TieuDe,
      NguoiNop: nhanVien._id,
      LoaiBaoCao: data.LoaiBaoCao,
      TepDinhKem: data.TepDinhKem,
      TrangThai: "Đã nộp",
    });

    const savedReport = await newReport.save();
    return savedReport;
  } catch (err) {
    console.error("Lỗi khi lưu báo cáo:", err);
    throw err;
  }
}

async function submitFileExcelReportStatistic(data) { 
  try { 
    // Kiểm tra nhân viên tồn tại 
    const nhanVien = await NhanVien.findById(data.NguoiNop).exec(); 
    if (!nhanVien) { 
      throw new Error("Không tìm thấy nhân viên nộp báo cáo"); 
    } 
 
    // Tạo mới báo cáo (logic giống PDF)
    const newReport = new BaoCaoThongKe({ 
      TieuDe: data.TieuDe, 
      NguoiNop: nhanVien._id, 
      LoaiBaoCao: data.LoaiBaoCao, 
      TepDinhKem: data.TepDinhKem, 
      TrangThai: "Đã nộp", 
    }); 
 
    const savedReport = await newReport.save(); 
    return savedReport; 
  } catch (err) { 
    console.error("Lỗi khi lưu báo cáo Excel:", err); 
    throw err; 
  } 
}

async function getReportStatisticByReporter(NguoiNop) {
  try {
    // Kiểm tra nhân viên có tồn tại không
    const nhanVien = await NhanVien.findById(NguoiNop).exec();
    if (!nhanVien) {
      throw new Error("Không tìm thấy nhân viên");
    }

    // Lấy tất cả báo cáo do nhân viên này nộp
    const reports = await BaoCaoThongKe.find({ NguoiNop })
      .populate("NguoiNop", "HoTenNV Msnv ChucVu") // lấy thông tin cơ bản của nhân viên
      .sort({ createdAt: -1 }) // sắp xếp báo cáo mới nhất lên đầu
      .exec();

    return reports;
  } catch (err) {
    console.error("Lỗi khi truy vấn báo cáo:", err);
    throw err;
  }
}

async function deleteOneReportStatistic(reportId) {
  try {
    // Tìm báo cáo theo ID
    const report = await BaoCaoThongKe.findById(reportId).exec();
    if (!report) {
      return null;
    }

    const deletedReport = await BaoCaoThongKe.findByIdAndDelete(reportId).exec();

    return deletedReport;
  } catch (err) {
    console.error("Lỗi khi xóa báo cáo:", err);
    throw err;
  }
}

async function getAllReportStatistic() {
  try {
    // Lấy toàn bộ báo cáo, kèm thông tin người nộp
    const reports = await BaoCaoThongKe.find()
      .populate("NguoiNop", "HoTenNV Msnv ChucVu") // Lấy thông tin nhân viên nộp
      .sort({ createdAt: -1 }) // Báo cáo mới nhất lên đầu
      .exec();

    return reports;
  } catch (err) {
    console.error("Lỗi khi truy vấn tất cả báo cáo thống kê:", err);
    throw err;
  }
}

module.exports = {
  addBook,
  getAllBook,
  addGenre,
  getAllGenre,
  getOneBook,
  updateBook,
  deleteBook,
  getBookById,
  lendBook,
  getInfoLendBook,
  getTrackBorrowBook,
  updateBorrowStatus,
  extendBorrowTime,
  checkIfExtendBorrowTime,
  getBorrowBookOfUser,
  addFavoriteBook,
  getFavoriteBooks,
  deleteFavoriteBook,
  addRatingBook,
  getRatingByBookAndReader,
  updateRatingComment,
  deleteRatingBook,
  getAllCommentRating,
  getRatingByBook,
  addBookView,
  getMostViewBook,
  getTodayBook,
  getTopTenWeekBook,
  getTrendingBook,
  getPopularBook,
  countCurrentBorrowing,
  countCurrentBorrowingToday,
  countCurrentPending,
  countCurrentPendingToDay,
  deletePending,
  updateReturnStatus,
  confirmPaidCompensation,
  updateOverdueFee,
  getBookPenaltyRule,
  updateBookPenaltyRule,
  getBookBorrowRule,
  updateBookBorrowRule,
  confirmRepaired,
  addThesis,
  getOneThesis,
  getAllThesis,
  approveThesis,
  rejectThesis,
  addTextBook,
  updateTextBook,
  getOneTextBook,
  getAllFaculty,
  addFaculty,
  updatePenaltyFee,
  createDotNop,
  getAllDotNop,
  updateDotNop,
  deleteDotNop,
  getActiveDotNop,
  getAllNamHoc,
  getAllKyHoc,
  addKyHoc,
  addNamHoc,
  addNienLuan,
  getOneNienLuan,
  createDotNopNienLuan,
  getAllDotNopNienLuan,
  updateDotNopNienLuan,
  deleteDotNopNienLuan,
  getActiveDotNopNienLuan,
  getAllNienLuanByGiangVien,
  approveNienLuan,
  rejectNienLuan,
  getAllGiangVien,
  getAllActiveDotNopNienLuan,
  checkNienLuanSubmission,
  getAllNienLuanCuaKhoa,
  getStatisticBook,

  submitFilePdfReportStatistic,
  submitFileExcelReportStatistic,
  getReportStatisticByReporter,
  deleteOneReportStatistic,
  getAllReportStatistic
};
