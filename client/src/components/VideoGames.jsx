import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './Movies.css';

function VideoGames() {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameDetails, setGameDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/games`);
      const data = await res.json();
      if (data.Response === 'True') {
        setGames(data.results || []);
      } else if (data.needsApiKey) {
        setError('RAWG API key not configured. Please add RAWG_API_KEY to your environment variables.');
      } else {
        setError(data.Error || 'Failed to load games');
      }
    } catch (e) {
      console.error('Failed to fetch games:', e);
      setError('Failed to load games');
    }
    setLoading(false);
  };

  const searchGames = async () => {
    if (!searchQuery.trim()) {
      fetchGames();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/games/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setGames(data.results || []);
      } else {
        setGames([]);
        if (data.Error) {
          setError(data.Error);
        }
      }
    } catch (e) {
      console.error('Failed to search games:', e);
      setError('Failed to search games');
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchGames();
    }
  };

  const handleGameSelect = async (game) => {
    setSelectedGame(game);
    setGameDetails(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/games/${game.id}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setGameDetails(data);
      }
    } catch (e) {
      console.error('Failed to fetch game details:', e);
    }
  };

  const closeModal = () => {
    setSelectedGame(null);
    setGameDetails(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gold-gradient">🎮 Browse Games</h2>
        <p className="text-white/50 mt-2">Search for games to review</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 mb-8 max-w-2xl mx-auto">
        <input
          type="text"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="input flex-1"
        />
        <button onClick={searchGames} className="btn btn-primary">
          Search
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl crown-animate inline-block">👑</div>
          <p className="text-yellow-400 mt-4">Loading games...</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-12">
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl max-w-xl mx-auto">
            <p className="font-semibold mb-2">⚠️ Games Unavailable</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2 text-white/50">
              Get a free API key at{' '}
              <a href="https://rawg.io/apidocs" target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline">
                rawg.io/apidocs
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Games Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {games.length > 0 ? (
            games.map(game => (
              <div
                key={game.id}
                className="card cursor-pointer overflow-hidden group"
                onClick={() => handleGameSelect(game)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={game.poster || 'https://via.placeholder.com/200x300?text=No+Image'}
                    alt={game.title}
                    className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-3">
                  <h4 className="text-white font-semibold text-sm truncate">{game.title}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-white/50 text-xs">{game.year}</span>
                    {game.rating > 0 && (
                      <span className="text-yellow-400 text-xs font-medium">⭐ {game.rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-white/50 text-lg">No games found</p>
              <p className="text-white/30 text-sm mt-2">Try searching for something else</p>
            </div>
          )}
        </div>
      )}

      {/* Game Detail Modal */}
      {selectedGame && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-slate-900/95 max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl transition-all z-10"
              onClick={closeModal}
            >
              ×
            </button>

            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
              <img
                src={selectedGame.poster || 'https://via.placeholder.com/280x420?text=No+Image'}
                alt={selectedGame.title}
                className="w-56 md:w-72 h-auto rounded-2xl shadow-2xl mx-auto md:mx-0 object-cover"
              />

              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {selectedGame.title} {selectedGame.year && <span className="text-white/50">({selectedGame.year})</span>}
                </h3>

                <div className="flex flex-wrap gap-3 mb-4">
                  {(gameDetails?.rating || selectedGame.rating) > 0 && (
                    <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">
                      ⭐ {(gameDetails?.rating || selectedGame.rating).toFixed(1)}
                    </span>
                  )}
                  {gameDetails?.metacritic && (
                    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                      Metacritic: {gameDetails.metacritic}
                    </span>
                  )}
                  {gameDetails?.genres && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                      {gameDetails.genres}
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-white/70">
                  {gameDetails?.platforms && (
                    <p><span className="text-yellow-400 font-medium">Platforms:</span> {gameDetails.platforms}</p>
                  )}
                  {gameDetails?.developers && (
                    <p><span className="text-yellow-400 font-medium">Developer:</span> {gameDetails.developers}</p>
                  )}
                  {gameDetails?.publishers && (
                    <p><span className="text-yellow-400 font-medium">Publisher:</span> {gameDetails.publishers}</p>
                  )}
                </div>

                <p className="text-white/60 mt-4 leading-relaxed">
                  {gameDetails?.description || 'No description available.'}
                </p>

                {user ? (
                  <Link
                    to={`/category/videogames/new?title=${encodeURIComponent(selectedGame.title)}&description=${encodeURIComponent(gameDetails?.description || '')}`}
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

export default VideoGames;