const express = require('express')
const upload = require('../../config/multer');
const
    {   
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
        updateOverdueFee
    } = require('./book.controller')

const router = express.Router()

router.post('/getBookById', getBookById);
router.post('/getOneBook', getOneBook);
router.get('/getAllBook', getAllBook);
router.post('/addbook', upload.single('image'), addBook);
router.post('/updateBook/:id', upload.single('image'), updateBook);
router.post('/deleteBook/:id', deleteBook);

router.post('/addGenre', addGenre);
router.get('/getAllGenre', getAllGenre);

router.post('/lendBook', lendBook);
router.get('/getBorrowBookOfUser/:id', getBorrowBookOfUser);
router.post('/getInfoLendBook', getInfoLendBook);
router.get('/getTrackBorrowBook', getTrackBorrowBook);
router.post('/updateBorrowStatus', updateBorrowStatus);
router.post('/updateReturnStatus', updateReturnStatus);
router.post('/confirmPaidCompensation', confirmPaidCompensation);
router.post('/updateOverdueFee', updateOverdueFee);
router.post('/extendBorrowTime', extendBorrowTime);
router.post('/countCurrentBorrowing', countCurrentBorrowing);
router.post('/countCurrentBorrowingToday', countCurrentBorrowingToday);
router.post('/countCurrentPending', countCurrentPending);
router.post('/countCurrentPendingToDay', countCurrentPendingToDay);
router.delete('/deletePending', deletePending);

router.post('/addFavoriteBook', addFavoriteBook);
router.get('/getFavoriteBooks/:id', getFavoriteBooks);
router.delete('/deleteFavoriteBook', deleteFavoriteBook);

router.post('/addRatingBook', addRatingBook);
router.patch('/updateRatingComment', updateRatingComment);
router.delete('/deleteRatingBook', deleteRatingBook);
router.post('/getRatingByBookAndReader', getRatingByBookAndReader);
router.post('/getAllCommentRating', getAllCommentRating);
router.post('/getRatingByBook', getRatingByBook);

router.post('/addBookView', addBookView);
router.get('/getMostViewBook', getMostViewBook);

router.get('/getTodayBook', getTodayBook);
router.get("/getTopTenWeekBook", getTopTenWeekBook);
router.get("/getTrendingBook", getTrendingBook);
router.get("/getPopularBook", getPopularBook);
router.get("/getPopularBookFilter", getPopularBookFilter);

module.exports = router
