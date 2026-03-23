import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './ReviewList.css';

const categoryIcons = {
  movies: '🎬',
  songs: '🎵',
  videogames: '🎮',
  shows: '📺'
};

function ReviewList({ category, allReviews }) {
  const { category: urlCategory } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [cat, setCat] = useState(urlCategory || category);
  const [userData, setUserData] = useState({});

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (!loading && user) {
      setCat(urlCategory || category);

      const url = urlCategory
        ? `${API_BASE_URL}/api/reviews/${urlCategory}`
        : `${API_BASE_URL}/api/reviews`;

      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (urlCategory) {
            setReviews(data);
            fetchUserData(data);
          } else {
            const all = [];
            for (const [catKey, items] of Object.entries(data)) {
              all.push(...items.map(item => ({ ...item, category: catKey })));
            }
            setReviews(all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            fetchUserData(all);
          }
        });
    }
  }, [urlCategory, category, user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <span className="text-5xl crown-animate inline-block">👑</span>
          <p className="text-yellow-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const fetchUserData = async (reviewsList) => {
    const userIds = [...new Set(reviewsList.map(r => r.userId).filter(Boolean))];
    const userDataMap = {};
    for (const userId of userIds) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${userId}`);
        const data = await res.json();
        if (data.username) {
          userDataMap[userId] = {
            username: data.username,
            profilePicture: data.profilePicture
          };
        }
      } catch (e) {
        userDataMap[userId] = { username: 'Anonymous', profilePicture: null };
      }
    }
    setUserData(userDataMap);
  };

  const deleteReview = async (id, cat) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    if (confirm('Are you sure you want to delete this review?')) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/reviews/${cat}/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setReviews(reviews.filter(r => r.id !== id));
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to delete review');
        }
      } catch (e) {
        alert('Failed to delete review');
      }
    }
  };

  const renderCrowns = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <span key={i} className={`text-xl ${i < rating ? 'opacity-100' : 'opacity-20'}`}>
        👑
      </span>
    ));
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-6xl crown-animate inline-block">👑</span>
        <h2 className="text-2xl font-bold text-white mt-6">No reviews yet</h2>
        <p className="text-white/50 mt-2">Be the first to add a review!</p>
        <button
          className="btn btn-primary mt-6"
          onClick={() => navigate(`/category/${cat || 'movies'}/new`)}
        >
          ✍️ Add Review
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">
          {categoryIcons[cat] || '📋'}{' '}
          {cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'All Reviews'}
        </h2>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/category/${cat || 'movies'}/new`)}
        >
          ✍️ Add Review
        </button>
      </div>

      <div className="space-y-4">
        {reviews.map(review => {
          const isOwner = user && review.userId === user.id;
          return (
            <div key={review.id} className="card p-6 group">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-white truncate">{review.title}</h3>
                  <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                    {categoryIcons[review.category]} {review.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-sm">by</span>
                  <Link to={`/profile/${review.userId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {userData[review.userId]?.profilePicture ? (
                      <img
                        src={userData[review.userId].profilePicture}
                        alt={userData[review.userId]?.username || 'Anonymous'}
                        className="w-5 h-5 rounded-full object-cover border border-yellow-500/30"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {(userData[review.userId]?.username || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-white font-medium">{userData[review.userId]?.username || 'Anonymous'}</span>
                  </Link>
                </div>
              </div>

              {/* King Meter */}
              <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                <span className="text-yellow-400 font-semibold text-sm">👑 King Meter</span>
                <div className="flex gap-1">{renderCrowns(review.rating)}</div>
              </div>

              <p className="text-white/70 mt-4 leading-relaxed">{review.description}</p>

              <div className="flex items-center justify-between mt-4 flex-wrap gap-4">
                <span className="text-white/40 text-sm">
                  Created: {new Date(review.createdAt).toLocaleDateString()}
                </span>
                {isOwner && (
                  <div className="flex gap-2">
                    <Link to={`/review/${review.id}/edit`} className="btn btn-secondary text-sm py-1.5 px-3">
                      Edit
                    </Link>
                    <button
                      className="btn btn-danger text-sm py-1.5 px-3"
                      onClick={() => deleteReview(review.id, review.category)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReviewList;