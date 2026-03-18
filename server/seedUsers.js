require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User, sequelize } = require('./models');

const USERS_TO_CREATE = 50; // Adjust as needed

const firstNames = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Emma', 'Frank', 'Grace', 'Henry',
  'Isabella', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Peter',
  'Quinn', 'Rachel', 'Sam', 'Taylor', 'Uma', 'Victor', 'Wendy', 'Xander',
  'Yara', 'Zoe', 'Alex', 'Blake', 'Casey', 'Drew'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function seedUsers() {
  try {
    console.log('Starting user seed...');
    
    await sequelize.authenticate();
    console.log('Database connected successfully');

    const users = [];
    const defaultPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    for (let i = 1; i <= USERS_TO_CREATE; i++) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`;
      const email = `${username}@example.com`;

      users.push({
        username,
        email,
        password: hashedPassword,
      });

      if (i % 10 === 0) {
        console.log(`Generated ${i}/${USERS_TO_CREATE} users...`);
      }
    }

    console.log(`Inserting ${users.length} users into database...`);
    const createdUsers = await User.bulkCreate(users, {
      validate: true,
      ignoreDuplicates: true,
    });

    console.log(`\n✓ Successfully created ${createdUsers.length} users!`);
    console.log(`Default password for all users: ${defaultPassword}`);
    console.log('\nSample users:');
    createdUsers.slice(0, 5).forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();