const express = require('express')
const upload = require('../../config/multer');
const
    {   
        addRoom,
        getAllRoom,
        updateRoom,
        deleteRoom,
        getAllBookRoomByUserId,
        getAllBookRoomAdmin,
        createBooking,
        approveBooking,
        denyBooking,
        getBookedTimeSlotForRoom,
        cancelBooking
    } = require('./room.controller')

const router = express.Router();

router.post('/addRoom', addRoom);
router.get('/getAllRoom', getAllRoom);
router.post('/updateRoom', updateRoom);
router.delete('/deleteRoom/:id', deleteRoom);

router.post('/getAllBookRoomByUserId', getAllBookRoomByUserId);
router.get('/getAllBookRoomAdmin', getAllBookRoomAdmin);
router.post('/createBooking', createBooking);
router.post('/approveBooking', approveBooking);
router.post('/denyBooking', denyBooking);
router.post('/cancelBooking', cancelBooking);
router.post('/getBookedTimeSlotForRoom', getBookedTimeSlotForRoom);

module.exports = router;