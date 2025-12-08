const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

async function addColumn() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');
    // Check if column exists first to avoid error
    const [results] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'email'");
    if (results.length === 0) {
        await sequelize.query("ALTER TABLE users ADD COLUMN email VARCHAR(100) UNIQUE AFTER user_name;");
        console.log('Email column added successfully.');
    } else {
        console.log('Email column already exists.');
    }
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await sequelize.close();
  }
}

addColumn();
