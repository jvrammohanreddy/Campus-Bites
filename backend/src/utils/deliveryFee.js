const getDeliveryFee = (subtotal) => {
    if (subtotal < 10) return 0;
    if (subtotal < 200) return 35;
    return 50;
};

module.exports = getDeliveryFee;
