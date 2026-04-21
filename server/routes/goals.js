const express = require("express");
const { Op } = require("sequelize");
const auth = require("../middleware/auth");
const { Goal, ReadingLog, ReadHistory } = require("../models");

const router = express.Router();

const VALID_TYPES = ["daily", "weekly", "monthly", "yearly"];
const VALID_METRICS = ["pages", "books"];

function asPositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseOptionalBoolean(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value === 0 || value === "0" || value === "false") {
    return false;
  }
  return null;
}

function getPeriodBounds(type, referenceDate = new Date()) {
  const now = new Date(referenceDate);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  let start;
  let end;

  if (type === "daily") {
    start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  } else if (type === "weekly") {
    const dayOfWeek = now.getUTCDay(); // 0=Sun ... 6=Sat
    const diffFromMonday = (dayOfWeek + 6) % 7;
    start = new Date(Date.UTC(year, month, day - diffFromMonday, 0, 0, 0, 0));
    end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
  } else if (type === "monthly") {
    start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  } else {
    start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  }

  return { start, end };
}

async function calculateGoalProgress(goal) {
  const { start, end } = getPeriodBounds(goal.type);

  let currentValue = 0;

  if (goal.metric === "pages") {
    const pageTotal = await ReadingLog.sum("pagesRead", {
      where: {
        userId: goal.userId,
        loggedAt: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      },
    });

    currentValue = Number(pageTotal) || 0;
  } else if (goal.metric === "books") {
    currentValue = await ReadHistory.count({
      where: {
        userId: goal.userId,
        endDate: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      },
    });
  }

  const target = Number(goal.target) || 0;
  const percentComplete =
    target > 0 ? Math.min((currentValue / target) * 100, 100) : 0;

  return {
    currentValue,
    target,
    remaining: Math.max(target - currentValue, 0),
    isComplete: currentValue >= target,
    percentComplete: Number(percentComplete.toFixed(2)),
    periodStart: start,
    periodEnd: end,
  };
}

// GET /api/goals?activeOnly=true
router.get("/", auth, async (req, res) => {
  try {
    const { activeOnly } = req.query;

    const where = { userId: req.userId };

    if (activeOnly === "true") {
      where.isActive = true;
    }

    const goals = await Goal.findAll({
      where,
      order: [["createdAt", "ASC"]],
    });

    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const progress = await calculateGoalProgress(goal);
        return {
          ...goal.toJSON(),
          progress,
        };
      }),
    );

    res.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error("Get goals error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/goals
router.post("/", auth, async (req, res) => {
  try {
    const { type, metric, target, isActive, isPrimary } = req.body;

    if (!VALID_TYPES.includes(type)) {
      return res
        .status(400)
        .json({ message: `type must be one of: ${VALID_TYPES.join(", ")}` });
    }

    if (!VALID_METRICS.includes(metric)) {
      return res.status(400).json({
        message: `metric must be one of: ${VALID_METRICS.join(", ")}`,
      });
    }

    const parsedTarget = asPositiveInt(target);
    if (!parsedTarget) {
      return res
        .status(400)
        .json({ message: "target must be a positive integer" });
    }

    const parsedIsActive = parseOptionalBoolean(isActive);
    if (parsedIsActive === null) {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    const parsedIsPrimary = parseOptionalBoolean(isPrimary);
    if (parsedIsPrimary === null) {
      return res.status(400).json({ message: "isPrimary must be a boolean" });
    }

    const goal = await Goal.sequelize.transaction(async (transaction) => {
      const createdGoal = await Goal.create(
        {
          userId: req.userId,
          type,
          metric,
          target: parsedTarget,
          isActive: parsedIsActive !== undefined ? parsedIsActive : true,
          isPrimary: parsedIsPrimary !== undefined ? parsedIsPrimary : false,
        },
        { transaction },
      );

      if (createdGoal.isPrimary) {
        await Goal.update(
          { isPrimary: false },
          {
            where: {
              userId: req.userId,
              id: { [Op.ne]: createdGoal.id },
            },
            transaction,
          },
        );
      }

      return createdGoal;
    });

    res.status(201).json({ goal, message: "Goal created successfully" });
  } catch (error) {
    console.error("Create goal error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/goals/:id
router.put("/:id", auth, async (req, res) => {
  try {
    const goalId = asPositiveInt(req.params.id);
    if (!goalId) {
      return res.status(400).json({ message: "Invalid goal id" });
    }

    const goal = await Goal.findOne({
      where: { id: goalId, userId: req.userId },
    });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const { type, metric, target, isActive, isPrimary } = req.body;
    const parsedIsActive = parseOptionalBoolean(isActive);
    if (parsedIsActive === null) {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    const parsedIsPrimary = parseOptionalBoolean(isPrimary);
    if (parsedIsPrimary === null) {
      return res.status(400).json({ message: "isPrimary must be a boolean" });
    }

    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return res
          .status(400)
          .json({ message: `type must be one of: ${VALID_TYPES.join(", ")}` });
      }
      goal.type = type;
    }

    if (metric !== undefined) {
      if (!VALID_METRICS.includes(metric)) {
        return res.status(400).json({
          message: `metric must be one of: ${VALID_METRICS.join(", ")}`,
        });
      }
      goal.metric = metric;
    }

    if (target !== undefined) {
      const parsedTarget = asPositiveInt(target);
      if (!parsedTarget) {
        return res
          .status(400)
          .json({ message: "target must be a positive integer" });
      }
      goal.target = parsedTarget;
    }

    if (parsedIsActive !== undefined) {
      goal.isActive = parsedIsActive;
    }

    if (parsedIsPrimary !== undefined) {
      goal.isPrimary = parsedIsPrimary;
    }

    await Goal.sequelize.transaction(async (transaction) => {
      await goal.save({ transaction });

      if (goal.isPrimary) {
        await Goal.update(
          { isPrimary: false },
          {
            where: {
              userId: req.userId,
              id: { [Op.ne]: goal.id },
            },
            transaction,
          },
        );
      }
    });

    res.json({ goal, message: "Goal updated successfully" });
  } catch (error) {
    console.error("Update goal error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/goals/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const goalId = asPositiveInt(req.params.id);
    if (!goalId) {
      return res.status(400).json({ message: "Invalid goal id" });
    }

    const goal = await Goal.findOne({
      where: { id: goalId, userId: req.userId },
    });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    await goal.destroy();

    res.json({ message: "Goal deleted successfully" });
  } catch (error) {
    console.error("Delete goal error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
