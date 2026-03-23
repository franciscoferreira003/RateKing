import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './Profile.css';

function Profile() {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${id}/profile`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        setError('User not found');
      }
    } catch (e) {
      setError('Failed to load profile');
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only image files are allowed (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setProfile(prev => ({
          ...prev,
          user: { ...prev.user, profilePicture: updatedUser.profilePicture }
        }));
        setEditing(false);
        // Update the AuthContext to refresh the header
        if (updateUser) {
          await updateUser();
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to upload image');
      }
    } catch (e) {
      setError('Failed to upload image');
    }
    setUploading(false);
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'movies': return '🎬';
      case 'shows': return '📺';
      case 'songs': return '🎵';
      case 'videogames': return '🎮';
      default: return '📝';
    }
  };

  const renderCrowns = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-600'}>
        👑
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl crown-animate inline-block">👑</div>
        <p className="text-yellow-400 mt-4">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = currentUser && currentUser.id === id;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="glass p-8 rounded-3xl gold-glow mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Profile Picture */}
          <div className="relative">
            {profile.user.profilePicture ? (
              <img
                src={profile.user.profilePicture}
                alt={profile.user.username}
                className="w-32 h-32 rounded-full object-cover border-4 border-yellow-500/50 shadow-xl"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-4 border-yellow-500/50 shadow-xl">
                <svg className="w-16 h-16 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-white mb-2">
              {profile.user.username}
            </h1>
            <p className="text-white/50 text-sm">
              Member since {new Date(profile.user.createdAt).toLocaleDateString()}
            </p>
            <p className="text-yellow-400 text-sm mt-1">
              {profile.reviews.length} review{profile.reviews.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Edit Button */}
          {isOwnProfile && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn btn-secondary"
            >
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {/* Edit Form */}
        {editing && isOwnProfile && (
          <div className="mt-6 p-4 bg-white/5 rounded-xl">
            <h3 className="text-white font-semibold mb-4">Change Profile Picture</h3>
            <div className="flex flex-col gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn btn-primary flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    📷 Choose Image
                  </>
                )}
              </button>
              <p className="text-white/50 text-xs text-center">
                Max 5MB. Supported formats: JPEG, PNG, GIF, WebP
              </p>
              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}
              <button onClick={() => setEditing(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gold-gradient mb-4">
          {isOwnProfile ? 'Your Reviews' : `${profile.user.username}'s Reviews`}
        </h2>
      </div>

      {profile.reviews.length === 0 ? (
        <div className="glass p-8 rounded-2xl text-center">
          <p className="text-white/50">No reviews yet</p>
          {isOwnProfile && (
            <button
              onClick={() => navigate('/media')}
              className="btn btn-primary mt-4"
            >
              Browse Movies & Shows
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {profile.reviews.map(review => (
            <div key={review.id} className="glass p-6 rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getCategoryEmoji(review.category)}</span>
                    <h3 className="text-white font-semibold text-lg">{review.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {renderCrowns(review.rating)}
                    <span className="text-yellow-400 text-sm ml-1">{review.rating}/5</span>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {review.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/50 capitalize">
                    {review.category}
                  </span>
                  <p className="text-white/30 text-xs mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Profile;