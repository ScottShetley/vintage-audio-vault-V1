// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const getFindTitle = (find) => {
  if (find.findType === 'Ad Analysis' && find.adAnalysis) {
      return `${find.adAnalysis.identifiedMake} ${find.adAnalysis.identifiedModel}`;
  }
  if (find.findType === 'Wild Find' && find.analysis) {
      return find.analysis.identifiedItem;
  }
  return 'Unknown Item';
};

const tagColors = {
  'My Collection': 'bg-purple-600',
  'Wild Find': 'bg-green-600',
  'Ad Analysis': 'bg-blue-600',
};

const DashboardPage = ({ token }) => {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const personalItemsPromise = axios.get('/api/items', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const savedFindsPromise = axios.get('/api/wild-finds', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const [personalItemsResponse, savedFindsResponse] = await Promise.all([
          personalItemsPromise,
          savedFindsPromise,
        ]);

        const placeholderImageUrl = 'https://placehold.co/150x150/2C2C2C/E0E0E0?text=No+Image';

        const normalizedPersonalItems = personalItemsResponse.data.map(item => ({
          id: item._id,
          title: `${item.make} ${item.model}`,
          imageUrl: item.photoUrls?.[0] || placeholderImageUrl,
          tag: 'My Collection',
          detailPath: `/item/${item._id}`,
          createdAt: item.createdAt,
          userId: item.user?._id,
          username: item.user?.username,
        }));
        
        const normalizedSavedFinds = savedFindsResponse.data.map(find => ({
          id: find._id,
          title: getFindTitle(find),
          imageUrl: find.imageUrl || placeholderImageUrl,
          tag: find.findType,
          detailPath: `/wild-find-details/${find._id}`,
          createdAt: find.createdAt,
          userId: find.user?._id,
          username: find.user?.username,
        }));

        let combined = [...normalizedPersonalItems, ...normalizedSavedFinds];
        
        combined.sort((a, b) => {
          if (a.tag === 'My Collection' && b.tag !== 'My Collection') return -1;
          if (a.tag !== 'My Collection' && b.tag === 'My Collection') return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        setAllItems(combined);

      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem('authToken');
          navigate('/login');
        } else {
          setError(err.response?.data?.message || 'Failed to load dashboard data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAllData();
    } else {
      setAllItems([]);
      setLoading(false);
    }
  }, [token, navigate]);

  const filteredItems = allItems.filter(item => {
    if (activeTab === 'All') return true;
    if (activeTab === 'My Collection') return item.tag === 'My Collection';
    if (activeTab === 'Saved Finds') return item.tag === 'Wild Find' || item.tag === 'Ad Analysis';
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-4xl font-serif text-vav-accent-primary text-center md:text-left">Dashboard</h1>
        <Link
          to="/add-item"
          className="bg-vav-accent-primary text-vav-background px-4 py-2 rounded-md shadow-md hover:bg-vav-accent-secondary transition-colors duration-150 ease-in-out flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add to Collection
        </Link>
      </div>

      <div className="mb-8 border-b border-vav-text-secondary/20 flex justify-center space-x-2 sm:space-x-4">
        {['All', 'My Collection', 'Saved Finds'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors border-b-2 
              ${activeTab === tab 
                ? 'border-vav-accent-primary text-vav-accent-primary' 
                : 'border-transparent text-vav-text-secondary hover:text-vav-text'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center items-center h-48">
          <svg className="animate-spin h-10 w-10 text-vav-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="ml-3 text-lg">Loading your universe...</p>
        </div>
      )}

      {error && (
        <div className="text-center p-4 bg-red-900 bg-opacity-30 rounded-md">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      )}

      {!loading && !error && filteredItems.length === 0 && (
        <div className="text-center mt-8 p-6 bg-vav-content-card rounded-lg shadow-md">
          <p className="text-vav-text text-lg mb-4">
            No items found in this category.
          </p>
          {activeTab === 'My Collection' && 
             <Link
              to="/add-item"
              className="inline-block bg-vav-accent-primary text-vav-background font-semibold py-2 px-6 rounded-md shadow-md hover:bg-vav-accent-secondary transition-colors duration-150 ease-in-out"
            >
              + Add Your First Item
            </Link>
          }
        </div>
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-vav-content-card rounded-lg shadow-lg flex flex-col transition-transform duration-300 hover:scale-105 group"
            >
              <div className="relative">
                <Link to={item.detailPath}>
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x150/2C2C2C/E0E0E0?text=No+Image'; }}
                  />
                </Link>
                <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${tagColors[item.tag] || 'bg-gray-500'}`}>
                  {item.tag}
                </div>
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-serif text-vav-accent-primary text-lg font-bold text-center">
                  {item.title}
                </h3>
                {item.username && item.userId && (
                  <p className="text-xs text-center text-vav-text-secondary mt-1 mb-2">
                    by <Link to={`/profile/${item.userId}`} className="hover:underline hover:text-vav-accent-secondary transition-colors">{item.username}</Link>
                  </p>
                )}
                <div className="flex-grow"></div>
                <Link
                  to={item.detailPath}
                  className="mt-auto text-sm text-center text-vav-accent-secondary group-hover:text-vav-accent-primary font-semibold transition-colors"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;