// Sanskardham Hospital - API Configuration
const CONFIG = {
  // Automatically detects local environment vs live production
  // IMPORTANT: After deploying your backend to Render, replace the Render URL below with your actual URL!
  API_BASE_URL:
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:'
      ? 'http://localhost:5000/api'
      : 'https://sanskardham-backend.onrender.com/api'
};
