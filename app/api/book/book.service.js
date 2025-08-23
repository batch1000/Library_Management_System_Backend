const mongoose = require('mongoose');

const Sach = require('../../models/sachModel');
const NhaXuatBan = require('../../models/nhaxuatbanModel');
const TheLoaiSach = require('../../models/theloaisachModel');
const TheoDoiMuonSach = require('../../models/theodoimuonsachModel')
const YeuThichSach = require('../../models/yeuthichsachModel')
const DanhGiaSach = require('../../models/danhgiasachModel');
const TheoDoiXemSach = require("../../models/theodoixemsachModel");
const DocGia = require('../../models/docgiaModel')

const { deleteImageFromCloudinary } = require('../../services/cloudinary.service');

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
    ? `S${nextNumber.toString().padStart(4, '0')}`
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
    ? `NXB${nextNumber.toString().padStart(4, '0')}`
    : `NXB${nextNumber}`;
}

async function getAllBook() {
  try {
    const books = await Sach.find()
      .populate('MaNXB', 'TenNXB DiaChi')
      .populate('MaTheLoai', 'TenTheLoai')
      .exec();

    return books;
  } catch (err) {
    console.error('Lỗi khi truy vấn tất cả sách:', err);
    throw err;
  }
}

async function getOneBook(keyword) {
  try {
    let query = {};

    if (/^S\d+$/i.test(keyword)) {
      query.MaSach = keyword.toUpperCase();
    } else {
      query.TenSach = { $regex: `^${keyword}$`, $options: 'i' };
    }

    const book = await Sach.findOne(query)
      .populate('MaNXB', 'TenNXB DiaChi')
      .populate('MaTheLoai', 'TenTheLoai')
      .exec();

    return book;
  } catch (err) {
    console.error('Lỗi khi truy vấn một sách:', err);
    throw err;
  }
}

async function getBookById(id) {
  try {
    const book = await Sach.findById(id)
      .populate('MaNXB', 'TenNXB DiaChi')
      .populate('MaTheLoai', 'TenTheLoai')
      .exec();

    return book;
  } catch (err) {
    console.error('Lỗi khi truy vấn sách theo ID:', err);
    throw err;
  }
}

async function addBook(data) {
  try {
    let nxb = await NhaXuatBan.findOne({ TenNXB: data.NhaXuatBan }).exec();

    if (!nxb) {
      const maNXB = await generateMaNXB();
      nxb = await NhaXuatBan.create({
        MaNXB: maNXB,
        TenNXB: data.NhaXuatBan,
        DiaChi: data.DiaChiNhaXuatBan
      });
    }

    const theLoai = await TheLoaiSach.findOne({ TenTheLoai: data.TheLoai }).exec();
    if (!theLoai) {
      throw new Error(`Thể loại "${data.TheLoai}" không tồn tại`);
    }

    const maSach = await generateMaSach();

    const newBook = await Sach.create({
      MaSach: maSach,
      TenSach: data.TenSach,
      DonGia: data.DonGia,
      SoQuyen: data.SoQuyen,
      NamXuatBan: data.NamXuatBan,
      TacGia: data.TacGia,
      MoTaSach: data.MoTaSach,
      Image: data.Image,
      MaNXB: nxb._id,
      MaTheLoai: theLoai._id
    });

    return newBook;
  } catch (err) {
    console.error('Lỗi khi thêm sách:', err);
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
          DiaChi: data.DiaChiNXB || ""
        });
      } else if (data.DiaChiNXB) {
        nxb.DiaChi = data.DiaChiNXB;
        await nxb.save();
      }

      updateData.MaNXB = nxb._id;
    }

    if (data.TenTheLoai) {
      const theLoai = await TheLoaiSach.findOne({ TenTheLoai: data.TenTheLoai }).exec();
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

    const updatedBook = await Sach.findByIdAndUpdate(id, updateData, { new: true });

    return updatedBook;
  } catch (err) {
    console.error('Lỗi khi cập nhật sách:', err);
    throw err;
  }
}

