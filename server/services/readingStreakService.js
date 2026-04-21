const { ReadingLog } = require("../models");

function toDateKey(dateValue) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function addDays(dateKey, deltaDays) {
  const base = new Date(`${dateKey}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

function calculateStreakFromDateKeys(dateKeys) {
  if (!dateKeys.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastReadingDate: null,
    };
  }

  const uniqueKeys = [...new Set(dateKeys)].sort();
  const dateSet = new Set(uniqueKeys);
  const lastReadingDate = uniqueKeys[uniqueKeys.length - 1];

  let currentStreak = 1;
  let cursor = lastReadingDate;
  while (dateSet.has(addDays(cursor, -1))) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < uniqueKeys.length; i += 1) {
    if (addDays(uniqueKeys[i - 1], 1) === uniqueKeys[i]) {
      run += 1;
    } else {
      longestStreak = Math.max(longestStreak, run);
      run = 1;
    }
  }
  longestStreak = Math.max(longestStreak, run);

  return {
    currentStreak,
    longestStreak,
    lastReadingDate,
  };
}

async function getReadingStreakForUser(userId) {
  const logs = await ReadingLog.findAll({
    where: { userId },
    attributes: ["loggedAt"],
    order: [["loggedAt", "ASC"]],
  });

  const dateKeys = logs.map((log) => toDateKey(log.loggedAt)).filter(Boolean);

  return calculateStreakFromDateKeys(dateKeys);
}

module.exports = {
  getReadingStreakForUser,
};
