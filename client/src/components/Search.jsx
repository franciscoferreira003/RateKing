import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Search.css';

const categories = ['movies', 'songs', 'videogames', 'shows'];

const categoryIcons = {
  movies: '🎬',
  songs: '🎵',
  videogames: '🎮',
  shows: '📺'
};

function Search() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const search = async (filter = null) => {
    if (!query.trim()) return;

    const url = filter
      ? `http://localhost:3001/api/search?q=${encodeURIComponent(query)}&category=${filter}`
      : `http://localhost:3001/api/search?q=${encodeURIComponent(query)}`;

    const res = await fetch(url);
    const data = await res.json();
    setResults(data);
    setActiveFilter(filter);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      search();
    }
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getAllResults = () => {
    const all = [];
    for (const [cat, items] of Object.entries(results)) {
      if (!activeFilter || activeFilter === cat) {
        all.push(...items.map(item => ({ ...item, category: cat })));
      }
    }
    return all;
  };

  return (
    <div className="search-page">
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search reviews..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-primary" onClick={() => search()} style={{ marginTop: '10px', width: '100%' }}>
          Search
        </button>
      </div>

      <div className="filter-buttons">
        <button
          className={`btn ${!activeFilter ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveFilter(null); search(null); }}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            className={`btn ${activeFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => search(cat)}
          >
            {categoryIcons[cat]} {cat}
          </button>
        ))}
      </div>

      {getAllResults().length > 0 && (
        <div className="search-results">
          <h2>
            Results {activeFilter ? `(${activeFilter})` : ''}: {getAllResults().length}
          </h2>
          {getAllResults().map(review => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div>
                  <h3 className="review-title">{review.title}</h3>
                  <span className="review-category">
                    {categoryIcons[review.category]} {review.category}
                  </span>
                </div>
                <Link to={`/review/${review.id}/edit`} className="btn btn-secondary">
                  Edit
                </Link>
              </div>
              <div className="stars">{renderStars(review.rating)}</div>
              <p className="review-description">{review.description}</p>
            </div>
          ))}
        </div>
      )}

      {query.trim() && getAllResults().length === 0 && (
        <div className="empty-state">
          <h2>No results found</h2>
          <p>Try a different search term</p>
        </div>
      )}
    </div>
  );
}

export default Search;
