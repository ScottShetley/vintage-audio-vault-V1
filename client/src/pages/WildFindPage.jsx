// client/src/pages/WildFindPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { IoInformationCircleOutline } from 'react-icons/io5';

const WildFindPage = () => {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [scanResults, setScanResults] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);


    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setError('');
    };

    const handleScan = async () => {
        if (!selectedFile) {
            setError('Please select an image file first.');
            return;
        }

        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken');

        if (!token) {
            navigate('/login');
            return;
        }

        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            const response = await axios.post('/api/items/wild-find-initial-scan', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            setScanResults(response.data.scannedItems);
            setImageUrl(response.data.imageUrl);

        } catch (err) {
            console.error('Wild Find Scan Error:', err);
            setError(err.response?.data?.message || 'An unexpected error occurred during the scan.');
        } finally {
            setLoading(false);
        }
    };

    // --- UPDATED: This function now gets a full analysis before saving ---
    const handleSaveFind = async (itemToAnalyze) => {
        setIsSaving(true);
        setError('');
        const token = localStorage.getItem('authToken');

        try {
            // Step 1: Get the full, detailed analysis for the selected item.
            const detailedAnalysisResponse = await axios.post('/api/items/wild-find-detailed-analysis', 
                { items: [itemToAnalyze] }, // The endpoint expects an array of items
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // The API returns an array of analyses; we only need the first one.
            const fullAnalysisPayload = detailedAnalysisResponse.data.analyses[0];

            if (fullAnalysisPayload.error) {
                throw new Error(fullAnalysisPayload.error);
            }

            // Step 2: Create the payload for saving the find, using the full analysis data.
            const payloadToSave = {
                findType: 'Wild Find',
                imageUrl: imageUrl,
                isPublic: false,
                // The 'analysis' field will now perfectly match the database schema.
                analysis: fullAnalysisPayload 
            };

            // Step 3: Save the properly formatted find.
            await axios.post('/api/wild-finds', payloadToSave, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            // Step 4: Navigate to the saved finds page on success.
            navigate('/saved-finds');

        } catch (err) {
            console.error('Error processing or saving wild find:', err);
            setError(err.response?.data?.message || 'Could not save the find. The detailed analysis might have failed.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleStartOver = () => {
        setScanResults(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        setImageUrl('');
        setError('');
    };


    if (loading) {
        return (
            <div className="w-full max-w-2xl mx-auto p-4 text-center">
                 <div className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8">
                    <h2 className="text-2xl font-serif text-vav-accent-primary mb-4">Scanning Image...</h2>
                    <p className="text-vav-text-secondary">The AI is analyzing your find. Please wait.</p>
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-vav-accent-secondary"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (scanResults) {
        return (
            <div className="w-full max-w-2xl mx-auto p-4">
                <div className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8">
                    <h1 className="text-3xl font-serif text-vav-accent-primary mb-2 text-center">Scan Results</h1>
                    <p className="text-vav-text-secondary mb-6 text-center">The AI identified the following item(s). Save the one that looks correct to get a full analysis.</p>
                    
                    {error && <p className="text-red-500 text-sm my-4 text-center bg-red-100 p-3 rounded-md">{error}</p>}
                    
                    <div className="space-y-4">
                        {scanResults.map((item, index) => (
                            <div key={index} className="bg-vav-background p-4 rounded-lg border border-vav-accent-primary/20">
                                <h3 className="text-xl font-bold text-vav-text">{item.make} {item.model}</h3>
                                <p className="text-sm text-vav-text-secondary mt-1"><strong>Initial Observation:</strong> {item.conditionDescription}</p>
                                <button
                                    onClick={() => handleSaveFind(item)}
                                    disabled={isSaving}
                                    className="mt-4 w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md shadow-md disabled:opacity-50 hover:bg-green-700 transition-colors"
                                >
                                    {isSaving ? 'Analyzing & Saving...' : 'Analyze & Save this Find'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            onClick={handleStartOver}
                             className="bg-vav-accent-primary text-vav-background font-semibold py-2 px-6 rounded-md shadow-md hover:bg-vav-accent-secondary transition-colors"
                        >
                            Scan Another Image
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4">
            <div className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8 text-center">
                <h1 className="text-3xl font-serif text-vav-accent-primary mb-2">Wild Find</h1>
                <p className="text-vav-text-secondary mb-6">
                    Spotted some vintage gear in the wild? Take a picture and let the AI tell you what it is.
                </p>

                <div className="bg-vav-background border border-vav-accent-primary/30 rounded-lg p-4 my-6 text-left text-sm">
                    <div className="flex items-start">
                        <IoInformationCircleOutline className="h-5 w-5 text-vav-accent-primary mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-vav-text mb-1">Tips for the Best AI Scan</h4>
                            <ul className="list-disc list-inside text-vav-text-secondary space-y-1">
                                <li>For a quick, "in the moment" analysis, use one clear photo.</li>
                                <li>Ensure the **make and model** text on the gear is visible, if possible.</li>
                                <li>Good lighting and a straight-on angle give the most accurate results.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="border-2 border-dashed border-vav-accent-primary/50 rounded-lg p-8 hover:border-vav-accent-secondary transition-colors">
                    {previewUrl ? (
                        <div className="mb-4">
                            <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-md" />
                        </div>
                    ) : (
                        <p className="text-vav-text-secondary mb-4">Upload an image to get started</p>
                    )}

                    <input
                        type="file"
                        id="wild-find-upload"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={loading}
                    />
                    <label
                        htmlFor="wild-find-upload"
                        className={`cursor-pointer inline-block bg-vav-accent-primary text-vav-background font-semibold py-2 px-6 rounded-md shadow-md ${loading ? 'opacity-50' : 'hover:bg-vav-accent-secondary'}`}
                    >
                        Choose Image
                    </label>
                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

                <div className="mt-6">
                    <button
                        onClick={handleScan}
                        disabled={!selectedFile || loading}
                        className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-md shadow-md disabled:opacity-50 hover:bg-green-700 transition-colors"
                    >
                        {loading ? 'Scanning...' : 'Scan Image'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WildFindPage;