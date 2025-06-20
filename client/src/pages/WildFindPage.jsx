// client/src/pages/WildFindPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './WildFindPage.module.css';

// Helper component to format AI descriptions (remains the same)
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

function WildFindPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Step 1: Initial AI Scan
  const [initialScanItems, setInitialScanItems] = useState([]); // To store {id, make, model, conditionDescription}
  const [scanLoading, setScanLoading] = useState(false);

  // Step 2: User Edits & Final Analysis
  const [editedItems, setEditedItems] = useState([]); // To store user-editable make/model
  const [finalAnalysisResult, setFinalAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState('upload'); // 'upload', 'confirm', 'results'
  
  const navigate = useNavigate();

  const commonInputClass = "mt-1 block w-full px-3 py-2 bg-vav-background border border-vav-accent-primary rounded-md shadow-sm focus:outline-none focus:ring-vav-accent-secondary focus:border-vav-accent-secondary sm:text-sm text-vav-text placeholder-vav-text-secondary";
  const commonLabelClass = "block text-sm font-medium text-vav-text-secondary mb-1";

  const resetState = () => {
    setInitialScanItems([]);
    setEditedItems([]);
    setFinalAnalysisResult(null);
    setError(null);
    setCurrentStep('upload');
  };

  const handleFileChange = event => {
    const file = event.target.files[0];
    setSelectedFile(file);
    resetState(); // Reset everything when a new file is selected

    if (previewUrl) { URL.revokeObjectURL(previewUrl); }
    if (file) { setPreviewUrl(URL.createObjectURL(file)); } 
    else { setPreviewUrl(null); }
  };

  useEffect(() => {
    return () => { if (previewUrl) { URL.revokeObjectURL(previewUrl); } };
  }, [previewUrl]);

  const handleInitialScan = async () => {
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }
    setScanLoading(true);
    setError(null);
    setInitialScanItems([]);
    setEditedItems([]);
    setFinalAnalysisResult(null);
    setCurrentStep('upload'); // Stay on upload step during loading

    const formData = new FormData();
    formData.append('image', selectedFile);
    const token = localStorage.getItem('token');

    if (!token) {
      setError('You must be logged in to analyze images.');
      setScanLoading(false);
      navigate('/login');
      return;
    }

    try {
      // Placeholder for the new backend endpoint for initial scan
      const response = await axios.post('/api/items/wild-find-initial-scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` },
      });

      if (response.data && response.data.status === 'success' && response.data.scannedItems) {
        const itemsWithClientIds = response.data.scannedItems.map((item, index) => ({
          ...item,
          clientId: `item-${index}-${Date.now()}` // Unique client-side ID for list keys
        }));
        setInitialScanItems(itemsWithClientIds);
        setEditedItems(itemsWithClientIds.map(item => ({ // Initialize editedItems based on scan
            clientId: item.clientId,
            make: item.make || '',
            model: item.model || '',
            conditionDescription: item.conditionDescription // Keep original condition desc
        })));
        setCurrentStep('confirm');
      } else if (response.data && response.data.message) {
        setError(response.data.message);
        setCurrentStep('upload');
      } else {
        setError('Initial scan failed to return expected data.');
        setCurrentStep('upload');
      }
    } catch (err) {
      console.error('Error during initial scan:', err);
      let errorMessage = 'Failed to perform initial scan. Please try again.';
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
      setCurrentStep('upload');
    } finally {
      setScanLoading(false);
    }
  };

  const handleEditedItemChange = (clientId, field, value) => {
    setEditedItems(prevItems =>
      prevItems.map(item =>
        item.clientId === clientId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleGetFullAnalysis = async () => {
    if (editedItems.length === 0) {
      setError('No items to analyze. Please ensure the initial scan identified items.');
      return;
    }
    setAnalysisLoading(true);
    setError(null);
    setFinalAnalysisResult(null);
    // setCurrentStep('confirm'); // Stay on confirm step during loading

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to analyze images.');
      setAnalysisLoading(false);
      navigate('/login');
      return;
    }

    // Prepare items for the backend, ensuring we only send valid ones
    const itemsToAnalyze = editedItems.filter(item => item.make && item.model && item.make.toLowerCase() !== 'unidentified make' && item.model.toLowerCase() !== 'model not clearly identifiable');

    if (itemsToAnalyze.length === 0) {
        setError('Please provide a specific Make and Model for at least one item.');
        setAnalysisLoading(false);
        return;
    }
    
    try {
      // Placeholder for the new backend endpoint for detailed analysis
      const response = await axios.post('/api/items/wild-find-detailed-analysis', { items: itemsToAnalyze }, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setFinalAnalysisResult(response.data);
      setCurrentStep('results');
    } catch (err) {
      console.error('Error getting full analysis:', err);
      let errorMessage = 'Failed to get full analysis. Please try again.';
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
      setCurrentStep('confirm'); // Revert to confirm step on error
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className={`${styles.wildFindContainer}`}>
      <h1 className="text-3xl font-bold text-vav-accent-primary mb-6 text-center">Wild Find AI Assistant</h1>
      
      {/* Step 1: Upload Section */}
      {currentStep === 'upload' && (
        <>
          <p className="text-vav-text mb-6 text-center">Upload a photo of vintage audio equipment. The AI will scan it for items.</p>
          <div className={`${styles.contentCard} mb-6`}>
            <div className="mb-4">
              <label htmlFor="imageUpload" className="block text-vav-text text-sm font-bold mb-2">Upload Image:</label>
              <input type="file" id="imageUpload" accept="image/*" onChange={handleFileChange} className={`${styles.fileInput} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-vav-accent-primary file:text-vav-background hover:file:bg-vav-accent-secondary`} />
            </div>
            {previewUrl && ( <div className="mb-4 text-center"> <img src={previewUrl} alt="Selected preview" className={`${styles.imagePreview}`} /> </div> )}
            {selectedFile && ( <p className="text-vav-text text-sm mb-4 text-center">Selected file: {selectedFile.name}</p> )}
            <button onClick={handleInitialScan} disabled={!selectedFile || scanLoading} className={`${styles.analyzeButton} ${!selectedFile || scanLoading ? styles.analyzeButtonDisabled : styles.analyzeButtonActive}`}>
              {scanLoading ? (
                <div className={`${styles.loadingSpinner}`}>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Scanning Image...</span>
                </div>
              ) : ( 'Scan Image for Items' )}
            </button>
            {error && <p className={`${styles.errorMessage}`}>{error}</p>}
          </div>
        </>
      )}

      {/* Step 2: Confirmation and Edit Section */}
      {currentStep === 'confirm' && initialScanItems.length > 0 && (
        <>
          <p className="text-vav-text mb-6 text-center">The AI found the following item(s). Please confirm or correct the Make and Model, then proceed to full analysis.</p>
          {previewUrl && ( <div className="mb-6 text-center"> <img src={previewUrl} alt="Scanned preview" className={`${styles.imagePreview}`} /> </div> )}
          <div className="space-y-6 mb-6">
            {editedItems.map((item, index) => (
              <div key={item.clientId} className={`${styles.contentCard} p-4`}>
                <h2 className="text-xl font-semibold text-vav-accent-primary mb-3">Item {index + 1}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label htmlFor={`make-${item.clientId}`} className={commonLabelClass}>Make:</label>
                    <input
                      type="text"
                      id={`make-${item.clientId}`}
                      value={item.make}
                      onChange={(e) => handleEditedItemChange(item.clientId, 'make', e.target.value)}
                      className={commonInputClass}
                      placeholder="e.g., Pioneer"
                    />
                  </div>
                  <div>
                    <label htmlFor={`model-${item.clientId}`} className={commonLabelClass}>Model:</label>
                    <input
                      type="text"
                      id={`model-${item.clientId}`}
                      value={item.model}
                      onChange={(e) => handleEditedItemChange(item.clientId, 'model', e.target.value)}
                      className={commonInputClass}
                      placeholder="e.g., SX-780"
                    />
                  </div>
                </div>
                <div>
                  <h4 className={`${commonLabelClass} font-semibold`}>AI's Visual Condition Assessment:</h4>
                  <div className="text-sm text-vav-text bg-vav-background p-3 rounded-md shadow-inner mt-1 whitespace-pre-wrap break-words">
                    {initialScanItems.find(scanItem => scanItem.clientId === item.clientId)?.conditionDescription || "Not available."}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleGetFullAnalysis} disabled={analysisLoading || editedItems.length === 0} className={`${styles.analyzeButton} ${analysisLoading || editedItems.length === 0 ? styles.analyzeButtonDisabled : styles.analyzeButtonActive}`}>
            {analysisLoading ? (
              <div className={`${styles.loadingSpinner}`}>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Performing full analysis...</span>
              </div>
            ) : ( 'Get Full AI Analysis' )}
          </button>
          {error && <p className={`${styles.errorMessage} mt-4`}>{error}</p>}
          <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); resetState(); }} className="mt-4 w-full text-sm text-vav-accent-secondary hover:text-vav-accent-primary text-center">
            Start Over with a New Image
          </button>
        </>
      )}
       {currentStep === 'confirm' && initialScanItems.length === 0 && !scanLoading && (
         <div className={`${styles.contentCard} mb-6 p-4 text-center`}>
            <p className="text-vav-text-secondary">The AI could not clearly identify distinct items in this image for confirmation. Please try a different image or angle.</p>
            <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); resetState(); }} className="mt-4 text-sm text-vav-accent-primary hover:text-vav-accent-secondary">
                Upload New Image
            </button>
         </div>
       )}


      {/* Step 3: Display Full Success Results */}
      {currentStep === 'results' && finalAnalysisResult && finalAnalysisResult.status === 'success' && (
        <div className="space-y-8 mt-8">
            {finalAnalysisResult.analyses.map((analysis, index) => (
                <div key={index} className={`${styles.contentCard} ${styles.analysisResultSection}`}>
                    <div className="text-center mb-4 border-b border-vav-text-secondary/30 pb-4">
                        <h2 className="text-3xl font-bold text-vav-accent-primary">
                            {analysis.make} {analysis.model}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <div className="md:col-span-2 bg-vav-background p-4 rounded-md shadow-inner">
                            <h3 className="text-xl font-semibold text-vav-accent-secondary mb-2">Valuation</h3>
                            <p className="text-2xl font-bold text-vav-text mb-2">{analysis.valueRange}</p>
                            <FormattedAiDescription description={analysis.reasoning} />
                            <p className="text-xs text-vav-text-secondary/80 italic mt-4">{analysis.disclaimer}</p>
                        </div>
                        <div className="md:col-span-3 bg-vav-background p-4 rounded-md shadow-inner">
                            <h3 className="text-xl font-semibold text-vav-accent-secondary mb-2">Visual Condition Assessment</h3>
                            {/* Use the conditionDescription from the initial scan, which is part of the 'analysis' object now */}
                            <FormattedAiDescription description={analysis.conditionDescription} />
                            <h3 className="text-xl font-semibold text-vav-accent-secondary mt-4 mb-2">Key Features</h3>
                            <ul className="list-disc list-inside text-vav-text space-y-1">
                                {analysis.keyFeatures?.map((feature, i) => <li key={i}>{feature}</li>)}
                            </ul>
                        </div>
                    </div>
                    {analysis.specifications && analysis.specifications.length > 0 && (
                        <div className="mt-6 bg-vav-background p-4 rounded-md shadow-inner">
                            <h3 className="text-xl font-semibold text-vav-accent-secondary mb-3">Specifications</h3>
                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-vav-text">
                                {analysis.specifications.map((spec) => (
                                    <React.Fragment key={spec.name}>
                                        <span className="font-semibold text-vav-text-secondary text-right">{spec.name}:</span>
                                        <span>{spec.value}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
            <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); resetState(); }} className="mt-4 w-full text-sm text-vav-accent-primary hover:text-vav-accent-secondary text-center py-2 px-4 rounded-md border border-vav-accent-primary hover:bg-vav-accent-primary/10 transition-colors">
                Analyze Another Image
            </button>
        </div>
      )}

      {/* Display Error for Final Analysis */}
      {currentStep === 'results' && finalAnalysisResult && finalAnalysisResult.status !== 'success' && (
         <div className={`${styles.contentCard} ${styles.analysisResultSection} mt-8`}>
            <h2 className="text-2xl font-bold text-vav-accent-primary text-center">Analysis Problem</h2>
            <p className="text-vav-text-secondary mt-1 text-center">{finalAnalysisResult.message || "An unknown error occurred during the final analysis."}</p>
            <button onClick={() => setCurrentStep('confirm')} className="mt-4 w-full text-sm text-vav-accent-primary hover:text-vav-accent-secondary text-center">
                &larr; Back to Confirm/Edit Details
            </button>
         </div>
      )}
      {currentStep === 'results' && error && ( // General error during results display phase
         <div className={`${styles.contentCard} ${styles.analysisResultSection} mt-8`}>
            <h2 className="text-2xl font-bold text-vav-accent-primary text-center">Analysis Error</h2>
            <p className={`${styles.errorMessage} mt-1 text-center`}>{error}</p>
            <button onClick={() => setCurrentStep('confirm')} className="mt-4 w-full text-sm text-vav-accent-primary hover:text-vav-accent-secondary text-center">
                &larr; Back to Confirm/Edit Details
            </button>
         </div>
      )}

    </div>
  );
}

export default WildFindPage;
