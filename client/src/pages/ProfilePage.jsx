// client/src/pages/ProfilePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import ItemCard from '../components/ItemCard';

const ProfilePage = () => {
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isProcessingFollow, setIsProcessingFollow] = useState(false);

    // --- NEW: Reusable styled tags ---
    const FollowingTag = () => (
      <span className="ml-3 bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
        Following
      </span>
    );
    const FollowsYouTag = () => (
      <span className="ml-3 bg-teal-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
        Follows You
      </span>
    );
    
    // --- UPDATED ---
    // The data fetching logic is now consolidated into a single function.
    const fetchProfileData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('authToken');
        if (!token) {
            setError("You must be logged in to view profiles.");
            setLoading(false);
            return;
        }

        try {
            const profileResponse = await axios.get(`/api/users/profile/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(profileResponse.data);
        } catch (err) {
            console.error("Failed to fetch profile data:", err);
            setError(err.response?.data?.message || "Failed to load profile.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    // --- UPDATED ---
    // Follow/Unfollow handlers now optimistically update the UI and then refetch data.
    const handleFollow = async () => {
        setIsProcessingFollow(true);
        const token = localStorage.getItem('authToken');
        try {
            await axios.post(`/api/users/${userId}/follow`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchProfileData(); // Refetch to get the latest follower counts and status
        } catch (err) {
            console.error("Failed to follow user:", err);
            setError("An error occurred. Please try again.");
        } finally {
            setIsProcessingFollow(false);
        }
    };

    const handleUnfollow = async () => {
        setIsProcessingFollow(true);
        const token = localStorage.getItem('authToken');
        try {
            await axios.post(`/api/users/${userId}/unfollow`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchProfileData(); // Refetch to get the latest follower counts and status
        } catch (err) {
            console.error("Failed to unfollow user:", err);
            setError("An error occurred. Please try again.");
        } finally {
            setIsProcessingFollow(false);
        }
    };

    if (loading && !profile) { // Show initial loading spinner
        return <div className="text-center p-8 text-vav-text">Loading Profile...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }
    
    if (!profile) {
        return <div className="text-center p-8 text-vav-text">Could not load profile data.</div>;
    }
    
    // The logged-in user's ID is now fetched from the token on the backend.
    // We get the isOwnProfile status from comparing IDs.
    const token = localStorage.getItem('authToken');
    const loggedInUserId = token ? JSON.parse(atob(token.split('.')[1])).id : null;
    const isOwnProfile = loggedInUserId === userId;

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <header className="flex flex-col md:flex-row items-center justify-between mb-8 p-6 bg-vav-content-card rounded-lg shadow-xl">
                <div>
                    {/* --- UPDATED --- */}
                    {/* Username and tags are now displayed together */}
                    <div className="flex items-center mb-2">
                        <h1 className="text-4xl font-serif text-vav-accent-primary">{profile.username}</h1>
                        {profile.isFollowing && <FollowingTag />}
                        {profile.isFollower && <FollowsYouTag />}
                    </div>
                    <div className="flex gap-6 mt-2 text-vav-text-secondary">
                        <span><strong className="text-vav-text">{profile.items.length}</strong> Items</span>
                        <span><strong className="text-vav-text">{profile.followersCount}</strong> Followers</span>
                        <span><strong className="text-vav-text">{profile.followingCount}</strong> Following</span>
                    </div>
                </div>
                {/* --- UPDATED --- */}
                {/* Button logic now uses the isFollowing flag from the API */}
                {!isOwnProfile && (
                    profile.isFollowing ? (
                        <button onClick={handleUnfollow} disabled={isProcessingFollow} className="mt-4 md:mt-0 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors disabled:opacity-50">
                            {isProcessingFollow ? '...' : 'Unfollow'}
                        </button>
                    ) : (
                        <button onClick={handleFollow} disabled={isProcessingFollow} className="mt-4 md:mt-0 bg-vav-accent-primary hover:bg-vav-accent-secondary text-white font-bold py-2 px-6 rounded transition-colors disabled:opacity-50">
                             {isProcessingFollow ? '...' : 'Follow'}
                        </button>
                    )
                )}
            </header>

            <main>
                <h2 className="text-2xl font-semibold text-vav-text mb-4">Collection</h2>
                {!profile.isCollectionPublic ? (
                    <div className="text-center p-8 bg-vav-content-card rounded-lg text-vav-text-secondary">
                        This user's collection is private.
                    </div>
                ) : profile.items.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {profile.items.map(item => {
                            const normalizedItem = {
                                id: item._id,
                                title: `${item.make} ${item.model}`,
                                imageUrl: item.photoUrls?.[0],
                                tag: item.itemType,
                                detailPath: `/item/${item._id}`,
                                username: profile.username, 
                                userId: profile._id,
                                // Pass the follow status to the card
                                isFollowing: profile.isFollowing,
                            };
                            return <ItemCard key={item._id} item={normalizedItem} />;
                        })}
                    </div>
                ) : (
                    <div className="text-center p-8 bg-vav-content-card rounded-lg text-vav-text-secondary">
                        This user has not added any public items to their collection yet.
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProfilePage;