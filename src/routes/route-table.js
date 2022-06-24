const router = require('express').Router();
const { data } = require('../controllers');

// GET localhost:8080/karyawan => Ambil data semua karyawan
router.post('/data', data.getData);

module.exports = router;