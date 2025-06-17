// client/src/pages/AdAnalyzerPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// It's likely we'll want to reuse the FormattedAiDescription component
// If WildFindPage.module.css contains generic styles you want, import it too.
// For now, let's assume we might need FormattedAiDescription.
// import styles from './WildFindPage.module.css'; // Or a new CSS module for this page

// Re-using FormattedAiDescription from WildFindPage for consistency
// If you decide to move this to a shared components folder, update the import path.
function FormattedAiDescription({ description }) {
  if (!description) return null;
  const blocks = description.split(/\n+/).map(block => block.trim()).filter(block => block.length > 0);
  return (
    <div>
      {blocks.map((block, index) => {
        if (block.startsWith('**') && block.endsWith(':**')) {
          const headingText = block.substring(2, block.length - 2);
          return ( <h3 key={index} className="text-xl font-semibold text-vav-accent-primary mt-4 mb-2"> {headingText}: </h3> );
        }
        if (block.startsWith('* ')) {
          const listItemContent = block.substring(2);
          const parts = listItemContent.split('**');
          return (
            <p key={index} className="text-vav-text ml-4 mb-1 pl-2" style={{ textIndent: '-1em' }}>
              <span className="mr-2">&bull;</span>
              {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-vav-text-secondary">{part}</strong> : part )}
            </p>
          );
        }
        return ( <p key={index} className="text-vav-text mb-3 whitespace-pre-wrap break-words"> {block} </p> );
      })}
    </div>
  );
}


function AdAnalyzerPage() {
  const navigate = useNavigate();

  // Form States
  const [adImageFile, setAdImageFile] = useState(null);
  const [adImagePreviewUrl, setAdImagePreviewUrl] = useState(null);
  const [adUrl, setAdUrl] = useState(''); // Optional, for user reference
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adAskingPrice, setAdAskingPrice] = useState('');

  // Analysis States
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Common Tailwind classes for inputs and labels (similar to other pages)
  const commonInputClass = "mt-1 block w-full px-3 py-2 bg-vav-background border border-vav-accent-primary rounded-md shadow-sm focus:outline-none focus:ring-vav-accent-secondary focus:border-vav-accent-secondary sm:text-sm text-vav-text placeholder-vav-text-secondary";
  const commonLabelClass = "block text-sm font-medium text-vav-text-secondary mb-1";
  const commonButtonClass = "w-full bg-vav-accent-primary hover:bg-vav-accent-secondary text-vav-background font-semibold py-3 px-4 rounded-md shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  const commonFileClass = "file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-vav-accent-primary file:text-vav-background hover:file:bg-vav-accent-secondary";

  useEffect(() => {
    // Cleanup preview URL on component unmount
    return () => {
      if (adImagePreviewUrl) {
        URL.revokeObjectURL(adImagePreviewUrl);
      }
    };
  }, [adImagePreviewUrl]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAdImageFile(file);
      if (adImagePreviewUrl) {
        URL.revokeObjectURL(adImagePreviewUrl);
      }
      setAdImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setAdImageFile(null);
      if (adImagePreviewUrl) {
        URL.revokeObjectURL(adImagePreviewUrl);
      }
      setAdImagePreviewUrl(null);
    }
  };

  const resetForm = () => {
    setAdImageFile(null);
    if (adImagePreviewUrl) URL.revokeObjectURL(adImagePreviewUrl);
    setAdImagePreviewUrl(null);
    setAdUrl('');
    setAdTitle('');
    setAdDescription('');
    setAdAskingPrice('');
    setAnalysisResult(null);
    setError(null);
    // Reset file input visually
    const fileInput = document.getElementById('adImageUpload');
    if (fileInput) fileInput.value = '';
  };

  const handleAnalyzeAd = async (event) => {
    event.preventDefault();
    setError(null);
    setAnalysisResult(null);

    if (!adImageFile || !adTitle || !adDescription || !adAskingPrice) {
      setError('Please fill in all required fields: Ad Image, Title, Description, and Asking Price.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to analyze ads.');
      setLoading(false);
      navigate('/login');
      return;
    }

    const formData = new FormData();
    formData.append('adImage', adImageFile);
    formData.append('adUrl', adUrl); // Optional
    formData.append('adTitle', adTitle);
    formData.append('adDescription', adDescription);
    formData.append('adAskingPrice', adAskingPrice);

    try {
      // Placeholder for the new backend endpoint
      const response = await axios.post('/api/items/analyze-ad-listing', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setAnalysisResult(response.data); // Assuming response.data contains the structured analysis
      // console.log('Ad Analysis Result:', response.data);
    } catch (err) {
      console.error('Error analyzing ad:', err);
      let errorMessage = 'Failed to analyze ad. Please try again.';
      if (err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          errorMessage = 'Session expired or unauthorized. Please log in again.';
          localStorage.removeItem('token');
          navigate('/login');
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 bg-vav-background-alt min-h-screen">
      <h1 className="text-3xl font-bold text-vav-accent-primary mb-8 text-center">
        Vintage Audio Ad Analyzer
      </h1>

      <form onSubmit={handleAnalyzeAd} className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8 space-y-6">
        <p className="text-sm text-vav-text-secondary mb-4">
          Upload an image from an online ad, and copy-paste the ad's title, description, and asking price.
          The AI will provide an analysis to help you evaluate the listing.
        </p>

        {/* Ad Image Upload */}
        <div>
          <label htmlFor="adImageUpload" className={`${commonLabelClass} mb-1`}>
            Ad Image <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            id="adImageUpload"
            accept="image/*"
            onChange={handleImageChange}
            className={`${commonInputClass} ${commonFileClass} p-0 border-dashed`}
            required
          />
          {adImagePreviewUrl && (
            <div className="mt-4 text-center">
              <img
                src={adImagePreviewUrl}
                alt="Ad preview"
                className="max-w-xs mx-auto rounded-md shadow-md max-h-60 object-contain"
              />
            </div>
          )}
        </div>

        {/* Ad URL (Optional) */}
        <div>
          <label htmlFor="adUrl" className={commonLabelClass}>
            Ad URL (Optional - for your reference)
          </label>
          <input
            type="url"
            id="adUrl"
            value={adUrl}
            onChange={(e) => setAdUrl(e.target.value)}
            className={commonInputClass}
            placeholder="e.g., https://facebook.com/marketplace/item/..."
          />
        </div>

        {/* Ad Title */}
        <div>
          <label htmlFor="adTitle" className={commonLabelClass}>
            Ad Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="adTitle"
            value={adTitle}
            onChange={(e) => setAdTitle(e.target.value)}
            className={commonInputClass}
            placeholder="e.g., Pioneer SX-780 Vintage Stereo Receiver"
            required
          />
        </div>

        {/* Ad Description */}
        <div>
          <label htmlFor="adDescription" className={commonLabelClass}>
            Ad Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="adDescription"
            value={adDescription}
            onChange={(e) => setAdDescription(e.target.value)}
            className={commonInputClass}
            rows="6"
            placeholder="Copy and paste the full item description from the ad here..."
            required
          />
        </div>

        {/* Asking Price */}
        <div>
          <label htmlFor="adAskingPrice" className={commonLabelClass}>
            Asking Price ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="adAskingPrice"
            value={adAskingPrice}
            onChange={(e) => setAdAskingPrice(e.target.value)}
            className={commonInputClass}
            placeholder="e.g., 250"
            min="0"
            step="0.01"
            required
          />
        </div>

        {/* Submit Button and Messages */}
        <div className="pt-4">
          {error && (
            <p className="text-red-500 text-sm mb-4 text-center bg-red-900 bg-opacity-30 p-2 rounded">{error}</p>
          )}
          <button type="submit" disabled={loading} className={commonButtonClass}>
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {/* Added loading text */}
                <span>Analyzing Ad... This may take a moment.</span>
              </>
            ) : (
              'Analyze Ad Listing'
            )}
          </button>
          {analysisResult && !loading && (
             <button type="button" onClick={resetForm} className="mt-4 w-full text-sm text-vav-accent-secondary hover:text-vav-accent-primary text-center">
                Analyze Another Ad
            </button>
          )}
        </div>
      </form>

      {/* Analysis Results Section */}
      {analysisResult && !loading && (
        <div className="mt-10 bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8">
          <h2 className="text-2xl font-bold text-vav-accent-primary mb-6 text-center">AI Analysis Report</h2>
          {analysisResult.status === 'success' && analysisResult.analysis ? (
            <div className="space-y-6">
              {/* Section for AI's Item Identification */}
              <div className="p-4 bg-vav-background-alt rounded-md shadow">
                <h3 className="text-xl font-semibold text-vav-accent-secondary mb-2">AI Item Identification</h3>
                <p className="text-vav-text"><strong>Make:</strong> {analysisResult.analysis.identifiedMake || 'Not identified'}</p>
                <p className="text-vav-text"><strong>Model:</strong> {analysisResult.analysis.identifiedModel || 'Not identified'}</p>
              </div>

              {/* Section for AI's Visual Condition Assessment */}
              <div className="p-4 bg-vav-background-alt rounded-md shadow">
                <h3 className="text-xl font-semibold text-vav-accent-secondary mb-2">AI Visual Condition Assessment (from Image)</h3>
                <FormattedAiDescription description={analysisResult.analysis.visualConditionDescription} />
              </div>
              
              {/* Section for Seller's Description Summary */}
              <div className="p-4 bg-vav-background-alt rounded-md shadow">
                <h3 className="text-xl font-semibold text-vav-accent-secondary mb-2">Summary of Seller's Ad Text</h3>
                <FormattedAiDescription description={analysisResult.analysis.sellerTextSummary?.sellerConditionSummary} /> {/* Corrected field name */}
                {analysisResult.analysis.sellerTextSummary?.mentionedFeatures && analysisResult.analysis.sellerTextSummary?.mentionedFeatures.length > 0 && (
                  <>
                    <h4 className="text-lg font-semibold text-vav-text-secondary mt-3 mb-1">Mentioned Features:</h4>
                    <ul className="list-disc list-inside text-vav-text space-y-1">
                      {analysisResult.analysis.sellerTextSummary.mentionedFeatures.map((feature, i) => <li key={i}>{feature}</li>)} {/* Corrected field name */}
                    </ul>
                  </>
                )}
                 {analysisResult.analysis.sellerTextSummary?.mentionedProblems && analysisResult.analysis.sellerTextSummary?.mentionedProblems.length > 0 && (
                  <>
                    <h4 className="text-lg font-semibold text-red-400 mt-3 mb-1">Mentioned Problems/Issues:</h4>
                    <ul className="list-disc list-inside text-red-300 space-y-1">
                      {analysisResult.analysis.sellerTextSummary.mentionedProblems.map((problem, i) => <li key={i}>{problem}</li>)} {/* Corrected field name */}
                    </ul>
                  </>
                )}
              </div>

              {/* Section for AI Valuation */}
              <div className="p-4 bg-vav-background-alt rounded-md shadow">
                <h3 className="text-xl font-semibold text-vav-accent-secondary mb-2">AI Estimated Valuation</h3>
                <p className="text-2xl font-bold text-vav-text mb-2">{analysisResult.analysis.valuation?.valueRange || 'Could not determine'}</p>
                <FormattedAiDescription description={analysisResult.analysis.valuation?.reasoning} />
                {analysisResult.analysis.valuation?.disclaimer && <p className="text-xs text-vav-text-secondary/80 italic mt-4">{analysisResult.analysis.valuation.disclaimer}</p>}
              </div>

              {/* Section for Price Comparison */}
              <div className="p-4 bg-vav-background-alt rounded-md shadow">
                <h3 className="text-xl font-semibold text-vav-accent-secondary mb-2">Price Insight (Asking vs. AI Estimate)</h3>
                <p className="text-vav-text"><strong>Seller's Asking Price:</strong> ${parseFloat(adAskingPrice).toFixed(2)}</p>
                <FormattedAiDescription description={analysisResult.analysis.priceComparison?.insight} />
              </div>
               {/* Display Original Ad Info */}
               {analysisResult.analysis.originalAdInfo && (
                 <div className="p-4 bg-vav-background-alt rounded-md shadow text-sm text-vav-text-secondary italic">
                    <h4 className="text-lg font-semibold text-vav-text-secondary mb-2 not-italic">Original Ad Info:</h4>
                    {analysisResult.analysis.originalAdInfo.adTitle && <p><strong>Title:</strong> {analysisResult.analysis.originalAdInfo.adTitle}</p>}
                    {analysisResult.analysis.originalAdInfo.adUrl && <p><strong>URL:</strong> <a href={analysisResult.analysis.originalAdInfo.adUrl} target="_blank" rel="noopener noreferrer" className="text-vav-accent-primary hover:underline">{analysisResult.analysis.originalAdInfo.adUrl}</a></p>}
                    {/* Asking price is already displayed above */}
                 </div>
               )}


            </div>
          ) : (
            <p className="text-vav-text-secondary text-center">{analysisResult.message || "Analysis could not be completed."}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default AdAnalyzerPage;
