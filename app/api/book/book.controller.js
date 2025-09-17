const bookService = require("./book.service");
const {
  uploadToCloudinary,
  deleteImageFromCloudinary,
} = require("../../services/cloudinary.service");

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

async function addGenre(req, res) {
  try {
    const { Genre } = req.body;
    const genreName = Genre.trim();

    const result = await bookService.addGenre(genreName);

    if (!result) {
      console.log("Thêm thể loại thất bại (đã tồn tại):", genreName);
      return res.status(500).send("Thêm thể loại thất bại");
    }

    res.json(result);
    console.log("Thêm thể loại thành công:", result._id);
  } catch (error) {
    res.status(500).send("Thêm thể loại thất bại");
  }
}

async function getAllGenre(req, res) {
  try {
    const result = await bookService.getAllGenre();
    res.json(result);
  } catch (error) {
    res.status(500).send("Lấy thể loại thất bại");
  }
}

async function getAllBook(req, res) {
  try {
    const books = await bookService.getAllBook();
    res.json(books);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sách:", error);
    res.status(500).send("Lấy danh sách sách thất bại");
  }
}

async function getOneBook(req, res) {
  try {
    const { keyword } = req.body;
    const book = await bookService.getOneBook(keyword);
    res.json(book);
    console.log("Lấy sách thành công");
  } catch (error) {
    console.error("Lỗi khi lấy sách:", error);
    res.status(500).send("Lấy sách thất bại");
  }
}

async function getBookById(req, res) {
  try {
    const { id } = req.body;
    const book = await bookService.getBookById(id);
    if (!book) {
      return res.status(404).json({ message: "Không tìm thấy sách" });
    }
    res.json(book);
  } catch (error) {
    console.error("Lỗi khi lấy sách theo ID:", error);
    res.status(500).send("Lấy sách theo ID thất bại");
  }
}

async function addBook(req, res) {
  try {
    const body = req.body;
    const file = req.file;

    const uploadResult = await uploadToCloudinary(file.buffer);
    if (!uploadResult) {
      console.log("Lỗi khi upload ảnh lên cloud");
      return;
    }

    const bookData = {
      TenSach: body.title,
      DonGia: Number(body.price),
      SoQuyen: Number(body.quantity),
      NamXuatBan: Number(body.publicationYear),
      TacGia: body.author,
      MoTaSach: body.description,
      Image: uploadResult.secure_url,
      NhaXuatBan: body.publisher,
      DiaChiNhaXuatBan: body.publisherAddress,
      TheLoai: body.genre,
    };

    const result = await bookService.addBook(bookData);
    res.json(result);
    console.log("Thêm sách thành công: ", result._id);
  } catch (error) {
    res.status(500).send("Thêm sách thất bại");
  }
}

