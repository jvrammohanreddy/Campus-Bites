require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes'); 
const restaurantRoutes = require('./src/routes/restaurantRoutes');
const vendorRoutes = require('./src/routes/vendorRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const deliveryRoutes = require('./src/routes/deliveryRoutes');

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
app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery', deliveryRoutes);

const PORT = process.env.PORT || 8000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});