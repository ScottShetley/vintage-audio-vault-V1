// client/src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

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
                const decodedToken = jwtDecode(token);
                const loggedInUserId = decodedToken.id;

                const profileRequest = axios.get(`http://localhost:5000/api/users/profile/${userId}`);
                const loggedInUserRequest = axios.get(`http://localhost:5000/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const [profileResponse, loggedInUserResponse] = await Promise.all([
                    profileRequest,
                    loggedInUserRequest
                ]);

                setProfile(profileResponse.data);
                setLoggedInUser(loggedInUserResponse.data);

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
            await axios.post(`http://localhost:5000/api/users/${userId}/follow`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLoggedInUser(prev => ({ ...prev, following: [...prev.following, userId] }));
            setProfile(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
        } catch (err) {
            console.error("Failed to follow user:", err);
        }
    };

    const handleUnfollow = async () => {
        const token = localStorage.getItem('authToken');
        try {
            await axios.post(`http://localhost:5000/api/users/${userId}/unfollow`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLoggedInUser(prev => ({ ...prev, following: prev.following.filter(id => id !== userId) }));
            setProfile(prev => ({ ...prev, followersCount: prev.followersCount - 1 }));
        } catch (err) {
            console.error("Failed to unfollow user:", err);
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
    const isFollowing = loggedInUser.following.includes(userId);

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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {profile.items.map(item => (
                            <Link to={`/item/${item._id}`} key={item._id} className="block bg-vav-content-card p-4 rounded-lg shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all">
                                <img src={item.photoUrls[0] || 'https://placehold.co/300x200/2C2C2C/E0E0E0?text=No+Image'} alt={`${item.make} ${item.model}`} className="w-full h-48 object-cover rounded-md mb-4" />
                                <h3 className="text-lg font-bold text-vav-text-primary">{item.make} {item.model}</h3>
                                <p className="text-sm text-vav-text-secondary">{item.itemType}</p>
                            </Link>
                        ))}
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