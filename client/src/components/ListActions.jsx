import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './ListActions.css';

function ListActions({ item, category }) {
  const { user } = useAuth();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [lists, setLists] = useState([]);
  const [showListPanel, setShowListPanel] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [busy, setBusy] = useState(false);
  const panelRef = useRef(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  // Fetch watchlist + lists on mount / when item changes
  useEffect(() => {
    if (!user || !item) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [wlRes, listsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/watchlist`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          fetch(`${API_BASE_URL}/api/lists`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        ]);
        if (cancelled) return;
        if (wlRes.ok) {
          const wlData = await wlRes.json();
          const catItems = wlData[category] || [];
          setInWatchlist(catItems.some(i => String(i.id) === String(item.id)));
        }
        if (listsRes.ok) {
          const listsData = await listsRes.json();
          setLists((listsData.lists || []).filter(l => l.category === category));
        }
      } catch (e) {
        console.error('ListActions fetch error:', e);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [user, item, category]);

  // Close panel on outside click
  useEffect(() => {
    if (!showListPanel) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowListPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showListPanel]);

  const toggleWatchlist = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      if (inWatchlist) {
        await fetch(`${API_BASE_URL}/api/watchlist/${category}/${item.id}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
        setInWatchlist(false);
      } else {
        await fetch(`${API_BASE_URL}/api/watchlist/${category}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id: item.id, title: item.title, year: item.year, poster: item.poster })
        });
        setInWatchlist(true);
      }
    } catch (e) {
      console.error('Toggle watchlist error:', e);
    }
    setBusy(false);
  };

  const createListAndAdd = async () => {
    if (!newListName.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/lists`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newListName.trim(), category })
      });
      if (res.ok) {
        const newList = await res.json();
        // Add item to the new list
        await fetch(`${API_BASE_URL}/api/lists/${newList.id}/items`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id: item.id, title: item.title, year: item.year, poster: item.poster })
        });
        newList.items = [{ id: item.id, title: item.title, year: item.year, poster: item.poster }];
        setLists(prev => [...prev, newList]);
        setNewListName('');
      }
    } catch (e) {
      console.error('Create list error:', e);
    }
    setBusy(false);
  };

  const toggleItemInList = async (list) => {
    if (busy) return;
    const isInList = list.items.some(i => String(i.id) === String(item.id));
    setBusy(true);
    try {
      if (isInList) {
        await fetch(`${API_BASE_URL}/api/lists/${list.id}/items/${item.id}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
        setLists(prev => prev.map(l =>
          l.id === list.id
            ? { ...l, items: l.items.filter(i => String(i.id) !== String(item.id)) }
            : l
        ));
      } else {
        await fetch(`${API_BASE_URL}/api/lists/${list.id}/items`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id: item.id, title: item.title, year: item.year, poster: item.poster })
        });
        setLists(prev => prev.map(l =>
          l.id === list.id
            ? { ...l, items: [...l.items, { id: item.id, title: item.title, year: item.year, poster: item.poster }] }
            : l
        ));
      }
    } catch (e) {
      console.error('Toggle list item error:', e);
    }
    setBusy(false);
  };

  if (!user) return null;

  return (
    <div className="list-actions">
      <button
        className={`btn ${inWatchlist ? 'btn-primary' : 'btn-secondary'} text-sm`}
        onClick={toggleWatchlist}
        disabled={busy}
      >
        {inWatchlist ? '✓ In Watchlist' : '👁️ Watchlist'}
      </button>

      <div className="list-actions-dropdown" ref={panelRef}>
        <button
          className="btn btn-secondary text-sm"
          onClick={() => setShowListPanel(v => !v)}
          disabled={busy}
        >
          📋 Add to List {showListPanel ? '▲' : '▼'}
        </button>

        {showListPanel && (
          <div className="list-panel">
            {lists.length === 0 && (
              <p className="list-panel-empty">No lists yet for this category</p>
            )}
            {lists.map(list => {
              const isInList = list.items.some(i => String(i.id) === String(item.id));
              return (
                <label key={list.id} className="list-panel-item">
                  <input
                    type="checkbox"
                    checked={isInList}
                    onChange={() => toggleItemInList(list)}
                    disabled={busy}
                  />
                  <span className="truncate">{list.name}</span>
                  <span className="list-panel-count">{list.items.length}</span>
                </label>
              );
            })}
            <div className="list-panel-create">
              <input
                type="text"
                placeholder="New list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createListAndAdd(); }}
                className="input text-sm"
                maxLength={50}
              />
              <button
                className="btn btn-primary text-sm"
                onClick={createListAndAdd}
                disabled={busy || !newListName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListActions;