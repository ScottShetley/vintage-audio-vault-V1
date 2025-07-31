// client/src/pages/AddItemPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const AddItemPage = () => {
  const navigate = useNavigate();

  // Form field states
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [itemType, setItemType] = useState('Receiver');
  const [condition, setCondition] = useState('Mint');
  const [isForSale, setIsForSale] = useState(false);
  const [isOpenToTrade, setIsOpenToTrade] = useState(false);
  const [privacy, setPrivacy] = useState('Public');
  const [askingPrice, setAskingPrice] = useState('');
  const [isFullyFunctional, setIsFullyFunctional] = useState(true);
  const [issuesDescription, setIssuesDescription] = useState('');
  const [notes, setNotes] = useState('');
  // --- UPDATED: State to handle multiple photos ---
  const [photos, setPhotos] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const itemTypeOptions = ['Receiver', 'Turntable', 'Speakers', 'Amplifier', 'Pre-amplifier', 'Tape Deck', 'Reel to Reel', 'CD Player', 'Equalizer', 'Tuner', 'Integrated Amplifier', 'Other'];
  const conditionOptions = ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'For Parts/Not Working', 'Restored'];

  useEffect(() => {
    if (isForSale || isOpenToTrade) {
      setPrivacy('Public');
    }
  }, [isForSale, isOpenToTrade]);


  const clearForm = () => {
    setMake('');
    setModel('');
    setItemType('Receiver');
    setCondition('Mint');
    setIsForSale(false);
    setIsOpenToTrade(false);
    setPrivacy('Public');
    setAskingPrice('');
    setIsFullyFunctional(true);
    setIssuesDescription('');
    setNotes('');
    // --- UPDATED: Clear photos array ---
    setPhotos([]);
    const fileInput = document.getElementById('photos');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    const token = localStorage.getItem('authToken');
    
    if (!token) {
      setError('Authorization token not found. Please login.');
      setLoading(false);
      navigate('/login');
      return;
    }

    const formData = new FormData();
    formData.append('make', make);
    formData.append('model', model);
    formData.append('itemType', itemType);
    formData.append('condition', condition);
    formData.append('isForSale', isForSale);
    formData.append('isOpenToTrade', isOpenToTrade);
    formData.append('privacy', privacy);

    if (isForSale) {
      formData.append('askingPrice', askingPrice);
    }
    formData.append('isFullyFunctional', isFullyFunctional);

    if (!isFullyFunctional && issuesDescription) {
      formData.append('issuesDescription', issuesDescription);
    }
    if (notes) formData.append('notes', notes);
    
    // --- UPDATED: Loop through photos and append each one ---
    if (photos.length > 0) {
      for (let i = 0; i < photos.length; i++) {
        formData.append('photos', photos[i]);
      }
    }

    try {
      const response = await axios.post('/api/items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      const newItemId = response.data?._id;

      if (newItemId) {
        setSuccessMessage('Item added successfully! Redirecting...');
        clearForm();
        setTimeout(() => {
          navigate(`/item/${newItemId}`);
        }, 2000);
      } else {
        setError('Item created, but could not get ID for redirection.');
        setTimeout(() => {
            navigate('/dashboard');
        }, 3000);
      }

    } catch (err) {
      console.error('Failed to add item:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('authToken');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to add item. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "mt-1 block w-full px-3 py-2 bg-vav-content-card border border-vav-accent-primary rounded-md shadow-sm focus:outline-none focus:ring-vav-accent-secondary focus:border-vav-accent-secondary sm:text-sm text-vav-text placeholder-vav-text-secondary";
  const labelClass = "block text-sm font-medium text-vav-text-secondary mb-1";
  const checkboxClass = "h-4 w-4 text-vav-accent-primary bg-vav-content-card border-vav-accent-primary rounded focus:ring-vav-accent-secondary";

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-serif text-vav-accent-primary">Add New Item</h1>
        <Link
          to="/dashboard"
          className="text-vav-accent-primary hover:text-vav-accent-secondary transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8 space-y-6">
        
        <div className="space-y-4 rounded-lg bg-vav-background p-4">
            <label className={labelClass}>Listing Options</label>
            <div className="flex items-center">
                <input
                    id="isForSale"
                    type="checkbox"
                    checked={isForSale}
                    onChange={(e) => setIsForSale(e.target.checked)}
                    className={checkboxClass}
                />
                <label htmlFor="isForSale" className="ml-3 block text-sm text-vav-text">
                    List this item for sale
                </label>
            </div>
            <div className="flex items-center">
                <input
                    id="isOpenToTrade"
                    type="checkbox"
                    checked={isOpenToTrade}
                    onChange={(e) => setIsOpenToTrade(e.target.checked)}
                    className={checkboxClass}
                />
                <label htmlFor="isOpenToTrade" className="ml-3 block text-sm text-vav-text">
                    Open to trades for this item
                </label>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="make" className={labelClass}>Make <span className="text-red-500">*</span></label>
            <input type="text" id="make" value={make} onChange={(e) => setMake(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="model" className={labelClass}>Model <span className="text-red-500">*</span></label>
            <input type="text" id="model" value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="itemType" className={labelClass}>Item Type <span className="text-red-500">*</span></label>
            <select id="itemType" value={itemType} onChange={(e) => setItemType(e.target.value)} className={inputClass} required>
              {itemTypeOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="condition" className={labelClass}>Condition <span className="text-red-500">*</span></label>
            <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)} className={inputClass} required>
              {conditionOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="privacy" className={labelClass}>Visibility</label>
                <select 
                    id="privacy" 
                    value={privacy} 
                    onChange={(e) => setPrivacy(e.target.value)} 
                    className={`${inputClass} disabled:bg-vav-background-alt disabled:cursor-not-allowed`}
                    disabled={isForSale || isOpenToTrade}
                >
                    <option value="Public">Public (Visible to others)</option>
                    <option value="Private">Private (Visible only to you)</option>
                </select>
                {(isForSale || isOpenToTrade) && (
                    <p className="text-xs text-vav-text-secondary mt-1">Items for sale or trade must be public.</p>
                )}
            </div>
        </div>
        
        {isForSale && (
            <div>
                <label htmlFor="askingPrice" className={labelClass}>Asking Price ($) <span className="text-red-500">*</span></label>
                <input 
                    type="number" 
                    id="askingPrice" 
                    value={askingPrice} 
                    onChange={(e) => setAskingPrice(e.target.value)} 
                    className={inputClass}
                    placeholder="e.g., 450.00"
                    min="0"
                    step="0.01"
                    required
                />
            </div>
        )}

        <div>
          <div className="flex items-center">
            <input
              id="isFullyFunctional"
              type="checkbox"
              checked={isFullyFunctional}
              onChange={(e) => setIsFullyFunctional(e.target.checked)}
              className={checkboxClass}
            />
            <label htmlFor="isFullyFunctional" className="ml-2 block text-sm text-vav-text">
              Fully Functional?
            </label>
          </div>
        </div>

        {!isFullyFunctional && (
          <div>
            <label htmlFor="issuesDescription" className={labelClass}>Issues Description</label>
            <textarea id="issuesDescription" value={issuesDescription} onChange={(e) => setIssuesDescription(e.target.value)} className={inputClass} rows="3" />
          </div>
        )}
        
        <div>
          <label htmlFor="notes" className={labelClass}>Notes</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} rows="4" />
        </div>
        
        {/* --- UPDATED: Photo Upload Section for Multiple Files --- */}
        <div>
          <label htmlFor="photos" className={labelClass}>Add Photo(s)</label>
          <input
            type="file"
            id="photos"
            multiple // <-- Allow multiple files
            accept="image/*"
            onChange={(e) => setPhotos(Array.from(e.target.files))} // <-- Handle multiple files
            className={`block w-full text-sm text-vav-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-vav-accent-primary file:text-vav-background hover:file:bg-vav-accent-secondary hover:file:text-white ${inputClass} p-0 border-dashed`}
          />
          <p className="text-xs text-vav-text-secondary mt-1">You can select up to 5 images. The first image will be used for AI analysis.</p>
           {photos.length > 0 && (
            <div className="mt-2 text-xs text-vav-text-secondary">
              Selected {photos.length} file(s): {photos.map(f => f.name).join(', ')}
            </div>
          )}
        </div>

        <div className="pt-4">
          {error && (
            <p className="text-red-500 text-sm mb-4 text-center bg-red-900 bg-opacity-30 p-2 rounded">{error}</p>
          )}
          {successMessage && (
            <p className="text-green-400 text-sm mb-4 text-center bg-green-900 bg-opacity-30 p-2 rounded">{successMessage}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vav-accent-primary hover:bg-vav-accent-secondary text-vav-background font-semibold py-3 px-4 rounded-md shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
                'Add Item to Collection'
              )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddItemPage;