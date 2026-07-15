import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './Watchlist.css';
import './EpisodeTracker.css';

const CATEGORY_TABS = [
  { key: 'movies', label: 'Movies', icon: '🎬' },
  { key: 'shows', label: 'Shows', icon: '📺' },
  { key: 'songs', label: 'Songs', icon: '🎵' },
  { key: 'videogames', label: 'Games', icon: '🎮' },
  { key: 'comics', label: 'Comics', icon: '📚' },
];

function Watchlist() {
  const { user, loading } = useAuth();
  const [activeCategory, setActiveCategory] = useState('movies');
  const [watchlist, setWatchlist] = useState({});
  const [lists, setLists] = useState([]);
  const [trackedShows, setTrackedShows] = useState([]);
  const [expandedList, setExpandedList] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [busy, setBusy] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const fetchData = async () => {
    if (!user) return;
    try {
      const endpoints = [
        fetch(`${API_BASE_URL}/api/watchlist`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${API_BASE_URL}/api/lists`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ];
      if (user) {
        endpoints.push(fetch(`${API_BASE_URL}/api/episodes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }));
      }
      const [wlRes, listsRes, epRes] = await Promise.all(endpoints);
      if (wlRes.ok) setWatchlist(await wlRes.json());
      if (listsRes.ok) {
        const data = await listsRes.json();
        setLists(data.lists || []);
      }
      if (epRes && epRes.ok) {
        const epData = await epRes.json();
        setTrackedShows(epData.shows || []);
      }
    } catch (e) {
      console.error('Fetch watchlist/lists error:', e);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
      return;
    }
    fetchData();
  }, [user, loading]);

  const removeFromWatchlist = async (itemId) => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE_URL}/api/watchlist/${activeCategory}/${itemId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      setWatchlist(prev => ({
        ...prev,
        [activeCategory]: (prev[activeCategory] || []).filter(i => String(i.id) !== String(itemId))
      }));
    } catch (e) {
      console.error('Remove from watchlist error:', e);
    }
    setBusy(false);
  };

  const createList = async () => {
    if (!newListName.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/lists`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newListName.trim(), category: activeCategory })
      });
      if (res.ok) {
        const newList = await res.json();
        setLists(prev => [...prev, newList]);
        setNewListName('');
      }
    } catch (e) {
      console.error('Create list error:', e);
    }
    setBusy(false);
  };

  const deleteList = async (listId) => {
    if (busy || !confirm('Delete this list?')) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE_URL}/api/lists/${listId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      setLists(prev => prev.filter(l => l.id !== listId));
      if (expandedList === listId) setExpandedList(null);
    } catch (e) {
      console.error('Delete list error:', e);
    }
    setBusy(false);
  };

  const removeItemFromList = async (listId, itemId) => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE_URL}/api/lists/${listId}/items/${itemId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      setLists(prev => prev.map(l =>
        l.id === listId
          ? { ...l, items: l.items.filter(i => String(i.id) !== String(itemId)) }
          : l
      ));
    } catch (e) {
      console.error('Remove from list error:', e);
    }
    setBusy(false);
  };

  const untrackShow = async (showId) => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE_URL}/api/episodes/${showId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      setTrackedShows(prev => prev.filter(s => String(s.showId) !== String(showId)));
    } catch (e) {
      console.error('Untrack show error:', e);
    }
    setBusy(false);
  };

  const showProgress = (show) => {
    let watched = 0;
    let total = 0;
    for (const season of Object.values(show.seasons || {})) {
      watched += (season.watched || []).length;
      total += season.total || 0;
    }
    const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
    return { watched, total, pct };
  };

  if (loading) {
    return <div className="text-center py-16"><span className="text-5xl crown-animate inline-block">👑</span><p className="text-yellow-400 mt-4">Loading...</p></div>;
  }
  if (!user) return null;

  const watchlistItems = watchlist[activeCategory] || [];
  const categoryLists = lists.filter(l => l.category === activeCategory);

  const renderCard = (item, onRemove) => (
    <div key={item.id} className="card p-3 group relative">
      {item.poster && (
        <img
          src={item.poster}
          alt={item.title}
          className="w-full h-32 object-cover rounded-lg mb-2"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
      <h4 className="text-white font-semibold text-sm truncate">{item.title}</h4>
      {item.year && <span className="text-white/50 text-xs">{item.year}</span>}
      {onRemove && (
        <button
          className="list-item-remove"
          onClick={() => onRemove(item.id)}
          title="Remove"
          disabled={busy}
        >
          ✕
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gold-gradient">📋 My Lists</h2>
        <p className="text-white/50 mt-2">Your watchlists and custom collections</p>
      </div>

      {/* Category Tabs */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key)}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              activeCategory === tab.key
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Watchlist Section */}
      <div className="mb-10">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>👁️</span> Watchlist
          <span className="text-white/40 text-sm font-normal">({watchlistItems.length})</span>
        </h3>
        {watchlistItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {watchlistItems.map(item => renderCard(item, removeFromWatchlist))}
          </div>
        ) : (
          <div className="glass p-6 rounded-2xl text-center">
            <p className="text-white/50">Your watchlist is empty for this category</p>
            <p className="text-white/30 text-sm mt-1">Browse and add items to your watchlist</p>
          </div>
        )}
      </div>

      {/* Episode Tracking Section (shows only) */}
      {activeCategory === 'shows' && (
        <div className="mb-10">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>📺</span> Episode Tracking
            <span className="text-white/40 text-sm font-normal">({trackedShows.length})</span>
          </h3>
          {trackedShows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trackedShows.map(show => {
                const { watched, total, pct } = showProgress(show);
                return (
                  <div key={show.showId} className="card p-3 group relative flex gap-3">
                    {show.poster && (
                      <img
                        src={show.poster}
                        alt={show.title}
                        className="w-14 h-20 object-cover rounded-lg flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold text-sm truncate">{show.title}</h4>
                      {show.year && <span className="text-white/50 text-xs">{show.year}</span>}
                      <div className="episode-progress-bar mt-2" style={{ height: '6px' }}>
                        <div className="episode-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-xs">
                        <span className="text-white/60">{watched}/{total} eps</span>
                        {show.nextEpisode ? (
                          <span className="text-yellow-400">Next: S{show.nextEpisode.season}E{show.nextEpisode.episode}</span>
                        ) : total > 0 ? (
                          <span className="text-green-400">✓ Caught up</span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      className="list-item-remove"
                      onClick={() => untrackShow(show.showId)}
                      title="Stop tracking"
                      disabled={busy}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass p-6 rounded-2xl text-center">
              <p className="text-white/50">No tracked shows yet</p>
              <p className="text-white/30 text-sm mt-1">Open a show in Movies &amp; Shows to start tracking episodes</p>
            </div>
          )}
        </div>
      )}

      {/* Custom Lists Section */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📚</span> Custom Lists
        </h3>

        {/* Create new list */}
        <div className="flex gap-2 mb-4 max-w-md">
          <input
            type="text"
            placeholder="New list name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createList(); }}
            className="input flex-1"
            maxLength={50}
          />
          <button onClick={createList} className="btn btn-primary" disabled={busy || !newListName.trim()}>
            + Create
          </button>
        </div>

        {categoryLists.length === 0 ? (
          <div className="glass p-6 rounded-2xl text-center">
            <p className="text-white/50">No custom lists yet for this category</p>
            <p className="text-white/30 text-sm mt-1">Create one above to organize your favorites</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categoryLists.map(list => (
              <div key={list.id} className="glass rounded-2xl overflow-hidden">
                {/* List header */}
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                     onClick={() => setExpandedList(expandedList === list.id ? null : list.id)}>
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400">{expandedList === list.id ? '▼' : '▶'}</span>
                    <span className="text-white font-semibold">{list.name}</span>
                    <span className="text-white/40 text-sm">({list.items.length} items)</span>
                  </div>
                  <button
                    className="btn btn-danger text-xs py-1 px-2"
                    onClick={(e) => { e.stopPropagation(); deleteList(list.id); }}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>

                {/* List items */}
                {expandedList === list.id && (
                  <div className="p-4 pt-0">
                    {list.items.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {list.items.map(item => renderCard(item, (itemId) => removeItemFromList(list.id, itemId)))}
                      </div>
                    ) : (
                      <p className="text-white/40 text-sm text-center py-4">This list is empty</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Watchlist;