// client/src/components/FormattedAiDescription.jsx
import React from 'react';

/**
 * A component that takes a string of text and formats it for display,
 * splitting the text by newline characters into separate paragraphs.
 * @param {{ text: string }} props - The component props.
 * @returns {React.ReactElement|null} - The formatted text or null if no text is provided.
 */
const FormattedAiDescription = ({text}) => {
  // If text is null, undefined, or empty, don't render anything.
  if (!text) {
    return null;
  }

  // Split the text by newline characters and filter out any empty strings
  // that might result from multiple newlines.
  const paragraphs = text
    .split ('\n')
    .filter (paragraph => paragraph.trim () !== '');

  return (
    <div>
      {paragraphs.map ((paragraph, index) => (
        <p key={index} className="text-vav-text mb-2 last:mb-0">
          {paragraph}
        </p>
      ))}
    </div>
  );
};

export default FormattedAiDescription;
