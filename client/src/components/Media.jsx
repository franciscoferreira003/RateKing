import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import ListActions from './ListActions';
import EpisodeTracker from './EpisodeTracker';
import './Movies.css';

function Media() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('movies');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [randomLoading, setRandomLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    setItems([]);
    try {
      const endpoint = activeTab === 'movies' ? '/api/movies' : '/api/shows';
      const res = await fetch(`${API_BASE_URL}${endpoint}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setItems(data.Search || []);
      }
    } catch (e) {
      console.error(`Failed to fetch ${activeTab}:`, e);
    }
    setLoading(false);
  };

  const searchItems = async () => {
    if (!searchQuery.trim()) {
      fetchItems();
      return;
    }
    setLoading(true);
    try {
      const endpoint = activeTab === 'movies' ? '/api/movies/search' : '/api/shows/search';
      const res = await fetch(`${API_BASE_URL}${endpoint}?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setItems(data.Search || []);
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error(`Failed to search ${activeTab}:`, e);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchItems();
    }
  };

  const getRandomMovie = async () => {
    setRandomLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/movies/random`);
      const data = await res.json();
      if (data.Response === 'True') {
        setSelectedItem({
          imdbID: data.imdbID,
          Title: data.Title,
          Year: data.Year,
          Poster: data.Poster,
          imdbRating: data.imdbRating
        });
        setItemDetails(data);
      }
    } catch (e) {
      console.error('Failed to get random movie:', e);
    }
    setRandomLoading(false);
  };

  const handleItemSelect = async (item) => {
    setSelectedItem(item);
    setItemDetails(null);
    try {
      const endpoint = activeTab === 'movies' ? `/api/movies/${item.imdbID}` : `/api/shows/${item.imdbID}`;
      const res = await fetch(`${API_BASE_URL}${endpoint}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setItemDetails(data);
      }
    } catch (e) {
      console.error('Failed to fetch details:', e);
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gold-gradient">
          {activeTab === 'movies' ? '🎬 Movies' : '📺 TV Shows'}
        </h2>
        <p className="text-white/50 mt-2">Select a {activeTab === 'movies' ? 'movie' : 'show'} to review</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => { setActiveTab('movies'); setSearchQuery(''); }}
          className={`px-4 py-2 rounded-full font-medium transition-all ${
            activeTab === 'movies'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          🎬 Movies
        </button>
        <button
          onClick={() => { setActiveTab('shows'); setSearchQuery(''); }}
          className={`px-4 py-2 rounded-full font-medium transition-all ${
            activeTab === 'shows'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          📺 Shows
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-wrap gap-3 mb-8 max-w-2xl mx-auto">
        <input
          type="text"
          placeholder={`Search ${activeTab === 'movies' ? 'movies' : 'TV shows'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="input flex-1"
        />
        <button onClick={searchItems} className="btn btn-primary">
          Search
        </button>
        {activeTab === 'movies' && (
          <button
            onClick={getRandomMovie}
            disabled={randomLoading}
            className="btn btn-secondary flex items-center gap-2"
          >
            {randomLoading ? (
              <>
                <span className="animate-spin">🎲</span>
                Loading...
              </>
            ) : (
              <>
                🎲 Random
              </>
            )}
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl crown-animate inline-block">👑</div>
          <p className="text-yellow-400 mt-4">Loading {activeTab}...</p>
        </div>
      )}

      {/* Items Grid */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
          {items.length > 0 ? (
            items.map(item => (
              <div
                key={item.imdbID}
                className="card cursor-pointer overflow-hidden group p-3"
                onClick={() => handleItemSelect(item)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg opacity-70 group-hover:opacity-100 transition-opacity">
                    {activeTab === 'movies' ? '🎬' : '📺'}
                  </span>
                  <h4 className="text-white font-semibold text-sm truncate">{item.Title}</h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-xs">{item.Year}</span>
                  {item.imdbRating && (
                    <span className="text-yellow-400 text-xs font-medium">⭐ {item.imdbRating}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-white/50 text-lg">No {activeTab} found</p>
              <p className="text-white/30 text-sm mt-2">Try searching for something else</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 modal-overlay-solid flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="modal-solid max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
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
                src={selectedItem.Poster !== 'N/A' ? selectedItem.Poster : 'https://via.placeholder.com/280x420?text=No+Poster'}
                alt={selectedItem.Title}
                className="modal-poster"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/280x420?text=No+Poster'; }}
              />

              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {selectedItem.Title} <span className="text-white/50">({selectedItem.Year})</span>
                </h3>

                <div className="flex flex-wrap gap-3 mb-4">
                  {(itemDetails?.imdbRating || selectedItem.imdbRating) && (
                    <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">
                      ⭐ {itemDetails?.imdbRating || selectedItem.imdbRating}/10
                    </span>
                  )}
                  {itemDetails?.Genre && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                      {itemDetails.Genre}
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-white/70">
                  {itemDetails?.Director && (
                    <p><span className="text-yellow-400 font-medium">Director:</span> {itemDetails.Director}</p>
                  )}
                  {itemDetails?.Actors && (
                    <p><span className="text-yellow-400 font-medium">Actors:</span> {itemDetails.Actors}</p>
                  )}
                </div>

                <p className="text-white/60 mt-4 leading-relaxed">
                  {itemDetails?.Plot || selectedItem.Plot || 'No description available.'}
                </p>

                {user ? (
                  <Link
                    to={`/category/${activeTab}/new?title=${encodeURIComponent(selectedItem.Title)}&description=${encodeURIComponent(itemDetails?.Plot || '')}`}
                    className="btn btn-primary mt-6 inline-flex"
                  >
                    ✍️ Write a Review
                  </Link>
                ) : (
                  <Link to="/login" className="btn btn-primary mt-6 inline-flex">
                    Login to Review
                  </Link>
                )}

                <ListActions
                  item={{ id: selectedItem.imdbID, title: selectedItem.Title, year: selectedItem.Year, poster: selectedItem.Poster }}
                  category={activeTab}
                />

                {activeTab === 'shows' && user && (
                  <EpisodeTracker
                    showId={selectedItem.imdbID}
                    title={selectedItem.Title}
                    year={selectedItem.Year}
                    poster={selectedItem.Poster}
                    totalSeasons={itemDetails?.totalSeasons ? parseInt(itemDetails.totalSeasons) : null}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Media;