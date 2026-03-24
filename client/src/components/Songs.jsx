import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import './Movies.css';

function Songs() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumDetails, setAlbumDetails] = useState(null);

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/songs`);
      const data = await res.json();
      if (data.Response === 'True') {
        setAlbums(data.results || []);
      }
    } catch (e) {
      console.error('Failed to fetch albums:', e);
    }
    setLoading(false);
  };

  const searchAlbums = async () => {
    if (!searchQuery.trim()) {
      fetchAlbums();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/songs/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setAlbums(data.results || []);
      } else {
        setAlbums([]);
      }
    } catch (e) {
      console.error('Failed to search albums:', e);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchAlbums();
    }
  };

  const handleAlbumSelect = async (album) => {
    setSelectedAlbum(album);
    setAlbumDetails(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/songs/${album.id}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setAlbumDetails(data);
      }
    } catch (e) {
      console.error('Failed to fetch album details:', e);
    }
  };

  const closeModal = () => {
    setSelectedAlbum(null);
    setAlbumDetails(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gold-gradient">🎵 Browse Albums</h2>
        <p className="text-white/50 mt-2">Search for albums to review</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 mb-8 max-w-2xl mx-auto">
        <input
          type="text"
          placeholder="Search albums or artists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="input flex-1"
        />
        <button onClick={searchAlbums} className="btn btn-primary">
          Search
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl crown-animate inline-block">👑</div>
          <p className="text-yellow-400 mt-4">Loading albums...</p>
        </div>
      )}

      {/* Albums Grid */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {albums.length > 0 ? (
            albums.map(album => (
              <div
                key={album.id}
                className="card cursor-pointer overflow-hidden group"
                onClick={() => handleAlbumSelect(album)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={album.poster || 'https://via.placeholder.com/200x200?text=No+Cover'}
                    alt={album.title}
                    className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-3">
                  <h4 className="text-white font-semibold text-sm truncate">{album.title}</h4>
                  <p className="text-white/50 text-xs truncate">{album.artist}</p>
                  <p className="text-white/30 text-xs mt-1">{album.year}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-white/50 text-lg">No albums found</p>
              <p className="text-white/30 text-sm mt-2">Try searching for something else</p>
            </div>
          )}
        </div>
      )}

      {/* Album Detail Modal */}
      {selectedAlbum && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="glass max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-3xl gold-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-all hover:rotate-90 duration-300"
              onClick={closeModal}
            >
              ×
            </button>

            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
              <img
                src={selectedAlbum.poster || 'https://via.placeholder.com/280x280?text=No+Cover'}
                alt={selectedAlbum.title}
                className="w-48 h-48 md:w-64 md:h-64 rounded-2xl shadow-2xl mx-auto md:mx-0 object-cover"
              />

              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                  {selectedAlbum.title}
                </h3>
                <p className="text-yellow-400 text-lg mb-2">{selectedAlbum.artist}</p>
                <p className="text-white/50 text-sm mb-4">{selectedAlbum.year}</p>

                {albumDetails?.genre && (
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm mb-4">
                    {albumDetails.genre}
                  </span>
                )}

                {albumDetails?.tracks && albumDetails.tracks.length > 0 && (
                  <div className="mb-4">
                    <p className="text-white/70 text-sm mb-2">Tracks:</p>
                    <ul className="text-white/50 text-sm space-y-1 max-h-32 overflow-y-auto">
                      {albumDetails.tracks.slice(0, 10).map((track, i) => (
                        <li key={track.id || i}>{i + 1}. {track.title}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {user ? (
                  <Link
                    to={`/category/songs/new?title=${encodeURIComponent(`${selectedAlbum.title} - ${selectedAlbum.artist}`)}&description=${encodeURIComponent(albumDetails?.genre || '')}`}
                    className="btn btn-primary mt-4 inline-flex"
                  >
                    ✍️ Write a Review
                  </Link>
                ) : (
                  <Link to="/login" className="btn btn-primary mt-4 inline-flex">
                    Login to Review
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Songs;