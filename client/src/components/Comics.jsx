import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import ListActions from './ListActions';
import './Movies.css';

function Comics() {
  const { user } = useAuth();
  const [comics, setComics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedComic, setSelectedComic] = useState(null);
  const [comicDetails, setComicDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchComics();
  }, []);

  const fetchComics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/comics`);
      const data = await res.json();
      if (data.Response === 'True') {
        setComics(data.results || []);
      } else {
        setComics([]);
        if (data.Error) setError(data.Error);
      }
    } catch (e) {
      console.error('Failed to fetch comics:', e);
      setError('Failed to load comics');
    }
    setLoading(false);
  };

  const searchComics = async () => {
    if (!searchQuery.trim()) {
      fetchComics();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/comics/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setComics(data.results || []);
      } else {
        setComics([]);
      }
    } catch (e) {
      console.error('Failed to search comics:', e);
      setError('Failed to search comics');
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchComics();
    }
  };

  const handleComicSelect = async (comic) => {
    setSelectedComic(comic);
    setComicDetails(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/comics/${comic.id}`);
      const data = await res.json();
      if (data.Response === 'True') {
        setComicDetails(data);
      }
    } catch (e) {
      console.error('Failed to fetch comic details:', e);
    }
  };

  const closeModal = () => {
    setSelectedComic(null);
    setComicDetails(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gold-gradient">📚 Browse Comics</h2>
        <p className="text-white/50 mt-2">Search for comics and graphic novels to review</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 mb-8 max-w-2xl mx-auto">
        <input
          type="text"
          placeholder="Search comics or authors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="input flex-1"
        />
        <button onClick={searchComics} className="btn btn-primary">
          Search
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl crown-animate inline-block">👑</div>
          <p className="text-yellow-400 mt-4">Loading comics...</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-12">
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl max-w-xl mx-auto">
            <p className="font-semibold mb-2">⚠️ Comics Unavailable</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Comics Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {comics.length > 0 ? (
            comics.map(comic => (
              <div
                key={comic.id}
                className="card cursor-pointer overflow-hidden group p-3"
                onClick={() => handleComicSelect(comic)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg opacity-70 group-hover:opacity-100 transition-opacity">📚</span>
                  <h4 className="text-white font-semibold text-sm truncate">{comic.title}</h4>
                </div>
                <p className="text-white/50 text-xs truncate">{comic.author}</p>
                {comic.year && (
                  <span className="text-white/30 text-xs">{comic.year}</span>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-white/50 text-lg">No comics found</p>
              <p className="text-white/30 text-sm mt-2">Try searching for something else</p>
            </div>
          )}
        </div>
      )}

      {/* Comic Detail Modal */}
      {selectedComic && (
        <div
          className="fixed inset-0 modal-overlay-solid flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="modal-solid max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl transition-all z-10"
              onClick={closeModal}
            >
              ×
            </button>

            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
              <img
                src={comicDetails?.poster || selectedComic.poster || 'https://via.placeholder.com/280x420?text=No+Cover'}
                alt={selectedComic.title}
                className="w-44 md:w-52 h-auto rounded-2xl shadow-2xl mx-auto md:mx-0 object-cover"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/280x420?text=No+Cover'; }}
              />

              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {selectedComic.title}
                </h3>

                <p className="text-yellow-400 text-sm mb-3">
                  ✍️ {comicDetails?.author || selectedComic.author}
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                  {(comicDetails?.year || selectedComic.year) && (
                    <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">
                      {comicDetails?.year || selectedComic.year}
                    </span>
                  )}
                </div>

                {comicDetails?.subjects && comicDetails.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {comicDetails.subjects.map((subject, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                        {subject}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-white/60 mt-4 leading-relaxed">
                  {comicDetails?.description || 'No description available.'}
                </p>

                {user ? (
                  <Link
                    to={`/category/comics/new?title=${encodeURIComponent(selectedComic.title)}&description=${encodeURIComponent(comicDetails?.author || selectedComic.author)}`}
                    className="btn btn-primary mt-6 inline-flex"
                  >
                    ✍️ Write a Review
                  </Link>
                ) : (
                  <Link to="/login" className="btn btn-primary mt-6 inline-flex">
                    Login to Review
                  </Link>
                )}

                <ListActions
                  item={{ id: selectedComic.id, title: selectedComic.title, year: selectedComic.year, poster: selectedComic.poster }}
                  category="comics"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Comics;