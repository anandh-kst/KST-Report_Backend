const {Sequelize} = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();
const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    
    define: {
        timestamps: true,
        underscored: true,
    },
});

module.exports = sequelize;
