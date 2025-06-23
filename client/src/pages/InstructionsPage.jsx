// client/src/pages/InstructionsPage.jsx
import React from 'react';

const InstructionsPage = () => {
  return (
    <div className="w-full max-w-4xl p-8 bg-vav-content-card rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-vav-text mb-6 border-b border-gray-600 pb-2">
        How to Use the Vintage Audio Vault
      </h1>
      <div className="space-y-4 text-vav-text-secondary">
        <p>
          This application is designed to be your all-in-one companion for vintage audio collecting.
        </p>
        <h2 className="text-2xl font-semibold text-vav-accent-primary pt-4">
          Dashboard
        </h2>
        <p>
          The dashboard is your main collection view. Here you can see all the items you've cataloged, add new items, and manage your inventory.
        </p>
        <h2 className="text-2xl font-semibold text-vav-accent-primary pt-4">
          Wild Find AI Analysis
        </h2>
        <p>
          Found a piece of gear in the wild? Upload a picture to the "Wild Find" page, and our AI will attempt to identify the item, assess its visual condition, and provide an estimated value. You can then save these finds to your profile.
        </p>
        <h2 className="text-2xl font-semibold text-vav-accent-primary pt-4">
          Ad Analyzer
        </h2>
        <p>
          Considering a purchase from an online ad? Use the "Ad Analyzer" to get a second opinion. Provide the ad's title, description, price, and image, and the AI will give you a detailed breakdown of the listing, including a price comparison and condition analysis.
        </p>
      </div>
    </div>
  );
};

export default InstructionsPage;
