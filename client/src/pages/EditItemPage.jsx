// client/src/pages/EditItemPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';

const EditItemPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Form field states
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [itemType, setItemType] = useState('Receiver');
  const [condition, setCondition] = useState('Mint');
  const [status, setStatus] = useState('Personal Collection');
  const [privacy, setPrivacy] = useState('Public');
  const [askingPrice, setAskingPrice] = useState('');
  const [isFullyFunctional, setIsFullyFunctional] = useState(true);
  const [issuesDescription, setIssuesDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [newPhotos, setNewPhotos] = useState([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const itemTypeOptions = ['Receiver', 'Turntable', 'Speakers', 'Amplifier', 'Pre-amplifier', 'Tape Deck', 'CD Player', 'Equalizer', 'Tuner', 'Integrated Amplifier', 'Other'];
  const conditionOptions = ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'For Parts/Not Working', 'Restored'];

  useEffect(() => {
    const fetchItemDetails = async () => {
      setInitialLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      if (!token) {
        setInitialLoading(false);
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get(`/api/items/${id}`, { // Using relative path for proxy
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const itemData = response.data;

        setMake(itemData.make || '');
        setModel(itemData.model || '');
        setItemType(itemData.itemType || 'Receiver');
        setCondition(itemData.condition || 'Mint');
        setStatus(itemData.status || 'Personal Collection');
        setPrivacy(itemData.privacy || 'Public');
        setAskingPrice(itemData.askingPrice || '');
        setIsFullyFunctional(itemData.isFullyFunctional ?? true);
        setIssuesDescription(itemData.issuesDescription || '');
        setNotes(itemData.notes || '');
        setExistingPhotoUrls(itemData.photoUrls || []);

      } catch (err) {
        console.error('Failed to load item details for editing:', err);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem('authToken');
          navigate('/login');
        } else {
          setError(err.response?.data?.message || 'Failed to load item details.');
        }
      } finally {
        setInitialLoading(false);
      }
    };

    fetchItemDetails();
  }, [id, navigate]);

  const handleRemoveExistingPhoto = (urlToRemove) => {
    setExistingPhotoUrls(existingPhotoUrls.filter(url => url !== urlToRemove));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      navigate('/login');
      return;
    }

    const formData = new FormData();
    formData.append('make', make);
    formData.append('model', model);
    formData.append('itemType', itemType);
    formData.append('condition', condition);
    formData.append('status', status);
    formData.append('privacy', privacy);
    
    if (status === 'For Sale') {
        formData.append('askingPrice', askingPrice);
    }
    formData.append('isFullyFunctional', isFullyFunctional);
    formData.append('issuesDescription', issuesDescription);
    formData.append('notes', notes);

    for (let i = 0; i < newPhotos.length; i++) {
      formData.append('photos', newPhotos[i]);
    }
    
    // --- THIS IS THE FIX ---
    // Send the array of remaining existing photos so the backend knows which ones to keep.
    formData.append('existingImageUrls', JSON.stringify(existingPhotoUrls));

    try {
      await axios.put(`/api/items/${id}`, formData, { // Using relative path for proxy
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccessMessage('Item updated successfully! Redirecting...');
      setTimeout(() => {
        navigate(`/item/${id}`);
      }, 2000);
    } catch (err) {
      console.error('Failed to update item:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('authToken');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to update item.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "mt-1 block w-full px-3 py-2 bg-vav-content-card border border-vav-accent-primary rounded-md shadow-sm focus:outline-none focus:ring-vav-accent-secondary focus:border-vav-accent-secondary sm:text-sm text-vav-text placeholder-vav-text-secondary";
  const labelClass = "block text-sm font-medium text-vav-text-secondary mb-1";
  const placeholderImageUrl = 'https://placehold.co/100x100/2C2C2C/E0E0E0?text=No+Image';

  if (initialLoading) {
    return <div className="text-center p-8">Loading for editing...</div>;
  }

  if (error && !initialLoading) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-serif text-vav-accent-primary">Edit Item</h1>
        <Link
          to={`/item/${id}`}
          className="text-vav-accent-primary hover:text-vav-accent-secondary"
        >
          &larr; Back to Details
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8 space-y-6">
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
                <label htmlFor="status" className={labelClass}>Status</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                    <option value="Personal Collection">Personal Collection</option>
                    <option value="For Sale">For Sale</option>
                    <option value="For Trade">For Trade</option>
                </select>
            </div>
            <div>
                <label htmlFor="privacy" className={labelClass}>Privacy</label>
                <select id="privacy" value={privacy} onChange={(e) => setPrivacy(e.target.value)} className={inputClass}>
                    <option value="Public">Public (Visible to others)</option>
                    <option value="Private">Private (Visible only to you)</option>
                </select>
            </div>
        </div>
        
        {status === 'For Sale' && (
            <div>
                <label htmlFor="askingPrice" className={labelClass}>Asking Price ($)</label>
                <input 
                    type="number" 
                    id="askingPrice" 
                    value={askingPrice} 
                    onChange={(e) => setAskingPrice(e.target.value)} 
                    className={inputClass}
                    placeholder="e.g., 450.00"
                    min="0"
                    step="0.01"
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
              className="h-4 w-4 text-vav-accent-primary"
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

        {existingPhotoUrls.length > 0 && (
          <div>
            <label className={labelClass}>Existing Photos</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-2">
              {existingPhotoUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img src={url} alt={`Existing ${index + 1}`} className="w-full h-24 object-cover rounded-md" onError={(e) => { e.target.onerror = null; e.target.src = placeholderImageUrl; }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingPhoto(url)}
                    className="absolute top-0 right-0 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs -mt-2 -mr-2 hover:bg-red-700"
                    aria-label="Remove"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="photos" className={labelClass}>Add New Photos</label>
          <input
            type="file"
            id="photos"
            multiple
            accept="image/*"
            onChange={(e) => setNewPhotos(Array.from(e.target.files))}
            className={`block w-full text-sm ${inputClass} p-0 border-dashed`}
          />
        </div>

        <div className="pt-4">
          {error && (<p className="text-red-500 text-sm mb-4 text-center p-2 rounded">{error}</p>)}
          {successMessage && (<p className="text-green-400 text-sm mb-4 text-center p-2 rounded">{successMessage}</p>)}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vav-accent-primary hover:bg-vav-accent-secondary text-vav-background font-semibold py-3 px-4 rounded-md shadow-md disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Item'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditItemPage;