import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <div className="navbar-brand">
          <Link to="/" onClick={closeMenu}>
            📚 BookTrack
          </Link>
        </div>

        <button
          type="button"
          className={`navbar-toggle ${isMenuOpen ? "is-open" : ""}`}
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="navbar-menu"
        >
          {isMenuOpen ? "Hide" : "Menu"}
        </button>
      </div>

      <div
        id="navbar-menu"
        className={`navbar-menu ${isMenuOpen ? "is-open" : ""}`}
      >
        {user ? (
          <>
            <Link to="/dashboard" onClick={closeMenu}>
              Dashboard
            </Link>
            <Link to="/my-books" onClick={closeMenu}>
              My Books
            </Link>
            <Link to="/search" onClick={closeMenu}>
              Search
            </Link>
            <Link to="/achievements" onClick={closeMenu}>
              Achievements
            </Link>
            <Link to="/goals" onClick={closeMenu}>
              Goals
            </Link>
            <Link to="/friends" onClick={closeMenu}>
              Friends
            </Link>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={closeMenu}>
              Login
            </Link>
            <Link to="/register" onClick={closeMenu}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
