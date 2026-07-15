import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './ReviewForm.css';

const categories = ['movies', 'shows', 'songs', 'videogames'];
const searchableCategories = ['movies', 'shows', 'songs', 'videogames'];

function ReviewForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: searchParams.get('title') || '',
    rating: 0,
    description: searchParams.get('description') || '',
    category: 'movies'
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searching, setSearching] = useState(false);

  // Set initial form data from URL params
  useEffect(() => {
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    if (title) {
      setFormData(prev => ({
        ...prev,
        title: title,
        description: description || ''
      }));
    }
  }, [searchParams]);

  // Load existing review for editing
  useEffect(() => {
    if (id) {
      const searchReview = async () => {
        const res = await fetch(`${API_BASE_URL}/api/reviews`);
        const data = await res.json();
        for (const [cat, items] of Object.entries(data)) {
          const review = items.find(r => r.id === parseInt(id));
          if (review) {
            setFormData({
              title: review.title,
              rating: review.rating,
              description: review.description,
              category: cat
            });
            break;
          }
        }
      };
      searchReview();
    }
  }, [id]);

  // Clear search when category changes
  useEffect(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedItem(null);
  }, [formData.category]);

  const searchItems = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      let endpoint;
      if (formData.category === 'movies') {
        endpoint = `${API_BASE_URL}/api/movies/search?query=${encodeURIComponent(query)}`;
      } else if (formData.category === 'shows') {
        endpoint = `${API_BASE_URL}/api/shows/search?query=${encodeURIComponent(query)}`;
      } else if (formData.category === 'songs') {
        endpoint = `${API_BASE_URL}/api/songs/search?query=${encodeURIComponent(query)}`;
      } else if (formData.category === 'videogames') {
        endpoint = `${API_BASE_URL}/api/games/search?query=${encodeURIComponent(query)}`;
      }

      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.Response === 'True') {
        if (formData.category === 'songs' || formData.category === 'videogames') {
          setSearchResults(data.results || []);
        } else {
          setSearchResults(data.Search || []);
        }
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error('Search failed:', e);
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      searchItems(query);
    }, 300);
  };

  const handleItemSelect = async (item) => {
    setSelectedItem(item);
    setSearchQuery(item.Title || item.title || '');
    setSearchResults([]);

    try {
      let endpoint;
      let id;

      if (formData.category === 'movies') {
        endpoint = `${API_BASE_URL}/api/movies/${item.imdbID}`;
        id = item.imdbID;
      } else if (formData.category === 'shows') {
        endpoint = `${API_BASE_URL}/api/shows/${item.imdbID}`;
        id = item.imdbID;
      } else if (formData.category === 'songs') {
        endpoint = `${API_BASE_URL}/api/songs/${item.id}`;
        id = item.id;
      } else if (formData.category === 'videogames') {
        endpoint = `${API_BASE_URL}/api/games/${item.id}`;
        id = item.id;
      }

      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.Response === 'True') {
        if (formData.category === 'songs') {
          setFormData({
            ...formData,
            title: `${data.title} - ${data.artist}`,
            description: data.genre || ''
          });
          setSelectedItem({
            ...item,
            Title: `${data.title} - ${data.artist}`,
            Poster: data.poster,
            Year: data.year
          });
        } else if (formData.category === 'videogames') {
          setFormData({
            ...formData,
            title: data.title,
            description: data.description || ''
          });
          setSelectedItem({
            ...item,
            Title: data.title,
            Poster: data.poster,
            Year: data.year
          });
        } else {
          setFormData({
            ...formData,
            title: data.Title,
            description: data.Plot || ''
          });
        }
      }
    } catch (e) {
      if (formData.category === 'songs') {
        setFormData({
          ...formData,
          title: item.title || item.Title || '',
          description: item.artist ? `Album by ${item.artist}` : ''
        });
      } else {
        setFormData({
          ...formData,
          title: item.Title || item.title || '',
          description: ''
        });
      }
    }
  };

  const clearSelection = () => {
    setSelectedItem(null);
    setSearchQuery('');
    setFormData({
      ...formData,
      title: '',
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const url = id
      ? `${API_BASE_URL}/api/reviews/${formData.category}/${id}`
      : `${API_BASE_URL}/api/reviews/${formData.category}`;

    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (res.ok) {
      navigate(`/category/${formData.category}`);
    } else {
      setError(data.error || 'Failed to save review');
    }
  };

  const renderCrowns = (count) => {
    return Array(5).fill(0).map((_, i) => (
      <span
        key={i}
        className={`text-4xl cursor-pointer transition-all duration-200 ${i < count ? 'opacity-100 grayscale-0' : 'opacity-30 grayscale'} hover:scale-110`}
        onMouseEnter={() => setHoverRating(i + 1)}
        onMouseLeave={() => setHoverRating(0)}
        onClick={() => setFormData({ ...formData, rating: i + 1 })}
        style={{ filter: i < count ? 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.6))' : 'grayscale(100%)' }}
      >
        👑
      </span>
    ));
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      movies: '🎬 Movie',
      shows: '📺 TV Show',
      songs: '🎵 Song',
      videogames: '🎮 Video Game'
    };
    return labels[cat] || cat;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass p-8 rounded-3xl gold-glow">
        <h2 className="text-2xl font-bold text-gold-gradient text-center mb-6">
          {id ? 'Edit Review' : 'New Review'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4 text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value, title: '', description: '' })}
              className="input"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* Search box for movies, shows, songs and games */}
          {searchableCategories.includes(formData.category) && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Search {formData.category === 'movies' ? 'Movie' : formData.category === 'shows' ? 'TV Show' : formData.category === 'songs' ? 'Album/Song' : 'Game'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={`Search for ${formData.category}...`}
                  className="input pr-10"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    ✕
                  </button>
                )}

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {searchResults.map(item => {
                      const id = item.imdbID || item.id;
                      const title = item.Title || item.title;
                      const poster = item.Poster || item.poster;
                      const year = item.Year || item.year;
                      const artist = item.artist;
                      const subtitle = artist ? `${artist} (${year})` : year;

                      return (
                        <div
                          key={id}
                          className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors"
                          onClick={() => handleItemSelect(item)}
                        >
                          {poster && poster !== 'N/A' && (
                            <img
                              src={poster}
                              alt={title}
                              className="w-10 h-14 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{title}</p>
                            <p className="text-white/50 text-sm truncate">{subtitle}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {searching && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl p-4 text-center">
                    <p className="text-white/50">Searching...</p>
                  </div>
                )}
              </div>

              {selectedItem && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
                  {(selectedItem.Poster || selectedItem.poster) && (selectedItem.Poster || selectedItem.poster) !== 'N/A' && (
                    <img
                      src={selectedItem.Poster || selectedItem.poster}
                      alt={selectedItem.Title || selectedItem.title}
                      className="w-10 h-14 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-white font-medium">{selectedItem.Title || selectedItem.title}</p>
                    <p className="text-white/50 text-sm">{selectedItem.artist ? `${selectedItem.artist} (${selectedItem.Year || selectedItem.year})` : (selectedItem.Year || selectedItem.year)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-white/50 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={searchableCategories.includes(formData.category) ? "Or type a custom title..." : "Enter title..."}
              required
              className="input"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 mb-3">
              <span className="text-xl">👑</span>
              <span className="text-sm font-medium text-yellow-400">King Meter</span>
            </label>
            <div className="flex items-center gap-2">
              {renderCrowns(hoverRating || formData.rating)}
              <span className="text-yellow-400 font-semibold ml-3">
                {hoverRating || formData.rating}/5 Crowns
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Write your review..."
              required
              rows={5}
              className="input resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary flex-1 py-3">
              {id ? 'Update' : 'Create'} Review
            </button>
            <button
              type="button"
              className="btn btn-secondary flex-1 py-3"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewForm;