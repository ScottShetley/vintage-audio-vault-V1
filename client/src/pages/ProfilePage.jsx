import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import ItemCard from '../components/ItemCard'; // --- IMPORT the reusable ItemCard component

const ProfilePage = () => {
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('authToken');
            if (!token) {
                setError("You must be logged in to view profiles.");
                setLoading(false);
                return;
            }

            try {
                // We fetch the logged-in user's data from the /me endpoint
                // to ensure we have the latest 'following' list.
                const loggedInUserResponse = await axios.get('/api/users/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLoggedInUser(loggedInUserResponse.data);

                // Then fetch the profile data for the user whose page we are on.
                const profileResponse = await axios.get(`/api/users/profile/${userId}`);
                setProfile(profileResponse.data);

            } catch (err) {
                console.error("Failed to fetch profile data:", err);
                setError(err.response?.data?.message || "Failed to load profile.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [userId]);

    const handleFollow = async () => {
        const token = localStorage.getItem('authToken');
        try {
            // Use relative paths to leverage the Vite proxy
            await axios.post(`/api/users/${userId}/follow`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Optimistic UI update
            setLoggedInUser(prev => ({ ...prev, following: [...prev.following, userId] }));
            setProfile(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
        } catch (err) {
            console.error("Failed to follow user:", err);
            // Optionally, revert UI on failure
        }
    };

    const handleUnfollow = async () => {
        const token = localStorage.getItem('authToken');
        try {
            // Use relative paths to leverage the Vite proxy
            await axios.post(`/api/users/${userId}/unfollow`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Optimistic UI update
            setLoggedInUser(prev => ({ ...prev, following: prev.following.filter(id => id !== userId) }));
            setProfile(prev => ({ ...prev, followersCount: prev.followersCount - 1 }));
        } catch (err) {
            console.error("Failed to unfollow user:", err);
            // Optionally, revert UI on failure
        }
    };

    if (loading) {
        return <div className="text-center p-8 text-vav-text">Loading Profile...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }
    
    if (!profile || !loggedInUser) {
        return <div className="text-center p-8 text-vav-text">Could not load profile data.</div>;
    }

    const isOwnProfile = loggedInUser._id === userId;
    // Check if the loggedInUser's following array (which contains IDs) includes the current profile's ID
    const isFollowing = loggedInUser.following.some(followedUser => followedUser._id === userId);


    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <header className="flex flex-col md:flex-row items-center justify-between mb-8 p-6 bg-vav-content-card rounded-lg shadow-xl">
                <div>
                    <h1 className="text-4xl font-serif text-vav-accent-primary">{profile.username}</h1>
                    <div className="flex gap-6 mt-2 text-vav-text-secondary">
                        <span><strong className="text-vav-text">{profile.items.length}</strong> Items</span>
                        <span><strong className="text-vav-text">{profile.followersCount}</strong> Followers</span>
                        <span><strong className="text-vav-text">{profile.followingCount}</strong> Following</span>
                    </div>
                </div>
                {!isOwnProfile && (
                    isFollowing ? (
                        <button onClick={handleUnfollow} className="mt-4 md:mt-0 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors">
                            Unfollow
                        </button>
                    ) : (
                        <button onClick={handleFollow} className="mt-4 md:mt-0 bg-vav-accent-primary hover:bg-vav-accent-secondary text-white font-bold py-2 px-6 rounded transition-colors">
                            Follow
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
                        {/* --- REFACTOR to use the ItemCard component --- */}
                        {profile.items.map(item => {
                            const normalizedItem = {
                                id: item._id,
                                title: `${item.make} ${item.model}`,
                                imageUrl: item.photoUrls?.[0],
                                tag: 'My Collection', // Or derive from item.status if needed
                                detailPath: `/item/${item._id}`,
                                // The profile doesn't include the item creator's name, but we can omit it here.
                                // username: profile.username, 
                                // userId: profile._id
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