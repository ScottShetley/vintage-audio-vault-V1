// client/src/pages/FeedPage.jsx (Final Correct Version)
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ItemCard from '/src/components/ItemCard.jsx';

const FEED_PAGE_LIMIT = 20;

const FeedPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeedItems = useCallback(async (pageToFetch) => {
    if (pageToFetch === 1) {
      setLoading(true);
    }
    setError(null);
    const token = localStorage.getItem('authToken');

    try {
      const { data } = await axios.get(`/api/users/feed`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: pageToFetch, limit: FEED_PAGE_LIMIT },
      });

      // --- UPDATED LOGIC ---
      // No more normalization needed here! The server has already prepared the data.
      if (data.length > 0) {
        setItems(prevItems => {
          if (pageToFetch === 1) {
            return data; // Replace items for the first page
          }
          // For subsequent pages, filter out any potential duplicates before appending
          const existingIds = new Set(prevItems.map(i => i.id));
          const newItems = data.filter(i => !existingIds.has(i.id));
          return [...prevItems, ...newItems];
        });
        setHasMore(data.length === FEED_PAGE_LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load feed data:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('authToken');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to load your feed. Please try again.');
      }
    } finally {
      if (pageToFetch === 1) {
        setLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchFeedItems(1);
  }, [fetchFeedItems]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeedItems(nextPage);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-serif text-vav-accent-primary">Your Feed</h1>
      </div>
      <p className="mb-8 text-vav-text-secondary border-b border-vav-text-secondary/20 pb-4">
        The latest public items from users you follow.
      </p>

      {error && (
        <div className="text-center p-4 bg-red-900 bg-opacity-30 rounded-md">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center h-48">
          <svg className="animate-spin h-10 w-10 text-vav-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="ml-3 text-lg">Loading items...</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center mt-8 p-6 bg-vav-content-card rounded-lg shadow-md">
          <p className="text-vav-text text-lg mb-4">
            Your feed is empty. Find and follow users to see their public items here.
          </p>
        </div>
      )}

      {hasMore && !loading && (
        <div className="text-center mt-10">
          <button
            onClick={handleLoadMore}
            className="bg-vav-accent-primary text-vav-background px-6 py-3 rounded-md shadow-md hover:bg-vav-accent-secondary transition-colors duration-150 ease-in-out font-semibold"
            disabled={loading}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedPage;