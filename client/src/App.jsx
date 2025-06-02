// client/src/App.jsx
import React from 'react';
import {BrowserRouter as Router, Routes, Route, Link} from 'react-router-dom';

// Import your page components
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';

// --- ADD THIS LINE ---
import AddItemPage from './pages/AddItemPage'; // Import the AddItemPage
// --- END ADDED LINE ---

// Your main CSS file which now includes Tailwind directives
import './index.css';

function App () {
  return (
    <Router>
      {/* Apply the overall dark theme using Tailwind classes and custom colors */}
      <div className="min-h-screen bg-vav-background text-vav-text font-sans flex flex-col items-center p-5 box-border">
        {/* Basic Navigation Links */}
        <nav className="w-full max-w-4xl mb-10 py-4 border-b border-vav-content-card flex justify-center items-center">
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
          </ul>
        </nav>

        {/* Main content area where routes are rendered */}
        <main className="w-full max-w-3xl flex-grow flex flex-col items-center justify-start">
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
              {/* --- ADD THIS ROUTE --- */}
              <Route path="/add-item" element={<AddItemPage />} />
              {/* --- END ADDED ROUTE --- */}
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
