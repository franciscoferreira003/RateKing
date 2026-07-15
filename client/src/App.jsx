import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ReviewList from './components/ReviewList';
import ReviewForm from './components/ReviewForm';
import Search from './components/Search';
import Login from './components/Login';
import Register from './components/Register';
import Admin from './components/Admin';
import UsersManagement from './components/UsersManagement';
import Media from './components/Media';
import Songs from './components/Songs';
import VideoGames from './components/VideoGames';
import Comics from './components/Comics';
import Watchlist from './components/Watchlist';
import MovieForm from './components/MovieForm';
import Profile from './components/Profile';
import UserMessages from './components/UserMessages';
import API_BASE_URL from './config';
import './App.css';

const categories = ['movies', 'songs', 'videogames', 'shows', 'comics'];

function Header() {
  const { user, logout } = useAuth();
  const [allReviews, setAllReviews] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reviews`)
      .then(res => res.json())
      .then(data => setAllReviews(data));
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const getTotalReviews = () => {
    return Object.values(allReviews).reduce((sum, arr) => sum + arr.length, 0);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/category') || location.pathname.startsWith('/review');
    return location.pathname.startsWith(path);
  };

  const navLinks = (
    <>
      <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>📝 Reviews</Link>
      <Link to="/media" className={`nav-link ${isActive('/media') ? 'active' : ''}`}>🎬 Movies & Shows</Link>
      <Link to="/songs" className={`nav-link ${isActive('/songs') ? 'active' : ''}`}>🎵 Songs</Link>
      <Link to="/games" className={`nav-link ${isActive('/games') ? 'active' : ''}`}>🎮 Games</Link>
      <Link to="/comics" className={`nav-link ${isActive('/comics') ? 'active' : ''}`}>📚 Comics</Link>
      {user && (
        <Link to="/watchlist" className={`nav-link ${isActive('/watchlist') ? 'active' : ''}`}>📋 Lists</Link>
      )}
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 bg-black border-b border-yellow-500/20 z-50">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <span className="text-2xl group-hover:scale-110 transition-transform duration-300">👑</span>
          <span className="text-lg font-bold text-gold-gradient">RateKing</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline px-2 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            {getTotalReviews()} reviews
          </span>

          {user && (
            <Link to="/category/movies/new" className="btn btn-primary text-xs py-1.5 px-3">
              ✍️ New
            </Link>
          )}

          {user && user.isAdmin && (
            <>
              <Link to="/users" className="btn btn-secondary text-xs py-1.5 px-3" title="Users">
                👥
              </Link>
              <Link to="/admin" className="btn btn-secondary text-xs py-1.5 px-3" title="Admin">
                🛡️
              </Link>
            </>
          )}

          {user ? (
            <>
              <Link
                to={user.id ? `/profile/${user.id}` : '#'}
                className="profile-btn"
                title="Go to profile"
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.username}
                    className="profile-avatar"
                  />
                ) : (
                  <div className="profile-avatar flex items-center justify-center">
                    <svg style={{ width: '16px', height: '16px' }} fill="currentColor" viewBox="0 0 24 24" color="rgba(255,255,255,0.6)">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
                <span className="hidden lg:inline truncate max-w-[90px]">{user.username}</span>
              </Link>
              <button onClick={logout} className="btn btn-secondary text-xs py-1.5 px-3">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary text-xs py-1.5 px-3">Login</Link>
              <Link to="/register" className="btn btn-primary text-xs py-1.5 px-3">Register</Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="btn btn-secondary text-xs py-1.5 px-3 sm:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <nav className="sm:hidden flex flex-col gap-1 px-4 pb-3 pt-1 border-t border-yellow-500/10 bg-black">
          {navLinks}
        </nav>
      )}
    </header>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [allReviews, setAllReviews] = useState({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reviews`)
      .then(res => res.json())
      .then(data => setAllReviews(data));
  }, []);

  return (
    <>
      <Header />
      <div className="min-h-screen pt-28 px-4">
        <main className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<ReviewList category={null} allReviews={allReviews} />} />
            <Route path="/media" element={<Media />} />
            <Route path="/songs" element={<Songs />} />
            <Route path="/games" element={<VideoGames />} />
            <Route path="/comics" element={<Comics />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/movies/new" element={<MovieForm />} />
            <Route path="/category/:category" element={<ReviewList category={null} allReviews={allReviews} />} />
            <Route path="/category/:category/new" element={user ? <ReviewForm /> : <Login />} />
            <Route path="/review/:id/edit" element={user ? <ReviewForm /> : <Login />} />
            <Route path="/search" element={<Search />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/users" element={<UsersManagement />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
      <UserMessages />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;