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

      {/* --- August 6, 2025 --- */}
      <UpdateEntry
        date="August 6, 2025"
        tag="FIX"
        tagColor="bg-green-800 text-green-100"
      >
        Resolved the "cold start" issue on the production server by implementing a robust, external keep-alive system using a GitHub Actions workflow. [cite_start]This ensures the app is always responsive. [cite: 1050, 1052]
      </UpdateEntry>

      {/* --- August 4, 2025 --- */}
      <UpdateEntry
        date="August 4, 2025"
        tag="NEW"
        tagColor="bg-purple-800 text-purple-100"
      >
        [cite_start]Completed the full application test plan, verifying the stability and functionality of all major features. [cite: 958]
      </UpdateEntry>
      <UpdateEntry
        date="August 4, 2025"
        tag="SECURITY"
        tagColor="bg-red-800 text-red-100"
      >
        [cite_start]Secured the production Google Cloud API Key by applying IP address restrictions. [cite: 959]
      </UpdateEntry>

      {/* --- August 3, 2025 --- */}
      <UpdateEntry
        date="August 3, 2025"
        tag="NEW"
        tagColor="bg-purple-800 text-purple-100"
      >
        Users can now select a "Cover Photo" for their items from the Edit page. [cite_start]This image is used as the thumbnail on all feed and discovery pages. [cite: 832, 836]
      </UpdateEntry>
      <UpdateEntry
        date="August 3, 2025"
        tag="IMPROVEMENT"
        tagColor="bg-blue-800 text-blue-100"
      >
        [cite_start]Implemented a fully responsive "hamburger" menu for improved navigation on mobile devices. [cite: 831]
      </UpdateEntry>

      {/* --- August 1, 2025 --- */}
      <UpdateEntry
        date="August 1, 2025"
        tag="NEW"
        tagColor="bg-purple-800 text-purple-100"
      >
        Implemented the AI "Value with a Warning" feature. [cite_start]The AI now provides a valuation estimate along with a "High," "Medium," or "Low" confidence score, which is displayed in the UI with corresponding colors and icons. [cite: 705, 707]
      </UpdateEntry>
      <UpdateEntry
        date="August 1, 2025"
        tag="FIX"
        tagColor="bg-green-800 text-green-100"
      >
        [cite_start]Fixed multiple production deployment issues, including a server crash related to Google Cloud authentication and 404 errors when refreshing pages. [cite: 702, 704]
      </UpdateEntry>

      {/* --- July 31, 2025 --- */}
      <UpdateEntry
        date="July 31, 2025"
        tag="FIX"
        tagColor="bg-green-800 text-green-100"
      >
        Resolved a critical and complex bug that prevented users from reliably adding or deleting photos when editing an item. [cite_start]The root cause was identified as special characters in filenames creating broken URLs, which was resolved with filename sanitization. [cite: 623, 624, 625]
      </UpdateEntry>
      <UpdateEntry
        date="July 31, 2025"
        tag="NEW"
        tagColor="bg-purple-800 text-purple-100"
      >
        [cite_start]The application was successfully deployed to a live production environment on Render. [cite: 617]
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
