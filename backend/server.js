const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to allow the frontend to communicate with the backend
app.use(cors());
app.use(express.json());

// Basic test route
app.get('/api', (req, res) => {
  res.send('CampusBites API is running...');
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});