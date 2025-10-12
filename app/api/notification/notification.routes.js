const express = require('express')
const
    {   
        createNotification,
        getAllNotificationByUserId,
        markMultipleAsRead
    } = require('./notification.controller')

const router = express.Router();

router.post('/createNotification', createNotification);
router.post('/getAllNotificationByUserId', getAllNotificationByUserId);
router.post('/markMultipleAsRead', markMultipleAsRead);

module.exports = router;