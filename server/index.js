require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const userBookRoutes = require('./routes/userBooks');
const achievementRoutes = require('./routes/achievements');
const friendRoutes = require('./routes/friends');

const app = express();

// Middleware
app.use(cors());
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

const PORT = process.env.PORT || 5000;

// Sync database and start server
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synced successfully');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Unable to sync database:', err);
  });
