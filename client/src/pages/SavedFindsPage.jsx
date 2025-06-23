// client/src/pages/SavedFindsPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const SavedFindsPage = () => {
  const [finds, setFinds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSavedFinds = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('You must be logged in to view your saved finds.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/api/wild-finds', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setFinds(response.data);
      } catch (err) {
        console.error('Error fetching saved finds:', err);
        setError(err.response?.data?.message || 'Failed to load your saved finds.');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedFinds();
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-serif text-vav-accent-primary">My Saved Finds</h1>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-48">
          <svg className="animate-spin h-10 w-10 text-vav-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="ml-3 text-lg">Loading your finds...</p>
        </div>
      )}

      {error && (
        <div className="text-center p-4 bg-red-900 bg-opacity-30 rounded-md">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      )}

      {!loading && !error && finds.length === 0 && (
        <div className="text-center mt-8 p-6 bg-vav-content-card rounded-lg shadow-md">
          <p className="text-vav-text text-lg">You haven't saved any "Wild Finds" yet.</p>
        </div>
      )}

      {!loading && !error && finds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {finds.map((find) => (
            <Link to={`/wild-find-details/${find._id}`} key={find._id} className="bg-vav-content-card p-4 rounded-lg shadow-md flex flex-col items-center text-center space-y-2 transition-transform duration-300 hover:scale-105">
              <img
                src={find.imageUrl}
                alt={find.analysis.identifiedItem}
                className="w-full h-48 object-cover rounded-md mb-2"
              />
              <h3 className="font-serif text-vav-accent-primary text-lg font-bold">
                {find.analysis.identifiedItem}
              </h3>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedFindsPage;