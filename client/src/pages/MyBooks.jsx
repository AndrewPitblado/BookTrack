import { useState, useEffect } from "react";
import api from "../services/api";
import "./MyBooks.css";

const MyBooks = () => {
  const [userBooks, setUserBooks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [hoverRatings, setHoverRatings] = useState({});
  const [pendingProgressIds, setPendingProgressIds] = useState(() => new Set());
  const [pageDrafts, setPageDrafts] = useState({});

  const formatRating = (value) => {
    if (!Number.isFinite(value)) return "0";
    return Number.isInteger(value) ? String(value) : String(value.toFixed(1));
  };

  useEffect(() => {
    fetchUserBooks();
  }, []);

  const fetchUserBooks = async () => {
    try {
      const response = await api.get("/user-books");
      setUserBooks(response.data.userBooks);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/user-books/${id}`, { status: newStatus });
      fetchUserBooks(); // Refresh list
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const updateProgress = async (id, currentPage) => {
    const parsedPage = parseInt(currentPage, 10);
    if (!Number.isInteger(parsedPage) || parsedPage < 0) return;

    // Guard against overlapping requests for the same book, which can race
    // on the server and cause pages to be double-logged.
    if (pendingProgressIds.has(id)) return;

    setPendingProgressIds((prev) => new Set(prev).add(id));
    try {
      await api.put(`/user-books/${id}`, {
        currentPage: parsedPage,
      });
      // Update local state
      setUserBooks((prev) =>
        prev.map((book) =>
          book.id === id ? { ...book, currentPage: parsedPage } : book,
        ),
      );
    } catch (error) {
      console.error("Error updating progress:", error);
    } finally {
      setPendingProgressIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setPageDrafts((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const commitPageDraft = (id, rawValue, pageCount) => {
    if (rawValue === "" || rawValue === undefined) {
      setPageDrafts((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    const parsedPage = parseInt(rawValue, 10);
    if (!Number.isInteger(parsedPage)) {
      setPageDrafts((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    const clampedPage = Math.max(0, Math.min(pageCount, parsedPage));
    updateProgress(id, clampedPage);
  };

  const updateRatingAndNotes = async (id, rating, notes) => {
    try {
      await api.put(`/user-books/${id}`, { rating, notes });
      // Update local state
      setUserBooks(
        userBooks.map((book) =>
          book.id === id ? { ...book, rating, notes } : book,
        ),
      );
    } catch (error) {
      console.error("Error updating rating/notes:", error);
    }
  };

  const getRatingFromPointer = (starNumber, event) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const pointerPosition = event.clientX - left;
    const isLeftHalf = pointerPosition < width / 2;
    return isLeftHalf ? starNumber - 0.5 : starNumber;
  };

  const handleStarMove = (id, starNumber, event) => {
    const previewRating = getRatingFromPointer(starNumber, event);
    setHoverRatings((prev) =>
      prev[id] === previewRating ? prev : { ...prev, [id]: previewRating },
    );

    const dynamicLabel = `Set rating to ${formatRating(previewRating)} stars`;
    event.currentTarget.title = dynamicLabel;
    event.currentTarget.setAttribute("aria-label", dynamicLabel);
  };

  const clearStarHover = (id) => {
    setHoverRatings((prev) => {
      if (prev[id] === undefined) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleStarClick = (id, starNumber, event, notes) => {
    const nextRating = getRatingFromPointer(starNumber, event);
    updateRatingAndNotes(id, nextRating, notes);
  };

  const removeBook = async (id) => {
    if (!window.confirm("Remove this book from your list?")) return;

    try {
      await api.delete(`/user-books/${id}`);
      setUserBooks(userBooks.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Error removing book:", error);
    }
  };

  const filteredBooks =
    filter === "all" ? userBooks : userBooks.filter((b) => b.status === filter);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const updateStartDate = async (id, startDate) => {
    try {
      await api.put(`/user-books/${id}`, { startDate });

      // Optimistic local update
      setUserBooks((prev) =>
        prev.map((book) => (book.id === id ? { ...book, startDate } : book)),
      );
    } catch (error) {
      console.error("Error updating start date:", error);
    }
  };

  const updateEndDate = async (id, endDate) => {
    try {
      await api.put(`/user-books/${id}`, { endDate });

      // Optimistic local update
      setUserBooks((prev) =>
        prev.map((book) => (book.id === id ? { ...book, endDate } : book)),
      );
    } catch (error) {
      console.error("Error updating end date:", error);
    }
  };

  return (
    <div className="my-books">
      <h1>My Books</h1>

      <div className="filter-tabs">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All ({userBooks.length})
        </button>
        <button
          className={filter === "reading" ? "active" : ""}
          onClick={() => setFilter("reading")}
        >
          Reading ({userBooks.filter((b) => b.status === "reading").length})
        </button>
        <button
          className={filter === "finished" ? "active" : ""}
          onClick={() => setFilter("finished")}
        >
          Finished ({userBooks.filter((b) => b.status === "finished").length})
        </button>
        <button
          className={filter === "dropped" ? "active" : ""}
          onClick={() => setFilter("dropped")}
        >
          Dropped ({userBooks.filter((b) => b.status === "dropped").length})
        </button>
      </div>

      {filteredBooks.length === 0 ? (
        <p className="no-books">No books in this category.</p>
      ) : (
        <div className="books-grid">
          {filteredBooks.map((userBook) => (
            <div key={userBook.id} className="book-card">
              {userBook.Book?.thumbnail && (
                <img src={userBook.Book.thumbnail} alt={userBook.Book.title} />
              )}
              <div className="book-info">
                <h3>{userBook.Book?.title}</h3>
                <p className="authors">
                  {userBook.Book?.authors?.map((a) => a.name).join(", ") ||
                    "Unknown Author"}
                </p>
                <p className="dates">
                  Started:{" "}
                  <input
                    type="date"
                    value={
                      userBook.startDate ? userBook.startDate.slice(0, 10) : ""
                    }
                    onChange={(e) =>
                      updateStartDate(userBook.id, e.target.value)
                    }
                  />
                </p>
                <p className="dates">
                  Finished:{" "}
                  <input
                    type="date"
                    value={
                      userBook.endDate ? userBook.endDate.slice(0, 10) : ""
                    }
                    onChange={(e) => updateEndDate(userBook.id, e.target.value)}
                  />
                </p>

                {userBook.status === "reading" && userBook.Book?.pageCount && (
                  <div className="progress-section">
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(((userBook.currentPage || 0) / userBook.Book.pageCount) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="progress-input">
                      <label htmlFor={`page-${userBook.id}`}>Page:</label>
                      <div className="page-control">
                        <button
                          className="page-btn page-decrement"
                          onClick={() => {
                            const newPage = Math.max(
                              0,
                              (userBook.currentPage || 0) - 1,
                            );
                            updateProgress(userBook.id, newPage);
                          }}
                          disabled={
                            (userBook.currentPage || 0) === 0 ||
                            pendingProgressIds.has(userBook.id)
                          }
                        >
                          −
                        </button>
                        <input
                          id={`page-${userBook.id}`}
                          type="number"
                          min="0"
                          max={userBook.Book.pageCount}
                          value={
                            pageDrafts[userBook.id] ??
                            (userBook.currentPage || 0)
                          }
                          onChange={(e) =>
                            setPageDrafts((prev) => ({
                              ...prev,
                              [userBook.id]: e.target.value,
                            }))
                          }
                          onBlur={(e) =>
                            commitPageDraft(
                              userBook.id,
                              e.target.value,
                              userBook.Book.pageCount,
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          disabled={pendingProgressIds.has(userBook.id)}
                        />
                        <button
                          className="page-btn page-increment"
                          onClick={() => {
                            const newPage = Math.min(
                              userBook.Book.pageCount,
                              (userBook.currentPage || 0) + 1,
                            );
                            updateProgress(userBook.id, newPage);
                          }}
                          disabled={
                            (userBook.currentPage || 0) >=
                              userBook.Book.pageCount ||
                            pendingProgressIds.has(userBook.id)
                          }
                        >
                          +
                        </button>
                      </div>
                      <span>/ {userBook.Book.pageCount}</span>
                    </div>
                  </div>
                )}

                {userBook.status === "finished" && (
                  <div className="rating-section">
                    <div className="rating-stars">
                      <label>Rating:</label>
                      <div
                        className="stars"
                        onMouseLeave={() => clearStarHover(userBook.id)}
                      >
                        {[1, 2, 3, 4, 5].map((starNumber) => {
                          const ratingValue =
                            hoverRatings[userBook.id] ?? (userBook.rating || 0);
                          const fillPercent =
                            Math.max(
                              0,
                              Math.min(1, ratingValue - (starNumber - 1)),
                            ) * 100;

                          return (
                            <button
                              key={starNumber}
                              type="button"
                              className="star-button"
                              style={{ "--fill-percent": `${fillPercent}%` }}
                              onMouseMove={(event) =>
                                handleStarMove(userBook.id, starNumber, event)
                              }
                              onClick={(event) =>
                                handleStarClick(
                                  userBook.id,
                                  starNumber,
                                  event,
                                  userBook.notes,
                                )
                              }
                              aria-label={`Set rating to ${formatRating(userBook.rating || 0)} stars`}
                              title={`Set rating to ${formatRating(userBook.rating || 0)} stars`}
                            >
                              <span className="star-empty">★</span>
                              <span className="star-filled">★</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="notes-section">
                      <label htmlFor={`notes-${userBook.id}`}>Notes:</label>
                      <textarea
                        id={`notes-${userBook.id}`}
                        placeholder="Add your thoughts about this book..."
                        value={userBook.notes || ""}
                        onChange={(e) =>
                          setUserBooks(
                            userBooks.map((book) =>
                              book.id === userBook.id
                                ? { ...book, notes: e.target.value }
                                : book,
                            ),
                          )
                        }
                        onBlur={(e) =>
                          updateRatingAndNotes(
                            userBook.id,
                            userBook.rating,
                            e.target.value,
                          )
                        }
                        rows="3"
                      />
                    </div>
                  </div>
                )}

                <div className="book-actions">
                  <select
                    value={userBook.status}
                    onChange={(e) => updateStatus(userBook.id, e.target.value)}
                  >
                    <option value="reading">Reading</option>
                    <option value="finished">Finished</option>
                    <option value="dropped">Dropped</option>
                  </select>
                  <button
                    onClick={() => removeBook(userBook.id)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBooks;
