const express = require('express')
const excelController = require('../Controllers/excelController.js')
const router = express.Router()

router.route('/').post(excelController.createExcel)

module.exports = router