async function updateBook(req, res) {
  try {
    const bookId = req.params.id;
    const body = req.body;
    const file = req.file;

    const updateData = {};

    if (body.TenSach) updateData.TenSach = body.TenSach;
    if (body.DonGia) updateData.DonGia = Number(body.DonGia);
    if (body.SoQuyen) updateData.SoQuyen = Number(body.SoQuyen);
    if (body.NamXuatBan) updateData.NamXuatBan = Number(body.NamXuatBan);
    if (body.TacGia) updateData.TacGia = body.TacGia;
    if (body.MoTaSach) updateData.MoTaSach = body.MoTaSach;
    if (body.TenNXB) updateData.TenNXB = body.TenNXB;
    if (body.DiaChiNXB) updateData.DiaChiNXB = body.DiaChiNXB;
    if (body.TenTheLoai) updateData.TenTheLoai = body.TenTheLoai;

    let oldImageUrl = null;

    // Lấy ảnh cũ trước khi update (nếu có file mới)
    if (file) {
      try {
        const currentBook = await require("../../models/sachModel").findById(
          bookId
        );
        if (currentBook && currentBook.Image) {
          oldImageUrl = currentBook.Image;
        }
      } catch (error) {
        console.warn("Không thể lấy thông tin sách cũ:", error.message);
      }

      // Upload ảnh mới
      const uploadResult = await uploadToCloudinary(file.buffer);
      if (!uploadResult) {
        console.log("Lỗi khi upload ảnh lên cloud");
        return res.status(500).send("Lỗi khi upload ảnh mới");
      }
      updateData.Image = uploadResult.secure_url;
    }

    // Update sách
    const result = await bookService.updateBook(bookId, updateData);

    // Response trước, xóa ảnh cũ sau (background)
    res.json(result);
    console.log("Cập nhật sách thành công:", bookId);

    // Xóa ảnh cũ trong background (không block response)
    if (file && oldImageUrl) {
      setImmediate(async () => {
        try {
          const oldPublicId = extractPublicIdFromUrl(oldImageUrl);
          if (oldPublicId) {
            await deleteImageFromCloudinary(oldPublicId);
            console.log("Đã xóa ảnh cũ từ Cloudinary:", oldPublicId);
          }
        } catch (deleteError) {
          console.warn("Không thể xóa ảnh cũ:", deleteError.message);
        }
      });
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật sách:", error);
    res.status(500).send("Cập nhật sách thất bại");
  }
}

async function deleteBook(req, res) {
  try {
    const { id } = req.params;
    const result = await bookService.deleteBook(id);
    res.json(result);
    console.log("Xóa sách thành công");
  } catch (error) {
    console.error("Lỗi khi xóa sách:", error);
    res.status(500).send("Xóa sách thất bại");
  }
}

async function lendBook(req, res) {
  try {
    const data = req.body;
    const result = await bookService.lendBook(data);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi đăng ký mượn sách:", error);
    res.status(500).send("Đăng ký mượn sách thất bại");
  }
}

async function getInfoLendBook(req, res) {
  try {
    const { MaSach, MaDocGia } = req.body;
    const lendInfo = await bookService.getInfoLendBook({ MaSach, MaDocGia });
    res.json(lendInfo);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin mượn sách:", error);
    res.status(500).send("Lấy thông tin mượn sách thất bại");
  }
}

async function getTrackBorrowBook(req, res) {
  try {
    const trackBorrowList = await bookService.getTrackBorrowBook();
    res.json(trackBorrowList);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách theo dõi mượn sách:", error);
    res.status(500).send("Lấy danh sách theo dõi mượn sách thất bại");
  }
}

async function updateBorrowStatus(req, res) {
  try {
    const { requestId, adminId, status } = req.body;

    if (!requestId || !adminId || !status) {
      return res.status(400).send("Thiếu thông tin cần thiết");
    }

    const updated = await bookService.updateBorrowStatus(
      requestId,
      adminId,
      status
    );
    res.json(updated);
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái mượn sách:", error);
    res.status(500).send("Cập nhật trạng thái mượn sách thất bại");
  }
}

async function updateReturnStatus(req, res) {
  try {
    const { requestId, adminId, status, bookCondition } = req.body;

    if (!requestId || !adminId || !status || !bookCondition) {
      return res.status(400).send("Thiếu thông tin cần thiết");
    }

    const updated = await bookService.updateReturnStatus(
      requestId,
      adminId,
      status,
      bookCondition
    );

    res.json(updated);
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái trả sách:", error);
    res.status(500).send("Cập nhật trạng thái trả sách thất bại");
  }
}

async function confirmPaidCompensation(req, res) {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).send("Thiếu thông tin cần thiết");
    }

    const updated = await bookService.confirmPaidCompensation(requestId);

    res.json(updated);
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái thanh toán:", error);
    res.status(500).send("Cập nhật trạng thái thanh toán thất bại");
  }
}

async function confirmRepaired(req, res) {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).send("Thiếu thông tin cần thiết");
    }

    const updated = await bookService.confirmRepaired(requestId);

    res.json(updated);
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái sửa sách:", error);
    res.status(500).send("Cập nhật trạng thái sửa sách");
  }
}

