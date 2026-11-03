require('dotenv').config();
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Restaurant = require('../src/models/Restaurant');
const User = require('../src/models/User');

const seededRestaurants = [
    {
        name: 'North Gate Bites',
        location: 'Near Hostel 5',
        menu: [
            { name: 'Paneer Butter Masala', price: 189, description: 'Paneer in a creamy tomato gravy', isVeg: true },
            { name: 'Dal Makhani', price: 169, description: 'Slow-cooked black lentils with butter', isVeg: true },
            { name: 'Garlic Naan', price: 59, description: 'Fresh naan brushed with garlic butter', isVeg: true },
            { name: 'Veg Thali', price: 219, description: 'Rice, seasonal curries, salad, and dessert', isVeg: true }
        ]
    },
    {
        name: 'Hostel 6 Grill',
        location: 'Hostel 6 Court',
        menu: [
            { name: 'Classic Veg Burger', price: 149, description: 'Crispy patty with lettuce and house sauce', isVeg: true },
            { name: 'Grilled Chicken Wrap', price: 179, description: 'Grilled chicken wrapped with fresh vegetables', isVeg: false },
            { name: 'Cheese Fries', price: 129, description: 'Golden fries topped with melted cheese', isVeg: true },
            { name: 'Veggie Pizza Slice', price: 139, description: 'Vegetables and mozzarella on a crisp base', isVeg: true }
        ]
    },
    {
        name: 'Cafeteria Bowl',
        location: 'Near the Main Library',
        menu: [
            { name: 'Quinoa Salad', price: 169, description: 'Greens, quinoa, and roasted seeds', isVeg: true },
            { name: 'Avocado Wrap', price: 159, description: 'Avocado and fresh greens in a soft wrap', isVeg: true },
            { name: 'Protein Bowl', price: 229, description: 'Rice, lentils, and grilled vegetables', isVeg: true },
            { name: 'Cold Coffee', price: 99, description: 'Chilled coffee with milk', isVeg: true }
        ]
    }
];

const seedRestaurants = async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('Set MONGO_URI or MONGODB_URI in backend/.env before seeding.');
    }

    await mongoose.connect(mongoUri);

    const vendorEmail = 'campus-bites-seed-vendor@iitb.ac.in';
    let vendor = await User.findOne({ email: vendorEmail });

    if (!vendor) {
        vendor = await User.create({
            name: 'Campus Bites Seed Vendor',
            email: vendorEmail,
            password: crypto.randomBytes(32).toString('hex'),
            role: 'VENDOR'
        });
    } else if (vendor.role !== 'VENDOR') {
        throw new Error(`The reserved seed account ${vendorEmail} exists but is not a vendor.`);
    }

    let createdCount = 0;
    for (const seed of seededRestaurants) {
        const existing = await Restaurant.findOne({ vendorId: vendor._id, name: seed.name });
        if (existing) {
            if (existing.menu.length === 0) {
                existing.menu = seed.menu;
                await existing.save();
            }
            continue;
        }

        await Restaurant.create({
            vendorId: vendor._id,
            name: seed.name,
            location: seed.location,
            isOpen: true,
            menu: seed.menu
        });
        createdCount += 1;
    }

    console.log(`Restaurant seed complete. Added ${createdCount} restaurants; existing seed data was preserved.`);
};

seedRestaurants()
    .catch((error) => {
        console.error(`Restaurant seeding failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
