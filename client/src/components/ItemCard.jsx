// client/src/components/ItemCard.jsx
import React from 'react';
import {Link} from 'react-router-dom';
import {IoPricetag, IoSwapHorizontal} from 'react-icons/io5';

const ItemCard = ({item}) => {
  const placeholderImageUrl =
    'https://placehold.co/150x150/2C2C2C/E0E0E0?text=No+Image';

  const imageUrl =
    item.primaryImageUrl ||
    item.imageUrl ||
    (item.photoUrls && item.photoUrls[0]) ||
    placeholderImageUrl;

  const FollowingTag = () => (
    <span className="ml-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
      Following
    </span>
  );

  // --- TEMPORARY DIAGNOSTIC LOG ---
  // This will show us the exact data the card is receiving.
  console.log ('ItemCard received item:', item);

  return (
    <div
      key={item.id}
      className="bg-vav-content-card rounded-lg shadow-lg flex flex-col transition-transform duration-300 hover:scale-105 group"
    >
      <div className="relative">
        <Link to={item.detailPath}>
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full h-48 object-cover rounded-t-lg"
            onError={e => {
              e.target.onerror = null;
              e.target.src = placeholderImageUrl;
            }}
          />
        </Link>

        <div className="absolute top-2 right-2 flex flex-col items-end gap-y-2">
          {item.isForSale &&
            <div className="text-xs font-bold px-2 py-1 rounded-full text-white bg-green-600 flex items-center">
              <IoPricetag className="mr-1" />
              <span>For Sale</span>
            </div>}
          {item.isOpenToTrade &&
            <div className="text-xs font-bold px-2 py-1 rounded-full text-white bg-blue-600 flex items-center">
              <IoSwapHorizontal className="mr-1" />
              <span>For Trade</span>
            </div>}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-serif text-vav-accent-primary text-lg font-bold text-center">
          {item.title}
        </h3>

        {item.username &&
          item.userId &&
          <div className="text-xs text-center text-vav-text-secondary mt-1 mb-2 flex items-center justify-center">
            <span>
              by
              {' '}
              <Link
                to={`/profile/${item.userId}`}
                className="hover:underline hover:text-vav-accent-secondary transition-colors"
              >
                {item.username}
              </Link>
            </span>
            {item.isFollowing && <FollowingTag />}
          </div>}

        <div className="flex-grow" />
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
