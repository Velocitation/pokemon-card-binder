import React, { useState, useCallback, useMemo } from "react";
import { Search, Loader2, X, Filter, Star, Clock } from "lucide-react";
import type { PokemonCard } from "../types/Card";
import { PokemonTCGService } from "../services/PokemonTCGService";
import "../styles/CardSearch.css";

interface CardSearchProps {
  onCardSelect: (card: PokemonCard) => void;
}

type SearchMode = "newest" | "popular" | "rare" | "exact";

const CardSearch: React.FC<CardSearchProps> = ({ onCardSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("newest");
  const [totalCount, setTotalCount] = useState(0);

  const searchSuggestions = useMemo(
    () => [
      "charizard",
      "pikachu",
      "mewtwo",
      "lugia",
      "rayquaza",
      "gardevoir",
      "lucario",
      "greninja",
      "dragapult",
      "miraidon",
    ],
    []
  );

  const handleSearch = useCallback(
    async (query: string = searchTerm) => {
      if (!query.trim()) return;

      setIsLoading(true);
      setHasSearched(true);

      let result;

      // Use different search methods based on mode
      switch (searchMode) {
        case "newest":
          result = await PokemonTCGService.searchCards(query, 1);
          break;
        case "popular":
          result = await PokemonTCGService.searchCardsByPopularity(query, 1);
          break;
        case "rare":
          result = await PokemonTCGService.searchCardsByRarity(query, 1);
          break;
        case "exact":
          const exactResults = await PokemonTCGService.quickSearch(query);
          result = { data: exactResults, totalCount: exactResults.length };
          break;
        default:
          result = await PokemonTCGService.searchCards(query, 1);
      }

      setSearchResults(result.data);
      setTotalCount(result.totalCount);
      setIsLoading(false);
    },
    [searchTerm, searchMode]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setSearchResults([]);
    setHasSearched(false);
    setTotalCount(0);
  }, []);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setSearchTerm(suggestion);
      handleSearch(suggestion);
    },
    [handleSearch]
  );

  const SearchModeButton = ({
    mode,
    icon: Icon,
    label,
    active,
  }: {
    mode: SearchMode;
    icon: React.ElementType;
    label: string;
    active: boolean;
  }) => (
    <button
      onClick={() => setSearchMode(mode)}
      className={`search-mode-btn ${active ? "active" : ""}`}
      title={label}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div className="card-search">
      <div className="search-input-container">
        <input
          type="text"
          placeholder={`Search Pokemon cards (${searchMode})...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="search-input"
        />
        <div className="search-buttons">
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="clear-button"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !searchTerm.trim()}
            className="search-button"
          >
            {isLoading ? (
              <Loader2 className="spinner" size={16} />
            ) : (
              <Search size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Search Mode Selector */}
      <div className="search-modes">
        <SearchModeButton
          mode="newest"
          icon={Clock}
          label="Newest sets first"
          active={searchMode === "newest"}
        />
        <SearchModeButton
          mode="popular"
          icon={Filter}
          label="Popular sets"
          active={searchMode === "popular"}
        />
        <SearchModeButton
          mode="rare"
          icon={Star}
          label="Rare cards first"
          active={searchMode === "rare"}
        />
        <SearchModeButton
          mode="exact"
          icon={Search}
          label="Exact name match"
          active={searchMode === "exact"}
        />
        <span className="mode-label">
          {searchMode === "newest" && "🕐 Newest Sets"}
          {searchMode === "popular" && "🔥 Popular Sets"}
          {searchMode === "rare" && "⭐ Rare Cards"}
          {searchMode === "exact" && "🎯 Exact Match"}
        </span>
      </div>

      {!hasSearched && (
        <div className="search-suggestions">
          <h4>Popular searches:</h4>
          <div className="suggestion-chips">
            {searchSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className="suggestion-chip"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasSearched && (
        <div className="search-results">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 className="spinner" size={24} />
              <p>Searching {searchMode} cards...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="results-header">
                <span>{totalCount} cards found</span>
                <span className="search-mode-indicator">
                  {searchMode === "newest" && "🕐"}
                  {searchMode === "popular" && "🔥"}
                  {searchMode === "rare" && "⭐"}
                  {searchMode === "exact" && "🎯"}
                </span>
              </div>

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
                      loading="lazy"
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

              {/* Quick search different modes */}
              {searchMode !== "popular" && (
                <button
                  onClick={() => {
                    setSearchMode("popular");
                    handleSearch();
                  }}
                  className="try-different-search"
                >
                  🔥 Try Popular Sets
                </button>
              )}

              {searchMode !== "rare" && (
                <button
                  onClick={() => {
                    setSearchMode("rare");
                    handleSearch();
                  }}
                  className="try-different-search"
                >
                  ⭐ Try Rare Cards
                </button>
              )}
            </>
          ) : (
            <div className="no-results">
              <p>No cards found for "{searchTerm}"</p>
              <button
                onClick={() => {
                  setSearchMode("exact");
                  handleSearch();
                }}
                className="try-exact-search"
              >
                🎯 Try Exact Match
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardSearch;
