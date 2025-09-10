const express = require('express')
const upload = require('../../config/multer');
const
    {   
        getLibraryCard,
        getAllInfoExpireCard,
        renewLibraryCard
    } = require('./library.controller')

const router = express.Router();

router.post('/getLibraryCard', getLibraryCard);
router.get('/getAllInfoExpireCard', getAllInfoExpireCard);
router.post('/renewLibraryCard', renewLibraryCard);

module.exports = router;