import { useEffect, useState } from "react";
import api from "../services/api";
import "./Goals.css";

const TYPE_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const TYPE_ICONS = {
  daily: "📅",
  weekly: "🗓️",
  monthly: "📆",
  yearly: "🎯",
};

const METRIC_LABELS = {
  pages: "Pages",
  books: "Books",
};

const DEFAULT_FORM_STATE = {
  type: "weekly",
  metric: "pages",
  target: "7",
  isPrimary: false,
  isActive: true,
};

const getTzOffsetMinutes = () => -new Date().getTimezoneOffset();

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'active' | 'inactive'
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingGoalIds, setPendingGoalIds] = useState(() => new Set());

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await api.get("/goals", {
        params: { tzOffsetMinutes: getTzOffsetMinutes() },
      });
      setGoals(response.data.goals || []);
      setLoadError("");
    } catch (error) {
      console.error("Error fetching goals:", error);
      setLoadError("Failed to load goals.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingGoal(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (goal) => {
    setEditingGoal(goal);
    setFormState({
      type: goal.type,
      metric: goal.metric,
      target: String(goal.target),
      isPrimary: goal.isPrimary,
      isActive: goal.isActive,
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingGoal(null);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const parsedTarget = Number(formState.target);
    if (!Number.isInteger(parsedTarget) || parsedTarget <= 0) {
      setFormError("Target must be a positive whole number.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: formState.type,
        metric: formState.metric,
        target: parsedTarget,
        isPrimary: formState.isPrimary,
        isActive: formState.isActive,
      };

      if (editingGoal) {
        await api.put(`/goals/${editingGoal.id}`, payload);
      } else {
        await api.post("/goals", payload);
      }

      await fetchGoals();
      closeForm();
    } catch (error) {
      console.error("Error saving goal:", error);
      setFormError(
        error.response?.data?.message || "Failed to save goal. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePrimary = async (goal) => {
    if (pendingGoalIds.has(goal.id)) return;

    const nextIsPrimary = !goal.isPrimary;

    // Optimistically enforce the single-primary invariant locally so the star
    // reflects the change instantly, instead of waiting on a refetch that can
    // race with the next click.
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goal.id) return { ...g, isPrimary: nextIsPrimary };
        return nextIsPrimary ? { ...g, isPrimary: false } : g;
      }),
    );
    setPendingGoalIds((prev) => new Set(prev).add(goal.id));

    try {
      await api.put(`/goals/${goal.id}`, { isPrimary: nextIsPrimary });
      await fetchGoals();
    } catch (error) {
      console.error("Error updating primary goal:", error);
      await fetchGoals(); // revert to server truth on failure
    } finally {
      setPendingGoalIds((prev) => {
        const next = new Set(prev);
        next.delete(goal.id);
        return next;
      });
    }
  };

  const toggleActive = async (goal) => {
    if (pendingGoalIds.has(goal.id)) return;

    setPendingGoalIds((prev) => new Set(prev).add(goal.id));
    try {
      await api.put(`/goals/${goal.id}`, { isActive: !goal.isActive });
      await fetchGoals();
    } catch (error) {
      console.error("Error updating goal status:", error);
    } finally {
      setPendingGoalIds((prev) => {
        const next = new Set(prev);
        next.delete(goal.id);
        return next;
      });
    }
  };

  const handleDelete = async (goal) => {
    const label = `${TYPE_LABELS[goal.type]} ${METRIC_LABELS[goal.metric]} goal`;
    if (!window.confirm(`Delete this ${label}? This can't be undone.`)) {
      return;
    }

    try {
      await api.delete(`/goals/${goal.id}`);
      await fetchGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const activeCount = goals.filter((g) => g.isActive).length;
  const inactiveCount = goals.length - activeCount;

  const filteredGoals = goals.filter((goal) => {
    if (filterStatus === "active") return goal.isActive;
    if (filterStatus === "inactive") return !goal.isActive;
    return true;
  });

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="goals">
      <div className="goals-header">
        <div>
          <h1>Reading Goals</h1>
          <p className="goals-summary">
            {activeCount} active goal{activeCount === 1 ? "" : "s"}
            {inactiveCount > 0 && ` · ${inactiveCount} paused`}
          </p>
        </div>
        <button type="button" onClick={openCreateForm}>
          + New Goal
        </button>
      </div>

      {loadError && <p className="goals-error">{loadError}</p>}

      {showForm && (
        <div className="goal-form-card">
          <h2>{editingGoal ? "Edit Goal" : "New Goal"}</h2>
          <form onSubmit={handleSubmit} className="goal-form">
            <div className="form-row">
              <label htmlFor="goal-type">Period</label>
              <select
                id="goal-type"
                value={formState.type}
                onChange={(e) =>
                  setFormState({ ...formState, type: e.target.value })
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="goal-metric">Metric</label>
              <select
                id="goal-metric"
                value={formState.metric}
                onChange={(e) =>
                  setFormState({ ...formState, metric: e.target.value })
                }
              >
                <option value="pages">Pages Read</option>
                <option value="books">Books Finished</option>
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="goal-target">Target</label>
              <input
                id="goal-target"
                type="number"
                min="1"
                step="1"
                value={formState.target}
                onChange={(e) =>
                  setFormState({ ...formState, target: e.target.value })
                }
                required
              />
            </div>

            <div className="form-row form-row-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formState.isPrimary}
                  onChange={(e) =>
                    setFormState({ ...formState, isPrimary: e.target.checked })
                  }
                />
                Set as primary goal (shown on Dashboard)
              </label>
            </div>

            {editingGoal && (
              <div className="form-row form-row-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(e) =>
                      setFormState({ ...formState, isActive: e.target.checked })
                    }
                  />
                  Active
                </label>
              </div>
            )}

            {formError && <p className="form-error">{formError}</p>}

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingGoal
                    ? "Save Changes"
                    : "Create Goal"}
              </button>
              <button type="button" className="btn-cancel" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-tabs">
        <button
          type="button"
          className={filterStatus === "all" ? "active" : ""}
          onClick={() => setFilterStatus("all")}
        >
          All ({goals.length})
        </button>
        <button
          type="button"
          className={filterStatus === "active" ? "active" : ""}
          onClick={() => setFilterStatus("active")}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          className={filterStatus === "inactive" ? "active" : ""}
          onClick={() => setFilterStatus("inactive")}
        >
          Paused ({inactiveCount})
        </button>
      </div>

      {filteredGoals.length === 0 ? (
        <p className="no-goals">
          No goals yet. Create one to start tracking your reading pace!
        </p>
      ) : (
        <div className="goals-grid">
          {filteredGoals.map((goal) => (
            <div
              key={goal.id}
              className={`goal-card ${goal.isPrimary ? "primary" : ""} ${
                !goal.isActive ? "inactive" : ""
              } ${goal.progress.isComplete ? "complete" : ""}`}
            >
              <div className="goal-card-header">
                <div className="goal-title">
                  <span className="goal-type-icon">
                    {TYPE_ICONS[goal.type]}
                  </span>
                  <h3>
                    {TYPE_LABELS[goal.type]} {METRIC_LABELS[goal.metric]} Goal
                  </h3>
                </div>
                <button
                  type="button"
                  className={`star-btn ${goal.isPrimary ? "active" : ""}`}
                  onClick={() => togglePrimary(goal)}
                  disabled={pendingGoalIds.has(goal.id)}
                  aria-label={
                    goal.isPrimary
                      ? "Unset as primary goal"
                      : "Set as primary goal"
                  }
                  title={
                    goal.isPrimary
                      ? "Primary goal"
                      : "Set as primary goal"
                  }
                >
                  {goal.isPrimary ? "★" : "☆"}
                </button>
              </div>

              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${goal.progress.percentComplete}%`,
                      background: goal.progress.isComplete
                        ? "#27ae60"
                        : "#3498db",
                    }}
                  />
                </div>
                <p className="progress-text">
                  {goal.progress.currentValue} / {goal.progress.target}{" "}
                  {METRIC_LABELS[goal.metric].toLowerCase()} (
                  {goal.progress.percentComplete}%)
                </p>
              </div>

              {goal.progress.isComplete ? (
                <p className="goal-complete-badge">✅ Goal complete!</p>
              ) : (
                <p className="goal-remaining">
                  {goal.progress.remaining} {METRIC_LABELS[goal.metric].toLowerCase()} to go
                </p>
              )}

              <p className="goal-period">
                Ends {new Date(goal.progress.periodEnd).toLocaleDateString()}
              </p>

              {!goal.isActive && (
                <span className="goal-inactive-badge">Paused</span>
              )}

              <div className="goal-card-actions">
                <button type="button" onClick={() => openEditForm(goal)}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(goal)}
                  disabled={pendingGoalIds.has(goal.id)}
                >
                  {goal.isActive ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  className="btn-delete"
                  onClick={() => handleDelete(goal)}
                  disabled={pendingGoalIds.has(goal.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Goals;
