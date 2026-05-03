const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./src/db');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//Routes
const authRoutes = require('./src/routes/authRoutes');
app.use('/api/auth', authRoutes);
const reviewRoutes = require('./src/routes/reviewRoutes');
app.use('/api', reviewRoutes);

// Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'DevLens server is running!' 
    
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DevLens server running on http://localhost:${PORT}`);
});