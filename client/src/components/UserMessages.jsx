import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './UserMessages.css';

function UserMessages() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fetchedFor, setFetchedFor] = useState(null);

  // Fetch undismised messages once per login
  useEffect(() => {
    if (!user || fetchedFor === user.id) return;
    setFetchedFor(user.id);
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/messages`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setQueue(data.messages || []);
        }
      } catch (e) {
        console.error('Fetch user messages error:', e);
      }
    };
    fetchMessages();
  }, [user, fetchedFor]);

  // Reset when user logs out
  useEffect(() => {
    if (!user) {
      setQueue([]);
      setCurrent(null);
      setFetchedFor(null);
    }
  }, [user]);

  // Show next message from the queue
  useEffect(() => {
    if (queue.length > 0 && !current) {
      setCurrent(queue[0]);
    }
  }, [queue, current]);

  const dismissCurrent = async () => {
    if (!current || busy) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE_URL}/api/messages/${current.id}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (e) {
      console.error('Dismiss message error:', e);
    }
    // Remove from queue and clear current — won't reappear next login (server-side)
    setQueue(prev => prev.filter(m => m.id !== current.id));
    setCurrent(null);
    setBusy(false);
  };

  if (!current) return null;

  return (
    <div className="user-message-overlay" onClick={dismissCurrent}>
      <div className="user-message-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="user-message-close"
          onClick={dismissCurrent}
          disabled={busy}
          aria-label="Close message"
        >
          ×
        </button>

        {!current.image && <div className="user-message-icon">📬</div>}

        {current.title && <h3 className="user-message-title">{current.title}</h3>}

        {current.image && (
          <img src={current.image} alt="" className="user-message-image" />
        )}

        <p className="user-message-body">{current.body}</p>

        <div className="user-message-actions">
          <span className="user-message-hint">
            {queue.length > 1 ? `${queue.length - 1} more message(s)` : ''}
          </span>
          <button
            className="btn btn-primary"
            onClick={dismissCurrent}
            disabled={busy}
          >
            {busy ? '...' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserMessages;