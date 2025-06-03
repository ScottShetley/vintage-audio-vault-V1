// client/src/pages/DetailedItemView.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';

const DetailedItemView = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get item ID from URL
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Placeholder image URL for items without photos
  const placeholderImageUrl = 'https://placehold.co/300x200/2C2C2C/E0E0E0?text=No+Image';

  // Function to fetch item details
  const fetchItemDetails = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');

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
      setItem(response.data.data.item);
    } catch (err) {
      console.error('Failed to load item details:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token'); // Clear invalid token
        navigate('/login');
      } else if (err.response && err.response.status === 404) {
        setError('Item not found.');
      } else {
        setError(err.response?.data?.message || 'Failed to load item details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to handle item deletion
  const handleDelete = async () => {
    if (!showDeleteConfirm) { // If not confirmed yet, show confirmation
      setShowDeleteConfirm(true);
      return;
    }

    setLoading(true); // Set loading state for deletion
    setError(null); // Clear previous errors
    const token = localStorage.getItem('token');

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
      console.log('Item deleted successfully!');
      navigate('/dashboard'); // Redirect to dashboard after successful deletion
    } catch (err) {
      console.error('Failed to delete item:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        navigate('/login');
      } else if (err.response && err.response.status === 404) {
        setError('Item not found for deletion.');
      } else {
        setError(err.response?.data?.message || 'Failed to delete item. Please try again.');
      }
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false); // Hide confirmation modal
    }
  };

  // Function to cancel delete confirmation
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setError(null); // Clear any error from confirmation attempt
  };

  useEffect(() => {
    fetchItemDetails();
  }, [id]); // Re-fetch if ID changes

  if (loading && !item) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <div className="flex justify-center items-center h-48">
          <svg className="animate-spin h-10 w-10 text-vav-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="ml-3 text-lg">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center p-4 bg-red-900 bg-opacity-30 rounded-md">
          <p className="text-red-400 text-lg">{error}</p>
          <Link to="/dashboard" className="mt-4 inline-block text-vav-accent-primary hover:text-vav-accent-secondary transition-colors">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg text-vav-text">Item not found.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-vav-accent-primary hover:text-vav-accent-secondary transition-colors">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    // This div is the main container for the page's content.
    // It will be centered by the <main> tag in App.jsx.
    // We apply max-w-4xl to this div, and mx-auto to center it within the <main> tag's available space.
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8">
        {/* Header section: Stacks on mobile, side-by-side on medium screens and up */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4"> {/* MODIFIED CLASSES */}
          <h1 className="text-3xl font-serif text-vav-accent-primary text-center md:text-left"> {/* Centered on mobile, left on md+ */}
            {item.make} {item.model}
          </h1>
          <Link
            to="/dashboard"
            className="text-vav-accent-primary hover:text-vav-accent-secondary transition-colors text-center md:text-right" /* Centered on mobile, right on md+ */
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center bg-red-900 bg-opacity-30 p-2 rounded">{error}</p>
        )}

        {/* Item Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
          {/* Photos Section */}
          <div className="md:col-span-2 mb-4">
            <h3 className="text-xl font-serif text-vav-text-secondary mb-3">Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {item.photoUrls && item.photoUrls.length > 0 ? (
                item.photoUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`${item.make} ${item.model} photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md shadow-sm"
                    onError={(e) => { e.target.onerror = null; e.target.src = placeholderImageUrl; }}
                  />
                ))
              ) : (
                <img
                  src={placeholderImageUrl}
                  alt="No Image Available"
                  className="w-full h-32 object-cover rounded-md shadow-sm col-span-full mx-auto"
                />
              )}
            </div>
          </div>

          {/* Basic Details */}
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

          {/* Purchase Details */}
          {item.purchaseDate && (
            <div>
              <p className="text-vav-text-secondary">Purchase Date:</p>
              <p className="text-vav-text font-medium">{new Date(item.purchaseDate).toLocaleDateString()}</p>
            </div>
          )}
          {item.purchasePrice && (
            <div>
              <p className="text-vav-text-secondary">Purchase Price:</p>
              <p className="text-vav-text font-medium">${item.purchasePrice.toFixed(2)}</p>
            </div>
          )}

          {/* Estimated Value */}
          {item.userEstimatedValue && (
            <div>
              <p className="text-vav-text-secondary">Estimated Value:</p>
              <p className="text-vav-text font-medium">${item.userEstimatedValue.toFixed(2)}</p>
            </div>
          )}
          {item.userEstimatedValueDate && (
            <div>
              <p className="text-vav-text-secondary">Value Estimation Date:</p>
              <p className="text-vav-text font-medium">{new Date(item.userEstimatedValueDate).toLocaleDateString()}</p>
            </div>
          )}

          {/* Specifications and Notes */}
          {(item.specifications || item.notes) && (
            <div className="md:col-span-2 mt-4">
              {item.specifications && (
                <div className="mb-4">
                  <h3 className="text-vav-text-secondary text-base font-medium mb-1">Specifications:</h3>
                  <p className="text-vav-text whitespace-pre-wrap">{item.specifications}</p>
                </div>
              )}
              {item.notes && (
                <div>
                  <h3 className="text-vav-text-secondary text-base font-medium mb-1">Notes:</h3>
                  <p className="text-vav-text whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Link
            to={`/edit-item/${item._id}`}
            className="bg-vav-accent-primary text-vav-background font-semibold py-2 px-6 rounded-md shadow-md hover:bg-vav-accent-secondary transition-colors duration-150 ease-in-out"
          >
            Edit Item
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-700 text-white font-semibold py-2 px-6 rounded-md shadow-md hover:bg-red-800 transition-colors duration-150 ease-in-out"
          >
            Delete Item
          </button>
        </div>

        {/* Delete Confirmation Modal/Overlay */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-vav-content-card p-8 rounded-lg shadow-xl text-center">
              <p className="text-lg text-vav-text mb-6">Are you sure you want to delete this item?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 text-white font-semibold py-2 px-6 rounded-md shadow-md hover:bg-red-700 transition-colors duration-150 ease-in-out disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={cancelDelete}
                  disabled={loading}
                  className="bg-gray-600 text-white font-semibold py-2 px-6 rounded-md shadow-md hover:bg-gray-700 transition-colors duration-150 ease-in-out disabled:opacity-50"
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