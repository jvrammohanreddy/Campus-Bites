require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Connect to the Docker MongoDB instance
connectDB();

// Basic test route
app.get('/', (req, res) => {
    res.send('Campus Bites API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});