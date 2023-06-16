// middleware/auth.js

// Import your authentication library or functions here

const requireLogin = (req, res, next) => {
    // Check if user is authenticated
    if (req.isAuthenticated()) {
      return next(); // User is authenticated, continue to the next middleware or route handler
    }
    // User is not authenticated, redirect or send an error response
    res.status(401).json({ message: "Please log in to access this route." });
  };
  
  module.exports = requireLogin;