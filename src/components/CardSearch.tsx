import React, { useState, useCallback, useMemo } from "react";
import { Search, Loader2, Filter, Star, Clock } from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState(1); // Always start from 1
  const [pageSize, setPageSize] = useState(12);

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
    async (
      query: string = searchTerm,
      page: number = 1,
      size: number = pageSize
    ) => {
      if (!query.trim()) return;

      console.log(
        `🔍 Searching: "${query}" | Page: ${page} | Size: ${size} | Mode: ${searchMode}`
      );

      setIsLoading(true);
      setHasSearched(true);

      let result;

      // Always ensure page is at least 1
      const safePage = Math.max(page, 1);

      try {
        // Use different search methods based on mode
        switch (searchMode) {
          case "newest":
            result = await PokemonTCGService.searchCards(query, safePage, size);
            break;
          case "popular":
            result = await PokemonTCGService.searchCardsByPopularity(
              query,
              safePage,
              size
            );
            break;
          case "rare":
            result = await PokemonTCGService.searchCardsByRarity(
              query,
              safePage,
              size
            );
            break;
          case "exact":
            const exactResults = await PokemonTCGService.quickSearch(query);
            // For exact search, take only the requested page
            const startIndex = (safePage - 1) * size;
            const endIndex = startIndex + size;
            const pagedResults = exactResults.slice(startIndex, endIndex);
            result = { data: pagedResults, totalCount: exactResults.length };
            break;
          default:
            result = await PokemonTCGService.searchCards(query, safePage, size);
        }

        console.log(
          `✅ Search complete: ${result.data.length} cards found (${result.totalCount} total)`
        );

        setSearchResults(result.data);
        setTotalCount(result.totalCount);
        setCurrentPage(page);
      } catch (error) {
        console.error("❌ Search failed:", error);
        setSearchResults([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, searchMode, pageSize]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        setCurrentPage(1); // Reset to first page
        handleSearch(searchTerm, 1, pageSize);
      }
    },
    [handleSearch, searchTerm, pageSize]
  );

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setSearchResults([]);
    setHasSearched(false);
    setTotalCount(0);
    setCurrentPage(1);
  }, []);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setSearchTerm(suggestion);
      setCurrentPage(1);
      handleSearch(suggestion, 1, pageSize);
    },
    [handleSearch, pageSize]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      console.log(`📏 Changing page size to: ${newPageSize}`);
      setPageSize(newPageSize);
      setCurrentPage(1); // Reset to first page

      // Re-search with new page size if we have a search term
      if (searchTerm.trim()) {
        handleSearch(searchTerm, 1, newPageSize);
      }
    },
    [searchTerm, handleSearch]
  );

  const handleModeChange = useCallback(
    (newMode: SearchMode) => {
      console.log(`🔄 Changing search mode to: ${newMode}`);
      setSearchMode(newMode);
      setCurrentPage(1); // Reset to first page

      // Re-search with new mode if we have a search term
      if (searchTerm.trim()) {
        // Update the searchMode state first, then search
        setTimeout(() => {
          handleSearch(searchTerm, 1, pageSize);
        }, 0);
      }
    },
    [searchTerm, pageSize, handleSearch]
  );

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

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
      onClick={() => handleModeChange(mode)}
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
              ×
            </button>
          )}
          <button
            onClick={() => {
              setCurrentPage(1);
              handleSearch(searchTerm, 1, pageSize);
            }}
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

      {/* Search Mode Selector & Filter Area */}
      <div className="search-modes search-modes-bar">
        <div className="search-modes-group">
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
        <div className="search-modes-select">
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="search-modes-dropdown"
            title="Results per page"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={36}>36</option>
            <option value={48}>48</option>
          </select>
        </div>
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
                <span>
                  Showing {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                </span>
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-bar">
                  <button
                    onClick={() => {
                      const prevPage = currentPage - 1;
                      handleSearch(searchTerm, prevPage, pageSize);
                    }}
                    disabled={!canGoPrev || isLoading}
                    className="pagination-btn"
                  >
                    ← Prev
                  </button>

                  <div className="pagination-info">
                    <span className="pagination-page">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const nextPage = currentPage + 1;
                      handleSearch(searchTerm, nextPage, pageSize);
                    }}
                    disabled={!canGoNext || isLoading}
                    className="pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Quick search different modes */}
              <div className="mode-suggestions">
                {searchMode !== "popular" && (
                  <button
                    onClick={() => handleModeChange("popular")}
                    className="try-different-search"
                  >
                    🔥 Try Popular Sets
                  </button>
                )}

                {searchMode !== "rare" && (
                  <button
                    onClick={() => handleModeChange("rare")}
                    className="try-different-search"
                  >
                    ⭐ Try Rare Cards
                  </button>
                )}

                {searchMode !== "exact" && (
                  <button
                    onClick={() => handleModeChange("exact")}
                    className="try-different-search"
                  >
                    🎯 Try Exact Match
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="no-results">
              <p>No cards found for "{searchTerm}"</p>
              <div className="no-results-suggestions">
                <button
                  onClick={() => handleModeChange("exact")}
                  className="try-exact-search"
                >
                  🎯 Try Exact Match
                </button>
                <button
                  onClick={() => {
                    // Clear cache and try again
                    PokemonTCGService.clearCache();
                    handleSearch(searchTerm, 1, pageSize);
                  }}
                  className="try-exact-search"
                >
                  🔄 Clear Cache & Retry
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardSearch;
