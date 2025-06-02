// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to handle fetching items
  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');

    if (!token) {
      setError('Authorization token not found. Please login.');
      setLoading(false);
      navigate('/login'); // Redirect to login if no token
      return;
    }

    try {
      const response = await axios.get('http://localhost:5000/api/items', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setItems(response.data.data.items); // Assuming response.data.data.items structure
    } catch (err) {
      console.error('Failed to load items:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        // Token invalid or expired, redirect to login
        localStorage.removeItem('token'); // Clear invalid token
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to load items. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // useEffect to fetch items on component mount
  useEffect(() => {
    fetchItems();
  }, []); // Empty dependency array means this runs once on mount

  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem('token'); // Remove JWT token
    navigate('/login'); // Redirect to login page
  };

  // Placeholder image URL for items without photos
  const placeholderImageUrl = 'https://placehold.co/150x150/2C2C2C/E0E0E0?text=No+Image';

  return (
    <div className="bg-vav-background text-vav-text p-6 min-h-screen flex flex-col items-center w-full">
      <div className="w-full max-w-6xl"> {/* Wider container for dashboard content */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-serif text-vav-accent-primary">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-vav-accent-secondary text-white px-4 py-2 rounded-md shadow-md hover:opacity-90 transition-opacity"
          >
            Logout
          </button>
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
                {/* Add more item details here as needed for the card */}
                {/* Example: <p className="text-xs text-vav-text">Condition: {item.condition}</p> */}
                {/* Link to detailed item view (to be implemented later) */}
                <Link
                  to={`/item/${item._id}`} // Example: /item/123
                  className="mt-2 text-sm text-vav-accent-primary hover:text-vav-accent-secondary transition-colors"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;