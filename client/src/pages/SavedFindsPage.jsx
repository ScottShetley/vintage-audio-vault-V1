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
        const response = await axios.get('http://localhost:5000/api/wild-finds', {
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
  }, []);

  const getFindTitle = (find) => {
    if (find.findType === 'Ad Analysis' && find.adAnalysis) {
        return `${find.adAnalysis.identifiedMake} ${find.adAnalysis.identifiedModel}`;
    }
    if (find.findType === 'Wild Find' && find.analysis) {
        return find.analysis.identifiedItem;
    }
    return 'Unknown Item';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-serif text-vav-accent-primary">My Saved Finds</h1>
      </div>

      {loading && <div className="text-center text-lg">Loading your finds...</div>}
      {error && <div className="text-center text-red-400 text-lg p-4 bg-red-900 bg-opacity-30 rounded-md">{error}</div>}

      {!loading && !error && finds.length === 0 && (
        <div className="text-center mt-8 p-6 bg-vav-content-card rounded-lg shadow-md">
          <p className="text-vav-text text-lg">You haven't saved any finds yet.</p>
        </div>
      )}

      {!loading && !error && finds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {finds.map((find) => (
            <div key={find._id} className="bg-vav-content-card rounded-lg shadow-md flex flex-col transition-transform duration-300 hover:scale-105 relative">
              <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${find.findType === 'Ad Analysis' ? 'bg-blue-600' : 'bg-green-600'}`}>
                {find.findType}
              </div>

              <Link to={`/wild-find-details/${find._id}`} className="flex flex-col h-full p-4">
                <img
                  src={find.imageUrl}
                  alt={getFindTitle(find)}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
                <h3 className="font-serif text-vav-accent-primary text-lg font-bold text-center">
                  {getFindTitle(find)}
                </h3>
              </Link>
              
              {find.findType === 'Ad Analysis' && find.sourceUrl && (
                  <div className="p-4 border-t border-vav-background-alt mt-auto">
                    <a href={find.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-vav-accent-secondary hover:text-vav-accent-primary font-semibold text-center block">
                        View Original Ad &rarr;
                    </a>
                  </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedFindsPage;