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

async function inspectProgress() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    const [results] = await sequelize.query("DESCRIBE user_progress;");
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

inspectProgress();
