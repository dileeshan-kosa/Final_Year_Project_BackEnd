const express = require('express');
const getFingerPrintData = require('../controller/fingerPrintController');
const router = express.Router();

router.get('/', getFingerPrintData)

module.exports = router;