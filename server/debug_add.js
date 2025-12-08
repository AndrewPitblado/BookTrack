require('dotenv').config();
const { sequelize, User, Book, UserProgress } = require('./models');

async function debugAdd() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');

    // 1. Get a user
    const user = await User.findOne();
    if (!user) {
      console.log('No users found. Create a user first.');
      return;
    }
    console.log('User found:', user.id);

    // 2. Get a book
    const book = await Book.findOne();
    if (!book) {
      console.log('No books found. Create a book first.');
      return;
    }
    console.log('Book found:', book.isbn);

    // 3. Try to create UserProgress
    console.log('Attempting to create UserProgress...');
    try {
        const up = await UserProgress.create({
            userId: user.id,
            bookId: book.isbn,
            status: 'reading',
            startDate: new Date()
        });
        console.log('UserProgress created:', up.toJSON());

        // 4. Try to fetch with include
        console.log('Attempting to fetch with include...');
        const fetched = await UserProgress.findByPk(up.id, {
            include: [{ model: Book }]
        });
        console.log('Fetched successfully:', fetched ? fetched.toJSON() : 'null');

    } catch (err) {
        console.error('Error during operation:', err);
    }

  } catch (error) {
    console.error('Setup error:', error);
  } finally {
    await sequelize.close();
  }
}

debugAdd();
