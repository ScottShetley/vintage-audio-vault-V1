// client/src/pages/DetailedItemView.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';

const DetailedItemView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  
  const placeholderImageUrl = 'https://placehold.co/300x200/2C2C2C/E0E0E0?text=No+Image';

  // *** THE FIX: All instances of 'token' are replaced with 'authToken' ***
  const fetchItemDetails = async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('authToken'); // CORRECT KEY

    if (!token) {
      setError('Authorization token not found. Please login.');
      setLoading(false);
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/api/items/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setItem(response.data);
    } catch (err) {
      console.error('Failed to load item details:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('authToken'); // CORRECT KEY
        navigate('/login');
      } else if (err.response && err.response.status === 404) {
        setError('Item not found.');
      } else {
        setError(err.response?.data?.message || 'Failed to load item details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setLoading(true);
    setError(null);
    const token = localStorage.getItem('authToken'); // CORRECT KEY

    if (!token) {
      setError('Authorization token not found. Please login.');
      setLoading(false);
      navigate('/login');
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/items/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to delete item:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('authToken'); // CORRECT KEY
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to delete item.');
      }
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };
  
  const handleGetAndSaveAiEvaluation = async () => {
    setAiLoading(true);
    setAiError(null);
    const token = localStorage.getItem('authToken'); // CORRECT KEY

    if (!token) {
      setAiError('Authorization token not found. Please login.');
      setAiLoading(false);
      navigate('/login');
      return;
    }

    try {
      const response = await axios.patch(`http://localhost:5000/api/items/${id}/ai-evaluation`, 
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setItem(response.data);
    } catch (err) {
      console.error('Failed to get AI evaluation:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('authToken'); // CORRECT KEY
        navigate('/login');
      } else {
        setAiError(err.response?.data?.message || 'Failed to get AI evaluation.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchItemDetails();
  }, [id]);

  if (loading && !item) {
    return <div className="text-center p-8">Loading item details...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }
  
  if (!item) {
    return <div className="text-center p-8">Item not found.</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-serif text-vav-accent-primary text-center md:text-left">
            {item.make} {item.model}
          </h1>
          <Link
            to="/dashboard"
            className="text-vav-accent-primary hover:text-vav-accent-secondary transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
          <div className="md:col-span-2 mb-4">
            <h3 className="text-xl font-serif text-vav-text-secondary mb-3">Photo</h3>
            <img
              src={item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls[0] : placeholderImageUrl}
              alt={`${item.make} ${item.model}`}
              className="w-full h-auto max-h-96 object-contain rounded-md shadow-sm"
              onError={(e) => { e.target.onerror = null; e.target.src = placeholderImageUrl; }}
            />
          </div>

          <div>
            <p className="text-vav-text-secondary">Item Type:</p>
            <p className="text-vav-text font-medium">{item.itemType}</p>
          </div>
          <div>
            <p className="text-vav-text-secondary">Condition:</p>
            <p className="text-vav-text font-medium">{item.condition}</p>
          </div>
          <div>
            <p className="text-vav-text-secondary">Fully Functional:</p>
            <p className="text-vav-text font-medium">{item.isFullyFunctional ? 'Yes' : 'No'}</p>
          </div>
          {!item.isFullyFunctional && item.issuesDescription && (
            <div>
              <p className="text-vav-text-secondary">Issues Description:</p>
              <p className="text-vav-text font-medium whitespace-pre-wrap">{item.issuesDescription}</p>
            </div>
          )}
          {item.notes && (
            <div className="md:col-span-2 mt-4">
              <h3 className="text-vav-text-secondary text-base font-medium mb-1">Notes:</h3>
              <p className="text-vav-text whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-vav-text-secondary">
          <h3 className="text-xl font-serif text-vav-accent-primary mb-4">AI Insights</h3>
          {aiError && (
            <p className="text-red-500 text-sm mb-4 text-center p-2 rounded">{aiError}</p>
          )}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={handleGetAndSaveAiEvaluation}
              disabled={aiLoading}
              className="bg-vav-accent-primary text-vav-background font-semibold py-2 px-4 rounded-md shadow-md hover:bg-vav-accent-secondary transition-colors disabled:opacity-50"
            >
              {aiLoading ? 'Evaluating...' : 'Get AI Evaluation'}
            </button>
          </div>

          {item.aiValueInsight && (
            <div className="bg-vav-background p-4 rounded-md mb-4">
              <p className="text-vav-text-secondary text-base mb-2 text-center">AI Market Valuation:</p>
              {item.aiValueInsight.estimatedValueUSD && <p className="text-vav-accent-primary text-xl font-bold mb-2 text-center">{item.aiValueInsight.estimatedValueUSD}</p>}
              {item.aiValueInsight.marketDesirability && <p className="text-vav-text text-sm">{item.aiValueInsight.marketDesirability}</p>}
              {item.aiValueInsight.disclaimer && <p className="text-vav-text-secondary text-xs text-center mt-2">{item.aiValueInsight.disclaimer}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-8 pt-6 border-t border-vav-text-secondary">
          <Link
            to={`/edit-item/${item._id}`}
            className="bg-vav-accent-primary text-vav-background font-semibold py-2 px-6 rounded-md shadow-md hover:bg-vav-accent-secondary"
          >
            Edit Item
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-700 text-white font-semibold py-2 px-6 rounded-md shadow-md hover:bg-red-800"
          >
            Delete Item
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-vav-content-card p-8 rounded-lg shadow-xl text-center">
              <p className="text-lg text-vav-text mb-6">Delete {item.make} {item.model}?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                  className="bg-gray-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailedItemView;