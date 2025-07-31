// client/src/components/ImageCarousel.jsx -- FINAL FIX
import React, { useState } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

const ImageCarousel = ({ photos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const placeholderImageUrl = 'https://placehold.co/600x400/2C2C2C/E0E0E0?text=No+Image';

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

  const handleImageError = (e) => {
    e.target.onerror = null; // Prevent infinite loop if placeholder also fails
    e.target.src = placeholderImageUrl;
  };

  const showButtons = imageSources.length > 1;

  return (
    <div className="relative w-full aspect-video group bg-vav-background flex items-center justify-center rounded-lg shadow-sm">
      {/* Main Image Display using <img> tag */}
      <img
        key={currentIndex} // Add key to force re-render on change if needed
        src={imageSources[currentIndex]}
        alt={`Item view ${currentIndex + 1}`}
        onError={handleImageError}
        className="max-w-full max-h-full object-contain"
      />

      {/* Left Arrow */}
      {showButtons && (
        <button
          onClick={goToPrevious}
          className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Previous Image"
        >
          <IoChevronBack size={24} />
        </button>
      )}

      {/* Right Arrow */}
      {showButtons && (
        <button
          onClick={goToNext}
          className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Next Image"
        >
          <IoChevronForward size={24} />
        </button>
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