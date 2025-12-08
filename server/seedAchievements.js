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
    icon: '/src/assets/book-education-library-3-svgrepo-com.svg',
    isSecret: false,
    points: 100,
  },
];

async function seedAchievements() {
  try {
    console.log('Starting achievement seeding...');
    
    for (const achievementData of achievements) {
      const [achievement, created] = await Achievement.findOrCreate({
        where: { name: achievementData.name },
        defaults: achievementData,
      });
      
      if (created) {
        console.log(`✓ Created achievement: ${achievement.name}`);
      } else {
        // Update existing achievement with icon
        await achievement.update({
          icon: achievementData.icon,
          description: achievementData.description,
          criteria: achievementData.criteria,
          tier: achievementData.tier,
          points: achievementData.points,
        });
        console.log(`✓ Updated achievement: ${achievement.name}`);
      }
    }
    
    console.log('\n✅ Achievement seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding achievements:', error);
    process.exit(1);
  }
}

seedAchievements();
