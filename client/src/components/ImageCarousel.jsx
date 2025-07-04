// client/src/components/ImageCarousel.jsx

import React, { useState } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

const ImageCarousel = ({ photos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const placeholderImageUrl = 'https://placehold.co/600x400/2C2C2C/E0E0E0?text=No+Image';

  // Use photos if available, otherwise use a placeholder
  const imageSources = photos && photos.length > 0 ? photos : [placeholderImageUrl];

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? imageSources.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === imageSources.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  // Do not render buttons if there's only one image
  const showButtons = imageSources.length > 1;

  return (
    <div className="relative w-full h-auto max-h-96 aspect-video group">
      {/* Main Image */}
      <div
        style={{ backgroundImage: `url(${imageSources[currentIndex]})` }}
        className="w-full h-full bg-center bg-contain bg-no-repeat rounded-md shadow-sm"
        onError={(e) => { e.target.onerror = null; e.target.src = placeholderImageUrl; }}
      >
        {/* This div is for display; the img tag below is for accessibility */}
        <img src={imageSources[currentIndex]} alt={`Slide ${currentIndex + 1}`} className="sr-only" />
      </div>

      {/* Left Arrow */}
      {showButtons && (
        <div className="absolute top-1/2 left-0 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={goToPrevious}
            className="bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 focus:outline-none"
            aria-label="Previous Image"
          >
            <IoChevronBack size={24} />
          </button>
        </div>
      )}

      {/* Right Arrow */}
      {showButtons && (
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={goToNext}
            className="bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 focus:outline-none"
            aria-label="Next Image"
          >
            <IoChevronForward size={24} />
          </button>
        </div>
      )}

      {/* Image Counter */}
      {showButtons && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs font-semibold px-2 py-1 rounded-full">
          {currentIndex + 1} / {imageSources.length}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;