function extractPublicIdFromUrl(imageUrl) {
  try {
    console.log('Đang trích xuất publicId từ URL:', imageUrl);

    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      console.log('URL không phải từ Cloudinary');
      return null;
    }

    // Tách URL và lấy phần sau '/upload/'
    const parts = imageUrl.split('/upload/');
    if (parts.length < 2) {
      console.log('URL không có phần /upload/');
      return null;
    }

    let pathAfterUpload = parts[1];
    console.log('Path sau upload:', pathAfterUpload);

    // Bỏ version nếu có (vXXXXXXXXXX/)
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    console.log('Path sau khi bỏ version:', pathAfterUpload);

    // Bỏ các transformations nếu có (như w_500,h_300,c_fill/ etc.)
    const segments = pathAfterUpload.split('/');
    const lastSegment = segments[segments.length - 1];

    // Nếu có nhiều segments và segment cuối có extension, lấy path đầy đủ trừ extension
    let publicId;
    if (segments.length > 1) {
      // Có folder: images/filename.jpg -> images/filename
      publicId = pathAfterUpload.replace(/\.[^/.]+$/, ''); // Bỏ extension cuối
    } else {
      // Không có folder: filename.jpg -> filename
      publicId = lastSegment.replace(/\.[^/.]+$/, '');
    }

    console.log('PublicId được trích xuất:', publicId);
    return publicId;
  } catch (error) {
    console.error('Lỗi khi trích xuất publicId:', error);
    return null;
  }
}

async function deleteBook(id) {
  try {
    const book = await Sach.findById(id);

    if (!book) {
      throw new Error('Không tìm thấy sách để xóa');
    }

    const publicId = extractPublicIdFromUrl(book.Image);

    const result = await Sach.findByIdAndDelete(id);

    if (publicId) {
      try {
        await deleteImageFromCloudinary(publicId);
        console.log('Đã xóa ảnh từ Cloudinary:', publicId);
      } catch (imageError) {
        console.warn('Không thể xóa ảnh từ Cloudinary:', imageError.message);
      }
    } else {
      console.warn('Không thể trích xuất publicId từ URL:', book.Image);
    }

    return result;
  } catch (err) {
    console.error('Lỗi khi xóa sách:', err);
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
      TrangThai: 'pending'
    });

    const savedRecord = await record.save();
    return savedRecord;

  } catch (err) {
    console.error('Lỗi khi mượn sách:', err);
    throw err;
  }
}

async function getInfoLendBook(data) {
  try {
    const { MaSach, MaDocGia } = data;

    const lendRecord = await TheoDoiMuonSach.findOne({
      MaSach,
      MaDocGia,
      TrangThai: { $in: ['pending', 'approved', 'borrowing', 'returned', 'overdue'] }
    }).sort({ createdAt: -1 }); // Lấy record mới nhất
    return lendRecord;
  } catch (err) {
    console.error('Lỗi khi lấy thông tin mượn sách:', err);
    throw err;
  }
}

async function getTrackBorrowBook() {
  try {
    const trackBorrowList = await TheoDoiMuonSach.find()
      .populate({
        path: 'MaSach',
        select: 'MaSach TenSach TacGia DonGia SoQuyen NamXuatBan Image MoTaSach'
      })
      .populate({
        path: 'MaDocGia',
        select: 'MaDocGia HoLot Ten NgaySinh Phai DiaChi DienThoai'
      })
      .populate({
        path: 'Msnv',
        select: 'Msnv HoTenNV ChucVu'
      })
      .sort({ createdAt: -1 }); // Sắp xếp theo thời gian tạo mới nhất

    return trackBorrowList;
  } catch (err) {
    console.error('Lỗi khi lấy danh sách theo dõi mượn sách:', err);
    throw err;
  }
}

