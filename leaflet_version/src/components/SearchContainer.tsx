import React, { useState } from 'react';

const SearchContainer: React.FC = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = (query: string) => {
    if (query.length > 2) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
        .then(response => response.json())
        .then(data => {
          setSearchResults(data);
        });
    } else {
      setSearchResults([]);
    }
  };

  const handleResultClick = (item: any) => {
    // Handle result click
  };

  return (
    <div id="search-container">
      <input
        type="text"
        id="search-input"
        placeholder="Search for a location"
        onChange={(e) => handleSearch(e.target.value)}
      />
      <ul id="search-results">
        {searchResults.map((item, index) => (
          <li key={index} onClick={() => handleResultClick(item)}>
            {item.display_name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchContainer;