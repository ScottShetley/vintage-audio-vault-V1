// client/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Import your page components
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import AddItemPage from './pages/AddItemPage';
import DetailedItemView from './pages/DetailedItemView';
import EditItemPage from './pages/EditItemPage';
import WildFindPage from './pages/WildFindPage';
import AdAnalyzerPage from './pages/AdAnalyzerPage';
import LandingPage from './pages/LandingPage';
import InstructionsPage from './pages/InstructionsPage';
import DiscoverPage from './pages/DiscoverPage';
import SavedFindsPage from './pages/SavedFindsPage';
import SavedFindDetailsPage from './pages/SavedFindDetailsPage';
import ProfilePage from './pages/ProfilePage';
import FeedPage from './pages/FeedPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import UpdatesPage from './pages/UpdatesPage';

// --- 1. IMPORT THE LOGO ---
import VavLogo from './assets/vav-logo.png'; 

// Your main CSS file which now includes Tailwind directives
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [currentUser, setCurrentUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const { data } = await axios.get('/api/users/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setCurrentUser(data);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          handleLogout();
        }
      } else {
        setCurrentUser(null);
      }
    };

    fetchUser();
  }, [token]);

  // Close mobile menu when screen resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('authToken');
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);


  return (
    <div className="min-h-screen bg-vav-background text-vav-text font-sans flex flex-col items-center p-5 box-border">
      <nav className="w-full max-w-full md:max-w-4xl lg:max-w-6xl mb-10 py-4 border-b border-vav-content-card flex justify-between items-center mx-auto relative">
        {/* --- 2. REPLACE TEXT LINK WITH IMAGE LINK --- */}
        <Link to={token ? "/dashboard" : "/"} className="flex items-center">
          <img src={VavLogo} alt="Vintage Audio Vault Logo" className="h-12 w-auto" />
        </Link>
        
        {/* --- DESKTOP NAVIGATION --- */}
        <ul className="hidden md:flex gap-6 items-center list-none p-0 m-0">
          {token ? (
            // Logged IN Links
            <>
              <li><Link to="/discover" className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Discover</Link></li>
              <li><Link to="/feed" className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Feed</Link></li>
              <li><Link to="/dashboard" className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Dashboard</Link></li>
              <li><Link to="/wild-find" className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Wild Find</Link></li>
              <li><Link to="/ad-analyzer" className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Ad Analyzer</Link></li>
              
              {currentUser && (
                <li className="relative" ref={dropdownRef}>
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-vav-accent-primary hover:bg-vav-accent-secondary text-white font-bold py-2 px-4 rounded transition-colors">
                    {currentUser.username}
                    <svg className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-vav-content-card rounded-md shadow-lg py-1 z-10">
                      <Link to={`/profile/${currentUser._id}`} onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-vav-text hover:bg-vav-background-alt font-semibold">My Profile</Link>
                      <Link to="/saved-finds" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-vav-text hover:bg-vav-background-alt">Saved Finds</Link>
                      <Link to="/updates" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-vav-text hover:bg-vav-background-alt">Updates</Link>
                      <Link to="/instructions" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-vav-text hover:bg-vav-background-alt">Instructions</Link>
                      <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-vav-text hover:bg-vav-background-alt">
                        Logout
                      </button>
                    </div>
                  )}
                </li>
              )}
            </>
          ) : (
            // Logged OUT Links
            <>
              <li><Link to="/discover" className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Discover</Link></li>
              <li><Link to="/instructions" className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Instructions</Link></li>
              <li><Link to="/login" className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Login</Link></li>
              <li><Link to="/signup" className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Sign Up</Link></li>
            </>
          )}
        </ul>

        {/* --- MOBILE HAMBURGER BUTTON --- */}
        <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-vav-text-secondary focus:outline-none">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    {isMobileMenuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> // Close Icon
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /> // Hamburger Icon
                    )}
                </svg>
            </button>
        </div>

        {/* --- MOBILE MENU PANEL --- */}
        {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full bg-vav-content-card shadow-lg rounded-b-md z-20">
                <ul className="flex flex-col items-center gap-4 list-none p-5 m-0">
                    {token ? (
                        // Logged IN Mobile Links
                        <>
                            <li><Link to="/discover" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Discover</Link></li>
                            <li><Link to="/feed" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Feed</Link></li>
                            <li><Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Dashboard</Link></li>
                            <li><Link to="/wild-find" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Wild Find</Link></li>
                            <li><Link to="/ad-analyzer" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Ad Analyzer</Link></li>
                            <li className="w-full border-t border-vav-background-alt my-2"></li>
                            {currentUser && <li><Link to={`/profile/${currentUser._id}`} onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">My Profile</Link></li>}
                            <li><Link to="/saved-finds" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Saved Finds</Link></li>
                            <li><Link to="/updates" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Updates</Link></li>
                            <li><Link to="/instructions" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Instructions</Link></li>
                            <li><button onClick={handleLogout} className="text-lg font-semibold text-vav-accent-primary hover:text-vav-text transition-colors">Logout</button></li>
                        </>
                    ) : (
                        // Logged OUT Mobile Links
                        <>
                            <li><Link to="/discover" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Discover</Link></li>
                            <li><Link to="/instructions" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Instructions</Link></li>
                            <li><Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Login</Link></li>
                            <li><Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Sign Up</Link></li>
                        </>
                    )}
                </ul>
            </div>
        )}
      </nav>

      <main className="w-full max-w-full md:max-w-4xl lg:max-w-6xl flex-grow flex flex-col items-center justify-center mx-auto">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/instructions" element={<InstructionsPage />} />
          <Route path="/login" element={<LoginPage setToken={setToken} />} />
          <Route path="/signup" element={<SignupPage setToken={setToken} />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/terms-of-use" element={<TermsOfUsePage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/updates" element={<UpdatesPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/dashboard" element={<DashboardPage token={token} />} />
            <Route path="/add-item" element={<AddItemPage />} />
            <Route path="/item/:id" element={<DetailedItemView />} />
            <Route path="/edit-item/:id" element={<EditItemPage />} />
            <Route path="/wild-find" element={<WildFindPage />} />
            <Route path="/saved-finds" element={<SavedFindsPage />} />
            <Route path="/saved-finds/:id" element={<SavedFindDetailsPage />} />
            <Route path="/ad-analyzer" element={<AdAnalyzerPage />} />
          </Route>

          {/* Catch-all route for 404s */}
          <Route path="*" element={<p className="text-center mt-12 text-xl text-vav-text">404 - Page Not Found</p>} />
        </Routes>
      </main>
    </div>
  );
}

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;