async function updateBorrowStatus(requestId, adminId, status) {
  try {
    const updateFields = {
      TrangThai: status,
      Msnv: adminId
    };

    if (status === 'approved') {
      const now = new Date();
      updateFields.NgayMuon = now;
      updateFields.NgayTra = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Lấy thông tin yêu cầu mượn để biết MaSach và SoLuong
      const request = await TheoDoiMuonSach.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy yêu cầu mượn');
      }

      const sach = await Sach.findById(request.MaSach);
      if (!sach) {
        throw new Error('Không tìm thấy sách');
      }

      // Kiểm tra đủ số lượng không
      if (sach.SoQuyen < request.SoLuong) {
        throw new Error('Không đủ số lượng sách để cho mượn');
      }

      // Trừ số lượng sách
      sach.SoQuyen -= request.SoLuong;
      await sach.save();
    }

    const updated = await TheoDoiMuonSach.findByIdAndUpdate(
      requestId,
      updateFields,
      { new: true }
    );

    return updated;

  } catch (err) {
    console.error('Lỗi khi cập nhật trạng thái mượn sách:', err);
    throw err;
  }
}

async function extendBorrowTime(requestId, adminId, newDueDate) {
  try {
    const request = await TheoDoiMuonSach.findById(requestId);

    if (!request) {
      throw new Error('Không tìm thấy yêu cầu mượn sách');
    }

    if (request.TrangThai !== 'approved') {
      throw new Error('Chỉ có thể gia hạn cho yêu cầu đã được duyệt');
    }

    if (!request.NgayTra) {
      throw new Error('Không có ngày trả hiện tại để gia hạn');
    }

    if (request.DaGiaHan) {
      throw new Error('Yêu cầu này đã được gia hạn trước đó');
    }

    const newDate = new Date(newDueDate);

    if (newDate <= request.NgayTra) {
      throw new Error('Ngày gia hạn phải sau ngày trả hiện tại');
    }

    // Cập nhật
    request.NgayTra = newDate;
    request.Msnv = adminId;
    request.DaGiaHan = true;

    const updated = await request.save();
    return updated;
  } catch (err) {
    console.error('Lỗi khi gia hạn mượn sách:', err);
    throw err;
  }
}

async function getBorrowBookOfUser(userId) {
  try {
    const borrowedBooks = await TheoDoiMuonSach.find({ MaDocGia: userId })
      .populate({
        path: 'MaSach',
        select: 'MaSach TenSach TacGia Image MoTaSach DonGia NamXuatBan MaTheLoai'
      })
      .sort({ createdAt: -1 }) // Đảo ngược: mới nhất trước
      .exec();

    return borrowedBooks;
  } catch (error) {
    console.error('Lỗi khi lấy sách đã mượn của user:', error);
    throw error;
  }
}

async function addFavoriteBook(bookId, readerId) {
  const newFavorite = new YeuThichSach({
    MaSach: bookId,
    MaDocGia: readerId
  });
  const savedFavorite = await newFavorite.save();
  return savedFavorite;
}

async function getFavoriteBooks(readerId) {
  const favorites = await YeuThichSach
    .find({ MaDocGia: readerId })
    .select('MaSach -_id');

  return favorites.map(f => f.MaSach);
}

async function deleteFavoriteBook(bookId, readerId) {
  const result = await YeuThichSach.deleteOne({
    MaSach: bookId,
    MaDocGia: readerId
  });

  return result.deletedCount > 0;
}

async function getRatingByBookAndReader(bookId, readerId) {
  if (!bookId || !readerId) {
    throw new Error("Mã sách và mã độc giả là bắt buộc");
  }

  return await DanhGiaSach.findOne({
    MaSach: bookId,
    MaDocGia: readerId
  }).populate("MaDocGia", "HoLot Ten");
}

