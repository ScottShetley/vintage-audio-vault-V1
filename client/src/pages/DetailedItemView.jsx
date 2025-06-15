// client/src/pages/DetailedItemView.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';

const DetailedItemView = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get item ID from URL
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true); // For initial item fetch
  const [error, setError] = useState(null); // For item fetch errors
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // AI Feature States
  const [aiLoading, setAiLoading] = useState(false);     // For AI call loading
  const [aiError, setAiError] = useState(null);          // For AI call errors
  const [aiValueInsight, setAiValueInsight] = useState(null); // This will be an object
  const [aiSuggestions, setAiSuggestions] = useState(null);   // This will be an object

  // State for "Is For Sale" toggle directly in Detailed View
  const [isForSaleLocal, setIsForSaleLocal] = useState(false); 
  const [askingPriceLocal, setAskingPriceLocal] = useState('');
  const [saleNotesLocal, setSaleNotesLocal] = useState('');
  const [saleStatusLoading, setSaleStatusLoading] = useState(false);
  const [saleStatusError, setSaleStatusError] = useState(null);

  // Placeholder image URL for items without photos
  const placeholderImageUrl = 'https://placehold.co/300x200/2C2C2C/E0E0E0?text=No+Image';

  // Function to fetch item details
  const fetchItemDetails = async () => {
    setLoading(true);
    setError(null);
    setAiValueInsight(null); // Clear AI insights on re-fetch
    setAiSuggestions(null);
    setSaleStatusError(null); // Clear sale status error

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
      const fetchedItem = response.data;
      setItem(fetchedItem);

      // Pre-populate AI and Sale states if already saved in DB
      if (fetchedItem.aiValueInsight) setAiValueInsight(fetchedItem.aiValueInsight);
      if (fetchedItem.aiSuggestions) setAiSuggestions(fetchedItem.aiSuggestions);
      setIsForSaleLocal(fetchedItem.isForSale ?? false);
      setAskingPriceLocal(fetchedItem.askingPrice || '');
      setSaleNotesLocal(fetchedItem.saleNotes || '');

    } catch (err) {
      console.error('Failed to load item details:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
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
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setLoading(true); // Use main loading for delete action
    setError(null);
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
      navigate('/dashboard');
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
      setShowDeleteConfirm(false);
    }
  };

  // Function to cancel delete confirmation
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setError(null); // Clear any previous general errors
  };

  // AI Feature Handler (Get and Save)
  const handleGetAndSaveAiEvaluation = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiValueInsight(null);
    setAiSuggestions(null); // Clear suggestions too
    const token = localStorage.getItem('token');

    if (!token) {
      setAiError('Authorization token not found. Please login.');
      setAiLoading(false);
      navigate('/login');
      return;
    }

    try {
      // This PATCH endpoint should now:
      // 1. Fetch/generate AI data
      // 2. Save it to the item in the DB
      // 3. Return the fully updated item
      const response = await axios.patch(`http://localhost:5000/api/items/${id}/ai-evaluation`, 
      {}, // Send an empty body if no specific payload is needed for this PATCH for just triggering
      {
        headers: {
          // 'Content-Type': 'application/json', // Not strictly necessary for an empty body PATCH
          Authorization: `Bearer ${token}`,
        },
      });
      // The PATCH route returns the full updated item
      setItem(response.data); // Update the main item state
      setAiValueInsight(response.data.aiValueInsight); // Update local AI state for UI
      setAiSuggestions(response.data.aiSuggestions);   // Update local AI state for UI
    } catch (err) {
      console.error('Failed to get AI evaluation:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        navigate('/login');
      } else if (err.response && err.response.status === 429) {
        setAiError('AI service is busy. Please try again in a moment.');
      } else {
        setAiError(err.response?.data?.message || 'Failed to get AI evaluation. Please try again.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Handle change for isForSale toggle directly from this page
  const handleIsForSaleToggle = async (e) => {
    const newValue = e.target.checked;
    setIsForSaleLocal(newValue); // Optimistically update UI
    setSaleStatusLoading(true);
    setSaleStatusError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setSaleStatusError('Authorization token not found. Please login.');
      setSaleStatusLoading(false);
      navigate('/login');
      return;
    }

    // Prepare data for update. If toggling off, askingPrice and saleNotes are cleared.
    // If toggling on, current local values for askingPrice and saleNotes are used.
    const updateData = {
      isForSale: newValue,
      askingPrice: newValue ? (askingPriceLocal ? parseFloat(askingPriceLocal) : null) : null,
      saleNotes: newValue ? saleNotesLocal : null,
    };
    
    try {
      const response = await axios.put(`http://localhost:5000/api/items/${id}`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('Sale status updated:', response.data);
      setItem(response.data); // Update main item state with the full response
      // If toggled off, also reset local input states for price/notes
      if (!newValue) {
        setAskingPriceLocal('');
        setSaleNotesLocal('');
      }
    } catch (err) {
      console.error('Failed to update sale status:', err);
      setSaleStatusError(err.response?.data?.message || 'Failed to update sale status. Please try again.');
      // Revert UI if update fails
      setIsForSaleLocal(!newValue); 
      // Potentially revert askingPriceLocal and saleNotesLocal if they were part of this failed update
      // For now, just reverting the toggle.
    } finally {
      setSaleStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchItemDetails();
  }, [id, navigate]);

  // Consolidated loading/error views for initial item fetch
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

  if (error && !item) { // General error during initial fetch
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

  if (!item) { // Item specifically not found or null after loading attempt
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
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-serif text-vav-accent-primary text-center md:text-left">
            {item.make} {item.model}
          </h1>
          <Link
            to="/dashboard"
            className="text-vav-accent-primary hover:text-vav-accent-secondary transition-colors text-center md:text-right"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-900 bg-opacity-30 p-2 rounded">{error}</p>}
        {saleStatusError && (
          <p className="text-red-500 text-sm mb-4 text-center bg-red-900 bg-opacity-30 p-2 rounded">{saleStatusError}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
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
                  className="w-full h-32 object-cover rounded-md shadow-sm col-span-full mx-auto" // Adjusted for single placeholder
                />
              )}
            </div>
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

          {item.purchaseDate && (
            <div>
              <p className="text-vav-text-secondary">Purchase Date:</p>
              <p className="text-vav-text font-medium">{new Date(item.purchaseDate).toLocaleDateString()}</p>
            </div>
          )}
          {item.purchasePrice != null && ( // Check for null or undefined, 0 is a valid price
            <div>
              <p className="text-vav-text-secondary">Purchase Price:</p>
              <p className="text-vav-text font-medium">${Number(item.purchasePrice).toFixed(2)}</p>
            </div>
          )}

          {item.userEstimatedValue != null && (
            <div>
              <p className="text-vav-text-secondary">Estimated Value (User):</p>
              <p className="text-vav-text font-medium">${Number(item.userEstimatedValue).toFixed(2)}</p>
            </div>
          )}
          {item.userEstimatedValueDate && (
            <div>
              <p className="text-vav-text-secondary">Value Estimation Date (User):</p>
              <p className="text-vav-text font-medium">{new Date(item.userEstimatedValueDate).toLocaleDateString()}</p>
            </div>
          )}

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

        <div className="mt-8 pt-6 border-t border-vav-text-secondary">
          <h3 className="text-xl font-serif text-vav-accent-primary mb-4">AI Insights</h3>
          {aiError && (
            <p className="text-red-500 text-sm mb-4 text-center bg-red-900 bg-opacity-30 p-2 rounded">{aiError}</p>
          )}          
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={handleGetAndSaveAiEvaluation}
              disabled={aiLoading}
              className="bg-vav-accent-primary text-vav-background font-semibold py-2 px-4 rounded-md shadow-md hover:bg-vav-accent-secondary transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {aiLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Get AI Evaluation & Suggestions'
              )}
            </button>
          </div>

          {aiValueInsight && (
            <div className="bg-vav-background p-4 rounded-md mb-4">
              {aiValueInsight.error ? (
                <p className="text-red-500 text-sm text-center">{aiValueInsight.error}</p>
              ) : (
                <>
                  <p className="text-vav-text-secondary text-base mb-2 text-center">Suggested Market Value:</p>
                  {aiValueInsight.estimatedValueUSD && <p className="text-vav-accent-primary text-xl font-bold mb-2 text-center">{aiValueInsight.estimatedValueUSD}</p>}
                  {aiValueInsight.description && <p className="text-vav-text text-sm whitespace-pre-wrap mb-2">{aiValueInsight.description}</p>}
                  {aiValueInsight.productionDates && <p className="text-vav-text text-sm mb-2">Production Dates: {aiValueInsight.productionDates}</p>}
                  {aiValueInsight.marketDesirability && <p className="text-vav-text text-sm mb-2">Market Desirability: {aiValueInsight.marketDesirability}</p>}
                </>
              )}
              {aiValueInsight.disclaimer && <p className="text-vav-text-secondary text-xs text-center">{aiValueInsight.disclaimer}</p>}
            </div>
          )}

          {aiSuggestions && (
            <div className="bg-vav-background p-4 rounded-md">
              {aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 ? (
                <>
                  <p className="text-vav-text-secondary text-base mb-2 text-center">Related Gear Suggestions:</p>
                  <div className="text-vav-text text-left mx-auto max-w-md">
                    <ul className="list-disc list-inside space-y-1">
                      {aiSuggestions.suggestions.map((sugg, index) => (
                        <li key={index}>
                          <strong>{sugg.make} {sugg.model}</strong> - {sugg.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-center">{aiSuggestions.error || "No specific suggestions available."}</p>
              )}
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-vav-text-secondary">
            <h3 className="text-xl font-serif text-vav-accent-primary mb-4">Sale Status</h3>
            <div className="flex items-center space-x-3 mb-4">
              <input
                id="isForSaleToggle"
                type="checkbox"
                checked={isForSaleLocal}
                onChange={handleIsForSaleToggle}
                className="h-5 w-5 text-vav-accent-primary bg-vav-content-card border-vav-accent-primary rounded focus:ring-vav-accent-secondary"
                disabled={saleStatusLoading}
              />
              <label htmlFor="isForSaleToggle" className="text-lg text-vav-text-secondary">
                Mark as For Sale
              </label>
              {saleStatusLoading && (
                <svg className="animate-spin h-5 w-5 text-vav-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            </div>

            {isForSaleLocal && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label htmlFor="askingPrice" className="block text-sm font-medium text-vav-text-secondary mb-1">Asking Price ($)</label>
                  <input
                    type="number"
                    id="askingPrice"
                    value={askingPriceLocal}
                    onChange={(e) => setAskingPriceLocal(e.target.value)}
                    onBlur={handleIsForSaleToggle} // Optionally save on blur if isForSaleLocal is true
                    className="mt-1 block w-full px-3 py-2 bg-vav-content-card border border-vav-accent-primary rounded-md shadow-sm focus:outline-none focus:ring-vav-accent-secondary focus:border-vav-accent-secondary sm:text-sm text-vav-text placeholder-vav-text-secondary"
                    placeholder="e.g., 500.00"
                    min="0"
                    step="0.01"
                    disabled={saleStatusLoading}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="saleNotes" className="block text-sm font-medium text-vav-text-secondary mb-1">Sale Notes</label>
                  <textarea
                    id="saleNotes"
                    value={saleNotesLocal}
                    onChange={(e) => setSaleNotesLocal(e.target.value)}
                    onBlur={handleIsForSaleToggle} // Optionally save on blur if isForSaleLocal is true
                    className="mt-1 block w-full px-3 py-2 bg-vav-content-card border border-vav-accent-primary rounded-md shadow-sm focus:outline-none focus:ring-vav-accent-secondary focus:border-vav-accent-secondary sm:text-sm text-vav-text placeholder-vav-text-secondary"
                    rows="3"
                    placeholder="e.g., Minor cosmetic wear, recently serviced."
                    disabled={saleStatusLoading}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-8 pt-6 border-t border-vav-text-secondary">
          <Link
            to={`/edit-item/${item._id}`}
            className="bg-vav-accent-primary text-vav-background font-semibold py-2 px-6 rounded-md shadow-md hover:bg-vav-accent-secondary transition-colors duration-150 ease-in-out"
          >
            Edit Item
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)} // Directly show modal, handleDelete will be called from modal
            className="bg-red-700 text-white font-semibold py-2 px-6 rounded-md shadow-md hover:bg-red-800 transition-colors duration-150 ease-in-out"
          >
            Delete Item
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-vav-content-card p-8 rounded-lg shadow-xl text-center max-w-md w-full">
              <p className="text-lg text-vav-text mb-6">Are you sure you want to delete this item: <br/><strong className="text-vav-accent-primary">{item.make} {item.model}</strong>?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDelete}
                  disabled={loading} // Use main loading state for delete action
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
