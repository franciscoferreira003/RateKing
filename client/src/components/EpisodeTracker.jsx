import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './EpisodeTracker.css';

function EpisodeTracker({ showId, title, year, poster, totalSeasons }) {
  const { user } = useAuth();
  const [tracked, setTracked] = useState(null);
  const [activeSeason, setActiveSeason] = useState(1);
  const [seasonData, setSeasonData] = useState(null);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seasonsInput, setSeasonsInput] = useState(totalSeasons || 1);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  // Fetch existing tracking for this show
  useEffect(() => {
    if (!user || !showId) return;
    let cancelled = false;
    const fetchTracking = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/episodes/${showId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setTracked(data);
          const ts = data?.totalSeasons || totalSeasons || 1;
          setSeasonsInput(ts);
          // Default active season to nextEpisode season or 1
          setActiveSeason(data?.nextEpisode?.season || 1);
        }
      } catch (e) {
        console.error('Fetch tracking error:', e);
      }
    };
    fetchTracking();
    return () => { cancelled = true; };
  }, [user, showId, totalSeasons]);

  // Fetch episodes for the active season
  useEffect(() => {
    if (!user || !showId) return;
    let cancelled = false;
    const fetchSeason = async () => {
      setLoadingSeason(true);
      setSeasonData(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/episodes/${showId}/season/${activeSeason}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (cancelled) return;
        const data = await res.json();
        setSeasonData(data);
      } catch (e) {
        console.error('Fetch season error:', e);
      }
      setLoadingSeason(false);
    };
    fetchSeason();
    return () => { cancelled = true; };
  }, [user, showId, activeSeason]);

  const persist = useCallback(async (nextState) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/episodes/${showId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          title,
          year,
          poster,
          totalSeasons: nextState.totalSeasons,
          seasons: nextState.seasons,
          nextEpisode: nextState.nextEpisode
        })
      });
      if (res.ok) {
        const saved = await res.json();
        setTracked(saved);
      }
    } catch (e) {
      console.error('Persist tracking error:', e);
    }
    setBusy(false);
  }, [showId, title, year, poster]);

  // Compute next unwatched episode across all seasons
  const computeNext = (seasons, totalSeasons) => {
    for (let s = 1; s <= (totalSeasons || 1); s++) {
      const season = seasons[String(s)];
      if (!season) continue;
      const total = season.total || 0;
      const watched = new Set(season.watched || []);
      for (let ep = 1; ep <= total; ep++) {
        if (!watched.has(ep)) {
          return { season: s, episode: ep };
        }
      }
    }
    return null;
  };

  const ensureSeason = (seasons, seasonNum, total) => {
    const key = String(seasonNum);
    if (!seasons[key]) {
      seasons[key] = { total, watched: [] };
    }
    if (total && seasons[key].total !== total) {
      seasons[key].total = total;
    }
    return seasons;
  };

  const toggleEpisode = (epNumber) => {
    if (busy || !seasonData || seasonData.Response !== 'True') return;
    const total = seasonData.totalEpisodes || seasonData.episodes.length;
    const seasons = JSON.parse(JSON.stringify(tracked?.seasons || {}));
    ensureSeason(seasons, activeSeason, total);
    const watched = new Set(seasons[String(activeSeason)].watched);
    if (watched.has(epNumber)) {
      watched.delete(epNumber);
    } else {
      watched.add(epNumber);
    }
    seasons[String(activeSeason)].watched = Array.from(watched).sort((a, b) => a - b);
    const nextState = {
      totalSeasons: seasonsInput,
      seasons,
      nextEpisode: computeNext(seasons, seasonsInput)
    };
    persist(nextState);
  };

  const markAllInSeason = (markAll) => {
    if (busy || !seasonData || seasonData.Response !== 'True') return;
    const total = seasonData.totalEpisodes || seasonData.episodes.length;
    const seasons = JSON.parse(JSON.stringify(tracked?.seasons || {}));
    ensureSeason(seasons, activeSeason, total);
    seasons[String(activeSeason)].watched = markAll
      ? Array.from({ length: total }, (_, i) => i + 1)
      : [];
    const nextState = {
      totalSeasons: seasonsInput,
      seasons,
      nextEpisode: computeNext(seasons, seasonsInput)
    };
    persist(nextState);
  };

  const untrack = async () => {
    if (busy || !confirm('Remove episode tracking for this show?')) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE_URL}/api/episodes/${showId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      setTracked(null);
      setSeasonData(null);
    } catch (e) {
      console.error('Untrack error:', e);
    }
    setBusy(false);
  };

  if (!user) return null;

  const seasons = tracked?.seasons || {};
  const currentSeason = seasons[String(activeSeason)] || { total: 0, watched: [] };
  const watchedSet = new Set(currentSeason.watched || []);

  // Overall progress
  let totalWatched = 0;
  let totalEps = 0;
  for (let s = 1; s <= (seasonsInput || 1); s++) {
    const sn = seasons[String(s)];
    if (sn) {
      totalWatched += (sn.watched || []).length;
      totalEps += sn.total || 0;
    }
  }
  const progressPct = totalEps > 0 ? Math.round((totalWatched / totalEps) * 100) : 0;
  const nextEp = tracked?.nextEpisode;

  const seasonArray = Array.from({ length: Math.max(1, seasonsInput || 1) }, (_, i) => i + 1);

  return (
    <div className="episode-tracker glass">
      <div className="episode-tracker-header">
        <h4 className="text-white font-bold flex items-center gap-2">
          <span>📺</span> Episode Tracking
        </h4>
        {tracked && (
          <button
            className="btn btn-danger text-xs py-1 px-2"
            onClick={untrack}
            disabled={busy}
          >
            Untrack
          </button>
        )}
      </div>

      {/* Total seasons control */}
      <div className="episode-seasons-control">
        <label className="text-white/60 text-sm">Total seasons:</label>
        <input
          type="number"
          min="1"
          max="50"
          value={seasonsInput}
          onChange={(e) => setSeasonsInput(Math.max(1, parseInt(e.target.value) || 1))}
          onBlur={() => {
            if (tracked && seasonsInput !== tracked.totalSeasons) {
              persist({
                totalSeasons: seasonsInput,
                seasons: tracked.seasons,
                nextEpisode: computeNext(tracked.seasons, seasonsInput)
              });
            }
          }}
          className="input text-sm"
          style={{ width: '70px' }}
        />
      </div>

      {/* Overall progress */}
      {totalEps > 0 && (
        <div className="episode-progress-wrap">
          <div className="episode-progress-bar">
            <div className="episode-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="episode-progress-text">
            {totalWatched}/{totalEps} episodes ({progressPct}%)
          </span>
        </div>
      )}

      {/* Next up */}
      {nextEp && (
        <div className="episode-next-up">
          <span className="text-yellow-400 font-medium">▶ Next up:</span>
          <span className="text-white">S{nextEp.season} E{nextEp.episode}</span>
        </div>
      )}
      {!nextEp && totalEps > 0 && (
        <div className="episode-next-up">
          <span className="text-green-400 font-medium">✓ All caught up!</span>
        </div>
      )}

      {/* Season selector */}
      <div className="episode-season-tabs">
        {seasonArray.map(s => {
          const sn = seasons[String(s)];
          const w = sn ? (sn.watched || []).length : 0;
          const t = sn ? sn.total : 0;
          const completed = t > 0 && w === t;
          return (
            <button
              key={s}
              onClick={() => setActiveSeason(s)}
              className={`episode-season-tab ${activeSeason === s ? 'active' : ''} ${completed ? 'completed' : ''}`}
            >
              {completed && <span className="episode-season-check">✓</span>}
              S{s}{t > 0 && <span className="episode-season-count">{w}/{t}</span>}
            </button>
          );
        })}
      </div>

      {/* Season actions */}
      {seasonData?.Response === 'True' && (
        <div className="episode-season-actions">
          <button
            className="btn btn-secondary text-xs py-1 px-2"
            onClick={() => markAllInSeason(true)}
            disabled={busy}
          >
            Mark all watched
          </button>
          <button
            className="btn btn-secondary text-xs py-1 px-2"
            onClick={() => markAllInSeason(false)}
            disabled={busy}
          >
            Clear season
          </button>
        </div>
      )}

      {/* Episodes list */}
      <div className="episode-list">
        {loadingSeason && (
          <p className="text-white/50 text-sm text-center py-4">Loading episodes...</p>
        )}
        {!loadingSeason && seasonData?.Response !== 'True' && (
          <p className="text-white/50 text-sm text-center py-4">
            {seasonData?.Error || 'No episode data for this season.'}
          </p>
        )}
        {!loadingSeason && seasonData?.Response === 'True' && (seasonData.episodes || []).map(ep => (
          <label key={ep.number} className="episode-row">
            <input
              type="checkbox"
              checked={watchedSet.has(ep.number)}
              onChange={() => toggleEpisode(ep.number)}
              disabled={busy}
            />
            <span className="episode-number">E{ep.number}</span>
            <span className="episode-title">{ep.title}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default EpisodeTracker;