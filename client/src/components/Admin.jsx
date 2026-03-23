import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import './Admin.css';

function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', confirmPassword: '', isAdmin: false });
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (!user || !user.isAdmin) {
      setError('Admin access required');
      return;
    }
    fetchAdminData();
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return <div className="loading">Loading...</div>;
  }

  if (!user.isAdmin) {
    return (
      <div className="admin-page">
        <div className="auth-container">
          <h2>⛔ Access Denied</h2>
          <p>Admin access required to view this page.</p>
          <Link to="/" className="btn btn-primary">Go Back</Link>
        </div>
      </div>
    );
  }

  const fetchUsernames = async (reviewsList) => {
    const userIds = [...new Set(reviewsList.map(r => r.userId).filter(Boolean))];
    const usernamesMap = {};
    for (const userId of userIds) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${userId}`);
        const data = await res.json();
        if (data.username) {
          usernamesMap[userId] = data.username;
        }
      } catch (e) {
        usernamesMap[userId] = 'Anonymous';
      }
    }
    setUsernames(usernamesMap);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const usersRes = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      if (usersRes.ok) {
        setUsers(usersData);
      }

      const reviewsRes = await fetch(`${API_BASE_URL}/api/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const reviewsData = await reviewsRes.json();
      if (reviewsRes.ok) {
        setReviews(reviewsData);
        fetchUsernames(reviewsData);
      }
    } catch (err) {
      setError('Failed to load admin data');
    }
    setLoading(false);
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setUsers(users.filter(u => u.id !== userId));
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete user');
    }
  };

  const deleteReview = async (category, reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/admin/reviews/${category}/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setReviews(reviews.filter(r => r.id !== reviewId));
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete review');
    }
  };

  const toggleAdmin = async (userId, currentStatus) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ isAdmin: !currentStatus })
    });
    if (res.ok) {
      setUsers(users.map(u => u.id === userId ? { ...u, isAdmin: !currentStatus } : u));
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      alert('All fields are required');
      return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password
      })
    });
    const data = await res.json();
    if (res.ok) {
      setUsers([...users, { ...data.user, isAdmin: newUser.isAdmin }]);
      setNewUser({ username: '', email: '', password: '', isAdmin: false });
      setShowCreateUser(false);
      alert('User created successfully');
    } else {
      alert(data.error || 'Failed to create user');
    }
  };

  const changePassword = async () => {
    if (!passwordData.newPassword) {
      alert('Password is required');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${selectedUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ password: passwordData.newPassword })
    });
    if (res.ok) {
      alert('Password changed successfully');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setShowChangePassword(false);
      setSelectedUserId(null);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to change password');
    }
  };

  const categoryIcons = {
    movies: '🎬',
    songs: '🎵',
    videogames: '🎮',
    shows: '📺'
  };

  if (!user || !user.isAdmin) {
    return (
      <div className="admin-page">
        <div className="auth-container">
          <h2>⛔ Access Denied</h2>
          <p>Admin access required to view this page.</p>
          <Link to="/" className="btn btn-primary">Go Back</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>🛡️ Admin Panel</h1>
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({users.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews ({reviews.length})
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="admin-users-panel">
          <div className="admin-panel-header">
            <h3>User Management</h3>
            <button className="btn btn-primary" onClick={() => setShowCreateUser(true)}>
              + Create User
            </button>
          </div>

          {showCreateUser && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h4>Create New User</h4>
                <button className="close-btn" onClick={() => setShowCreateUser(false)}>×</button>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="Enter username"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={newUser.isAdmin}
                      onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                    />
                    Admin role
                  </label>
                </div>
                <div className="actions">
                  <button className="btn btn-primary" onClick={createUser}>Create</button>
                  <button className="btn btn-secondary" onClick={() => setShowCreateUser(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {showChangePassword && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h4>Change Password</h4>
                <button className="close-btn" onClick={() => { setShowChangePassword(false); setSelectedUserId(null); }}>×</button>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="actions">
                  <button className="btn btn-primary" onClick={changePassword}>Change</button>
                  <button className="btn btn-secondary" onClick={() => { setShowChangePassword(false); setSelectedUserId(null); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.isAdmin ? 'admin' : 'user'}`}>
                        {u.isAdmin ? '👑 Admin' : '👤 User'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => { setSelectedUserId(u.id); setShowChangePassword(true); }}
                        disabled={u.email === 'admin@reviewapp.com'}
                      >
                        Change Password
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => toggleAdmin(u.id, u.isAdmin)}
                        disabled={u.email === 'admin@reviewapp.com'}
                      >
                        {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteUser(u.id)}
                        disabled={u.email === 'admin@reviewapp.com'}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Title</th>
                <th>Rating</th>
                <th>Author</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id}>
                  <td>{categoryIcons[r.category]} {r.category}</td>
                  <td>{r.title}</td>
                  <td>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                  <td>{usernames[r.userId] || 'N/A'}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteReview(r.category, r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Admin;
