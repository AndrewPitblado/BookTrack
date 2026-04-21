const { Op } = require("sequelize");
const { UserBook, ReadingLog } = require("../models");

async function backfillReadingLogsFromCurrentProgress() {
  const progressedBooks = await UserBook.findAll({
    where: {
      currentPage: {
        [Op.gt]: 0,
      },
    },
    attributes: ["id", "userId", "bookId", "currentPage", "updatedAt"],
    raw: true,
  });

  if (!progressedBooks.length) {
    return {
      scanned: 0,
      created: 0,
      skippedExisting: 0,
    };
  }

  const userBookIds = progressedBooks.map((book) => book.id);
  const existingRows = await ReadingLog.findAll({
    where: {
      userBookId: {
        [Op.in]: userBookIds,
      },
    },
    attributes: ["userBookId"],
    group: ["userBookId"],
    raw: true,
  });

  const existingUserBookIds = new Set(
    existingRows.map((row) => row.userBookId),
  );

  const logsToCreate = progressedBooks
    .filter((book) => !existingUserBookIds.has(book.id))
    .map((book) => ({
      userId: book.userId,
      userBookId: book.id,
      bookId: book.bookId,
      pagesRead: book.currentPage,
      startPage: 0,
      endPage: book.currentPage,
      loggedAt: book.updatedAt || new Date(),
    }));

  if (logsToCreate.length > 0) {
    await ReadingLog.bulkCreate(logsToCreate);
  }

  return {
    scanned: progressedBooks.length,
    created: logsToCreate.length,
    skippedExisting: progressedBooks.length - logsToCreate.length,
  };
}

module.exports = {
  backfillReadingLogsFromCurrentProgress,
};
