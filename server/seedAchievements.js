require('dotenv').config();
const { Achievement } = require('./models');


const achievements = [
  {
    name: 'First Steps',
    description: 'Finish your first book',
    criteria: { type: 'books_finished', count: 1 },
    tier: 'bronze',
    icon: '/src/assets/footprint-foot-svgrepo-com.svg',
    isSecret: false,
    points: 10,
  },
  {
    name: 'Getting Started',
    description: 'Finish 3 books',
    criteria: { type: 'books_finished', count: 3 },
    tier: 'bronze',
    icon: '/src/assets/books-book-svgrepo-com.svg',
    isSecret: false,
    points: 15,
  },
  {
    name: 'Bookworm',
    description: 'Finish 5 books',
    criteria: { type: 'books_finished', count: 5 },
    tier: 'silver',
    icon: '/src/assets/apple-with-worm-svgrepo-com.svg',
    isSecret: false,
    points: 25,
  },
  {
    name: 'Page Turner',
    description: 'Finish 7 books',
    criteria: { type: 'books_finished', count: 7 },
    tier: 'silver',
    icon: '/src/assets/book-education-library-3-svgrepo-com.svg',
    isSecret: false,
    points: 30,
  },
  {
    name: 'Scholar',
    description: 'Finish 10 books',
    criteria: { type: 'books_finished', count: 10 },
    tier: 'gold',
    icon: '/src/assets/book-worm-research-paper-examine-svgrepo-com(1).svg',
    isSecret: false,
    points: 50,
  },
  {
    name: 'Library Master',
    description: 'Finish 25 books',
    criteria: { type: 'books_finished', count: 25 },
    tier: 'platinum',
    icon: '/src/assets/book-education-ladder-svgrepo-com.svg',
    isSecret: false,
    points: 100,
  },
  {
    name: 'Speed Reader',
    description: 'Finish a book in under 3 days',
    criteria: { type: 'speed_reading', days: 3 },
    tier: 'gold',
    icon: '/src/assets/speed-svgrepo-com.svg',
    isSecret: true,
    points: 75,
  },
  {
  name: 'So Many Pages',
  description: 'Read 1,000 pages total',
  criteria: { type: 'page_count', totalPages: 1000 },
  tier: 'bronze',
  icon: '/src/assets/office-material-outbox-svgrepo-com.svg',
  isSecret: false,
  points: 20,
  },
  {
  name: 'Marathon Reader',
  description: 'Read 10,000 pages total',
  criteria: { type: 'page_count', totalPages: 10000 },
  tier: 'gold',
  icon: '/src/assets/ebook-svgrepo-com.svg',
  isSecret: false,
  points: 100,
  },
  {
  name: 'Genre Explorer',
  description: 'Read books from 5 different genres',
  criteria: { type: 'genre_diversity', uniqueGenres: 5 },
  tier: 'silver',
  icon: '/src/assets/compass-svgrepo-com.svg',
  isSecret: false,
  points: 30,
  },
  {
  name: 'Genre Master',
  description: 'Read books from 15 different genres',
  criteria: { type: 'genre_diversity', uniqueGenres: 15 },
  tier: 'platinum',
  icon: '/src/assets/rainbow-svgrepo-com.svg',
  isSecret: false,
  points: 150,
  },
  {
  name: 'Mystery Fanatic',
  description: 'Read 10 mystery books',
  criteria: { type: 'genre_master', genre: 'Mystery', count: 10 },
  tier: 'gold',
  icon: '/src/assets/man-with-magnifying-glass-svgrepo-com.svg',
  isSecret: false,
  points: 60,
  },
  {
  name: 'Sci-Fi Enthusiast',
  description: 'Read 10 science fiction books',
  criteria: { type: 'genre_master', genre: 'Science Fiction', count: 10 },
  tier: 'gold',
  icon: '/src/assets/gray-alien-svgrepo-com.svg',
  isSecret: false,
  points: 60,
  },
  {
  name: 'Author Fan',
  description: 'Read 3 books by the same author',
  criteria: { type: 'author_books', count: 3 },
  tier: 'bronze',
  icon: '/src/assets/flamenco-fan-svgrepo-com.svg',
  isSecret: false,
  points: 20,
  },
  {
  name: 'Author Devotee',
  description: 'Read 5 books by the same author',
  criteria: { type: 'author_books', count: 5 },
  tier: 'silver',
  icon: '/src/assets/shakespeare-author-svgrepo-com.svg',
  isSecret: false,
  points: 40,
  },
  {
  name: 'Superfan',
  description: 'Read 10 books by the same author',
  criteria: { type: 'author_books', count: 10 },
  tier: 'gold',
  icon: '/src/assets/rugby-fan-with-an-encouraging-signal-with-word-go-svgrepo-com.svg',
  isSecret: false,
  points: 75,
  },
  {
  name: 'Complete Collection',
  description: 'Read 15 books by the same author',
  criteria: { type: 'author_books', count: 15 },
  tier: 'platinum',
  icon: '/src/assets/love-svgrepo-com.svg',
  isSecret: false,
  points: 125,
  }
];

async function seedAchievements() {
  console.log('Starting achievement seeding...');

  let createdCount = 0;
  let updatedCount = 0;

  for (const achievementData of achievements) {
    const [achievement, created] = await Achievement.findOrCreate({
      where: { name: achievementData.name },
      defaults: achievementData,
    });

    if (created) {
      createdCount += 1;
      console.log(`Created achievement: ${achievement.name}`);
    } else {
      await achievement.update({
        description: achievementData.description,
        criteria: achievementData.criteria,
        tier: achievementData.tier,
        icon: achievementData.icon,
        isSecret: achievementData.isSecret,
        points: achievementData.points,
      });
      updatedCount += 1;
      console.log(`Updated achievement: ${achievement.name}`);
    }
  }

  console.log(`Achievement seeding complete. Created: ${createdCount}, Updated: ${updatedCount}`);
  return { createdCount, updatedCount, total: achievements.length };
}

if (require.main === module) {
  seedAchievements()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error seeding achievements:', error);
      process.exit(1);
    });
}

module.exports = { seedAchievements, achievements };
