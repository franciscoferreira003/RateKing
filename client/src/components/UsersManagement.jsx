import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import './UsersManagement.css';

function UsersManagement() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
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
      navigate('/');
      return;
    }
    fetchUsers();
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return <div className="loading">Loading...</div>;
  }

  if (!user.isAdmin) {
    return null;
  }

  const fetchUsers = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
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
      setNewUser({ username: '', email: '', password: '', confirmPassword: '', isAdmin: false });
      setShowCreateUser(false);
      alert('User created successfully');
      fetchUsers();
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
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to change password');
    }
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="users-management-page">
      <div className="users-header">
        <h1>User Management</h1>
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
            <h4>Change Password for {users.find(u => u.id === selectedUserId)?.username}</h4>
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

      <div className="users-table">
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
                    Password
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
  );
}

export default UsersManagement;
