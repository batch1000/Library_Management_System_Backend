const express = require('express')
const upload = require('../../config/multer');
const
    {   
        getLibraryCard,
        getAllInfoExpireCard,
        renewLibraryCard,
        updateAvatar
    } = require('./library.controller')

const router = express.Router();

router.post('/getLibraryCard', getLibraryCard);
router.get('/getAllInfoExpireCard', getAllInfoExpireCard);
router.post('/renewLibraryCard', renewLibraryCard);
router.post('/updateAvatar', upload.single('image'), updateAvatar);

module.exports = router;