// client/src/components/FormattedAiDescription.jsx
import React from 'react';

/**
 * A component that takes a string and formats it for display,
 * handling newline characters for paragraphs and markdown for bolding.
 * @param {{ description: string }} props - The component props.
 * @returns {React.ReactElement|null} - The formatted text or null if no description is provided.
 */
const FormattedAiDescription = ({ description }) => {
  // If description is null, undefined, or empty, don't render anything.
  if (!description) {
    return null;
  }

  // Function to handle markdown-like bolding (**text**)
  const createMarkup = (text) => {
    const html = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-vav-text-secondary">$1</strong>');
    return { __html: html };
  };

  // Split the description by newline characters and filter out any empty strings
  const paragraphs = description
    .split('\n')
    .map(line => line.trim()) // Trim each line
    .filter(line => line !== ''); // Filter out empty lines

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, index) => {
        // Additionally handle bullet points
        if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
          return (
            <div key={index} className="flex items-start">
              <span className="mr-2 mt-1 text-vav-accent-primary">&bull;</span>
              <p className="flex-1 text-vav-text" dangerouslySetInnerHTML={createMarkup(paragraph.substring(2))}></p>
            </div>
          );
        }
        // Render regular paragraphs
        return (
          <p key={index} className="text-vav-text" dangerouslySetInnerHTML={createMarkup(paragraph)}></p>
        );
      })}
    </div>
  );
};

export default FormattedAiDescription;