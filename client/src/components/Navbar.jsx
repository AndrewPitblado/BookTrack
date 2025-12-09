import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">📚 BookTrack</Link>
      </div>
      
      {user ? (
        <div className="navbar-menu">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/my-books">My Books</Link>
          <Link to="/search">Search</Link>
          <Link to="/achievements">Achievements</Link>
          <Link to="/friends">Friends</Link>
          <span className="navbar-user">Hi, {user.username}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      ) : (
        <div className="navbar-menu">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
