const express = require('express');
const cors = require('cors');
const jsonLogic = require('json-logic-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Add your frontend URLs
  credentials: true
}));
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'JSON Logic Backend API is running!',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'json-logic-backend' });
});

// JSON Logic evaluation route
app.post('/api/evaluate', (req, res) => {
  try {
    const { logic, data } = req.body;
    
    if (!logic) {
      return res.status(400).json({ 
        error: 'Logic rule is required' 
      });
    }

    const result = jsonLogic.apply(logic, data || {});
    
    res.json({
      success: true,
      result,
      logic,
      data: data || {}
    });
  } catch (error) {
    console.error('JSON Logic evaluation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate JSON Logic rule',
      details: error.message
    });
  }
});

// Rule validation route
app.post('/api/validate', (req, res) => {
  try {
    const { logic } = req.body;
    
    if (!logic) {
      return res.status(400).json({ 
        error: 'Logic rule is required' 
      });
    }

    // Try to parse and validate the logic
    const testData = {};
    jsonLogic.apply(logic, testData);
    
    res.json({
      success: true,
      valid: true,
      message: 'Rule is valid'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      valid: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` API endpoint: http://localhost:${PORT}/api/evaluate`);
});