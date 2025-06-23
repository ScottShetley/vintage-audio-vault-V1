// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// 1. Accept token as a prop
const DashboardPage = ({ token }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. useEffect now depends on the token
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.get('http://localhost:5000/api/items', {
          headers: {
            // 3. Use the token from props for authorization
            Authorization: `Bearer ${token}`,
          },
        });
        setItems(response.data);
      } catch (err) {
        console.error('Failed to load items:', err);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          // Clear invalid token using the correct key
          localStorage.removeItem('authToken');
          navigate('/login');
        } else {
          setError(err.response?.data?.message || 'Failed to load items. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch items if a token exists
    if (token) {
      fetchItems();
    } else {
      // If no token, don't try to fetch. Clear items and stop loading.
      setItems([]);
      setLoading(false);
    }
  }, [token, navigate]); // Dependency array now includes token and navigate

  // 4. Redundant handleLogout function has been removed

  const placeholderImageUrl = 'https://placehold.co/150x150/2C2C2C/E0E0E0?text=No+Image';

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-4xl font-serif text-vav-accent-primary text-center md:text-left">Dashboard</h1>
        {/* 5. The redundant logout button is removed, Add Item remains */}
        <Link
          to="/add-item"
          className="bg-vav-accent-primary text-vav-background px-4 py-2 rounded-md shadow-md hover:bg-vav-accent-secondary transition-colors duration-150 ease-in-out flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Item
        </Link>
      </div>

      <h2 className="text-2xl font-serif text-vav-text-secondary mb-6 text-center">Your Vintage Audio Collection</h2>

      {loading && (
        <div className="flex justify-center items-center h-48">
          <svg className="animate-spin h-10 w-10 text-vav-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="ml-3 text-lg">Loading your collection...</p>
        </div>
      )}

      {error && (
        <div className="text-center p-4 bg-red-900 bg-opacity-30 rounded-md">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center mt-8 p-6 bg-vav-content-card rounded-lg shadow-md">
          <p className="text-vav-text text-lg mb-4">
            No items in your collection yet.
          </p>
          <Link
            to="/add-item"
            className="inline-block bg-vav-accent-primary text-vav-background font-semibold py-2 px-6 rounded-md shadow-md hover:bg-vav-accent-secondary transition-colors duration-150 ease-in-out"
          >
            + Add Your First Item
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-vav-content-card p-4 rounded-lg shadow-md flex flex-col items-center text-center space-y-2"
            >
              <img
                src={item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls[0] : placeholderImageUrl}
                alt={`${item.make} ${item.model}`}
                className="w-full h-32 object-cover rounded-md mb-2"
                onError={(e) => { e.target.onerror = null; e.target.src = placeholderImageUrl; }} // Fallback on error
              />
              <h3 className="font-serif text-vav-accent-primary text-lg font-bold">
                {item.make} {item.model}
              </h3>
              <p className="text-sm text-vav-text-secondary">{item.itemType}</p>
              <Link
                to={`/item/${item._id}`}
                className="mt-2 text-sm text-vav-accent-primary hover:text-vav-accent-secondary transition-colors"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;