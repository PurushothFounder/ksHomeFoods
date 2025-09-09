const app = require('./src/app');
const { initializeFirebase } = require('./src/config/firebase');

const PORT = process.env.PORT || 5000;

// Initialize Firebase
initializeFirebase();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Ks-Home Foods Backend is ready!`);
});