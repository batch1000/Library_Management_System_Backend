const express = require('express')
const {login, signup, updateStatusAccount} = require('./auth.controller')

const router = express.Router()

router.post('/login', login);
router.post('/updateStatusAccount', updateStatusAccount);
router.post('/signup', signup)

module.exports = router
