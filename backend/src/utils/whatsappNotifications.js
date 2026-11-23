const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const STATUS_LABELS = {
    PLACED: 'placed',
    PREPARING: 'being prepared',
    READY_FOR_PICKUP: 'ready for pickup',
    OUT_FOR_DELIVERY: 'out for delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
};

const normalizeWhatsAppAddress = (phone, defaultCountryCode) => {
    if (typeof phone !== 'string' || !phone.trim()) {
        throw new Error('Student has no phone number for WhatsApp notifications.');
    }

    let value = phone.trim().replace(/^whatsapp:/i, '');
    let digits = value.replace(/\D/g, '');
    if (value.startsWith('00')) digits = digits.slice(2);

    if (value.startsWith('+') || value.startsWith('00')) {
        value = `+${digits}`;
    } else if (digits.length === 10 && defaultCountryCode) {
        value = `${defaultCountryCode}${digits}`;
    } else if (digits.length >= 11 && digits.length <= 15) {
        value = `+${digits}`;
    } else {
        throw new Error('Student phone number must include a country code or be a 10-digit local number.');
    }

    if (!/^\+[1-9]\d{7,14}$/.test(value)) {
        throw new Error('Student phone number is not a valid E.164 number.');
    }

    return `whatsapp:${value}`;
};

const getMessage = (order, status, restaurant) => {
    const restaurantName = restaurant?.name || 'the restaurant';
    const shortOrderId = order._id.toString().slice(-8).toUpperCase();
    const statusLabel = STATUS_LABELS[status];

    if (!statusLabel) {
        throw new Error(`Unsupported order status for WhatsApp notification: ${status}`);
    }

    return {
        shortOrderId,
        restaurantName,
        statusLabel,
        body: `Campus Bites: Your order #${shortOrderId} from ${restaurantName} is ${statusLabel}.`
    };
};

const notifyOrderStatus = async (order, status = order.status) => {
    try {
        const student = order.studentId?.whatsappOptIn !== undefined
            ? order.studentId
            : await User.findById(order.studentId).select('name phone whatsappOptIn');
        if (!student?.whatsappOptIn) return;

        const restaurant = order.restaurantId?.name
            ? order.restaurantId
            : await Restaurant.findById(order.restaurantId).select('name');

        const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
            console.warn('WhatsApp notification skipped: configure Twilio credentials in backend/.env.');
            return;
        }

        const defaultCountryCode = process.env.TWILIO_DEFAULT_COUNTRY_CODE || '+91';
        const from = normalizeWhatsAppAddress(TWILIO_WHATSAPP_FROM, defaultCountryCode);
        const to = normalizeWhatsAppAddress(student.phone, defaultCountryCode);
        const message = getMessage(order, status, restaurant);
        const form = new URLSearchParams({ To: to, From: from });
        const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;

        if (contentSid) {
            form.set('ContentSid', contentSid);
            form.set('ContentVariables', JSON.stringify({
                1: message.shortOrderId,
                2: message.restaurantName,
                3: message.statusLabel
            }));
        } else {
            form.set('Body', message.body);
        }

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(TWILIO_ACCOUNT_SID)}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: form,
                signal: AbortSignal.timeout(10000)
            }
        );

        if (!response.ok) {
            const details = await response.json().catch(() => ({}));
            const twilioCode = details.code ? ` (Twilio ${details.code})` : '';
            const explanation = details.message ? ` ${details.message}` : '';
            console.error(`Twilio WhatsApp notification failed with HTTP ${response.status}${twilioCode}.${explanation}`);
            return;
        }

        console.info(`WhatsApp order status notification sent for order #${message.shortOrderId}.`);
    } catch (error) {
        console.error(`Could not send WhatsApp order status notification: ${error.message}`);
    }
};

module.exports = { notifyOrderStatus, normalizeWhatsAppAddress };
