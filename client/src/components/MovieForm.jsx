import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './MovieForm.css';

function MovieForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    imdbID: '',
    Title: '',
    Year: '',
    Poster: '',
    Plot: '',
    Director: '',
    Actors: '',
    Genre: '',
    imdbRating: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user || !user.isAdmin) {
    return (
      <div className="movie-form-page">
        <div className="glass p-8 rounded-3xl">
          <h2>⛔ Access Denied</h2>
          <p>Admin access required to add movies.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.imdbID || !formData.Title) {
      setError('IMDB ID and Title are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/movies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Movie "${data.title}" added successfully!`);
        setFormData({
          imdbID: '',
          Title: '',
          Year: '',
          Poster: '',
          Plot: '',
          Director: '',
          Actors: '',
          Genre: '',
          imdbRating: ''
        });
      } else {
        setError(data.error || 'Failed to add movie');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div className="movie-form-page">
      <div className="glass p-8 rounded-3xl gold-glow max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gold-gradient text-center mb-6">
          🎬 Add New Movie
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl mb-4 text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                IMDB ID *
              </label>
              <input
                type="text"
                value={formData.imdbID}
                onChange={(e) => setFormData({ ...formData, imdbID: e.target.value })}
                placeholder="tt1234567"
                required
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.Title}
                onChange={(e) => setFormData({ ...formData, Title: e.target.value })}
                placeholder="Movie Title"
                required
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Year
              </label>
              <input
                type="text"
                value={formData.Year}
                onChange={(e) => setFormData({ ...formData, Year: e.target.value })}
                placeholder="2024"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                IMDB Rating
              </label>
              <input
                type="text"
                value={formData.imdbRating}
                onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
                placeholder="8.5"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Poster URL
            </label>
            <input
              type="text"
              value={formData.Poster}
              onChange={(e) => setFormData({ ...formData, Poster: e.target.value })}
              placeholder="https://..."
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Plot
            </label>
            <textarea
              value={formData.Plot}
              onChange={(e) => setFormData({ ...formData, Plot: e.target.value })}
              placeholder="Movie description..."
              rows={3}
              className="input resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Director
            </label>
            <input
              type="text"
              value={formData.Director}
              onChange={(e) => setFormData({ ...formData, Director: e.target.value })}
              placeholder="Director Name"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Actors
            </label>
            <input
              type="text"
              value={formData.Actors}
              onChange={(e) => setFormData({ ...formData, Actors: e.target.value })}
              placeholder="Actor 1, Actor 2, Actor 3"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Genre
            </label>
            <input
              type="text"
              value={formData.Genre}
              onChange={(e) => setFormData({ ...formData, Genre: e.target.value })}
              placeholder="Action, Drama, Comedy"
              className="input"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1 py-3">
              Add Movie
            </button>
            <button
              type="button"
              className="btn btn-secondary flex-1 py-3"
              onClick={() => navigate('/movies')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MovieForm;