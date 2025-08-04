// client/src/components/ImageCarousel.jsx
import React, {useState, useEffect} from 'react';
import {IoChevronBack, IoChevronForward} from 'react-icons/io5';

const ImageCarousel = ({photos, primaryImageUrl}) => {
  const [currentIndex, setCurrentIndex] = useState (0);
  const [imageSources, setImageSources] = useState ([]);
  const placeholderImageUrl =
    'https://placehold.co/600x400/2C2C2C/E0E0E0?text=No+Image';

  useEffect (
    () => {
      // --- FIX: Logic to prioritize the primary image ---
      const orderedPhotos = photos && photos.length > 0
        ? [...photos]
        : [placeholderImageUrl];

      if (primaryImageUrl) {
        const primaryIndex = orderedPhotos.indexOf (primaryImageUrl);
        // If the primary image exists in the array and is not already first
        if (primaryIndex > 0) {
          // Move it to the front
          const [primary] = orderedPhotos.splice (primaryIndex, 1);
          orderedPhotos.unshift (primary);
        }
      }

      setImageSources (orderedPhotos);
      setCurrentIndex (0); // Reset to the first slide (which is now the primary)
    },
    [photos, primaryImageUrl]
  );

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? imageSources.length - 1 : currentIndex - 1;
    setCurrentIndex (newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === imageSources.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex (newIndex);
  };

  const handleImageError = e => {
    e.target.onerror = null;
    e.target.src = placeholderImageUrl;
  };

  const showButtons = imageSources.length > 1;

  return (
    <div className="relative w-full aspect-video group bg-vav-background flex items-center justify-center rounded-lg shadow-sm">
      <img
        key={currentIndex}
        src={imageSources[currentIndex]}
        alt={`Item view ${currentIndex + 1}`}
        onError={handleImageError}
        className="max-w-full max-h-full object-contain"
      />

      {showButtons &&
        <button
          onClick={goToPrevious}
          className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Previous Image"
        >
          <IoChevronBack size={24} />
        </button>}

      {showButtons &&
        <button
          onClick={goToNext}
          className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Next Image"
        >
          <IoChevronForward size={24} />
        </button>}

      {showButtons &&
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs font-semibold px-2 py-1 rounded-full">
          {currentIndex + 1} / {imageSources.length}
        </div>}
    </div>
  );
};

export default ImageCarousel;