async function getRatingByBook(bookId) {
  if (!bookId) {
    throw new Error("Mã sách là bắt buộc");
  }

  return await DanhGiaSach.find({
    MaSach: bookId
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
    stars < 1 || stars > 5
  ) {
    throw new Error("Dữ liệu đánh giá không hợp lệ. Cần có sao (1-5).");
  }

  const existingRating = await DanhGiaSach.findOne({
    MaSach: bookId,
    MaDocGia: readerId
  });

  if (existingRating) {
    return null; // Hoặc throw Error nếu muốn báo lỗi
  }

  const newRating = new DanhGiaSach({
    MaSach: bookId,
    MaDocGia: readerId,
    SoSao: stars,
    BinhLuan: comment.trim()
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
    MaDocGia: readerId
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
    MaDocGia: readerId
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
    MaDocGia: readerId
  });

  const savedView = await newView.save();
  return savedView;
}

async function getMostViewBook() {
  const topBooks = await TheoDoiXemSach.aggregate([
    {
      $group: {
        _id: "$MaSach",
        totalViews: { $sum: 1 }
      }
    },
    { $sort: { totalViews: -1 } },
    { $limit: 3 },
    {
      $lookup: {
        from: "saches", // tên collection của model Sach (mặc định plural hóa)
        localField: "_id",
        foreignField: "_id",
        as: "bookInfo"
      }
    },
    { $unwind: "$bookInfo" },
    {
      $project: {
        _id: "$bookInfo._id",
        TenSach: "$bookInfo.TenSach",
        TacGia: "$bookInfo.TacGia",
        Image: "$bookInfo.Image",
        totalViews: 1
      }
    }
  ]);

  return topBooks;
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
      { $group: { _id: '$MaSach', views_today: { $sum: 1 } } }
    ]);

    const borrowsAgg = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          NgayMuon: { $gte: start, $lt: end },
          TrangThai: { $in: ['approved', 'returned'] }
        }
      },
      { $group: { _id: '$MaSach', borrows_today: { $sum: 1 } } }
    ]);

    const ratingsAgg = await DanhGiaSach.aggregate([
      { $match: { NgayDanhGia: { $gte: start, $lt: end } } },
      { $group: { _id: '$MaSach', ratings_today: { $sum: 1 } } }
    ]);

    const scoreMap = new Map();

    function ensureEntry(bookIdStr) {
      if (!scoreMap.has(bookIdStr)) {
        scoreMap.set(bookIdStr, { views_today: 0, borrows_today: 0, ratings_today: 0 });
      }
      return scoreMap.get(bookIdStr);
    }

    viewsAgg.forEach(d => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.views_today = d.views_today || 0;
    });

    borrowsAgg.forEach(d => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.borrows_today = d.borrows_today || 0;
    });

    ratingsAgg.forEach(d => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.ratings_today = d.ratings_today || 0;
    });

    const result = [];
    for (const [bookIdStr, counts] of scoreMap.entries()) {
      // Chỉ thêm sách chưa được xử lý (tránh trùng lặp)
      if (!processedBookIds.has(bookIdStr)) {
        const score_today =
          0.4 * (counts.views_today || 0) +
          0.4 * (counts.borrows_today || 0) +
          0.2 * (counts.ratings_today || 0);

        result.push({
          bookIdStr,
          views_today: counts.views_today || 0,
          borrows_today: counts.borrows_today || 0,
          ratings_today: counts.ratings_today || 0,
          score_today
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
    console.log('❌ Không tìm thấy sách nào trong 30 ngày qua');
    return [];
  }

  // Sort giảm dần theo score_today và cắt top limit
  allScoredBooks.sort((a, b) => b.score_today - a.score_today);
  const topSlice = allScoredBooks.slice(0, limit);

  // console.log(`✅ Lấy được ${topSlice.length}/${limit} sách từ ${tries + 1} ngày`);

  // Lấy thông tin sách từ collection Sach
  const bookIds = topSlice.map((s) => mongoose.Types.ObjectId(s.bookIdStr));

  const bookDocs = await Sach.find({ _id: { $in: bookIds } })
    .select('MaSach TenSach TacGia Image')
    .lean();

  const bookDocMap = new Map(bookDocs.map(b => [b._id.toString(), b]));

  // Tính số sao trung bình cho từng sách
  const ratingsData = await DanhGiaSach.aggregate([
    { $match: { MaSach: { $in: bookIds } } },
    {
      $group: {
        _id: '$MaSach',
        avgRating: { $avg: '$SoSao' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  const ratingsMap = new Map(ratingsData.map(r => [r._id.toString(), {
    avgRating: r.avgRating || 0,
    totalRatings: r.totalRatings || 0
  }]));

  // Gộp thông tin sách vào kết quả trả về, giữ đúng thứ tự của topSlice
  const finalResult = topSlice.map(item => {
    const doc = bookDocMap.get(item.bookIdStr);
    const rating = ratingsMap.get(item.bookIdStr) || { avgRating: 0, totalRatings: 0 };

    return {
      _id: doc ? doc._id : mongoose.Types.ObjectId(item.bookIdStr),
      MaSach: doc ? doc.MaSach : null,
      TenSach: doc ? doc.TenSach : '',
      TacGia: doc ? doc.TacGia : '',
      Image: doc ? doc.Image : '',
      views_today: item.views_today,
      borrows_today: item.borrows_today,
      ratings_today: item.ratings_today,
      score_today: item.score_today,
      SoSaoTB: parseFloat(rating.avgRating.toFixed(1)) // Làm tròn 1 chữ số thập phân
    };
  });

  return finalResult;
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
      { $group: { _id: '$MaSach', views_7d: { $sum: 1 } } }
    ]);

    const borrowsAgg = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          NgayMuon: { $gte: start, $lt: end },
          TrangThai: { $in: ['approved', 'returned'] }
        }
      },
      { $group: { _id: '$MaSach', borrows_7d: { $sum: 1 } } }
    ]);

    const ratingsAgg = await DanhGiaSach.aggregate([
      { $match: { NgayDanhGia: { $gte: start, $lt: end } } },
      { $group: { _id: '$MaSach', ratings_7d: { $sum: 1 } } }
    ]);

    const scoreMap = new Map();

    function ensureEntry(bookIdStr) {
      if (!scoreMap.has(bookIdStr)) {
        scoreMap.set(bookIdStr, { views_7d: 0, borrows_7d: 0, ratings_7d: 0 });
      }
      return scoreMap.get(bookIdStr);
    }

    viewsAgg.forEach(d => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.views_7d = d.views_7d || 0;
    });

    borrowsAgg.forEach(d => {
      const idStr = d._id.toString();
      const entry = ensureEntry(idStr);
      entry.borrows_7d = d.borrows_7d || 0;
    });

    ratingsAgg.forEach(d => {
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
          score_week
        });

        processedBookIds.add(bookIdStr);
      }
    }

    return result;
  }

  // Fallback logic: lùi tuần cho đến khi đủ sách
  let tries = 0;
  while (allScoredBooks.length < limit && tries < 12) { // tối đa 12 tuần (3 tháng)
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
    console.log('Không tìm thấy sách nào trong 12 tuần qua');
    return [];
  }

  // Sort giảm dần theo score_week và cắt top limit
  allScoredBooks.sort((a, b) => b.score_week - a.score_week);
  const topSlice = allScoredBooks.slice(0, limit);

  // console.log(`Lấy được ${topSlice.length}/${limit} sách từ ${tries + 1} tuần`);

  // Lấy thông tin sách từ collection Sach
  const bookIds = topSlice.map((s) => mongoose.Types.ObjectId(s.bookIdStr));

  const bookDocs = await Sach.find({ _id: { $in: bookIds } })
    .select('MaSach TenSach TacGia Image')
    .lean();

  const bookDocMap = new Map(bookDocs.map(b => [b._id.toString(), b]));

  // Tính số sao trung bình cho từng sách
  const ratingsData = await DanhGiaSach.aggregate([
    { $match: { MaSach: { $in: bookIds } } },
    {
      $group: {
        _id: '$MaSach',
        avgRating: { $avg: '$SoSao' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  const ratingsMap = new Map(ratingsData.map(r => [r._id.toString(), {
    avgRating: r.avgRating || 0,
    totalRatings: r.totalRatings || 0
  }]));

  // Gộp thông tin sách vào kết quả trả về, giữ đúng thứ tự của topSlice
  const finalResult = topSlice.map(item => {
    const doc = bookDocMap.get(item.bookIdStr);
    const rating = ratingsMap.get(item.bookIdStr) || { avgRating: 0, totalRatings: 0 };

    return {
      _id: doc ? doc._id : mongoose.Types.ObjectId(item.bookIdStr),
      MaSach: doc ? doc.MaSach : null,
      TenSach: doc ? doc.TenSach : '',
      TacGia: doc ? doc.TacGia : '',
      Image: doc ? doc.Image : '',
      views_7d: item.views_7d,
      borrows_7d: item.borrows_7d,
      ratings_7d: item.ratings_7d,
      score_week: item.score_week,
      SoSaoTB: parseFloat(rating.avgRating.toFixed(1)) // Làm tròn 1 chữ số thập phân
    };
  });

  return finalResult;
}

async function getTrendingBook() {
  // luôn lấy 3 sách
  const limit = 3;

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
      { $group: { _id: '$MaSach', views_7d: { $sum: 1 } } }
    ]);

    const borrows7dAgg = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          NgayMuon: { $gte: start7d, $lt: end },
          TrangThai: { $in: ['approved', 'returned'] }
        }
      },
      { $group: { _id: '$MaSach', borrows_7d: { $sum: 1 } } }
    ]);

    const ratings7dAgg = await DanhGiaSach.aggregate([
      { $match: { NgayDanhGia: { $gte: start7d, $lt: end } } },
      { $group: { _id: '$MaSach', ratings_7d: { $sum: 1 } } }
    ]);

    const views14dAgg = await TheoDoiXemSach.aggregate([
      { $match: { ThoiDiemXem: { $gte: start14d, $lt: end } } },
      { $group: { _id: '$MaSach', views_14d: { $sum: 1 } } }
    ]);

    const borrows14dAgg = await TheoDoiMuonSach.aggregate([
      {
        $match: {
          NgayMuon: { $gte: start14d, $lt: end },
          TrangThai: { $in: ['approved', 'returned'] }
        }
      },
      { $group: { _id: '$MaSach', borrows_14d: { $sum: 1 } } }
    ]);

    const ratings14dAgg = await DanhGiaSach.aggregate([
      { $match: { NgayDanhGia: { $gte: start14d, $lt: end } } },
      { $group: { _id: '$MaSach', ratings_14d: { $sum: 1 } } }
    ]);

    const scoreMap = new Map();

    function ensureEntry(bookIdStr) {
      if (!scoreMap.has(bookIdStr)) {
        scoreMap.set(bookIdStr, {
          views_7d: 0, borrows_7d: 0, ratings_7d: 0,
          views_14d: 0, borrows_14d: 0, ratings_14d: 0
        });
      }
      return scoreMap.get(bookIdStr);
    }

    views7dAgg.forEach(d => {
      const entry = ensureEntry(d._id.toString());
      entry.views_7d = d.views_7d || 0;
    });
    borrows7dAgg.forEach(d => {
      const entry = ensureEntry(d._id.toString());
      entry.borrows_7d = d.borrows_7d || 0;
    });
    ratings7dAgg.forEach(d => {
      const entry = ensureEntry(d._id.toString());
      entry.ratings_7d = d.ratings_7d || 0;
    });

    views14dAgg.forEach(d => {
      const entry = ensureEntry(d._id.toString());
      entry.views_14d = d.views_14d || 0;
    });
    borrows14dAgg.forEach(d => {
      const entry = ensureEntry(d._id.toString());
      entry.borrows_14d = d.borrows_14d || 0;
    });
    ratings14dAgg.forEach(d => {
      const entry = ensureEntry(d._id.toString());
      entry.ratings_14d = d.ratings_14d || 0;
    });

    const result = [];
    for (const [bookIdStr, counts] of scoreMap.entries()) {
      if (!processedBookIds.has(bookIdStr)) {
        const recent_activity = counts.views_7d + counts.borrows_7d + counts.ratings_7d;
        const total_activity = counts.views_14d + counts.borrows_14d + counts.ratings_14d;

        const growth_rate = recent_activity / Math.max(1, total_activity);

        result.push({
          bookIdStr,
          views_7d: counts.views_7d,
          borrows_7d: counts.borrows_7d,
          ratings_7d: counts.ratings_7d,
          views_14d: counts.views_14d,
          borrows_14d: counts.borrows_14d,
          ratings_14d: counts.ratings_14d,
          growth_rate
        });

        processedBookIds.add(bookIdStr);
      }
    }

    return result;
  }

  // Fallback logic: lùi period cho đến khi đủ sách
  let tries = 0;
  while (allScoredBooks.length < limit && tries < 12) {
    const periodData = await getPeriodData(startOfWeek, endOfPeriod, startOf2Weeks);
    allScoredBooks.push(...periodData);

    if (allScoredBooks.length >= limit) break;

    startOfWeek.setDate(startOfWeek.getDate() - 14);
    startOf2Weeks.setDate(startOf2Weeks.getDate() - 14);
    endOfPeriod.setDate(endOfPeriod.getDate() - 14);
    tries++;
  }

  if (allScoredBooks.length === 0) {
    return [];
  }

  // Sắp xếp theo growth_rate giảm dần, cắt đúng 3 sách
  allScoredBooks.sort((a, b) => b.growth_rate - a.growth_rate);
  const topSlice = allScoredBooks.slice(0, limit);

  // Lấy thông tin sách
  const bookIds = topSlice.map(s => mongoose.Types.ObjectId(s.bookIdStr));
  const bookDocs = await Sach.find({ _id: { $in: bookIds } })
    .select('MaSach TenSach TacGia Image')
    .lean();
  const bookDocMap = new Map(bookDocs.map(b => [b._id.toString(), b]));

  // Tính số sao trung bình
  const ratingsData = await DanhGiaSach.aggregate([
    { $match: { MaSach: { $in: bookIds } } },
    {
      $group: {
        _id: '$MaSach',
        avgRating: { $avg: '$SoSao' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);
  const ratingsMap = new Map(ratingsData.map(r => [r._id.toString(), {
    avgRating: r.avgRating || 0,
    totalRatings: r.totalRatings || 0
  }]));

  // Gộp kết quả cuối
  const finalResult = topSlice.map(item => {
    const doc = bookDocMap.get(item.bookIdStr);
    const rating = ratingsMap.get(item.bookIdStr) || { avgRating: 0, totalRatings: 0 };

    return {
      _id: doc ? doc._id : mongoose.Types.ObjectId(item.bookIdStr),
      MaSach: doc ? doc.MaSach : null,
      TenSach: doc ? doc.TenSach : '',
      TacGia: doc ? doc.TacGia : '',
      Image: doc ? doc.Image : '',
      views_7d: item.views_7d,
      borrows_7d: item.borrows_7d,
      ratings_7d: item.ratings_7d,
      views_14d: item.views_14d,
      borrows_14d: item.borrows_14d,
      ratings_14d: item.ratings_14d,
      growth_rate: parseFloat(item.growth_rate.toFixed(3)),
      SoSaoTB: parseFloat(rating.avgRating.toFixed(1)) // giống getTodayBook
    };
  });

  return finalResult;
}

async function getPopularBook(limit = 6) {
  // đảm bảo limit là số dương hợp lệ
  limit = Math.max(1, parseInt(limit) || 6);

  // Lấy tổng views cho mỗi sách
  const viewsAgg = await TheoDoiXemSach.aggregate([
    { $group: { _id: '$MaSach', views: { $sum: 1 } } }
  ]);

  // Lấy tổng borrows cho mỗi sách (chỉ tính approved + returned)
  const borrowsAgg = await TheoDoiMuonSach.aggregate([
    { $match: { TrangThai: { $in: ['approved', 'returned'] } } },
    { $group: { _id: '$MaSach', borrows: { $sum: 1 } } }
  ]);

  // Lấy tổng ratings cho mỗi sách
  const ratingsAgg = await DanhGiaSach.aggregate([
    { $group: { _id: '$MaSach', ratings: { $sum: 1 } } }
  ]);

  // Gom dữ liệu lại theo bookId
  const scoreMap = new Map();

  function ensureEntry(bookIdStr) {
    if (!scoreMap.has(bookIdStr)) {
      scoreMap.set(bookIdStr, { views: 0, borrows: 0, ratings: 0 });
    }
    return scoreMap.get(bookIdStr);
  }

  viewsAgg.forEach(d => {
    const entry = ensureEntry(d._id.toString());
    entry.views = d.views || 0;
  });

  borrowsAgg.forEach(d => {
    const entry = ensureEntry(d._id.toString());
    entry.borrows = d.borrows || 0;
  });

  ratingsAgg.forEach(d => {
    const entry = ensureEntry(d._id.toString());
    entry.ratings = d.ratings || 0;
  });

  // Tính score cho từng sách
  const scoredBooks = [];
  for (const [bookIdStr, counts] of scoreMap.entries()) {
    const score = (0.2 * counts.views) + (0.5 * counts.borrows) + (0.3 * counts.ratings);
    scoredBooks.push({ bookIdStr, ...counts, score });
  }

  if (scoredBooks.length === 0) {
    return [];
  }

  // Sắp xếp theo score giảm dần, lấy top limit
  scoredBooks.sort((a, b) => b.score - a.score);
  const topSlice = scoredBooks.slice(0, limit);

  // Lấy thông tin sách
  const bookIds = topSlice.map(s => mongoose.Types.ObjectId(s.bookIdStr));
  const bookDocs = await Sach.find({ _id: { $in: bookIds } })
    .select('MaSach TenSach TacGia Image')
    .lean();
  const bookDocMap = new Map(bookDocs.map(b => [b._id.toString(), b]));

  // Tính số sao trung bình
  const ratingsData = await DanhGiaSach.aggregate([
    { $match: { MaSach: { $in: bookIds } } },
    {
      $group: {
        _id: '$MaSach',
        avgRating: { $avg: '$SoSao' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);
  const ratingsMap = new Map(ratingsData.map(r => [r._id.toString(), {
    avgRating: r.avgRating || 0,
    totalRatings: r.totalRatings || 0
  }]));

  // Gộp kết quả cuối
  const finalResult = topSlice.map(item => {
    const doc = bookDocMap.get(item.bookIdStr);
    const rating = ratingsMap.get(item.bookIdStr) || { avgRating: 0, totalRatings: 0 };

    return {
      _id: doc ? doc._id : mongoose.Types.ObjectId(item.bookIdStr),
      MaSach: doc ? doc.MaSach : null,
      TenSach: doc ? doc.TenSach : '',
      TacGia: doc ? doc.TacGia : '',
      Image: doc ? doc.Image : '',
      views: item.views,
      borrows: item.borrows,
      ratings: item.ratings,
      score: parseFloat(item.score.toFixed(3)), // làm tròn 3 chữ số thập phân
      SoSaoTB: parseFloat(rating.avgRating.toFixed(1)) // làm tròn 1 chữ số thập phân
    };
  });

  return finalResult;
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
  getPopularBook
}