import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './Movies.css';

function Movies() {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/movies');
      const data = await res.json();
      if (data.Response === 'True') {
        setMovies(data.Search || []);
      }
    } catch (e) {
      console.error('Failed to fetch movies:', e);
    }
    setLoading(false);
  };

  const searchMovies = async () => {
    if (!searchQuery.trim()) {
      fetchMovies();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/movies/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setMovies(data.Search || []);
      } else {
        setMovies([]);
      }
    } catch (e) {
      console.error('Failed to search movies:', e);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchMovies();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gold-gradient">🎬 Browse Movies</h2>
        <p className="text-white/50 mt-2">Select a movie to review</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 mb-8 max-w-2xl mx-auto">
        <input
          type="text"
          placeholder="Search movies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="input flex-1"
        />
        <button onClick={searchMovies} className="btn btn-primary">
          Search
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl crown-animate inline-block">👑</div>
          <p className="text-yellow-400 mt-4">Loading movies...</p>
        </div>
      )}

      {/* Movies Grid */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
          {movies.length > 0 ? (
            movies.map(movie => (
              <div
                key={movie.imdbID}
                className="card cursor-pointer overflow-hidden group"
                onClick={() => setSelectedMovie(movie)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/200x300?text=No+Poster'}
                    alt={movie.Title}
                    className="w-full h-56 sm:h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-3">
                  <h4 className="text-white font-semibold text-sm truncate">{movie.Title}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-white/50 text-xs">{movie.Year}</span>
                    {movie.imdbRating && (
                      <span className="text-yellow-400 text-xs font-medium">⭐ {movie.imdbRating}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-white/50 text-lg">No movies found</p>
              <p className="text-white/30 text-sm mt-2">Try searching for something else</p>
            </div>
          )}
        </div>
      )}

      {/* Movie Detail Modal */}
      {selectedMovie && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMovie(null)}
        >
          <div
            className="glass max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-3xl gold-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-all hover:rotate-90 duration-300"
              onClick={() => setSelectedMovie(null)}
            >
              ×
            </button>

            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
              <img
                src={selectedMovie.Poster !== 'N/A' ? selectedMovie.Poster : 'https://via.placeholder.com/280x420?text=No+Poster'}
                alt={selectedMovie.Title}
                className="w-56 md:w-72 h-auto rounded-2xl shadow-2xl mx-auto md:mx-0"
              />

              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {selectedMovie.Title} <span className="text-white/50">({selectedMovie.Year})</span>
                </h3>

                <div className="flex flex-wrap gap-3 mb-4">
                  {selectedMovie.imdbRating && (
                    <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">
                      ⭐ {selectedMovie.imdbRating}/10
                    </span>
                  )}
                  {selectedMovie.Genre && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                      {selectedMovie.Genre}
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-white/70">
                  {selectedMovie.Director && (
                    <p><span className="text-yellow-400 font-medium">Director:</span> {selectedMovie.Director}</p>
                  )}
                  {selectedMovie.Actors && (
                    <p><span className="text-yellow-400 font-medium">Actors:</span> {selectedMovie.Actors}</p>
                  )}
                </div>

                <p className="text-white/60 mt-4 leading-relaxed">
                  {selectedMovie.Plot || 'No description available.'}
                </p>

                {user ? (
                  <Link
                    to={`/category/movies/new?title=${encodeURIComponent(selectedMovie.Title)}&description=${encodeURIComponent(selectedMovie.Plot || '')}`}
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

export default Movies;