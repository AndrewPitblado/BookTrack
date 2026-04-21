const express = require("express");
const auth = require("../middleware/auth");
const { Goal } = require("../models");

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

    res.json({ goals });
  } catch (error) {
    console.error("Get goals error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/goals
router.post("/", auth, async (req, res) => {
  try {
    const { type, metric, target, isActive } = req.body;

    if (!VALID_TYPES.includes(type)) {
      return res
        .status(400)
        .json({ message: `type must be one of: ${VALID_TYPES.join(", ")}` });
    }

    if (!VALID_METRICS.includes(metric)) {
      return res
        .status(400)
        .json({ message: `metric must be one of: ${VALID_METRICS.join(", ")}` });
    }

    const parsedTarget = asPositiveInt(target);
    if (!parsedTarget) {
      return res.status(400).json({ message: "target must be a positive integer" });
    }

    const goal = await Goal.create({
      userId: req.userId,
      type,
      metric,
      target: parsedTarget,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
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

    const goal = await Goal.findOne({ where: { id: goalId, userId: req.userId } });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const { type, metric, target, isActive } = req.body;

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
        return res
          .status(400)
          .json({ message: `metric must be one of: ${VALID_METRICS.join(", ")}` });
      }
      goal.metric = metric;
    }

    if (target !== undefined) {
      const parsedTarget = asPositiveInt(target);
      if (!parsedTarget) {
        return res.status(400).json({ message: "target must be a positive integer" });
      }
      goal.target = parsedTarget;
    }

    if (isActive !== undefined) {
      goal.isActive = Boolean(isActive);
    }

    await goal.save();

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

    const goal = await Goal.findOne({ where: { id: goalId, userId: req.userId } });
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
