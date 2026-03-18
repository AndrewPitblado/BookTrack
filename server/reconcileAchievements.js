require('dotenv').config();

const { User, sequelize } = require('./models');
const { reconcileUserAchievements } = require('./services/achievementEngine');

function parseArgValue(argName) {
  const arg = process.argv.find((entry) => entry.startsWith(`${argName}=`));
  if (!arg) return undefined;
  return arg.split('=').slice(1).join('=');
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric argument value: ${value}`);
  }
  return parsed;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function printHelp() {
  console.log('Achievement Reconciliation Script');
  console.log('Usage: node reconcileAchievements.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --apply              Persist changes (default is dry-run)');
  console.log('  --userId=<id>        Reconcile a single user');
  console.log('  --limit=<n>          Process at most N users');
  console.log('  --batchSize=<n>      Number of users per query batch (default 100)');
  console.log('  --help               Show this help output');
  console.log('');
  console.log('Examples:');
  console.log('  node reconcileAchievements.js');
  console.log('  node reconcileAchievements.js --apply');
  console.log('  node reconcileAchievements.js --apply --batchSize=50 --limit=500');
  console.log('  node reconcileAchievements.js --userId=42');
}

async function processUser(user, dryRun) {
  const result = await reconcileUserAchievements(user.id, { dryRun });

  const unlockedNames = result.newlyUnlocked
    .map((entry) => entry.Achievement?.name)
    .filter(Boolean);

  const revokedNames = result.newlyRevoked
    .map((entry) => entry.Achievement?.name)
    .filter(Boolean);

  const changed = unlockedNames.length > 0 || revokedNames.length > 0;

  if (changed) {
    console.log(`User ${user.id} (${user.username})`);
    if (unlockedNames.length > 0) {
      console.log(`  + Unlock: ${unlockedNames.join(', ')}`);
    }
    if (revokedNames.length > 0) {
      console.log(`  - Revoke: ${revokedNames.join(', ')}`);
    }
  }

  return {
    changed,
    unlockedCount: unlockedNames.length,
    revokedCount: revokedNames.length,
  };
}

async function reconcileAllUsers({ dryRun, userId, limit, batchSize }) {
  const where = userId ? { id: userId } : undefined;

  const totalMatchingUsers = await User.count({ where });
  if (totalMatchingUsers === 0) {
    console.log('No users found for reconciliation.');
    return;
  }

  const targetCount = limit ? Math.min(limit, totalMatchingUsers) : totalMatchingUsers;

  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`);
  console.log(`Users to process: ${targetCount}`);

  let processed = 0;
  let changedUsers = 0;
  let totalUnlocked = 0;
  let totalRevoked = 0;
  let offset = 0;

  while (processed < targetCount) {
    const remaining = targetCount - processed;
    const fetchCount = Math.min(batchSize, remaining);

    const users = await User.findAll({
      where,
      order: [['id', 'ASC']],
      offset,
      limit: fetchCount,
      attributes: ['id', 'username'],
    });

    if (users.length === 0) break;

    for (const user of users) {
      const result = await processUser(user, dryRun);
      processed += 1;
      if (result.changed) {
        changedUsers += 1;
      }
      totalUnlocked += result.unlockedCount;
      totalRevoked += result.revokedCount;
    }

    offset += users.length;
    console.log(`Progress: ${processed}/${targetCount} users processed`);
  }

  console.log('');
  console.log('Reconciliation summary:');
  console.log(`  Processed users: ${processed}`);
  console.log(`  Users with changes: ${changedUsers}`);
  console.log(`  Achievements unlocked: ${totalUnlocked}`);
  console.log(`  Achievements revoked: ${totalRevoked}`);

  if (dryRun) {
    console.log('Dry-run complete. No database changes were written.');
  } else {
    console.log('Apply run complete. Changes were persisted.');
  }
}

async function run() {
  if (hasFlag('--help')) {
    printHelp();
    process.exit(0);
  }

  const dryRun = !hasFlag('--apply');
  const userIdArg = parseArgValue('--userId');
  const limitArg = parseArgValue('--limit');
  const batchSizeArg = parseArgValue('--batchSize');

  const userId = userIdArg ? parsePositiveInteger(userIdArg) : undefined;
  const limit = limitArg ? parsePositiveInteger(limitArg) : undefined;
  const batchSize = parsePositiveInteger(batchSizeArg, 100);

  if (userId && limit) {
    throw new Error('Use either --userId or --limit, not both together.');
  }

  try {
    await sequelize.authenticate();
    await reconcileAllUsers({ dryRun, userId, limit, batchSize });
    process.exit(0);
  } catch (error) {
    console.error('Achievement reconciliation failed:', error);
    process.exit(1);
  }
}

run();