async function updateOverdueFee(req, res) {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: "Thiếu requestId" });
    }

    const updated = await bookService.updateOverdueFee(requestId);
    if (!updated) {
      return res.status(404).json({ error: "Không tìm thấy record" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Lỗi khi cập nhật phí quá hạn:", error);
    res.status(500).send("Cập nhật phí quá hạn thất bại");
  }
}

async function extendBorrowTime(req, res) {
  try {
    const { requestId, adminId, newDueDate } = req.body;

    if (!requestId || !adminId || !newDueDate) {
      return res.status(400).send("Thiếu thông tin cần thiết");
    }

    const updated = await bookService.extendBorrowTime(
      requestId,
      adminId,
      newDueDate
    );
    res.json(updated);
  } catch (error) {
    console.error("Lỗi khi gia hạn mượn sách:", error);
    res.status(500).send("Gia hạn mượn sách thất bại");
  }
}

async function getBorrowBookOfUser(req, res) {
  try {
    const userId = req.params.id;
    const books = await bookService.getBorrowBookOfUser(userId);
    res.json(books);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sách:", error);
    res.status(500).send("Lấy danh sách sách thất bại");
  }
}

async function countCurrentBorrowing(req, res) {
  try {
    const { MaDocGia } = req.body;
    if (!MaDocGia) {
      return res.status(400).json({ message: "Thiếu MaDocGia" });
    }

    const count = await bookService.countCurrentBorrowing(MaDocGia);

    res.json(count);
  } catch (error) {
    console.error("Lỗi khi đếm số sách đang mượn:", error);
    res.status(500).send("Đếm số sách đang mượn thất bại");
  }
}

async function countCurrentBorrowingToday(req, res) {
  try {
    const { MaDocGia } = req.body;
    if (!MaDocGia) {
      return res.status(400).json({ message: "Thiếu MaDocGia" });
    }

    const count = await bookService.countCurrentBorrowingToday(MaDocGia);

    res.json(count);
  } catch (error) {
    console.error("Lỗi khi đếm số sách đang mượn:", error);
    res.status(500).send("Đếm số sách đang mượn thất bại");
  }
}

async function countCurrentPending(req, res) {
  try {
    const { MaDocGia } = req.body;
    if (!MaDocGia) {
      return res.status(400).json({ message: "Thiếu MaDocGia" });
    }

    const count = await bookService.countCurrentPending(MaDocGia);

    res.json(count);
  } catch (error) {
    console.error("Lỗi khi đếm số sách đang chờ duyệt:", error);
    res.status(500).send("Đếm số sách đang chờ duyệt");
  }
}

async function countCurrentPendingToDay(req, res) {
  try {
    const { MaDocGia } = req.body;
    if (!MaDocGia) {
      return res.status(400).json({ message: "Thiếu MaDocGia" });
    }

    const count = await bookService.countCurrentPendingToDay(MaDocGia);

    res.json(count);
  } catch (error) {
    console.error("Lỗi khi đếm số sách đang chờ duyệt:", error);
    res.status(500).send("Đếm số sách đang chờ duyệt");
  }
}

async function deletePending(req, res) {
  try {
    const { MaSach, MaDocGia } = req.body;

    if (!MaSach || !MaDocGia) {
      return res.status(400).json({ message: "Thiếu MaSach hoặc MaDocGia" });
    }

    const result = await bookService.deletePending(MaSach, MaDocGia);

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi hủy đăng ký mượn sách:", error);
    res.status(500).send("Hủy đăng ký mượn sách thất bại");
  }
}

async function addFavoriteBook(req, res) {
  try {
    const { MaSach, MaDocGia } = req.body;

    // Trim để tránh dữ liệu rác
    const bookId = MaSach.trim();
    const readerId = MaDocGia.trim();

    const result = await bookService.addFavoriteBook(bookId, readerId);

    if (!result) {
      console.log("Thêm sách vào yêu thích thất bại (đã tồn tại):", {
        MaSach: bookId,
        MaDocGia: readerId,
      });
      return res.status(500).send("Thêm sách vào yêu thích thất bại");
    }

    res.json(result);
  } catch (error) {
    res.status(500).send("Thêm sách vào yêu thích thất bại");
  }
}

async function getFavoriteBooks(req, res) {
  try {
    const readerId = req.params.id.trim();
    const favoriteBookIds = await bookService.getFavoriteBooks(readerId);
    res.json(favoriteBookIds);
  } catch (error) {
    res.status(500).send("Lấy danh sách yêu thích thất bại");
  }
}

async function deleteFavoriteBook(req, res) {
  try {
    const { MaSach, MaDocGia } = req.body;
    const deleted = await bookService.deleteFavoriteBook(MaSach, MaDocGia);

    res.json({ success: deleted });
  } catch (error) {
    console.error(error);
    res.status(500).send("Xóa sách yêu thích thất bại");
  }
}

async function getRatingByBookAndReader(req, res) {
  try {
    const { MaSach, MaDocGia } = req.body;

    const bookId = MaSach ? MaSach.trim() : "";
    const readerId = MaDocGia ? MaDocGia.trim() : "";

    if (!bookId || !readerId) {
      return res.status(400).send("Mã sách và mã độc giả là bắt buộc");
    }

    const rating = await bookService.getRatingByBookAndReader(bookId, readerId);

    res.json(rating || null);
  } catch (error) {
    console.error("Lỗi khi lấy đánh giá sách của độc giả:", error);
    res.status(500).send("Lỗi khi lấy đánh giá sách của độc giả");
  }
}

async function getRatingByBook(req, res) {
  try {
    const { MaSach } = req.body;

    const bookId = MaSach ? MaSach.trim() : "";

    if (!bookId) {
      return res.status(400).send("Mã sách là bắt buộc");
    }

    const ratings = await bookService.getRatingByBook(bookId);

    res.json(ratings || []);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đánh giá sách:", error);
    res.status(500).send("Lỗi khi lấy danh sách đánh giá sách");
  }
}

async function getAllCommentRating(req, res) {
  try {
    const { MaSach } = req.body;
    const bookId = MaSach ? MaSach.trim() : "";

    if (!bookId) {
      return res.status(400).send("Mã sách là bắt buộc");
    }

    const ratings = await bookService.getAllCommentRating(bookId);

    res.json(ratings || []);
  } catch (error) {
    console.error("Lỗi khi lấy tất cả bình luận và đánh giá:", error);
    res.status(500).send("Lỗi khi lấy tất cả bình luận và đánh giá");
  }
}

async function addRatingBook(req, res) {
  try {
    const { MaSach, MaDocGia, SoSao, BinhLuan } = req.body;

    // Trim dữ liệu để tránh khoảng trắng dư
    const bookId = MaSach.trim();
    const readerId = MaDocGia.trim();
    const stars = Number(SoSao);
    const comment = BinhLuan ? BinhLuan.trim() : "";

    // Gọi service để xử lý
    const result = await bookService.addRatingBook(
      bookId,
      readerId,
      stars,
      comment
    );

    if (!result) {
      console.log("Thêm đánh giá sách thất bại:", {
        MaSach: bookId,
        MaDocGia: readerId,
      });
      return res.status(500).send("Thêm đánh giá sách thất bại");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi thêm đánh giá sách:", error);
    res.status(500).send("Thêm đánh giá sách thất bại");
  }
}

async function updateRatingComment(req, res) {
  try {
    const { MaSach, MaDocGia, BinhLuan } = req.body;

    const bookId = MaSach ? MaSach.trim() : "";
    const readerId = MaDocGia ? MaDocGia.trim() : "";
    const comment = BinhLuan ? BinhLuan.trim() : "";

    const result = await bookService.updateRatingComment(
      bookId,
      readerId,
      comment
    );

    if (!result) {
      console.log("Cập nhật bình luận thất bại:", {
        MaSach: bookId,
        MaDocGia: readerId,
      });
      return res.status(404).send("Không tìm thấy đánh giá để cập nhật");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi cập nhật bình luận:", error);
    res.status(500).send("Cập nhật bình luận thất bại");
  }
}

async function deleteRatingBook(req, res) {
  try {
    const { MaSach, MaDocGia } = req.body;
    const deleted = await bookService.deleteRatingBook(MaSach, MaDocGia);

    res.json({ success: deleted });
  } catch (error) {
    console.error(error);
    res.status(500).send("Xóa đánh giá sách thất bại");
  }
}

async function addBookView(req, res) {
  try {
    const { MaSach, MaDocGia } = req.body;

    // Trim dữ liệu để tránh khoảng trắng dư
    const bookId = MaSach ? MaSach.trim() : null;
    const readerId = MaDocGia ? MaDocGia.trim() : null;

    if (!bookId || !readerId) {
      return res.status(400).send("Thiếu dữ liệu: MaSach hoặc MaDocGia");
    }

    // Gọi service để xử lý
    const result = await bookService.addBookView(bookId, readerId);

    if (!result) {
      console.log("Ghi nhận lượt xem thất bại:", {
        MaSach: bookId,
        MaDocGia: readerId,
      });
      return res.status(500).send("Ghi nhận lượt xem thất bại");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi ghi nhận lượt xem:", error);
    res.status(500).send("Lỗi khi ghi nhận lượt xem");
  }
}

async function getMostViewBook(req, res) {
  try {
    const result = await bookService.getMostViewBook();

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy sách nào có lượt xem.");
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy top sách có lượt xem:", error);
    res.status(500).send("Lỗi khi lấy top sách có lượt xem");
  }
}

async function getTodayBook(req, res) {
  try {
    const result = await bookService.getTodayBook();

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy sách hôm nay.");
    }

    res.json(result);
  } catch (error) {
    console.error("❌ Lỗi khi lấy sách hôm nay:", error);
    res.status(500).send("Lỗi khi lấy sách hôm nay");
  }
}

async function getTopTenWeekBook(req, res) {
  try {
    const result = await bookService.getTopTenWeekBook();

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy sách top 10.");
    }

    res.json(result);
  } catch (error) {
    console.error("❌ Lỗi khi lấy sách top 10:", error);
    res.status(500).send("Lỗi khi lấy sách top 10");
  }
}

async function getTrendingBook(req, res) {
  try {
    const result = await bookService.getTrendingBook(9);

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy sách xu hướng.");
    }

    res.json(result);
  } catch (error) {
    console.error("❌ Lỗi khi lấy sách xu hướng:", error);
    res.status(500).send("Lỗi khi lấy sách xu hướng");
  }
}

async function getPopularBook(req, res) {
  try {
    const result = await bookService.getPopularBook(6);

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy sách phổ biến.");
    }

    res.json(result);
  } catch (error) {
    console.error("❌ Lỗi khi lấy sách phổ biến:", error);
    res.status(500).send("Lỗi khi lấy sách phổ biến");
  }
}

