const express = require('express')
const
    {   
        createNotification,
    } = require('./notification.controller')

const router = express.Router();

router.post('/createNotification', createNotification);

module.exports = router;