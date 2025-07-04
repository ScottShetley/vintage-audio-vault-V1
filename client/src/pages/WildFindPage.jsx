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

            // On success, navigate to the results page with the returned data
            navigate('/saved-finds', { state: { scanData: response.data } });

        } catch (err) {
            console.error('Wild Find Scan Error:', err);
            setError(err.response?.data?.message || 'An unexpected error occurred during the scan.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-4">
            <div className="bg-vav-content-card shadow-xl rounded-lg p-6 md:p-8 text-center">
                <h1 className="text-3xl font-serif text-vav-accent-primary mb-2">Wild Find</h1>
                <p className="text-vav-text-secondary mb-6">
                    Spotted some vintage gear in the wild? Take a picture and let the AI tell you what it is.
                </p>

                {/* --- NEW: Instructional Text Box --- */}
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