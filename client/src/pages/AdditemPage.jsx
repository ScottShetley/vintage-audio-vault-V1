// client/src/pages/AddItemPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const AddItemPage = () => {
  const navigate = useNavigate();

  // Form field states
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [itemType, setItemType] = useState('Receiver'); // Default to first option
  const [condition, setCondition] = useState('Mint'); // Default to first option
  const [isFullyFunctional, setIsFullyFunctional] = useState(true);
  const [issuesDescription, setIssuesDescription] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [userEstimatedValue, setUserEstimatedValue] = useState('');
  const [userEstimatedValueDate, setUserEstimatedValueDate] = useState('');
  const [photo, setPhoto] = useState(null); // Changed to store a single File object

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const itemTypeOptions = ['Receiver', 'Turntable', 'Speakers', 'Amplifier', 'Pre-amplifier', 'Tape Deck', 'CD Player', 'Equalizer', 'Tuner', 'Integrated Amplifier', 'Other'];
  const conditionOptions = ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'For Parts/Not Working', 'Restored'];

  const clearForm = () => {
    setMake('');
    setModel('');
    setItemType('Receiver');
    setCondition('Mint');
    setIsFullyFunctional(true);
    setIssuesDescription('');
    setSpecifications('');
    setNotes('');
    setPurchaseDate('');
    setPurchasePrice('');
    setUserEstimatedValue('');
    setUserEstimatedValueDate('');
    setPhoto(null); // Clear single photo
    // Clear file input visually (this is a bit tricky, often requires resetting the input element itself)
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

    const token = localStorage.getItem('token');
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
    formData.append('isFullyFunctional', isFullyFunctional);

    if (!isFullyFunctional && issuesDescription) {
      formData.append('issuesDescription', issuesDescription);
    }
    if (specifications) formData.append('specifications', specifications);
    if (notes) formData.append('notes', notes);
    if (purchaseDate) formData.append('purchaseDate', purchaseDate);
    if (purchasePrice) formData.append('purchasePrice', purchasePrice);
    if (userEstimatedValue) formData.append('userEstimatedValue', userEstimatedValue);
    if (userEstimatedValueDate) formData.append('userEstimatedValueDate', userEstimatedValueDate);

    if (photo) { // If a photo is selected
      formData.append('photo', photo); // Append with key 'photo'
    }

    try {
      const response = await axios.post('http://localhost:5000/api/items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Item added successfully:', response.data);
      setSuccessMessage('Item added successfully! Redirecting to dashboard...');
      clearForm();
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Failed to add item:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
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

  return (
    // This div is the main container for the page's content.
    // It will be centered by the <main> tag in App.jsx.
    // We apply max-w-2xl to this div, and mx-auto to center it within the <main> tag's available space.
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
        {/* Make and Model */}
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

        {/* Item Type and Condition */}
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

        {/* Functionality and Issues */}
        <div>
          <div className="flex items-center">
            <input
              id="isFullyFunctional"
              type="checkbox"
              checked={isFullyFunctional}
              onChange={(e) => setIsFullyFunctional(e.target.checked)}
              className="h-4 w-4 text-vav-accent-primary bg-vav-content-card border-vav-accent-primary rounded focus:ring-vav-accent-secondary"
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

        {/* Specifications and Notes */}
        <div>
          <label htmlFor="specifications" className={labelClass}>Specifications</label>
          <textarea id="specifications" value={specifications} onChange={(e) => setSpecifications(e.target.value)} className={inputClass} rows="4" />
        </div>
        <div>
          <label htmlFor="notes" className={labelClass}>Notes</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} rows="4" />
        </div>

        {/* Purchase Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="purchaseDate" className={labelClass}>Purchase Date</label>
            <input type="date" id="purchaseDate" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="purchasePrice" className={labelClass}>Purchase Price ($)</label>
            <input type="number" id="purchasePrice" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className={inputClass} placeholder="e.g., 150.00" min="0" step="0.01" />
          </div>
        </div>

        {/* Estimated Value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="userEstimatedValue" className={labelClass}>Estimated Value ($)</label>
            <input type="number" id="userEstimatedValue" value={userEstimatedValue} onChange={(e) => setUserEstimatedValue(e.target.value)} className={inputClass} placeholder="e.g., 200.00" min="0" step="0.01" />
          </div>
          <div>
            <label htmlFor="userEstimatedValueDate" className={labelClass}>Value Estimation Date</label>
            <input type="date" id="userEstimatedValueDate" value={userEstimatedValueDate} onChange={(e) => setUserEstimatedValueDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label htmlFor="photo" className={labelClass}>Photo (select one)</label> {/* Changed label */}
          <input
            type="file"
            id="photo"  // Changed id
            // multiple // Removed multiple attribute
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])} // Set single photo
            className={`block w-full text-sm text-vav-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-vav-accent-primary file:text-vav-background hover:file:bg-vav-accent-secondary hover:file:text-white ${inputClass} p-0 border-dashed`}
          />
           {photo && ( // Check if single photo exists
            <div className="mt-2 text-xs text-vav-text-secondary">
              Selected file: {photo.name}
            </div>
          )}
        </div>

        {/* Messages and Submit Button */}
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