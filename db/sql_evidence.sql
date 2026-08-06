-- BookTrack SQL Evidence Pack
-- Includes: data seeding, 6 queries, 3 views, 3 modifications, final row counts
-- NOTE: Run with: USE booktrack;

-- =========================
-- Seed (truncate + insert)
-- =========================

SET FOREIGN_KEY_CHECKS=0;
TRUNCATE user_achievements;
TRUNCATE user_books;
TRUNCATE read_history;
TRUNCATE achievements;
TRUNCATE books;
SET FOREIGN_KEY_CHECKS=1;

-- Seed books (2000)
INSERT INTO books
(googleBooksId, title, authors, description, thumbnail, pageCount, publishedDate, categories, createdAt, updatedAt)
SELECT
  CONCAT('FAKE-', LPAD(n, 6, '0')) AS googleBooksId,
  CONCAT('Book ', n) AS title,
  JSON_ARRAY(CONCAT('Author ', 1 + MOD(n, 50))) AS authors,
  CONCAT('Description for book ', n) AS description,
  NULL AS thumbnail,
  50 + MOD(n, 451) AS pageCount,
  CONCAT(1990 + MOD(n, 35), '-01-01') AS publishedDate,
  JSON_ARRAY(CONCAT('Category ', 1 + MOD(n, 20))) AS categories,
  NOW(), NOW()
FROM (
  SELECT ones.d + 10*tens.d + 100*hundreds.d + 1000*thousands.d + 1 AS n
  FROM (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) ones
  CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) tens
  CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) hundreds
  CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) thousands
) nums
WHERE n <= 2000;

-- Seed achievements (250)
INSERT INTO achievements
(name, description, criteria, icon, createdAt, updatedAt)
SELECT
  CONCAT('Achievement ', n) AS name,
  CONCAT('Unlock achievement ', n) AS description,
  JSON_OBJECT('type', 'milestone', 'threshold', n) AS criteria,
  CONCAT('icon-', n) AS icon,
  NOW(), NOW()
FROM (
  SELECT ones.d + 10*tens.d + 100*hundreds.d + 1 AS n
  FROM (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) ones
  CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) tens
  CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) hundreds
) nums
WHERE n <= 250;

-- Seed user_books (1200) for userId=1
INSERT INTO user_books
(userId, bookId, status, startDate, endDate, createdAt, updatedAt)
SELECT
  1 AS userId,
  b.id AS bookId,
  CASE
    WHEN MOD(b.id, 3)=0 THEN 'finished'
    WHEN MOD(b.id, 3)=1 THEN 'reading'
    ELSE 'dropped'
  END AS status,
  DATE_SUB(CURDATE(), INTERVAL MOD(b.id, 365) DAY) AS startDate,
  CASE
    WHEN MOD(b.id, 3)=0 THEN DATE_SUB(CURDATE(), INTERVAL MOD(b.id, 365) DAY) + INTERVAL (1 + MOD(b.id, 30)) DAY
    ELSE NULL
  END AS endDate,
  NOW(), NOW()
FROM books b
WHERE b.id BETWEEN 1 AND 1200;

-- Seed read_history (finished + non-finished -> 1500+)
INSERT INTO read_history
(userId, bookId, startDate, endDate, rating, notes, createdAt, updatedAt)
SELECT
  1 AS userId,
  ub.bookId,
  ub.startDate,
  COALESCE(ub.endDate, ub.startDate + INTERVAL (1 + MOD(ub.bookId, 20)) DAY) AS endDate,
  1 + MOD(ub.bookId, 5) AS rating,
  CONCAT('Auto note for book ', ub.bookId) AS notes,
  NOW(), NOW()
FROM user_books ub
WHERE ub.status = 'finished';

INSERT INTO read_history
(userId, bookId, startDate, endDate, rating, notes, createdAt, updatedAt)
SELECT
  1 AS userId,
  ub.bookId,
  ub.startDate,
  ub.startDate + INTERVAL (1 + MOD(ub.bookId, 20)) DAY AS endDate,
  1 + MOD(ub.bookId, 5) AS rating,
  CONCAT('Auto note (extra) for book ', ub.bookId) AS notes,
  NOW(), NOW()
FROM user_books ub
WHERE ub.status <> 'finished';

-- Seed user_achievements (200)
INSERT INTO user_achievements
(userId, achievementId, unlockedAt, createdAt, updatedAt)
SELECT
  1 AS userId,
  a.id AS achievementId,
  DATE_SUB(NOW(), INTERVAL MOD(a.id, 365) DAY) AS unlockedAt,
  NOW(), NOW()
FROM achievements a
WHERE a.id BETWEEN 1 AND 200;

-- =========================
-- 6 Queries
-- =========================

