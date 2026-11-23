This is a Food Delivary app

campus-bites/
├── .gitignore
├── README.md
├── package.json               # Root package for running both servers simultaneously
│
├── backend/                   # Node.js + Express API
│   ├── package.json
│   ├── .env.example           
│   ├── server.js              
│   └── src/
│       ├── config/            # DB connection (db.js)
│       ├── controllers/       # Business logic (orderController, userController)
│       ├── middlewares/       # JWT auth, role verification
│       ├── models/            # Mongoose schemas (User, Restaurant, Order)
│       ├── routes/            # API endpoints (authRoutes, orderRoutes)
│       └── utils/             # Helpers
│
└── frontend/                  # React + Vite Client
    ├── package.json
    ├── .env                   
    ├── index.html
    └── src/
        ├── assets/            
        ├── components/        # Reusable UI (Navbar, RestaurantCard)
        ├── context/           # Global state (AuthContext, CartContext)
        ├── hooks/             # Custom React hooks (useAuth, useCart)
        ├── pages/             # Route views (Home, Menu, Checkout, Profile)
        ├── services/          # API abstractions (Axios calls)
        ├── App.jsx            
        └── main.jsx


node server.js

//remove docker
docker rm campus-bites-db
docker volume rm campus_bites_data

Run docker
docker run --name campus-bites-db -d -p 27017:27017 -v campus_bites_data:/data/db -e GLIBC_TUNABLES=glibc.pthread.rseq=0 mongo:7.0
docker start campus-bites-db

## Sample restaurants

With MongoDB configured in `backend/.env`, run `cd backend && npm run seed:restaurants` to add three sample campus restaurants and their menus. The seed can be run again safely; it skips existing sample restaurants and only fills a sample restaurant's menu if that menu is empty. Restart or refresh the frontend after seeding.

## Razorpay test payments

1. In the Razorpay Dashboard, enable **Test Mode** and generate a test API key pair. If a key or secret has been pasted into chat, screenshots, source code, or a public repository, revoke it and generate a replacement first.
2. Keep the replacement credentials private and put them only in your local `backend/.env`:

   ```env
   RAZORPAY_KEY_ID=rzp_test_your_key_id
   RAZORPAY_KEY_SECRET=your_test_key_secret
   ```

   Do not add these values to React, source control, or messages. `backend/.env` is ignored by Git; use `backend/.env.example` as the variable-name template.
3. Install backend dependencies with `cd backend && npm install`, then start/restart the API with `node server.js`. The API creates Razorpay orders at `POST /api/payments/order` and verifies payment at `POST /api/payments/verify`; both require a signed-in student token.
4. Start the frontend, sign in as a student, add an available menu item to the cart, open **Checkout**, choose **Online payment**, and click **Pay online**. Razorpay Checkout opens in Test Mode. Use a test payment method from Razorpay's test-mode documentation.
5. On successful payment, the frontend sends the order/payment/signature to the API. The backend verifies the signature and fetches/captures the payment with Razorpay before creating the order as paid. On cancellation/failure, no order is marked paid. COD continues to work separately.

Online payments are collected into the configured Campus Bites Razorpay account; vendor split payouts are not configured. Before accepting live payments, finish Razorpay account verification, switch to live keys, use HTTPS, configure webhooks and refund/dispute handling, and test the complete deployment. Never commit or share the live secret.

Delivery fee is based on the food subtotal for both COD and online orders: under ₹10 is free, ₹10 to under ₹200 is ₹35, and ₹200 or more is ₹50. Checkout displays this fee and the backend independently calculates it.

## WhatsApp order status notifications

1. In Twilio Console, get the Account SID and Auth Token. For testing, configure the Twilio WhatsApp Sandbox and join it from the test customer's WhatsApp number. For production, enable an approved WhatsApp sender.
2. Put the credentials only in your local `backend/.env` (not in frontend files, Git, or chat):

   ```env
   TWILIO_ACCOUNT_SID=AC_your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   TWILIO_DEFAULT_COUNTRY_CODE=+91
   # Optional: approved template with {{1}} order ID, {{2}} restaurant, {{3}} status
   TWILIO_WHATSAPP_CONTENT_SID=
   ```

   Use the WhatsApp sender shown in your Twilio account for `TWILIO_WHATSAPP_FROM`; the number above is Twilio's commonly used Sandbox sender. Add `+` and the country code to customer phone numbers, or enter a 10-digit Indian number when the default country code is `+91`.
3. Restart the backend. In Campus Bites, the student must save a phone number and enable WhatsApp updates under **My account**. Notifications are sent for order placement and each restaurant/delivery status change. Twilio send failures are logged by the backend but do not undo the order status.
4. For WhatsApp messages outside the customer-initiated 24-hour support window, set `TWILIO_WHATSAPP_CONTENT_SID` to an approved Twilio Content Template SID. The template must use `{{1}}` for the short order ID, `{{2}}` for restaurant name, and `{{3}}` for status. Ensure customers have explicitly opted in before messaging them.

## Vendor dashboard

At `/register`, choose either the **Customer** form (IITB email, with optional hostel and room details) or the **Restaurant owner** form (personal email and optional contact phone). Customer accounts must use an `@iitb.ac.in` address; vendor accounts may use a valid personal email. Successful vendor registration opens `/vendor`, where owners can set up their restaurant, manage menu items and opening status, and update incoming orders.

## Delivery accounts

Delivery people can register with their name, personal email, phone number, and password at `/register/delivery`. Restaurants update orders through `PLACED` → `PREPARING` → `READY_FOR_PICKUP`; after the restaurant marks an order ready, it appears in the delivery queue. A delivery person can claim an order, mark it as picked up, and mark it delivered. The authenticated delivery APIs are `GET /api/delivery/available-orders`, `GET /api/delivery/my-orders`, `PUT /api/delivery/orders/:orderId/accept`, and `PUT /api/delivery/orders/:orderId/status`. Vendor order updates use `GET /api/vendor/orders` and `PUT /api/vendor/orders/:orderId/status`. Both dashboards refresh orders periodically. Delivery uses manually entered pickup/delivery locations and does not use maps or location tracking.

## Student account

Students can open **My account** after signing in to update their name, phone, hostel, and room number; review order history and delivery/payment status; and change their password. The sign-in email is read-only. Profile and password changes use authenticated `/api/users` endpoints, and order history is available through `/api/orders/my-orders`.

## Menu item photos

Vendors can upload optional JPG, PNG, or WebP menu photos up to 5 MB when adding or editing a menu item. Development uploads are stored under `backend/uploads/menu` and served from `/uploads`. Keep this directory on persistent storage in deployments; for ephemeral hosting, configure persistent storage or replace local uploads with an object-storage service.

## Ratings

Signed-in students can rate menu items without ordering them. Restaurant ratings require at least one delivered order from that restaurant. Each student can update their own rating; each item and restaurant has at most one rating per student. Restaurant cards, menus, and the homepage display the same average-out-of-five and rating-count format. The homepage retrieves the highest-rated restaurants and available menu items from `/api/ratings/top`; rankings are empty until customers submit ratings.