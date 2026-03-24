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
  const [selectedTrack, setSelectedTrack] = useState(null);

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
    setSelectedTrack(null);
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
    setSelectedTrack(null);
  };

  const handleTrackClick = (track) => {
    setSelectedTrack(track);
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {albums.length > 0 ? (
            albums.map(album => (
              <div
                key={album.id}
                className="card cursor-pointer overflow-hidden group"
                onClick={() => handleAlbumSelect(album)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={album.poster || 'https://via.placeholder.com/100x100?text=No+Cover'}
                    alt={album.title}
                    className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-2">
                  <h4 className="text-white font-medium text-xs truncate">{album.title}</h4>
                  <p className="text-white/50 text-xs truncate">{album.artist}</p>
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
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="glass max-w-md w-full max-h-[85vh] overflow-y-auto rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition-all z-10"
              onClick={closeModal}
            >
              ×
            </button>

            <div className="p-5 flex flex-col items-center text-center">
              <img
                src={selectedAlbum.poster || 'https://via.placeholder.com/200x200?text=No+Cover'}
                alt={selectedAlbum.title}
                className="w-32 h-32 rounded-xl shadow-lg mb-3"
              />

              <h3 className="text-lg font-bold text-white mb-1">
                {selectedAlbum.title}
              </h3>
              <p className="text-yellow-400 text-sm mb-1">{selectedAlbum.artist}</p>
              <p className="text-white/50 text-xs mb-3">{selectedAlbum.year}</p>

              {albumDetails?.genre && (
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs mb-3">
                  {albumDetails.genre}
                </span>
              )}

              {/* Review Album Button */}
              {user ? (
                <Link
                  to={`/category/songs/new?title=${encodeURIComponent(`${selectedAlbum.title} - ${selectedAlbum.artist}`)}&description=${encodeURIComponent(albumDetails?.genre || '')}`}
                  className="btn btn-primary text-sm py-2 px-4 mb-4 w-full"
                >
                  💿 Review Album
                </Link>
              ) : (
                <Link to="/login" className="btn btn-primary text-sm py-2 px-4 mb-4 w-full">
                  Login to Review
                </Link>
              )}

              {/* Tracks List */}
              {albumDetails?.tracks && albumDetails.tracks.length > 0 && (
                <div className="w-full text-left">
                  <p className="text-white/70 text-xs mb-2 font-medium">Or review a track:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {albumDetails.tracks.map((track, i) => (
                      <div
                        key={track.id || i}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedTrack === track
                            ? 'bg-yellow-500/20 border border-yellow-500/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                        onClick={() => handleTrackClick(track)}
                      >
                        <p className="text-white text-sm truncate">
                          <span className="text-white/50 mr-2">{i + 1}.</span>
                          {track.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Track Review Button */}
              {selectedTrack && user && (
                <Link
                  to={`/category/songs/new?title=${encodeURIComponent(`${selectedTrack.title} - ${selectedAlbum.artist}`)}&description=${encodeURIComponent(`${selectedAlbum.title} album`)}`}
                  className="btn btn-secondary text-sm py-2 px-4 mt-3 w-full"
                >
                  🎵 Review "{selectedTrack.title}"
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Songs;