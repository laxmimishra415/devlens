const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { reviewCode, getReviews } = require('../controllers/reviewController');

// Dono routes protected hain — JWT token chahiye
router.post('/review', verifyToken, reviewCode);
router.get('/reviews', verifyToken, getReviews);

module.exports = router;