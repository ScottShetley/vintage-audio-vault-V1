// client/src/pages/PrivacyPolicyPage.jsx
import React from 'react';
import {Link} from 'react-router-dom';

const PrivacyPolicyPage = () => {
  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col items-center">
      <div className="bg-vav-content-card p-8 rounded-lg shadow-xl w-full text-vav-text">
        <h1 className="text-3xl font-serif text-vav-accent-primary mb-6 text-center">
          Privacy Policy
        </h1>
        <div className="space-y-4 text-vav-text-secondary leading-relaxed">
          <p className="font-bold text-vav-text">
            Last Updated: August 4, 2025
          </p>
          <p>
            Your privacy is important to us. This policy explains what information we collect and how we use it.
          </p>

          <h2 className="text-xl font-semibold text-vav-text pt-4">
            1. Information We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Account Information:</strong>
              {' '}
              When you sign up, we collect your email address and a hashed (securely scrambled) version of your password.
            </li>
            <li>
              <strong>User-Generated Content:</strong>
              {' '}
              We collect the information you provide for your collection, including item details (make, model, notes, etc.) and the photos you upload.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-vav-text pt-4">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              To provide the core functionality of the VAV service.
            </li>
            <li>
              Your uploaded images and item details are sent to Google's Generative AI services to perform the analysis features of the app.
            </li>
            <li>
              To improve the application and fix bugs.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-vav-text pt-4">
            3. Data Storage
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Your data is stored securely on MongoDB Atlas.
            </li>
            <li>
              Your images are stored securely on Google Cloud Storage.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-vav-text pt-4">
            4. Data Sharing
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              We do not and will not sell your personal data to third parties.
            </li>
            <li>
              Your "Public" items are visible to other users of the application, along with your username. Your private "Notes" field is never visible to others.
            </li>
          </ul>

          <div className="text-center pt-6">
            <Link
              to="/signup"
              className="text-vav-accent-primary hover:text-vav-accent-secondary transition-colors font-semibold"
            >
              &larr; Back to Signup
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
