import React, { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import type { PokemonCard } from "../types/Card";
import { PokemonTCGService } from "../services/PokemonTCGService";
import "../styles/CardSearch.css";

interface CardSearchProps {
  onCardSelect: (card: PokemonCard) => void;
}

const CardSearch: React.FC<CardSearchProps> = ({ onCardSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const result = await PokemonTCGService.searchCards(searchTerm);
      setSearchResults(result.data);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="card-search">
      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search Pokemon cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="search-input"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="search-button"
        >
          {isLoading ? (
            <Loader2 className="spinner" size={16} />
          ) : (
            <Search size={16} />
          )}
        </button>
      </div>

      {hasSearched && (
        <div className="search-results">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 className="spinner" size={24} />
              <p>Searching cards...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="results-grid">
              {searchResults.map((card) => (
                <div
                  key={card.id}
                  className="card-result"
                  onClick={() => onCardSelect(card)}
                >
                  <img
                    src={card.images.small}
                    alt={card.name}
                    className="card-image"
                  />
                  <div className="card-info">
                    <h4>{card.name}</h4>
                    <p>
                      {card.set.name} • {card.number}
                    </p>
                    <span className="rarity">{card.rarity}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-results">No cards found for "{searchTerm}"</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CardSearch;
