import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './Movies.css';

function Shows() {
  const { user } = useAuth();
  const [shows, setShows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState(null);
  const [showDetails, setShowDetails] = useState(null);

  useEffect(() => {
    fetchShows();
  }, []);

  const fetchShows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shows`);
      const data = await res.json();
      if (data.Response === 'True') {
        setShows(data.Search || []);
      }
    } catch (e) {
      console.error('Failed to fetch shows:', e);
    }
    setLoading(false);
  };

  const searchShows = async () => {
    if (!searchQuery.trim()) {
      fetchShows();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shows/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setShows(data.Search || []);
      } else {
        setShows([]);
      }
    } catch (e) {
      console.error('Failed to search shows:', e);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchShows();
    }
  };

  const handleShowSelect = async (show) => {
    setSelectedShow(show);
    setShowDetails(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shows/${show.imdbID}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setShowDetails(data);
      }
    } catch (e) {
      console.error('Failed to fetch show details:', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gold-gradient">📺 Browse TV Shows</h2>
        <p className="text-white/50 mt-2">Select a show to review</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 mb-8 max-w-2xl mx-auto">
        <input
          type="text"
          placeholder="Search TV shows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="input flex-1"
        />
        <button onClick={searchShows} className="btn btn-primary">
          Search
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl crown-animate inline-block">👑</div>
          <p className="text-yellow-400 mt-4">Loading shows...</p>
        </div>
      )}

      {/* Shows Grid */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
          {shows.length > 0 ? (
            shows.map(show => (
              <div
                key={show.imdbID}
                className="card cursor-pointer overflow-hidden group"
                onClick={() => handleShowSelect(show)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={show.Poster !== 'N/A' ? show.Poster : 'https://via.placeholder.com/200x300?text=No+Poster'}
                    alt={show.Title}
                    className="w-full h-56 sm:h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-3">
                  <h4 className="text-white font-semibold text-sm truncate">{show.Title}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-white/50 text-xs">{show.Year}</span>
                    {show.imdbRating && (
                      <span className="text-yellow-400 text-xs font-medium">⭐ {show.imdbRating}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-white/50 text-lg">No shows found</p>
              <p className="text-white/30 text-sm mt-2">Try searching for something else</p>
            </div>
          )}
        </div>
      )}

      {/* Show Detail Modal */}
      {selectedShow && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => { setSelectedShow(null); setShowDetails(null); }}
        >
          <div
            className="glass max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-3xl gold-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-all hover:rotate-90 duration-300"
              onClick={() => { setSelectedShow(null); setShowDetails(null); }}
            >
              ×
            </button>

            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
              <img
                src={selectedShow.Poster !== 'N/A' ? selectedShow.Poster : 'https://via.placeholder.com/280x420?text=No+Poster'}
                alt={selectedShow.Title}
                className="w-56 md:w-72 h-auto rounded-2xl shadow-2xl mx-auto md:mx-0"
              />

              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {selectedShow.Title} <span className="text-white/50">({selectedShow.Year})</span>
                </h3>

                <div className="flex flex-wrap gap-3 mb-4">
                  {(showDetails?.imdbRating || selectedShow.imdbRating) && (
                    <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">
                      ⭐ {showDetails?.imdbRating || selectedShow.imdbRating}/10
                    </span>
                  )}
                  {showDetails?.Genre && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                      {showDetails.Genre}
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-white/70">
                  {showDetails?.Director && (
                    <p><span className="text-yellow-400 font-medium">Director:</span> {showDetails.Director}</p>
                  )}
                  {showDetails?.Actors && (
                    <p><span className="text-yellow-400 font-medium">Actors:</span> {showDetails.Actors}</p>
                  )}
                </div>

                <p className="text-white/60 mt-4 leading-relaxed">
                  {showDetails?.Plot || selectedShow.Plot || 'No description available.'}
                </p>

                {user ? (
                  <Link
                    to={`/category/shows/new?title=${encodeURIComponent(selectedShow.Title)}&description=${encodeURIComponent(showDetails?.Plot || '')}`}
                    className="btn btn-primary mt-6 inline-flex"
                  >
                    ✍️ Write a Review
                  </Link>
                ) : (
                  <Link to="/login" className="btn btn-primary mt-6 inline-flex">
                    Login to Review
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Shows;