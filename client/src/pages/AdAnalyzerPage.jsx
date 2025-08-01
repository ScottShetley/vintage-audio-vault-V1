// client/src/pages/AdAnalyzerPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { IoWarningOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';

function FormattedAiDescription({ description }) {
    if (!description) return null;
    const createMarkup = (text) => ({ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-vav-text-secondary">$1</strong>') });
    return (
        <div className="space-y-2">
        {description.split('\n').map((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            return (
                <div key={index} className="flex items-start">
                <span className="mr-2 mt-1 text-vav-accent-primary">&bull;</span>
                <p className="flex-1 text-vav-text" dangerouslySetInnerHTML={createMarkup(trimmedLine.substring(2))}></p>
                </div>
            );
            }
            return <p key={index} className="text-vav-text whitespace-pre-wrap break-words" dangerouslySetInnerHTML={createMarkup(trimmedLine)}></p>;
        })}
        </div>
    );
}

const AdConfidenceDisplay = ({ value, confidence }) => {
  let config = {
    icon: <IoWarningOutline className="w-6 h-6 mr-2" />,
    textColor: 'text-orange-400',
    text: 'Low Confidence',
  };

  switch (confidence?.toLowerCase()) {
    case 'high':
      config = {
        icon: <IoShieldCheckmarkOutline className="w-6 h-6 mr-2" />,
        textColor: 'text-green-400',
        text: 'High Confidence',
      };
      break;
    case 'medium':
      config = {
        icon: <IoWarningOutline className="w-6 h-6 mr-2" />,
        textColor: 'text-yellow-400',
        text: 'Medium Confidence',
      };
      break;
    case 'low':
      break; // Already set
    default:
        return <p className="font-bold text-2xl text-vav-text-secondary">{value || 'Not available'}</p>
  }

  return (
    <div className={`flex items-center ${config.textColor}`}>
        {config.icon}
        <p className="font-bold text-2xl">{value}</p>
    </div>
  );
};

// --- NEW: A key/legend for the confidence colors ---
const ConfidenceKey = () => (
    <div>
        <h4 className="text-sm font-semibold text-vav-text-secondary mb-2">Confidence Level Key:</h4>
        <ul className="text-xs text-vav-text space-y-1">
            <li className="flex items-center"><span className="h-3 w-3 rounded-full bg-green-400 mr-2"></span> High Confidence</li>
            <li className="flex items-center"><span className="h-3 w-3 rounded-full bg-yellow-400 mr-2"></span> Medium Confidence</li>
            <li className="flex items-center"><span className="h-3 w-3 rounded-full bg-orange-400 mr-2"></span> Low Confidence</li>
        </ul>
    </div>
);

function AdAnalyzerPage() {
  const navigate = useNavigate();
  const [adImageFile, setAdImageFile] = useState(null);
  const [adImagePreviewUrl, setAdImagePreviewUrl] = useState(null);
  const [adUrl, setAdUrl] = useState(''); // State for the ad's URL
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ saving: false, error: null, success: null });

  // Tailwind classes
  const commonInputClass = "mt-1 block w-full px-3 py-2 bg-vav-background border border-vav-accent-primary rounded-md shadow-sm focus:outline-none focus:ring-vav-accent-secondary focus:border-vav-accent-secondary sm:text-sm text-vav-text placeholder-vav-text-secondary";
  const commonLabelClass = "block text-sm font-medium text-vav-text-secondary mb-1";
  const commonButtonClass = "w-full bg-vav-accent-primary hover:bg-vav-accent-secondary text-vav-background font-semibold py-3 px-4 rounded-md shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAdImageFile(file);
      if (adImagePreviewUrl) URL.revokeObjectURL(adImagePreviewUrl);
      setAdImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAnalyzeAd = async (e) => {
    e.preventDefault();
    setError(null);
    setAnalysisResult(null);
    setSaveStatus({ saving: false, error: null, success: null });
    if (!adImageFile || !adTitle || !adDescription || !askingPrice || !adUrl) {
      setError('Please fill in all required fields, including the Ad URL.');
      return;
    }
    setLoading(true);
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('adImage', adImageFile);
    formData.append('adTitle', adTitle);
    formData.append('adDescription', adDescription);
    formData.append('askingPrice', askingPrice);
    
    try {
      const response = await axios.post('/api/items/analyze-ad-listing', formData, {
        headers: { 'Content-Type': 'multipart-form-data', Authorization: `Bearer ${token}` },
      });
      setAnalysisResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze ad.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!analysisResult) return;
    setSaveStatus({ saving: true, error: null, success: null });
    const token = localStorage.getItem('authToken');
    
    const payload = {
        findType: 'Ad Analysis',
        imageUrl: analysisResult.gcsUrl, // The URL returned from the analysis step
        sourceUrl: adUrl,
        askingPrice: askingPrice,
        adAnalysis: analysisResult,
    };

    try {
        await axios.post('/api/wild-finds', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setSaveStatus({ saving: false, error: null, success: 'Analysis saved to Saved Finds!' });
    } catch (err) {
        setSaveStatus({ saving: false, error: err.response?.data?.message || 'Failed to save analysis.', success: null });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-vav-background-alt min-h-screen">
      <h1 className="text-3xl md:text-4xl font-bold font-serif text-vav-accent-primary mb-8 text-center">Vintage Audio Ad Analyzer</h1>
      <form onSubmit={handleAnalyzeAd} className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8 space-y-6">
        {/* Ad URL Input */}
        <div>
          <label htmlFor="adUrl" className={commonLabelClass}>Ad URL <span className="text-red-500">*</span></label>
          <input type="url" id="adUrl" value={adUrl} onChange={(e) => setAdUrl(e.target.value)} className={commonInputClass} placeholder="https:// ... paste the ad link here" required />
        </div>
        {/* Other inputs remain the same... */}
        <div><label htmlFor="adImageUpload" className={`${commonLabelClass} mb-1`}>Ad Image <span className="text-red-500">*</span></label><input type="file" id="adImageUpload" accept="image/*" onChange={handleImageChange} className={`${commonInputClass} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-vav-accent-primary file:text-vav-background hover:file:bg-vav-accent-secondary p-0 border-dashed`} required />{adImagePreviewUrl && <div className="mt-4 text-center"><img src={adImagePreviewUrl} alt="Ad preview" className="max-w-xs mx-auto rounded-md shadow-md max-h-60 object-contain" /></div>}</div>
        <div><label htmlFor="adTitle" className={commonLabelClass}>Ad Title <span className="text-red-500">*</span></label><input type="text" id="adTitle" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} className={commonInputClass} placeholder="e.g., Pioneer SX-780 Vintage Stereo Receiver" required /></div>
        <div><label htmlFor="adDescription" className={commonLabelClass}>Ad Description <span className="text-red-500">*</span></label><textarea id="adDescription" value={adDescription} onChange={(e) => setAdDescription(e.target.value)} className={commonInputClass} rows="6" placeholder="Copy and paste the full item description from the ad here..." required /></div>
        <div><label htmlFor="askingPrice" className={commonLabelClass}>Asking Price ($) <span className="text-red-500">*</span></label><input type="number" id="askingPrice" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} className={commonInputClass} placeholder="e.g., 250" min="0" step="0.01" required /></div>
        <div className="pt-4">{error && <p className="text-red-500 text-sm mb-4 text-center bg-red-900 bg-opacity-30 p-2 rounded">{error}</p>}<button type="submit" disabled={loading} className={commonButtonClass}>{loading ? 'Analyzing...' : 'Analyze Ad Listing'}</button></div>
      </form>
      
      {analysisResult && !loading && (
        <div className="mt-10 bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8">
            <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold font-serif text-vav-accent-primary">AI Analysis Report</h2>
                {/* Save Button and Status */}
                <div className="mt-4">
                    <button onClick={handleSaveAnalysis} disabled={saveStatus.saving || saveStatus.success} className="bg-vav-accent-secondary hover:bg-vav-accent-primary text-white font-semibold py-2 px-6 rounded-md shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed">
                        {saveStatus.saving ? 'Saving...' : (saveStatus.success ? 'Saved!' : 'Save to Saved Finds')}
                    </button>
                    {saveStatus.error && <p className="text-red-400 text-sm mt-2">{saveStatus.error}</p>}
                    {saveStatus.success && <p className="text-green-400 text-sm mt-2">{saveStatus.success}</p>}
                </div>
            </div>
            
            <div className="space-y-6">
                <div className="p-4 bg-vav-background-alt rounded-md shadow">
                    <h3 className="text-xl font-semibold text-vav-accent-secondary mb-3">AI Item Identification</h3>
                    <p className="text-vav-text"><strong>Make:</strong> {analysisResult.identifiedMake || 'Not identified'}</p>
                    <p className="text-vav-text"><strong>Model:</strong> {analysisResult.identifiedModel || 'Not identified'}</p>
                </div>
                <div className="p-4 bg-vav-background-alt rounded-md shadow">
                    <h3 className="text-xl font-semibold text-vav-accent-secondary mb-3">Price Insight</h3>
                    <div className="space-y-2">
                        <p className="text-vav-text"><strong>Seller's Asking Price:</strong> <span className="font-bold text-2xl">${parseFloat(analysisResult.askingPrice).toFixed(2)}</span></p>
                        <div className="text-vav-text flex items-center space-x-2">
                            <strong>AI Estimated Value:</strong>
                            <AdConfidenceDisplay
                                value={analysisResult.valueInsight?.estimatedValueUSD}
                                confidence={analysisResult.valueInsight?.valuationConfidence}
                            />
                        </div>
                    </div>
                    <div className="mt-3">
                        <FormattedAiDescription description={analysisResult.priceComparison?.insight} />
                    </div>
                    {/* --- NEW: Confidence key added here --- */}
                    <div className="mt-4 border-t border-vav-accent-primary/20 pt-3">
                        <ConfidenceKey />
                    </div>
                </div>
                <div className="p-4 bg-vav-background-alt rounded-md shadow">
                    <h3 className="text-xl font-semibold text-vav-accent-secondary mb-3">AI Visual Condition Assessment (from Image)</h3>
                    <FormattedAiDescription description={analysisResult.visualAnalysis?.conditionDescription} />
                </div>
                <div className="p-4 bg-vav-background-alt rounded-md shadow">
                    <h3 className="text-xl font-semibold text-vav-accent-secondary mb-3">Summary of Seller's Ad Text</h3>
                    <FormattedAiDescription description={analysisResult.textAnalysis?.sellerConditionSummary} />
                    {analysisResult.textAnalysis?.mentionedFeatures?.length > 0 && ( <> <h4 className="text-lg font-semibold text-vav-text-secondary mt-4 mb-2">Mentioned Features:</h4> <ul className="list-disc list-inside text-vav-text space-y-1"> {analysisResult.textAnalysis.mentionedFeatures.map((feature, i) => <li key={i}>{feature}</li>)} </ul> </> )}
                    {analysisResult.textAnalysis?.mentionedProblems?.length > 0 && ( <> <h4 className="text-lg font-semibold text-red-400 mt-4 mb-2">Mentioned Problems/Issues:</h4> <ul className="list-disc list-inside text-red-300 space-y-1"> {analysisResult.textAnalysis.mentionedProblems.map((problem, i) => <li key={i}>{problem}</li>)} </ul> </> )}
                </div>
                <div className="p-4 bg-vav-background-alt rounded-md shadow">
                    <h3 className="text-xl font-semibold text-vav-accent-secondary mb-3">AI Valuation Details</h3>
                    <FormattedAiDescription description={analysisResult.valueInsight?.marketDesirability} />
                    {analysisResult.valueInsight?.disclaimer && <p className="text-xs text-vav-text-secondary/80 italic mt-4">{analysisResult.valueInsight.disclaimer}</p>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default AdAnalyzerPage;