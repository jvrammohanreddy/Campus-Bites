// backend/server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const restaurantRoutes = require('./src/routes/restaurantRoutes');


const app = express();

// 1. TRACKER: This will immediately log the moment a request touches your server
app.use((req, res, next) => {
    console.log(`\n--> [INCOMING] ${req.method} request to ${req.url}`);
    next();
});

// 2. JSON PARSER: (Ensure the parentheses are here!)
app.use(express.json());

// 3. BASE ROUTE
app.get('/', (req, res) => {
    console.log("--> Successfully reached the '/' route. Sending response...");
    res.send('Campus Bites API is running...');
});

// 4. API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);

const PORT = process.env.PORT || 8000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