async function getPopularBookFilter(req, res) {
  try {
    const result = await bookService.getPopularBook();

    if (!result || result.length === 0) {
      return res.status(404).send("Không tìm thấy sách phổ biến.");
    }

    res.json(result);
  } catch (error) {
    console.error("❌ Lỗi khi lấy sách phổ biến:", error);
    res.status(500).send("Lỗi khi lấy sách phổ biến");
  }
}

async function getBookPenaltyRule(req, res) {
  try {
    const rule = await bookService.getBookPenaltyRule();
    return res.status(200).json(rule);
  } catch (error) {
    console.error("Lỗi khi lấy quy định phạt sách:", error);
    throw error;
  }
}

async function updateBookPenaltyRule(req, res) {
  try {
    const { coefLost, feeManage, coefDamageLight, feeLate } = req.body;

    // gọi service để update
    const updatedRule = await bookService.updateBookPenaltyRule({
      coefLost,
      feeManage,
      coefDamageLight,
      feeLate,
    });

    res.status(200).json(updatedRule);
  } catch (error) {
    console.error("Lỗi khi cập nhật quy định phạt sách:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật quy định phạt" });
  }
}

async function getBookBorrowRule(req, res) {
  try {
    const rule = await bookService.getBookBorrowRule();
    return res.status(200).json(rule);
  } catch (error) {
    console.error("Lỗi khi lấy quy định mượn sách:", error);
    throw error;
  }
}

async function updateBookBorrowRule(req, res) {
  try {
    const { maxBooks, maxBooksPerDay, borrowDuration, pickupDeadline, renewalDuration } = req.body;

    // gọi service để update
    const updatedRule = await bookService.updateBookBorrowRule({
      maxBooks,
      maxBooksPerDay,
      borrowDuration,
      pickupDeadline,
      renewalDuration
    });

    res.status(200).json(updatedRule);
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật quy định mượn sách:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật quy định mượn sách" });
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
  getPopularBookFilter,
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
  confirmRepaired
};
