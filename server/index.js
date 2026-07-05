require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { DataTypes } = require("sequelize");
const { sequelize } = require("./models");
const { seedAchievements } = require("./seedAchievements");
const { convertIcons } = require("./convertIcons");
const {
  backfillReadingLogsFromCurrentProgress,
} = require("./services/readingLogBackfillService");

// Import routes
const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");
const userBookRoutes = require("./routes/userBooks");
const readingLogRoutes = require("./routes/readingLogs");
const userRoutes = require("./routes/users");
const achievementRoutes = require("./routes/achievements");
const friendRoutes = require("./routes/friends");
const deviceTokenRoutes = require("./routes/deviceTokens");
const goalRoutes = require("./routes/goals");

const app = express();

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  }),
);
app.use(express.json());

// Serve static assets (achievement icons, etc.)
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/user-books", userBookRoutes);
app.use("/api/reading-logs", readingLogRoutes);
app.use("/api/users", userRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/device-tokens", deviceTokenRoutes);
app.use("/api/goals", goalRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "BookTrack API is running" });
});

const PORT = process.env.PORT || 5001;
const syncOptions =
  process.env.NODE_ENV === "production" ? {} : { alter: false };
const autoSeedAchievements = process.env.AUTO_SEED_ACHIEVEMENTS !== "false";
const autoBackfillReadingLogs =
  process.env.AUTO_BACKFILL_READING_LOGS !== "false";

async function ensureGoalSchema() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable("goals");

    if (!table.isPrimary) {
      await queryInterface.addColumn("goals", "isPrimary", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log("Added missing goals.isPrimary column");
    }
  } catch (error) {
    console.error("Goal schema check failed:", error);
  }
}

async function ensurePasswordResetSchema() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable("users");

    if (!table.resetPasswordToken) {
      await queryInterface.addColumn("users", "resetPasswordToken", {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
      console.log("Added missing users.resetPasswordToken column");
    }

    if (!table.resetPasswordExpires) {
      await queryInterface.addColumn("users", "resetPasswordExpires", {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log("Added missing users.resetPasswordExpires column");
    }
  } catch (error) {
    console.error("Password reset schema check failed:", error);
  }
}

async function ensureUserAvatarSchema() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable("users");

    if (!table.avatarUrl) {
      await queryInterface.addColumn("users", "avatarUrl", {
        type: DataTypes.STRING(2048),
        allowNull: true,
      });
      console.log("Added missing users.avatarUrl column");
    }

    if (!table.avatarId) {
      await queryInterface.addColumn("users", "avatarId", {
        type: DataTypes.STRING(64),
        allowNull: true,
      });
      console.log("Added missing users.avatarId column");
    }
  } catch (error) {
    console.error("User avatar schema check failed:", error);
  }
}

async function startServer() {
  try {
    await sequelize.sync(syncOptions);
    await ensureGoalSchema();
    await ensureUserAvatarSchema();
    await ensurePasswordResetSchema();
    console.log("Database synced successfully");

    // Convert SVG achievement icons to PNGs for iOS
    try {
      await convertIcons();
    } catch (iconError) {
      console.error("Icon conversion failed:", iconError);
    }

    if (autoBackfillReadingLogs) {
      try {
        const result = await backfillReadingLogsFromCurrentProgress();
        console.log(
          `Reading-log backfill complete (scanned=${result.scanned}, created=${result.created}, skippedExisting=${result.skippedExisting})`,
        );
      } catch (backfillError) {
        console.error("Reading-log backfill failed:", backfillError);
      }
    } else {
      console.log(
        "Reading-log backfill skipped (AUTO_BACKFILL_READING_LOGS=false)",
      );
    }

    if (autoSeedAchievements) {
      try {
        await seedAchievements();
      } catch (seedError) {
        console.error("Achievement auto-seed failed:", seedError);
      }
    } else {
      console.log(
        "Achievement auto-seed skipped (AUTO_SEED_ACHIEVEMENTS=false)",
      );
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Unable to sync database:", err);
  }
}

startServer();
