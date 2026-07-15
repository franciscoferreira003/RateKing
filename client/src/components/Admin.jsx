import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import './Admin.css';

function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [messages, setMessages] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', confirmPassword: '', isAdmin: false });
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [newMessage, setNewMessage] = useState({ title: '', body: '', targetType: 'all', targetUserId: '' });
  const [messageImage, setMessageImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messageImageInputRef = useRef(null);

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

      const msgRes = await fetch(`${API_BASE_URL}/api/admin/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const msgData = await msgRes.json();
      if (msgRes.ok) {
        setMessages(msgData.messages || []);
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

  const createMessage = async () => {
    if (!newMessage.body.trim()) {
      alert('Message body is required');
      return;
    }
    if (newMessage.targetType === 'user' && !newMessage.targetUserId) {
      alert('Select a target user');
      return;
    }
    const token = localStorage.getItem('token');
    // Multipart form data so we can attach an optional image
    const formData = new FormData();
    formData.append('title', newMessage.title);
    formData.append('body', newMessage.body);
    formData.append('targetType', newMessage.targetType);
    if (newMessage.targetType === 'user') {
      formData.append('targetUserId', newMessage.targetUserId);
    }
    if (messageImage) {
      formData.append('image', messageImage);
    }
    const res = await fetch(`${API_BASE_URL}/api/admin/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      setMessages(prev => [...prev, { ...data, dismissals: 0 }]);
      setNewMessage({ title: '', body: '', targetType: 'all', targetUserId: '' });
      setMessageImage(null);
      setImagePreview(null);
      if (messageImageInputRef.current) messageImageInputRef.current.value = '';
      alert('Message created — it will be shown to the recipient on next login.');
    } else {
      alert(data.error || 'Failed to create message');
    }
  };

  const onPickMessageImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB');
      e.target.value = '';
      return;
    }
    setMessageImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearMessageImage = () => {
    setMessageImage(null);
    setImagePreview(null);
    if (messageImageInputRef.current) messageImageInputRef.current.value = '';
  };

  const deleteMessage = async (msgId) => {
    if (!confirm('Delete this message? Dismissal records will also be removed.')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/admin/messages/${msgId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete message');
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
        <button
          className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages ({messages.length})
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

      {activeTab === 'messages' && (
        <div className="admin-messages-panel">
          {/* Create new message */}
          <div className="admin-message-form">
            <h3>Send a Login Message</h3>
            <p className="admin-message-form-hint">
              Messages appear as a popup when the recipient logs in. Once they close it, it won't reappear.
            </p>
            <div className="form-group">
              <label>Title (optional)</label>
              <input
                type="text"
                value={newMessage.title}
                onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                placeholder="e.g. Welcome, Maintenance notice, etc."
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={newMessage.body}
                onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })}
                placeholder="Write your message..."
                rows={4}
                maxLength={1000}
              />
            </div>
            <div className="form-group">
              <label>Recipient</label>
              <div className="recipient-toggle">
                <label className={newMessage.targetType === 'all' ? 'active' : ''}>
                  <input
                    type="radio"
                    name="targetType"
                    value="all"
                    checked={newMessage.targetType === 'all'}
                    onChange={() => setNewMessage({ ...newMessage, targetType: 'all', targetUserId: '' })}
                  />
                  All users
                </label>
                <label className={newMessage.targetType === 'user' ? 'active' : ''}>
                  <input
                    type="radio"
                    name="targetType"
                    value="user"
                    checked={newMessage.targetType === 'user'}
                    onChange={() => setNewMessage({ ...newMessage, targetType: 'user' })}
                  />
                  Specific user
                </label>
              </div>
            </div>
            {newMessage.targetType === 'user' && (
              <div className="form-group">
                <label>Select user</label>
                <select
                  value={newMessage.targetUserId}
                  onChange={(e) => setNewMessage({ ...newMessage, targetUserId: e.target.value })}
                >
                  <option value="">— Choose a user —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Image (optional, max 2MB)</label>
              <div className="message-image-picker">
                <input
                  ref={messageImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={onPickMessageImage}
                  className="message-image-input"
                />
                {imagePreview && (
                  <div className="message-image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button
                      type="button"
                      className="message-image-clear"
                      onClick={clearMessageImage}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-primary" onClick={createMessage}>Send Message</button>
            </div>
          </div>

          {/* Existing messages */}
          <div className="admin-existing-messages">
            <h3>Existing Messages</h3>
            {messages.length === 0 ? (
              <p className="admin-empty">No messages yet.</p>
            ) : (
              <div className="admin-message-list">
                {messages.map(m => (
                  <div key={m.id} className="admin-message-card">
                    <div className="admin-message-card-head">
                      <span className={`badge ${m.targetType === 'all' ? 'user' : 'admin'}`}>
                        {m.targetType === 'all' ? '📢 All users' : '👤 ' + (users.find(u => u.id === m.targetUserId)?.username || 'user')}
                      </span>
                      <span className="admin-message-date">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                      <button className="btn btn-danger" onClick={() => deleteMessage(m.id)}>
                        Delete
                      </button>
                    </div>
                    {m.title && <h4>{m.title}</h4>}
                    {m.image && (
                      <img src={m.image} alt="" className="admin-message-thumb" />
                    )}
                    <p>{m.body}</p>
                    <span className="admin-message-dismissals">
                      Dismissed by {m.dismissals || 0} user(s)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
