// client/src/App.jsx
import React from 'react';
import {BrowserRouter as Router, Routes, Route, Link} from 'react-router-dom';

// Import your page components
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import AddItemPage from './pages/AddItemPage';
import DetailedItemView from './pages/DetailedItemView';
import EditItemPage from './pages/EditItemPage';
import WildFindPage from './pages/WildFindPage';
import AdAnalyzerPage from './pages/AdAnalyzerPage'; // Import the new AdAnalyzerPage

// Your main CSS file which now includes Tailwind directives
import './index.css';

function App () {
  return (
    <Router>
      {/* Apply the overall dark theme using Tailwind classes and custom colors */}
      {/* This outer div ensures the entire viewport is covered with the background */}
      <div className="min-h-screen bg-vav-background text-vav-text font-sans flex flex-col items-center p-5 box-border">
        {/* Navigation bar - centered and responsive width */}
        <nav className="w-full max-w-full md:max-w-4xl lg:max-w-6xl mb-10 py-4 border-b border-vav-content-card flex justify-center items-center mx-auto">
          <ul className="flex gap-8 list-none p-0 m-0">
            <li>
              <Link
                to="/login"
                className="text-vav-accent-primary text-lg font-bold no-underline hover:text-vav-text transition-colors"
              >
                Login
              </Link>
            </li>
            <li>
              <Link
                to="/signup"
                className="text-vav-accent-primary text-lg font-bold no-underline hover:text-vav-text transition-colors"
              >
                Sign Up
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard"
                className="text-vav-accent-primary text-lg font-bold no-underline hover:text-vav-text transition-colors"
              >
                Dashboard
              </Link>
            </li>
            {/* Add link for the Wild Find page */}
            <li>
              <Link
                to="/wild-find"
                className="text-vav-accent-primary text-lg font-bold no-underline hover:text-vav-text transition-colors"
              >
                Wild Find
              </Link>
            </li>
            {/* Add link for the new Ad Analyzer page */}
            <li>
              <Link
                to="/ad-analyzer"
                className="text-vav-accent-primary text-lg font-bold no-underline hover:text-vav-text transition-colors"
              >
                Ad Analyzer
              </Link>
            </li>
          </ul>
        </nav>

        {/* Main content area - takes available space, centered and responsive width */}
        {/* This main tag will be a flex container that centers its direct child (the page component) */}
        <main className="w-full max-w-full md:max-w-3xl lg:max-w-5xl flex-grow flex flex-col items-center justify-center mx-auto">
          {/* Define your routes here */}
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                <p className="text-center mt-12 text-xl text-vav-text">
                  Welcome to Vintage Audio Vault! Please Login or Sign Up.
                </p>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/add-item" element={<AddItemPage />} />
              <Route path="/item/:id" element={<DetailedItemView />} />
              <Route path="/edit-item/:id" element={<EditItemPage />} />
              <Route path="/wild-find" element={<WildFindPage />} />
              <Route path="/ad-analyzer" element={<AdAnalyzerPage />} />
              {' '}
              {/* Add the new protected route for AdAnalyzerPage */}
            </Route>

            {/* Catch-all route for 404s */}
            <Route
              path="*"
              element={
                <p className="text-center mt-12 text-xl text-vav-text">
                  404 - Page Not Found
                </p>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
