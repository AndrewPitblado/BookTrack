const express = require('express');
const router = express.Router();
const { User, Friendship, UserBook, Book, Author, UserAchievement, Achievement } = require('../models');
const authMiddleware = require('../middleware/auth');
const { Op } = require('sequelize');

// Search for users by username
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username || username.length < 2) {
      return res.status(400).json({ message: 'Search term must be at least 2 characters' });
    }

    const users = await User.findAll({
      where: {
        username: {
          [Op.like]: `%${username}%`
        },
        id: {
          [Op.ne]: req.user.id // Exclude current user
        }
      },
      attributes: ['id', 'username', 'email', 'createdAt'],
      limit: 20
    });

    // Check friendship status for each user
    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const friendship = await Friendship.findOne({
        where: {
          [Op.or]: [
            { userId: req.user.id, friendId: user.id },
            { userId: user.id, friendId: req.user.id }
          ]
        }
      });

      return {
        ...user.toJSON(),
        friendshipStatus: friendship ? friendship.status : null,
        isPending: friendship && friendship.status === 'pending',
        isFriend: friendship && friendship.status === 'accepted',
        requestSentByMe: friendship && friendship.userId === req.user.id
      };
    }));

    res.json({ users: usersWithStatus });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

// Send friend request
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    if (friendId === req.user.id) {
      return res.status(400).json({ message: 'Cannot add yourself as a friend' });
    }

    // Check if friendship already exists
    const existing = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: req.user.id, friendId },
          { userId: friendId, friendId: req.user.id }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    const friendship = await Friendship.create({
      userId: req.user.id,
      friendId,
      status: 'pending'
    });

    res.status(201).json({ message: 'Friend request sent', friendship });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Error sending friend request' });
  }
});

// Get pending friend requests
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const requests = await Friendship.findAll({
      where: {
        friendId: req.user.id,
        status: 'pending'
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'createdAt']
      }]
    });

    res.json({ requests });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ message: 'Error fetching friend requests' });
  }
});

// Accept friend request
router.put('/accept/:id', authMiddleware, async (req, res) => {
  try {
    const friendship = await Friendship.findByPk(req.params.id);

    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendship.friendId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    friendship.status = 'accepted';
    await friendship.save();

    res.json({ message: 'Friend request accepted', friendship });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Error accepting friend request' });
  }
});

// Reject or remove friend
router.delete('/remove/:id', authMiddleware, async (req, res) => {
  try {
    const friendship = await Friendship.findByPk(req.params.id);

    if (!friendship) {
      return res.status(404).json({ message: 'Friendship not found' });
    }

    // Check if user is part of this friendship
    if (friendship.userId !== req.user.id && friendship.friendId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to remove this friendship' });
    }

    await friendship.destroy();

    res.json({ message: 'Friendship removed' });
  } catch (error) {
    console.error('Error removing friendship:', error);
    res.status(500).json({ message: 'Error removing friendship' });
  }
});

// Get all friends
router.get('/', authMiddleware, async (req, res) => {
  try {
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { userId: req.user.id },
          { friendId: req.user.id }
        ],
        status: 'accepted'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'createdAt']
        },
        {
          model: User,
          as: 'friend',
          attributes: ['id', 'username', 'email', 'createdAt']
        }
      ]
    });

    // Format to return the friend (not self)
    const friends = friendships.map(f => {
      const friendData = f.userId === req.user.id ? f.friend : f.user;
      if (!friendData) {
        console.error('Missing friend data for friendship:', f.id);
        return null;
      }
      return {
        friendshipId: f.id,
        ...friendData.toJSON()
      };
    }).filter(f => f !== null);

    res.json({ friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ message: 'Error fetching friends' });
  }
});

// Get friend's profile stats
router.get('/:userId/stats', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify friendship
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: req.user.id, friendId: userId },
          { userId: userId, friendId: req.user.id }
        ],
        status: 'accepted'
      }
    });

    if (!friendship) {
      return res.status(403).json({ message: 'Not friends with this user' });
    }

    // Get user info
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'createdAt']
    });

    // Get book stats
    const userBooks = await UserBook.findAll({
      where: { userId }
    });

    const reading = userBooks.filter(b => b.status === 'reading').length;
    const finished = userBooks.filter(b => b.status === 'finished').length;

    // Get achievement stats
    const userAchievements = await UserAchievement.findAll({
      where: { userId },
      include: [{
        model: Achievement,
        attributes: ['points']
      }]
    });

    const achievements = userAchievements.length;
    const totalPoints = userAchievements.reduce((sum, ua) => sum + (ua.Achievement?.points || 0), 0);

    res.json({
      user,
      stats: {
        reading,
        finished,
        achievements,
        totalPoints
      }
    });
  } catch (error) {
    console.error('Error fetching friend stats:', error);
    res.status(500).json({ message: 'Error fetching friend stats' });
  }
});

// Get friend's recent books
router.get('/:userId/books', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify friendship
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: req.user.id, friendId: userId },
          { userId: userId, friendId: req.user.id }
        ],
        status: 'accepted'
      }
    });

    if (!friendship) {
      return res.status(403).json({ message: 'Not friends with this user' });
    }

    const userBooks = await UserBook.findAll({
      where: { userId },
      include: [{
        model: Book,
        include: [{
          model: Author,
          as: 'authors',
          through: { attributes: [] }
        }]
      }],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    // For finished books, fetch their ReadHistory to get rating and notes
    const userBooksWithHistory = await Promise.all(userBooks.map(async (userBook) => {
      const bookData = userBook.toJSON();
      if (userBook.status === 'finished') {
        const { ReadHistory } = require('../models');
        const readHistory = await ReadHistory.findOne({
          where: {
            userId: userId,
            bookId: userBook.bookId
          },
          order: [['endDate', 'DESC']]
        });
        if (readHistory) {
          bookData.rating = readHistory.rating;
          bookData.notes = readHistory.notes;
        }
      }
      return bookData;
    }));

    res.json({ userBooks: userBooksWithHistory });
  } catch (error) {
    console.error('Error fetching friend books:', error);
    res.status(500).json({ message: 'Error fetching friend books' });
  }
});

// Get friend's achievements
router.get('/:userId/achievements', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify friendship
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: req.user.id, friendId: userId },
          { userId: userId, friendId: req.user.id }
        ],
        status: 'accepted'
      }
    });

    if (!friendship) {
      return res.status(403).json({ message: 'Not friends with this user' });
    }

    const userAchievements = await UserAchievement.findAll({
      where: { userId },
      include: [{
        model: Achievement,
        attributes: ['id', 'name', 'description', 'icon', 'points', 'tier']
      }],
      order: [['unlockedAt', 'DESC']]
    });

    res.json({ userAchievements });
  } catch (error) {
    console.error('Error fetching friend achievements:', error);
    res.status(500).json({ message: 'Error fetching friend achievements' });
  }
});

module.exports = router;
