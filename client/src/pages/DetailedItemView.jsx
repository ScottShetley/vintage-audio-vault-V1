// client/src/pages/DetailedItemView.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';
import AiAnalysisDisplay from '../components/AiAnalysisDisplay';
import { IoInformationCircle } from 'react-icons/io5';

const DetailedItemView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // --- VAV-UPDATE ---
  // Added a new loading state for the accept correction button
  const [isAccepting, setIsAccepting] = useState(false);

  const placeholderImageUrl = 'https://placehold.co/300x200/2C2C2C/E0E0E0?text=No+Image';

  const fetchItemDetails = async () => {
    // No setLoading(true) here to allow for smoother updates after accepting
    setError(null);
    const token = localStorage.getItem('authToken');

    if (!token) {
      setError('Authorization token not found. Please login.');
      setLoading(false);
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`/api/items/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setItem(response.data);
    } catch (err) {
      console.error('Failed to load item details:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('authToken');
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
    const token = localStorage.getItem('authToken');

    if (!token) {
      setError('Authorization token not found. Please login.');
      setLoading(false);
      navigate('/login');
      return;
    }

    try {
      await axios.delete(`/api/items/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigate('/dashboard');
    } catch (err) {
      // ... (error handling)
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };
  
  // --- VAV-UPDATE ---
  // New handler function for the "Accept Suggestion" button
  const handleAcceptCorrection = async () => {
    setIsAccepting(true);
    setError(null);
    const token = localStorage.getItem('authToken');

    try {
        await axios.patch(`/api/items/${id}/accept-correction`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        // After accepting, navigate directly to the edit page for further refinement
        navigate(`/edit-item/${id}`);
    } catch (err) {
        console.error('Failed to accept correction:', err);
        setError(err.response?.data?.message || 'Failed to accept AI suggestion.');
        setIsAccepting(false);
    }
  };

  useEffect(() => {
    if (id) {
        setLoading(true);
        fetchItemDetails();
    }
  }, [id]);

  if (loading) {
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

        {item.identification && item.identification.wasCorrected && (
          <div className="bg-yellow-900 bg-opacity-30 border-l-4 border-yellow-500 text-yellow-200 p-4 my-6 rounded-r-lg shadow" role="alert">
            <div className="flex items-start">
              <div className="py-1">
                <IoInformationCircle className="h-6 w-6 text-yellow-400 mr-4"/>
              </div>
              <div className="flex-grow">
                <p className="font-bold text-yellow-300">AI Suggestion</p>
                <p className="text-sm">
                  You entered <strong>{item.identification.userInput}</strong>, but the AI identified this as an <strong>{item.identification.aiIdentifiedAs}</strong> from the photo.
                </p>
              </div>
              {/* --- VAV-UPDATE: New Button --- */}
              <button
                onClick={handleAcceptCorrection}
                disabled={isAccepting}
                className="ml-4 flex-shrink-0 bg-yellow-500 text-black font-bold py-1 px-3 rounded-md text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {isAccepting ? 'Accepting...' : 'Accept & Edit'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
          {/* ... (rest of the item details display remains the same) ... */}
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

        <div className="mt-8 pt-6 border-t border-vav-text-secondary/50">
          <h3 className="text-2xl font-serif text-vav-accent-primary mb-4 text-center">AI Analysis</h3>
          {item.aiAnalysis ? (
            <AiAnalysisDisplay analysis={item.aiAnalysis} />
          ) : (
            <p className="text-vav-text-secondary text-center p-4 bg-vav-background rounded-md">
              AI analysis has not yet been generated for this item.
            </p>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-8 pt-6 border-t border-vav-text-secondary/50">
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