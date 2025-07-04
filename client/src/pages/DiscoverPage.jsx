// client/src/pages/DiscoverPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ItemCard from '../components/ItemCard';

const DISCOVER_PAGE_LIMIT = 20;

const DiscoverPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchDiscoverItems = useCallback(async (currentPage) => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('authToken');
    if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
    }

    try {
      const { data } = await axios.get(`/api/items/discover`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { page: currentPage, limit: DISCOVER_PAGE_LIMIT },
      });

      if (data.length > 0) {
        if (currentPage === 1) {
          setItems(data);
        } else {
          setItems(prevItems => [...prevItems, ...data]);
        }
        
        setHasMore(data.length === DISCOVER_PAGE_LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load discover data:', err);
      setError(err.response?.data?.message || 'Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscoverItems(1);
  }, [fetchDiscoverItems]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDiscoverItems(nextPage);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-serif text-vav-accent-primary">Discover</h1>
        <p className="text-lg text-vav-text-secondary mt-2">Browse items and finds from all users in the vault.</p>
        <p className="text-sm text-vav-text-secondary mt-4 italic">
          Want to contact a seller? An in-app messaging system is planned for a future update!
        </p>
      </div>

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
            No public items found in the vault yet. Be the first to add one!
          </p>
        </div>
      )}

      {hasMore && !loading && items.length > 0 && (
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

export default DiscoverPage;