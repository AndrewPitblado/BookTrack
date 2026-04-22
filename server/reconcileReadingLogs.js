require("dotenv").config();

const { Op } = require("sequelize");
const { ReadingLog, UserBook, sequelize } = require("./models");

function parseArgValue(argName) {
  const arg = process.argv.find((entry) => entry.startsWith(`${argName}=`));
  if (!arg) return undefined;
  return arg.split("=").slice(1).join("=");
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
  console.log("Reading Log Reconciliation Script");
  console.log("Usage: node reconcileReadingLogs.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --apply              Persist changes (default is dry-run)");
  console.log("  --userId=<id>        Process logs for a single user");
  console.log("  --userBookId=<id>    Process logs for a single user book");
  console.log("  --batchSize=<n>      Number of log ids to delete per batch (default 500)");
  console.log("  --help               Show this help output");
  console.log("");
  console.log("Examples:");
  console.log("  node reconcileReadingLogs.js");
  console.log("  node reconcileReadingLogs.js --apply");
  console.log("  node reconcileReadingLogs.js --userId=6");
  console.log("  node reconcileReadingLogs.js --apply --userBookId=12");
}

function buildDuplicateKey(log) {
  const loggedAt = log.loggedAt ? new Date(log.loggedAt).toISOString() : "";
  return [
    log.userId,
    log.userBookId,
    log.bookId,
    log.pagesRead,
    log.startPage ?? "null",
    log.endPage ?? "null",
    loggedAt,
  ].join("|");
}

async function findDuplicateLogIds(where) {
  const logs = await ReadingLog.findAll({
    where,
    attributes: [
      "id",
      "userId",
      "userBookId",
      "bookId",
      "pagesRead",
      "startPage",
      "endPage",
      "loggedAt",
    ],
    order: [
      ["userId", "ASC"],
      ["userBookId", "ASC"],
      ["loggedAt", "ASC"],
      ["id", "ASC"],
    ],
  });

  const byKey = new Map();
  for (const log of logs) {
    const key = buildDuplicateKey(log);
    const bucket = byKey.get(key) || [];
    bucket.push(log);
    byKey.set(key, bucket);
  }

  const duplicateGroups = [];
  const idsToDelete = [];

  for (const group of byKey.values()) {
    if (group.length <= 1) continue;

    const keep = group[0];
    const duplicates = group.slice(1);
    duplicateGroups.push({ keep, duplicates });
    idsToDelete.push(...duplicates.map((entry) => entry.id));
  }

  return { duplicateGroups, idsToDelete, scannedCount: logs.length };
}

async function summarizePotentialOvercount(where) {
  const logs = await ReadingLog.findAll({
    where,
    attributes: ["userBookId", "pagesRead"],
    raw: true,
  });

  const totalsByUserBook = new Map();
  for (const log of logs) {
    const current = totalsByUserBook.get(log.userBookId) || 0;
    totalsByUserBook.set(log.userBookId, current + Number(log.pagesRead || 0));
  }

  const userBookIds = Array.from(totalsByUserBook.keys());
  if (userBookIds.length === 0) return [];

  const userBooks = await UserBook.findAll({
    where: { id: { [Op.in]: userBookIds } },
    attributes: ["id", "userId", "bookId", "status", "currentPage"],
    raw: true,
  });

  const byId = new Map(userBooks.map((entry) => [entry.id, entry]));
  const overcountCandidates = [];

  for (const userBookId of userBookIds) {
    const logTotal = totalsByUserBook.get(userBookId) || 0;
    const userBook = byId.get(userBookId);
    if (!userBook) continue;

    const currentPage = Number(userBook.currentPage || 0);
    if (logTotal > currentPage) {
      overcountCandidates.push({
        userBookId,
        userId: userBook.userId,
        bookId: userBook.bookId,
        status: userBook.status,
        currentPage,
        logTotal,
        overBy: logTotal - currentPage,
      });
    }
  }

  return overcountCandidates.sort((a, b) => b.overBy - a.overBy);
}

async function deleteInBatches(ids, batchSize) {
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    await ReadingLog.destroy({ where: { id: { [Op.in]: chunk } } });
  }
}

async function run() {
  if (hasFlag("--help")) {
    printHelp();
    process.exit(0);
  }

  const dryRun = !hasFlag("--apply");
  const userIdArg = parseArgValue("--userId");
  const userBookIdArg = parseArgValue("--userBookId");
  const batchSizeArg = parseArgValue("--batchSize");

  const userId = userIdArg ? parsePositiveInteger(userIdArg) : undefined;
  const userBookId = userBookIdArg
    ? parsePositiveInteger(userBookIdArg)
    : undefined;
  const batchSize = parsePositiveInteger(batchSizeArg, 500);

  if (userBookId && !userId) {
    console.log(
      "Note: --userBookId provided without --userId. Proceeding with userBookId scope only.",
    );
  }

  const where = {};
  if (userId) where.userId = userId;
  if (userBookId) where.userBookId = userBookId;

  try {
    await sequelize.authenticate();

    console.log(`Mode: ${dryRun ? "dry-run" : "apply"}`);
    if (userId) console.log(`Filter userId: ${userId}`);
    if (userBookId) console.log(`Filter userBookId: ${userBookId}`);

    const { duplicateGroups, idsToDelete, scannedCount } =
      await findDuplicateLogIds(where);

    console.log(`Scanned logs: ${scannedCount}`);
    console.log(`Duplicate groups: ${duplicateGroups.length}`);
    console.log(`Duplicate rows to remove: ${idsToDelete.length}`);

    if (duplicateGroups.length > 0) {
      console.log("Sample duplicate groups (max 10):");
      duplicateGroups.slice(0, 10).forEach((group) => {
        const keep = group.keep;
        const dupIds = group.duplicates.map((entry) => entry.id);
        console.log(
          `  keep=${keep.id} remove=[${dupIds.join(",")}], userBookId=${keep.userBookId}, pages=${keep.pagesRead}, start=${keep.startPage}, end=${keep.endPage}, loggedAt=${new Date(keep.loggedAt).toISOString()}`,
        );
      });
    }

    if (!dryRun && idsToDelete.length > 0) {
      await deleteInBatches(idsToDelete, batchSize);
      console.log("Duplicate rows deleted.");
    } else if (dryRun) {
      console.log("Dry-run complete. No rows were deleted.");
    }

    const overcountCandidates = await summarizePotentialOvercount(where);
    if (overcountCandidates.length > 0) {
      console.log("");
      console.log(
        `Potential overcount user books (log total > currentPage): ${overcountCandidates.length}`,
      );
      overcountCandidates.slice(0, 20).forEach((entry) => {
        console.log(
          `  userBookId=${entry.userBookId}, userId=${entry.userId}, status=${entry.status}, currentPage=${entry.currentPage}, logTotal=${entry.logTotal}, overBy=${entry.overBy}`,
        );
      });
      if (overcountCandidates.length > 20) {
        console.log(`  ...and ${overcountCandidates.length - 20} more`);
      }
    } else {
      console.log("No overcount candidates detected.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Reading log reconciliation failed:", error);
    process.exit(1);
  }
}

run();
