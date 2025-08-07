// client/src/pages/UpdatesPage.jsx
import React from 'react';
import {Link} from 'react-router-dom';

const UpdateEntry = ({date, tag, tagColor, children}) => (
  <div className="mb-6">
    <p className="text-sm text-vav-text-secondary">{date}</p>
    <div className="flex items-start">
      <span
        className={`flex-shrink-0 inline-block px-2 py-0.5 text-sm font-semibold rounded-full mr-3 ${tagColor}`}
      >
        {tag}
      </span>
      <p className="text-vav-text leading-relaxed">
        {children}
      </p>
    </div>
  </div>
);

const UpdatesPage = () => {
  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6 bg-vav-content-card rounded-lg shadow-xl text-vav-text">
      <h1 className="text-4xl font-serif text-vav-accent-primary mb-2">
        Application Updates
      </h1>
      <p className="text-lg text-vav-text-secondary mb-8 border-b border-vav-background-alt pb-4">
        A log of new features, improvements, and bug fixes for our alpha testers.
      </p>

      {/* --- August 7, 2025 --- */}
      <UpdateEntry
        date="August 7, 2025"
        tag="IMPROVEMENT"
        tagColor="bg-blue-800 text-blue-100"
      >
        Added full Progressive Web App (PWA) support. The application can now be installed on desktop and mobile devices from Chrome and Safari for a native app-like experience. This also resolves an issue where the installed app would always start on the login page; it now correctly starts on the Discover page.
      </UpdateEntry>

      <UpdateEntry
        date="August 7, 2025"
        tag="FIX"
        tagColor="bg-green-800 text-green-100"
      >
        Logged-in users who close the app and return later will no longer be shown the login page. They are now correctly redirected to the Discover page upon returning.
      </UpdateEntry>

      <div className="mt-10 text-center">
        <Link
          to="/dashboard"
          className="text-vav-accent-primary hover:text-vav-accent-secondary transition-colors font-semibold"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default UpdatesPage;
