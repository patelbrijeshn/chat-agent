import React from 'react';
import './SearchTitle.css';

interface SearchTitleProps {
  query: string;
  isFirstSection?: boolean;
}

const SearchTitle: React.FC<SearchTitleProps> = ({ query, isFirstSection = false }) => {
  return (
    <div className={`search-title-container ${isFirstSection ? 'first-section' : 'follow-up-section'}`}>
      <h1 className={`search-title `}>
        {query}
      </h1>
    </div>
  );
};

export default SearchTitle;