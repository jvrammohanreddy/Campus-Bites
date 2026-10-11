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