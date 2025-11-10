const mysql = require("mysql2");
require('dotenv').config();

// Create a pool for the report database
const reportPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  timezone: "local"
});

// Create a pool for the attendance_register database
const attendancePool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE1,
  timezone: "local"
});

// Use promise-based connection for both pools
const connection = reportPool.promise();
const attendanceConnection = attendancePool.promise();

// Test connection for the report database
connection.getConnection()
  .then((connection) => {
    console.log("Connected to report database successfully");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to report database:", err);
  });

// Test connection for the attendance_register database
attendanceConnection.getConnection()
  .then((connection) => {
    console.log("Connected to attendance_register database successfully");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to attendance_register database:", err);
  });

// Export both connections
module.exports = {
  connection,
  attendanceConnection,
};

