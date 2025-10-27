import React, { useState, useRef, useEffect } from 'react';
import './SearchInterface.css';

interface SearchInterfaceProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
  hasMessages?: boolean;
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({ 
  onSearch, 
  disabled = false, 
  hasMessages = false 
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !disabled) {
      onSearch(query.trim());
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Only show the centered interface if there are no messages
  if (!hasMessages) {
    return (
      <div className="search-interface centered">
        <div className="search-hero">
          {/* <div className="nxp-ai-logo">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div> */}
          <h1>NXP AI Assistant</h1>
          <p>Ask me anything about NXP products, technologies, or general questions</p>
        </div>
        
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-input-container">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={1}
              className="search-input"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="search-submit"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </form>
        
        <div className="search-suggestions">
          <div className="suggestion-chips">
            <button 
              className="suggestion-chip"
              onClick={() => onSearch("What are NXP's latest automotive processors?")}
            >
              Latest automotive processors
            </button>
            <button 
              className="suggestion-chip"
              onClick={() => onSearch("Tell me about NXP's IoT solutions")}
            >
              IoT solutions
            </button>
            <button 
              className="suggestion-chip"
              onClick={() => onSearch("How do I get started with i.MX processors?")}
            >
              i.MX processors guide
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Return null when there are messages - the sticky bottom search will be rendered separately
  return null;
};

export default SearchInterface;