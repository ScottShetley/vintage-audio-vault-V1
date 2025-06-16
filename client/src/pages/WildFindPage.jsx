// WildFindPage.jsx
import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {useNavigate} from 'react-router-dom';
import styles from './WildFindPage.module.css';

// Helper component to format the AI description
function FormattedAiDescription({ description }) {
  if (!description) return null;

  // Split by one or more newlines to handle different spacing from AI
  const blocks = description.split(/\n+/).map(block => block.trim()).filter(block => block.length > 0);

  return (
    <div>
      {blocks.map((block, index) => {
        // Check for headings (e.g., **Key Features:**)
        if (block.startsWith('**') && block.endsWith(':**')) {
          const headingText = block.substring(2, block.length - 2);
          return (
            <h3 key={index} className="text-xl font-semibold text-vav-accent-primary mt-4 mb-2">
              {headingText}:
            </h3>
          );
        }
        // Check for list items (e.g., * **Make and Model:** Sansui)
        // This also handles bolded parts within the list item
        if (block.startsWith('* ')) {
          const listItemContent = block.substring(2);
          const parts = listItemContent.split('**'); // Split by bold markers
          return (
            <p key={index} className="text-vav-text ml-4 mb-1 pl-2" style={{ textIndent: '-1em' }}>
              <span className="mr-2">&bull;</span> {/* Manual bullet point */}
              {parts.map((part, i) =>
                i % 2 === 1 ? <strong key={i} className="font-semibold text-vav-text-secondary">{part}</strong> : part
              )}
            </p>
          );
        }
        // Regular paragraph
        return (
          <p key={index} className="text-vav-text mb-3 whitespace-pre-wrap break-words">
            {block}
          </p>
        );
      })}
    </div>
  );
}


function WildFindPage () {
  const [selectedFile, setSelectedFile] = useState (null);
  const [previewUrl, setPreviewUrl] = useState (null);
  const [analysisResult, setAnalysisResult] = useState (null);
  const [loading, setLoading] = useState (false);
  const [error, setError] = useState (null);
  const navigate = useNavigate ();

  const handleFileChange = event => {
    const file = event.target.files[0];
    setSelectedFile (file);
    setAnalysisResult (null);
    setError (null);

    if (previewUrl) {
      URL.revokeObjectURL (previewUrl); // Revoke old URL before creating new one
    }

    if (file) {
      setPreviewUrl (URL.createObjectURL (file));
    } else {
      setPreviewUrl (null);
    }
  };

  useEffect (
    () => {
      // Cleanup function to revoke the object URL when the component unmounts
      // or when previewUrl changes before a new one is set.
      return () => {
        if (previewUrl) {
          URL.revokeObjectURL (previewUrl);
        }
      };
    },
    [previewUrl]
  );

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError ('Please select an image file first.');
      return;
    }

    setLoading (true);
    setError (null);
    setAnalysisResult (null);

    const formData = new FormData ();
    formData.append ('image', selectedFile);

    const token = localStorage.getItem ('token');
    if (!token) {
      setError ('You must be logged in to analyze images.');
      setLoading (false);
      navigate ('/login');
      return;
    }

    try {
      const response = await axios.post (
        '/api/items/analyze-wild-find',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAnalysisResult (response.data);
    } catch (err) {
      console.error ('Error analyzing image:', err);
      let errorMessage = 'Failed to analyze image. Please try again.';
      if (err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          errorMessage =
            'Session expired or unauthorized. Please log in again.';
          localStorage.removeItem ('token');
          navigate ('/login');
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError (errorMessage);
    } finally {
      setLoading (false);
    }
  };

  return (
    <div className={`${styles.wildFindContainer}`}>
      <h1 className="text-3xl font-bold text-vav-accent-primary mb-6 text-center">
        Wild Find AI Analysis
      </h1>
      <p className="text-vav-text mb-6 text-center">
        Upload a photo of vintage audio equipment to get instant AI analysis,
        including identification and a detailed description.
      </p>

      <div className={`${styles.contentCard} mb-6`}>
        <div className="mb-4">
          <label
            htmlFor="imageUpload"
            className="block text-vav-text text-sm font-bold mb-2"
          >
            Upload Image:
          </label>
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            onChange={handleFileChange}
            className={`${styles.fileInput}
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-vav-accent-primary file:text-vav-background
                       hover:file:bg-vav-accent-secondary`}
          />
        </div>

        {previewUrl &&
          <div className="mb-4 text-center">
            <img
              src={previewUrl}
              alt="Selected preview"
              className={`${styles.imagePreview}`}
            />
          </div>}

        {selectedFile &&
          <p className="text-vav-text text-sm mb-4 text-center">
            Selected file: {selectedFile.name}
          </p>}

        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || loading}
          className={`${styles.analyzeButton} ${!selectedFile || loading ? styles.analyzeButtonDisabled : styles.analyzeButtonActive}`}
        >
          {loading
            ? <div className={`${styles.loadingSpinner}`}>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Analyzing...
              </div>
            : 'Analyze Image'}
        </button>

        {error && <p className={`${styles.errorMessage}`}>{error}</p>}
      </div>

      {analysisResult &&
        analysisResult.status === 'success' &&
        <div
          className={`${styles.contentCard} ${styles.analysisResultSection}`}
        >
          <h2 className="text-2xl font-bold text-vav-accent-primary mb-4">
            Analysis Result:
          </h2>
          {analysisResult.fileDetails &&
            <div className={`${styles.fileDetails}`}>
              <h3 className="text-lg font-semibold text-vav-text-secondary mb-1">
                File Details:
              </h3>
              <p className="text-vav-text text-sm">
                <strong>Name:</strong> {analysisResult.fileDetails.name}
              </p>
              <p className="text-vav-text text-sm">
                <strong>Type:</strong> {analysisResult.fileDetails.type}
              </p>
              <p className="text-vav-text text-sm">
                <strong>Size:</strong>
                {' '}
                {(analysisResult.fileDetails.size / 1024).toFixed (2)}
                {' '}
                KB
              </p>
            </div>}
          {analysisResult.analysisResult &&
            analysisResult.analysisResult.description &&
            <div className="mt-4"> {/* Added a wrapper div for the description section */}
              {/* Removed the h3 for "AI Description" as FormattedAiDescription will handle headings */}
              <FormattedAiDescription description={analysisResult.analysisResult.description} />
            </div>}
        </div>}
      {analysisResult &&
        analysisResult.status === 'error' &&
        <div className={`${styles.contentCard}`}>
          <h2 className="text-2xl font-bold text-red-500 mb-4">
            Analysis Failed:
          </h2>
          <p className="text-vav-text">
            {analysisResult.message ||
              'An unknown error occurred during analysis.'}
          </p>
          {analysisResult.errorDetails &&
            <p className="text-vav-text-secondary text-sm mt-2">
              Details: {analysisResult.errorDetails}
            </p>}
        </div>}
    </div>
  );
}

export default WildFindPage;
