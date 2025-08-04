// client/src/pages/LandingPage.jsx
import React from 'react';
import {Link} from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="text-center p-4">

      {/* --- NEW: Alpha Tester Welcome Box --- */}
      <div className="max-w-2xl mx-auto mb-12 p-4 border border-vav-accent-secondary rounded-lg bg-vav-content-card">
        <h2 className="text-xl font-bold text-vav-accent-primary">
          Skylab's Audio - Closed Alpha Test
        </h2>
        <p className="text-md text-vav-text-secondary mt-2">
          Welcome! Thank you for helping test the Vintage Audio Vault. Please use the "Sign Up" button below to create your account and get started.
        </p>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold font-serif text-vav-text mb-4">
        Welcome to the Vintage Audio Vault
      </h1>
      <p className="text-lg md:text-xl text-vav-accent-primary mb-10">
        Your ultimate tool for tracking, valuing, and managing your classic audio equipment collection.
      </p>

      {/* Primary action buttons */}
      <div className="flex justify-center items-center gap-4">
        <Link
          to="/login"
          className="bg-vav-accent-primary hover:bg-vav-accent-secondary text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="bg-vav-content-card hover:bg-gray-700 text-vav-text font-bold py-3 px-8 rounded-lg transition-colors text-lg"
        >
          Sign Up
        </Link>
      </div>

      {/* Secondary "How It Works" link */}
      <div className="mt-12">
        <Link
          to="/instructions"
          className="text-vav-text-secondary hover:text-vav-accent-primary font-semibold py-2 px-6 rounded-lg transition-colors text-md"
        >
          How It Works
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
