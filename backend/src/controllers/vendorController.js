const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

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
    try {
        const { name, price, description, isAvailable, isVeg } = req.body;

        const restaurant = await Restaurant.findOne({ vendorId: req.user._id });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const newItem = { name, price, description, isAvailable, isVeg };
        restaurant.menu.push(newItem);
        await restaurant.save();

        res.status(201).json(restaurant.menu[restaurant.menu.length - 1]); // Return the newly added item
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a menu item
// @route   PUT /api/vendor/restaurants/menu/:menuItemId
const updateMenuItem = async (req, res) => {
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

        // Update fields if provided
        if (req.body.name) menuItem.name = req.body.name;
        if (req.body.price) menuItem.price = req.body.price;
        if (req.body.description !== undefined) menuItem.description = req.body.description;
        if (req.body.isAvailable !== undefined) menuItem.isAvailable = req.body.isAvailable;
        if (req.body.isVeg !== undefined) menuItem.isVeg = req.body.isVeg;

        await restaurant.save();
        res.json(menuItem);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
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

        // Remove the subdocument from the array
        restaurant.menu.pull(req.params.menuItemId);
        await restaurant.save();

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

        // 2. Fetch all orders for this specific restaurant
        const orders = await Order.find({ restaurantId: restaurant._id })
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
        const { status } = req.body;
        const validStatuses = ['PLACED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid order status' });
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

        order.status = status;
        const updatedOrder = await order.save();

        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
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