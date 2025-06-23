// client/src/pages/LandingPage.jsx
import React from 'react';
import {Link} from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="text-center">
      <h1 className="text-5xl font-bold text-vav-text mb-4">
        Welcome to the Vintage Audio Vault
      </h1>
      <p className="text-xl text-vav-accent-primary mb-8">
        Your ultimate tool for tracking, valuing, and managing your classic audio equipment collection.
      </p>
      <div className="space-x-4">
        <Link
          to="/login"
          className="bg-vav-accent-primary hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="bg-vav-content-card hover:bg-gray-600 text-vav-text font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
