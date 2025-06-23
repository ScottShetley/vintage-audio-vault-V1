// client/src/pages/SavedFindDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FormattedAiDescription from '../components/FormattedAiDescription';

const SavedFindDetailsPage = () => {
  const [find, setFind] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  // New state for handling delete operation
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const fetchFindDetails = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('You must be logged in to view this content.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`/api/wild-finds/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setFind(response.data);
      } catch (err) {
        console.error('Error fetching find details:', err);
        setError(err.response?.data?.message || 'Failed to load the details for this find.');
      } finally {
        setLoading(false);
      }
    };

    fetchFindDetails();
  }, [id]);

  const handleDelete = async () => {
    // 1. Confirm with the user
    if (!window.confirm('Are you sure you want to permanently delete this find?')) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    const token = localStorage.getItem('authToken');

    try {
      // 2. Make the API call
      await axios.delete(`/api/wild-finds/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // 3. Redirect on success
      navigate('/saved-finds');
    } catch (err) {
      console.error('Error deleting find:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete the find. Please try again.');
      setIsDeleting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-10 w-10 text-vav-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="ml-3 text-lg">Loading Details...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-4 bg-red-900 bg-opacity-30 rounded-md">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      );
    }

    if (!find) {
      return null;
    }

    return (
      <>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Image Column */}
          <div className="md:w-1/2">
            <h2 className="text-3xl font-serif text-vav-accent-primary mb-4">{find.analysis.identifiedItem}</h2>
            <img 
              src={find.imageUrl} 
              alt={find.analysis.identifiedItem}
              className="w-full h-auto object-contain rounded-lg shadow-lg"
            />
          </div>

          {/* Details Column */}
          <div className="md:w-1/2 flex flex-col space-y-6">
            <div className="bg-vav-content-card p-4 rounded-lg shadow-inner">
              <h3 className="text-xl font-bold text-vav-accent-secondary border-b border-vav-accent-secondary pb-2 mb-3">Estimated Value</h3>
              <p className="text-lg text-vav-text">{find.analysis.estimatedValue}</p>
            </div>
            
            <div className="bg-vav-content-card p-4 rounded-lg shadow-inner">
              <h3 className="text-xl font-bold text-vav-accent-secondary border-b border-vav-accent-secondary pb-2 mb-3">Visual Condition</h3>
              <FormattedAiDescription text={find.analysis.visualCondition} />
            </div>

            <div className="bg-vav-content-card p-4 rounded-lg shadow-inner">
              <h3 className="text-xl font-bold text-vav-accent-secondary border-b border-vav-accent-secondary pb-2 mb-3">Detailed Analysis</h3>
              <FormattedAiDescription text={find.analysis.detailedAnalysis} />
            </div>
            
            <div className="bg-vav-content-card p-4 rounded-lg shadow-inner">
              <h3 className="text-xl font-bold text-vav-accent-secondary border-b border-vav-accent-secondary pb-2 mb-3">Potential Issues</h3>
              <FormattedAiDescription text={find.analysis.potentialIssues} />
            </div>

            <div className="bg-vav-content-card p-4 rounded-lg shadow-inner">
              <h3 className="text-xl font-bold text-vav-accent-secondary border-b border-vav-accent-secondary pb-2 mb-3">Restoration & Repair Tips</h3>
              <FormattedAiDescription text={find.analysis.restorationTips} />
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-6 flex justify-between items-center">
        <Link to="/saved-finds" className="text-vav-accent-primary hover:underline">
          &larr; Back to My Saved Finds
        </Link>
        
        {/* Delete Button and Error Display */}
        <div className="flex items-center gap-4">
            {deleteError && <p className="text-red-400">{deleteError}</p>}
            <button 
                onClick={handleDelete}
                disabled={isDeleting || loading || !find}
                className="bg-red-800 hover:bg-red-700 disabled:bg-red-950 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
            >
                {isDeleting ? 'Deleting...' : 'Delete Find'}
            </button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
};

export default SavedFindDetailsPage;