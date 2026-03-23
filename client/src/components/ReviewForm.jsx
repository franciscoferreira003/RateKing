import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ReviewForm.css';

const categories = ['movies', 'songs', 'videogames', 'shows'];

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
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    if (id) {
      const searchReview = async () => {
        const res = await fetch('http://localhost:3001/api/reviews');
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

  useEffect(() => {
    if (formData.category === 'movies') {
      fetchMovies();
    }
  }, [formData.category]);

  const fetchMovies = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/movies');
      const data = await res.json();
      if (data.Response === 'True') {
        setMovies(data.Search || []);
      }
    } catch (e) {
      console.error('Failed to fetch movies:', e);
    }
  };

  const handleMovieSelect = (e) => {
    const movieId = e.target.value;
    if (movieId) {
      const movie = movies.find(m => m.imdbID === movieId);
      if (movie) {
        setFormData({
          ...formData,
          title: movie.Title,
          description: movie.Plot || ''
        });
      }
    } else {
      setFormData({
        ...formData,
        title: '',
        description: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const url = id
      ? `http://localhost:3001/api/reviews/${formData.category}/${id}`
      : `http://localhost:3001/api/reviews/${formData.category}`;

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
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {formData.category === 'movies' && movies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Select Movie</label>
              <select onChange={handleMovieSelect} value="" className="input">
                <option value="">-- Or type a custom title below --</option>
                {movies.map(movie => (
                  <option key={movie.imdbID} value={movie.imdbID}>
                    {movie.Title} ({movie.Year})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter title..."
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