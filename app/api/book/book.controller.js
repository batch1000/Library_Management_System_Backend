const bookService = require("./book.service");
const {
  uploadToCloudinary,
  uploadExcelToCloudinary,
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

async function getAllFaculty(req, res) {
  try {
    const result = await bookService.getAllFaculty();
    res.json(result);
  } catch (error) {
    res.status(500).send("Lấy khoa thất bại");
  }
}

async function addFaculty(req, res) {
  try {
    const { Faculty } = req.body;
    const facultyName = Faculty.trim();

    const result = await bookService.addFaculty(facultyName);

    if (!result) {
      console.log("Thêm khoa thất bại (đã tồn tại):", facultyName);
      return res.status(500).send("Thêm khoa thất bại");
    }

    res.json(result);
    console.log("Thêm khoa thành công:", result._id);
  } catch (error) {
    console.error("Lỗi khi thêm khoa:", error);
    res.status(500).send("Thêm khoa thất bại");
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

async function getOneTextBook(req, res) {
  try {
    const { keyword } = req.body;
    const textBook = await bookService.getOneTextBook(keyword);
    res.json(textBook);
    console.log("Lấy giáo trình thành công");
  } catch (error) {
    console.error("Lỗi khi lấy giáo trình:", error);
    res.status(500).send("Lấy giáo trình thất bại");
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
    const files = req.files;
    const imageFile = files && files.image ? files.image[0] : null;
    const pdfFile = files && files.pdfFile ? files.pdfFile[0] : null;

    // Upload ảnh (bắt buộc)
    if (!imageFile) {
      return res.status(400).send("Vui lòng chọn ảnh sách");
    }

    const uploadResult = await uploadToCloudinary(imageFile.buffer);
    if (!uploadResult) {
      console.log("Lỗi khi upload ảnh lên cloud");
      return res.status(500).send("Lỗi khi upload ảnh");
    }

    // Upload PDF (nếu có)
    let pdfUrl = null;
    if (pdfFile) {
      const pdfUploadResult = await uploadToCloudinary(pdfFile.buffer);
      if (!pdfUploadResult) {
        console.log("Lỗi khi upload PDF lên cloud");
        return res.status(500).send("Lỗi khi upload PDF");
      }
      pdfUrl = pdfUploadResult.secure_url;
    }

    const bookData = {
      TenSach: body.title,
      DonGia: Number(body.price),
      SoQuyen: Number(body.quantity),
      NamXuatBan: Number(body.publicationYear),
      TacGia: body.author,
      MoTaSach: body.description,
      Image: uploadResult.secure_url,
      PdfFile: pdfUrl, // ← Thêm PDF
      TenNXB: body.publisher, // ← Sửa tên field
      DiaChiNXB: body.publisherAddress, // ← Sửa tên field
      TenTheLoai: body.genre, // ← Sửa tên field
    };

    const result = await bookService.addBook(bookData);
    res.json(result);
    console.log("Thêm sách thành công: ", result._id);
  } catch (error) {
    console.error("Lỗi khi thêm sách:", error);
    res.status(500).send("Thêm sách thất bại");
  }
}

async function updateBook(req, res) {
  try {
    const bookId = req.params.id;
    const body = req.body;
    const files = req.files;
    const imageFile = files && files.image ? files.image[0] : null;
    const pdfFile = files && files.pdfFile ? files.pdfFile[0] : null;

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
    if (imageFile) {
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
      const uploadResult = await uploadToCloudinary(imageFile.buffer);
      if (!uploadResult) {
        console.log("Lỗi khi upload ảnh lên cloud");
        return res.status(500).send("Lỗi khi upload ảnh mới");
      }
      updateData.Image = uploadResult.secure_url;
    }

    // Upload PDF nếu có
    if (pdfFile) {
      const pdfUploadResult = await uploadToCloudinary(pdfFile.buffer);
      if (!pdfUploadResult) {
        console.log("Lỗi khi upload PDF lên cloud");
        return res.status(500).send("Lỗi khi upload PDF mới");
      }
      updateData.PdfFile = pdfUploadResult.secure_url;
    }

    // Update sách
    const result = await bookService.updateBook(bookId, updateData);

    // Response trước, xóa ảnh cũ sau (background)
    res.json(result);
    console.log("Cập nhật sách thành công:", bookId);

    // Xóa ảnh cũ trong background (không block response)
    if (imageFile && oldImageUrl) {
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

async function addTextBook(req, res) {
  try {
    const body = req.body;
    const files = req.files;
    const imageFile = files && files.image ? files.image[0] : null;
    const pdfFile = files && files.pdfFile ? files.pdfFile[0] : null;

    if (!imageFile) {
      return res.status(400).send("Vui lòng chọn ảnh giáo trình");
    }

    const uploadResult = await uploadToCloudinary(imageFile.buffer);
    if (!uploadResult) return res.status(500).send("Lỗi upload ảnh");

    let pdfUrl = null;
    if (pdfFile) {
      const pdfUploadResult = await uploadToCloudinary(pdfFile.buffer);
      if (!pdfUploadResult) return res.status(500).send("Lỗi upload PDF");
      pdfUrl = pdfUploadResult.secure_url;
    }

    const textBookData = {
      TenSach: body.title,
      DonGia: Number(body.price),
      SoQuyen: Number(body.quantity),
      NamXuatBan: Number(body.publicationYear),
      TacGia: body.author,
      MoTaSach: body.description,
      Image: uploadResult.secure_url,
      PdfFile: pdfUrl,
      TenNXB: body.publisher,
      DiaChiNXB: body.publisherAddress,
      LoaiSach: "GiaoTrinh",
      TenKhoa: body.faculty,
    };

    const result = await bookService.addTextBook(textBookData);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi thêm giáo trình:", error);
    res.status(500).send("Thêm giáo trình thất bại");
  }
}

async function updateTextBook(req, res) {
  try {
    const bookId = req.params.id;
    const body = req.body;
    const files = req.files;
    const imageFile = files && files.image ? files.image[0] : null;
    const pdfFile = files && files.pdfFile ? files.pdfFile[0] : null;

    const updateData = {};

    if (body.TenSach) updateData.TenSach = body.TenSach;
    if (body.DonGia) updateData.DonGia = Number(body.DonGia);
    if (body.SoQuyen) updateData.SoQuyen = Number(body.SoQuyen);
    if (body.NamXuatBan) updateData.NamXuatBan = Number(body.NamXuatBan);
    if (body.TacGia) updateData.TacGia = body.TacGia;
    if (body.MoTaSach) updateData.MoTaSach = body.MoTaSach;
    if (body.TenNXB) updateData.TenNXB = body.TenNXB;
    if (body.DiaChiNXB) updateData.DiaChiNXB = body.DiaChiNXB;
    if (body.TenKhoa) updateData.TenKhoa = body.TenKhoa;

    let oldImageUrl = null;

    // Lấy ảnh cũ trước khi update (nếu có file mới)
    if (imageFile) {
      try {
        const currentBook = await require("../../models/sachModel").findById(
          bookId
        );
        if (currentBook && currentBook.Image) {
          oldImageUrl = currentBook.Image;
        }
      } catch (error) {
        console.warn("Không thể lấy thông tin giáo trình cũ:", error.message);
      }

      // Upload ảnh mới
      const uploadResult = await uploadToCloudinary(imageFile.buffer);
      if (!uploadResult) {
        console.log("Lỗi khi upload ảnh lên cloud");
        return res.status(500).send("Lỗi khi upload ảnh mới");
      }
      updateData.Image = uploadResult.secure_url;
    }

    // Upload PDF nếu có
    if (pdfFile) {
      const pdfUploadResult = await uploadToCloudinary(pdfFile.buffer);
      if (!pdfUploadResult) {
        console.log("Lỗi khi upload PDF lên cloud");
        return res.status(500).send("Lỗi khi upload PDF mới");
      }
      updateData.PdfFile = pdfUploadResult.secure_url;
    }

    // Update giáo trình
    const result = await bookService.updateTextBook(bookId, updateData);

    // Response trước, xóa ảnh cũ sau (background)
    res.json(result);
    console.log("Cập nhật giáo trình thành công:", bookId);

    // Xóa ảnh cũ trong background (không block response)
    if (imageFile && oldImageUrl) {
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
    console.error("Lỗi khi cập nhật giáo trình:", error);
    res.status(500).send("Cập nhật giáo trình thất bại");
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
    const { requestId, adminId } = req.body;

    if (!requestId || !adminId) {
      return res.status(400).send("Thiếu thông tin cần thiết");
    }

    const updated = await bookService.extendBorrowTime(requestId, adminId);
    res.json(updated);
  } catch (error) {
    console.error("Lỗi khi gia hạn mượn sách:", error);
    res.status(500).send("Gia hạn mượn sách thất bại");
  }
}

async function checkIfExtendBorrowTime(req, res) {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).send("Thiếu thông tin requestId");
    }

    const result = await bookService.checkIfExtendBorrowTime(requestId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi kiểm tra gia hạn:", error);
    res.status(500).send("Kiểm tra gia hạn thất bại");
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
    const {
      coefLost,
      feeManage,
      coefDamageLight,
      feeLate,
      coefLostLecturer,
      feeManageLecturer,
      coefDamageLightLecturer,
      feeLateLecturer,
    } = req.body;

    // gọi service để update
    const updatedRule = await bookService.updateBookPenaltyRule({
      coefLost,
      feeManage,
      coefDamageLight,
      feeLate,
      coefLostLecturer,
      feeManageLecturer,
      coefDamageLightLecturer,
      feeLateLecturer,
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
    const {
      maxBooks,
      maxBooksPerDay,
      borrowDuration,
      pickupDeadline,
      renewalDuration,
      maxBooksLecturer,
      maxBooksPerDayLecturer,
      borrowDurationLecturer,
      pickupDeadlineLecturer,
      renewalDurationLecturer,
    } = req.body;

    // gọi service để update
    const updatedRule = await bookService.updateBookBorrowRule({
      maxBooks,
      maxBooksPerDay,
      borrowDuration,
      pickupDeadline,
      renewalDuration,
      maxBooksLecturer,
      maxBooksPerDayLecturer,
      borrowDurationLecturer,
      pickupDeadlineLecturer,
      renewalDurationLecturer,
    });

    res.status(200).json(updatedRule);
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật quy định mượn sách:", error);
    res
      .status(500)
      .json({ message: "Lỗi server khi cập nhật quy định mượn sách" });
  }
}

async function updatePenaltyFee(req, res) {
  try {
    const { requestId, adminId, newTotalFee, reason } = req.body;

    if (!requestId || !adminId || newTotalFee === undefined || !reason) {
      return res.status(400).send("Thiếu thông tin cần thiết");
    }

    if (newTotalFee < 0) {
      return res.status(400).send("Tổng phí không hợp lệ");
    }

    if (!reason.trim()) {
      return res.status(400).send("Vui lòng nhập lý do điều chỉnh");
    }

    const updated = await bookService.updatePenaltyFee(
      requestId,
      adminId,
      newTotalFee,
      reason
    );

    res.json(updated);
  } catch (error) {
    console.error("Lỗi khi cập nhật tổng phí phạt:", error);
    res.status(500).send(error.message || "Cập nhật tổng phí phạt thất bại");
  }
}

async function addThesis(req, res) {
  try {
    const body = req.body;
    const files = req.files;

    // ✅ THÊM: Kiểm tra đợt nộp đang mở
    const activeDotNop = await bookService.getActiveDotNop();
    if (!activeDotNop) {
      return res.status(400).json({ 
        error: "Hiện tại không có đợt nộp luận văn nào đang mở" 
      });
    }

    const imageFile = files && files.image ? files.image[0] : null;
    const pdfFile = files && files.pdfFile ? files.pdfFile[0] : null;

    if (!pdfFile) {
      return res.status(400).send("Vui lòng chọn file PDF luận văn");
    }

    const pdfUploadResult = await uploadToCloudinary(pdfFile.buffer);
    if (!pdfUploadResult) {
      console.log("Lỗi khi upload PDF lên cloud");
      return res.status(500).send("Lỗi khi upload PDF");
    }
    const pdfUrl = pdfUploadResult.secure_url;

    let imageUrl = null;
    if (imageFile) {
      const uploadResult = await uploadToCloudinary(imageFile.buffer);
      if (!uploadResult) {
        console.log("Lỗi khi upload ảnh lên cloud");
        return res.status(500).send("Lỗi khi upload ảnh");
      }
      imageUrl = uploadResult.secure_url;
    }

    const thesisData = {
      TieuDeTai: body.topicName,
      MaSV: body.userId,
      BacDaoTao: body.educationLevel,
      NamBaoVe: Number(body.defenseYear),
      GiaoVienHuongDan: body.supervisor,
      Pdf: pdfUrl,
      Image: imageUrl,
      MaDotNop: activeDotNop._id, // ✅ THÊM: Gán đợt nộp
    };

    const result = await bookService.addThesis(thesisData);
    res.json(result);
    console.log("Nộp luận văn thành công:", result._id);
  } catch (error) {
    console.error("Lỗi khi nộp luận văn:", error);
    res.status(500).send("Nộp luận văn thất bại");
  }
}

async function getOneThesis(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({ error: "Thiếu userId" });
    }

    const result = await bookService.getOneThesis(userId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy luận văn:", error);
    res.json({ error: "Lỗi server khi lấy luận văn" });
  }
}

async function getAllThesis(req, res) {
  try {
    const result = await bookService.getAllThesis();
    // console.log(JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy tất cả luận văn:", error);
    res.json({ error: "Lỗi server khi lấy tất cả luận văn" });
  }
}

async function approveThesis(req, res) {
  try {
    const { thesisId } = req.body;

    if (!thesisId) {
      return res.json({ error: "Thiếu thesisId" });
    }

    const result = await bookService.approveThesis(thesisId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi duyệt luận văn:", error);
    res.json({ error: "Lỗi server khi duyệt luận văn" });
  }
}

async function rejectThesis(req, res) {
  try {
    const { thesisId } = req.body;

    if (!thesisId) {
      return res.json({ error: "Thiếu thesisId" });
    }

    const result = await bookService.rejectThesis(thesisId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi từ chối luận văn:", error);
    res.json({ error: "Lỗi server khi từ chối luận văn" });
  }
}

// 1. Tạo đợt nộp luận văn
async function createDotNop(req, res) {
  try {
    const { TenDot, ThoiGianMoNop, ThoiGianDongNop, KyHoc, NamHoc } = req.body;

    if (!TenDot || !ThoiGianMoNop || !ThoiGianDongNop || !KyHoc || !NamHoc) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    }

    const result = await bookService.createDotNop({
      TenDot,
      ThoiGianMoNop,
      ThoiGianDongNop,
      KyHoc,
      NamHoc,
    });

    res.json(result);
    console.log("Tạo đợt nộp thành công:", result._id);
  } catch (error) {
    console.error("Lỗi khi tạo đợt nộp:", error);
    res.status(500).json({ error: "Tạo đợt nộp thất bại" });
  }
}

// 2. Lấy tất cả đợt nộp
async function getAllDotNop(req, res) {
  try {
    const result = await bookService.getAllDotNop();
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đợt nộp:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách đợt nộp" });
  }
}

// 3. Cập nhật đợt nộp
async function updateDotNop(req, res) {
  try {
    const { dotNopId, ...updateData } = req.body;

    if (!dotNopId) {
      return res.status(400).json({ error: "Thiếu dotNopId" });
    }

    const result = await bookService.updateDotNop(dotNopId, updateData);
    res.json(result);
    console.log("Cập nhật đợt nộp thành công:", result._id);
  } catch (error) {
    console.error("Lỗi khi cập nhật đợt nộp:", error);
    res.status(500).json({ error: "Cập nhật đợt nộp thất bại" });
  }
}

// 4. Xóa đợt nộp
async function deleteDotNop(req, res) {
  try {
    const { dotNopId } = req.body;

    if (!dotNopId) {
      return res.status(400).json({ error: "Thiếu dotNopId" });
    }

    const result = await bookService.deleteDotNop(dotNopId);
    res.json(result);
    console.log("Xóa đợt nộp thành công");
  } catch (error) {
    console.error("Lỗi khi xóa đợt nộp:", error);
    res.status(500).json({ error: "Xóa đợt nộp thất bại" });
  }
}

// 5. Lấy đợt nộp đang mở
async function getActiveDotNop(req, res) {
  try {
    const result = await bookService.getActiveDotNop();
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy đợt nộp đang mở:", error);
    res.status(500).json({ error: "Lỗi server khi lấy đợt nộp đang mở" });
  }
}

// 6. Lấy tất cả năm học
async function getAllNamHoc(req, res) {
  try {
    const result = await bookService.getAllNamHoc();
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách năm học:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách năm học" });
  }
}

// 7. Lấy tất cả kỳ học
async function getAllKyHoc(req, res) {
  try {
    const result = await bookService.getAllKyHoc();
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách kỳ học:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách kỳ học" });
  }
}

// Thêm kỳ học
async function addKyHoc(req, res) {
  try {
    const { TenKyHoc } = req.body;

    if (!TenKyHoc || !TenKyHoc.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập tên kỳ học" });
    }

    const result = await bookService.addKyHoc(TenKyHoc.trim());
    res.json(result);
    console.log("Thêm kỳ học thành công:", result._id);
  } catch (error) {
    console.error("Lỗi khi thêm kỳ học:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Kỳ học này đã tồn tại" });
    }
    res.status(500).json({ error: "Thêm kỳ học thất bại" });
  }
}

// Thêm năm học
async function addNamHoc(req, res) {
  try {
    const { TenNamHoc } = req.body;

    if (!TenNamHoc) {
      return res.status(400).json({ error: "Vui lòng nhập năm học" });
    }

    // Kiểm tra định dạng năm học (VD: 2023-2024)
    const namHocPattern = /^\d{4}-\d{4}$/;
    if (!namHocPattern.test(TenNamHoc)) {
      return res.status(400).json({ error: "Định dạng năm học không hợp lệ. VD: 2023-2024" });
    }

    const result = await bookService.addNamHoc(TenNamHoc);
    res.json(result);
    console.log("Thêm năm học thành công:", result._id);
  } catch (error) {
    console.error("Lỗi khi thêm năm học:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Năm học này đã tồn tại" });
    }
    res.status(500).json({ error: "Thêm năm học thất bại" });
  }
}


// 1. Sinh viên nộp niên luận
async function addNienLuan(req, res) {
  try {
    const body = req.body;
    const files = req.files;

    const imageFile = files && files.image ? files.image[0] : null;
    const pdfFile = files && files.pdfFile ? files.pdfFile[0] : null;

    if (!pdfFile) {
      return res.status(400).json({ error: "Vui lòng chọn file PDF niên luận" });
    }

    // ✅ KIỂM TRA MÃ ĐỢT NỘP
    if (!body.maDotNop) {
      return res.status(400).json({ error: "Vui lòng chọn đợt nộp" });
    }

    const pdfUploadResult = await uploadToCloudinary(pdfFile.buffer);
    if (!pdfUploadResult) {
      return res.status(500).json({ error: "Lỗi khi upload PDF" });
    }
    const pdfUrl = pdfUploadResult.secure_url;

    let imageUrl = null;
    if (imageFile) {
      const uploadResult = await uploadToCloudinary(imageFile.buffer);
      if (!uploadResult) {
        return res.status(500).json({ error: "Lỗi khi upload ảnh" });
      }
      imageUrl = uploadResult.secure_url;
    }

    const nienLuanData = {
      TenDeTai: body.topicName,
      MaDocGia: body.userId,  // ✅ Sửa từ MaSV -> MaDocGia
      MaDotNop: body.maDotNop, // ✅ THÊM MÃ ĐỢT NỘP
      Pdf: pdfUrl,
      Image: imageUrl,
      TrangThai: "Chờ duyệt",  // ✅ THÊM TRẠNG THÁI MẶC ĐỊNH
      NgayNop: new Date()      // ✅ THÊM NGÀY NỘP
    };

    const result = await bookService.addNienLuan(nienLuanData);
    res.json(result);
    console.log("Nộp niên luận thành công:", result._id);
  } catch (error) {
    console.error("Lỗi khi nộp niên luận:", error);
    res.status(500).json({ error: "Nộp niên luận thất bại" });
  }
}

// 2. Lấy 1 niên luận của sinh viên
async function getOneNienLuan(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Thiếu userId" });
    }

    const result = await bookService.getOneNienLuan(userId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy niên luận:", error);
    res.status(500).json({ error: "Lỗi server khi lấy niên luận" });
  }
}

// 3. Tạo đợt nộp niên luận (Giảng viên)
async function createDotNopNienLuan(req, res) {
  try {
    const { TenDot, ThoiGianMoNop, ThoiGianDongNop, KyHoc, NamHoc, MaGiangVien } = req.body;

    if (!TenDot || !ThoiGianMoNop || !ThoiGianDongNop || !KyHoc || !NamHoc || !MaGiangVien) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    }

    const result = await bookService.createDotNopNienLuan({
      TenDot,
      ThoiGianMoNop,
      ThoiGianDongNop,
      KyHoc,
      NamHoc,
      MaGiangVien,
    });

    res.json(result);
    console.log("Tạo đợt nộp niên luận thành công:", result._id);
  } catch (error) {
    console.error("Lỗi khi tạo đợt nộp niên luận:", error);
    res.status(500).json({ error: "Tạo đợt nộp niên luận thất bại" });
  }
}

// 4. Lấy tất cả đợt nộp niên luận của giảng viên
async function getAllDotNopNienLuan(req, res) {
  try {
    const { maGiangVien } = req.body;

    if (!maGiangVien) {
      return res.status(400).json({ error: "Thiếu mã giảng viên" });
    }

    const result = await bookService.getAllDotNopNienLuan(maGiangVien);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đợt nộp niên luận:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách đợt nộp niên luận" });
  }
}

// 5. Cập nhật đợt nộp niên luận
async function updateDotNopNienLuan(req, res) {
  try {
    const { dotNopId, ...updateData } = req.body;

    if (!dotNopId) {
      return res.status(400).json({ error: "Thiếu dotNopId" });
    }

    const result = await bookService.updateDotNopNienLuan(dotNopId, updateData);
    res.json(result);
    console.log("Cập nhật đợt nộp niên luận thành công:", result._id);
  } catch (error) {
    console.error("Lỗi khi cập nhật đợt nộp niên luận:", error);
    res.status(500).json({ error: "Cập nhật đợt nộp niên luận thất bại" });
  }
}

// 6. Xóa đợt nộp niên luận
async function deleteDotNopNienLuan(req, res) {
  try {
    const { dotNopId } = req.body;

    if (!dotNopId) {
      return res.status(400).json({ error: "Thiếu dotNopId" });
    }

    const result = await bookService.deleteDotNopNienLuan(dotNopId);
    res.json(result);
    console.log("Xóa đợt nộp niên luận thành công");
  } catch (error) {
    console.error("Lỗi khi xóa đợt nộp niên luận:", error);
    res.status(500).json({ error: error.message || "Xóa đợt nộp niên luận thất bại" });
  }
}

// 7. Lấy đợt nộp đang mở của giảng viên
async function getActiveDotNopNienLuan(req, res) {
  try {
    const { maGiangVien } = req.body;

    if (!maGiangVien) {
      return res.status(400).json({ error: "Thiếu mã giảng viên" });
    }

    const result = await bookService.getActiveDotNopNienLuan(maGiangVien);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy đợt nộp niên luận đang mở:", error);
    res.status(500).json({ error: "Lỗi server khi lấy đợt nộp niên luận đang mở" });
  }
}

// 8. Lấy tất cả niên luận theo giảng viên
async function getAllNienLuanByGiangVien(req, res) {
  try {
    const { maGiangVien } = req.body;

    if (!maGiangVien) {
      return res.status(400).json({ error: "Thiếu mã giảng viên" });
    }

    const result = await bookService.getAllNienLuanByGiangVien(maGiangVien);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách niên luận:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách niên luận" });
  }
}

async function getAllNienLuanCuaKhoa(req, res) {
  try {
    const { maGiangVien } = req.body;

    if (!maGiangVien) {
      return res.status(400).json({ error: "Thiếu mã giảng viên" });
    }

    const result = await bookService.getAllNienLuanCuaKhoa(maGiangVien);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách niên luận:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách niên luận" });
  }
}

// 9. Duyệt niên luận
async function approveNienLuan(req, res) {
  try {
    const { nienLuanId } = req.body;

    if (!nienLuanId) {
      return res.status(400).json({ error: "Thiếu nienLuanId" });
    }

    const result = await bookService.approveNienLuan(nienLuanId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi duyệt niên luận:", error);
    res.status(500).json({ error: "Lỗi server khi duyệt niên luận" });
  }
}

// 10. Từ chối niên luận
async function rejectNienLuan(req, res) {
  try {
    const { nienLuanId } = req.body;

    if (!nienLuanId) {
      return res.status(400).json({ error: "Thiếu nienLuanId" });
    }

    const result = await bookService.rejectNienLuan(nienLuanId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi từ chối niên luận:", error);
    res.status(500).json({ error: "Lỗi server khi từ chối niên luận" });
  }
}

async function getAllGiangVien(req, res) {
  try {
    const result = await bookService.getAllGiangVien();
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách giảng viên:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách giảng viên" });
  }
}

async function getAllActiveDotNopNienLuan(req, res) {
  try {
    const { maDocGia } = req.params;
    if (!maDocGia) {
      return res.status(400).json({ error: "Thiếu mã độc giả" });
    }
    
    const result = await bookService.getAllActiveDotNopNienLuan(maDocGia);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đợt nộp đang mở:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách đợt nộp đang mở" });
  }
}

async function checkNienLuanSubmission(req, res) {
  try {
    const { userId, dotNopId } = req.params;
    const result = await bookService.checkNienLuanSubmission(userId, dotNopId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi kiểm tra niên luận:", error);
    res.status(500).json({ error: "Lỗi server khi kiểm tra niên luận" });
  }
}

//Statistic
async function getStatisticBook(req, res) {
  try {
    const result = await bookService.getStatisticBook();
    // console.log(JSON.stringify(result.slice(-3), null, 2));
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy thống kê sách:", error);
    res.status(500).json({ error: "Lỗi server khi lấy thống kê sách" });
  }
}


//Report Statistic
async function submitFilePdfReportStatistic(req, res) {
  try {
    const body = req.body;
    const file = req.file;

    // Kiểm tra file bắt buộc
    if (!file) {
      return res.status(400).send("Vui lòng chọn file báo cáo (PDF)");
    }

    // Kiểm tra loại báo cáo
    if (!body.LoaiBaoCao) {
      return res.status(400).send("Vui lòng chọn loại báo cáo (Ngày, Tuần, Tháng, Quý, Năm)");
    }

    // Upload file PDF lên Cloudinary
    const uploadResult = await uploadToCloudinary(file.buffer);
    if (!uploadResult) {
      console.log("Lỗi khi upload báo cáo PDF lên cloud");
      return res.status(500).send("Lỗi khi upload báo cáo PDF");
    }

    // Chuẩn bị dữ liệu báo cáo
    const reportData = {
      TieuDe: body.TieuDe,
      NguoiNop: body.NguoiNop, // ID nhân viên nộp báo cáo
      LoaiBaoCao: body.LoaiBaoCao,
      TepDinhKem: uploadResult.secure_url,
    };

    // Gọi service để lưu DB
    const result = await bookService.submitFilePdfReportStatistic(reportData);

    res.json(result);
    console.log("Nộp báo cáo thành công:", result._id);
  } catch (error) {
    console.error("Lỗi khi nộp báo cáo:", error);
    res.status(500).send("Nộp báo cáo thất bại");
  }
}

async function submitFileExcelReportStatistic(req, res) { 
  try { 
    const body = req.body; 
    const file = req.file; 
 
    // Kiểm tra file bắt buộc 
    if (!file) { 
      return res.status(400).send("Vui lòng chọn file báo cáo (Excel)"); 
    } 
 
    // Kiểm tra loại báo cáo 
    if (!body.LoaiBaoCao) { 
      return res.status(400).send("Vui lòng chọn loại báo cáo (Ngày, Tuần, Tháng, Quý, Năm)"); 
    } 
 
    // Đọc file từ disk vào buffer
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(file.path);
    
    // Upload file Excel lên Cloudinary 
    const uploadResult = await uploadExcelToCloudinary(fileBuffer, file.originalname);
    if (!uploadResult) { 
      console.log("Lỗi khi upload báo cáo Excel lên cloud"); 
      // Xóa file tạm
      fs.unlinkSync(file.path);
      return res.status(500).send("Lỗi khi upload báo cáo Excel"); 
    } 
 
    // Xóa file tạm sau khi upload thành công
    fs.unlinkSync(file.path);
 
    // Chuẩn bị dữ liệu báo cáo 
    const reportData = { 
      TieuDe: body.TieuDe, 
      NguoiNop: body.NguoiNop, 
      LoaiBaoCao: body.LoaiBaoCao, 
      TepDinhKem: uploadResult.secure_url, 
    }; 
 
    // Gọi service để lưu DB (có thể dùng chung service với PDF)
    const result = await bookService.submitFileExcelReportStatistic(reportData); 
 
    res.json(result); 
    console.log("Nộp báo cáo Excel thành công:", result._id); 
  } catch (error) { 
    console.error("Lỗi khi nộp báo cáo Excel:", error);
    
    // Xóa file tạm nếu có lỗi
    if (req.file && req.file.path) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Lỗi khi xóa file tạm:", unlinkError);
      }
    }
    
    res.status(500).send("Nộp báo cáo thất bại"); 
  } 
}

async function getReportStatisticByReporter(req, res) {
  try {
    const { NguoiNop } = req.body;

    // Kiểm tra đầu vào
    if (!NguoiNop) {
      return res.status(400).send("Thiếu thông tin người nộp báo cáo (NguoiNop)");
    }

    // Gọi service để lấy dữ liệu
    const reports = await bookService.getReportStatisticByReporter(NguoiNop);

    if (!reports || reports.length === 0) {
      return res.status(404).send("Không tìm thấy báo cáo nào của nhân viên này");
    }

    res.json(reports);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách báo cáo:", error);
    res.status(500).send("Không thể lấy danh sách báo cáo");
  }
}

async function deleteOneReportStatistic(req, res) {
  try {
    const { reportId } = req.body;

    // Kiểm tra đầu vào
    if (!reportId) {
      return res.status(400).send("Thiếu ID của báo cáo cần xóa (reportId)");
    }

    // Gọi service để xóa báo cáo
    const deletedReport = await bookService.deleteOneReportStatistic(reportId);

    if (!deletedReport) {
      return res.status(404).send("Không tìm thấy báo cáo cần xóa");
    }

    res.json({
      message: "Xóa báo cáo thành công",
      deletedReport,
    });
  } catch (error) {
    console.error("Lỗi khi xóa báo cáo:", error);
    res.status(500).send("Xóa báo cáo thất bại");
  }
}

async function getAllReportStatistic(req, res) {
  try {
    // Gọi service để lấy toàn bộ báo cáo
    const reports = await bookService.getAllReportStatistic();

    if (!reports || reports.length === 0) {
      return res.status(404).send("Không có báo cáo thống kê nào trong hệ thống");
    }
    // console.log(reports);
    res.json(reports);
  } catch (error) {
    console.error("Lỗi khi lấy tất cả báo cáo thống kê:", error);
    res.status(500).send("Không thể lấy danh sách báo cáo thống kê");
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
