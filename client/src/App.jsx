// client/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

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
import MarketplacePage from './pages/MarketplacePage';
import SavedFindsPage from './pages/SavedFindsPage';
import SavedFindDetailsPage from './pages/SavedFindDetailsPage';
import ProfilePage from './pages/ProfilePage';
import FeedPage from './pages/FeedPage';


// Your main CSS file which now includes Tailwind directives
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
    setIsDropdownOpen(false);
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
      <nav className="w-full max-w-full md:max-w-4xl lg:max-w-6xl mb-10 py-4 border-b border-vav-content-card flex justify-between items-center mx-auto">
        <Link to={token ? "/dashboard" : "/"} className="text-2xl font-bold text-vav-accent-primary no-underline">
          Vintage Audio Vault
        </Link>
        <ul className="flex gap-6 items-center list-none p-0 m-0">
          {token ? (
            // Logged IN Links
            <>
              {/* --- ADDED: Link to Marketplace Page --- */}
              <li><Link to="/marketplace" className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Marketplace</Link></li>
              <li><Link to="/feed" className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Feed</Link></li>
              <li><Link to="/dashboard" className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Dashboard</Link></li>
              <li><Link to="/wild-find" className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Wild Find</Link></li>
              <li><Link to="/ad-analyzer" className="text-lg font-semibold text-vav-text-secondary hover:text-vav-text transition-colors">Ad Analyzer</Link></li>
              
              <li className="relative" ref={dropdownRef}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-vav-accent-primary hover:bg-vav-accent-secondary text-white font-bold py-2 px-4 rounded transition-colors">
                  My Account
                  <svg className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-vav-content-card rounded-md shadow-lg py-1 z-10">
                    <Link to="/saved-finds" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-vav-text hover:bg-vav-background-alt">Saved Finds</Link>
                    <Link to="/instructions" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-vav-text hover:bg-vav-background-alt">Instructions</Link>
                    <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-vav-text hover:bg-vav-background-alt">
                      Logout
                    </button>
                  </div>
                )}
              </li>
            </>
          ) : (
            // Logged OUT Links
            <>
              {/* --- ADDED: Link to Marketplace Page --- */}
              <li><Link to="/marketplace" className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Marketplace</Link></li>
              <li><Link to="/instructions" className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Instructions</Link></li>
              <li><Link to="/login" className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Login</Link></li>
              <li><Link to="/signup" className="text-lg font-bold text-vav-accent-primary hover:text-vav-text transition-colors">Sign Up</Link></li>
            </>
          )}
        </ul>
      </nav>

      <main className="w-full max-w-full md:max-w-4xl lg:max-w-6xl flex-grow flex flex-col items-center justify-center mx-auto">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/instructions" element={<InstructionsPage />} />
          <Route path="/login" element={<LoginPage setToken={setToken} />} />
          <Route path="/signup" element={<SignupPage setToken={setToken} />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/dashboard" element={<DashboardPage token={token} />} />
            <Route path="/add-item" element={<AddItemPage />} />
            <Route path="/item/:id" element={<DetailedItemView />} />
            <Route path="/edit-item/:id" element={<EditItemPage />} />
            <Route path="/wild-find" element={<WildFindPage />} />
            <Route path="/saved-finds" element={<SavedFindsPage />} />
            <Route path="/wild-find-details/:id" element={<SavedFindDetailsPage />} />
            <Route path="/ad-analyzer" element={<AdAnalyzerPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
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