// client/src/pages/SavedFindDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FormattedAiDescription from '../components/FormattedAiDescription';

// --- Sub-component for displaying Wild Find details ---
const WildFindDetails = ({ find }) => (
  <>
    <div className="flex flex-col md:flex-row gap-8">
      <div className="md:w-1/2">
        <h2 className="text-3xl font-serif text-vav-accent-primary mb-4">{find.analysis.identifiedItem}</h2>
        <img 
          src={find.imageUrl} 
          alt={find.analysis.identifiedItem}
          className="w-full h-auto object-contain rounded-lg shadow-lg"
        />
      </div>
      <div className="md:w-1/2 flex flex-col space-y-6">
        <div className="bg-vav-content-card p-4 rounded-lg shadow-inner">
          <h3 className="text-xl font-bold text-vav-accent-secondary border-b border-vav-accent-secondary pb-2 mb-3">Estimated Value</h3>
          <p className="text-lg text-vav-text">{find.analysis.estimatedValue}</p>
        </div>
        <div className="bg-vav-content-card p-4 rounded-lg shadow-inner">
          <h3 className="text-xl font-bold text-vav-accent-secondary border-b border-vav-accent-secondary pb-2 mb-3">Detailed Analysis</h3>
          <FormattedAiDescription description={find.analysis.detailedAnalysis} />
        </div>
        <div className="bg-vav-content-card p-4 rounded-lg shadow-inner">
          <h3 className="text-xl font-bold text-vav-accent-secondary border-b border-vav-accent-secondary pb-2 mb-3">Potential Issues</h3>
          <FormattedAiDescription description={find.analysis.potentialIssues} />
        </div>
      </div>
    </div>
  </>
);

// --- Sub-component for displaying Ad Analysis details ---
const AdAnalysisDetails = ({ find }) => (
  <>
    <div className="flex flex-col md:flex-row gap-8">
      <div className="md:w-1/2">
        <h2 className="text-3xl font-serif text-vav-accent-primary mb-4">
            {find.adAnalysis.identifiedMake} {find.adAnalysis.identifiedModel}
        </h2>
        <img 
          src={find.imageUrl} 
          alt={`${find.adAnalysis.identifiedMake} ${find.adAnalysis.identifiedModel}`}
          className="w-full h-auto object-contain rounded-lg shadow-lg mb-4"
        />
        {find.sourceUrl && (
            <a href={find.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-vav-accent-secondary text-white font-semibold py-2 px-6 rounded-md shadow-md hover:bg-vav-accent-primary transition-colors">
                View Original Ad &rarr;
            </a>
        )}
      </div>
      <div className="md:w-1/2 flex flex-col space-y-6">
        <div className="p-4 bg-vav-content-card rounded-lg shadow-inner">
          <h3 className="text-xl font-bold text-vav-accent-secondary border-b border-vav-accent-secondary pb-2 mb-3">Price Insight</h3>
          <p className="text-vav-text"><strong>Seller's Asking Price:</strong> <span className="font-bold text-2xl">${parseFloat(find.askingPrice).toFixed(2)}</span></p>
          <p className="text-vav-text"><strong>AI Estimated Value:</strong> <span className="font-bold text-2xl">{find.adAnalysis.valueInsight?.estimatedValueUSD || 'N/A'}</span></p>
          <div className="mt-3"><FormattedAiDescription description={find.adAnalysis.priceComparison?.insight} /></div>
        </div>
        
        {/* *** DEBUGGING SECTION *** */}
        <div className="p-4 bg-vav-content-card rounded-lg shadow-inner">
          <h3 className="text-xl font-bold text-vav-accent-secondary border-b border-vav-accent-secondary pb-2 mb-3">Summary of Seller's Ad (Debug View)</h3>
          <pre className="whitespace-pre-wrap bg-gray-900 text-white p-2 rounded-md text-xs font-mono">
            {`Value: "${find.adAnalysis.textAnalysis?.sellerConditionSummary}"`}
          </pre>
        </div>
        {/* *** END DEBUGGING SECTION *** */}

      </div>
    </div>
  </>
);


const SavedFindDetailsPage = () => {
  const [find, setFind] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
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
        const response = await axios.get(`http://localhost:5000/api/wild-finds/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFind(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load find details.');
      } finally {
        setLoading(false);
      }
    };

    fetchFindDetails();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this find?')) {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    const token = localStorage.getItem('authToken');

    try {
      await axios.delete(`/api/wild-finds/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/saved-finds');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete find.');
      setIsDeleting(false);
    }
  };

  const renderContent = () => {
    if (loading) return <div className="text-center p-8">Loading Details...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!find) return null;

    if (find.findType === 'Ad Analysis') {
        return <AdAnalysisDetails find={find} />;
    } else {
        return <WildFindDetails find={find} />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-6 flex justify-between items-center">
        <Link to="/saved-finds" className="text-vav-accent-primary hover:underline">
          &larr; Back to My Saved Finds
        </Link>
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