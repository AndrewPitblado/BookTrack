const { sendToUser } = require("./pushService");

/**
 * Notify a user they received a friend request.
 */
async function notifyFriendRequest(recipientUserId, senderUsername) {
  try {
    await sendToUser(recipientUserId, {
      aps: {
        alert: {
          title: "New Friend Request",
          body: `${senderUsername} sent you a friend request!`,
        },
        sound: "default",
      },
      type: "friend_request",
    });
  } catch (err) {
    console.error("Push notification error (friend request):", err.message);
  }
}

/**
 * Notify a user their friend request was accepted.
 */
async function notifyFriendAccepted(recipientUserId, accepterUsername) {
  try {
    await sendToUser(recipientUserId, {
      aps: {
        alert: {
          title: "Friend Request Accepted",
          body: `${accepterUsername} accepted your friend request!`,
        },
        sound: "default",
      },
      type: "friend_accepted",
    });
  } catch (err) {
    console.error("Push notification error (friend accepted):", err.message);
  }
}

/**
 * Notify a user they unlocked new achievements.
 */
async function notifyAchievementsUnlocked(userId, achievements) {
  try {
    if (!achievements || achievements.length === 0) return;

    const names = achievements.map((a) => a.Achievement?.name || a.name);
    const body =
      names.length === 1
        ? `You unlocked "${names[0]}"!`
        : `You unlocked ${names.length} new achievements!`;

    await sendToUser(userId, {
      aps: {
        alert: {
          title: "Achievement Unlocked! 🏆",
          body,
        },
        sound: "default",
      },
      type: "achievement_unlocked",
      achievementNames: names,
    });
  } catch (err) {
    console.error("Push notification error (achievement):", err.message);
  }
}

/**
 * Notify a user's friends that they unlocked an achievement.
 */
async function notifyFriendsOfAchievement(
  userId,
  username,
  achievementNames,
  friendUserIds,
) {
  try {
    if (!friendUserIds || friendUserIds.length === 0) return;
    if (!achievementNames || achievementNames.length === 0) return;

    const body =
      achievementNames.length === 1
        ? `${username} unlocked "${achievementNames[0]}"!`
        : `${username} unlocked ${achievementNames.length} new achievements!`;

    await Promise.allSettled(
      friendUserIds.map((friendId) =>
        sendToUser(friendId, {
          aps: {
            alert: {
              title: "Friend Achievement 🎉",
              body,
            },
            sound: "default",
          },
          type: "friend_achievement",
          friendUsername: username,
          achievementNames,
        }),
      ),
    );
  } catch (err) {
    console.error("Push notification error (friend achievement):", err.message);
  }
}

module.exports = {
  notifyFriendRequest,
  notifyFriendAccepted,
  notifyAchievementsUnlocked,
  notifyFriendsOfAchievement,
};
