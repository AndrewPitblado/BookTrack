const express = require("express");
const { Achievement, UserAchievement, User, Friendship } = require("../models");
const {
  getAchievementProgress,
  reconcileUserAchievements,
} = require("../services/achievementEngine");
const {
  notifyAchievementsUnlocked,
  notifyFriendsOfAchievement,
} = require("../services/notificationService");
const { Op } = require("sequelize");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/achievements - Get all achievements
router.get("/", auth, async (req, res) => {
  try {
    const achievements = await Achievement.findAll();
    res.json({ achievements });
  } catch (error) {
    console.error("Get achievements error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/achievements/user - Get user's unlocked achievements
router.get("/user", auth, async (req, res) => {
  try {
    const { unlockedCount, newlyUnlocked } = await reconcileUserAchievements(req.userId);

    // Send push notifications for newly unlocked achievements
    if (unlockedCount > 0) {
      notifyAchievementsUnlocked(req.userId, newlyUnlocked);
      const friendships = await Friendship.findAll({
        where: {
          [Op.or]: [{ userId: req.userId }, { friendId: req.userId }],
          status: "accepted",
        },
      });
      const friendIds = friendships.map((f) =>
        f.userId === req.userId ? f.friendId : f.userId,
      );
      if (friendIds.length > 0) {
        const user = await User.findByPk(req.userId, {
          attributes: ["username"],
        });
        const names = newlyUnlocked.map(
          (a) => a.Achievement?.name || "an achievement",
        );
        notifyFriendsOfAchievement(req.userId, user.username, names, friendIds);
      }
    }

    const userAchievements = await UserAchievement.findAll({
      where: { userId: req.userId },
      include: [{ model: Achievement }],
      order: [["unlockedAt", "DESC"]],
    });

    res.json({ userAchievements });
  } catch (error) {
    console.error("Get user achievements error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/achievements/progress - Get progress for all achievements
router.get("/progress", auth, async (req, res) => {
  try {
    const { unlockedCount, newlyUnlocked } = await reconcileUserAchievements(req.userId);

    // Send push notifications for newly unlocked achievements
    if (unlockedCount > 0) {
      notifyAchievementsUnlocked(req.userId, newlyUnlocked);
      const friendships = await Friendship.findAll({
        where: {
          [Op.or]: [{ userId: req.userId }, { friendId: req.userId }],
          status: "accepted",
        },
      });
      const friendIds = friendships.map((f) =>
        f.userId === req.userId ? f.friendId : f.userId,
      );
      if (friendIds.length > 0) {
        const user = await User.findByPk(req.userId, {
          attributes: ["username"],
        });
        const names = newlyUnlocked.map(
          (a) => a.Achievement?.name || "an achievement",
        );
        notifyFriendsOfAchievement(req.userId, user.username, names, friendIds);
      }
    }

    const progress = await getAchievementProgress(req.userId);

    res.json({ progress });
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/achievements/check - Check and award any new achievements
router.post("/check", auth, async (req, res) => {
  try {
    const { newlyUnlocked, newlyRevoked, unlockedCount, revokedCount } =
      await reconcileUserAchievements(req.userId);

    let message = "No achievement changes";
    if (unlockedCount > 0 && revokedCount > 0) {
      message = `Unlocked ${unlockedCount} and revoked ${revokedCount} achievement(s).`;
    } else if (unlockedCount > 0) {
      message = `Unlocked ${unlockedCount} new achievement(s)!`;
    } else if (revokedCount > 0) {
      message = `Revoked ${revokedCount} achievement(s) no longer meeting requirements.`;
    }

    res.json({
      newlyUnlocked,
      newlyRevoked,
      message,
    });

    // Send push notifications asynchronously (don't block response)
    if (unlockedCount > 0) {
      // Notify the user
      notifyAchievementsUnlocked(req.userId, newlyUnlocked);

      // Notify their friends
      const friendships = await Friendship.findAll({
        where: {
          [Op.or]: [{ userId: req.userId }, { friendId: req.userId }],
          status: "accepted",
        },
      });
      const friendIds = friendships.map((f) =>
        f.userId === req.userId ? f.friendId : f.userId,
      );
      if (friendIds.length > 0) {
        const user = await User.findByPk(req.userId, {
          attributes: ["username"],
        });
        const names = newlyUnlocked.map(
          (a) => a.Achievement?.name || "an achievement",
        );
        notifyFriendsOfAchievement(req.userId, user.username, names, friendIds);
      }
    }
  } catch (error) {
    console.error("Check achievements error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
