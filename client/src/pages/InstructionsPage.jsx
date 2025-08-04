// client/src/pages/InstructionsPage.jsx
import React from 'react';

// A key/legend for the confidence colors
const ConfidenceKey = () => (
  <div className="mt-4 p-4 bg-vav-background rounded-md border border-vav-background-alt">
    <h4 className="text-md font-semibold text-vav-text-secondary mb-2">
      Confidence Level Key:
    </h4>
    <p className="text-sm text-vav-text-secondary mb-3">
      This key appears on AI analysis reports to give you a quick visual guide to the AI's certainty in its estimated value.
    </p>
    <ul className="text-sm text-vav-text space-y-2">
      <li className="flex items-center">
        <span className="h-4 w-4 rounded-full bg-green-400 mr-3 border border-black/20" />
        {' '}
        High Confidence
      </li>
      <li className="flex items-center">
        <span className="h-4 w-4 rounded-full bg-yellow-400 mr-3 border border-black/20" />
        {' '}
        Medium Confidence
      </li>
      <li className="flex items-center">
        <span className="h-4 w-4 rounded-full bg-orange-400 mr-3 border border-black/20" />
        {' '}
        Low Confidence
      </li>
    </ul>
  </div>
);

const InstructionsPage = () => {
  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-8 bg-vav-content-card rounded-lg shadow-lg text-vav-text-secondary">

      {/* --- NEW: Alpha Tester Welcome Section --- */}
      <section className="mb-10 p-4 border-l-4 border-vav-accent-primary bg-vav-background-alt rounded-r-lg">
        <h2 className="text-2xl font-semibold text-vav-accent-primary mb-3">
          A Note for Our Alpha Testers
        </h2>
        <div className="space-y-4">
          <p>
            Thank you for being one of the very first people to test the VAV application. Your expertise as a member of the Skylab's Audio community is incredibly valuable, and your feedback will directly shape the future of this tool.
          </p>
          <div>
            <h3 className="text-lg font-semibold text-vav-text mb-2">
              Goals of this Alpha Test:
            </h3>
            <p>
              Over the next two weeks, we're hoping to get your feedback on three key areas:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-4">
              <li>
                <strong>The Concept:</strong>
                {' '}
                Is this tool genuinely useful? Does it solve a real problem for you?
              </li>
              <li>
                <strong>Usability:</strong>
                {' '}
                Is the app easy and intuitive to navigate? Where do you get stuck?
              </li>
              <li>
                <strong>Features:</strong>
                {' '}
                Are the AI tools ("Wild Find", "Ad Analyzer") helpful? What's the most important feature that's missing?
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-vav-text mb-2">
              How to Provide Feedback:
            </h3>
            <p>
              Please post all your thoughts, bug reports (with screenshots if possible!), and feature ideas in the private
              {' '}
              <strong>#vav-feedback</strong>
              {' '}
              channel on the Skylab's Audio Discord server.
            </p>
          </div>
        </div>
      </section>

      <h1 className="text-3xl font-bold font-serif text-vav-text mb-6 border-b border-gray-600 pb-3">
        How to Use the Vintage Audio Vault
      </h1>

      <div className="space-y-8">

        <section>
          <h2 className="text-2xl font-semibold text-vav-accent-primary mb-3">
            Managing Your Collection
          </h2>
          <p>
            The
            {' '}
            <strong>Dashboard</strong>
            {' '}
            is your main collection view. Here you can see all the items you've cataloged, add new items, and manage your inventory. When adding or editing an item, you can:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 pl-4">
            <li>
              Set items as
              {' '}
              <strong>Public</strong>
              {' '}
              to share with the community or
              {' '}
              <strong>Private</strong>
              {' '}
              to keep them visible only to you.
            </li>
            <li>
              List items for sale by checking the
              {' '}
              <strong>"For Sale"</strong>
              {' '}
              box and adding an asking price.
            </li>
            <li>
              Indicate you are open to offers by checking the
              {' '}
              <strong>"Open to Trades"</strong>
              {' '}
              box.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-vav-accent-primary mb-3">
            Community & Discovery
          </h2>
          <p className="mb-2">
            This app is also a community hub for enthusiasts. You can connect with others and discover new gear.
          </p>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li>
              The
              {' '}
              <strong>Discover Page</strong>
              {' '}
              is the public marketplace where you can see all public items from every user.
            </li>
            <li>
              The
              {' '}
              <strong>Feed Page</strong>
              {' '}
              is your personalized stream, showing new items only from users you follow.
            </li>
            <li>
              You can visit other users'
              {' '}
              <strong>Profiles</strong>
              {' '}
              to see their public collections and choose to follow or unfollow them.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-vav-accent-primary mb-3">
            Understanding the AI Tools
          </h2>
          <p className="mb-2">
            The AI is your personal audio expert, helping you identify and value equipment.
          </p>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li>
              <strong>Wild Find:</strong>
              {' '}
              Found gear in the wild? Upload a picture, and the AI will attempt to identify it, assess its condition, and provide an estimated value. You can save these finds to your profile.
            </li>
            <li>
              <strong>Ad Analyzer:</strong>
              {' '}
              Considering a purchase? Provide the ad's details, and the AI will give you a breakdown of the listing, including a price comparison and condition analysis.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-vav-text mb-3">
            Understanding the AI Valuation & Confidence Score
          </h2>
          <p>
            The AI determines an estimated value by acting as a virtual audio expert. It combines the information you provide (make, model, images, etc.) with its vast knowledge of vintage audio equipment, including its history, reputation, and current market desirability.
          </p>
          <p className="mt-2">
            A **Confidence Score** is provided with each valuation. This score reflects the AI's certainty about its own estimate based on the amount of information it could find. It is
            {' '}
            <strong>not</strong>
            {' '}
            a direct warning about the seller's asking price. Low confidence usually means the item is rare, obscure, or the provided information was too generic.
          </p>
          <ConfidenceKey />
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-vav-accent-primary mb-3">
            Tips for Best AI Results
          </h2>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li>
              <strong>Use Clear Photos:</strong>
              {' '}
              For the most accurate identifications, use clear, well-lit photos of the item's front panel where the make and model numbers are visible.
            </li>
            <li>
              <strong>AI Identification Correction:</strong>
              {' '}
              When adding an item, if the AI is highly confident that your photo shows a different item than what you typed, it will flag the discrepancy and may auto-correct the make and model for a more accurate analysis.
            </li>
          </ul>
        </section>

      </div>
    </div>
  );
};

export default InstructionsPage;
