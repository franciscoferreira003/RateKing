import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ReviewList from './components/ReviewList';
import ReviewForm from './components/ReviewForm';
import Search from './components/Search';
import Login from './components/Login';
import Register from './components/Register';
import Admin from './components/Admin';
import UsersManagement from './components/UsersManagement';
import Media from './components/Media';
import MovieForm from './components/MovieForm';
import Profile from './components/Profile';
import API_BASE_URL from './config';
import './App.css';

const categories = ['movies', 'songs', 'videogames', 'shows'];

function Header() {
  const { user, logout } = useAuth();
  const [allReviews, setAllReviews] = useState({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reviews`)
      .then(res => res.json())
      .then(data => setAllReviews(data));
  }, []);

  const getTotalReviews = () => {
    return Object.values(allReviews).reduce((sum, arr) => sum + arr.length, 0);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <span className="text-2xl group-hover:scale-110 transition-transform duration-300">👑</span>
          <span className="text-lg font-bold text-gold-gradient">RateKing</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <Link to="/" className="px-3 py-1.5 rounded-full text-sm font-medium text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all">
            📝 Reviews
          </Link>
          <Link to="/media" className="px-3 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
            🎬 Movies & Shows
          </Link>
          <Link to="/category/songs" className="px-3 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
            🎵 Songs
          </Link>
          <Link to="/category/videogames" className="px-3 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
            🎮 Games
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="px-2 py-1 rounded-full text-xs bg-white/5 text-yellow-400 border border-yellow-500/20">
            {getTotalReviews()} reviews
          </span>

          {user && (
            <Link to="/category/movies/new" className="btn btn-primary text-xs py-1.5 px-3">
              ✍️ New
            </Link>
          )}

          {user && user.isAdmin && (
            <>
              <Link to="/users" className="btn btn-secondary text-xs py-1.5 px-3">
                👥
              </Link>
              <Link to="/admin" className="btn btn-secondary text-xs py-1.5 px-3">
                🛡️
              </Link>
            </>
          )}

          {user ? (
            <>
              <Link
                to={user.id ? `/profile/${user.id}` : '#'}
                className="flex items-center gap-2 btn btn-secondary text-xs py-1.5 px-3"
              >
                <div style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }} className="rounded-full overflow-hidden border border-yellow-500/50 flex-shrink-0">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture.startsWith('/uploads') ? `${API_BASE_URL}${user.profilePicture}` : user.profilePicture}
                      alt={user.username}
                      style={{ width: '24px', height: '24px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '24px', height: '24px' }} className="bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                      <svg style={{ width: '14px', height: '14px' }} className="text-white/60" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <span className="hidden sm:inline truncate max-w-[80px]">{user.username}</span>
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
        </div>
      </div>
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
      <div className="min-h-screen pt-20 px-4">
        <main className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<ReviewList category={null} allReviews={allReviews} />} />
            <Route path="/media" element={<Media />} />
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