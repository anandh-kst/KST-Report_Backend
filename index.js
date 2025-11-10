const express = require('express');
const cors = require('cors');
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require('path');
const { errorHandler } = require('./errorHandler');

const app = express();
const swaggerJsDoc = YAML.load("./api.yaml");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Swagger API documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerJsDoc));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const report = require('./routes/report');
app.use("/", report);

const admin = require('./routes/admin');
app.use("/", admin);

const task = require('./routes/task');
app.use('/api', task);

// Error handling middleware
app.use(errorHandler);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Handle all other routes for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
app.get('/index', (req, res) => {
  res.send("Server Running...");
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});