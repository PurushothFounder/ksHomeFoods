require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { initializeFirebase } = require('./config/firebase');

const app = express();
console.log("Private Key Preview:", JSON.stringify(process.env.FIREBASE_PRIVATE_KEY.slice(0, 100)));
// Initialize Firebase
initializeFirebase();

// Import routes
const authRoutes = require('./routes/users/auth');
const adminRoutes = require('./routes/admin/adminRoutes'); 
const categoryRoutes = require('./routes/category/categoryRoutes'); 
const menuItemRoutes = require('./routes/category/menuItemRoutes'); 
const bannerRoutes = require('./routes/banner/bannerRoutes'); 
const introRoutes = require('./routes/banner/introRoutes'); 
const addressRoutes = require('./routes/users/addressRoutes'); 
const orderRoutes = require('./routes/order/orderRoutes');
const deliveryRoutes = require('./routes/routes/deliveryAreaRoutes');
const appVersionRoutes = require('./routes/app/appVersion');
const ticketRoutes = require('./routes/support/ticketRoutes');
const policyRoutes = require('./routes/support/policyRoutes');
const notificationRoutes = require('./routes/notifications/notificationRoutes');
const deliveryBoyRoutes = require('./routes/deliveryboy/deliveryboyRoutes');
// Middleware
app.use(helmet());

// Apply a more permissive CORS configuration globally to handle all cases
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes); 
app.use('/api/categories', categoryRoutes); 
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/intro', introRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery-areas', deliveryRoutes);
app.use('/api/app-version', appVersionRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/delivery-boy', deliveryBoyRoutes);

// Basic routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'KS Home Foods Backend is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        googleSignIn: 'POST /api/users/google-signin', // Fixed endpoint path
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        refreshToken: 'POST /api/auth/refresh-token',
        logout: 'POST /api/auth/logout'
      }
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy!',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test Firebase
app.get('/api/test-firebase', async (req, res) => {
  try {
    const { getFirestore } = require('./config/firebase');
    const db = getFirestore();
    
    await db.collection('test').doc('connection').set({
      message: 'Firebase test successful!',
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Firebase connected successfully!',
      project: process.env.FIREBASE_PROJECT_ID
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Firebase connection failed',
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.message 
    })
  });
});

module.exports = app;