-- Q1 (JOIN): reading books
SELECT u.username, b.title, b.pageCount, ub.status, ub.startDate
FROM users u
JOIN user_books ub ON ub.userId = u.id
JOIN books b ON b.id = ub.bookId
WHERE u.id = 1 AND ub.status = 'reading'
ORDER BY ub.startDate DESC
LIMIT 10;

-- Q2 (GROUP BY): status counts
SELECT ub.status, COUNT(*) AS cnt
FROM user_books ub
WHERE ub.userId = 1
GROUP BY ub.status;

-- Q3 (AGG + ORDER): top avg rating
SELECT b.title, AVG(rh.rating) AS avg_rating, COUNT(*) AS rating_count
FROM read_history rh
JOIN books b ON b.id = rh.bookId
WHERE rh.userId = 1
GROUP BY rh.bookId, b.title
HAVING COUNT(*) >= 1
ORDER BY avg_rating DESC, rating_count DESC
LIMIT 10;

-- Q4 (SUBQUERY): above-average ratings
SELECT rh.bookId, b.title, rh.rating
FROM read_history rh
JOIN books b ON b.id = rh.bookId
WHERE rh.userId = 1
  AND rh.rating > (SELECT AVG(rating) FROM read_history WHERE userId = 1)
ORDER BY rh.rating DESC
LIMIT 10;

-- Q5 (EXISTS): users with any achievement
SELECT u.id, u.username, u.email
FROM users u
WHERE EXISTS (
  SELECT 1
  FROM user_achievements ua
  WHERE ua.userId = u.id
);

-- Q6 (TIME/GROUP): monthly logs
SELECT DATE_FORMAT(rh.createdAt, '%Y-%m') AS ym, COUNT(*) AS logs
FROM read_history rh
WHERE rh.userId = 1
GROUP BY ym
ORDER BY ym DESC
LIMIT 12;

-- =========================
-- 3 Views (+ example queries)
-- =========================

DROP VIEW IF EXISTS v_user_book_status_summary;
DROP VIEW IF EXISTS v_user_recent_reads;
DROP VIEW IF EXISTS v_user_achievement_counts;

CREATE VIEW v_user_book_status_summary AS
SELECT userId, status, COUNT(*) AS cnt
FROM user_books
GROUP BY userId, status;

CREATE VIEW v_user_recent_reads AS
SELECT rh.userId, rh.bookId, b.title, rh.rating, rh.startDate, rh.endDate, rh.createdAt
FROM read_history rh
JOIN books b ON b.id = rh.bookId;

CREATE VIEW v_user_achievement_counts AS
SELECT ua.userId, COUNT(*) AS achievements_unlocked
FROM user_achievements ua
GROUP BY ua.userId;

SELECT * FROM v_user_book_status_summary WHERE userId = 1;
SELECT * FROM v_user_recent_reads WHERE userId = 1 ORDER BY createdAt DESC LIMIT 10;
SELECT * FROM v_user_achievement_counts WHERE userId = 1;

-- =========================
-- 3 Modifications
-- =========================

-- M1 UPDATE: mark 50 reading as finished
UPDATE user_books
SET status='finished',
    endDate = COALESCE(endDate, CURDATE()),
    updatedAt = NOW()
WHERE userId=1 AND status='reading'
ORDER BY startDate DESC
LIMIT 50;

-- M2 DELETE: delete 100 low-rating logs (rating<=2)
DELETE FROM read_history
WHERE id IN (
  SELECT id FROM (
    SELECT id
    FROM read_history
    WHERE userId=1 AND rating<=2
    ORDER BY createdAt DESC
    LIMIT 100
  ) t
);

-- M3 INSERT...SELECT: award Finished 400 Books (id=202)
INSERT IGNORE INTO achievements (id, name, description, criteria, icon, createdAt, updatedAt)
VALUES (202, 'Finished 400 Books', 'Auto-award when finished count reaches 400',
        JSON_OBJECT('type','finished_count','threshold',400), 'icon-202', NOW(), NOW());

INSERT INTO user_achievements (userId, achievementId, unlockedAt, createdAt, updatedAt)
SELECT 1, 202, NOW(), NOW(), NOW()
WHERE (SELECT COUNT(*) FROM user_books WHERE userId=1 AND status='finished') >= 400
  AND NOT EXISTS (
    SELECT 1 FROM user_achievements WHERE userId=1 AND achievementId=202
  );

-- =========================
-- Final row counts
-- =========================

SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'books', COUNT(*) FROM books
UNION ALL SELECT 'user_books', COUNT(*) FROM user_books
UNION ALL SELECT 'read_history', COUNT(*) FROM read_history
UNION ALL SELECT 'achievements', COUNT(*) FROM achievements
UNION ALL SELECT 'user_achievements', COUNT(*) FROM user_achievements;
