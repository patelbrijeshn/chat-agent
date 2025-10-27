import React, { useState, useRef, useEffect } from 'react';
import './StickySearchBar.css';

interface StickySearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
}

const StickySearchBar: React.FC<StickySearchBarProps> = ({ 
  onSearch, 
  disabled = false 
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

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [query]);

  return (
    <div className="sticky-search-bar">
      <div className="sticky-search-container">
        <form onSubmit={handleSubmit} className="sticky-search-form">
          <div className="sticky-search-input-container">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "AI is thinking..." : "Ask a follow-up question..."}
              disabled={disabled}
              rows={1}
              className="sticky-search-input"
            />
            <button
              type="submit"
              disabled={!query.trim() || disabled}
              className="sticky-search-submit"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StickySearchBar;