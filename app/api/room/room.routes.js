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
        cancelBooking,
        getRoomRule,
        updateRoomRule,
        checkInRoom,
        searchMemberByCode,
        getMyInvitations,
        respondToInvitation,
        checkMemberConflict,
        getBookingsAsMember,
        getAvailableSeats,
        getRoomById
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
router.post('/checkInRoom', checkInRoom);
router.post('/getBookedTimeSlotForRoom', getBookedTimeSlotForRoom);

router.get("/getRoomRule", getRoomRule)
router.post("/updateRoomRule", updateRoomRule)

router.post("/searchMemberByCode", searchMemberByCode)
router.post("/getMyInvitations", getMyInvitations)
router.post("/respondToInvitation", respondToInvitation)

router.post("/checkMemberConflict", checkMemberConflict)
router.post("/getBookingsAsMember", getBookingsAsMember)

router.post("/getAvailableSeats", getAvailableSeats)
router.post('/getRoomById', getRoomById);

module.exports = router;