const express = require("express");
const upload = require("../../config/multer");
const uploadExcel = require('../../config/multerExcel');
const {
  addGenre,
  getAllGenre,
  addBook,
  getAllBook,
  updateBook,
  getOneBook,
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
} = require("./book.controller");

const router = express.Router();

router.post("/getBookById", getBookById);
router.post("/getOneBook", getOneBook);
router.get("/getAllBook", getAllBook);
router.post(
  "/addbook",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  addBook
);
router.post(
  "/updateBook/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  updateBook
);
router.post("/deleteBook/:id", deleteBook);

router.post(
  "/addTextBook",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  addTextBook
);

router.post(
  "/updateTextBook/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  updateTextBook
);
router.post("/getOneTextBook", getOneTextBook);

router.post("/addGenre", addGenre);
router.get("/getAllGenre", getAllGenre);
router.get("/getAllFaculty", getAllFaculty);
router.post("/addFaculty", addFaculty);
router.post("/lendBook", lendBook);
router.get("/getBorrowBookOfUser/:id", getBorrowBookOfUser);
router.post("/getInfoLendBook", getInfoLendBook);
router.get("/getTrackBorrowBook", getTrackBorrowBook);
router.post("/updateBorrowStatus", updateBorrowStatus);
router.post("/updateReturnStatus", updateReturnStatus);
router.post("/confirmPaidCompensation", confirmPaidCompensation);
router.post("/confirmRepaired", confirmRepaired);
router.post("/updateOverdueFee", updateOverdueFee);
router.post("/extendBorrowTime", extendBorrowTime);
router.post("/checkIfExtendBorrowTime", checkIfExtendBorrowTime);
router.post("/countCurrentBorrowing", countCurrentBorrowing);
router.post("/countCurrentBorrowingToday", countCurrentBorrowingToday);
router.post("/countCurrentPending", countCurrentPending);
router.post("/countCurrentPendingToDay", countCurrentPendingToDay);
router.delete("/deletePending", deletePending);

router.post("/addFavoriteBook", addFavoriteBook);
router.get("/getFavoriteBooks/:id", getFavoriteBooks);
router.delete("/deleteFavoriteBook", deleteFavoriteBook);

router.post("/addRatingBook", addRatingBook);
router.patch("/updateRatingComment", updateRatingComment);
router.delete("/deleteRatingBook", deleteRatingBook);
router.post("/getRatingByBookAndReader", getRatingByBookAndReader);
router.post("/getAllCommentRating", getAllCommentRating);
router.post("/getRatingByBook", getRatingByBook);

router.post("/addBookView", addBookView);
router.get("/getMostViewBook", getMostViewBook);

router.get("/getTodayBook", getTodayBook);
router.get("/getTopTenWeekBook", getTopTenWeekBook);
router.get("/getTrendingBook", getTrendingBook);
router.get("/getPopularBook", getPopularBook);
router.get("/getPopularBookFilter", getPopularBookFilter);

router.get("/getBookPenaltyRule", getBookPenaltyRule);
router.post("/updateBookPenaltyRule", updateBookPenaltyRule);
router.get("/getBookBorrowRule", getBookBorrowRule);
router.post("/updateBookBorrowRule", updateBookBorrowRule);
router.post("/updatePenaltyFee", updatePenaltyFee);

router.post(
  "/addThesis",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  addThesis
);
router.post("/getOneThesis", getOneThesis);
router.get("/getAllThesis", getAllThesis);
router.post("/approveThesis", approveThesis);
router.post("/rejectThesis", rejectThesis);

router.post("/createDotNop", createDotNop);
router.get("/getAllDotNop", getAllDotNop);
router.post("/updateDotNop", updateDotNop);
router.post("/deleteDotNop", deleteDotNop);
router.get("/getActiveDotNop", getActiveDotNop);
router.get("/getAllNamHoc", getAllNamHoc);
router.get("/getAllKyHoc", getAllKyHoc);
router.post("/addKyHoc", addKyHoc);
router.post("/addNamHoc", addNamHoc);


// Sinh viên - Niên luận
router.post(
  "/addNienLuan",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  addNienLuan
);
router.post("/getOneNienLuan", getOneNienLuan);

// Giảng viên - Quản lý đợt nộp niên luận
router.post("/createDotNopNienLuan", createDotNopNienLuan);
router.post("/getAllDotNopNienLuan", getAllDotNopNienLuan);
router.post("/updateDotNopNienLuan", updateDotNopNienLuan);
router.post("/deleteDotNopNienLuan", deleteDotNopNienLuan);
router.post("/getActiveDotNopNienLuan", getActiveDotNopNienLuan);

// Giảng viên - Quản lý danh sách niên luận
router.post("/getAllNienLuanByGiangVien", getAllNienLuanByGiangVien);
router.post("/getAllNienLuanCuaKhoa", getAllNienLuanCuaKhoa);
router.post("/approveNienLuan", approveNienLuan);
router.post("/rejectNienLuan", rejectNienLuan);

router.get("/getAllGiangVien", getAllGiangVien);
router.get("/getAllActiveDotNopNienLuan/:maDocGia", getAllActiveDotNopNienLuan);
router.get("/checkNienLuanSubmission/:userId/:dotNopId", checkNienLuanSubmission);


//Statistic
router.get("/getStatisticBook", getStatisticBook);



//Report Statistic
router.post("/submitFilePdfReportStatistic", upload.single('file'), submitFilePdfReportStatistic);
router.post("/submitFileExcelReportStatistic", uploadExcel.single('file'), submitFileExcelReportStatistic);
router.post("/getReportStatisticByReporter", getReportStatisticByReporter);
router.delete("/deleteOneReportStatistic", deleteOneReportStatistic);
router.get("/getAllReportStatistic", getAllReportStatistic);

module.exports = router;
