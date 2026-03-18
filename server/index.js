require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const { seedAchievements } = require('./seedAchievements');

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const userBookRoutes = require('./routes/userBooks');
const achievementRoutes = require('./routes/achievements');
const friendRoutes = require('./routes/friends');

const app = express();

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/user-books', userBookRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/friends', friendRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BookTrack API is running' });
});

const PORT = process.env.PORT || 5001;
const syncOptions = process.env.NODE_ENV === 'production' ? {} : { alter: true };
const autoSeedAchievements = process.env.AUTO_SEED_ACHIEVEMENTS !== 'false';

async function startServer() {
  try {
    await sequelize.sync(syncOptions);
    console.log('Database synced successfully');

    if (autoSeedAchievements) {
      try {
        await seedAchievements();
      } catch (seedError) {
        console.error('Achievement auto-seed failed:', seedError);
      }
    } else {
      console.log('Achievement auto-seed skipped (AUTO_SEED_ACHIEVEMENTS=false)');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to sync database:', err);
  }
}

startServer();
