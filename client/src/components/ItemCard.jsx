import React from 'react';
import { Link } from 'react-router-dom';

// Define tagColors here so the component is self-contained
const tagColors = {
  'My Collection': 'bg-purple-600',
  'Wild Find': 'bg-green-600',
  'Ad Analysis': 'bg-blue-600',
};

const ItemCard = ({ item }) => {
  const placeholderImageUrl = 'https://placehold.co/150x150/2C2C2C/E0E0E0?text=No+Image';

  return (
    <div
      key={item.id}
      className="bg-vav-content-card rounded-lg shadow-lg flex flex-col transition-transform duration-300 hover:scale-105 group"
    >
      <div className="relative">
        <Link to={item.detailPath}>
          <img
            src={item.imageUrl || placeholderImageUrl}
            alt={item.title}
            className="w-full h-48 object-cover rounded-t-lg"
            onError={(e) => { e.target.onerror = null; e.target.src = placeholderImageUrl; }}
          />
        </Link>
        {item.tag && (
          <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${tagColors[item.tag] || 'bg-gray-500'}`}>
            {item.tag}
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-serif text-vav-accent-primary text-lg font-bold text-center">
          {item.title}
        </h3>
        {item.username && item.userId && (
          <p className="text-xs text-center text-vav-text-secondary mt-1 mb-2">
            by <Link to={`/profile/${item.userId}`} className="hover:underline hover:text-vav-accent-secondary transition-colors">{item.username}</Link>
          </p>
        )}
        <div className="flex-grow"></div>
        <Link
          to={item.detailPath}
          className="mt-auto text-sm text-center text-vav-accent-secondary group-hover:text-vav-accent-primary font-semibold transition-colors"
        >
          View Details &rarr;
        </Link>
      </div>
    </div>
  );
};

export default ItemCard;