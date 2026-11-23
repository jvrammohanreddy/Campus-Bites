const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const { notifyOrderStatus } = require('../utils/whatsappNotifications');
const { deleteMenuImage, saveMenuImage } = require('../middlewares/menuImageUpload');

const parseBoolean = (value) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
};

const removeOldMenuImage = async (imageUrl) => {
    try {
        await deleteMenuImage(imageUrl);
    } catch (error) {
        console.error(`Could not remove menu image: ${error.message}`);
    }
};

// @desc    Create a new restaurant profile
// @route   POST /api/vendor/restaurants
const createRestaurant = async (req, res) => {
    try {
        const { name, location } = req.body;

        const existingRestaurant = await Restaurant.findOne({ vendorId: req.user._id });
        if (existingRestaurant) {
            return res.status(400).json({ message: 'You already have a restaurant profile' });
        }

        const restaurant = await Restaurant.create({
            vendorId: req.user._id,
            name,
            location,
            menu: [] 
        });

        res.status(201).json(restaurant);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Toggle the isOpen status of the restaurant
// @route   PUT /api/vendor/restaurants/status
const toggleStatus = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ vendorId: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        restaurant.isOpen = !restaurant.isOpen;
        await restaurant.save();

        res.json({ message: `Restaurant is now ${restaurant.isOpen ? 'OPEN' : 'CLOSED'}`, isOpen: restaurant.isOpen });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Add a new item to the menu
// @route   POST /api/vendor/restaurants/menu
const addMenuItem = async (req, res) => {
    let imageUrl;
    try {
        const { name, price, description, isAvailable, isVeg } = req.body;

        const restaurant = await Restaurant.findOne({ vendorId: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        imageUrl = await saveMenuImage(req.file);
        const newItem = {
            name,
            price,
            description,
            isAvailable: parseBoolean(isAvailable),
            isVeg: parseBoolean(isVeg),
            imageUrl
        };
        restaurant.menu.push(newItem);
        await restaurant.save();

        res.status(201).json(restaurant.menu[restaurant.menu.length - 1]);
    } catch (error) {
        if (imageUrl) await removeOldMenuImage(imageUrl);
        console.error(`Could not add menu item: ${error.message}`);
        res.status(error.status || 500).json({ message: error.status ? error.message : 'Server Error' });
    }
};

// @desc    Update a menu item
// @route   PUT /api/vendor/restaurants/menu/:menuItemId
const updateMenuItem = async (req, res) => {
    let newImageUrl;
    try {
        const restaurant = await Restaurant.findOne({ vendorId: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Mongoose subdocument search
        const menuItem = restaurant.menu.id(req.params.menuItemId);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        const previousImageUrl = menuItem.imageUrl;
        newImageUrl = await saveMenuImage(req.file);

        // Update fields if provided
        if (req.body.name) menuItem.name = req.body.name;
        if (req.body.price !== undefined) menuItem.price = req.body.price;
        if (req.body.description !== undefined) menuItem.description = req.body.description;
        if (req.body.isAvailable !== undefined) menuItem.isAvailable = parseBoolean(req.body.isAvailable);
        if (req.body.isVeg !== undefined) menuItem.isVeg = parseBoolean(req.body.isVeg);
        if (newImageUrl) {
            menuItem.imageUrl = newImageUrl;
        } else if (parseBoolean(req.body.removeImage) === true) {
            menuItem.imageUrl = undefined;
        }

        await restaurant.save();
        if (menuItem.imageUrl !== previousImageUrl) await removeOldMenuImage(previousImageUrl);
        res.json(menuItem);
    } catch (error) {
        if (newImageUrl) await removeOldMenuImage(newImageUrl);
        console.error(`Could not update menu item: ${error.message}`);
        res.status(error.status || 500).json({ message: error.status ? error.message : 'Server Error' });
    }
};

// @desc    Remove an item from the menu
// @route   DELETE /api/vendor/restaurants/menu/:menuItemId
const deleteMenuItem = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ vendorId: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const menuItem = restaurant.menu.id(req.params.menuItemId);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        const imageUrl = menuItem.imageUrl;
        // Remove the subdocument from the array
        restaurant.menu.pull(req.params.menuItemId);
        await restaurant.save();
        await removeOldMenuImage(imageUrl);

        res.json({ message: 'Menu item removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all orders for the vendor's restaurant
// @route   GET /api/vendor/orders
// @access  Private (Vendor)
const getVendorOrders = async (req, res) => {
    try {
        // 1. Find the restaurant owned by the logged-in vendor
        const restaurant = await Restaurant.findOne({ vendorId: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant profile not found' });
        }

        // Vendors handle orders until pickup; claimed orders belong to delivery.
        const orders = await Order.find({
            restaurantId: restaurant._id,
            deliveryId: null,
            status: { $in: ['PLACED', 'PREPARING', 'READY_FOR_PICKUP', 'CANCELLED'] }
        })
            .populate('studentId', 'name phone hostel roomNumber') // Get student details for delivery
            .sort({ createdAt: -1 }); // Show newest orders first

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/vendor/orders/:orderId/status
// @access  Private (Vendor)
const updateOrderStatus = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.orderId)) {
            return res.status(400).json({ message: 'A valid order is required.' });
        }

        const { status } = req.body;
        if (!['PREPARING', 'READY_FOR_PICKUP', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ message: 'Restaurants can only prepare, mark ready for pickup, or cancel an order.' });
        }

        const restaurant = await Restaurant.findOne({ vendorId: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant profile not found' });
        }

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Security: Prevent a vendor from updating an order belonging to another restaurant
        if (order.restaurantId.toString() !== restaurant._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this order' });
        }

        const canStartPreparing = order.status === 'PLACED' && status === 'PREPARING';
        const canMarkReady = order.status === 'PREPARING' && status === 'READY_FOR_PICKUP';
        const canCancel = ['PLACED', 'PREPARING'].includes(order.status) && status === 'CANCELLED';
        if (!canStartPreparing && !canMarkReady && !canCancel) {
            return res.status(409).json({ message: 'This order cannot move to that status. Refresh and try again.' });
        }

        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: order._id,
                restaurantId: restaurant._id,
                deliveryId: null,
                status: order.status
            },
            { $set: { status } },
            { new: true }
        );
        if (!updatedOrder) {
            return res.status(409).json({ message: 'This order was handed to delivery or updated. Refresh and try again.' });
        }

        void notifyOrderStatus(updatedOrder);
        res.json(updatedOrder);
    } catch (error) {
        console.error(`Could not update restaurant order status: ${error.message}`);
        res.status(500).json({ message: 'Could not update this order right now.' });
    }
};

module.exports = {
    createRestaurant,
    toggleStatus,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getVendorOrders,
    updateOrderStatus
};