const express = require('express')
const uploadExcel = require('../../config/multerExcel');
const upload = require('../../config/multer');
const
    {   
        getLibraryCard,
        getAllInfoExpireCard,
        renewLibraryCard,
        updateAvatar,
        requestCardReprint,
        getStatusCardReprint,
        getAllInfoRenewCard,
        approveReissueCard,
        denyReissueCard,
        printCard,
        getCardRule,
        updateCardRule,
        getAllLibraryCards,
        uploadLibraryCardsExcelForLecturers,
        uploadLibraryCardsExcelForStudents

    } = require('./library.controller')

const router = express.Router();

router.post('/getLibraryCard', getLibraryCard);
router.get('/getAllInfoExpireCard', getAllInfoExpireCard);
router.post('/renewLibraryCard', renewLibraryCard);
router.post('/updateAvatar', upload.single('image'), updateAvatar);
router.post('/requestCardReprint', requestCardReprint);
router.post('/getStatusCardReprint', getStatusCardReprint);
router.get('/getAllInfoRenewCard', getAllInfoRenewCard);
router.post('/approveReissueCard', approveReissueCard);
router.post('/denyReissueCard', denyReissueCard);
router.post('/printCard', printCard);

router.get("/getCardRule", getCardRule)
router.post("/updateCardRule", updateCardRule)

router.get("/getAllLibraryCards", getAllLibraryCards)
router.post("/uploadLibraryCardsExcelForLecturers", uploadExcel.single('file'), uploadLibraryCardsExcelForLecturers);
router.post("/uploadLibraryCardsExcelForStudents", uploadExcel.single('file'), uploadLibraryCardsExcelForStudents);

module.exports = router;