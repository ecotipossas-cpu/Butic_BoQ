const express = require('express')
const emailController = require('../Controllers/emailController.js')
const router = express.Router()

router.route('/').post(emailController.sendEmail)

module.exports = router