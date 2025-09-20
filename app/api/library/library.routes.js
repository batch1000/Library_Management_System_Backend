const express = require('express')
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
        updateCardRule
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

module.exports = router;