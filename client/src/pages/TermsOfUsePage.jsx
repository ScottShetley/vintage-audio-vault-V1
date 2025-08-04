// client/src/pages/TermsOfUsePage.jsx
import React from 'react';
import {Link} from 'react-router-dom';

const TermsOfUsePage = () => {
  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col items-center">
      <div className="bg-vav-content-card p-8 rounded-lg shadow-xl w-full text-vav-text">
        <h1 className="text-3xl font-serif text-vav-accent-primary mb-6 text-center">
          Terms of Use
        </h1>
        <div className="space-y-4 text-vav-text-secondary leading-relaxed">
          <p className="font-bold text-vav-text">
            Last Updated: August 4, 2025
          </p>
          <p>
            Welcome to the Vintage Audio Vault ("VAV")! Thank you for participating in our closed alpha test. By creating an account and using this application, you agree to these terms.
          </p>

          <h2 className="text-xl font-semibold text-vav-text pt-4">
            1. Alpha Test Software
          </h2>
          <p>
            You acknowledge that VAV is a pre-release, alpha version of the software. The application is provided "as-is" without any guarantees. Features may change, be removed, or not work as expected.
          </p>

          <h2 className="text-xl font-semibold text-vav-text pt-4">
            2. Purpose of Test
          </h2>
          <p>
            The goal of this test is to gather feedback on functionality, usability, and the core concept of VAV.
          </p>

          <h2 className="text-xl font-semibold text-vav-text pt-4">3. Data</h2>
          <p>
            While we will do our best to preserve your data, this is a test environment. You acknowledge that any data you enter into VAV, including item details and uploaded photos, may be deleted or wiped at any time. Please do not upload sensitive or irreplaceable information.
          </p>

          <h2 className="text-xl font-semibold text-vav-text pt-4">
            4. Your Content
          </h2>
          <p>
            You retain full ownership of the text and images you upload to your personal collection. By uploading, you grant VAV a license to use this content to provide and improve the application's services (e.g., for AI analysis).
          </p>

          <h2 className="text-xl font-semibold text-vav-text pt-4">
            5. Feedback
          </h2>
          <p>
            Any feedback, ideas, or suggestions you provide regarding VAV are greatly appreciated and will be owned by the developer (Scott Shetley) to be used for the improvement of the application.
          </p>

          <h2 className="text-xl font-semibold text-vav-text pt-4">
            6. Termination
          </h2>
          <p>
            We reserve the right to terminate your access to the alpha test at any time for any reason.
          </p>

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

export default TermsOfUsePage;
